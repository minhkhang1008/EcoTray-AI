export const visionKeys = ["rice", "main", "veg", "soup"];
export function getRois(vegPos = "TR") {
  return {
    rice: [0.37, 0.5, 0.94, 0.93],
    main: [0.3, 0.06, 0.67, 0.46],
    veg: vegPos === "TL" ? [0.05, 0.06, 0.28, 0.46] : [0.69, 0.06, 0.94, 0.46],
    soup: [0.04, 0.49, 0.34, 0.94],
  };
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
