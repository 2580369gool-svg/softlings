import { useState } from "react";
import { useTranslation } from "react-i18next";

import { ensureAudio, isMuted, resumeAudio, startMusic, stopMusic, toggleMuted } from "../audio";

/**
 * 声音开关。
 * 默认是开着的，但必须给一个显眼的关闭入口 ——
 * 移动端强制发声是最容易招致卸载的行为之一。
 */
export function SoundToggle() {
  const { t } = useTranslation();
  const [muted, setMuted] = useState(() => isMuted());

  const onClick = () => {
    // 先解锁音频：用户可能就是靠这一下才第一次产生手势
    ensureAudio();
    resumeAudio();

    const next = toggleMuted();
    setMuted(next);
    if (next) stopMusic();
    else startMusic();
  };

  return (
    <button
      type="button"
      className="navbtn"
      onClick={onClick}
      aria-label={muted ? t("audio.unmute") : t("audio.mute")}
      aria-pressed={muted}
      title={muted ? t("audio.unmute") : t("audio.mute")}
    >
      {muted ? "🔇" : "🔊"}
    </button>
  );
}
