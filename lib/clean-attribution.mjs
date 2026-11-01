/**
 * Định danh món cho khay sạch 0% (3-Tier Dish Attribution).
 * Không theo dõi danh tính học sinh; chỉ dùng số đếm theo món.
 * Hàm thuần, xác định, kiểm thử trong clean-attribution.test.mjs.
 */

const finite = (v) => typeof v === "number" && Number.isFinite(v) && v >= 0;

/**
 * Tầng 2 — đối chuẩn khấu trừ: khay sạch của món = đã phát − khay còn thừa nhận diện được.
 * @param {{dish:string,served:number,identified:number}[]} dishes
 * @returns {{dish:string,served:number,identified:number,clean:number|null,inconsistent:boolean}[]}
 */
export function marginalBalance(dishes) {
  return dishes.map(({ dish, served, identified }) => {
    if (!finite(served) || !finite(identified))
      return { dish, served, identified, clean: null, inconsistent: true };
    const clean = served - identified;
    return { dish, served, identified, clean: Math.max(0, clean), inconsistent: clean < 0 };
  });
}

/**
 * Tầng 3 — chia khay sạch chưa định danh theo tỷ trọng suất nấu S_i / ΣS (EcoTray Lite).
 * Dùng phương pháp phần dư lớn nhất để tổng bằng đúng số khay trong Clean Pool.
 * @param {number} pool
 * @param {{dish:string,cooked:number}[]} dishes
 */
export function priorAllocation(pool, dishes) {
  const total = dishes.reduce((s, d) => s + (finite(d.cooked) ? d.cooked : 0), 0);
  if (!finite(pool) || !Number.isInteger(pool) || total <= 0)
    return dishes.map(({ dish }) => ({ dish, trays: null, weight: null }));
  const raw = dishes.map(({ dish, cooked }) => {
    const weight = (finite(cooked) ? cooked : 0) / total, exact = pool * weight;
    return { dish, weight, trays: Math.floor(exact), frac: exact - Math.floor(exact) };
  });
  let left = pool - raw.reduce((s, r) => s + r.trays, 0);
  [...raw].sort((a, b) => b.frac - a.frac).forEach((r) => {
    if (left-- > 0) r.trays++;
  });
  return raw.map(({ dish, weight, trays }) => ({ dish, trays, weight }));
}

/** Khay sạch 0% = mọi thành phần còn lại ≤ ngưỡng (mặc định 2%). */
export const isCleanTray = (values, threshold = 2) => {
  const v = Object.values(values ?? {});
  return v.length > 0 && v.every((x) => typeof x === "number" && x <= threshold);
};

/** Chọn tầng: có NFC → Tầng 2; không có → Tầng 3. */
export const attributionTier = (hasNfc) => (hasNfc ? 2 : 3);
