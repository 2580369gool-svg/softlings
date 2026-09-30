/* ============================================================
   音频引擎
   全部声音由 Web Audio 现场合成，不引入任何音频文件 ——
   和「美术纯代码生成」保持一致，APK 不会因为音频素材膨胀。

   总线架构（借游戏音频的常规做法）：
     各音源 → music / sfx 分总线 → master → destination
   好处是音量可以分层控制，静音只需要动 master 一个节点。

   浏览器的自动播放策略要求音频必须由用户手势启动，
   所以 ensureAudio() 只在第一次点击/触摸时被调用。
   ============================================================ */

/** 分层音量。音乐刻意压得比音效低，避免长时间游玩时疲劳。 */
const MASTER_VOLUME = 0.5;
const MUSIC_VOLUME = 0.3;
const SFX_VOLUME = 0.75;

const MUTE_KEY = "softlings.muted";

let ctx: AudioContext | null = null;
let masterGain: GainNode | null = null;
let musicGain: GainNode | null = null;
let sfxGain: GainNode | null = null;

let muted = readMuted();

function readMuted(): boolean {
  try {
    return localStorage.getItem(MUTE_KEY) === "1";
  } catch {
    return false;
  }
}

function writeMuted(v: boolean): void {
  try {
    localStorage.setItem(MUTE_KEY, v ? "1" : "0");
  } catch {
    /* 隐私模式，忽略 */
  }
}

export function isMuted(): boolean {
  return muted;
}

/** 音频是否已经就绪（已通过用户手势启动） */
export function isAudioReady(): boolean {
  return ctx !== null && ctx.state === "running";
}

/**
 * 创建 AudioContext 与各条总线。
 * 必须由用户手势触发，否则 Chrome/Safari 会把 context 挂起。
 */
export function ensureAudio(): AudioContext | null {
  if (ctx) return ctx;
  try {
    const Ctor =
      window.AudioContext ??
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) return null;

    ctx = new Ctor();

    masterGain = ctx.createGain();
    masterGain.gain.value = muted ? 0 : MASTER_VOLUME;
    masterGain.connect(ctx.destination);

    musicGain = ctx.createGain();
    musicGain.gain.value = MUSIC_VOLUME;
    musicGain.connect(masterGain);

    sfxGain = ctx.createGain();
    sfxGain.gain.value = SFX_VOLUME;
    sfxGain.connect(masterGain);

    return ctx;
  } catch {
    // 没有音频设备 / 被策略拦掉，静默降级成无声游戏
    return null;
  }
}

/** 从挂起状态恢复（切后台再回来时浏览器会挂起 context） */
export function resumeAudio(): void {
  const c = ensureAudio();
  if (c && c.state === "suspended") void c.resume();
}

export function getContext(): AudioContext | null {
  return ctx;
}

export function getSfxBus(): GainNode | null {
  return sfxGain;
}

export function getMusicBus(): GainNode | null {
  return musicGain;
}

export function setMuted(next: boolean): void {
  muted = next;
  writeMuted(next);
  if (masterGain && ctx) {
    // 用短斜坡而不是直接赋值，避免爆音
    const now = ctx.currentTime;
    masterGain.gain.cancelScheduledValues(now);
    masterGain.gain.setValueAtTime(masterGain.gain.value, now);
    masterGain.gain.linearRampToValueAtTime(next ? 0 : MASTER_VOLUME, now + 0.12);
  }
}

export function toggleMuted(): boolean {
  setMuted(!muted);
  return muted;
}
