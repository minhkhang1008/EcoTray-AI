export function filterMenuSlots(rows, days, slots) {
  if ([1, 2, 3, 4].every(slot => slots.includes(slot))) return rows;
  const menus = new Map(days.map(day => [day.date, day.dishes]));
  return rows.filter(row => {
    const index = menus.get(row.date)?.indexOf(row.menu) ?? -1;
    return index >= 0 && slots.includes(index + 1);
  });
}
