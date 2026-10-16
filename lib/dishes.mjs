function validVector(v){return Array.isArray(v)&&v.length===256&&v.every(Number.isFinite)&&Math.abs(Math.hypot(...v)-1)<.02;}
export function validateDishBank(refs){
 if(!Array.isArray(refs)||!refs.length||refs.length>2000||refs.some(r=>!r||typeof r.name!=='string'||!r.name.trim()||!/^[a-f0-9]{64}$/.test(r.hash)||!validVector(r.vector))||new Set(refs.map(r=>r.hash)).size!==refs.length)throw Error('Bộ nhận diện món không hợp lệ.');
 return refs;
}
export function classifyDish(refs,vector,hash){
 validateDishBank(refs);
 if(!validVector(vector))throw Error('Đặc trưng ảnh không hợp lệ.');
 if(refs.some(r=>r.hash===hash))return {name:null,reason:'training-image',candidates:[]};
 const scores=new Map();
 for(const r of refs){const score=r.vector.reduce((s,n,i)=>s+n*vector[i],0);if(score>(scores.get(r.name)??-1))scores.set(r.name,score);}
 const candidates=[...scores].map(([name,score])=>({name,score})).sort((a,b)=>b.score-a.score);
 const best=candidates[0];
 if(best.score<.65||(candidates[1]&&best.score-candidates[1].score<.02))return {name:null,reason:'uncertain',candidates:candidates.slice(0,3)};
 return {name:best.name,reason:'ok',candidates:candidates.slice(0,3)};
}
