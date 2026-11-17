import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "@fontsource-variable/lexend";
import "@fontsource-variable/jetbrains-mono";
import "./styles.css";
import "./i18n";
import { App } from "./App";
import { applyTheme, installThemeStylesheet, loadTheme } from "./theme/apply";

installThemeStylesheet();
applyTheme(loadTheme());

const root = document.getElementById("root");
if (!root) throw new Error("Missing #root element in index.html");

createRoot(root).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
