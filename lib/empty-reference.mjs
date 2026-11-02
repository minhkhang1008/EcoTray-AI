/** Empty-tray reference differencing.
 *
 * A fixed station camera can store one frame of the clean tray. A pixel that still
 * matches that frame (within a small tolerance and a small search radius, for sensor
 * jitter) is *static*: tray texture, steel glare from the fixed lamp, printed marks or
 * a permanent stain. Static pixels cannot be leftover food.
 *
 * Limits, stated plainly: sauce and solid food both differ from a clean tray, so this
 * cannot separate them. It only removes what is already visible on the empty tray.
 * Both frames must come from the same camera position and be photometrically
 * normalised the same way before comparison.
 */
export const REFERENCE_TOLERANCE = 0.12; // mean |ΔRGB| / 255 above which a pixel counts as changed
export const REFERENCE_SEARCH_RADIUS = 2; // px, absorbs small camera/mount jitter

export function assertComparable(image, reference) {
  if (
    !reference ||
    reference.width !== image.width ||
    reference.height !== image.height ||
    reference.data?.length !== reference.width * reference.height * 4
  )
    throw Error("Khung khay trống phải cùng kích thước với ảnh cần đọc.");
}

function diffAt(image, reference, x, y, rx, ry) {
  const i = (y * image.width + x) * 4,
    j = (ry * reference.width + rx) * 4;
  return (
    (Math.abs(image.data[i] - reference.data[j]) +
      Math.abs(image.data[i + 1] - reference.data[j + 1]) +
      Math.abs(image.data[i + 2] - reference.data[j + 2])) /
    765
  );
}

/** Smallest difference between the pixel and the reference over a 3×3 grid of offsets. */
export function minReferenceDiff(
  image,
  reference,
  x,
  y,
  radius = REFERENCE_SEARCH_RADIUS,
) {
  let best = Infinity;
  for (const dy of [-radius, 0, radius])
    for (const dx of [-radius, 0, radius]) {
      const rx = Math.min(image.width - 1, Math.max(0, x + dx)),
        ry = Math.min(image.height - 1, Math.max(0, y + dy));
      const d = diffAt(image, reference, x, y, rx, ry);
      if (d < best) best = d;
    }
  return best;
}

export const pixelChanged = (
  image,
  reference,
  x,
  y,
  tolerance = REFERENCE_TOLERANCE,
) => minReferenceDiff(image, reference, x, y) > tolerance;

/** Per-region summary used by the offline experiment: share of changed pixels and mean difference. */
export function referenceDiffFeatures(image, reference, box) {
  assertComparable(image, reference);
  const [x1, y1, x2, y2] = box.map((v, i) =>
    Math.floor(v * (i % 2 === 0 ? image.width : image.height)),
  );
  let n = 0,
    changed = 0,
    sum = 0;
  for (let y = y1; y < y2; y++)
    for (let x = x1; x < x2; x++) {
      const d = minReferenceDiff(image, reference, x, y);
      n++;
      sum += d;
      changed += d > REFERENCE_TOLERANCE ? 1 : 0;
    }
  if (!n) throw Error("Vùng khay rỗng.");
  return { changedFraction: changed / n, meanAbsDiff: sum / n };
}
