import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import {
  createVisionService,
  configuredVisionService,
} from "../server/vision.mjs";
import { MemoryStore } from "../server/store.mjs";
const req = (body, headers = {}) =>
  new Request("http://localhost/api/ai/analyze-tray", {
    method: "POST",
    headers: { "content-type": "application/json", ...headers },
    body: JSON.stringify(body),
  });
test("catalog requests are stateless; cold feed never invents hardware", async () => {
  const service = createVisionService({ store: new MemoryStore() });
  const response = await service(req({ sampleId: "IMG_20261028_115444.jpg" }));
  assert.equal(response.status, 200);
  assert.equal((await response.json()).source, "sandbox");
  const feed = await (
    await service(new Request("http://localhost/api/ai/analyze-tray"))
  ).json();
  assert.equal(feed.analysis, null);
});
test("unknown samples, nonfinite vectors, invalid input, oversized bodies and methods are rejected", async () => {
  const service = createVisionService();
  for (const body of [
    { sampleId: "../evil.jpg" },
    [],
    { featureVectors: { rice: [null] } },
    { overridePcts: [1, 2, 3, 4] },
    { sampleId: "IMG_20261028_115429.jpg", publish: true },
  ])
    assert.equal((await service(req(body))).status, 400);
  assert.equal(
    (
      await service(
        new Request("http://localhost/api/ai/analyze-tray", {
          method: "DELETE",
        }),
      )
    ).status,
    405,
  );
  assert.equal((await service(req({ data: "a".repeat(250001) }))).status, 413);
  assert.equal(
    (
      await service(
        new Request("http://localhost/api/ai/analyze-tray", {
          method: "POST",
          headers: { "content-type": "image/jpeg" },
          body: new Uint8Array([1, 2, 3]),
        }),
      )
    ).status,
    400,
  );
});
test("production refuses ephemeral storage", async () => {
  const service = configuredVisionService({ NODE_ENV: "production" });
  assert.equal(
    (await service(new Request("http://localhost/api/ai/analyze-tray"))).status,
    503,
  );
});
test("actual JPEG inference persists across service instances, atomically handles retries and rejects conflicts", async () => {
  const store = new MemoryStore(),
    service = createVisionService({ store }),
    other = createVisionService({ store });
  const bytes = await readFile(
    new URL(
      "../public/ptnk-normalized/IMG_20261029_112148.jpg",
      import.meta.url,
    ),
  );
  const headers = {
    "content-type": "image/jpeg",
    "x-school-id": "ptnk",
    "x-station-id": "cam-1",
    "x-captured-at": "2026-10-29T04:30:00Z",
    "idempotency-key": "one",
  };
  const post = () =>
    new Request("http://localhost/api/ai/analyze-tray", {
      method: "POST",
      headers,
      body: bytes,
    });
  const results = await Promise.all([service(post()), other(post())]);
  assert.ok(results.every((r) => r.status === 200));
  const a = await results[0].json(),
    b = await results[1].json();
  assert.equal(a.revision, b.revision);
  assert.equal(a.analysis.predictionSource, "ridge-pixels");
  const feed = await (
    await other(new Request("http://localhost/api/ai/analyze-tray"))
  ).json();
  assert.equal(feed.revision, a.revision);
  assert.match(feed.latestImageUrl, /^data:image\/jpeg;base64,/);
  assert.equal(
    (
      await service(
        new Request("http://localhost/api/ai/analyze-tray", {
          method: "POST",
          headers: { ...headers, "x-captured-at": "2026-10-29T04:31:00Z" },
          body: bytes,
        }),
      )
    ).status,
    409,
  );
  assert.equal(
    (
      await service(
        new Request("http://localhost/api/ai/analyze-tray", {
          method: "POST",
          headers: { ...headers, "x-school-id": "other" },
          body: bytes,
        }),
      )
    ).status,
    403,
  );
});

test("device cohort accumulates same-menu peers and actually trims a statistical outlier", async () => {
  const { MODEL } = await import("./ptnk-vision.mjs");
  const service = createVisionService({ store: new MemoryStore() });
  for (let i = 0; i < 12; i++) {
    const response = await service(
      req(
        {
          featureVectors:
            MODEL.features[i === 11 ? MODEL.anchors.full : MODEL.anchors.empty],
          comboName: "Same menu",
          menuDate: "2026-10-29",
          publish: true,
        },
        {
          "x-school-id": "ptnk",
          "x-station-id": "test",
          "x-captured-at": "2026-10-29T04:00:00Z",
          "idempotency-key": "cohort-" + i,
        },
      ),
    );
    assert.equal(response.status, 200);
    const event = await response.json();
    if (i === 11) {
      assert.equal(event.analysis.iqrEligibleCount, 11);
      assert.equal(event.analysis.isDietaryOutlier, true);
    }
  }
});
