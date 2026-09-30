/* ============================================================
   数值平衡总控 —— 所有可调常量集中在这里。
   调手感只改这一个文件，不要往业务逻辑里塞魔法数字。
   ============================================================ */

import type { ActionKey, NeedKey, Stage } from "./types";

/* ---------------- 时间模型 ---------------- */

/** 在线结算间隔（ms）—— 前台每隔这么久推进一次 */
export const TICK_MS = 5_000;

/** 离线切片步长（ms）—— 离线补算按这个粒度切片，保证非线性衰减算得准 */
export const OFFLINE_STEP_MS = 5 * 60_000;

/** 全额结算的离线时长上限（ms）—— 8 小时（约一夜）以内 100% 结算 */
export const OFFLINE_FULL_MS = 8 * 3_600_000;

/**
 * 超出全额部分的最大追加结算时长（ms）。
 *
 * 离线折算用「渐近饱和」而不是线性打折：
 *   追加 = MAX_TAIL × (1 − e^(−超出时长 / TAU))
 *
 * 为什么不用线性：线性尾巴永远不饱和，弃游 30 天和 7 天算出来的损耗
 * 差得很多，宠物状态会随弃游时长无限恶化。渐近曲线则收敛到
 * FULL + MAX_TAIL = 32 小时的等效上限 —— 弃游一周和弃游一个月，
 * 回来看到的宠物状态是一样的，这才是「不会崩坏」该有的数学。
 */
export const OFFLINE_MAX_TAIL_MS = 24 * 3_600_000;

/** 渐近曲线的时间常数（ms）—— 越小越早饱和 */
export const OFFLINE_TAIL_TAU_MS = 24 * 3_600_000;

/** 原始时长硬上限（ms）—— 防玩家改系统时间刷收益，30 天封顶 */
export const MAX_RAW_ELAPSED_MS = 30 * 24 * 3_600_000;

/* ---------------- 需求衰减（每小时，未含耦合） ---------------- */

/**
 * 数值定标依据：假设玩家一天来看 2–3 次。
 *
 * 日消耗 × 存活检查：
 *   饱食 3/h = 72/天，每次喂食 +30 → 一天喂 3 次刚好打平并小幅盈余
 *   8 小时夜间间隔掉 24 点，醒来是「有点饿」而不是「快死了」
 *
 * 这组数字是用 scripts/simulate.ts 跑 7 天真人时间线调出来的，
 * 改之前先跑一遍模拟，别凭感觉改。
 */
export const DECAY_PER_HOUR: Record<NeedKey, number> = {
  satiety: 3,
  cleanliness: 2.5,
  mood: 2,
  energy: 3.5,
};

/**
 * 需求保底线 —— 「没有死亡机制」这条设计决策的具体落地。
 *
 * Finch 砍掉宠物死亡后才爆发（D1 留存 54%），猫咪后院压根没有死亡概念。
 * 所以哪怕玩家弃游一个月，宠物也只会停在「难过但活着」的状态，
 * 回来喂几顿就能救回去，绝不会出现「打开游戏发现宠物已经没救了」的挫败。
 */
export const NEGLECT_FLOOR = 10;

/**
 * 精力跌破这个值，宠物自己会去睡（自主行为的最小实现，完整版在 M4）。
 *
 * ⚠️ 必须严格大于 NEGLECT_FLOOR，否则永远不会触发 ——
 * 需求被保底线夹住后压根降不到阈值以下。这个坑模拟器抓到过一次。
 */
export const AUTO_SLEEP_ENERGY = 22;

/**
 * 耦合规则 —— 这是玩法深度的来源。
 * 单条需求低不只影响自己：饿肚子会让心情掉得更快，
 * 逼玩家不能「只喂食不管其他」，产生真实取舍。
 */
export const COUPLING: ReadonlyArray<{
  need: NeedKey;
  threshold: number;
  factor: number;
}> = [
  { need: "satiety", threshold: 30, factor: 1.8 },
  { need: "cleanliness", threshold: 30, factor: 1.4 },
  { need: "energy", threshold: 20, factor: 1.2 },
];

/** 睡眠行为参数 */
export const SLEEP = {
  /** 睡眠时精力每小时回复量 */
  energyPerHour: 26,
  /** 睡眠时其他需求的衰减倍率 */
  otherDecayFactor: 0.45,
  /** 精力回满到这个值自动醒来 */
  wakeAt: 99.5,
};

export const NEED_MIN = 0;
export const NEED_MAX = 100;

