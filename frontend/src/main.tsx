/**
 * Browser entry: creates the React root and mounts ``App`` into ``#root``.
 *
 * Imports global Tailwind styles from ``./index.css``. StrictMode enables extra
 * dev-only checks; safe to keep for hackathon demos.
 */
import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./index.css";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
