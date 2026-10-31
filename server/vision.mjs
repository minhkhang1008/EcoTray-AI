import { analyzeStationPixels } from "../lib/station-vision.mjs";
import { resolveStationMenu } from "../lib/vision-menu.mjs";
import jpeg from "jpeg-js";
import {
  evaluateTrayWithTrainedModel,
  validFeatures,
  PTNK_18_TRAYS_CATALOG,
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
      async function resolveCaptureMenu(comboName, menuDate) {
        const existing = store
          ? JSON.parse((await store.get(stateKey)) ?? "null")
          : null;
        const iot = store
          ? JSON.parse(
              (await store.get(`ecotray:{${schoolId}}:state`)) ?? "null",
            )
          : null;
        return resolveStationMenu({
          schoolId,
          comboName,
          menuDate,
          capturedAt:
            request.headers.get("x-captured-at") ?? new Date().toISOString(),
          activeMenu: existing?.activeMenu,
          latestNfc: iot?.latestNfc,
        });
      }

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
        if (
          !(
            (pixels.width === 800 && pixels.height === 600) ||
            (pixels.width === 600 && pixels.height === 800)
          )
        )
          return fail(
            "INVALID_LAYOUT",
            "Cần ảnh 800×600 hoặc 600×800; chụp trọn khay trong vùng hiệu chuẩn.",
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
        Object.assign(
          params,
          await resolveCaptureMenu(comboName, menuDate ?? undefined),
        );
        params.pixelMeasurement = analyzeStationPixels(pixels);

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
        if (body.action === "reanalyze") {
          if (!store)
            return fail(
              "STORAGE_UNAVAILABLE",
              "Chưa cấu hình Redis dùng chung.",
              503,
            );
          if (request.headers.get("x-school-id") !== schoolId)
            return fail("SCHOOL_MISMATCH", "Trường học không hợp lệ.", 403);
          if (
            typeof body.comboName !== "string" ||
            !body.comboName.trim() ||
            body.comboName.length > 180 ||
            !validMenuDate(body.menuDate) ||
            !["auto", 0, 180].includes(body.orientation)
          )
            return fail(
              "INVALID_INPUT",
              "Cần thực đơn, ngày và chiều khay hợp lệ.",
            );
          const editKey = request.headers.get("idempotency-key");
          if (!editKey || editKey.length > 128)
            return fail("INVALID_HEADERS", "Cần Idempotency-Key hợp lệ.");
          const editHash = digest(bytes),
            editReceiptKey = stateKey + ":edit-receipt:" + digest(editKey);
          const editResponse = async (raw) => {
            const receipt = JSON.parse(raw);
            if (receipt.hash !== editHash)
              return fail(
                "IDEMPOTENCY_CONFLICT",
                "Khóa đã dùng cho nội dung khác.",
                409,
              );
            const image = receipt.event.imageKey
              ? await store.get(receipt.event.imageKey)
              : null;
            return json({ ...receipt.event, latestImageUrl: image });
          };
          const previousEdit = await store.get(editReceiptKey);
          if (previousEdit) return editResponse(previousEdit);
          const expected = await store.get(stateKey),
            current = expected ? JSON.parse(expected) : null;
          if (!current || current.revision !== body.revision)
            return fail(
              "STALE_CAPTURE",
              "Ảnh đã thay đổi; chọn lại trên ảnh mới nhất.",
              409,
            );
          const original = current.imageKey
            ? await store.get(current.imageKey)
            : null;
          if (!original?.startsWith("data:image/jpeg;base64,"))
            return fail(
              "IMAGE_UNAVAILABLE",
              "Ảnh gốc không còn khả dụng.",
              409,
            );
          const pixels = jpeg.decode(
            Buffer.from(original.split(",")[1], "base64"),
            { useTArray: true, maxResolutionInMP: 1, maxMemoryUsageInMB: 32 },
          );
          const pixelMeasurement = analyzeStationPixels(pixels, {
            orientation: body.orientation,
          });
          const cohort = current.cohort ?? [];
          const analysis = evaluateTrayWithTrainedModel({
            sampleId: undefined,
            pixelMeasurement,
            comboName: body.comboName.trim(),
            menuDate: body.menuDate,
            cohort: cohort.filter((r) => r.id !== current.analysis.sampleId),
          });
          const next = {
            ...current,
            revision: digest(
              current.revision +
                JSON.stringify([
                  body.comboName,
                  body.menuDate,
                  body.orientation,
                ]),
            ),
            activeMenu: { combo: body.comboName.trim(), date: body.menuDate },
            analysis: {
              ...analysis,
              sampleId: current.analysis.sampleId,
              timestamp: current.analysis.timestamp,
            },
            cohort: cohort.map((r) =>
              r.id === current.analysis.sampleId
                ? {
                    ...r,
                    combo: analysis.comboName,
                    date: analysis.menuDate,
                    pcts: visionKeys.map(
                      (k) => analysis.components[k].wastePct,
                    ),
                    isOutlier: analysis.isDietaryOutlier,
                  }
                : r,
            ),
          };
          const event = { ...next };
          delete event.cohort;
          const result = await store.commit(
            stateKey,
            [editReceiptKey],
            expected,
            JSON.stringify(next),
            JSON.stringify({ hash: editHash, event }),
            null,
          );
          return result
            ? editResponse(result)
            : fail(
                "STALE_CAPTURE",
                "Ảnh đã thay đổi; thử lại trên ảnh mới nhất.",
                409,
              );
        }

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
        if (!body.sampleId)
          Object.assign(
            params,
            await resolveCaptureMenu(body.comboName, body.menuDate),
          );
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
                request.headers.get("x-menu-name"),
                request.headers.get("x-menu-date"),
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
          JSON.stringify({
            ...event,
            cohort: nextCohort,
            activeMenu: expected ? JSON.parse(expected).activeMenu : null,
          }),
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
