/* ============================================================
   合成原语
   只提供两个最基础的音源：振荡器音符、滤波噪声。
   所有音效都由这两个原语组合出来，不依赖任何采样文件。
   ============================================================ */

import { getContext, getSfxBus } from "./engine";

export interface ToneOptions {
  freq: number;
  /** 有值时做频率滑音 */
  freqTo?: number;
  dur: number;
  gain?: number;
  type?: OscillatorType;
  /** 相对当前时刻的延迟（秒） */
  delay?: number;
  attack?: number;
  bus?: GainNode | null;
  /** 音高随机抖动比例。同一个音效反复播会腻，±3% 就能明显缓解 */
  vary?: number;
}

/** 播放一个带包络的振荡器音符 */
export function playTone(opts: ToneOptions): void {
  const ctx = getContext();
  if (!ctx) return;

  const bus = opts.bus ?? getSfxBus();
  if (!bus) return;

  const {
    freq,
    freqTo,
    dur,
    gain = 0.3,
    type = "sine",
    delay = 0,
    attack = 0.008,
    vary = 0,
  } = opts;

  const t0 = ctx.currentTime + delay;
  const jitter = vary > 0 ? 1 + (Math.random() * 2 - 1) * vary : 1;

  const osc = ctx.createOscillator();
  osc.type = type;
  osc.frequency.setValueAtTime(freq * jitter, t0);
  if (freqTo !== undefined) {
    osc.frequency.exponentialRampToValueAtTime(Math.max(20, freqTo * jitter), t0 + dur);
  }

  const env = ctx.createGain();
  // 起音不能是 0，否则会有咔哒声
  env.gain.setValueAtTime(0.0001, t0);
  env.gain.exponentialRampToValueAtTime(gain, t0 + attack);
  env.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);

  osc.connect(env);
  env.connect(bus);
  osc.start(t0);
  osc.stop(t0 + dur + 0.02);
}

export interface NoiseOptions {
  dur: number;
  gain?: number;
  /** 带通中心频率，有 filterTo 时做扫频 */
  filterFreq?: number;
  filterTo?: number;
  q?: number;
  delay?: number;
  bus?: GainNode | null;
}

/** 噪声缓冲只生成一次，重复使用 */
let noiseBuffer: AudioBuffer | null = null;

function getNoiseBuffer(ctx: AudioContext): AudioBuffer {
  if (noiseBuffer && noiseBuffer.sampleRate === ctx.sampleRate) return noiseBuffer;
  const len = Math.floor(ctx.sampleRate * 0.5);
  const buf = ctx.createBuffer(1, len, ctx.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
  noiseBuffer = buf;
  return buf;
}

/** 播放一段带通滤波的噪声 —— 用来做水声、快门、爆裂 */
export function playNoise(opts: NoiseOptions): void {
  const ctx = getContext();
  if (!ctx) return;
  const bus = opts.bus ?? getSfxBus();
  if (!bus) return;

  const { dur, gain = 0.25, filterFreq = 1200, filterTo, q = 1, delay = 0 } = opts;
  const t0 = ctx.currentTime + delay;

  const src = ctx.createBufferSource();
  src.buffer = getNoiseBuffer(ctx);

  const filter = ctx.createBiquadFilter();
  filter.type = "bandpass";
  filter.Q.value = q;
  filter.frequency.setValueAtTime(filterFreq, t0);
  if (filterTo !== undefined) {
    filter.frequency.exponentialRampToValueAtTime(Math.max(60, filterTo), t0 + dur);
  }

  const env = ctx.createGain();
  env.gain.setValueAtTime(0.0001, t0);
  env.gain.exponentialRampToValueAtTime(gain, t0 + 0.006);
  env.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);

  src.connect(filter);
  filter.connect(env);
  env.connect(bus);
  src.start(t0);
  src.stop(t0 + dur + 0.02);
}
