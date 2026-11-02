import { test } from 'node:test';
import assert from 'node:assert/strict';
import { filterMenuSlots } from './menu-slots.mjs';

test('slot selection uses each serving day menu order', () => {
  const days = [{ date: '2026-10-12', dishes: ['A', 'B', 'C', 'D'] }, { date: '2026-10-13', dishes: ['D', 'C', 'B', 'A'] }];
  const rows = [{ date: '2026-10-12', menu: 'A' }, { date: '2026-10-13', menu: 'A' }, { date: '2026-10-13', menu: 'C' }, { date: '2026-10-14', menu: 'Unknown' }];
  assert.deepEqual(filterMenuSlots(rows, days, [1, 2]), [rows[0], rows[2]]);
  assert.deepEqual(filterMenuSlots(rows, days, []), []);
  assert.equal(filterMenuSlots(rows, days, [1, 2, 3, 4]), rows);
});
