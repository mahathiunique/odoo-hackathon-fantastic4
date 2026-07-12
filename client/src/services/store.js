import * as seed from '../mock/data';
export const delay=(ms=180)=>new Promise(r=>setTimeout(r,ms));
export const read=(key)=>JSON.parse(localStorage.getItem(`assetflow_${key}`)||'null')||structuredClone(seed[key]||[]);
export const write=(key,value)=>(localStorage.setItem(`assetflow_${key}`,JSON.stringify(value)),value);
export const service=(key)=>({
 async getAll(){await delay();return{success:true,data:read(key)}},
 async getById(id){await delay();return{success:true,data:read(key).find(x=>x.id===id)}},
 async create(payload){await delay();const all=read(key),item={...payload,id:`${key.slice(0,3)}-${Date.now()}`};write(key,[item,...all]);return{success:true,data:item}},
 async update(id,payload){await delay();let item;const all=read(key).map(x=>x.id===id?(item={...x,...payload,id}):x);write(key,all);return{success:true,data:item}},
 async remove(id){await delay();write(key,read(key).filter(x=>x.id!==id));return{success:true}},
 async changeStatus(id,status){return this.update(id,{status})}
});
