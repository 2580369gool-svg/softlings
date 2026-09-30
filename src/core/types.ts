/* ============================================================
   核心类型定义
   这一层不认识 DOM、不认识 React，纯数据 + 纯函数。
   好处：① 可用 Node 跑脚本批量模拟调平衡；② 在线 tick 与离线补算
   共用同一段代码，不会出现两套逻辑对不上的经典 bug。
   ============================================================ */

import type { Habitat, PlacementId, VisitorId } from "./habitat";
import type { Inventory } from "./items";
import type { Travel, TripReward } from "./travel";
import type { AccessoryId, Equipped } from "./wardrobe";

/** 四条需求 */
export type NeedKey = "satiety" | "cleanliness" | "mood" | "energy";

export const NEED_KEYS = [
  "satiety",
  "cleanliness",
  "mood",
  "energy",
] as const satisfies readonly NeedKey[];

/** 需求值域 [0, 100] */
export type Needs = Record<NeedKey, number>;

/** 八个互动动作 */
export type ActionKey =
  | "feed"
  | "bathe"
  | "pet"
  | "play"
  | "tease"
  | "photo"
  | "talk"
  | "sleep";

export const ACTION_KEYS = [
  "feed",
  "bathe",
  "pet",
  "play",
  "tease",
  "photo",
  "talk",
  "sleep",
] as const satisfies readonly ActionKey[];

/** 初始种族 */
export type Species = "puddly" | "mochi" | "cloudpuff" | "sprout" | "whispy" | "twinkle";

export const SPECIES = [
  "puddly",
  "mochi",
  "cloudpuff",
  "sprout",
  "whispy",
  "twinkle",
] as const satisfies readonly Species[];

/** 成长阶段 */
export type Stage = "egg" | "baby" | "child" | "adult" | "elder";

export const STAGES = [
  "egg",
  "baby",
  "child",
  "adult",
  "elder",
] as const satisfies readonly Stage[];

/**
 * 自主行为 id。
 * 放在 types.ts 而不是 behavior.ts，是因为存档与 store 都要引用它，
 * 而 behavior.ts 会反向依赖 types.ts，避免形成环。
 */
export type BehaviorId =
  | "idle"
  | "lookAround"
  | "hop"
  | "stretch"
  | "spin"
  | "stare"
  | "groom"
  | "yawn"
  | "doze"
  | "begFood"
  | "begPlay"
  | "begPet"
  | "whimper";

/** UI 展示用的派生状态（决定表情与文案） */
export type PetStatus =
  | "happy"
  | "normal"
  | "hungry"
  | "dirty"
  | "sad"
  | "tired"
  | "sleeping";

/** 性格权重向量 —— M4 效用 AI 会消费它，养育习惯会改写它 */
export type Personality = Record<ActionKey, number>;

export interface Pet {
  id: string;
  species: Species;
  name: string;
  stage: Stage;
  /** 出生时间戳（ms），决定真实年龄 */
  bornAt: number;
  /** 经验值，驱动阶段推进 */
  exp: number;
  needs: Needs;
  /** 是否处于睡眠状态：精力回复，其余需求衰减减半 */
  sleeping: boolean;
  /**
   * 照护质量（0..1）的指数移动平均，不是累计值。
   * 用平均值才能让「养了 2 天」和「养了 20 天」用同一把尺子衡量。
   * 决定进化路线，在 baby → child 时结算一次。
   */
  careScore: number;
  /** 已锁定的进化线；baby 及之前为 null，用种族默认配色 */
  evolution: string | null;
  /** 孵化进度 0..1，仅 egg 阶段有意义 */
  hatchProgress: number;
  personality: Personality;
  /** 已穿戴的饰品：槽位 → 饰品 id */
  accessories: Equipped;
}

/** 收集进度：饰品购买记录、摆件购买记录、访客拍照图鉴 */
export interface Collection {
  accessories: AccessoryId[];
  placements: PlacementId[];
  visitors: VisitorId[];
}

export interface Clock {
  /** 上次结算时刻（ms）—— 存档里唯一需要持久化的时间字段 */
  lastTickAt: number;
  /** 累计陪伴时长（ms） */
  totalPlayedMs: number;
}

export interface Economy {
  coins: number;
  /** 背包：道具 id → 数量 */
  items: Inventory;
  /** 今天已通过小游戏赚到的金币，用于每日上限 */
  gameCoinsToday: number;
  /** 上面那个数字属于哪一天，跨天时归零 */
  gameCoinDay: string;
}

/** 完整模拟状态 —— 这就是存档的全部内容 */
export interface SimState {
  pet: Pet;
  clock: Clock;
  economy: Economy;
  /** 院子与野生访客 */
  habitat: Habitat;
  /** 收集进度 */
  collection: Collection;
  /** 旅行与明信片 */
  travel: Travel;
  /**
   * 上一次旅行的结算结果，供 UI 弹窗展示。
   * 属于瞬态数据：读档时一律置空，避免同一笔奖励被弹两次。
   */
  lastTrip: TripReward | null;
}

/** 动作结算结果，供 UI 做反馈（气泡 / 动画 / 音效） */
export interface ActionResult {
  ok: boolean;
  action: ActionKey;
  /** 不 ok 时的原因：'cooldown' | 'sleeping' | 'exhausted' */
  reason?: "cooldown" | "sleeping" | "exhausted";
  remainingMs?: number;
}

/** 离线结算报告，用于「欢迎回来」弹窗 */
export interface OfflineReport {
  elapsedMs: number;
  /** 实际参与结算的等效时长（超上限部分已折算） */
  effectiveMs: number;
  capped: boolean;
  before: Needs;
  after: Needs;
}
