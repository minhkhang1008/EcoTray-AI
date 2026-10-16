import test from 'node:test';import assert from 'node:assert/strict';import {validReferences,classify} from './vision.mjs';
const vec=n=>Array.from({length:256},(_,i)=>i===n?1:0);
const refs=Array.from({length:10},(_,i)=>({component:'rice',label:Math.floor(i/2)*25,hash:i.toString(16).padStart(64,'0'),vector:vec(Math.floor(i/2))}));
test('reference backup validates dimensionality and duplicate hashes',()=>{assert.equal(validReferences(refs).length,10);assert.throws(()=>validReferences([...refs,refs[0]]));assert.throws(()=>validReferences([{...refs[0],vector:[1]}]));});
test('prediction rejects uncalibrated and reused training images',()=>{assert.equal(classify([],'rice',vec(0),'new').reason,'calibration');assert.equal(classify(refs,'rice',vec(0),refs[0].hash).reason,'training-image');});
test('prediction requires similar consistent neighbors',()=>{assert.equal(classify(refs,'rice',vec(0),'new').value,0);assert.equal(classify(refs,'rice',vec(20),'new').reason,'uncertain');});
