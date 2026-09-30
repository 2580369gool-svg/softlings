import { useEffect } from "react";

import { ensureAudio, isMuted, resumeAudio, startMusic, stopMusic } from "../audio";

/**
 * 音频生命周期。
 *
 * 三件事：
 *  1. 首次用户手势解锁 AudioContext —— 浏览器的自动播放策略要求如此，
 *     不这么做的话音乐永远起不来（而且不会有任何报错，极易漏掉）；
 *  2. 切后台停音乐、回前台续上 —— 手机锁屏时不该继续响；
 *  3. 卸载时清理。
 */
export function useAudio() {
  useEffect(() => {
    const unlock = () => {
      ensureAudio();
      resumeAudio();
      if (!isMuted()) startMusic();
      window.removeEventListener("pointerdown", unlock);
      window.removeEventListener("keydown", unlock);
    };

    window.addEventListener("pointerdown", unlock);
    window.addEventListener("keydown", unlock);

    const onVisibility = () => {
      if (document.hidden) {
        stopMusic();
      } else {
        // 回到前台时 context 常常已被浏览器挂起，必须显式恢复
        resumeAudio();
        if (!isMuted()) startMusic();
      }
    };
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      window.removeEventListener("pointerdown", unlock);
      window.removeEventListener("keydown", unlock);
      document.removeEventListener("visibilitychange", onVisibility);
      stopMusic();
    };
  }, []);
}
