/* ============================================================
   宠物构造与成长
   ============================================================ */

import { CARE_SCORE_INITIAL, COIN_PER_EXP, STAGE_EXP } from "./balance";
import { evolutionFor, pathForCareScore } from "./evolution";
import { createHabitat } from "./habitat";
import { createTravel } from "./travel";
import { makeId } from "./rng";
import {
  ACTION_KEYS,
  STAGES,
  type Pet,
  type Personality,
  type SimState,
  type Species,
  type Stage,
} from "./types";

/**
 * 昵称长度上限。
 * 12 个字符足够起「小布丁」「Mochi」这类名字，又不会长到把顶部栏撑爆。
 * 中英文按字符数统一计算 —— 中文 12 字在界面上已经相当长了。
 */
export const PET_NAME_MAX = 12;

/**
 * 孵化进度对应到第几道裂纹（0 = 还没裂，1..3 = 第几道，4 = 即将破壳）。
 *
 * 放在 core 里而不是各自实现，是因为渲染（画裂纹）和音效（听到碎裂声）
 * 必须用同一套阈值 —— 两处各写一份的话，迟早会出现
 * 「听到响声但看不到新裂纹」这种对不上的情况。
 */
export function crackStageOf(progress: number): number {
  if (progress >= 0.99) return 4;
  if (progress >= 0.72) return 3;
  if (progress >= 0.46) return 2;
  if (progress >= 0.22) return 1;
  return 0;
}

/** 蛋壳上总共画几道裂纹 */
export const EGG_CRACK_COUNT = 3;

/** 清洗玩家输入的昵称：去首尾空白、压掉换行、截断到上限 */
export function sanitizePetName(raw: string): string {
  return raw
    .replace(/[\r\n\t]/g, " ")
    .trim()
    .slice(0, PET_NAME_MAX);
}

/** 出生时的初始需求值 —— 留一点缺口，引导玩家立刻去互动 */
export const INITIAL_NEEDS = {
  satiety: 78,
  cleanliness: 85,
  mood: 80,
  energy: 92,
} as const;

/**
 * 初始性格权重。
 * 每种族天生偏好不同，让开局就有差异；后续会被玩家的养育习惯改写（M4）。
 */
export function defaultPersonality(species: Species): Personality {
  const base = Object.fromEntries(ACTION_KEYS.map((k) => [k, 1])) as Personality;

  switch (species) {
    case "puddly": // 布丁兽：贪玩、爱吃
      base.play += 0.25;
      base.feed += 0.2;
      break;
    case "mochi": // 麻薯猫：粘人，喜欢被摸
      base.pet += 0.3;
      base.talk += 0.15;
      break;
    case "cloudpuff": // 云朵羊：爱睡、温和
      base.sleep += 0.3;
      base.pet += 0.1;
      break;
    case "sprout": // 芽芽龙：好奇，爱说话
      base.talk += 0.25;
      base.tease += 0.2;
      break;
  }
  return base;
}

export function createPet(species: Species, name = ""): Pet {
  return {
    id: makeId("pet"),
    species,
    name,
    stage: "egg",
    bornAt: Date.now(),
    exp: 0,
    needs: { ...INITIAL_NEEDS },
    sleeping: false,
    careScore: CARE_SCORE_INITIAL,
    evolution: null,
    hatchProgress: 0,
    personality: defaultPersonality(species),
    accessories: {},
  };
}

export function createState(species: Species, now = Date.now()): SimState {
  return {
    pet: createPet(species),
    clock: { lastTickAt: now, totalPlayedMs: 0 },
    economy: {
      // 给一点启动资金：让玩家第一件事就能去商店看一眼，而不是攒半天
      coins: 50,
      items: {},
      gameCoinsToday: 0,
      gameCoinDay: "",
    },
    habitat: createHabitat(),
    collection: { accessories: [], placements: [], visitors: [] },
    travel: createTravel(),
    lastTrip: null,
  };
}

/**
 * 由累计经验推导阶段。
 *
 * ⚠️ 永远不会返回 "egg" —— 蛋阶段只由 clock.ts 里的孵化进度控制。
 * 如果让 exp=0 映射回 "egg"，刚孵化的宠物会在下一次加经验时被打回蛋里。
 * 这个坑有模拟器兜着（见 scripts/simulate.ts 第 8 节）。
 */
export function stageForExp(exp: number): Stage {
  if (exp >= STAGE_EXP.elder) return "elder";
  if (exp >= STAGE_EXP.adult) return "adult";
  if (exp >= STAGE_EXP.child) return "child";
  return "baby";
}

/** 加经验 —— 顺带把经验折算成金币，并在跨过锁定阶段时结算进化路线 */
export function gainExp(state: SimState, amount: number): SimState {
  if (amount <= 0) return state;

  const { pet } = state;
  const exp = pet.exp + amount;
  const stage = stageForExp(exp);

  // 首次跨出幼体时锁定进化线。此后不再改变 —— 这是「我的养法塑造了它」
  // 这个承诺的可信度来源：结论一旦给出就不能反复横跳。
  let evolution = pet.evolution;
  if (!evolution && stage !== "baby" && stage !== "egg") {
    evolution = evolutionFor(pet.species, pathForCareScore(pet.careScore)).id;
  }

  return {
    ...state,
    pet: { ...pet, exp, stage, evolution },
    // 必须展开原 economy：直接写 { coins } 会把背包和每日额度一起抹掉
    economy: { ...state.economy, coins: state.economy.coins + amount * COIN_PER_EXP },
  };
}

/** 真实年龄（ms）—— 展示「陪伴了多久」 */
export function ageMs(pet: Pet, now = Date.now()): number {
  return Math.max(0, now - pet.bornAt);
}

/** 阶段在成长序列中的序号，用于比较「长大了没有」 */
export function stageRank(stage: Stage): number {
  return STAGES.indexOf(stage);
}
