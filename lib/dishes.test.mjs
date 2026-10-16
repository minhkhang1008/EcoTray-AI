import test from 'node:test';
import assert from 'node:assert/strict';
import {classifyDish, validateDishBank} from './dishes.mjs';
const unit=(i)=>Array.from({length:256},(_,j)=>i===j?1:0);
const refs=[{name:'Món A',hash:'a'.repeat(64),vector:unit(0)},{name:'Món B',hash:'b'.repeat(64),vector:unit(1)}];
test('dish prediction uses features and rejects the training file',()=>{
 assert.equal(classifyDish(refs,unit(0),'c'.repeat(64)).name,'Món A');
 assert.equal(classifyDish(refs,unit(0),'a'.repeat(64)).reason,'training-image');
});
test('unrelated, ambiguous and invalid inputs cannot yield a dish',()=>{
 assert.equal(classifyDish(refs,unit(2),'c'.repeat(64)).reason,'uncertain');
 assert.equal(classifyDish([...refs,{...refs[1],hash:'d'.repeat(64),vector:unit(0)}],unit(0),'c'.repeat(64)).reason,'uncertain');
 assert.throws(()=>classifyDish(refs,[NaN],'c'.repeat(64)));
 assert.throws(()=>validateDishBank([{...refs[0],vector:[]} ]));
});
test('several references for one group do not compete against each other',()=>{
 const groupRefs=[...refs,{name:'Món A',hash:'d'.repeat(64),vector:unit(0)}];
 assert.equal(classifyDish(groupRefs,unit(0),'c'.repeat(64)).name,'Món A');
});