/** 派生状态的判定阈值，从上往下第一个命中的生效 */
export const STATUS_THRESHOLDS = {
  /** 低于此值判定为「饿 / 脏 / 累」 */
  low: 30,
  /** 低于此值判定为「难过」 */
  critical: 12,
  /** 心情高于此值且其余需求正常 → 开心 */
  happy: 70,
} as const;

/* ---------------- 互动动作 ---------------- */

export interface ActionDef {
  key: ActionKey;
  /** 对四条需求的即时影响 */
  effects: Partial<Record<NeedKey, number>>;
  /** 冷却时间（ms） */
  cooldownMs: number;
  /** 互动时给的经验值 */
  exp: number;
  /** 消耗的精力低于此值时，宠物会拒绝（sleep 除外） */
  requiresEnergy?: number;
}

export const ACTIONS: Record<ActionKey, ActionDef> = {
  feed: {
    key: "feed",
    effects: { satiety: +30, mood: +4, cleanliness: -5 },
    cooldownMs: 20_000,
    exp: 6,
  },
  bathe: {
    key: "bathe",
    effects: { cleanliness: +40, mood: -2, energy: -3 },
    cooldownMs: 45_000,
    exp: 8,
  },
  pet: {
    key: "pet",
    effects: { mood: +12, energy: -1 },
    cooldownMs: 6_000,
    exp: 3,
  },
  play: {
    key: "play",
    effects: { mood: +22, energy: -10, satiety: -5, cleanliness: -8 },
    cooldownMs: 30_000,
    exp: 12,
    requiresEnergy: 25,
  },
  tease: {
    key: "tease",
    effects: { mood: +7, energy: -4 },
    cooldownMs: 12_000,
    exp: 5,
    requiresEnergy: 10,
  },
  photo: {
    key: "photo",
    effects: { mood: +2 },
    cooldownMs: 10_000,
    exp: 4,
  },
  talk: {
    key: "talk",
    effects: { mood: +8 },
    cooldownMs: 15_000,
    exp: 5,
  },
  sleep: {
    key: "sleep",
    effects: {},
    cooldownMs: 5_000,
    exp: 2,
  },
};

/* ---------------- 触摸抚摸 ---------------- */

/**
 * 「抚摸」不是按钮，是手指在屏幕上滑过宠物。
 * 这是手机独有的亲密感 —— 鼠标做不出来，也是我们相对 Pou / 汤姆猫的差异点。
 *
 * 奖励刻意做得比「摸摸」按钮小（+12 心情）：抚摸的价值在于手感和陪伴感，
 * 不该变成刷数值的最优解，否则玩家会对着屏幕机械地划来划去。
 */
export const STROKE = {
  moodGain: 3,
  exp: 1,
  /** 累计滑动多少像素算一次有效抚摸 */
  distance: 110,
  /**
   * 两次抚摸奖励的最小间隔（ms）。
   *
   * 750ms 是算出来的，不是拍的：抚摸收益 1000/750 × 3 = 4.0 心情/秒，
   * 恰好是「摸摸」按钮（+12 / 6 秒 = 2.0 心情/秒）的 2 倍。
   * 上限压到 2 倍是为了让抚摸「更好玩」但不「更划算」——
   * 否则最优解会变成对着屏幕机械划动，而不是好好照顾宠物。
   * scripts/simulate.ts 第 7 节会盯着这个比值。
   */
  minIntervalMs: 750,
};

/** 判定为「点一下」而非「拖动」的阈值 */
export const TAP_MAX_MOVE_PX = 10;

/* ---------------- 性格塑形 ---------------- */

/**
 * 性格权重向量（每个动作一个权重，基准 1.0）。
 *
 * 这是整个游戏最重要的差异点：宠物不是「属性固定的道具」，
 * 它的性格会被玩家的养育习惯改写，并反过来影响它自己的行为。
 *
 *   你总喂食 → feed 权重上升 → 它更常主动讨食 → 你更常喂 → 权重继续上升
 *
 * 不需要一行 AI 代码，就能让玩家产生「它有自己的性格」的错觉。
 */
export const PERSONALITY = {
  /** 基准权重 —— 所有动作的起点 */
  baseline: 1,
  /** 权重的上下限。上限不宜太高，否则宠物会退化成只会做一件事的机器 */
  min: 0.35,
  max: 2.4,
  /**
   * 每次使用某动作，权重朝上限逼近的比例。
   * 0.05 意味着用 20 次大约能到 1.9 —— 需要持续偏好，不是喂一次就定型。
   */
  reinforceRate: 0.05,
  /** 每小时朝基准回归的比例。没有哪种性格是永久的，久不互动作就会淡掉。 */
  relaxPerHour: 0.12,
  /** 权重超过这个值才够格成为「性格标签」 */
  traitThreshold: 1.18,
} as const;

