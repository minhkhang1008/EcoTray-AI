import test from "node:test";
import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import catalog from "../data/ptnk-trays.json" with { type: "json" };
import model from "../src/lib/ecotrayModels.json" with { type: "json" };

// Guards the gallery catalog as photos are added (see scripts/ingest_ptnk_photos.py).
test("every catalog photo is labelled, complete, backed by files, and has model features", () => {
  for (const [id, m] of Object.entries(catalog)) {
    assert.ok(!m.needsLabel && m.labelSource !== "pending-intake", `${id}: unlabeled photo reached the catalog`);
    assert.ok(Array.isArray(m.y) && m.y.length === 4 && m.y.every((v) => Number.isFinite(v) && v >= 0 && v <= 100), `${id}: y`);
    assert.ok(["TL", "TR"].includes(m.veg_pos), `${id}: veg_pos`);
    assert.ok([0, 90, -90, 180].includes(m.rotation), `${id}: rotation`);
    assert.match(m.date, /^\d{4}-\d{2}-\d{2}$/, `${id}: date`);
    assert.ok(m.combo?.trim(), `${id}: combo`);
    assert.ok(catalog[m.group] || m.group === id, `${id}: group ${m.group} is not a catalog photo`);
    assert.ok(existsSync(new URL(`../public/ptnk-trays/${id}`, import.meta.url)), `${id}: missing original`);
    assert.ok(existsSync(new URL(`../public/ptnk-normalized/${id}`, import.meta.url)), `${id}: missing preview`);
    assert.ok(model.features[id], `${id}: not in the trained model — retrain with scripts/train_ecotray_vision.py`);
  }
  assert.deepEqual(Object.keys(model.features).sort(), Object.keys(catalog).sort());
});
