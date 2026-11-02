import {daily, menuPriority, menuStats, needsReview, trend} from './analytics.mjs';
import {keys, labels, summarize} from './core.mjs';

export const analysisMetrics = [
  {key: 'vegetables', label: labels.vegetables},
  {key: 'rice', label: labels.rice},
  {key: 'main', label: labels.main},
  {key: 'overall', label: 'Tổng thể'},
];
export const LONG_TERM_DAYS = 10;
const TOP_DISHES = 8;

const pct = value => `${value.toLocaleString('vi-VN', {maximumFractionDigits: 1})}%`;
const metricOf = (menu, metric) =>
  metric === 'overall'
    ? {mean: menu.mean, n: keys.reduce((total, key) => total + menu[key].n, 0)}
    : menu[metric];

/** Món đủ số quan sát, xếp từ cao xuống thấp theo thành phần đang chọn. */
export function rankMenus(menus, metric, {minSamples}, limit = TOP_DISHES) {
  return menus
    .map(menu => ({menu, ...metricOf(menu, metric)}))
    .filter(item => item.mean !== null && item.n >= minSamples)
    .sort((a, b) => b.mean - a.mean)
    .slice(0, limit);
}

export function validTrayCount(rows) {
  return rows.filter(row => keys.some(key => typeof row[key] === 'number' && Number.isFinite(row[key]))).length;
}

function dominantComponents(menus, minSamples) {
  const eligible = menus
    .map(menu => keys.filter(key => menu[key].mean !== null && menu[key].n >= minSamples).map(key => ({key, mean: menu[key].mean})))
    .filter(parts => parts.length >= 2);
  const counts = new Map();
  for (const parts of eligible) {
    const top = parts.reduce((best, part) => (part.mean > best.mean ? part : best));
    counts.set(top.key, (counts.get(top.key) ?? 0) + 1);
  }
  const leader = [...counts.entries()].sort((a, b) => b[1] - a[1])[0];
  return leader ? {key: leader[0], count: leader[1], total: eligible.length} : null;
}

export function analysisInsights(rows, metric, thresholds) {
  const menus = menuStats(rows);
  const days = daily(rows).length;
  const insights = [];
  const dominant = dominantComponents(menus, thresholds.minSamples);
  if (dominant) insights.push(`${labels[dominant.key]} là thành phần còn lại nhiều nhất ở ${dominant.count}/${dominant.total} món đủ dữ liệu.`);
  const [top] = rankMenus(menus, metric, thresholds, 1);
  if (top) {
    const label = analysisMetrics.find(m => m.key === metric).label;
    insights.push(`${top.menu.menu} có tỷ lệ ${label.toLowerCase()} còn lại cao nhất: ${pct(top.mean)}.`);
  }
  const change = trend(rows);
  if (change) {
    const size = Math.abs(change.points);
    insights.push(size < 1
      ? `Tỷ lệ còn lại gần như không đổi giữa nửa đầu và nửa sau của kỳ (${pct(change.first)} và ${pct(change.last)}).`
      : `Tỷ lệ còn lại ${change.points > 0 ? 'tăng' : 'giảm'} ${pct(size).replace('%', '')} điểm phần trăm từ nửa đầu đến nửa sau của kỳ.`);
  }
  if (days > 0 && days < LONG_TERM_DAYS) insights.push(`Dữ liệu mới có ${days} ngày phục vụ, chưa đủ để kết luận xu hướng dài hạn.`);
  return insights;
}

export function analysisActions(rows, thresholds) {
  const menus = menuStats(rows);
  const byLevel = level => menus.filter(menu => menuPriority(menu, thresholds).level === level);
  const names = list => list.slice(0, 3).map(menu => menu.menu).join(', ');
  const high = byLevel('high'), medium = byLevel('medium'), thin = byLevel('insufficient');
  const actions = [];
  if (high.length) actions.push(`Khảo sát khẩu vị và cách chế biến phần rau của ${names(high)} trước khi cân nhắc đổi khẩu phần.`);
  if (medium.length) actions.push(`Theo dõi ${medium.length} món mức Trung bình trong các lần phục vụ tiếp theo, bắt đầu từ ${names(medium)}.`);
  if (thin.length) actions.push(`Chưa kết luận về phần rau của ${thin.length} món vì chưa đủ quan sát.`);
  if (high.length + medium.length) actions.push('Mở chi tiết món để xem số sau khi lọc mẫu ngoại lai trước khi bếp quyết định.');
  return actions;
}

/** Thành phần có mức còn lại trung bình cao nhất trong phạm vi đang xem. */
export function attentionComponent(rows) {
  const stats = summarize(rows);
  return keys
    .filter(key => stats[key].mean !== null)
    .map(key => ({key, label: labels[key], mean: stats[key].mean, n: stats[key].n}))
    .sort((a, b) => b.mean - a.mean)[0] ?? null;
}

/**
 * So với cùng số ngày có dữ liệu ngay trước phạm vi đang xem.
 * Trả về null khi không có kỳ trước đủ dữ liệu, thay vì đưa ra một con số không có căn cứ.
 */
export function previousPeriodChange(history, rows, key) {
  const dates = [...new Set(rows.map(row => row.date))].sort();
  if (!dates.length) return null;
  const earlier = [...new Set(history.map(row => row.date))].filter(date => date < dates[0]).sort();
  const window = earlier.slice(-dates.length);
  if (window.length < dates.length) return null;
  const previous = summarize(history.filter(row => window.includes(row.date)))[key];
  const current = summarize(rows)[key];
  if (previous.mean === null || current.mean === null) return null;
  return {change: current.mean - previous.mean, previous: previous.mean, from: window[0], to: window.at(-1)};
}

/** Mốc cuối trục, làm tròn lên bội số của 10 để các biểu đồ đọc chung một thang. */
export const axisMax = values => Math.max(10, Math.ceil(Math.max(0, ...values) / 10) * 10);

export function analysisSummary(rows, metric, thresholds) {
  const menus = menuStats(rows);
  return {
    top: rankMenus(menus, metric, thresholds, 1)[0] ?? null,
    attention: attentionComponent(rows),
    review: menus.filter(menu => needsReview(menu, thresholds)).length,
    menuCount: menus.length,
    validTrays: validTrayCount(rows),
    trays: rows.length,
  };
}
