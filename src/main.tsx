import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./styles.css";

document.getElementById("site-fallback")?.remove();
document.documentElement.classList.remove("app-booting");

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
