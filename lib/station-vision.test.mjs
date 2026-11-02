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

// Low-quality ESP32 frames: the real fixture must read about the same under typical OV2640 variation.
import { readFileSync } from "node:fs";
import jpeg from "jpeg-js";
function realFrame() {
  const p = jpeg.decode(readFileSync(new URL("../data/vision-fixtures/esp32-top-rice.jpg", import.meta.url)), { useTArray: true });
  return { width: p.width, height: p.height, data: Uint8Array.from(p.data) };
}
function tweak(image, fn) {
  const data = new Uint8Array(image.data);
  for (let i = 0; i < data.length; i += 4) {
    const o = fn(data[i], data[i + 1], data[i + 2], i);
    for (let c = 0; c < 3; c++) data[i + c] = Math.max(0, Math.min(255, o[c]));
  }
  return { ...image, data };
}
test("ESP32 fixture stays stable under colour cast, exposure and sensor noise", () => {
  const frame = realFrame(),
    base = analyzeStationPixels(frame).pcts;
  let seed = 3;
  const noise = () => {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return ((seed / 2 ** 32) - 0.5) * 2 * 20; // uniform ±20 (σ≈11.5)
  };
  const cases = {
    warm: tweak(frame, (r, g, b) => [r * 1.12, g, b * 0.85]),
    cool: tweak(frame, (r, g, b) => [r * 0.88, g, b * 1.12]),
    dark: tweak(frame, (r, g, b) => [r * 0.75, g * 0.75, b * 0.75]),
    bright: tweak(frame, (r, g, b) => [r * 1.25, g * 1.25, b * 1.25]),
    noisy: tweak(frame, (r, g, b) => { const n = noise(); return [r + n, g + n, b + n]; }),
  };
  for (const [name, img] of Object.entries(cases)) {
    const pcts = analyzeStationPixels(img).pcts;
    pcts.forEach((p, i) => assert.ok(Math.abs(p - base[i]) <= 15, `${name}: ${pcts.join(",")} vs ${base.join(",")}`));
    assert.equal(analyzeStationPixels(img).orientation, 0, name);
  }
  // normalisation is what makes this stable: without it a colour cast moves rice by tens of points
  const raw = analyzeStationPixels(cases.warm, { normalize: false }).pcts;
  assert.ok(Math.abs(raw[0] - analyzeStationPixels(frame, { normalize: false }).pcts[0]) > 15);
});

// Empty-tray reference: opt-in, and must not change the plain reading.
test("without a reference the reading is exactly the documented ESP32 fixture result", () => {
  const frame = realFrame(),
    plain = analyzeStationPixels(frame);
  assert.deepEqual(plain.pcts, [71.1, 54.7, 58.8, 27.3]);
  assert.equal(plain.method, "ov2640-area-v1");
  assert.equal("staticSuppressedPct" in plain, false);
  assert.deepEqual(analyzeStationPixels(frame, { reference: null }), plain);
});
function emptyTray() {
  const width = 200,
    height = 150,
    data = new Uint8Array(width * height * 4);
  for (let i = 0; i < data.length; i += 4) data.set([110, 110, 110, 255], i);
  return { width, height, data };
}
function paintBox(image, box, color, fraction = 1) {
  const data = new Uint8Array(image.data),
    [x1, y1, x2, y2] = box;
  for (let y = Math.ceil(y1 * image.height); y < Math.floor(y2 * image.height); y++)
    for (let x = Math.ceil(x1 * image.width); x < (x1 + (x2 - x1) * fraction) * image.width; x++)
      data.set([...color.map((v) => v + ((x + y) % 2 ? 8 : 0)), 255], (y * image.width + x) * 4);
  return { ...image, data };
}
test("a permanent stain that is also in the empty-tray frame is cancelled; real food is kept", () => {
  const boxes = stationRois(),
    stain = [120, 65, 35];
  // The clean tray already carries a brown stain over 30% of the main-dish region.
  const reference = paintBox(emptyTray(), boxes.main, stain, 0.3);
  // Served tray: same stain, plus real rice and real main-dish food on the other 50%.
  let served = paintBox(reference, boxes.rice, [190, 185, 177], 0.7);
  const stainOnly = analyzeStationPixels(reference, { orientation: 0 });
  const plain = analyzeStationPixels(served, { orientation: 0 });
  const withRef = analyzeStationPixels(served, { orientation: 0, reference });
  assert.ok(stainOnly.pcts[1] > 20, "the stain alone reads as main-dish food without a reference");
  assert.equal(withRef.method, "ov2640-area-v1+empty-ref");
  assert.ok(withRef.pcts[1] < 3, `stain should cancel, got ${withRef.pcts[1]}`);
  assert.ok(withRef.staticSuppressedPct.main > 20);
  // Rice was not in the reference, so real rice stays (painted share is 70%). The reference may
  // only shave off static background that the plain reading mistook for rice.
  assert.ok(withRef.pcts[0] <= plain.pcts[0] && withRef.pcts[0] >= plain.pcts[0] - 3, withRef.pcts.join(","));
  assert.ok(withRef.pcts[0] >= 65 && withRef.pcts[0] <= 72);
  // Without normalisation nothing but the stain differs.
  assert.equal(
    analyzeStationPixels(served, { orientation: 0, normalize: false, reference, }).pcts[0],
    analyzeStationPixels(served, { orientation: 0, normalize: false }).pcts[0],
  );
  // A reference identical to the frame leaves nothing that can be food.
  const same = analyzeStationPixels(served, { orientation: 0, reference: served });
  assert.deepEqual(same.pcts, [0, 0, 0, 0]);
});
test("a reference must match the frame size and pixel layout", () => {
  const small = { width: 100, height: 75, data: new Uint8Array(100 * 75 * 4) };
  assert.throws(() => analyzeStationPixels(emptyTray(), { reference: small }), /cùng kích thước/);
  assert.throws(() => analyzeStationPixels(emptyTray(), { reference: { width: 200, height: 150, data: new Uint8Array(4) } }), /Ảnh pixel/);
});
