/* ============================================================
   音效库
   每个音效都是几行合成参数，全部由 synth.ts 的两个原语搭出来。

   设计取舍：音效一律「短、轻、偏高」。手机上外放的低频基本听不见，
   真正能传达反馈的是 800Hz 以上的短促音；低频留给人声和音乐。
   ============================================================ */

import { getContext, getSfxBus } from "./engine";

import { playNoise, playTone } from "./synth";

export type SfxName =
  // 主界面互动
  | "tap"
  | "feed"
  | "bathe"
  | "pet"
  | "play"
  | "tease"
  | "photo"
  | "talk"
  | "sleep"
  | "stroke"
  // 系统
  | "buy"
  | "deny"
  | "visitor"
  | "hatch"
  | "crack"
  | "evolve"
  // 小游戏
  | "catch"
  | "pop"
  | "badPop"
  | "perfect"
  | "good"
  | "miss"
  | "flip"
  | "match"
  | "win"
  | "lose"
  | "draw"
  | "cast"
  | "countdown"
  | "gameOver";

/** 五声音阶的音高，让所有音效听起来像是同一套乐器 */
const C5 = 523.25;
const D5 = 587.33;
const E5 = 659.25;
const G5 = 783.99;
const A5 = 880;
const C6 = 1046.5;
const E6 = 1318.5;
const G6 = 1568;

