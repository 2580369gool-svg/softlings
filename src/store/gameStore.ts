/* ============================================================
   游戏状态桥 —— 把纯 TS 模拟层投影给 React
   模拟层不认识 React，这一层负责调度 tick、处理冷却、触发存档。
   ============================================================ */

import { create } from "zustand";

import { duckMusic, playSfx, type SfxName } from "../audio";
import { ACTIONS, STROKE, TICK_MS } from "../core/balance";
import type { BehaviorDef } from "../core/behavior";
import { advanceTo, wakeIfRested } from "../core/clock";
import {
  applyDailyCap,
  coinsForScore,
  inventoryCount,
  ITEMS,
  todayKey,
  type ItemId,
} from "../core/items";
import { applyActionEffects, clampNeed } from "../core/needs";
import { createState, gainExp } from "../core/pet";
import { reinforcePersonality } from "../core/personality";
import { clearSave, loadSave, persist } from "../core/save";
import { PLACEMENTS, type PlacementId } from "../core/habitat";
import { BENTOS, departBlockers, type BentoId } from "../core/travel";
import { ACCESSORIES, toggleEquip, type AccessoryId } from "../core/wardrobe";
import { GAMES, SPECIES_BONUS, type GameId } from "../minigames/types";
import {
  NEED_KEYS,
  type ActionKey,
  type BehaviorId,
  type OfflineReport,
  type Pet,
  type SimState,
  type Species,
} from "../core/types";

/** 里程碑事件：破壳 / 进化。用于触发一次性演出，看完即走。 */
export interface Milestone {
  kind: "hatch" | "evolve";
  /** evolve 时的进化线 id */
  line?: string;
  at: number;
}

/** 正在播放的自主行为 */
export interface ActiveBehavior {
  id: BehaviorId;
  /** 播完的时刻（ms） */
  until: number;
  /** 每次触发都变，用作 React key 来重启 CSS 动画 */
  key: number;
}

/** 顶层界面 */
export type Screen =
  | "main"
  | "arcade"
  | "shop"
  | "wardrobe"
  | "habitat"
  | "travel"
  | "game";

/** 一局小游戏的结算结果，用于结算界面 */
export interface GameResult {
  gameId: GameId;
  score: number;
  /** 实际到手的金币（已含天赋加成与日上限裁切） */
  coins: number;
  /** 是否吃到本命种族加成 */
  bonus: boolean;
  /** 是否被每日上限裁切过 */
  capped: boolean;
}

/**
 * 比较前后状态，看有没有跨过值得庆祝的节点。
 * 放在 store 层而不是 core 层：core 只负责算，不负责「什么时候该弹窗」。
 */
function detectMilestone(before: Pet, after: Pet): Milestone | null {
  if (before.stage === "egg" && after.stage !== "egg") {
    return { kind: "hatch", at: Date.now() };
  }
  if (!before.evolution && after.evolution) {
    return { kind: "evolve", line: after.evolution, at: Date.now() };
  }
  return null;
}

/** 每个互动动作对应一个音色，让玩家闭着眼睛也能分辨点了哪个按钮 */
const ACTION_SFX: Record<ActionKey, SfxName> = {
  feed: "feed",
  bathe: "bathe",
  pet: "pet",
  play: "play",
  tease: "tease",
  photo: "photo",
  talk: "talk",
  sleep: "sleep",
};

/** 里程碑演出：放对应音效，并把音乐压低给它让路 */
function celebrate(milestone: Milestone): void {
  playSfx(milestone.kind === "hatch" ? "hatch" : "evolve");
  duckMusic(1.6, 0.25);
}

/** 逗弄有概率翻车：宠物闹脾气，心情不升反降 —— 让互动不是无脑收益 */
const TEASE_BACKFIRE_CHANCE = 0.25;
const TEASE_BACKFIRE_PENALTY = 10;

/** 只有离线超过这个时长才弹「欢迎回来」，避免切个后台就弹窗 */
const OFFLINE_MODAL_MIN_MS = 5 * 60_000;

/**
 * 气泡存活时长。
 * 由 store 定时清空，而不是让组件自己轮询时间 —— 后者会让整个组件树
 * 每秒重渲染数次，低端安卓机会掉帧。
 */
export const FEEDBACK_TTL_MS = 2_400;

export interface Feedback {
  action: ActionKey;
  ok: boolean;
  backfire: boolean;
  at: number;
}

