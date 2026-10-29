import jpeg from "jpeg-js";
import {
  evaluateTrayWithTrainedModel,
  validFeatures,
  PTNK_18_TRAYS_CATALOG,
  extractFeatures,
  getRois,
  visionKeys,
} from "../lib/ptnk-vision.mjs";
import { RedisStore, MemoryStore, digest } from "./store.mjs";
const json = (data, status = 200) =>
  Response.json(data, {
    status,
    headers: {
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
const fail = (code, message, status = 400) =>
  json({ error: { code, message, details: null } }, status);
function validMenuDate(value) {
  if (typeof value !== "string" || !/^\d{4}-\d\d-\d\d$/.test(value))
    return false;
  const parsed = new Date(value + "T00:00:00Z");
  return (
    Number.isFinite(parsed.getTime()) &&
    parsed.toISOString().slice(0, 10) === value
  );
}
function validCaptureTime(value) {
  if (
    !value ||
    !/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(?:\.\d{3})?Z$/.test(value) ||
    !Number.isFinite(Date.parse(value))
  )
    return false;
  return (
    new Date(value).toISOString().replace(".000Z", "Z") ===
    value.replace(".000Z", "Z")
  );
}
export function configuredVisionService(env = process.env) {
  const store =
    env.UPSTASH_REDIS_REST_URL && env.UPSTASH_REDIS_REST_TOKEN
      ? new RedisStore(env.UPSTASH_REDIS_REST_URL, env.UPSTASH_REDIS_REST_TOKEN)
      : !env.VERCEL && env.NODE_ENV !== "production"
        ? new MemoryStore()
        : null;
  return createVisionService({ store, schoolId: env.IOT_SCHOOL_ID ?? "ptnk" });
}
export function createVisionService({ store = null, schoolId = "ptnk" } = {}) {
  return async (request) => {
    try {
      const url = new URL(request.url);
      if (
        url.searchParams.get("schoolId") &&
        url.searchParams.get("schoolId") !== schoolId
      )
        return fail("SCHOOL_MISMATCH", "Trường học không hợp lệ.", 403);
      const stateKey = "ecotray:vision:" + schoolId;
      if (request.method === "GET") {
        if (!store)
          return fail(
            "STORAGE_UNAVAILABLE",
            "Chưa cấu hình Redis dùng chung cho luồng thiết bị.",
            503,
          );
        const raw = await store.get(stateKey),
          event = raw ? JSON.parse(raw) : null;
        const image = event?.imageKey ? await store.get(event.imageKey) : null;
        return json({
          ok: true,
          source: "hardware",
          schoolId,
          revision: event?.revision ?? "",
          analysis: event?.analysis ?? null,
          latestImageUrl: image ?? event?.imageUrl ?? null,
        });
      }
      if (request.method !== "POST")
        return fail("METHOD_NOT_ALLOWED", "Chỉ hỗ trợ GET và POST.", 405);
      const declared = Number(request.headers.get("content-length") ?? 0);
      if (declared > 250000)
        return fail("PAYLOAD_TOO_LARGE", "Tối đa 250 KB.", 413);
      const chunks = [];
      let size = 0;
      if (request.body)
        for await (const chunk of request.body) {
          size += chunk.length;
          if (size > 250000)
            return fail("PAYLOAD_TOO_LARGE", "Tối đa 250 KB.", 413);
          chunks.push(Buffer.from(chunk));
        }
      const bytes = Buffer.concat(chunks),
        type = request.headers.get("content-type")?.split(";")[0];
      let params = {},
        publish = false,
        image = null,
        imageUrl = null;
      if (type === "image/jpeg") {
        if (bytes[0] !== 255 || bytes[1] !== 216)
          return fail("INVALID_IMAGE", "Ảnh JPEG không hợp lệ.");
        let pixels;
        try {
          pixels = jpeg.decode(bytes, {
            useTArray: true,
            maxResolutionInMP: 1,
            maxMemoryUsageInMB: 32,
          });
        } catch {
          return fail("INVALID_IMAGE", "Không đọc được JPEG.");
        }
        if (pixels.width !== 800 || pixels.height !== 600)
          return fail(
            "INVALID_LAYOUT",
            "Cần ảnh chuẩn hóa 800×600, khay nằm ngang và đúng vùng hiệu chuẩn.",
          );
        let comboName;
        try {
          comboName =
            decodeURIComponent(request.headers.get("x-menu-name") ?? "") ||
            undefined;
        } catch {
          return fail("INVALID_INPUT", "Tên thực đơn mã hóa không hợp lệ.");
        }
        const menuDate = request.headers.get("x-menu-date");
        if (comboName && comboName.length > 180)
          return fail("INVALID_INPUT", "Tên thực đơn quá dài.");
        if (menuDate && !validMenuDate(menuDate))
          return fail("INVALID_INPUT", "Ngày thực đơn không hợp lệ.");
        params.comboName = comboName ?? undefined;
        params.menuDate = menuDate ?? undefined;
        params.featureVectors = Object.fromEntries(
          visionKeys.map((k) => [k, extractFeatures(pixels, getRois()[k])]),
        );
        image = "data:image/jpeg;base64," + bytes.toString("base64");
        publish = true;
      } else if (type === "application/json") {
        let body;
        try {
          body = JSON.parse(bytes.toString());
        } catch {
          return fail("INVALID_JSON", "JSON không hợp lệ.");
        }
        if (!body || typeof body !== "object" || Array.isArray(body))
          return fail("INVALID_INPUT", "Dữ liệu không hợp lệ.");
        if (
          body.sampleId !== undefined &&
          (typeof body.sampleId !== "string" ||
            !Object.hasOwn(PTNK_18_TRAYS_CATALOG, body.sampleId))
        )
          return fail("UNKNOWN_SAMPLE", "Mẫu ảnh không có trong danh mục.");
        if (
          body.featureVectors !== undefined &&
          !validFeatures(body.featureVectors)
        )
          return fail("INVALID_FEATURES", "Cần bốn vector gồm 6 số hữu hạn.");
        if (body.overridePcts !== undefined)
          return fail(
            "MANUAL_FEEDBACK_LOCAL",
            "Hiệu chỉnh thủ công chỉ lưu trong sandbox trên trình duyệt.",
          );
        if (!body.sampleId && !body.featureVectors)
          return fail("INVALID_INPUT", "Cần mẫu ảnh hoặc đặc trưng pixel.");
        if (
          body.comboName !== undefined &&
          (typeof body.comboName !== "string" || body.comboName.length > 180)
        )
          return fail("INVALID_INPUT", "Tên thực đơn không hợp lệ.");
        if (
          body.allergyFlags !== undefined &&
          (!Array.isArray(body.allergyFlags) ||
            body.allergyFlags.length > 10 ||
            body.allergyFlags.some(
              (v) => typeof v !== "string" || v.length > 80,
            ))
        )
          return fail("INVALID_INPUT", "Cờ cơ địa không hợp lệ.");
        // Catalog exploration is stateless and can never overwrite the hardware feed.
        if (body.publish && body.sampleId)
          return fail(
            "REFERENCE_NOT_HARDWARE",
            "Không xuất bản ảnh danh mục thành sự kiện thiết bị.",
          );
        if (body.menuDate !== undefined && !validMenuDate(body.menuDate))
          return fail("INVALID_INPUT", "Ngày thực đơn không hợp lệ.");
        params = {
          sampleId: body.sampleId,
          featureVectors: body.featureVectors,
          comboName: body.comboName,
          menuDate: body.menuDate,
          allergyFlags: body.allergyFlags,
        };
        publish = body.publish === true;
        if (body.sampleId) imageUrl = "/ptnk-normalized/" + body.sampleId;
      } else
        return fail(
          "UNSUPPORTED_MEDIA_TYPE",
          "Chỉ hỗ trợ JSON hoặc image/jpeg.",
          415,
        );
      const analysis = evaluateTrayWithTrainedModel(params);
      if (!publish)
        return json({
          ok: true,
          source: "sandbox",
          analysis,
          latestImageUrl: imageUrl,
        });
      if (!store)
        return fail(
          "STORAGE_UNAVAILABLE",
          "Chưa cấu hình Redis dùng chung.",
          503,
        );
      if (request.headers.get("x-school-id") !== schoolId)
        return fail("SCHOOL_MISMATCH", "Cần X-School-Id hợp lệ.", 403);
      const station = request.headers.get("x-station-id"),
        at = request.headers.get("x-captured-at"),
        key = request.headers.get("idempotency-key");
      if (
        !station ||
        !/^[-a-zA-Z0-9_]{1,64}$/.test(station) ||
        !validCaptureTime(at) ||
        !key ||
        key.length > 128
      )
        return fail(
          "INVALID_HEADERS",
          "Cần station, thời điểm UTC và Idempotency-Key hợp lệ.",
        );
      const hash = digest(
          Buffer.concat([
            bytes,
            Buffer.from(
              JSON.stringify([
                station,
                at,
                type,
                params.comboName,
                params.menuDate,
                params.allergyFlags ?? [],
              ]),
            ),
          ]),
        ),
        receiptKey = stateKey + ":receipt:" + digest(key);
      const check = (raw) => {
        const receipt = JSON.parse(raw);
        return receipt.hash === hash
          ? json(receipt.event)
          : fail(
              "IDEMPOTENCY_CONFLICT",
              "Khóa đã dùng cho nội dung khác.",
              409,
            );
      };
      const previous = await store.get(receiptKey);
      if (previous) return check(previous);
      const revision = digest(schoolId + station + key),
        imageKey = stateKey + ":image:" + revision;
      const event = {
        ok: true,
        source: "hardware",
        schoolId,
        revision,
        analysis: {
          ...analysis,
          sampleId: "capture-" + revision,
          timestamp: at,
        },
        imageUrl,
        imageKey: image ? imageKey : null,
      };
      for (let retry = 0; retry < 4; retry++) {
        const expected = await store.get(stateKey);
        const cohort = expected ? (JSON.parse(expected).cohort ?? []) : [];
        const checked = evaluateTrayWithTrainedModel({ ...params, cohort });
        event.analysis = {
          ...checked,
          sampleId: "capture-" + revision,
          timestamp: at,
        };
        const nextCohort = [
          ...cohort,
          {
            id: "capture-" + revision,
            combo: checked.comboName,
            date: checked.menuDate,
            pcts: visionKeys.map((k) => checked.components[k].wastePct),
            isOutlier: checked.isDietaryOutlier,
            allergyFlags: params.allergyFlags ?? [],
          },
        ].slice(-100);
        const receipt = JSON.stringify({ hash, event });
        const result = await store.commit(
          stateKey,
          [receiptKey],
          expected,
          JSON.stringify({ ...event, cohort: nextCohort }),
          receipt,
          image ? { key: imageKey, value: image } : null,
        );
        if (result) return check(result);
      }
      return fail(
        "CONCURRENT_WRITE",
        "Có cập nhật đồng thời; thử lại cùng khóa.",
        503,
      );
    } catch {
      return fail(
        "SERVICE_UNAVAILABLE",
        "Không thể xử lý Vision; kiểm tra ảnh và cấu hình lưu trữ.",
        503,
      );
    }
  };
}
