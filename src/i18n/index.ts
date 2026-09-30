import i18n from "i18next";
import { initReactI18next } from "react-i18next";

import en from "./locales/en.json";
import zh from "./locales/zh.json";

export const LANGUAGES = ["zh", "en"] as const;
export type Language = (typeof LANGUAGES)[number];

const STORAGE_KEY = "softlings.lang";

/** 读初始语言：用户上次的选择 > 系统语言 > 中文 */
function detectLanguage(): Language {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved === "zh" || saved === "en") return saved;
  } catch {
    // 隐私模式等场景下 localStorage 不可用，静默降级
  }
  const sys = navigator.language?.toLowerCase() ?? "";
  return sys.startsWith("zh") ? "zh" : "en";
}

i18n.use(initReactI18next).init({
  resources: {
    zh: { translation: zh },
    en: { translation: en },
  },
  lng: detectLanguage(),
  fallbackLng: "zh",
  interpolation: {
    // React 自带 XSS 转义，i18next 无需再转一次
    escapeValue: false,
  },
});

/** 切换语言并持久化 */
export function setLanguage(lang: Language) {
  i18n.changeLanguage(lang);
  try {
    localStorage.setItem(STORAGE_KEY, lang);
  } catch {
    // 存不下也不影响本次会话
  }
  document.documentElement.lang = lang === "zh" ? "zh-CN" : "en";
}

// 首屏同步一次 <html lang>
document.documentElement.lang = i18n.language === "zh" ? "zh-CN" : "en";

export default i18n;
