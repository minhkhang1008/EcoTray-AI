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
    new URL("../data/vision-fixtures/esp32-top-rice.jpg", import.meta.url),
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
  assert.equal(a.analysis.predictionSource, "ov2640-area");
  assert.deepEqual(
    a.analysis.components.rice.bboxNormalized,
    [0.04, 0.05, 0.55, 0.49],
  );
  assert.deepEqual(
    a.analysis.components.veg.bboxNormalized,
    [0.63, 0.52, 0.89, 0.94],
  );
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

test("menu and orientation reanalysis replaces one capture, preserves time, and never multiplies IQR peers", async () => {
  const store = new MemoryStore(),
    service = createVisionService({ store });
  const bytes = await readFile(
    new URL("../data/vision-fixtures/esp32-top-rice.jpg", import.meta.url),
  );
  const post = (key) =>
    new Request("http://localhost/api/ai/analyze-tray", {
      method: "POST",
      headers: {
        "content-type": "image/jpeg",
        "x-school-id": "ptnk",
        "x-station-id": "test",
        "x-captured-at": "2026-10-30T04:00:00Z",
        "idempotency-key": key,
      },
      body: bytes,
    });
  let event = await (await service(post("original"))).json();
  assert.equal(
    event.analysis.comboName,
    "Thịt kho tàu + Bắp cải xào + Canh bầu",
  );
  assert.equal(event.analysis.menuDate, "2026-10-30");
  assert.equal(event.analysis.iqrEligibleCount, 0);
  const id = event.analysis.sampleId,
    time = event.analysis.timestamp;
  for (const orientation of [180, 0, "auto"]) {
    const beforeRevision = event.revision;
    const response = await service(
      req(
        {
          action: "reanalyze",
          revision: event.revision,
          comboName: "Selected",
          menuDate: "2026-10-30",
          orientation,
        },
        { "x-school-id": "ptnk", "idempotency-key": "edit-" + orientation },
      ),
    );
    assert.equal(response.status, 200);
    event = await response.json();
    const editBody = {
      action: "reanalyze",
      revision: beforeRevision,
      comboName: "Selected",
      menuDate: "2026-10-30",
      orientation,
    };
    const headers = {
      "x-school-id": "ptnk",
      "idempotency-key": "edit-" + orientation,
    };
    const retry = await service(req(editBody, headers));
    assert.equal(retry.status, 200);
    assert.equal((await retry.json()).revision, event.revision);
    assert.equal(
      (await service(req({ ...editBody, comboName: "Changed" }, headers)))
        .status,
      409,
    );
    assert.equal(event.analysis.comboName, "Selected");
    assert.equal(event.analysis.sampleId, id);
    assert.equal(event.analysis.timestamp, time);
    assert.equal(event.analysis.iqrEligibleCount, 0);
    const state = JSON.parse(await store.get("ecotray:vision:ptnk"));
    assert.equal(state.cohort.length, 1);
  }
  const next = await (await service(post("next"))).json();
  assert.equal(next.analysis.comboName, "Selected");
  assert.equal(next.analysis.iqrEligibleCount, 1);
  assert.equal(
    (
      await service(
        req(
          {
            action: "reanalyze",
            revision: event.revision,
            comboName: "Wrong",
            menuDate: "2026-10-30",
            orientation: 0,
          },
          { "x-school-id": "ptnk", "idempotency-key": "stale-edit" },
        ),
      )
    ).status,
    409,
  );
  // A retry still returns the original receipt after the active menu has changed.
  assert.equal((await service(post("original"))).status, 200);
});
test("portrait JPEG inference keeps overlay boxes in the original image frame", async () => {
  const { default: jpeg } = await import("jpeg-js");
  const src = jpeg.decode(
    await readFile(
      new URL("../data/vision-fixtures/esp32-top-rice.jpg", import.meta.url),
    ),
    { useTArray: true },
  );
  const data = new Uint8Array(src.data.length),
    width = src.height,
    height = src.width;
  for (let y = 0; y < src.height; y++)
    for (let x = 0; x < src.width; x++)
      data.set(
        src.data.subarray((y * src.width + x) * 4, (y * src.width + x) * 4 + 4),
        ((src.width - 1 - x) * width + y) * 4,
      );
  const bytes = jpeg.encode({ width, height, data }, 80).data;
  const service = createVisionService({ store: new MemoryStore() });
  const response = await service(
    new Request("http://localhost/api/ai/analyze-tray", {
      method: "POST",
      headers: {
        "content-type": "image/jpeg",
        "x-school-id": "ptnk",
        "x-station-id": "test",
        "x-captured-at": "2026-10-30T04:00:00Z",
        "idempotency-key": "portrait",
      },
      body: bytes,
    }),
  );
  assert.equal(response.status, 200);
  const a = (await response.json()).analysis;
  assert.equal(a.stationLayout.rotation, 90);
  assert.equal(a.stationLayout.orientation, 0);
  a.components.rice.bboxNormalized.forEach((v, i) =>
    assert.ok(Math.abs(v - [0.05, 0.45, 0.49, 0.96][i]) < 1e-9),
  );
});
test("worker feature input without a menu also binds defaults rather than remaining unbound", async () => {
  const { MODEL } = await import("./ptnk-vision.mjs");
  const response = await createVisionService()(
    req({ featureVectors: MODEL.features[MODEL.anchors.empty] }),
  );
  assert.equal(response.status, 200);
  const a = (await response.json()).analysis;
  assert.equal(a.comboName, "Thịt kho tàu + Bắp cải xào + Canh bầu");
  assert.match(a.menuDate, /^\d{4}-\d\d-\d\d$/);
});
