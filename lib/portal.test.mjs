import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createHash} from 'node:crypto';
import {validateDishBank} from './dishes.mjs';
test('packaged source photos are intact and no held-out file enters the bank',()=>{
 const source=JSON.parse(fs.readFileSync(new URL('../data/portal/menu-source.json',import.meta.url)));
 const bank=JSON.parse(fs.readFileSync(new URL('../public/food-bank.json',import.meta.url)));
 validateDishBank(bank.refs);
 const hashes=new Set();
 for(const m of source.menus)for(const i of m.images){const bytes=fs.readFileSync(new URL('../public'+i.path,import.meta.url));assert.equal(createHash('sha256').update(bytes).digest('hex'),i.sha256);hashes.add(i.sha256);}
 assert.equal(source.menus.length,20);assert.equal(hashes.size,48);
 assert.equal(bank.refs.length,32);assert.equal(bank.tests.length,16);
 for(const t of bank.tests){assert.ok(hashes.has(t.hash));assert.ok(!bank.refs.some(r=>r.hash===t.hash));}
 for(const r of bank.refs){assert.ok(hashes.has(r.hash));assert.ok(['Món nước','Món dùng kèm cơm'].includes(r.category));}
});
