/* ============================================================
   背景音乐
   一个五声音阶的循环小曲，全部由振荡器现场合成。

   为什么用五声音阶：它没有半音冲突，任意两个音同时响都不会难听，
   所以即使用很简单的随机化编排也不会出现刺耳的和声。
   对「长时间挂着当背景」的场景，这是最安全的选择。

   实现用的是 Web Audio 的标准前瞻排程（lookahead scheduler）：
   setInterval 只负责「提前把未来 0.2 秒内的音符排进音频时钟」，
   实际发声时刻由 AudioContext.currentTime 决定 —— 不依赖
   setTimeout 的精度，切后台回来也不会跑调。
   ============================================================ */

import { getContext, getMusicBus, isMuted } from "./engine";

/** 每分钟拍数。慢一点更适合长时间挂机。 */
const BPM = 84;
/** 一个 step = 八分音符 */
const STEP_S = 60 / BPM / 2;
const PATTERN_STEPS = 32;

/** 五声音阶相对 C5 的半音偏移 */
const SCALE = [0, 2, 4, 7, 9];
const C5 = 523.25;

function freqOf(semitonesFromC5: number): number {
  return C5 * Math.pow(2, semitonesFromC5 / 12);
}

/**
 * 旋律：16 分音符网格上的音阶序号，null 表示休止。
 * 两段各 16 步，构成一个 32 步的循环。
 */
const MELODY: (number | null)[] = [
  // 第一句：上行再回落
  0, null, 2, null, 3, null, 2, null, 1, null, 2, null, 0, null, null, null,
  // 第二句：走到高音再收回来
  2, null, 3, null, 4, null, 3, null, 2, null, 1, null, 0, null, null, null,
];

/** 低音：每 8 步一个根音，让循环有稳定的地面感 */
const BASS: (number | null)[] = [
  -24, null, null, null, null, null, null, null,
  -22, null, null, null, null, null, null, null,
  -24, null, null, null, null, null, null, null,
  -19, null, null, null, null, null, null, null,
];

let timer: number | undefined;
let nextNoteTime = 0;
let step = 0;
let playing = false;

/** 闪避状态：音效播放时把音乐压低，播完再抬回来 */
let duckUntil = 0;

/** 把音乐压低一会儿，给重要音效让路 */
export function duckMusic(durationS = 0.6, depth = 0.4): void {
  const ctx = getContext();
  const bus = getMusicBus();
  if (!ctx || !bus) return;

  const now = ctx.currentTime;
  const end = now + durationS;
  duckUntil = Math.max(duckUntil, end);

  bus.gain.cancelScheduledValues(now);
  bus.gain.setValueAtTime(bus.gain.value, now);
  bus.gain.linearRampToValueAtTime(BASE_MUSIC_GAIN * depth, now + 0.05);
  bus.gain.linearRampToValueAtTime(BASE_MUSIC_GAIN, end + 0.25);
}

const BASE_MUSIC_GAIN = 0.3;

function scheduleStep(index: number, time: number): void {
  const ctx = getContext();
  const bus = getMusicBus();
  if (!ctx || !bus) return;

  // ---- 旋律 ----
  const deg = MELODY[index % PATTERN_STEPS];
  if (deg !== null && deg !== undefined) {
    const semi = SCALE[deg];
    if (semi !== undefined) {
      const osc = ctx.createOscillator();
      osc.type = "triangle";
      osc.frequency.value = freqOf(semi);

      const env = ctx.createGain();
      env.gain.setValueAtTime(0.0001, time);
      env.gain.exponentialRampToValueAtTime(0.16, time + 0.02);
      env.gain.exponentialRampToValueAtTime(0.0001, time + STEP_S * 1.8);

      osc.connect(env);
      env.connect(bus);
      osc.start(time);
      osc.stop(time + STEP_S * 2);
    }
  }

  // ---- 低音 ----
  const bassDeg = BASS[index % PATTERN_STEPS];
  if (bassDeg !== null && bassDeg !== undefined) {
    const osc = ctx.createOscillator();
    osc.type = "sine";
    osc.frequency.value = freqOf(bassDeg);

    const env = ctx.createGain();
    env.gain.setValueAtTime(0.0001, time);
    env.gain.exponentialRampToValueAtTime(0.22, time + 0.04);
    env.gain.exponentialRampToValueAtTime(0.0001, time + STEP_S * 6);

    osc.connect(env);
    env.connect(bus);
    osc.start(time);
    osc.stop(time + STEP_S * 7);
  }
}

function scheduler(): void {
  const ctx = getContext();
  if (!ctx || !playing) return;

  // 提前把未来 0.2 秒内的音符排进音频时钟
  while (nextNoteTime < ctx.currentTime + 0.2) {
    scheduleStep(step, nextNoteTime);
    nextNoteTime += STEP_S;
    step = (step + 1) % PATTERN_STEPS;
  }
}

export function isMusicPlaying(): boolean {
  return playing;
}

export function startMusic(): void {
  const ctx = getContext();
  if (!ctx || playing) return;

  // 静音时不必空转排程器，省电
  if (isMuted()) return;

  playing = true;
  nextNoteTime = ctx.currentTime + 0.15;
  timer = window.setInterval(scheduler, 25);
}

export function stopMusic(): void {
  playing = false;
  if (timer !== undefined) {
    window.clearInterval(timer);
    timer = undefined;
  }
}

/** 切到后台时暂停，回前台再继续 —— 手机锁屏不该一直响 */
export function handleVisibility(hidden: boolean): void {
  if (hidden) stopMusic();
  else startMusic();
}
