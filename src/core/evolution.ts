/* ============================================================
   进化系统
   4 个种族 × 3 条进化线 = 12 种终态。

   设计要点：
   ① 三条线**没有优劣之分**，只是「你的照护方式把它塑造成了不同的样子」。
      刻意避开 good / normal / poor 这种带评判的命名，改用
      refined(精致) / balanced(自然) / feral(野性) —— 疏于照护也会长成
      很酷的形态，而不是「你养坏了」。这与「无死亡、无惩罚」的整体调性一致。

   ② 不手绘 40 个独立造型，而是**组合**出来的：
      身体基础形状(按种族) × 配色(按线) × 装饰部件(按线) × 体型(按阶段)。
      加一条新进化线只要在这个文件里加一条定义，不用碰渲染代码。
   ============================================================ */

import type { Species } from "./types";

/** 照护风格 —— 三种结局，不是三档评分 */
export type EvolutionPath = "refined" | "balanced" | "feral";

/** 装饰部件 id —— 具体长相见 render/parts.tsx */
export type PartId =
  // 画在身体后方：翅膀 / 尾巴 / 光环
  | "wingSmall"
  | "wingButterfly"
  | "wingBat"
  | "halo"
  | "tailPuff"
  | "tailFlame"
  | "rainbowArc"
  // 画在身体前方：头顶装饰 / 花纹
  | "caramelDrip"
  | "strawberry"
  | "crescentMoon"
  | "blossomCrown"
  | "crystalHorn"
  | "flameTuft"
  | "stormCloud"
  | "rainbowTuft"
  | "tigerStripes"
  | "magmaCracks"
  | "starMark"
  | "jellySparkle";

export type EvolutionLineId =
  | "puddly_caramel"
  | "puddly_jelly"
  | "puddly_magma"
  | "mochi_daifuku"
  | "mochi_tsukimi"
  | "mochi_tiger"
  | "cloudpuff_rainbow"
  | "cloudpuff_drizzle"
  | "cloudpuff_storm"
  | "sprout_blossom"
  | "sprout_crystal"
  | "sprout_ember"
  | "whispy_moonshine"
  | "whispy_lampling"
  | "whispy_shade"
  | "twinkle_comet"
  | "twinkle_crystal"
  | "twinkle_meteor";

export interface EvolutionPalette {
  /** 主体色 */
  color: string;
  /** 暗部（投影、下缘） */
  shade: string;
  /** 腮红 */
  blush: string;
  /** 装饰部件的点缀色 */
  accent: string;
}

export interface EvolutionDef {
  id: EvolutionLineId;
  species: Species;
  path: EvolutionPath;
  palette: EvolutionPalette;
  /** 体型微调 —— 让不同线不只是「换色」，轮廓也能看出差别 */
  scale: number;
  /** 身体透明度，用来表现果冻/云朵的半透明质感 */
  bodyOpacity?: number;
  behind: PartId[];
  front: PartId[];
}

/**
 * 照护质量分档。
 * careScore 是「照护质量」的指数移动平均（0..1），不是累计值 ——
 * 用平均值才能让「养了 2 天」和「养了 20 天」的评判标准一致。
 */
export const EVOLUTION_THRESHOLDS = {
  refined: 0.7,
  balanced: 0.42,
} as const;

/** 根据照护分选出进化路线 */
export function pathForCareScore(score: number): EvolutionPath {
  if (score >= EVOLUTION_THRESHOLDS.refined) return "refined";
  if (score >= EVOLUTION_THRESHOLDS.balanced) return "balanced";
  return "feral";
}

