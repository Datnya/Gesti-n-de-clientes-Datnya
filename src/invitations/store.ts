import {supabase} from "../lib/supabase";

export const sections = {cover:"Sobre",intro:"Fecha",music:"Reproductor",count:"Cuenta regresiva",letter:"Carta",family:"Familia",parents:"Padres",sponsors:"Padrinos",location:"Ubicación",attire:"Vestimenta",album:"Álbum",gifts:"Regalos",rsvp:"Asistencia",farewell:"Despedida"};
export const initial = {
  templateId:"rosa-pastel",
  name:"",event:"",phone:"",letter:"",parents:"",sponsors:"",venue:"",address:"",maps:"",embed:"",
  dress:"Sport elegante",woman:"Vestido midi y tacón bajo",man:"Blazer y camisa sin corbata",color:"rosa pastel",
  song:"",looks:["",""],album:[] as string[],gifts:[] as string[][],qr:"",
  sections:Object.fromEntries(Object.keys(sections).map(key=>[key,true])) as Record<string,boolean>
};
export type Content = typeof initial;
export interface Entry {id:string;client_id:string;title:string;active:boolean;expires_at:string;payload:Content}
export type Summary = Omit<Entry,"payload">;
async function local<T>(mode:IDBTransactionMode, operation:(s:IDBObjectStore)=>IDBRequest<T>):Promise<T>{
  return new Promise((resolve,reject)=>{
    const db=indexedDB.open("datnya-invitaciones",1);
    db.onupgradeneeded=()=>db.result.createObjectStore("invitaciones",{keyPath:"id"});
    db.onerror=()=>reject(db.error);
    db.onsuccess=()=>{
      const tx=db.result.transaction("invitaciones",mode);
      const req=operation(tx.objectStore("invitaciones"));
      tx.oncomplete=()=>{db.result.close();resolve(req.result)};
      tx.onabort=()=>{db.result.close();reject(tx.error || req.error)};
    };
  });
}
export async function listEntries():Promise<Summary[]>{
  if(!supabase)return local("readonly",s=>s.getAll());
  const {data,error}=await supabase.from("invitations").select("id,client_id,title,active,expires_at").order("title");
  if(error)throw error; return data;
}
export async function getEntry(id:string):Promise<Entry>{
  if(!supabase)return local("readonly",s=>s.get(id));
  const {data,error}=await supabase.from("invitations").select("*").eq("id",id).single();
  if(error)throw error;return data;
}
export async function saveEntry(entry:Entry){
  if(!supabase){
    if(import.meta.env.DEV && ["localhost","127.0.0.1"].includes(location.hostname)){
      const response=await fetch("/__invite_preview/"+entry.id,{method:"PUT",headers:{"Content-Type":"application/json"},body:JSON.stringify({end:Date.parse(entry.expires_at),payload:entry.active?entry.payload:null})});
      if(!response.ok)throw Error("No se pudo actualizar la vista previa en Wi-Fi.");
    }
    await local("readwrite",s=>s.put(entry));return;
  }
  const {error}=await supabase.from("invitations").upsert(entry);
  if(error)throw error;
}
export async function publicContent(id:string):Promise<Content|null>{
  if(!/^[0-9a-f-]{36}$/i.test(id))return null;
  if(!supabase){
    if(import.meta.env.DEV){
      const response=await fetch("/__invite_preview/"+id,{cache:"no-store"});
      if(response.ok)return response.json();
      if(response.status!==404)throw Error("No se pudo consultar la vista previa.");
    }
    const row=await getEntry(id);
    return row?.active && Date.parse(row.expires_at)>Date.now()?row.payload:null;
  }
  const {data,error}=await supabase.rpc("open_invitation",{invite_id:id});
  if(error)throw error;return data;
}
