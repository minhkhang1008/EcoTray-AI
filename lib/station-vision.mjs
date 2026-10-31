/** OV2640 area heuristics, not weighed mass or a validated segmentation model.
 * Coordinates are calibrated to the full ESP32 frame; x>.90 is deliberately
 * excluded. Do not trim then apply these coordinates a second time.
 */
export function stationRois(orientation = 0) {
  const boxes = {
    rice: [0.04, 0.05, 0.55, 0.49],
    soup: [0.57, 0.05, 0.89, 0.49],
    main: [0.31, 0.52, 0.62, 0.94],
    veg_left: [0.04, 0.52, 0.29, 0.94],
    veg_right: [0.63, 0.52, 0.89, 0.94],
  };
  return Object.fromEntries(
    Object.entries(boxes).map(([key, b]) => [
      key,
      orientation === 180 ? [1 - b[2], 1 - b[3], 1 - b[0], 1 - b[1]] : b,
    ]),
  );
}
export function rotatePortrait(image) {
  if (image.height <= image.width) return image;
  const { width, height, data } = image,
    out = new Uint8Array(data.length);
  for (let y = 0; y < height; y++)
    for (let x = 0; x < width; x++)
      out.set(
        data.subarray((y * width + x) * 4, (y * width + x) * 4 + 4),
        (x * height + height - 1 - y) * 4,
      );
  return { width: height, height: width, data: out };
}
function pixel(image, x, y) {
  const i = (y * image.width + x) * 4,
    r = image.data[i] / 255,
    g = image.data[i + 1] / 255,
    b = image.data[i + 2] / 255;
  const v = Math.max(r, g, b),
    s = v ? (v - Math.min(r, g, b)) / v : 0;
  return { r, g, b, v, s, l: 0.299 * r + 0.587 * g + 0.114 * b };
}
// Connected, narrow specular streaks are likely utensils. Large bright rice
// patches remain intact; low contrast utensils may still require manual review.
function specularStreaks(image, left, top, right, bottom) {
  const w = right - left,
    h = bottom - top,
    mask = new Uint8Array(w * h),
    excluded = new Set();
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      const p = pixel(image, left + x, top + y);
      if (p.v > 0.9 && p.s < 0.12) mask[y * w + x] = 1;
    }
  for (let start = 0; start < mask.length; start++) {
    if (!mask[start]) continue;
    const queue = [start];
    mask[start] = 0;
    let x1 = w,
      x2 = 0,
      y1 = h,
      y2 = 0;
    for (let i = 0; i < queue.length; i++) {
      const at = queue[i],
        x = at % w,
        y = Math.floor(at / w);
      x1 = Math.min(x1, x);
      x2 = Math.max(x2, x);
      y1 = Math.min(y1, y);
      y2 = Math.max(y2, y);
      for (const next of [
        x > 0 ? at - 1 : -1,
        x < w - 1 ? at + 1 : -1,
        y > 0 ? at - w : -1,
        y < h - 1 ? at + w : -1,
      ])
        if (next >= 0 && mask[next]) {
          mask[next] = 0;
          queue.push(next);
        }
    }
    const bw = x2 - x1 + 1,
      bh = y2 - y1 + 1;
    if (
      (bw > 4 * bh && bw > w * 0.15 && bh < h * 0.08) ||
      (bh > 4 * bw && bh > h * 0.15 && bw < w * 0.08)
    )
      for (const at of queue)
        excluded.add(
          (top + Math.floor(at / w)) * image.width + left + (at % w),
        );
  }
  return excluded;
}
function region(image, box, key) {
  const { width, height } = image,
    [x1, y1, x2, y2] = box;
  const left = Math.floor(x1 * width),
    top = Math.floor(y1 * height),
    right = Math.floor(x2 * width),
    bottom = Math.floor(y2 * height);
  const streaks =
    key === "rice" ? specularStreaks(image, left, top, right, bottom) : null;
  let count = 0,
    food = 0,
    white = 0,
    rim = 0,
    rimCount = 0;
  for (let y = top; y < bottom; y++)
    for (let x = left; x < right; x++) {
      const p = pixel(image, x, y),
        nx = (x / width - (x1 + x2) / 2) / ((x2 - x1) / 2),
        ny = (y / height - (y1 + y2) / 2) / ((y2 - y1) / 2),
        rad = nx * nx + ny * ny;
      if (rad > 0.72 && rad < 1.05) {
        rimCount++;
        rim += p.l > 0.6 && p.s < 0.26 ? 1 : 0;
      }
      if (key === "soup" && rad > 0.64) continue; // inner 80% radius: never count bowl rim
      count++;
      const texture =
        Math.abs(p.l - pixel(image, Math.max(left, x - 2), y).l) +
        Math.abs(p.l - pixel(image, x, Math.max(top, y - 2)).l);
      const rice = p.v >= 0.62 && p.s < 0.24 && p.l >= 0.58;
      white += rice ? 1 : 0;
      // Extreme neutral glints and deep neutral shadows usually belong to utensils.
      // Broad off-white patches are retained; this is suppression, not utensil identification.
      const utensil =
        streaks?.has(y * width + x) ||
        (p.v > 0.97 && p.s < 0.06 && texture > 0.12) ||
        (p.v < 0.18 && p.s < 0.25);
      if (utensil) continue;
      if (key === "rice") food += rice ? 1 : 0;
      else if (key === "main")
        food +=
          (p.s >= 0.16 && (texture > 0.02 || p.s > 0.5)) ||
          (p.v < 0.4 && p.s > 0.12 && texture > 0.035)
            ? 1
            : 0;
      else if (key === "veg")
        food +=
          (p.v > 0.22 && p.s >= 0.14 && (texture > 0.015 || p.s > 0.28)) ||
          (p.s > 0.1 && p.v > 0.22 && p.v < 0.5 && texture > 0.05)
            ? 1
            : 0;
      else
        food +=
          p.s >= 0.16 && p.v > 0.18 && (texture > 0.025 || p.s > 0.3) ? 1 : 0;
    }
  return {
    coverage: count ? food / count : 0,
    white: count ? white / count : 0,
    rim: rimCount ? rim / rimCount : 0,
  };
}
export function analyzeStationPixels(input, { orientation = "auto" } = {}) {
  if (
    !Number.isInteger(input.width) ||
    !Number.isInteger(input.height) ||
    input.width < 2 ||
    input.height < 2 ||
    input.data?.length !== input.width * input.height * 4
  )
    throw Error("Ảnh pixel không hợp lệ.");
  if (!["auto", 0, 180].includes(orientation))
    throw Error("Chiều khay không hợp lệ.");
  const image = rotatePortrait(input),
    rotation = image === input ? 0 : 90;
  const score = (angle) => {
    const b = stationRois(angle),
      rice = region(image, b.rice, "rice"),
      soup = region(image, b.soup, "soup");
    return rice.white + 0.35 * soup.rim;
  };
  const s0 = score(0),
    s180 = score(180);
  const selected =
    orientation === "auto" ? (s180 > s0 + 0.08 ? 180 : 0) : orientation;
  const b = stationRois(selected),
    left = region(image, b.veg_left, "veg"),
    right = region(image, b.veg_right, "veg");
  const vegSide = left.coverage > right.coverage ? "left" : "right";
  const rois = {
    rice: b.rice,
    main: b.main,
    veg: b["veg_" + vegSide],
    soup: b.soup,
  };
  const pcts = ["rice", "main", "veg", "soup"].map(
    (k) => Math.round(1000 * region(image, rois[k], k).coverage) / 10,
  );
  // All overlays stay in the ORIGINAL image coordinate system, including portrait.
  const mapped = rotation
    ? Object.fromEntries(
        Object.entries(rois).map(([k, [a, c, d, e]]) => [
          k,
          [c, 1 - d, e, 1 - a],
        ]),
      )
    : rois;
  return {
    pcts,
    rois: mapped,
    orientation: selected,
    rotation,
    vegSide,
    orientationUncertain: Math.abs(s0 - s180) < 0.08,
    method: "ov2640-area-v1",
  };
}
