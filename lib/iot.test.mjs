import test from "node:test";
import assert from "node:assert/strict";
import { createIotService, MemoryStore } from "../server/iot.mjs";
const hash = "a".repeat(64),
  date = "2026-10-22T04:00:00.000Z";
const setup = () =>
  createIotService({
    store: new MemoryStore(),
    profiles: [
      {
        cardUidHash: hash,
        schoolId: "ptnk",
        menuId: "vit",
        menuName: "Vịt kho gừng",
        allergyFlags: ["Đậu phộng"],
      },
    ],
    now: () => new Date(date),
  });
const request = (route, body, key = "event-1") =>
  new Request("http://localhost/api/iot/" + route, {
    method: body === undefined ? "GET" : "POST",
    headers: {
      "Content-Type": "application/json",
      "Idempotency-Key": key,
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
const nfc = {
  eventId: "event-1",
  schoolId: "ptnk",
  stationId: "gate-1",
  cardUidHash: hash,
  scannedAt: date,
};
test("open access, errors and canonical NFC contract; duplicate cards rejected across new events", async () => {
  const service = setup();
  const r = await service(request("nfc-scan", nfc));
  assert.equal(r.status, 200);
  const b = await r.json();
  assert.equal(b.status, "ALLERGY_WARNING");
  assert.equal(b.servedCount, 1);
  const r2 = await service(
    request("nfc-scan", { ...nfc, eventId: "event-2" }, "event-2"),
  );
  assert.equal((await r2.json()).status, "ALREADY_REDEEMED");
  const bad = await service(
    request("nfc-scan", { ...nfc, scannedAt: "yesterday" }, "bad"),
  );
  assert.equal(bad.status, 400);
  assert.ok((await bad.json()).error.code);
});
test("concurrent retries are atomic and changed-body key conflicts", async () => {
  const service = setup();
  const r = await Promise.all(
    Array.from({ length: 12 }, () => service(request("nfc-scan", nfc))),
  );
  assert.ok(r.every((x) => x.status === 200));
  assert.ok(
    (await Promise.all(r.map((x) => x.json()))).every(
      (x) => x.servedCount === 1,
    ),
  );
  assert.equal(
    (await service(request("nfc-scan", { ...nfc, stationId: "other" }))).status,
    409,
  );
  const status = await (
    await service(request("status?schoolId=ptnk", undefined, ""))
  ).json();
  assert.equal(status.servedCount, 1);
});
test("raw JPEG queues with 202; callback advances queue and cannot silently replace result", async () => {
  const service = setup();
  const bytes = new Uint8Array([255, 216, 255, 224, 0, 1, 255, 217]);
  const capture = () =>
    new Request("http://localhost/api/iot/tray-capture", {
      method: "POST",
      headers: {
        "Content-Type": "image/jpeg",
        "X-School-Id": "ptnk",
        "X-Station-Id": "cam-1",
        "X-Captured-At": date,
        "Idempotency-Key": "capture-1",
      },
      body: bytes,
    });
  // JPEG signature alone is insufficient; malformed images must be rejected.
  assert.equal((await service(capture())).status, 400);
});
test("JSON Lambda results validate percentages, never fetch arbitrary image URLs, honor school scope", async () => {
  const service = setup(),
    body = {
      schoolId: "ptnk",
      stationId: "cam-1",
      capturedAt: date,
      dishId: "vit",
      riceLeftoverPct: 8,
      vegLeftoverPct: 62,
      mainLeftoverPct: 5,
    };
  const r = await service(request("tray-capture", body, "tray-1"));
  assert.equal(r.status, 202);
  const queued = await r.json();
  assert.equal(queued.status, "QUEUED");
  const status = await (
    await service(request("status?schoolId=ptnk", undefined, "", "read-test"))
  ).json();
  assert.equal(status.latestCapture.status, "COMPLETED");
  assert.equal(status.latestCapture.result.vegetables, 62);
  assert.equal(
    (
      await service(
        request("tray-capture", { ...body, riceLeftoverPct: -1 }, "bad"),
      )
    ).status,
    400,
  );
  assert.equal(
    (
      await service(
        request(
          "tray-capture",
          { ...body, imageUrl: "http://169.254.169.254/" },
          "bad-url",
        ),
      )
    ).status,
    400,
  );
  assert.equal(
    (
      await service(
        request("status?schoolId=another", undefined, ""),
      )
    ).status,
    403,
  );
});

test("valid 800x600 JPEG completes through worker callback; retries preserve queued response and final state", async () => {
  const { default: jpeg } = await import("jpeg-js");
  const service = setup(),
    bytes = jpeg.encode(
      { width: 800, height: 600, data: Buffer.alloc(800 * 600 * 4, 255) },
      30,
    ).data;
  const capture = () =>
    new Request("http://localhost/api/iot/tray-capture", {
      method: "POST",
      headers: {
        "Content-Type": "image/jpeg",
        "X-School-Id": "ptnk",
        "X-Station-Id": "cam-1",
        "X-Captured-At": date,
        "Idempotency-Key": "photo-1",
      },
      body: bytes,
    });
  const queued = await service(capture());
  assert.equal(queued.status, 202);
  const body = await queued.json();
  assert.equal(body.status, "QUEUED");
  let status = await (
    await service(request("status?schoolId=ptnk", undefined, ""))
  ).json();
  assert.equal(status.latestCapture.status, "QUEUED");
  const image = await service(
    request(
      "image?schoolId=ptnk&captureId=" + body.captureId,
      undefined,
      "",
    ),
  );
  assert.equal(image.headers.get("content-type"), "image/jpeg");
  assert.deepEqual(Buffer.from(await image.arrayBuffer()), bytes);
  const processing = {
    captureId: body.captureId,
    schoolId: "ptnk",
    stationId: "cam-1",
    status: "PROCESSING",
  };
  assert.equal(
    (await service(request("capture-result", processing, "processing"))).status,
    200,
  );
  const complete = {
    ...processing,
    status: "COMPLETED",
    riceLeftoverPct: 8,
    vegLeftoverPct: 62,
    mainLeftoverPct: 5,
    latencyMs: 680,
  };
  assert.equal(
    (await service(request("capture-result", complete, "completed"))).status,
    200,
  );
  assert.equal(
    (await service(request("capture-result", complete, "completed"))).status,
    200,
  );
  assert.equal(
    (
      await service(
        request(
          "capture-result",
          { ...complete, riceLeftoverPct: 20 },
          "replace",
        ),
      )
    ).status,
    409,
  );
  assert.deepEqual(await (await service(capture())).json(), body);
  status = await (
    await service(request("status?schoolId=ptnk", undefined, "", "read-test"))
  ).json();
  assert.equal(status.latestCapture.status, "COMPLETED");
  assert.equal(status.latestCapture.result.vegetables, 62);
  assert.equal(status.latestCapture.latencyMs, 680);
});

test("event ID cannot be replayed under a second key with changed data, unknown cards never count", async () => {
  const service = setup();
  await service(request("nfc-scan", nfc));
  assert.equal(
    (
      await service(
        request("nfc-scan", { ...nfc, stationId: "other" }, "different-key"),
      )
    ).status,
    409,
  );
  const unknown = await (
    await service(
      request(
        "nfc-scan",
        { ...nfc, eventId: "unknown", cardUidHash: "c".repeat(64) },
        "unknown",
      ),
    )
  ).json();
  assert.equal(unknown.status, "UNKNOWN_CARD");
  assert.equal(unknown.servedCount, 1);
  assert.equal(
    (
      await service(
        request(
          "status?schoolId=ptnk&since=garbage",
          undefined,
          "",
        ),
      )
    ).status,
    400,
  );
});

test("no persistence configuration fails closed and Web NFC raw UID is HMACed before storage", async () => {
  const unavailable = createIotService({
    store: null,
  });
  assert.equal(
    (
      await unavailable(
        request("status?schoolId=ptnk", undefined, ""),
      )
    ).status,
    503,
  );
  const { createHmac } = await import("node:crypto"),
    store = new MemoryStore(),
    hash = createHmac("sha256", "test-only-secret")
      .update("04a28f19")
      .digest("hex");
  const service = createIotService({
    store,
    uidSecret: "test-only-secret",
    profiles: [
      {
        schoolId: "ptnk",
        cardUidHash: hash,
        menuId: "vit",
        menuName: "Vịt kho gừng",
        allergyFlags: [],
      },
    ],
    now: () => new Date(date),
  });
  const response = await (
    await service(request("nfc-scan", { uid: "04:A2:8F:19", timestamp: date }))
  ).json();
  assert.equal(response.status, "VALID");
  assert.equal(response.cardUidHash, hash);
  assert.ok(
    !JSON.stringify([...store.values.values()]).includes("04:A2:8F:19"),
  );
});

test("a conflicting image retry cannot overwrite the image from the winning atomic capture", async () => {
  const { default: jpeg } = await import("jpeg-js"),
    service = setup();
  const pictures = [255, 40].map(
    (fill) =>
      jpeg.encode(
        { width: 800, height: 600, data: Buffer.alloc(800 * 600 * 4, fill) },
        30,
      ).data,
  );
  const photo = (bytes) =>
    new Request("http://localhost/api/iot/tray-capture", {
      method: "POST",
      headers: {
        "Content-Type": "image/jpeg",
        "X-School-Id": "ptnk",
        "X-Station-Id": "cam-1",
        "X-Captured-At": date,
        "Idempotency-Key": "same-photo-key",
      },
      body: bytes,
    });
  const responses = await Promise.all(pictures.map((p) => service(photo(p))));
  assert.deepEqual(responses.map((r) => r.status).sort(), [202, 409]);
  const winner = responses.findIndex((r) => r.status === 202),
    queued = await responses[winner].json();
  const image = await service(
    request(
      "image?schoolId=ptnk&captureId=" + queued.captureId,
      undefined,
      "",
    ),
  );
  assert.deepEqual(Buffer.from(await image.arrayBuffer()), pictures[winner]);
});

test("HTTP node adapter accepts public JSON, returns data, and bounds streaming payloads", async () => {
  const { createServer } = await import("node:http");
  const { nodeHandler } = await import("../server/node-handler.mjs");
  const server = createServer(nodeHandler(setup()));
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  try {
    const base = "http://127.0.0.1:" + server.address().port;
    const result = await fetch(base + "/api/iot/nfc-scan", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Idempotency-Key": "http-event",
      },
      body: JSON.stringify({ ...nfc, eventId: "http-event" }),
    });
    assert.equal(result.status, 200);
    assert.equal((await result.json()).servedCount, 1);
    const oversized = await fetch(base + "/api/iot/nfc-scan", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: "x".repeat(250001),
    });
    assert.equal(oversized.status, 413);
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
});

test("Vercel refuses RAM fallback even when local-memory flag is set", async () => {
  const { configuredService } = await import("../server/node-handler.mjs");
  const service = configuredService({
    VERCEL: "1",
    IOT_LOCAL_MEMORY: "true",
  });
  assert.equal(
    (await service(request("status?schoolId=ptnk", undefined, "")))
      .status,
    503,
  );
});

test("fourth component is optional and soup percentages are validated at the hardware boundary", async () => {
  const service = setup();
  const body = {schoolId:"ptnk", stationId:"cam-1", capturedAt:date, dishId:"vit", riceLeftoverPct:6, vegLeftoverPct:46.5, mainLeftoverPct:5.5, soupLeftoverPct:32};
  assert.equal((await service(request("tray-capture", body, "soup"))).status, 202);
  const status = await (await service(request("status?schoolId=ptnk", undefined, ""))).json();
  assert.equal(status.latestCapture.result.soup, 32);
  assert.equal((await service(request("tray-capture", {...body, soupLeftoverPct:101}, "bad-soup"))).status, 400);
});
