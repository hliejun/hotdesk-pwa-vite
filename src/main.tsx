import React from "react";
import ReactDOM from "react-dom/client";
import { registerSW } from "virtual:pwa-register";
import App from "./App";
import "./styles/index.css";
import { confirm } from "./lib/confirm";

// PWA service worker registration (vite-plugin-pwa)
const updateSW = registerSW({
  immediate: true,
  onNeedRefresh() {
    const ok = confirm("A new version is available. Reload now?");
    if (ok) void updateSW(true);
  },
  onOfflineReady() {
    // No-op: app is now cached for offline use.
  },
});

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
