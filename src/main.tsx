import {sampleContent} from "./invitations/sample";
import {invitationId} from "./invitations/links";
import {InvitationFrame,PublicInvitation} from "./invitations/InvitationFrame";
import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./styles.css";

const sample=sampleContent(location.pathname);
if(sample)document.title=sample.name+(sample.templateId==="hello-kitty"?" · Mi cumpleaños":" · Mis quince años");
const id=invitationId(location.pathname);
ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    {sample ? <main style={{height:"100dvh"}}><InvitationFrame content={sample}/></main> : id !== null ? <PublicInvitation id={id} /> : <App />}
  </React.StrictMode>,
);





