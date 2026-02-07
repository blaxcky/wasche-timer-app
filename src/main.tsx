import React from "react";
import ReactDOM from "react-dom/client";
import { registerSW } from "virtual:pwa-register";
import App from "./app/App";
import "./styles.css";

registerSW({
  immediate: true,
  onRegisteredSW() {
    // Keep registration silent; UI handles install/update flow.
  }
});

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
