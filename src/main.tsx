import {PublicInvitation} from "./invitations/InvitationFrame";
import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./styles.css";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    {location.pathname.startsWith("/i/") ? <PublicInvitation id={location.pathname.slice(3)} /> : <App />}
  </React.StrictMode>,
);