/** 12 条进化线 —— 加新线只在这里加一条 */
export const EVOLUTIONS: Record<EvolutionLineId, EvolutionDef> = {
  /* ================= 布丁兽 ================= */
  puddly_caramel: {
    id: "puddly_caramel",
    species: "puddly",
    path: "refined",
    palette: { color: "#F6C177", shade: "#C98F3C", blush: "#FF7FA8", accent: "#8B5A2B" },
    scale: 1,
    behind: [],
    front: ["caramelDrip", "starMark"],
  },
  puddly_jelly: {
    id: "puddly_jelly",
    species: "puddly",
    path: "balanced",
    palette: { color: "#8FE3D6", shade: "#4FB3A5", blush: "#FF9EC4", accent: "#E8FFFB" },
    scale: 0.98,
    bodyOpacity: 0.85,
    behind: [],
    front: ["jellySparkle"],
  },
  puddly_magma: {
    id: "puddly_magma",
    species: "puddly",
    path: "feral",
    palette: { color: "#FF8A5B", shade: "#C7472A", blush: "#FFD166", accent: "#FFD166" },
    scale: 1.03,
    behind: [],
    front: ["magmaCracks"],
  },

  /* ================= 麻薯猫 ================= */
  mochi_daifuku: {
    id: "mochi_daifuku",
    species: "mochi",
    path: "refined",
    palette: { color: "#FFF6F8", shade: "#EBC9D5", blush: "#FF7BA9", accent: "#FF4D79" },
    scale: 1,
    behind: [],
    front: ["strawberry", "starMark"],
  },
  mochi_tsukimi: {
    id: "mochi_tsukimi",
    species: "mochi",
    path: "balanced",
    palette: { color: "#D8D4F5", shade: "#A79FD4", blush: "#FFA6C9", accent: "#FFF3B0" },
    scale: 0.99,
    behind: ["halo"],
    front: ["crescentMoon", "starMark"],
  },
  mochi_tiger: {
    id: "mochi_tiger",
    species: "mochi",
    path: "feral",
    palette: { color: "#FFD08A", shade: "#D18F3C", blush: "#FF8FB1", accent: "#5A3A1E" },
    scale: 1.04,
    behind: ["tailPuff"],
    front: ["tigerStripes"],
  },

  /* ================= 云朵羊 ================= */
  cloudpuff_rainbow: {
    id: "cloudpuff_rainbow",
    species: "cloudpuff",
    path: "refined",
    palette: { color: "#FFF0F6", shade: "#E8C9DD", blush: "#FFA6C9", accent: "#FF6B9D" },
    scale: 1,
    behind: ["rainbowArc"],
    front: ["rainbowTuft"],
  },
  cloudpuff_drizzle: {
    id: "cloudpuff_drizzle",
    species: "cloudpuff",
    path: "balanced",
    palette: { color: "#DCEFFA", shade: "#A8CEE4", blush: "#FFB3D0", accent: "#6FB6DE" },
    scale: 1.02,
    behind: ["wingSmall"],
    front: ["stormCloud"],
  },
  cloudpuff_storm: {
    id: "cloudpuff_storm",
    species: "cloudpuff",
    path: "feral",
    palette: { color: "#B9B4D6", shade: "#7C76A0", blush: "#E0A6C8", accent: "#FFE066" },
    scale: 1.06,
    behind: ["wingBat"],
    front: ["stormCloud"],
  },

  /* ================= 芽芽龙 ================= */
  sprout_blossom: {
    id: "sprout_blossom",
    species: "sprout",
    path: "refined",
    palette: { color: "#DFF5DC", shade: "#A9D6A6", blush: "#FF9EC4", accent: "#FF8FB1" },
    scale: 1,
    behind: ["wingButterfly"],
    front: ["blossomCrown"],
  },
  sprout_crystal: {
    id: "sprout_crystal",
    species: "sprout",
    path: "balanced",
    palette: { color: "#C9EEF7", shade: "#87C6D9", blush: "#FFA6C9", accent: "#B8A6FF" },
    scale: 0.99,
    bodyOpacity: 0.92,
    behind: [],
    front: ["crystalHorn", "jellySparkle"],
  },
  sprout_ember: {
    id: "sprout_ember",
    species: "sprout",
    path: "feral",
    palette: { color: "#FFC08A", shade: "#D46A34", blush: "#FF8F6B", accent: "#FF7A3C" },
    scale: 1.05,
    behind: ["tailFlame"],
    front: ["flameTuft"],
  },

  /* ================= 小幽灵 ================= */
  whispy_moonshine: {
    id: "whispy_moonshine",
    species: "whispy",
    path: "refined",
    palette: { color: "#D8E4FF", shade: "#A9BCE8", blush: "#FFA6C9", accent: "#C9D4FF" },
    scale: 1,
    behind: ["halo"],
    front: ["crescentMoon", "starMark"],
  },
  whispy_lampling: {
    id: "whispy_lampling",
    species: "whispy",
    path: "balanced",
    palette: { color: "#FFEAC2", shade: "#E8C88A", blush: "#FFA6C9", accent: "#FFB05C" },
    scale: 0.99,
    behind: [],
    front: ["flameTuft", "jellySparkle"],
  },
  whispy_shade: {
    id: "whispy_shade",
    species: "whispy",
    path: "feral",
    palette: { color: "#A89BC4", shade: "#6F6390", blush: "#E0A6C8", accent: "#6B5B95" },
    scale: 1.05,
    behind: ["wingBat"],
    front: ["stormCloud"],
  },

  /* ================= 星星兽 ================= */
  twinkle_comet: {
    id: "twinkle_comet",
    species: "twinkle",
    path: "refined",
    palette: { color: "#FFE08A", shade: "#E8B84C", blush: "#FF9EC4", accent: "#FF9E2C" },
    scale: 1,
    behind: ["rainbowArc"],
    front: ["rainbowTuft"],
  },
  twinkle_crystal: {
    id: "twinkle_crystal",
    species: "twinkle",
    path: "balanced",
    palette: { color: "#CDE9F5", shade: "#8FC4DA", blush: "#FFA6C9", accent: "#7FD4E8" },
    scale: 0.99,
    bodyOpacity: 0.94,
    behind: [],
    front: ["crystalHorn", "jellySparkle"],
  },
  twinkle_meteor: {
    id: "twinkle_meteor",
    species: "twinkle",
    path: "feral",
    palette: { color: "#E0A07A", shade: "#A85F42", blush: "#FFD166", accent: "#C24A28" },
    scale: 1.04,
    behind: ["wingBat"],
    front: ["magmaCracks"],
  },
};

export const EVOLUTION_IDS = Object.keys(EVOLUTIONS) as EvolutionLineId[];

/** 存档里的 evolution 是裸字符串，取值前必须校验，避免脏数据把渲染层打崩 */
export function isEvolutionLineId(v: unknown): v is EvolutionLineId {
  return typeof v === "string" && Object.prototype.hasOwnProperty.call(EVOLUTIONS, v);
}

/** 某个种族的 3 条线 */
export function evolutionsForSpecies(species: Species): EvolutionDef[] {
  return EVOLUTION_IDS.map((id) => EVOLUTIONS[id]).filter((e) => e.species === species);
}

/** 按种族 + 照护风格拿到具体的进化线 */
export function evolutionFor(species: Species, path: EvolutionPath): EvolutionDef {
  const found = evolutionsForSpecies(species).find((e) => e.path === path);
  // 理论上不可能找不到，兜底返回该种族的第一条，避免运行时炸掉
  return found ?? EVOLUTIONS[evolutionsForSpecies(species)[0]?.id ?? "puddly_caramel"];
}
