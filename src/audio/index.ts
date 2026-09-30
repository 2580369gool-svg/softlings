/** 音频模块的对外入口 —— 其余代码只从这里 import */

export {
  ensureAudio,
  isAudioReady,
  isMuted,
  resumeAudio,
  setMuted,
  toggleMuted,
} from "./engine";
export { duckMusic, startMusic, stopMusic } from "./music";
export { playSfx, type SfxName } from "./sfx";
