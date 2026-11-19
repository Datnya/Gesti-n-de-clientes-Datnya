import {invitationTemplate} from "./templates";
import {useEffect,useState} from "react";
import {publicContent,type Content} from "./store";

export function InvitationFrame({content}:{content:Content}){
  const [template,setTemplate]=useState("");
  const [error,setError]=useState(false);
  const design=invitationTemplate(content.templateId);
  useEffect(()=>{
    let current=true;
    setTemplate("");setError(!design);
    if(design)fetch(design.base+"index.html").then(r=>{if(!r.ok)throw Error();return r.text()}).then(html=>{if(current)setTemplate(html)}).catch(()=>{if(current)setError(true)});
    return ()=>{current=false};
  },[design]);
  if(error||!design)return <p>No se pudo cargar el diseño. Recarga la página.</p>;
  if(!template)return <p>Cargando invitación…</p>;
  const data=JSON.stringify(content).replaceAll("<","\\u003c");
  const html=template.replace("<head>",()=>'<head><base href="'+design.base+'"><script type="application/json" id="invitation-data">'+data+'</script>');
  return <iframe title={'XV de '+content.name} style={{width:"100%",height:"100%",border:0,display:"block"}} srcDoc={design.stylesheet ? html.replace("</head>", `<link rel="stylesheet" href="${design.stylesheet}"><script defer src="${design.effects}"></script></head>`) : html}/>;
}
export function PublicInvitation({id}:{id:string}){
  const [content,setContent]=useState<Content|null>();
  const [error,setError]=useState(false);
  useEffect(()=>{publicContent(id).then(setContent).catch(()=>setError(true))},[id]);
  useEffect(()=>{if(content)document.title=content.name+" · Mis quince años"},[content]);
  return <main style={{height:"100dvh"}}>{error?<p>No se pudo consultar la invitación. Intenta recargar.</p>:content?<InvitationFrame content={content}/>:<p>{content===undefined?"Cargando invitación…":"Esta invitación no está disponible."}</p>}</main>;
}



