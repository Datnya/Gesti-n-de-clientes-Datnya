// Local demo bridge. Only the editor on loopback can change the invitations
// shared over Wi-Fi. No CRM credentials, client IDs or drafts are served.
import {isIP} from "node:net";
export function localInvitations(){
  const records=new Map();
  return {name:"local-invitation-preview",apply:"serve",configureServer(server){
    const sweep=setInterval(()=>{for(const [id,row] of records)if(row.end<=Date.now())records.delete(id)},60000);
    server.httpServer?.once("close",()=>clearInterval(sweep));
    server.middlewares.use("/__invite_preview",async(req,res)=>{
      res.setHeader("Cache-Control","no-store");
      const id=req.url?.slice(1);
      if(!/^[a-f0-9-]{36}$/.test(id||"")){res.writeHead(404).end();return}
      if(req.method==="GET"){
        const row=records.get(id);
        if(!row||row.end<=Date.now()){res.writeHead(404).end();return}
        res.setHeader("Content-Type","application/json");res.end(row.json);return;
      }
      const remote=req.socket.remoteAddress?.replace(/^::ffff:/,"");
      const local=remote==="::1" || (isIP(remote||"")===4 && remote.startsWith("127."));
      if(!local||req.headers.origin!=="http://"+req.headers.host||req.method!=="PUT"){res.writeHead(403).end();return}
      try{
        const chunks=[];let size=0;
        for await(const chunk of req){size+=chunk.length;if(size>26*1024*1024){res.writeHead(413).end();return}chunks.push(chunk)}
        const {end,payload}=JSON.parse(Buffer.concat(chunks).toString());
        if(!payload||end<=Date.now())records.delete(id);
        else if(Number.isFinite(end))records.set(id,{end,json:JSON.stringify(payload)});
        else throw Error();
        res.writeHead(204).end();
      } catch {res.writeHead(400).end()}
    });
  }};
}
