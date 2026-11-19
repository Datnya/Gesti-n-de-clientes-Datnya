import {newId,invitationPath,publicLink} from "./links";
import {templates,invitationTemplate,eventTypes} from "./templates";
import {useEffect,useState,type FormEvent} from "react";
import {configured} from "../lib/supabase";
import type {Client} from "../lib/types";
import {InvitationFrame} from "./InvitationFrame";
import {initial,sections,listEntries,getEntry,saveEntry,type Content,type Summary} from "./store";
import "./manager.css";

type TextKey = {[K in keyof Content]:Content[K] extends string?K:never}[keyof Content];
const blank=()=>structuredClone(initial);
function localTime(iso:string){return new Date(Date.parse(iso)-5*3600000).toISOString().slice(0,16)}
function mapsLink(value:string,embed=false){
  if(!value)return true;
  try{
    const url=new URL(value);
    return url.protocol==="https:" && (embed ? /^(www\.)?google\.com$/.test(url.hostname)&&url.pathname.startsWith("/maps/embed") :
      /^(maps\.app\.goo\.gl|maps\.google\.com|goo\.gl)$/.test(url.hostname) || /^(www\.)?google\.com(\.pe)?$/.test(url.hostname)&&url.pathname.startsWith("/maps"));
  }catch{return false}
}
async function readFile(file:File,audio:boolean):Promise<string>{
  if(!(audio?/^(audio\/(mpeg|mp3))$/:/^image\/(png|jpeg|webp)$/).test(file.type))throw Error("Selecciona un MP3 o una imagen JPG, PNG o WebP según el campo.");
  if(file.size>(audio?12:5)*1024*1024)throw Error(audio?"El MP3 supera 12 MB.":"La imagen supera 5 MB.");
  return new Promise((resolve,reject)=>{const reader=new FileReader();reader.onerror=()=>reject(Error("No se pudo leer el archivo."));reader.onload=()=>resolve(String(reader.result));reader.readAsDataURL(file)});
}
export function InvitationManager({clients}:{clients:Client[]}){
  const [data,setData]=useState(blank);
  const [chosen,setChosen]=useState(false);
  const [client,setClient]=useState("");
  const [id,setId]=useState(newId);
  const [end,setEnd]=useState("");
  const [active,setActive]=useState(false);
  const [rows,setRows]=useState<Summary[]>([]);
  const [notice,setNotice]=useState("");
  const [busy,setBusy]=useState(false);
  const [preview,setPreview]=useState(false);
  const [giftLines,setGiftLines]=useState("");
  const refresh=()=>listEntries().then(setRows);
  const fail=(err:unknown)=>setNotice(err instanceof Error?err.message:String((err as {message?:string})?.message || "No se pudo completar la operación."));
  useEffect(()=>{refresh().catch(fail)},[]);
  function update<K extends keyof Content>(key:K,value:Content[K]){setData(prev=>({...prev,[key]:value}))}
  function reset(){setChosen(false);setId(newId());setData(blank());setEnd("");setClient("");setGiftLines("");setActive(false);setNotice("");setPreview(false)}
  async function edit(key:string){
    setBusy(true);
    try{const row=await getEntry(key);setId(key);setData({...row.payload,templateId:row.payload.templateId||"rosa-pastel"});setChosen(true);setClient(row.client_id);setEnd(localTime(row.expires_at));setActive(row.active);setGiftLines(row.payload.gifts.map(g=>row.payload.templateId==="hello-kitty"?g[0]:g.join(" | ")).join("\n"));setPreview(false);setNotice("")}catch(err){fail(err)}finally{setBusy(false)}
  }
  const [eventFilter,setEventFilter]=useState("");
  const designs=templates.filter(t=>!eventFilter||t.eventType===eventFilter);
  const visibleRows=rows.filter(row=>!eventFilter||invitationTemplate(row.templateId||undefined)?.eventType===eventFilter);
  const birthday=data.templateId==="hello-kitty";
  function content(){
    const gifts=giftLines.split("\n").filter(s=>s.trim()).map(line=>birthday?[line.split("|")[0].trim()]:line.split("|").map(s=>s.trim()));
    if(data.sections.gifts && (gifts.length>20 || gifts.some(g=>(!birthday&&g.length!==2)||g.some(s=>!s))))throw Error(birthday?"Escribe hasta 20 nombres de regalos.":"Escribe hasta 20 regalos con el formato Regalo | Tienda(s).");
    if(!mapsLink(data.maps)||!mapsLink(data.embed,true))throw Error("Revisa el enlace de Google Maps o la URL de inserción.");
    return {...data,...(birthday?{album:[],looks:["",""],sections:{...data.sections,attire:false,album:false,family:false},qr:""}:{}),name:data.name.trim(),gifts};
  }
  async function submit(event:FormEvent<HTMLFormElement>){
    event.preventDefault();setNotice("");
    const action=((event.nativeEvent as SubmitEvent).submitter as HTMLButtonElement)?.value;
    try{
      const payload=content();
      if(!payload.name||!data.event)throw Error("Completa nombre y fecha para continuar.");
      if(action==="preview"){setData(payload);setPreview(true);return}
      if(!client||!end)throw Error("Selecciona el cliente y la fecha de cierre.");
      if(active&&data.sections.rsvp&&!/^\d{7,15}$/.test(data.phone.replace(/[\s()+-]/g,"")))throw Error("Indica un WhatsApp válido con código de país.");
      const expires=new Date(end+"-05:00");
      if(expires.getTime()<=Date.now()||end<data.event)throw Error("El cierre debe ser futuro y posterior al inicio del evento.");
      if(JSON.stringify(payload).length>25*1024*1024)throw Error("Los archivos de esta invitación superan el límite total. Reduce el tamaño de las imágenes o del MP3.");
      setBusy(true);await saveEntry({id,client_id:client,title:payload.name,active,expires_at:expires.toISOString(),payload});await refresh();
      setNotice(active?"Invitación activa. El enlace aparece en Invitaciones guardadas.":"Borrador guardado.");
    }catch(err){fail(err)}finally{setBusy(false)}
  }
  const field=(key:TextKey,label:string,type="text")=><label key={key}>{label}<input type={type} value={data[key]} onChange={e=>update(key,e.target.value)}/></label>;
  function upload(label:string,target:"album"|"song"|"woman"|"man"|"qr"){
    const audio=target==="song";
    const attached=target==="album"?data.album.length:target==="woman"?data.looks[0]:target==="man"?data.looks[1]:data[target];
    function assign(values:string[]){
      if(target==="album")update("album",values);
      else if(target==="man"||target==="woman"){const looks=[...data.looks];looks[target==="woman"?0:1]=values[0]||"";update("looks",looks)}
      else update(target,values[0]||"");
    }
    return <div><label>{label}<input type="file" multiple={target==="album"} accept={audio?"audio/mpeg,.mp3":"image/png,image/jpeg,image/webp"} onChange={async e=>{
      const files=Array.from(e.target.files||[]);e.target.value="";if(!files.length)return;
      try{if(target==="album"&&files.length+data.album.length>14)throw Error("El álbum admite hasta 14 fotos.");
        setBusy(true);const values=await Promise.all(files.map(f=>readFile(f,audio)));assign(target==="album"?[...data.album,...values]:values);setNotice("");
      }catch(err){fail(err)}finally{setBusy(false)}
    }}/></label>{Boolean(attached)&&target!=="album"&&<button type="button" onClick={()=>assign([])}>Quitar archivo</button>}</div>;
  }
  return <section className="inv-manager panel"><h2>Generador de invitaciones</h2>
    {!configured&&<p>Prueba local. Los borradores se guardan en este navegador. Guarda desde localhost para probar un enlace activo en el celular por Wi-Fi.</p>}
    <label>Filtrar por tipo de evento<select value={eventFilter} onChange={e=>setEventFilter(e.target.value)}><option value="">Todos los eventos</option>{eventTypes.map(type=><option key={type}>{type}</option>)}</select></label>
    <details open><summary>Invitaciones guardadas ({visibleRows.length})</summary>{visibleRows.map(row=><div className="inv-row" key={row.id}><strong>{row.title}</strong><span>{clients.find(c=>c.id===row.client_id)?.company_name}</span><button disabled={busy} onClick={()=>edit(row.id)}>Editar</button>{row.active&&Date.parse(row.expires_at)>Date.now()&&<><a href={publicLink(invitationPath(row.id,row.title))} target="_blank" rel="noreferrer">Abrir enlace</a><button type="button" onClick={async()=>{try{await navigator.clipboard.writeText(publicLink(invitationPath(row.id,row.title)));setNotice("Enlace copiado.")}catch{setNotice("Usa Abrir enlace y copia la dirección desde el navegador.")}}}>Copiar enlace</button></>}</div>)}</details>
    <button type="button" disabled={busy} onClick={reset}>Nueva invitación</button>
    {!chosen ? <fieldset className="inv-template-picker"><legend>Selecciona una plantilla</legend>{!designs.length&&<p>Aún no hay plantillas para este tipo de evento.</p>}{designs.map(t=><div key={t.id} className="inv-sample-card"><button data-template={t.id} type="button" disabled={busy} onClick={()=>{setData(prev=>({...prev,templateId:t.id,color:prev.color===invitationTemplate(prev.templateId)?.color?t.color:prev.color}));setChosen(true)}}><strong>{t.name}</strong><span>Elegir plantilla</span></button><div><a href={publicLink(t.path)} target="_blank" rel="noreferrer">Ver muestra</a><button type="button" onClick={async()=>{try{await navigator.clipboard.writeText(publicLink(t.path));setNotice("Enlace de "+t.name+" copiado.")}catch{setNotice("Abre la muestra y copia la dirección del navegador.")}}}>Copiar enlace</button></div></div>)}</fieldset> :
    <form onSubmit={submit}><p>Plantilla: <strong>{invitationTemplate(data.templateId)?.name}</strong> <button type="button" disabled={busy} onClick={()=>setChosen(false)}>Cambiar plantilla</button></p><fieldset disabled={busy}><legend>Cliente y evento</legend><label>Cliente<select value={client} onChange={e=>setClient(e.target.value)}><option value="">Selecciona un cliente</option>{clients.map(c=><option key={c.id} value={c.id}>{c.company_name}</option>)}</select></label>
    {field("name",birthday?"Nombre de quien cumple años":"Nombre de la quinceañera")}{birthday&&<label>Edad que cumple<input required type="number" min="1" max="120" value={data.age||""} onChange={e=>update("age",e.target.value)}/></label>}{field("event","Fecha y hora del evento · Lima","datetime-local")}
    <label>Cierre de la invitación · Lima<input type="datetime-local" value={end} onChange={e=>setEnd(e.target.value)}/></label>{field("phone","WhatsApp con código de país","tel")}
    <details open><summary>Secciones visibles</summary><div className="inv-checks">{Object.entries(sections).filter(([key])=>!birthday||!["album","attire","family","parents","sponsors"].includes(key)).map(([key,label])=><label key={key}><input type="checkbox" checked={data.sections[key]} onChange={e=>update("sections",{...data.sections,[key]:e.target.checked})}/>{label}</label>)}</div></details>
    <details><summary>{birthday?"Música y carta":"Música, carta y familia"}</summary>{upload("Canción MP3","song")}<label>Mensaje de la invitación<textarea rows={5} value={data.letter} onChange={e=>update("letter",e.target.value)}/></label>{!birthday&&<>{field("parents","Nombres de los padres")}{field("sponsors","Nombres de los padrinos")}</>}</details>
    <details><summary>{birthday?"Ubicación":"Ubicación y vestimenta"}</summary>{field("venue","Local")}{field("address","Dirección exacta, distrito y ciudad")}{field("maps","Enlace para abrir Google Maps","url")}{field("embed","URL de inserción de Google Maps (opcional, para un punto exacto)","url")}{!birthday&&<>{field("dress","Código de vestimenta")}{field("woman","Descripción del atuendo femenino")}{upload("Imagen femenina (PNG o WebP para transparencia)","woman")}{field("man","Descripción del atuendo masculino")}{upload("Imagen masculina","man")}{field("color","Color reservado")}</>}</details>
    {!birthday&&<details><summary>Álbum ({data.album.length}/14)</summary>{upload("Añadir fotos","album")}<ol>{data.album.map((src,i)=><li key={i}><img src={src} alt={'Foto '+(i+1)}/><button type="button" disabled={i===0} onClick={()=>{const list=[...data.album];[list[i-1],list[i]]=[list[i],list[i-1]];update("album",list)}}>Adelantar</button><button type="button" onClick={()=>update("album",data.album.filter((_,j)=>i!==j))}>Quitar</button></li>)}</ol></details>}
    <details><summary>{birthday?"Lista de deseos":"Regalos y Yape"}</summary><label>{birthday?"Escribe el nombre de un regalo por línea":"Un regalo por línea. Separa el nombre y las tiendas con |"}<textarea rows={5} placeholder={birthday?"Set de dibujo":"Pulsera | Tienda A, Tienda B"} value={giftLines} onChange={e=>setGiftLines(e.target.value)}/></label>{!birthday&&upload("QR de Yape","qr")}</details>
    <label><input type="checkbox" checked={active} onChange={e=>setActive(e.target.checked)}/> Activar el enlace al guardar</label>
    <div className="inv-row"><button value="preview">Vista previa móvil</button><button value="save">Guardar invitación</button></div></fieldset></form>}
    <p role="status">{notice}</p>
    {preview&&<div className="inv-overlay" role="dialog" aria-modal="true" aria-label="Vista previa móvil"><button onClick={()=>setPreview(false)}>Cerrar vista previa</button><div><InvitationFrame content={data}/></div></div>}
    </section>;
}









