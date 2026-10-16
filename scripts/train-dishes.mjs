import * as tf from '@tensorflow/tfjs';
import jpeg from 'jpeg-js';
import fs from 'node:fs';
import {classifyDish,validateDishBank} from '../lib/dishes.mjs';
const source=JSON.parse(fs.readFileSync('data/portal/menu-source.json'));
const m=JSON.parse(fs.readFileSync('public/model/model.json'));
const data=Buffer.concat(m.weightsManifest.flatMap(g=>g.paths.map(p=>fs.readFileSync('public/model/'+p))));
const full=await tf.loadLayersModel(tf.io.fromMemory({modelTopology:m.modelTopology,weightSpecs:m.weightsManifest.flatMap(g=>g.weights),weightData:data.buffer.slice(data.byteOffset,data.byteOffset+data.byteLength)}));
const feature=tf.model({inputs:full.inputs,outputs:full.getLayer('global_average_pooling2d_1').output});
const refs=[],tests=[];
for(const menu of source.menus){
 const images=[...new Map(menu.images.map(i=>[i.sha256,i])).values()];
 for(let i=0;i<images.length;i++){
  const image=images[i];const decoded=jpeg.decode(fs.readFileSync('public'+image.path),{useTArray:true,formatAsRGBA:false});
  const output=tf.tidy(()=>{const input=tf.tensor3d(decoded.data,[decoded.height,decoded.width,3],'int32').resizeBilinear([224,224]).toFloat().div(127.5).sub(1).expandDims();const v=feature.predict(input).flatten();return v.div(v.norm().add(1e-8));});
  const item={category:/^(Bún|Nui|Hủ tiếu|Bánh canh)/i.test(menu.name)?'Món nước':'Món dùng kèm cơm',name:menu.name,date:menu.date,path:image.path,hash:image.sha256,vector:Array.from(await output.data())};output.dispose();
  if(images.length>=2&&i===images.length-1)tests.push(item);else refs.push(item);
 }
 console.log('Prepared',menu.name);
}
validateDishBank(refs);
const groupRefs=refs.map(r=>({...r,name:r.category}));
const groupResults=tests.map(t=>{const answer=classifyDish(groupRefs,t.vector,t.hash);return {expected:t.category,prediction:answer.name,reason:answer.reason,top1:answer.candidates[0]?.name};});
const results=tests.map(t=>{const answer=classifyDish(refs,t.vector,t.hash);return {name:t.name,path:t.path,hash:t.hash,prediction:answer.name,reason:answer.reason,top1:answer.candidates[0]?.name,candidates:answer.candidates};});
const report={categoryEvaluation:{testImages:tests.length,top1Correct:groupResults.filter(r=>r.top1===r.expected).length,accepted:groupResults.filter(r=>r.reason==='ok').length,acceptedCorrect:groupResults.filter(r=>r.prediction===r.expected).length,results:groupResults},source:source.source,method:'MobileNet v1 0.25 frozen embeddings + nearest reference; no fine-tuning of backbone weights.',split:'Last distinct file per menu with >=2 images held out before preparing reference bank. Single-image classes train only. No independent field validation; same-source photographs may be visually similar.',trainImages:refs.length,classes:new Set(refs.map(r=>r.name)).size,testImages:tests.length,top1Correct:results.filter(r=>r.top1===r.name).length,accepted:results.filter(r=>r.reason==='ok').length,acceptedCorrect:results.filter(r=>r.prediction===r.name).length,results};
fs.writeFileSync('public/food-bank.json',JSON.stringify({version:1,model:'mobilenet-v1-025',refs,tests:tests.map(({vector,...t})=>t),report}));
fs.writeFileSync('data/portal/ai-evaluation.json',JSON.stringify(report,null,2));
console.log(JSON.stringify({...report,results:undefined},null,2));