/* ---------------- 自主行为 ---------------- */

/**
 * 宠物多久自己找点事做。
 * 间隔刻意带随机，规律的行为比不动更假。
 */
export const AUTONOMY = {
  minGapMs: 9_000,
  maxGapMs: 21_000,
  /** 自主行为的冷却（ms）—— 连续触发同一个行为会显得抽搐 */
  sameBehaviorCooldownMs: 45_000,
} as const;

/* ---------------- 小游戏通用 ---------------- */

/**
 * 屏幕底部留给手指的比例。
 *
 * 玩家是用手指压着屏幕操作 Canvas 的，任何交互元素放进这个区域都会被
 * 手指盖住。这不是理论推导，是实机试出来的：接水果的篮子原本贴着底边，
 * 玩家根本看不见自己接到了什么。
 */
export const TOUCH_SAFE_BOTTOM_RATIO = 0.3;

/**
 * 旅行期间需求衰减的倍率。
 * 不能冻结（那样叙事上说不通），更不能全额衰减 ——
 * 出门三小时按正常速率会掉 80 多点饱食，回来直接饿死，
 * 玩家就再也不敢派它出门了。25% 是「在外面也好好吃饭」的量。
 */
export const TRAVEL_NEED_RATE = 0.25;

/**
 * 接水果里篮子的高度比例。
 * 放在 balance.ts 而不是组件文件里，是为了能被模拟器断言 ——
 * 一旦有人改小了它，测试会立刻报「篮子进入手指遮挡区」。
 */
export const BASKET_Y_RATIO = 1 - TOUCH_SAFE_BOTTOM_RATIO - 0.02;

/* ---------------- 家园与野生访客 ---------------- */

/**
 * 访客判定节奏。
 *
 * 定标目标：院子里什么都不摆时，大约 15–25 分钟来一位；
 * 摆对东西后缩短到 5–8 分钟。
 * 太频繁会失去「它来了！」的惊喜感，太稀疏则玩家会忘了这个系统的存在。
 */
export const VISIT = {
  /** 每隔多久做一次「有没有访客来」的判定 */
  rollIntervalMs: 3 * 60_000,
  /** 判定通过的基础概率（院子里空无一物时） */
  baseChance: 0.22,
  /** 摆出它喜欢的东西时，概率提升到 baseChance + bonusChance 封顶 */
  bonusChance: 0.34,
  /** 同一只访客两次到访之间的最小间隔，避免总是同一只 */
  sameVisitorCooldownMs: 20 * 60_000,
} as const;

/** 院子里可摆放的格子数 */
export const HABITAT_SLOTS = 3;

/** 访客停留时长范围（ms） */
export const VISITOR_STAY_MS = {
  min: 6 * 60_000,
  max: 18 * 60_000,
} as const;

/* ---------------- 照护质量（决定进化路线） ---------------- */

/**
 * 照护质量 EMA 的时间常数（ms）：4 小时。
 * 越小越「健忘」—— 玩家最近一天的表现权重越高。
 * 4 小时是个折中：既能反映最近的照护，又不会因为一次忘了喂就被判死刑。
 */
export const CARE_SCORE_TAU_MS = 4 * 3_600_000;

/** 新宠物的初始照护分 —— 取中性值，不预设玩家养得好还是差 */
export const CARE_SCORE_INITIAL = 0.6;

/* ---------------- 成长 ---------------- */

/**
 * 蛋孵化的时长（ms）。
 * 刻意做得短：它是一个「开场仪式」，不是玩法。
 * 玩家的第一次体验应该是「看着它破壳」，而不是「等一个计时器」。
 */
export const HATCH_MS = 40_000;

/**
 * 进入各阶段所需的累计经验。
 *
 * ⚠️ egg / baby 都是 0：破壳即为幼体，这两个阶段不靠经验推进
 *    （蛋由 HATCH_MS 控制，破壳即进入 baby）。
 *    真正起作用的阈值只有 child / adult / elder 三个。
 *    早期版本把 baby 写成 120，结果那个数字压根不参与判定，
 *    真正该触发进化锁定的阈值对不上 —— 模拟器第 8 节抓到了这个 bug。
 */
export const STAGE_EXP: Record<Stage, number> = {
  egg: 0,
  baby: 0,
  child: 340,
  adult: 1_080,
  elder: 2_480,
};

/** 每点经验折算的金币 */
export const COIN_PER_EXP = 0.6;