const SFX: Record<SfxName, () => void> = {
  /* ---------------- 主界面互动 ---------------- */

  // 通用按键：极短的一声，几乎只是「确认收到点击」
  tap: () => {
    playTone({ freq: A5, dur: 0.06, gain: 0.12, type: "triangle", vary: 0.03 });
  },

  // 吃东西：两声下行，像咀嚼
  feed: () => {
    playTone({ freq: E5, freqTo: D5, dur: 0.09, gain: 0.22, type: "triangle", vary: 0.04 });
    playTone({ freq: C5, freqTo: G5, dur: 0.11, gain: 0.2, type: "triangle", delay: 0.09 });
  },

  // 洗澡：带通噪声扫频 = 水声
  bathe: () => {
    playNoise({ dur: 0.55, gain: 0.22, filterFreq: 600, filterTo: 3200, q: 0.7 });
    playTone({ freq: C6, dur: 0.2, gain: 0.1, type: "sine", delay: 0.15, vary: 0.05 });
  },

  // 摸摸：一声柔和的高音，飘一点
  pet: () => {
    playTone({ freq: E5, freqTo: A5, dur: 0.22, gain: 0.18, type: "sine", vary: 0.04 });
  },

  // 玩耍：上行三连音，明快
  play: () => {
    playTone({ freq: C5, dur: 0.1, gain: 0.2, type: "triangle" });
    playTone({ freq: E5, dur: 0.1, gain: 0.2, type: "triangle", delay: 0.08 });
    playTone({ freq: G5, dur: 0.16, gain: 0.22, type: "triangle", delay: 0.16 });
  },

  // 逗弄：两声俏皮的跳音
  tease: () => {
    playTone({ freq: G5, dur: 0.07, gain: 0.18, type: "square", vary: 0.05 });
    playTone({ freq: D5, dur: 0.09, gain: 0.16, type: "square", delay: 0.07 });
  },

  // 拍照：快门 = 极短噪声
  photo: () => {
    playNoise({ dur: 0.05, gain: 0.3, filterFreq: 4000, q: 1.5 });
    playNoise({ dur: 0.04, gain: 0.2, filterFreq: 2200, q: 1.5, delay: 0.06 });
  },

  // 说话：两声柔和短音
  talk: () => {
    playTone({ freq: D5, dur: 0.08, gain: 0.15, type: "sine", vary: 0.06 });
    playTone({ freq: G5, dur: 0.1, gain: 0.15, type: "sine", delay: 0.08, vary: 0.06 });
  },

  // 哄睡：下行滑音，柔和
  sleep: () => {
    playTone({ freq: G5, freqTo: C5, dur: 0.5, gain: 0.16, type: "sine" });
  },

  // 抚摸：极轻的一声，不能打断注意力
  stroke: () => {
    playTone({ freq: C6, dur: 0.09, gain: 0.09, type: "sine", vary: 0.08 });
  },

  /* ---------------- 系统 ---------------- */

  // 购买成功：悦耳的两音
  buy: () => {
    playTone({ freq: E5, dur: 0.1, gain: 0.2, type: "triangle" });
    playTone({ freq: A5, dur: 0.22, gain: 0.22, type: "triangle", delay: 0.09 });
  },

  // 买不起：闷闷的低音，不刺耳但意思很明确
  deny: () => {
    playTone({ freq: 180, freqTo: 130, dur: 0.16, gain: 0.22, type: "triangle" });
  },

  // 访客到访：轻快的三连音，像小鸟叫
  visitor: () => {
    playTone({ freq: G5, dur: 0.08, gain: 0.18, type: "sine", vary: 0.05 });
    playTone({ freq: C6, dur: 0.08, gain: 0.18, type: "sine", delay: 0.09, vary: 0.05 });
    playTone({ freq: E6, dur: 0.2, gain: 0.2, type: "sine", delay: 0.18 });
  },

  // 蛋壳开裂：一记干脆的脆响 —— 高频噪声短促爆发，像硬壳绷开
  crack: () => {
    playNoise({ dur: 0.09, gain: 0.32, filterFreq: 3600, filterTo: 1400, q: 2.4 });
    playTone({ freq: 1200, freqTo: 520, dur: 0.07, gain: 0.14, type: "square" });
  },

  // 破壳：短促的上行号角
  hatch: () => {
    [C5, E5, G5, C6].forEach((f, i) => {
      playTone({ freq: f, dur: 0.22, gain: 0.24, type: "triangle", delay: i * 0.11 });
    });
    playNoise({ dur: 0.3, gain: 0.14, filterFreq: 1800, filterTo: 5000, q: 0.8 });
  },

  // 进化：更长的上行，后面跟一个亮堂的和弦
  evolve: () => {
    [C5, E5, G5, C6, E6].forEach((f, i) => {
      playTone({ freq: f, dur: 0.3, gain: 0.22, type: "triangle", delay: i * 0.1 });
    });
    [C6, E6, G6].forEach((f) => {
      playTone({ freq: f, dur: 0.9, gain: 0.14, type: "sine", delay: 0.52 });
    });
  },

  /* ---------------- 小游戏 ---------------- */

  // 接住水果：一声弹响
  catch: () => {
    playTone({ freq: G5, freqTo: C6, dur: 0.09, gain: 0.2, type: "triangle", vary: 0.06 });
  },

  // 戳破泡泡
  pop: () => {
    playTone({ freq: E6, freqTo: G5, dur: 0.07, gain: 0.2, type: "sine", vary: 0.08 });
    playNoise({ dur: 0.04, gain: 0.12, filterFreq: 3000, q: 1.2 });
  },

  // 点到陷阱泡泡：不协和的低音，一听就知道做错了
  badPop: () => {
    playTone({ freq: 160, freqTo: 90, dur: 0.26, gain: 0.26, type: "sawtooth" });
  },

  perfect: () => {
    playTone({ freq: C6, dur: 0.12, gain: 0.22, type: "triangle" });
    playTone({ freq: E6, dur: 0.18, gain: 0.2, type: "triangle", delay: 0.08 });
  },

  good: () => {
    playTone({ freq: A5, dur: 0.1, gain: 0.18, type: "triangle", vary: 0.04 });
  },

  miss: () => {
    playTone({ freq: 300, freqTo: 200, dur: 0.12, gain: 0.14, type: "sine" });
  },

  // 翻牌
  flip: () => {
    playNoise({ dur: 0.05, gain: 0.16, filterFreq: 2600, q: 1.4 });
  },

  // 配对成功
  match: () => {
    playTone({ freq: E5, dur: 0.1, gain: 0.2, type: "triangle" });
    playTone({ freq: C6, dur: 0.2, gain: 0.2, type: "triangle", delay: 0.09 });
  },

  win: () => {
    [C5, E5, G5, C6].forEach((f, i) =>
      playTone({ freq: f, dur: 0.2, gain: 0.22, type: "triangle", delay: i * 0.08 }),
    );
  },

  lose: () => {
    playTone({ freq: G5, freqTo: C5, dur: 0.4, gain: 0.18, type: "triangle" });
  },

  draw: () => {
    playTone({ freq: E5, dur: 0.16, gain: 0.16, type: "triangle" });
  },

  // 抛竿：噪声扫频
  cast: () => {
    playNoise({ dur: 0.3, gain: 0.18, filterFreq: 3000, filterTo: 500, q: 0.9 });
  },

  // 最后 5 秒的提示音
  countdown: () => {
    playTone({ freq: D5, dur: 0.1, gain: 0.16, type: "square", vary: 0.02 });
  },

  gameOver: () => {
    playTone({ freq: G5, dur: 0.14, gain: 0.2, type: "triangle" });
    playTone({ freq: C5, dur: 0.32, gain: 0.2, type: "triangle", delay: 0.13 });
  },
};

/** 同一个音效在这个时间窗内只播一次，防止连点造成叠音爆音 */
const THROTTLE_MS: Partial<Record<SfxName, number>> = {
  stroke: 220,
  tap: 60,
  catch: 45,
  pop: 35,
  flip: 80,
  countdown: 400,
};

const lastPlayed = new Map<SfxName, number>();

export function playSfx(name: SfxName): void {
  const ctx = getContext();
  // 音频还没被用户手势启动，静默跳过 —— 不能为了发声去创建 context
  if (!ctx || ctx.state !== "running") return;
  if (!getSfxBus()) return;

  const gate = THROTTLE_MS[name];
  if (gate) {
    const now = performance.now();
    const last = lastPlayed.get(name) ?? -Infinity;
    if (now - last < gate) return;
    lastPlayed.set(name, now);
  }

  try {
    SFX[name]();
  } catch {
    // 单个音效失败不该影响游戏
  }
}
