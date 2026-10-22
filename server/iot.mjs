import { createHmac, timingSafeEqual } from "node:crypto";
import { MemoryStore, digest } from "./store.mjs";
import { operationalDecision } from "../lib/final-round.mjs";
export { MemoryStore };
const json = (data, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
class ApiError extends Error {
  constructor(status, code, message) {
    super(message);
    this.status = status;
    this.code = code;
  }
}
const fail = (code, message, status = 400) => {
  throw new ApiError(status, code, message);
};
const validId = (x) =>
  typeof x === "string" && /^[a-zA-Z0-9_-]{1,100}$/.test(x);
const iso = (x) =>
  typeof x === "string" &&
  /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?Z$/.test(x) &&
  Number.isFinite(Date.parse(x)) &&
  new Date(x).toISOString().slice(0, 19) === x.slice(0, 19);
const auth = (request, token) => {
  const actual = Buffer.from(request.headers.get("authorization") ?? ""),
    expected = Buffer.from(`Bearer ${token}`);
  return (
    !!token &&
    actual.length === expected.length &&
    timingSafeEqual(actual, expected)
  );
};
const initial = () => ({
  days: {},
  captures: [],
  latestNfc: null,
  lastUpdatedAt: null,
});
function jpegSize(bytes) {
  if (
    bytes.length < 10 ||
    bytes[0] !== 255 ||
    bytes[1] !== 216 ||
    bytes.at(-2) !== 255 ||
    bytes.at(-1) !== 217
  )
    return null;
  for (let i = 2; i < bytes.length - 8; ) {
    if (bytes[i++] !== 255) return null;
    while (bytes[i] === 255) i++;
    const marker = bytes[i++];
    if (marker === 218) break;
    const len = bytes.readUInt16BE(i);
    if (len < 2 || i + len > bytes.length) return null;
    if ([192, 193, 194].includes(marker)) {
      if (len < 8) return null;
      return [bytes.readUInt16BE(i + 5), bytes.readUInt16BE(i + 3)];
    }
    i += len;
  }
  return null;
}
function imageData(bytes) {
  if (bytes.length > 150000)
    fail("IMAGE_TOO_LARGE", "Ảnh JPEG tối đa 150 KB.", 413);
  const size = jpegSize(bytes);
  if (!size || size[0] !== 800 || size[1] !== 600)
    fail("INVALID_IMAGE", "Cần ảnh JPEG hợp lệ 800×600.");
  return "data:image/jpeg;base64," + bytes.toString("base64");
}
function safeImageUrl(value, origins) {
  try {
    const url = new URL(value);
    if (
      url.protocol === "https:" &&
      origins.includes(url.origin) &&
      !url.username &&
      !url.password
    )
      return url.href;
  } catch {}
  fail("INVALID_IMAGE_URL", "Nguồn ảnh chưa được cho phép.");
}
function resultFrom(body) {
  const names = ["riceLeftoverPct", "vegLeftoverPct", "mainLeftoverPct"];
  if (!names.some((k) => k in body)) return null;
  if (
    names.some(
      (k) =>
        typeof body[k] !== "number" ||
        !Number.isFinite(body[k]) ||
        body[k] < 0 ||
        body[k] > 100,
    ) ||
    ("isOutlier" in body && typeof body.isOutlier !== "boolean")
  )
    fail("INVALID_PERCENTAGES", "Phần còn lại phải là số từ 0 đến 100.");
  if (
    body.latencyMs !== undefined &&
    (!Number.isFinite(body.latencyMs) ||
      body.latencyMs < 0 ||
      body.latencyMs > 600000)
  )
    fail("INVALID_LATENCY", "Độ trễ không hợp lệ.");
  const values = {
    rice: body.riceLeftoverPct,
    vegetables: body.vegLeftoverPct,
    main: body.mainLeftoverPct,
    isOutlier: body.isOutlier ?? false,
  };
  // A single inference cannot establish a school-wide portion recommendation.
  return {
    ...values,
    recommendation: operationalDecision({
      values,
      isOutlier: values.isOutlier,
      sampleCount: 1,
    }).text,
  };
}
/** Authenticated hardware boundary. Production uses shared Redis, never instance memory. */
export function createIotService({
  store,
  writeToken,
  readToken,
  profiles = [],
  schoolId = "ptnk",
  uidSecret = "",
  imageOrigins = [],
  now = () => new Date(),
}) {
  return async (request) => {
    try {
      const url = new URL(request.url),
        route = url.pathname.split("/").at(-1),
        isRead = request.method === "GET";
      if (
        ![
          "status",
          "nfc-scan",
          "tray-capture",
          "capture-result",
          "image",
        ].includes(route)
      )
        return json(
          {
            error: {
              code: "NOT_FOUND",
              message: "Không có API này.",
              details: null,
            },
          },
          404,
        );
      const method = ["status", "image"].includes(route) ? "GET" : "POST";
      if (request.method !== method)
        return new Response(
          JSON.stringify({
            error: {
              code: "METHOD_NOT_ALLOWED",
              message: "Phương thức không được hỗ trợ.",
              details: null,
            },
          }),
          {
            status: 405,
            headers: { Allow: method, "Content-Type": "application/json" },
          },
        );
      if (!auth(request, writeToken)) {
        if (!auth(request, readToken))
          fail("UNAUTHORIZED", "Cần khóa truy cập IoT hợp lệ.", 401);
        if (!isRead)
          fail(
            "WRITE_ACCESS_REQUIRED",
            "Thao tác này cần khóa ghi IoT. Khóa đọc chỉ dùng để xem trạng thái.",
            403,
          );
      }
      if (!store)
        fail(
          "STORAGE_NOT_CONFIGURED",
          "Chưa cấu hình kho dữ liệu IoT dùng chung.",
          503,
        );
      const bytes = isRead
        ? Buffer.alloc(0)
        : Buffer.from(await request.arrayBuffer());
      if (bytes.length > 250000)
        fail("PAYLOAD_TOO_LARGE", "Dữ liệu gửi tối đa 250 KB.", 413);
      let body = {};
      const raw =
        request.headers.get("content-type")?.split(";")[0] === "image/jpeg";
      if (!isRead && !raw) {
        if (
          !request.headers.get("content-type")?.startsWith("application/json")
        )
          fail(
            "UNSUPPORTED_MEDIA_TYPE",
            "Dùng application/json hoặc image/jpeg.",
            415,
          );
        try {
          body = JSON.parse(bytes.toString("utf8"));
        } catch {
          fail("INVALID_JSON", "JSON không hợp lệ.");
        }
        if (!body || typeof body !== "object" || Array.isArray(body))
          fail("INVALID_JSON", "Cần một đối tượng JSON.");
      }
      const school = isRead
        ? url.searchParams.get("schoolId")
        : raw
          ? request.headers.get("x-school-id")
          : (body.schoolId ?? schoolId);
      if (school !== schoolId)
        fail("SCHOOL_FORBIDDEN", "Trường chưa được cấp quyền.", 403);
      const prefix = `ecotray:{${school}}`,
        stateKey = prefix + ":state";
      if (route === "image") {
        const id = url.searchParams.get("captureId");
        if (!validId(id)) fail("INVALID_CAPTURE", "Mã ảnh không hợp lệ.");
        const data = await store.get(prefix + ":image:" + id);
        if (!data)
          fail(
            "IMAGE_EXPIRED",
            "Ảnh không tồn tại hoặc đã hết 30 ngày lưu trữ.",
            404,
          );
        return new Response(Buffer.from(data.split(",")[1], "base64"), {
          headers: {
            "Content-Type": "image/jpeg",
            "Cache-Control": "no-store",
            "X-Content-Type-Options": "nosniff",
          },
        });
      }
      if (isRead) {
        const since = url.searchParams.get("since");
        if (since && !iso(since))
          fail("INVALID_SINCE", "since phải là ISO-8601 UTC.");
        const state =
            JSON.parse((await store.get(stateKey)) ?? "null") ?? initial(),
          current = now(),
          day = current.toISOString().slice(0, 10);
        const captures = state.captures.filter(
          (c) => !since || c.updatedAt > since,
        );
        const captureId = url.searchParams.get("captureId");
        if (captureId && !validId(captureId))
          fail("INVALID_CAPTURE", "Mã khay không hợp lệ.");
        return json({
          online:
            !!state.lastUpdatedAt &&
            current.getTime() - Date.parse(state.lastUpdatedAt) < 30000,
          lastUpdatedAt: state.lastUpdatedAt,
          servedCount: state.days[day]?.served ?? 0,
          latestNfc: state.latestNfc,
          latestCapture: captureId
            ? (state.captures.find((c) => c.captureId === captureId) ?? null)
            : (state.captures[0] ?? null),
          captures,
          source: "hardware",
        });
      }
      const key = request.headers.get("idempotency-key");
      if (!validId(key))
        fail(
          "INVALID_IDEMPOTENCY_KEY",
          "Cần Idempotency-Key (1–100 ký tự chữ, số, _ hoặc -).",
        );
      const station = raw
        ? request.headers.get("x-station-id")
        : (body.stationId ?? "station-1");
      if (!validId(station)) fail("INVALID_STATION", "stationId không hợp lệ.");
      const at = raw
        ? request.headers.get("x-captured-at")
        : (body.scannedAt ??
          body.capturedAt ??
          body.timestamp ??
          now().toISOString());
      if (!iso(at))
        fail("INVALID_TIMESTAMP", "Thời gian phải dùng ISO-8601 UTC.");
      const fingerprint = digest(
        Buffer.concat([
          Buffer.from(
            JSON.stringify({ route, school, station, at: raw ? at : null }),
          ),
          bytes,
        ]),
      );
      const receiptKeys = [prefix + ":receipt:" + route + ":" + key];
      if (route === "nfc-scan" && body.eventId) {
        if (!validId(body.eventId))
          fail("INVALID_EVENT_ID", "eventId không hợp lệ.");
        receiptKeys.push(prefix + ":event:" + body.eventId);
      }
      let image = null;
      if (route === "tray-capture") {
        if (raw) image = imageData(bytes);
        else if (body.imageBase64) {
          if (
            typeof body.imageBase64 !== "string" ||
            !/^(?:data:image\/jpeg;base64,)?[A-Za-z0-9+/]+=*$/.test(
              body.imageBase64,
            )
          )
            fail("INVALID_IMAGE", "Ảnh base64 không hợp lệ.");
          image = imageData(
            Buffer.from(
              body.imageBase64.replace(/^data:image\/jpeg;base64,/, ""),
              "base64",
            ),
          );
        }
      }
      for (let attempt = 0; attempt < 16; attempt++) {
        const cached = await store.get(receiptKeys[0]);
        if (cached) {
          const receipt = JSON.parse(cached);
          if (receipt.fingerprint !== fingerprint)
            fail(
              "IDEMPOTENCY_CONFLICT",
              "Khóa đã được dùng với nội dung khác.",
              409,
            );
          return json(receipt.body, receipt.status);
        }
        const previous = await store.get(stateKey),
          state = JSON.parse(previous ?? "null") ?? initial(),
          recordedAt = now().toISOString(),
          day = at.slice(0, 10);
        let response,
          status = 200;
        if (route === "nfc-scan") {
          let hash = body.cardUidHash;
          if (body.uid !== undefined) {
            if (!uidSecret)
              fail(
                "UID_HASHING_NOT_CONFIGURED",
                "Chưa cấu hình HMAC UID.",
                503,
              );
            if (
              typeof body.uid !== "string" ||
              !/^[a-fA-F0-9:-]{4,80}$/.test(body.uid)
            )
              fail("INVALID_UID", "UID không hợp lệ.");
            hash = createHmac("sha256", uidSecret)
              .update(body.uid.replace(/[:-]/g, "").toLowerCase())
              .digest("hex");
          }
          if (typeof hash !== "string" || !/^[a-f0-9]{64}$/.test(hash))
            fail("INVALID_UID_HASH", "Cần HMAC SHA-256 UID 64 ký tự.");
          const profile = profiles.find(
              (p) => p.cardUidHash === hash && p.schoolId === school,
            ),
            daily = state.days[day] ?? { served: 0, redeemed: [] };
          const nfcStatus = !profile
            ? "UNKNOWN_CARD"
            : daily.redeemed.includes(hash)
              ? "ALREADY_REDEEMED"
              : profile.allergyFlags?.length
                ? "ALLERGY_WARNING"
                : "VALID";
          if (["VALID", "ALLERGY_WARNING"].includes(nfcStatus)) {
            daily.served++;
            daily.redeemed.push(hash);
          }
          state.days[day] = daily;
          for (const d of Object.keys(state.days))
            if (
              d <
              new Date(now().getTime() - 2 * 86400000)
                .toISOString()
                .slice(0, 10)
            )
              delete state.days[d];
          response = {
            eventId: body.eventId ?? key,
            status: nfcStatus,
            servedCount: daily.served,
            menu: profile
              ? { menuId: profile.menuId, name: profile.menuName }
              : null,
            allergyFlags: profile?.allergyFlags ?? [],
            recordedAt,
            cardUidHash: hash,
          };
          state.latestNfc = response;
        } else if (route === "tray-capture") {
          const captureId =
              "cap-" +
              digest(school + ":" + key + ":" + fingerprint).slice(0, 24),
            result = raw ? null : resultFrom(body);
          const imageUrl = body.imageUrl
            ? safeImageUrl(body.imageUrl, imageOrigins)
            : undefined;
          if (body.dishId !== undefined && !validId(body.dishId))
            fail("INVALID_DISH", "dishId không hợp lệ.");
          if (!raw && !result && !image && !imageUrl)
            fail("MISSING_CAPTURE", "Cần ảnh khay hoặc kết quả phân tích.");
          state.captures.unshift({
            captureId,
            status: result ? "COMPLETED" : "QUEUED",
            capturedAt: at,
            updatedAt: recordedAt,
            stationId: station,
            dishId: body.dishId,
            menuName: profiles.find(
              (p) => p.schoolId === school && p.menuId === body.dishId,
            )?.menuName,
            imageUrl: image
              ? `/api/iot/image?schoolId=${school}&captureId=${captureId}`
              : imageUrl,
            result: result ?? undefined,
            latencyMs: body.latencyMs,
          });
          state.captures = state.captures.slice(0, 100);
          response = {
            captureId,
            status: "QUEUED",
            statusUrl: `/api/iot/status?schoolId=${school}&captureId=${captureId}`,
          };
          status = 202;
        } else {
          const capture = state.captures.find(
            (c) => c.captureId === body.captureId,
          );
          if (!capture) fail("CAPTURE_NOT_FOUND", "Không tìm thấy khay.", 404);
          if (!["PROCESSING", "COMPLETED", "FAILED"].includes(body.status))
            fail("INVALID_STATUS", "Trạng thái kết quả không hợp lệ.");
          if (["COMPLETED", "FAILED"].includes(capture.status))
            fail(
              "CAPTURE_FINALIZED",
              "Khay đã có kết quả cuối. Dùng lại khóa gốc khi thử lại.",
              409,
            );
          const result = body.status === "COMPLETED" ? resultFrom(body) : null;
          if (body.status === "COMPLETED" && !result)
            fail("MISSING_RESULT", "Cần đủ 3 thành phần.");
          if (body.dishId !== undefined) {
            if (!validId(body.dishId))
              fail("INVALID_DISH", "dishId không hợp lệ.");
            capture.dishId = body.dishId;
            capture.menuName = profiles.find(
              (p) => p.schoolId === school && p.menuId === body.dishId,
            )?.menuName;
          }
          capture.status = body.status;
          capture.updatedAt = recordedAt;
          if (result) capture.result = result;
          if (body.latencyMs !== undefined) capture.latencyMs = body.latencyMs;
          if (body.status === "FAILED")
            capture.errorMessage =
              "Xử lý ảnh thất bại. Kiểm tra trạm và gửi lại ảnh.";
          response = { captureId: capture.captureId, status: capture.status };
        }
        state.lastUpdatedAt = recordedAt;
        const receipt = JSON.stringify({ fingerprint, body: response, status });
        const committed = await store.commit(
          stateKey,
          receiptKeys,
          previous,
          JSON.stringify(state),
          receipt,
          image
            ? { key: prefix + ":image:" + response.captureId, value: image }
            : null,
        );
        if (committed) {
          const output = JSON.parse(committed);
          if (output.fingerprint !== fingerprint)
            fail(
              "IDEMPOTENCY_CONFLICT",
              "Khóa đã được dùng với nội dung khác.",
              409,
            );
          return json(output.body, output.status);
        }
      }
      fail("WRITE_CONTENTION", "Trạm đang bận; thử lại với cùng khóa.", 409);
    } catch (error) {
      if (error instanceof ApiError)
        return json(
          {
            error: { code: error.code, message: error.message, details: null },
          },
          error.status,
        );
      return json(
        {
          error: {
            code: "STORAGE_UNAVAILABLE",
            message:
              "Không thể kết nối kho dữ liệu. Có thể dùng chế độ mô phỏng.",
            details: null,
          },
        },
        503,
      );
    }
  };
}
