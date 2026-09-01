import React from "react";
import ReactDOM from "react-dom/client";
import { registerSW } from "virtual:pwa-register";
import { Capacitor } from "@capacitor/core";
import { setupIonicReact } from "@ionic/react";
import App from "./app/App";
import "@ionic/react/css/core.css";
import "./styles.css";

setupIonicReact({ mode: "md" });

if (!Capacitor.isNativePlatform()) {
  registerSW({
    immediate: true,
    onRegisteredSW() {
      // Keep registration silent; UI handles install/update flow.
    }
  });
}

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
