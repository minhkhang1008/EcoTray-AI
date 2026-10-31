export const visionKeys = ["rice", "main", "veg", "soup"];
export function getRois(vegPos = "TR") {
  return {
    rice: [0.37, 0.5, 0.94, 0.93],
    main: [0.3, 0.06, 0.67, 0.46],
    veg: vegPos === "TL" ? [0.05, 0.06, 0.28, 0.46] : [0.69, 0.06, 0.94, 0.46],
    soup: [0.04, 0.49, 0.34, 0.94],
  };
}
/** Where the four outer tray corners (TL, TR, BR, BL) land after alignment. The ROIs above
 *  were drawn on photos whose tray filled roughly this box, so aligned images keep them valid. */
export const CANONICAL_TRAY_CORNERS = [
  [0.03, 0.05],
  [0.93, 0.05],
  [0.93, 0.96],
  [0.03, 0.96],
];
function solve(a, b) {
  const n = b.length,
    m = a.map((row, i) => [...row, b[i]]);
  for (let c = 0; c < n; c++) {
    let p = c;
    for (let r = c + 1; r < n; r++)
      if (Math.abs(m[r][c]) > Math.abs(m[p][c])) p = r;
    if (Math.abs(m[p][c]) < 1e-12) throw Error("Bốn góc khay không hợp lệ.");
    [m[c], m[p]] = [m[p], m[c]];
    for (let r = 0; r < n; r++) {
      if (r === c) continue;
      const f = m[r][c] / m[c][c];
      for (let k = c; k <= n; k++) m[r][k] -= f * m[c][k];
    }
  }
  return m.map((row, i) => row[n] / row[i]);
}
/** 3×3 homography (row-major, h33 = 1) mapping each `from` point onto the matching `to` point. */
export function homography(from, to) {
  const a = [],
    b = [];
  from.forEach(([x, y], i) => {
    const [u, v] = to[i];
    a.push([x, y, 1, 0, 0, 0, -u * x, -u * y]);
    b.push(u);
    a.push([0, 0, 0, x, y, 1, -v * x, -v * y]);
    b.push(v);
  });
  return [...solve(a, b), 1];
}
export function validCorners(corners) {
  return (
    Array.isArray(corners) &&
    corners.length === 4 &&
    corners.every(
      (p) =>
        Array.isArray(p) &&
        p.length === 2 &&
        p.every((v) => Number.isFinite(v) && v >= -0.1 && v <= 1.1),
    )
  );
}
/** Perspective-align a tray photo: `corners` are the outer tray corners (TL, TR, BR, BL) in
 *  normalized image coordinates. Nearest-neighbour sampling; outside pixels become black
 *  (black counts as utensil and is excluded from every ratio). Same output size as input. */
export function warpToCanonical(image, corners) {
  if (!validCorners(corners)) throw Error("Bốn góc khay không hợp lệ.");
  const { width, height, data } = image;
  const h = homography(CANONICAL_TRAY_CORNERS, corners);
  const out = new Uint8Array(width * height * 4);
  for (let y = 0; y < height; y++)
    for (let x = 0; x < width; x++) {
      const u = (x + 0.5) / width,
        v = (y + 0.5) / height,
        w = h[6] * u + h[7] * v + h[8],
        sx = Math.floor(((h[0] * u + h[1] * v + h[2]) / w) * width),
        sy = Math.floor(((h[3] * u + h[4] * v + h[5]) / w) * height),
        o = (y * width + x) * 4;
      out[o + 3] = 255;
      if (sx < 0 || sy < 0 || sx >= width || sy >= height) continue;
      const i = (sy * width + sx) * 4;
      out[o] = data[i];
      out[o + 1] = data[i + 1];
      out[o + 2] = data[i + 2];
    }
  return { width, height, data: out };
}
/** Fixed, normalized tray regions. Heuristics suppress flat broth, dark utensils and steel; not segmentation. */
export function extractFeatures(image, box) {
  const { width, height, data } = image;
  if (
    !Number.isInteger(width) ||
    !Number.isInteger(height) ||
    width < 1 ||
    height < 1 ||
    data.length !== width * height * 4
  )
    throw Error("Ảnh pixel không hợp lệ.");
  const [x1, y1, x2, y2] = box.map((v, i) =>
    Math.floor(v * (i % 2 === 0 ? width : height)),
  );
  let n = 0;
  const sums = [0, 0, 0, 0, 0, 1];
  const gray = (x, y) => {
    const i = (y * width + x) * 4;
    return (0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2]) / 255;
  };
  for (let y = y1; y < y2; y++)
    for (let x = x1; x < x2; x++) {
      const i = (y * width + x) * 4,
        r = data[i] / 255,
        g = data[i + 1] / 255,
        b = data[i + 2] / 255;
      const v = Math.max(r, g, b),
        sat = v === 0 ? 0 : (v - Math.min(r, g, b)) / v;
      const tex =
        Math.abs(gray(x, y) - gray(Math.max(x1, x - 1), y)) +
        Math.abs(gray(x, y) - gray(x, Math.max(y1, y - 1)));
      const utensil = v < 0.16 && sat < 0.25,
        metal = sat < 0.14 && v >= 0.18 && v < 0.78;
      sums[0] += !metal && !utensil ? 1 : 0;
      sums[1] += v >= 0.7 && sat < 0.22 && !utensil ? 1 : 0;
      sums[2] += sat >= 0.16 && tex > 0.03 && !utensil ? 1 : 0;
      sums[3] += sat;
      sums[4] += tex;
      n++;
    }
  if (!n) throw Error("Vùng khay rỗng.");
  return sums.map((s, i) => (i === 5 ? 1 : s / n));
}
