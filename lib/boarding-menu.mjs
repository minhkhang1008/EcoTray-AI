import menu from '../data/portal/boarding-menu.json' with {type:'json'};
import portal from '../data/portal/menu-source.json' with {type:'json'};

export const boardingDays = menu.days;

/** Ảnh chỉ gắn với đúng cặp ngày + tên món đã lấy từ Portal, không suy từ ngày khác. */
export const dishImages = (date, name) =>
  portal.menus.find(m => m.date === date && m.name === name)?.images
  ?? menu.days.find(d => d.date === date)?.photos?.find(p => p.dish === name)?.images
  ?? [];

/** Số thứ tự của món trong thực đơn các ngày đã cho; một món có thể mang số khác nhau giữa các ngày. */
export const dishNumbers = (name, dates) =>
  [...new Set(
    menu.days
      .filter(d => dates.includes(d.date) && d.dishes.includes(name))
      .map(d => d.dishes.indexOf(name) + 1),
  )].sort((a, b) => a - b);

/** Các ô lịch bắt đầu từ thứ Hai; `null` là ô trống đầu tháng. */
export function monthCells(month) {
  const [year, m] = month.split('-').map(Number);
  const offset = (new Date(Date.UTC(year, m - 1, 1)).getUTCDay() + 6) % 7;
  const length = new Date(Date.UTC(year, m, 0)).getUTCDate();
  return [
    ...Array(offset).fill(null),
    ...Array.from({length}, (_, i) => `${month}-${String(i + 1).padStart(2, '0')}`),
  ];
}

export function shiftMonth(month, by) {
  const [year, m] = month.split('-').map(Number);
  return new Date(Date.UTC(year, m - 1 + by, 1)).toISOString().slice(0, 7);
}

/** Ngày có thực đơn gần nhất, không vượt quá `today`. */
export const latestMenuDay = (days, today) =>
  days.reduce((latest, d) => (d.date <= today && d.date > latest ? d.date : latest), '');

const fold = text =>
  text.normalize('NFD').replace(/\p{M}/gu, '').replace(/đ/gi, 'd').toLocaleLowerCase('vi');

/** Tìm tên món, không phân biệt dấu và hoa thường. */
export const matchesDish = (name, query) => fold(name).includes(fold(query.trim()));
