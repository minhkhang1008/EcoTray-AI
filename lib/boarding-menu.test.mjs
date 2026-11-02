import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createHash} from 'node:crypto';
import {boardingDays, dishImages, dishNumbers, latestMenuDay, matchesDish, monthCells, shiftMonth} from './boarding-menu.mjs';
import {portalMenus} from './analytics.mjs';

test('boarding menu days are sorted, unique and contain dish data only', () => {
  const dates = boardingDays.map(d => d.date);
  assert.deepEqual(dates, [...new Set(dates)].sort());
  for (const day of boardingDays) {
    assert.match(day.date, /^\d{4}-\d{2}-\d{2}$/);
    assert.ok(day.dishes.length > 0);
    assert.deepEqual(Object.keys(day).filter(k => k !== 'photos').sort(), ['date', 'dishes']);
  }
});

test('every menu dish has an intact photo file', () => {
  for (const {date, dishes} of boardingDays) {
    for (const name of dishes) {
      const images = dishImages(date, name);
      assert.ok(images.length > 0, `${date} ${name}`);
      for (const image of images) {
        const bytes = fs.readFileSync(new URL('../public' + image.path, import.meta.url));
        assert.equal(createHash('sha256').update(bytes).digest('hex'), image.sha256);
      }
    }
  }
});

test('boarding menu agrees with the dishes the demo analytics already uses', () => {
  for (const {date, name} of portalMenus) {
    const day = boardingDays.find(d => d.date === date);
    assert.ok(day?.dishes.includes(name), `${date} ${name}`);
  }
});

test('photos only attach to the exact date and dish they were retrieved for', () => {
  const paths = (date, name) => dishImages(date, name).map(i => i.path);
  assert.ok(paths('2026-11-02', 'Mì Gà').length > 0);
  assert.notDeepEqual(paths('2026-10-07', 'Vịt kho gừng'), paths('2026-10-16', 'Vịt kho gừng'));
  assert.deepEqual(dishImages('2026-11-02', 'Vịt kho gừng'), []);
  assert.deepEqual(dishImages('2026-10-10', 'Mì Gà'), []);
});

test('dish numbers follow the menu order of the given days', () => {
  assert.deepEqual(dishNumbers('Sườn kho tiêu', ['2026-10-12']), [1]);
  assert.deepEqual(dishNumbers('Cơm xá xíu', ['2026-10-16']), [4]);
  assert.deepEqual(dishNumbers('Sườn cốt lết ram mặn', ['2026-10-07', '2026-10-14']), [2, 4]);
  assert.deepEqual(dishNumbers('Sườn cốt lết ram mặn', ['2026-10-14']), [4]);
  assert.deepEqual(dishNumbers('Món tự nhập', ['2026-10-12']), []);
});

test('month grid starts on Monday and covers the whole month', () => {
  const october = monthCells('2026-10');
  assert.deepEqual(october.slice(0, 4), [null, null, null, '2026-10-01']);
  assert.equal(october.at(-1), '2026-10-31');
  assert.equal(monthCells('2026-11')[6], '2026-11-01');
  assert.equal(monthCells('2028-02').at(-1), '2028-02-29');
});

test('month shifting crosses year boundaries', () => {
  assert.equal(shiftMonth('2026-12', 1), '2027-01');
  assert.equal(shiftMonth('2026-01', -1), '2025-12');
});

test('latest menu day ignores future days', () => {
  const days = [{date: '2026-10-05'}, {date: '2026-10-20'}];
  assert.equal(latestMenuDay(days, '2026-10-19'), '2026-10-05');
  assert.equal(latestMenuDay(days, '2026-10-20'), '2026-10-20');
  assert.equal(latestMenuDay(days, '2026-10-01'), '');
});

test('dish search ignores case and Vietnamese diacritics', () => {
  assert.ok(matchesDish('Đậu hũ kho chay', 'dau hu'));
  assert.ok(matchesDish('Gà kho gừng', 'GỪNG'));
  assert.ok(!matchesDish('Gà kho gừng', 'bún'));
});
