import {keys, summarize} from './core.mjs';

import portal from '../data/portal/menu-source.json' with {type:'json'};
export const portalMenus = portal.menus;
/** Real menu/date pairs; all tray observations are synthetic. */
export function makeDemo() {
  let state = 20261016;
  const random = () => ((state = (1664525 * state + 1013904223) >>> 0) / 4294967296);
  return portalMenus.flatMap((menu,m)=>Array.from({length:64},(_,i)=>{
    const sample=(p)=>random()<.025?null:[0,1,2,3].reduce(n=>n+(random()<p?25:0),0);
    const soup=/^(Bún|Nui|Hủ tiếu|Bánh canh)/i.test(menu.name);
    return {id:`demo-${menu.date}-${m}-${i}`,date:menu.date,menu:menu.name,rice:soup?null:sample(.08),vegetables:soup?null:sample([.34,.25,.42,.19][m%4]),main:sample(.07),source:'simulation'};
  }));
}
export const demoRows = makeDemo();
export function filterRows(rows, {menu='', from='', to='', search=''}={}) {
  return rows.filter(r=>(!menu||r.menu===menu)&&(!from||r.date>=from)&&(!to||r.date<=to)&&(!search||r.menu.toLocaleLowerCase('vi').includes(search.toLocaleLowerCase('vi'))));
}
export function overall(rows) {
  let total=0,n=0;
  for (const row of rows) for(const key of keys) if(typeof row[key]==='number'&&Number.isFinite(row[key])) {total+=row[key];n++;}
  return n ? total/n : null;
}
export function daily(rows) {
  const groups=new Map();
  for(const row of rows) {if(!groups.has(row.date))groups.set(row.date,[]);groups.get(row.date).push(row);}
  return [...groups.entries()].sort(([a],[b])=>a.localeCompare(b)).map(([date,values])=>({date,count:values.length,mean:overall(values),...summarize(values)}));
}
export function menuStats(rows) {
  return [...new Set(rows.map(r=>r.menu))].map(menu=>{const subset=rows.filter(r=>r.menu===menu);return {menu,count:subset.length,mean:overall(subset),...summarize(subset)}}).sort((a,b)=>(b.vegetables.mean??-1)-(a.vegetables.mean??-1));
}
export function trend(rows) {
  const days=[...new Set(rows.map(r=>r.date))].sort();
  if(days.length<2)return null;
  const midpoint=Math.floor(days.length/2);
  const first=overall(rows.filter(r=>r.date<days[midpoint]));
  const last=overall(rows.filter(r=>r.date>=days[midpoint]));
  return first===null||last===null?null:{first,last,points:last-first};
}
