import test from "node:test";
import assert from "node:assert/strict";
import { marginalBalance, priorAllocation, isCleanTray, attributionTier } from "./clean-attribution.mjs";

test("Tầng 2: 400 phát − 250 nhận diện = 150 khay sạch", () => {
  const [a, b] = marginalBalance([
    { dish: "Cơm xá xíu", served: 400, identified: 250 },
    { dish: "Cá sốt cà", served: 200, identified: 230 },
  ]);
  assert.equal(a.clean, 150);
  assert.equal(b.clean, 0);
  assert.equal(b.inconsistent, true);
});
test("Tầng 2: dữ liệu thiếu không tự suy diễn", () => {
  assert.equal(marginalBalance([{ dish: "A", served: NaN, identified: 1 }])[0].clean, null);
});
test("Tầng 3: chia theo tỷ trọng, tổng khớp pool", () => {
  const r = priorAllocation(10, [{ dish: "A", cooked: 300 }, { dish: "B", cooked: 200 }, { dish: "C", cooked: 100 }]);
  assert.equal(r.reduce((s, x) => s + x.trays, 0), 10);
  assert.deepEqual(r.map((x) => x.trays), [5, 3, 2]);
  assert.equal(priorAllocation(5, [{ dish: "A", cooked: 0 }])[0].trays, null);
});
test("nhận diện khay sạch và chọn tầng", () => {
  assert.equal(isCleanTray({ rice: 0, veg: 0, main: 1 }), true);
  assert.equal(isCleanTray({ rice: 0, veg: 25 }), false);
  assert.equal(attributionTier(true), 2);
  assert.equal(attributionTier(false), 3);
});
