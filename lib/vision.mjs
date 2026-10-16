export const levels=[0,25,50,75,100];
export function validReferences(value){
 if(!Array.isArray(value)||value.length>2000)throw Error('Bộ mẫu không hợp lệ (tối đa 2.000 ảnh).');
 if(value.some(r=>!r||!['rice','vegetables','main'].includes(r.component)||!levels.includes(r.label)||typeof r.hash!=='string'||!/^[a-f0-9]{64}$/.test(r.hash)||!Array.isArray(r.vector)||r.vector.length!==256||r.vector.some(n=>typeof n!=='number'||!Number.isFinite(n))||Math.abs(Math.hypot(...r.vector)-1)>.02))throw Error('Định dạng đặc trưng không hợp lệ.');
 if(new Set(value.map(r=>r.hash)).size!==value.length)throw Error('Bộ mẫu chứa ảnh trùng lặp.');
 return value;
}
export function classify(refs,component,vector,hash){
 const selected=refs.filter(r=>r.component===component);
 if(levels.some(l=>selected.filter(r=>r.label===l).length<2))return {value:null,reason:'calibration'};
 if(selected.some(r=>r.hash===hash))return {value:null,reason:'training-image'};
 const ranked=selected.map(r=>({...r,score:r.vector.reduce((s,n,i)=>s+n*vector[i],0)})).sort((a,b)=>b.score-a.score);
 const votes=new Map();ranked.slice(0,3).forEach(r=>votes.set(r.label,(votes.get(r.label)||0)+1));
 const best=[...votes].sort((a,b)=>b[1]-a[1])[0];
 if(!Number.isFinite(ranked[0].score)||ranked[0].score<.65||best[1]<2)return {value:null,reason:'uncertain'};
 return {value:best[0],reason:'ok'};
}