interface GameStore {
  sim: SimState | null;
  offlineReport: OfflineReport | null;
  /** 每个动作的可再次使用时间戳（ms） */
  cooldowns: Partial<Record<ActionKey, number>>;
  feedback: Feedback | null;
  /** 待播放的里程碑演出（破壳 / 进化） */
  milestone: Milestone | null;
  /** 当前正在播放的自主行为 */
  behavior: ActiveBehavior | null;

  screen: Screen;
  activeGame: GameId | null;
  lastGameResult: GameResult | null;

  /** 启动时调用：读档 + 离线补算；没有存档则停留在 null，由 UI 引导选种族 */
  init: () => void;
  /** 推进到 now，并落盘 */
  tick: (now?: number) => void;
  perform: (action: ActionKey) => void;
  /** 手指滑过宠物 —— 小额心情奖励，无冷却（节流由触摸层负责） */
  stroke: () => void;
  dismissOffline: () => void;
  dismissMilestone: () => void;
  /** 播放一个自主行为（由 useAutonomy 调度），传 null 表示清空 */
  setBehavior: (def: BehaviorDef | null) => void;
  /** 上一个自主行为 id —— 调度器用它避免连续重复 */
  lastBehaviorId: BehaviorId | null;

  openScreen: (screen: Screen) => void;
  startGame: (id: GameId) => void;
  /** 结束一局，结算金币并跳到结算界面 */
  finishGame: (score: number) => void;
  dismissGameResult: () => void;
  /** 买一个道具，金币不够返回 false */
  buyItem: (id: ItemId) => boolean;
  /** 使用一个道具，没有存货返回 false */
  useItem: (id: ItemId) => boolean;
  /** 买一件饰品，金币不够返回 false */
  buyAccessory: (id: AccessoryId) => boolean;
  /** 穿上 / 脱下（重复点同一件即脱下） */
  equipAccessory: (id: AccessoryId) => void;
  /** 买一个摆件放进院子，金币不够返回 false */
  buyPlacement: (id: PlacementId) => boolean;
  /** 设置某个院子格子的内容，传 null 清空 */
  setSlot: (index: number, id: PlacementId | null) => void;
  /** 给当前访客拍照。首次收录会额外给奖励。 */
  photographVisitor: () => boolean;
  /** 派宠物出门旅行。状态太差、金币不够、或已在路上时返回 false。 */
  startTrip: (bento: BentoId) => boolean;
  /** 关掉归来结算弹窗 */
  dismissTrip: () => void;
  /** 开新档 */
  newGame: (species: Species) => void;
  /** 彻底删档（调试 / 重开用） */
  hardReset: () => void;
}

