import { useTranslation } from "react-i18next";

import { setLanguage, type Language } from "../i18n";

/** 语言切换：按钮上显示的是「点一下会切到的语言」 */
export function LanguageToggle() {
  const { i18n } = useTranslation();
  const next: Language = i18n.language === "zh" ? "en" : "zh";

  return (
    <button
      type="button"
      className="lang"
      onClick={() => setLanguage(next)}
      aria-label={next === "zh" ? "切换到中文" : "Switch to English"}
    >
      {next === "zh" ? "中文" : "EN"}
    </button>
  );
}
