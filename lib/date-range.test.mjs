import { test } from 'node:test';
import assert from 'node:assert/strict';
import { lastSevenDays } from './date-range.mjs';

test('seven days includes today and crosses month/year boundaries', () => {
  assert.deepEqual(lastSevenDays('2026-11-02'), { from: '2026-10-27', to: '2026-11-02' });
  assert.deepEqual(lastSevenDays('2026-01-02'), { from: '2025-12-27', to: '2026-01-02' });
  assert.deepEqual(lastSevenDays('2024-03-01'), { from: '2024-02-24', to: '2024-03-01' });
});
