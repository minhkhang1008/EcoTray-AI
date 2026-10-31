import test from "node:test";
import assert from "node:assert/strict";
import {
  analyzeStationPixels,
  stationRois,
  rotatePortrait,
} from "./station-vision.mjs";
function fixture(side = "right") {
  const width = 200,
    height = 150,
    data = new Uint8Array(width * height * 4);
  for (let i = 0; i < data.length; i += 4) data.set([110, 110, 110, 255], i);
  const boxes = stationRois();
  function paint(box, color, fraction = 1) {
    const [x1, y1, x2, y2] = box;
    for (let y = Math.ceil(y1 * height); y < Math.floor(y2 * height); y++)
      for (
        let x = Math.ceil(x1 * width);
        x < (x1 + (x2 - x1) * fraction) * width;
        x++
      ) {
        const delta = (x + y) % 2 ? 8 : 0;
        data.set([...color.map((v) => v + delta), 255], (y * width + x) * 4);
      }
  }
  paint(boxes.rice, [190, 185, 177], 0.7);
  paint(boxes.main, [120, 65, 35], 0.5);
  paint(
    side === "right" ? boxes.veg_right : boxes.veg_left,
    [95, 110, 45],
    0.6,
  );
  return { width, height, data };
}
function rotate(image) {
  const { width, height, data } = image,
    out = new Uint8Array(data.length);
  for (let i = 0; i < width * height; i++)
    out.set(data.subarray(i * 4, i * 4 + 4), (width * height - 1 - i) * 4);
  return { width, height, data: out };
}
test("ESP32 calibrated coordinates and smart vegetable side use the same pixels as overlays", () => {
  for (const side of ["left", "right"]) {
    const a = analyzeStationPixels(fixture(side));
    assert.equal(a.orientation, 0);
    assert.deepEqual(a.rois.rice, [0.04, 0.05, 0.55, 0.49]);
    assert.deepEqual(a.rois.veg, stationRois()["veg_" + side]);
    assert.ok(a.pcts[0] >= 65 && a.pcts[0] <= 75, a.pcts.join(","));
    assert.ok(a.pcts[1] >= 45 && a.pcts[1] <= 55, a.pcts.join(","));
    assert.ok(a.pcts[2] >= 55 && a.pcts[2] <= 65, a.pcts.join(","));
  }
});
test("auto orientation follows rice under 180 degree rotation; manual override actually reanalyzes", () => {
  const original = fixture(),
    a = analyzeStationPixels(original),
    b = analyzeStationPixels(rotate(original));
  assert.equal(b.orientation, 180);
  a.pcts.forEach((p, i) => assert.ok(Math.abs(p - b.pcts[i]) < 4));
  const wrong = analyzeStationPixels(original, { orientation: 180 });
  assert.notDeepEqual(a.pcts, wrong.pcts);
});
test("portrait normalization preserves pixels and maps boxes to original image", () => {
  const landscape = fixture(),
    portrait = {
      width: landscape.height,
      height: landscape.width,
      data: new Uint8Array(landscape.data.length),
    };
  for (let y = 0; y < landscape.height; y++)
    for (let x = 0; x < landscape.width; x++)
      portrait.data.set(
        landscape.data.subarray(
          (y * landscape.width + x) * 4,
          (y * landscape.width + x) * 4 + 4,
        ),
        ((landscape.width - 1 - x) * portrait.width + y) * 4,
      );
  assert.deepEqual(rotatePortrait(portrait).data, landscape.data);
  const a = analyzeStationPixels(portrait);
  assert.equal(a.rotation, 90);
  a.rois.rice.forEach((v, i) =>
    assert.ok(Math.abs(v - [0.05, 0.45, 0.49, 0.96][i]) < 1e-9),
  );
});
test("neutral empty steel and white soup rim do not count as food", () => {
  const width = 200,
    height = 150,
    data = new Uint8Array(width * height * 4);
  for (let i = 0; i < data.length; i += 4) data.set([110, 110, 110, 255], i);
  const [x1, y1, x2, y2] = stationRois().soup;
  for (let y = 0; y < height; y++)
    for (let x = 0; x < width; x++) {
      const nx = (x / width - (x1 + x2) / 2) / ((x2 - x1) / 2),
        ny = (y / height - (y1 + y2) / 2) / ((y2 - y1) / 2);
      if (nx * nx + ny * ny > 0.7 && nx * nx + ny * ny < 1)
        data.set([230, 225, 210, 255], (y * width + x) * 4);
    }
  const a = analyzeStationPixels({ width, height, data });
  assert.deepEqual(a.pcts, [0, 0, 0, 0]);
});

test("supplied physical OV2640 frame selects right vegetables and suppresses the soup bowl rim", async () => {
  const { readFile } = await import("node:fs/promises"),
    { default: jpeg } = await import("jpeg-js");
  const image = jpeg.decode(
    await readFile(
      new URL("../data/vision-fixtures/esp32-top-rice.jpg", import.meta.url),
    ),
    { useTArray: true },
  );
  const a = analyzeStationPixels(image);
  assert.equal(a.orientation, 0);
  assert.deepEqual(a.rois.veg, stationRois().veg_right);
  // Operator visual ranges, NOT weighed labels or validation accuracy.
  for (const [i, [lo, hi]] of [
    [65, 75],
    [45, 55],
    [55, 62],
    [20, 30],
  ].entries())
    assert.ok(a.pcts[i] >= lo && a.pcts[i] <= hi, a.pcts.join(","));
  const b = analyzeStationPixels(rotate(image));
  assert.equal(b.orientation, 180);
  a.pcts.forEach((p, i) => assert.ok(Math.abs(p - b.pcts[i]) < 2));
});
test("elongated metallic glints are excluded while broad bright rice is retained", () => {
  const width = 200,
    height = 150,
    data = new Uint8Array(width * height * 4);
  for (let i = 0; i < data.length; i += 4) data.set([110, 110, 110, 255], i);
  for (let y = 30; y < 33; y++)
    for (let x = 15; x < 100; x++)
      data.set([245, 245, 245, 255], (y * width + x) * 4);
  assert.equal(
    analyzeStationPixels({ width, height, data }, { orientation: 0 }).pcts[0],
    0,
  );
  for (let y = 15; y < 60; y++)
    for (let x = 15; x < 95; x++)
      data.set([230, 228, 222, 255], (y * width + x) * 4);
  assert.ok(
    analyzeStationPixels({ width, height, data }, { orientation: 0 }).pcts[0] >
      40,
  );
});
test("both portrait directions preserve food percentages after automatic landscape rotation", () => {
  const a = fixture();
  const portrait = {
    width: a.height,
    height: a.width,
    data: new Uint8Array(a.data.length),
  };
  for (let y = 0; y < a.height; y++)
    for (let x = 0; x < a.width; x++)
      portrait.data.set(
        a.data.subarray((y * a.width + x) * 4, (y * a.width + x) * 4 + 4),
        ((a.width - 1 - x) * portrait.width + y) * 4,
      );
  const expected = analyzeStationPixels(a).pcts;
  for (const image of [portrait, rotate(portrait)])
    analyzeStationPixels(image).pcts.forEach((p, i) =>
      assert.ok(Math.abs(p - expected[i]) < 4),
    );
});
