import test from 'node:test';
import assert from 'node:assert/strict';
import {defaultPriorityThresholds as limits, demoRows, menuStats} from './analytics.mjs';
import {analysisActions, analysisInsights, analysisSummary, attentionComponent, axisMax, previousPeriodChange, rankMenus, validTrayCount} from './menu-analysis.mjs';

const row = (menu, date, rice, vegetables, main) => ({id: `${menu}-${date}-${rice}-${vegetables}`, menu, date, source: 'manual', rice, vegetables, main});
const many = (menu, date, count, rice, vegetables, main) => Array.from({length: count}, () => row(menu, date, rice, vegetables, main));

test('ranking follows the chosen component and skips thin or empty dishes', () => {
  const rows = [
    ...many('A', '2026-10-01', 12, 10, 50, 5),
    ...many('B', '2026-10-01', 12, 40, 25, 5),
    ...many('C', '2026-10-01', 3, 90, 90, 90),
    ...many('Nước', '2026-10-01', 12, null, null, 30),
  ];
  const menus = menuStats(rows);
  assert.deepEqual(rankMenus(menus, 'vegetables', limits).map(i => i.menu.menu), ['A', 'B']);
  assert.deepEqual(rankMenus(menus, 'rice', limits).map(i => i.menu.menu), ['B', 'A']);
  assert.equal(rankMenus(menus, 'main', limits)[0].menu.menu, 'Nước');
  assert.equal(rankMenus(menus, 'overall', limits).length, 3);
  assert.equal(rankMenus(menus, 'vegetables', limits, 1).length, 1);
});

test('valid trays need at least one observed component', () => {
  assert.equal(validTrayCount([row('A', '2026-10-01', null, null, null), row('A', '2026-10-01', 0, null, null)]), 1);
});

test('summary matches the demo figures shown elsewhere', () => {
  const summary = analysisSummary(demoRows, 'vegetables', limits);
  assert.equal(summary.trays, 1280);
  assert.equal(summary.menuCount, 20);
  assert.equal(summary.review, 11);
  assert.equal(summary.top.menu.menu, 'Heo lát chay kho thơm');
  assert.equal(Math.round(summary.top.mean * 10) / 10, 46.5);
  assert.equal(summary.attention.key, 'vegetables');
  assert.equal(summary.attention.n, 935);
  assert.equal(Math.round(summary.attention.mean), 31);
  assert.ok(summary.validTrays <= summary.trays);
});

test('attention component follows the data and tolerates empty input', () => {
  const rows = many('A', '2026-10-01', 3, 60, 10, 5);
  assert.equal(attentionComponent(rows).key, 'rice');
  assert.equal(attentionComponent([]), null);
  assert.equal(attentionComponent(many('A', '2026-10-01', 2, null, null, null)), null);
});

test('previous period change compares equal spans and refuses when none exists', () => {
  const history = [
    ...many('A', '2026-10-01', 2, 0, 20, 0),
    ...many('A', '2026-10-02', 2, 0, 30, 0),
    ...many('A', '2026-10-05', 2, 0, 35, 0),
  ];
  const latest = history.filter(row => row.date === '2026-10-05');
  assert.deepEqual(previousPeriodChange(history, latest, 'vegetables'), {change: 5, previous: 30, from: '2026-10-02', to: '2026-10-02'});
  const lastTwo = history.filter(row => row.date >= '2026-10-02');
  assert.equal(previousPeriodChange(history, lastTwo, 'vegetables'), null);
  assert.equal(previousPeriodChange(history, history, 'vegetables'), null);
  assert.equal(previousPeriodChange(history, history.filter(row => row.date === '2026-10-01'), 'vegetables'), null);
  assert.equal(previousPeriodChange(history, [], 'vegetables'), null);
});

test('axis rounds up to a readable scale', () => {
  assert.equal(axisMax([46.5, 12]), 50);
  assert.equal(axisMax([50]), 50);
  assert.equal(axisMax([3]), 10);
  assert.equal(axisMax([]), 10);
});

test('insights state the sample limit and stay deterministic', () => {
  const first = analysisInsights(demoRows, 'vegetables', limits);
  assert.deepEqual(first, analysisInsights(demoRows, 'vegetables', limits));
  assert.ok(first.some(text => text.includes('5 ngày phục vụ')));
  assert.ok(first.some(text => text.includes('Heo lát chay kho thơm')));
  assert.deepEqual(analysisInsights([], 'vegetables', limits), []);
});

test('actions never order a portion cut and react to thresholds', () => {
  const actions = analysisActions(demoRows, limits);
  assert.ok(actions.length > 0);
  assert.ok(actions.every(text => !/giảm khẩu phần|-\d+%/i.test(text)));
  assert.deepEqual(analysisActions([], limits), []);
  const none = analysisActions(demoRows, {high: 99, medium: 98, minSamples: 10});
  assert.ok(none.every(text => !text.includes('Khảo sát')));
});
