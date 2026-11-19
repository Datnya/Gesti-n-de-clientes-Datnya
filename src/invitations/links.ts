// New public links encode ten random bytes. The fixed prefix restores their database UUID.
const prefix = "7876726f7361";
const route = "/misquinceanos-";

function uuid(hex:string){
  return [hex.slice(0,8),hex.slice(8,12),hex.slice(12,16),hex.slice(16,20),hex.slice(20)].join("-");
}
export function newId(){
  const random=crypto.getRandomValues(new Uint8Array(10));
  return uuid(prefix+Array.from(random,b=>b.toString(16).padStart(2,"0")).join(""));
}
export function invitationPath(id:string,name:string){
  const hex=id.replaceAll("-","");
  if(!hex.startsWith(prefix))return "/i/"+id;
  const slug=name.normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase().replace(/[^a-z0-9]+/g,"-").slice(0,32).replace(/^-+|-+$/g,"")||"fiesta";
  const bytes=hex.slice(prefix.length).match(/../g)!.map(s=>parseInt(s,16));
  const token=btoa(String.fromCharCode(...bytes)).replaceAll("+","-").replaceAll("/","_").replace(/=+$/,"");
  return route+slug+"-"+token;
}
export function invitationId(path:string){
  if(path.startsWith("/i/"))return path.slice(3);
  if(!path.startsWith(route))return null;
  const match=/^[a-z0-9-]+-([A-Za-z0-9_-]{14})$/.exec(path.slice(route.length).replace(/\/$/,""));
  if(!match)return "";
  const bytes=atob(match[1].replaceAll("-","+").replaceAll("_","/")+"==");
  return uuid(prefix+Array.from(bytes,c=>c.charCodeAt(0).toString(16).padStart(2,"0")).join(""));
}

export function publicLink(path:string) {
  return new URL(path, import.meta.env.PROD ? "https://tusxv.vercel.app" : location.origin).href;
}
