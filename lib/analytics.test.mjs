import test from 'node:test';import assert from 'node:assert/strict';
import {makeDemo,filterRows,overall,daily,menuStats,trend} from './analytics.mjs';
test('demo is reproducible, isolated and uses only actual portal menu/date pairs',()=>{const a=makeDemo();assert.deepEqual(a,makeDemo());assert.equal(a.length,1280);assert.equal(new Set(a.map(r=>r.id)).size,a.length);assert.deepEqual([...new Set(a.map(r=>r.date))],Array.from({length:5},(_,i)=>`2026-10-${String(i+12).padStart(2,'0')}`));assert.ok(a.every(r=>r.source==='simulation'));assert.ok(a.every(r=>['rice','vegetables','main'].every(k=>r[k]===null||[0,25,50,75,100].includes(r[k]))));});
test('filters apply together and include date boundaries',()=>{const r=filterRows(makeDemo(),{menu:'Cá ngừ kho thơm',from:'2026-10-14',to:'2026-10-14'});assert.equal(r.length,64);});
test('overall excludes missing observations',()=>{assert.equal(overall([{rice:0,vegetables:null,main:50}]),25);assert.equal(overall([]),null);});
test('daily and menu aggregates retain counts',()=>{const a=makeDemo();assert.equal(daily(a).reduce((s,d)=>s+d.count,0),a.length);assert.equal(menuStats(a).length,20);assert.ok(Number.isFinite(trend(a).points));});
test('single day cannot claim a time trend',()=>assert.equal(trend([{date:'2026-10-09',rice:0,main:0,vegetables:25}]),null));

test('portal demo never invents a menu/date pairing and leaves soup components unknown',async()=>{const {default:source}=await import('../data/portal/menu-source.json',{with:{type:'json'}});const a=makeDemo();assert.ok(a.every(r=>source.menus.some(m=>m.date===r.date&&m.name===r.menu)));assert.ok(a.filter(r=>/^(Bún|Nui|Hủ tiếu|Bánh canh)/i.test(r.menu)).every(r=>r.rice===null&&r.vegetables===null));});