export const useGameStore = create<GameStore>((set, get) => ({
  sim: null,
  offlineReport: null,
  cooldowns: {},
  feedback: null,
  milestone: null,
  behavior: null,
  lastBehaviorId: null,
  screen: "main",
  activeGame: null,
  lastGameResult: null,

  init: () => {
    const saved = loadSave();
    const now = Date.now();

    if (!saved) {
      // 没有存档 → 交给 UI 选种族，不擅自替玩家决定
      set({ sim: null, offlineReport: null, cooldowns: {}, feedback: null });
      return;
    }

    const { state, report } = advanceTo(saved, now);
    const next = wakeIfRested(state);

    set({
      sim: next,
      offlineReport: report && report.elapsedMs >= OFFLINE_MODAL_MIN_MS ? report : null,
      cooldowns: {},
      feedback: null,
    });
    persist(next);
  },

  tick: (now = Date.now()) => {
    const sim = get().sim;
    if (!sim) return;

    const { state, report } = advanceTo(sim, now);
    const next = wakeIfRested(state);
    // 破壳就发生在 tick 里（孵化进度走时钟），所以这里必须检测
    const milestone = detectMilestone(sim.pet, next.pet);
    if (milestone) celebrate(milestone);

    // 院子里刚来了新访客 —— 这件事发生在离线推进里，玩家很可能不在看，
    // 所以声音只是锦上添花，真正的呈现靠家园界面的到场动画
    if (!sim.habitat.visitor && next.habitat.visitor) {
      playSfx("visitor");
    }

    set((prev) => ({
      sim: next,
      offlineReport:
        report && report.elapsedMs >= OFFLINE_MODAL_MIN_MS
          ? report
          : prev.offlineReport,
      milestone: milestone ?? prev.milestone,
    }));
    persist(next);
  },

  perform: (action) => {
    const { sim, cooldowns } = get();
    if (!sim) return;

    const now = Date.now();
    const def = ACTIONS[action];
    const pet = sim.pet;

    /** 被拒绝时也给一次短反馈，让玩家知道「点了但没成」而不是没响应 */
    const refuse = () => {
      playSfx("deny");
      set({ feedback: { action, ok: false, backfire: false, at: now } });
      window.setTimeout(() => {
        if (useGameStore.getState().feedback?.at === now) set({ feedback: null });
      }, FEEDBACK_TTL_MS);
    };

    // 睡眠中只能做「哄睡」（此时是唤醒）
    if (pet.sleeping && action !== "sleep") return refuse();

    const readyAt = cooldowns[action] ?? 0;
    if (now < readyAt) return refuse();

    if (def.requiresEnergy !== undefined && pet.needs.energy < def.requiresEnergy) {
      return refuse();
    }

    let next: SimState;
    let backfire = false;

    if (action === "sleep") {
      next = { ...sim, pet: { ...pet, sleeping: !pet.sleeping } };
    } else {
      let needs = applyActionEffects(pet.needs, action);
      if (action === "tease" && Math.random() < TEASE_BACKFIRE_CHANCE) {
        backfire = true;
        needs = { ...needs, mood: clampNeed(needs.mood - TEASE_BACKFIRE_PENALTY) };
      }
      next = { ...sim, pet: { ...pet, needs } };
    }

    const beforePet = next.pet;
    playSfx(ACTION_SFX[action]);
    next = gainExp(next, def.exp);
    // 性格朝刚被使用的动作漂移 —— 「养育习惯塑造性格」的入口就在这里。
    // 注意只强化不惩罚：别的权重会因 relaxPersonality 随时间自然回归，
    // 不需要在玩家照顾别的需求时去扣分。
    next = {
      ...next,
      pet: {
        ...next.pet,
        personality: reinforcePersonality(next.pet.personality, action),
      },
    };
    const milestone = detectMilestone(beforePet, next.pet);
    if (milestone) celebrate(milestone);

    set((prev) => ({
      sim: next,
      cooldowns: { ...cooldowns, [action]: now + def.cooldownMs },
      feedback: { action, ok: true, backfire, at: now },
      milestone: milestone ?? prev.milestone,
      // 玩家一动手，正在演的小动作就打断 —— 否则会和互动反馈打架
      behavior: null,
    }));

    // 到点自动清空气泡。比对 at 是为了防止「旧计时器把新气泡清掉」。
    window.setTimeout(() => {
      if (useGameStore.getState().feedback?.at === now) {
        set({ feedback: null });
      }
    }, FEEDBACK_TTL_MS);

    persist(next);
  },

  stroke: () => {
    const { sim } = get();
    // 睡着了就不打扰它；也不弹气泡，抚摸的反馈走粒子和动画，不要刷屏文字
    if (!sim || sim.pet.sleeping) return;

    const needs = {
      ...sim.pet.needs,
      mood: clampNeed(sim.pet.needs.mood + STROKE.moodGain),
    };
    const next = gainExp({ ...sim, pet: { ...sim.pet, needs } }, STROKE.exp);
    const milestone = detectMilestone(sim.pet, next.pet);
    if (milestone) celebrate(milestone);

    playSfx("stroke");

    // 刻意不在这里落盘：抚摸可能每 750ms 触发一次，
    // 频繁写 localStorage 会让低端安卓机掉帧。5 秒一次的 tick 会兜住。
    set((prev) => ({ sim: next, milestone: milestone ?? prev.milestone }));
  },

  dismissOffline: () => set({ offlineReport: null }),
  dismissMilestone: () => set({ milestone: null }),

  startTrip: (bento) => {
    const { sim } = get();
    if (!sim) return false;
    if (sim.travel.active) return false;
    if (sim.pet.stage === "egg") return false;

    // 状态太差就不该放它出去 —— 这条门槛让「照顾宠物」和「送它旅行」
    // 产生因果关系，而不是两个互不相干的按钮
    if (departBlockers(sim.pet).length > 0) {
      playSfx("deny");
      return false;
    }

    const def = BENTOS[bento];
    if (sim.economy.coins < def.price) {
      playSfx("deny");
      return false;
    }

    const now = Date.now();
    const next: SimState = {
      ...sim,
      economy: { ...sim.economy, coins: sim.economy.coins - def.price },
      travel: {
        ...sim.travel,
        active: {
          bento,
          remainingMs: def.durationMs,
          totalMs: def.durationMs,
          // 种子混入出行次数，保证同一只宠物每次出行的结果都不同，
          // 但同一份存档重放时又是可复现的
          seed: (now ^ (sim.travel.tripCount * 2654435761)) >>> 0,
        },
      },
    };

    playSfx("buy");
    // 出发时清掉正在演的小动作和气泡，避免画面残留 ——
    // 这两个是 store 字段而不是 SimState 字段
    set({ sim: next, behavior: null, feedback: null });
    persist(next);
    return true;
  },

  dismissTrip: () => {
    const { sim } = get();
    if (!sim) return;
    const next: SimState = { ...sim, lastTrip: null };
    set({ sim: next });
    persist(next);
  },

  buyAccessory: (id) => {
    const { sim } = get();
    if (!sim) return false;
    const def = ACCESSORIES[id];
    if (sim.collection.accessories.includes(id)) return false;
    if (sim.economy.coins < def.price) {
      playSfx("deny");
      return false;
    }
    playSfx("buy");

    const next: SimState = {
      ...sim,
      economy: { ...sim.economy, coins: sim.economy.coins - def.price },
      collection: {
        ...sim.collection,
        accessories: [...sim.collection.accessories, id],
      },
    };
    set({ sim: next });
    persist(next);
    return true;
  },

  equipAccessory: (id) => {
    const { sim } = get();
    if (!sim) return;
    // 没买的不能穿 —— 这是商店收入的主要来源，不能在 UI 层被绕过
    if (!sim.collection.accessories.includes(id)) return;

    const next: SimState = {
      ...sim,
      pet: { ...sim.pet, accessories: toggleEquip(sim.pet.accessories, id) },
    };
    set({ sim: next });
    persist(next);
  },

  buyPlacement: (id) => {
    const { sim } = get();
    if (!sim) return false;
    const def = PLACEMENTS[id];
    if (sim.collection.placements.includes(id)) return false;
    if (sim.economy.coins < def.price) {
      playSfx("deny");
      return false;
    }
    playSfx("buy");

    const next: SimState = {
      ...sim,
      economy: { ...sim.economy, coins: sim.economy.coins - def.price },
      collection: {
        ...sim.collection,
        placements: [...sim.collection.placements, id],
      },
    };
    set({ sim: next });
    persist(next);
    return true;
  },

  setSlot: (index, id) => {
    const { sim } = get();
    if (!sim) return;
    if (index < 0 || index >= sim.habitat.placed.length) return;
    // 只有买过的摆件才能放上去
    if (id !== null && !sim.collection.placements.includes(id)) return;

    const placed = [...sim.habitat.placed];
    placed[index] = id;

    const next: SimState = { ...sim, habitat: { ...sim.habitat, placed } };
    set({ sim: next });
    persist(next);
  },

  photographVisitor: () => {
    const { sim } = get();
    const stay = sim?.habitat.visitor;
    if (!sim || !stay || stay.photographed) return false;

    const firstTime = !sim.collection.visitors.includes(stay.id);

    let next: SimState = {
      ...sim,
      habitat: { ...sim.habitat, visitor: { ...stay, photographed: true } },
      collection: firstTime
        ? { ...sim.collection, visitors: [...sim.collection.visitors, stay.id] }
        : sim.collection,
    };

    // 首次收录给一笔奖励，让「收集」这件事有实在的回馈
    if (firstTime) {
      next = gainExp(
        { ...next, economy: { ...next.economy, coins: next.economy.coins + 25 } },
        12,
      );
    }

    playSfx("photo");
    if (firstTime) {
      duckMusic(0.9, 0.4);
      window.setTimeout(() => playSfx("match"), 260);
    }
    set({ sim: next, feedback: { action: "photo", ok: true, backfire: false, at: Date.now() } });
    window.setTimeout(() => {
      if (useGameStore.getState().feedback) set({ feedback: null });
    }, FEEDBACK_TTL_MS);
    persist(next);
    return true;
  },

  openScreen: (screen) => set({ screen, activeGame: null, lastGameResult: null }),

  startGame: (id) => set({ screen: "game", activeGame: id, lastGameResult: null }),

  finishGame: (score) => {
    const { sim, activeGame } = get();
    if (!sim || !activeGame) return;

    const def = GAMES[activeGame];
    const bonus = def.favoredBy === sim.pet.species;

    let coins = coinsForScore(score);
    if (bonus) coins = Math.round(coins * SPECIES_BONUS);

    // 每日上限：先看是不是同一天，跨天则计数归零。
    // 没有这条限制，玩家会发现刷小游戏比照顾宠物划算得多，整条主循环就废了。
    const today = todayKey();
    const e = sim.economy;
    const earnedToday = e.gameCoinDay === today ? e.gameCoinsToday : 0;
    const { awarded, capped } = applyDailyCap(earnedToday, coins);

    const next: SimState = {
      ...sim,
      economy: {
        ...e,
        coins: e.coins + awarded,
        gameCoinsToday: earnedToday + awarded,
        gameCoinDay: today,
      },
    };

    playSfx("gameOver");
    duckMusic(1.2, 0.35);

    set({
      sim: next,
      lastGameResult: { gameId: activeGame, score, coins: awarded, bonus, capped },
    });
    persist(next);
  },

  dismissGameResult: () =>
    set({ lastGameResult: null, activeGame: null, screen: "arcade" }),

  buyItem: (id) => {
    const { sim } = get();
    if (!sim) return false;

    const def = ITEMS[id];
    if (sim.economy.coins < def.price) {
      playSfx("deny");
      return false;
    }
    playSfx("buy");

    const next: SimState = {
      ...sim,
      economy: {
        ...sim.economy,
        coins: sim.economy.coins - def.price,
        items: {
          ...sim.economy.items,
          [id]: inventoryCount(sim.economy.items, id) + 1,
        },
      },
    };
    set({ sim: next });
    persist(next);
    return true;
  },

  useItem: (id) => {
    const { sim } = get();
    if (!sim) return false;

    const count = inventoryCount(sim.economy.items, id);
    if (count <= 0) return false;

    const def = ITEMS[id];
    const needs = { ...sim.pet.needs };
    for (const key of NEED_KEYS) {
      const delta = def.effects[key];
      if (delta === undefined) continue;
      needs[key] = clampNeed(needs[key] + delta);
    }

    // 用道具同样会强化性格 —— 一直喂甜点的玩家会养出更爱吃甜的宠物
    let next: SimState = {
      ...sim,
      pet: {
        ...sim.pet,
        needs,
        personality: reinforcePersonality(sim.pet.personality, def.relatedAction),
      },
      economy: {
        ...sim.economy,
        items: { ...sim.economy.items, [id]: count - 1 },
      },
    };
    next = gainExp(next, def.exp);

    // 复用玩家反馈气泡：道具的效果和对应动作是同一类，文案也说得通
    const now = Date.now();
    playSfx(ACTION_SFX[def.relatedAction]);
    set({
      sim: next,
      feedback: { action: def.relatedAction, ok: true, backfire: false, at: now },
      behavior: null,
    });
    window.setTimeout(() => {
      if (useGameStore.getState().feedback?.at === now) set({ feedback: null });
    }, FEEDBACK_TTL_MS);
    persist(next);
    return true;
  },

  setBehavior: (def) => {
    const { sim } = get();
    if (!sim) return;

    if (!def) {
      set({ behavior: null });
      return;
    }

    const now = Date.now();
    let next = sim;

    // 自主行为只能带来极小的自我照顾，主力仍然是玩家
    if (def.effects) {
      const needs = { ...sim.pet.needs };
      for (const key of NEED_KEYS) {
        const delta = def.effects[key];
        if (delta === undefined) continue;
        needs[key] = clampNeed(needs[key] + delta);
      }
      next = { ...sim, pet: { ...sim.pet, needs } };
    }

    set({
      sim: next,
      behavior: { id: def.id, until: now + def.durationMs, key: now },
      lastBehaviorId: def.id,
    });

    // 演完自动收场，同样比对 key 防止旧计时器打断新行为
    window.setTimeout(() => {
      if (useGameStore.getState().behavior?.key === now) {
        set({ behavior: null });
      }
    }, def.durationMs);
  },

  newGame: (species) => {
    const state = createState(species, Date.now());
    set({
      sim: state,
      offlineReport: null,
      cooldowns: {},
      feedback: null,
      milestone: null,
      screen: "main",
      activeGame: null,
      lastGameResult: null,
    });
    persist(state);
  },

  hardReset: () => {
    clearSave();
    set({
      sim: null,
      offlineReport: null,
      cooldowns: {},
      feedback: null,
      milestone: null,
      screen: "main",
      activeGame: null,
      lastGameResult: null,
    });
  },
}));

export { TICK_MS };
