import test from 'node:test';import assert from 'node:assert/strict';
import {summarize,decide,parseCSV,exportCSV} from './core.mjs';
test('missing value is excluded, not counted as zero',()=>{let a=summarize([{rice:0,vegetables:null,main:25},{rice:50,vegetables:50,main:null}]);assert.equal(a.vegetables.mean,50);assert.equal(a.vegetables.n,1);assert.equal(a.rice.mean,25)});
test('small sample cannot trigger change',()=>assert.equal(decide(summarize([{rice:100,vegetables:100,main:100}]),260,255).kind,'insufficient'));
test('portion signal does not cut servings',()=>{let a=summarize(Array.from({length:12},()=>({rice:0,vegetables:50,main:0})));assert.equal(decide(a,260,255).kind,'portion')});
test('low waste yields keep',()=>assert.equal(decide(summarize(Array.from({length:12},()=>({rice:0,vegetables:0,main:0}))),260,255).kind,'keep'));
test('NA preserved and quoted comma accepted',()=>{let r=parseCSV('date,menu,rice,vegetables,main\n2026-10-09,"Cơm, gà",0,NA,25');assert.equal(r[0].vegetables,null);assert.equal(r[0].menu,'Cơm, gà')});
test('invalid percentages rejected atomically',()=>assert.throws(()=>parseCSV('date,menu,rice,vegetables,main\n2026-10-09,Gà,101,0,0')));
test('export protects spreadsheet formulas',()=>assert.match(exportCSV([{date:'2026-10-09',menu:'=1+2',rice:0,vegetables:0,main:0,source:'manual'}]),/\'=1\+2/));
test('simulation provenance survives CSV export and reimport',()=>{const rows=[{date:'2026-10-09',menu:'Demo',rice:0,vegetables:25,main:0,source:'simulation'}];assert.equal(parseCSV(exportCSV(rows))[0].source,'simulation');});
test('calendar-invalid date is rejected',()=>assert.throws(()=>parseCSV('date,menu,rice,vegetables,main\n2026-02-31,Gà,0,25,0')));

test('hardware and reviewed provenance survive CSV round trip without becoming manual',()=>{
 for(const source of ['hardware','ai-reviewed']){
 const parsed=parseCSV(exportCSV([{date:'2026-10-22',menu:'Món thử',rice:5,vegetables:10,main:5,source}]));
 assert.equal(parsed[0].source,source);
 }
});
test('unrecognized provenance is rejected instead of relabelled as field data',()=>{
 assert.throws(()=>parseCSV('date,menu,rice,vegetables,main,source\n2026-10-22,Món thử,0,25,0,stage-demo'),/nguồn/i);
});
test('new combo names and soup observations survive CSV without changing legacy metrics',()=>{
 const row={date:'2026-10-27',menu:'Vịt kho gừng',rice:6,vegetables:46.5,main:5.5,soup:32,riceDish:'Cơm trắng',vegetableDish:'Bắp cải luộc',soupDish:'Canh bí đỏ',source:'manual'};
 const parsed=parseCSV(exportCSV([row]))[0];
 for(const key of ['soup','riceDish','vegetableDish','soupDish']) assert.equal(parsed[key],row[key]);
 assert.equal(summarize([parsed]).rice.mean,6);
 const old=parseCSV('date,menu,rice,vegetables,main\n2026-10-27,Gà,0,25,0')[0];
 assert.equal(old.soup,undefined);
 assert.throws(()=>parseCSV('date,menu,rice,vegetables,main,soup\n2026-10-27,Gà,0,25,0,101'));
});
