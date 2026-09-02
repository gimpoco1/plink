import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./styles.css";
import { getCurrentTheme } from "./theme/ThemeContext";

document.getElementById("site-fallback")?.remove();
document.documentElement.classList.remove("app-booting");
document.documentElement.dataset.theme = getCurrentTheme();

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
