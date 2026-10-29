import { readFile } from "node:fs/promises";
import jpeg from "jpeg-js";
import catalog from "../data/ptnk-trays.json" with { type: "json" };
import { extractFeatures, getRois, visionKeys } from "../lib/ptnk-features.mjs";
const records = {};
for (const [filename, meta] of Object.entries(catalog)) {
  const bytes = await readFile(
    new URL("../public/ptnk-normalized/" + filename, import.meta.url),
  );
  const image = jpeg.decode(bytes, {
    useTArray: true,
    maxResolutionInMP: 2,
    maxMemoryUsageInMB: 64,
  });
  if (image.width !== 800 || image.height !== 600)
    throw Error(filename + ": expected normalized 800×600");
  records[filename] = Object.fromEntries(
    visionKeys.map((k) => [
      k,
      extractFeatures(image, getRois(meta.veg_pos)[k]),
    ]),
  );
}
process.stdout.write(JSON.stringify(records));
