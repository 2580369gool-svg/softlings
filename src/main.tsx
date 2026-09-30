import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

import App from "./App";
import "./i18n";
import "./styles/global.css";

// ?reset 清档重开 —— 必须在 React 挂载前执行，否则 store 会先把旧档读进来。
// 故意不做成界面按钮：清档是不可逆操作，放进设置页时要配二次确认，那是 M6 的事。
const params = new URLSearchParams(window.location.search);
if (params.has("reset")) {
  try {
    localStorage.removeItem("softlings.save");
    localStorage.removeItem("softlings.save.backup");
  } catch {
    /* 隐私模式下拿不到 localStorage，忽略即可 */
  }
  window.location.replace(window.location.pathname);
}

const rootEl = document.getElementById("root");
if (!rootEl) throw new Error("找不到 #root 挂载点");

createRoot(rootEl).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
