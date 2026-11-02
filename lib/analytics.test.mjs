import test from 'node:test';import assert from 'node:assert/strict';
import {defaultPriorityThresholds,makeDemo,filterRows,overall,daily,menuPriority,menuStats,needsReview,priorityThresholdError,trend} from './analytics.mjs';
test('demo is reproducible, isolated and uses only actual portal menu/date pairs',()=>{const a=makeDemo();assert.deepEqual(a,makeDemo());assert.equal(a.length,1280);assert.equal(new Set(a.map(r=>r.id)).size,a.length);assert.deepEqual([...new Set(a.map(r=>r.date))],Array.from({length:5},(_,i)=>`2026-10-${String(i+12).padStart(2,'0')}`));assert.ok(a.every(r=>r.source==='simulation'));assert.ok(a.every(r=>['rice','vegetables','main'].every(k=>r[k]===null||[0,25,50,75,100].includes(r[k]))));});
test('filters apply together and include date boundaries',()=>{const r=filterRows(makeDemo(),{menu:'Cá ngừ kho thơm',from:'2026-10-14',to:'2026-10-14'});assert.equal(r.length,64);});
test('overall excludes missing observations',()=>{assert.equal(overall([{rice:0,vegetables:null,main:50}]),25);assert.equal(overall([]),null);});
test('daily and menu aggregates retain counts',()=>{const a=makeDemo();assert.equal(daily(a).reduce((s,d)=>s+d.count,0),a.length);assert.equal(menuStats(a).length,20);assert.ok(Number.isFinite(trend(a).points));});
test('single day cannot claim a time trend',()=>assert.equal(trend([{date:'2026-10-09',rice:0,main:0,vegetables:25}]),null));

test('portal demo never invents a menu/date pairing and leaves soup components unknown',async()=>{const {default:source}=await import('../data/portal/menu-source.json',{with:{type:'json'}});const a=makeDemo();assert.ok(a.every(r=>source.menus.some(m=>m.date===r.date&&m.name===r.menu)));assert.ok(a.filter(r=>/^(Bún|Nui|Hủ tiếu|Bánh canh)/i.test(r.menu)).every(r=>r.rice===null&&r.vegetables===null));});

test('menu priority follows the vegetable threshold and refuses thin samples',()=>{
  const at=(mean,n=64)=>menuPriority({vegetables:{mean,n}}).level;
  assert.equal(at(46.5),'high');assert.equal(at(40),'high');
  assert.equal(at(39.9),'medium');assert.equal(at(20),'medium');
  assert.equal(at(19.9),'watch');assert.equal(at(0),'watch');
  assert.equal(at(90,9),'insufficient');assert.equal(at(null,0),'insufficient');
  const flagged=menuStats(makeDemo()).filter(m=>m.vegetables.n>=10&&m.vegetables.mean>=20);
  assert.ok(flagged.every(m=>['high','medium'].includes(menuPriority(m).level)));
});

test('priority thresholds are configurable and validated',()=>{
  const dish=mean=>({vegetables:{mean,n:12}});
  const custom={high:60,medium:30,minSamples:20};
  assert.equal(menuPriority(dish(46),custom).level,'insufficient');
  const loose={high:60,medium:30,minSamples:5};
  assert.equal(menuPriority(dish(46),loose).level,'medium');
  assert.equal(menuPriority(dish(25),loose).level,'watch');
  assert.ok(needsReview(dish(30),loose));assert.ok(!needsReview(dish(29.9),loose));
  assert.equal(priorityThresholdError(defaultPriorityThresholds),null);
  for(const bad of [{high:20,medium:20,minSamples:10},{high:120,medium:20,minSamples:10},{high:40,medium:0,minSamples:10},{high:40,medium:20,minSamples:0},{high:40,medium:20,minSamples:1.5},{high:NaN,medium:20,minSamples:10}])
    assert.equal(typeof priorityThresholdError(bad),'string');
});
