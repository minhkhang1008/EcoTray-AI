import {useEffect,useRef,useState} from 'react';
import {imageVector} from './imageFeatures';
import {classifyDish,validateDishBank} from '../lib/dishes.mjs';
type Sample={name:string,path:string,hash:string,category:string};
type Reference=Sample&{vector:number[]};
type Answer={name:string|null,reason:string,candidates:{name:string,score:number}[]};
type Bank={refs:Reference[],tests:Sample[],report:{classes:number,trainImages:number,testImages:number,top1Correct:number,accepted:number,acceptedCorrect:number,categoryEvaluation:{testImages:number,top1Correct:number,accepted:number,acceptedCorrect:number}}};
export default function DishVision({onShowMenus}:{onShowMenus:()=>void}){
 const [bank,setBank]=useState<Bank|null>(null),[busy,setBusy]=useState(false),[error,setError]=useState(''),[url,setUrl]=useState(''),[answer,setAnswer]=useState<Answer|null>(null),[origin,setOrigin]=useState('');
 const job=useRef(0),objectUrl=useRef(''),resultRef=useRef<HTMLDivElement>(null);
 useEffect(()=>{let alive=true;fetch('./food-bank.json').then(r=>{if(!r.ok)throw Error('Không tải được bộ nhận diện.');return r.json();}).then(data=>{validateDishBank(data.refs);validateDishBank(data.refs.map((r:Reference)=>({...r,name:r.category})));if(alive)setBank(data);}).catch(e=>{if(alive)setError(e.message);});return()=>{alive=false;job.current++;if(objectUrl.current)URL.revokeObjectURL(objectUrl.current);};},[]);
 async function analyze(blob:Blob,source:string){
  if(!bank)return;const run=++job.current;setBusy(true);setError('');setAnswer(null);setOrigin(source);
  try{
   if(blob.size>12e6||!blob.type.startsWith('image/'))throw Error('Chọn ảnh tối đa 12 MB.');
   const bytes=await blob.arrayBuffer(),digest=await crypto.subtle.digest('SHA-256',bytes);
   if(run!==job.current)return;
   if(objectUrl.current)URL.revokeObjectURL(objectUrl.current);objectUrl.current=URL.createObjectURL(blob);setUrl(objectUrl.current);
   const img=new Image();img.src=objectUrl.current;await img.decode();const vector=await imageVector(img);
   if(run!==job.current)return;
   const hash=Array.from(new Uint8Array(digest),n=>n.toString(16).padStart(2,'0')).join('');
   setAnswer(classifyDish(bank.refs.map(r=>({...r,name:r.category})),vector,hash));resultRef.current?.scrollIntoView({behavior:'smooth',block:'center'});
  }catch(e){if(run===job.current)setError((e as Error).message);}finally{if(run===job.current)setBusy(false);}
 }
 async function choose(sample:Sample){setError('');try{const r=await fetch('.'+sample.path);if(!r.ok)throw Error('Không tải được ảnh thử.');await analyze(await r.blob(),'Ảnh thử Portal · chưa đưa vào bộ học');}catch(e){setError((e as Error).message);}}
 return <><div className="dataset-note">Ảnh thật từ Portal PTNK · Bộ phân loại 2 nhóm đã chuẩn bị sẵn · Chạy trên thiết bị</div><div className="vision-layout"><section className="panel image-panel"><div className="section-heading"><h2>Phân loại món ăn PTNK</h2><span className="badge">{bank?`2 nhóm · ${bank.report.classes} món nguồn`:'Đang tải bộ mẫu'}</span></div>
 <label className={url?'image-upload has-image':'image-upload'}>{url?<img src={url} alt="Ảnh món ăn đang phân tích"/>:<><span className="scan-frame"><span>＋</span></span><strong>Chọn ảnh thử bên dưới</strong><small>Hoặc tải ảnh món ăn từ máy · Tối đa 12 MB</small></>}<input aria-label="Chọn ảnh nhận diện món" type="file" accept="image/*" disabled={busy||!bank} onChange={e=>{if(e.target.files?.[0])analyze(e.target.files[0],'Ảnh từ thiết bị');e.target.value='';}}/>{busy&&<span className="scan-overlay">MobileNet đang nhận diện…</span>}</label><div className="image-meta"><span>{origin||'Ảnh được xử lý cục bộ'}</span></div>{error&&<p className="inline-status" role="alert">{error}</p>}
 </section><section className="panel result-panel"><div className="section-heading"><h2>Kết quả gợi ý</h2><span className="badge">MobileNet + mẫu tham chiếu</span></div><div ref={resultRef} className="dish-result" aria-live="polite"><span className="eyebrow">{busy?'ĐANG PHÂN TÍCH':'PHÂN LOẠI NHÓM MÓN'}</span><h2>{busy?'Đang xử lý ảnh…':answer?(answer.name||'Chưa đủ cơ sở kết luận'):'Chờ ảnh đầu vào'}</h2><p>{!answer?'Chọn một ảnh thử để chạy AI thật trên máy.':answer.reason==='training-image'?'Ảnh này đã được dùng học. Hãy chọn ảnh thử khác.':answer.reason==='uncertain'?'Chưa đủ cơ sở kết luận. Kiểm tra các món gần nhất bên dưới.':'Gợi ý nhóm món từ hình ảnh. Kiểm tra lại trước khi sử dụng kết quả.'}</p></div>
 {answer?.candidates?.map(c=><div className="dish-candidate" key={c.name}><span>{c.name}</span><b>{c.score.toFixed(3)}</b></div>)}{answer?.name&&<button className="primary full-width" onClick={onShowMenus}>Xem thực đơn trong dashboard demo ↗</button>}
 <div className="model-summary"><div><span>Ảnh tham chiếu đã học</span><b>{bank?.report.trainImages??'—'}</b></div><div><span>Ảnh thử tách riêng</span><b>{bank?.report.testImages??'—'}</b></div><div><span>Nhóm đúng trên bộ thử nguồn</span><b>{bank?`${bank.report.categoryEvaluation.top1Correct}/${bank.report.categoryEvaluation.testImages}`:'—'}</b></div></div><p className="fine">Điểm tương đồng không phải xác suất đúng. Đây là kiểm tra nhỏ trên ảnh cùng nguồn; chưa đánh giá với ảnh mới tại hiện trường. Phân biệt món nước và món dùng kèm cơm; chưa phân biệt tin cậy tên từng món, chưa đo phần thừa.</p></section></div>
 <section className="panel source-gallery"><div className="section-heading"><div><h2>Ảnh thử đã tách khỏi bộ học</h2><p>Chọn ảnh để phân loại nhóm món · không cần tải file hoặc kết nối mạng</p></div></div><div className="food-grid">{bank?.tests.map((s,i)=><button key={s.hash} disabled={busy} onClick={()=>choose(s)} aria-label={`Phân tích ảnh thử ${i+1}`}><img src={'.'+s.path} alt={`Ảnh thử món ${i+1} từ Portal PTNK`} loading="lazy"/><span>Ảnh thử {String(i+1).padStart(2,'0')}</span></button>)}</div></section></>;
}
