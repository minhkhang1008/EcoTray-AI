import { createIotService, MemoryStore } from "./iot.mjs";
import { RedisStore } from "./store.mjs";
export function configuredService(env = process.env) {
  const store =
    env.UPSTASH_REDIS_REST_URL && env.UPSTASH_REDIS_REST_TOKEN
      ? new RedisStore(env.UPSTASH_REDIS_REST_URL, env.UPSTASH_REDIS_REST_TOKEN)
      : env.IOT_LOCAL_MEMORY === "true" &&
          !env.VERCEL &&
          env.NODE_ENV !== "production"
        ? new MemoryStore()
        : null;
  let profiles = [];
  try {
    profiles = JSON.parse(env.IOT_PROFILES_JSON ?? "[]");
    if (
      !Array.isArray(profiles) ||
      profiles.some(
        (p) =>
          !p ||
          typeof p.cardUidHash !== "string" ||
          typeof p.menuName !== "string" ||
          !Array.isArray(p.allergyFlags),
      )
    )
      profiles = [];
  } catch {
    profiles = [];
  }
  return createIotService({
    store,
    uidSecret: env.IOT_UID_HMAC_SECRET,
    schoolId: env.IOT_SCHOOL_ID ?? "ptnk",
    imageOrigins: (env.IOT_IMAGE_ORIGINS ?? "").split(",").filter(Boolean),
    profiles,
  });
}
export function nodeHandler(service) {
  return async (req, res) => {
    try {
      const parts = [];
      let size = 0;
      if (req.body !== undefined) {
        const part = Buffer.isBuffer(req.body)
          ? req.body
          : Buffer.from(
              typeof req.body === "string"
                ? req.body
                : JSON.stringify(req.body),
            );
        size = part.length;
        parts.push(part);
      } else
        for await (const part of req) {
          size += part.length;
          if (size > 250000) break;
          parts.push(part);
        }
      if (size > 250000) {
        res.writeHead(413, { "Content-Type": "application/json" });
        res.end(
          JSON.stringify({
            error: {
              code: "PAYLOAD_TOO_LARGE",
              message: "Dữ liệu gửi tối đa 250 KB.",
              details: null,
            },
          }),
        );
        return;
      }
      const headers = new Headers();
      for (const [key, value] of Object.entries(req.headers))
        if (value)
          headers.set(key, Array.isArray(value) ? value.join(",") : value);
      const request = new Request(new URL(req.url, "http://localhost"), {
        method: req.method,
        headers,
        body: ["GET", "HEAD"].includes(req.method)
          ? undefined
          : Buffer.concat(parts),
      });
      const response = await service(request);
      res.writeHead(response.status, Object.fromEntries(response.headers));
      res.end(Buffer.from(await response.arrayBuffer()));
    } catch {
      res.writeHead(503, { "Content-Type": "application/json" });
      res.end(
        JSON.stringify({
          error: {
            code: "SERVICE_UNAVAILABLE",
            message: "Không thể xử lý yêu cầu IoT.",
            details: null,
          },
        }),
      );
    }
  };
}
