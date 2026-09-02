import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./styles.css";
import { getCurrentTheme } from "./theme/ThemeContext";

const currentTheme = getCurrentTheme();

document.getElementById("site-fallback")?.remove();
document.documentElement.classList.remove("app-booting");
document.documentElement.dataset.theme = currentTheme;
document.documentElement.style.colorScheme = currentTheme;

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
