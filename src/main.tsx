import {invitationId} from "./invitations/links";
import {PublicInvitation} from "./invitations/InvitationFrame";
import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./styles.css";

const id=invitationId(location.pathname);
ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    {id !== null ? <PublicInvitation id={id} /> : <App />}
  </React.StrictMode>,
);


