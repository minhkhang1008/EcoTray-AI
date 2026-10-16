const keys=['rice','vegetables','main'];
function validate(pixels,width,height){if(!Number.isInteger(width)||!Number.isInteger(height)||width<1||height<1||pixels.length!==width*height*4)throw Error('Dữ liệu ảnh không hợp lệ.');}
function food(component,r,g,b,profile){
 if(profile==='ptnk-steel'){
  if(component==='rice')return Math.min(r,g,b)>150&&Math.max(r,g,b)-Math.min(r,g,b)<75;
  if(component==='vegetables')return r>100&&g>95&&b>55&&r>b*1.05&&g>b*1.04&&r<g*1.3;
  return r>55&&r>g*1.15&&r>b*1.2;
 }
 if(component==='rice')return Math.min(r,g,b)>105&&Math.max(r,g,b)-Math.min(r,g,b)<85;
 if(component==='vegetables')return g>55&&g>r*1.15&&g>b*1.08;
 return r>70&&r>g*1.15&&r>b*1.3&&g>b*1.05;
}
function count(pixels,width,height,component,roi,profile){
 if(!Array.isArray(roi)||roi.length!==4||roi.some(n=>!Number.isFinite(n)||n<0||n>1)||roi[0]>=roi[2]||roi[1]>=roi[3])throw Error('Vùng hiệu chuẩn không hợp lệ.');
 const [l,t,r,b]=roi;let area=0,total=0;
 for(let y=Math.ceil(t*height);y<b*height;y++)for(let x=Math.ceil(l*width);x<r*width;x++){const i=(y*width+x)*4;total++;if(food(component,pixels[i],pixels[i+1],pixels[i+2],profile))area++;}
 return area/total;
}
export function calibrateTray(pixels,width,height,rois,options={}){
 validate(pixels,width,height);
 const labels=options.labels??{rice:100,vegetables:100,main:100};
 if(keys.some(k=>![25,50,75,100].includes(labels[k])))throw Error('Nhãn mẫu cần là 25/50/75/100%.');
 const components=Object.fromEntries(keys.map(key=>{const roi=rois[key],fraction=count(pixels,width,height,key,roi,options.profile);if(fraction<.05)throw Error('Ảnh khẩu phần ban đầu chưa đủ rõ: '+key);return [key,{roi,fraction,label:labels[key]}];}));
 return {version:1,components,profile:options.profile,aspectRatio:width/height};
}
export function measureTray(pixels,width,height,calibration){
 validate(pixels,width,height);
 if(calibration?.version!==1)throw Error('Mẫu hiệu chuẩn không tương thích.');
 return Object.fromEntries(keys.map(key=>{const c=calibration.components?.[key];if(!c||!Number.isFinite(c.fraction)||c.fraction<.05||c.fraction>1)throw Error('Thiếu mẫu hiệu chuẩn: '+key);const label=c.label??100;if(![25,50,75,100].includes(label))throw Error('Nhãn hiệu chuẩn không hợp lệ.');const fraction=count(pixels,width,height,key,c.roi,calibration.profile);const ratio=Math.min(1,fraction/c.fraction*label/100);return [key,{percent:Math.round(ratio*4)*25,areaRatio:Math.round(ratio*1000)/10,roi:c.roi}];}));
}
const anchorPoints=[[.1,.1],[.5,.1],[.9,.1],[.1,.9],[.5,.9],[.9,.9],[.35,.5],[.65,.5],[.15,.28],[.5,.28],[.85,.28]];
export function layoutSignature(pixels,width,height){
 validate(pixels,width,height);
 return anchorPoints.flatMap(([x,y])=>{const i=(Math.min(height-1,Math.floor(y*height))*width+Math.min(width-1,Math.floor(x*width)))*4;return [pixels[i],pixels[i+1],pixels[i+2]];});
}
export function matchesLayout(pixels,width,height,signature){
 if(!Array.isArray(signature)||signature.length!==anchorPoints.length*3||signature.some(n=>!Number.isFinite(n)||n<0||n>255))throw Error('Chữ ký khay mẫu không hợp lệ.');
 const current=layoutSignature(pixels,width,height);
 return current.reduce((sum,n,i)=>sum+Math.abs(n-signature[i]),0)/current.length<25;
}
