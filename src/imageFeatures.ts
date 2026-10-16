import * as tf from '@tensorflow/tfjs';
let modelPromise:Promise<tf.LayersModel>|undefined;
const getModel=()=>modelPromise??=(async()=>{await tf.ready();const full=await tf.loadLayersModel('./model/model.json');return tf.model({inputs:full.inputs,outputs:full.getLayer('global_average_pooling2d_1').output});})().catch(e=>{modelPromise=undefined;throw e;});
export async function imageVector(img:HTMLImageElement){
 const model=await getModel();
 const output=tf.tidy(()=>{const input=tf.browser.fromPixels(img).resizeBilinear([224,224]).toFloat().div(127.5).sub(1).expandDims();const v=(model.predict(input) as tf.Tensor).flatten();return v.div(v.norm().add(1e-8));});
 try{return Array.from(await output.data());}finally{output.dispose();}
}
