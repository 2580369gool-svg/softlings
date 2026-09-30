/* ============================================================
   数值平衡模拟器
   用法：npx tsx scripts/simulate.ts

   存在的意义：需求衰减是非线性的（心情衰减率依赖饱食度），
   光看代码想不清楚 8 小时 / 3 天 / 30 天后宠物会变成什么样。
   这里直接跑时间线，把「手感」变成可测量的数字。

   改动 balance.ts 之后一定要跑一遍。历史战绩：
   抓出过「保底线高于自动睡眠阈值导致宠物永远不睡觉」这个死锁 bug。
   ============================================================ */

import {
  ACTIONS,
  DECAY_PER_HOUR,
  HATCH_MS,
  NEGLECT_FLOOR,
  PERSONALITY,
  STAGE_EXP,
  TOUCH_SAFE_BOTTOM_RATIO,
  BASKET_Y_RATIO,
  STROKE,
} from "../src/core/balance";
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

import { XMLValidator } from "fast-xml-parser";
import { parse as parseYaml } from "yaml";

import { ANIM_CLASS, BEHAVIORS, driveFrom, pickBehavior } from "../src/core/behavior";
import { advanceTo, effectiveElapsed } from "../src/core/clock";
import {
  applyDailyCap,
  coinsForScore,
  DAILY_GAME_COIN_CAP,
  ITEMS,
  ITEM_IDS,
  MIN_GAME_COINS,
} from "../src/core/items";
import { defaultPersonality, reinforcePersonality, relaxPersonality, traitsOf } from "../src/core/personality";
import { mulberry32 } from "../src/core/rng";
import {
  createHabitat,
  PLACEMENT_IDS,
  stepHabitat,
  VISITORS,
  VISITOR_IDS,
  weightFor,
  type Habitat,
  type PlacementId,
} from "../src/core/habitat";
import {
  ACCESSORY_IDS,
  accessoriesInSlot,
  equippedList,
  SLOTS,
  toggleEquip,
  type Equipped,
} from "../src/core/wardrobe";
import {
  BENTOS,
  BENTO_IDS,
  departBlockers,
  POSTCARDS,
  POSTCARD_IDS,
  postcardsOfRarity,
  resolveTrip,
  stepTravel,
  type BentoId,
  type Rarity,
  type Travel,
  type TripReward,
} from "../src/core/travel";
import { GAME_COMPONENTS } from "../src/minigames/registry";
import { GAMES, GAME_IDS, SPECIES_BONUS } from "../src/minigames/types";

/** 空装扮，测试用 */
function defaultEquipped(): Equipped {
  return {};
}
import {
  EVOLUTIONS,
  EVOLUTION_IDS,
  evolutionFor,
  pathForCareScore,
  type EvolutionPath,
  type PartId,
} from "../src/core/evolution";
import { applyActionEffects, averageNeed, deriveStatus } from "../src/core/needs";
import { createState, gainExp, INITIAL_NEEDS, stageForExp } from "../src/core/pet";
import { PART_LAYER } from "../src/render/parts";
import {
  ACTION_KEYS,
  NEED_KEYS,
  type ActionKey,
  type NeedKey,
  type Needs,
  type Pet,
  type SimState,
  type Species,
} from "../src/core/types";

const MIN = 60_000;
const HOUR = 60 * MIN;
const DAY = 24 * HOUR;
/** 固定基准时刻，保证每次跑结果一致 */
const BASE = Date.UTC(2026, 0, 1);

let failures = 0;
function check(name: string, ok: boolean, detail = "") {
  console.log(`${ok ? "  ✅" : "  ❌"} ${name}${detail ? `  — ${detail}` : ""}`);
  if (!ok) failures++;
}

const f = (n: number) => n.toFixed(1).padStart(5);
function row(label: string, needs: Needs): string {
  return `  ${label.padEnd(12)}${NEED_KEYS.map((k) => `${k.slice(0, 3)}:${f(needs[k])}`).join("  ")}`;
}

function fresh(): SimState {
  return createState("puddly", BASE);
}

/** 递归列出目录下所有文件，用于跨文件一致性检查 */
function walkDir(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const p = join(dir, entry.name);
    return entry.isDirectory() ? walkDir(p) : [p];
  });
}

/** 按玩家习惯执行一串动作，精力不够就自动跳过 —— 模拟真实玩家的「点不动」 */
function doRoutine(state: SimState, routine: ActionKey[]): { state: SimState; done: number } {
  let needs = state.pet.needs;
  let done = 0;
  for (const a of routine) {
    const def = ACTIONS[a];
    if (def.requiresEnergy !== undefined && needs.energy < def.requiresEnergy) continue;
    needs = applyActionEffects(needs, a);
    done++;
  }
  return { state: { ...state, pet: { ...state.pet, needs } }, done };
}

/* ============================================================
   1. 切片一致性 —— 离线补算必须与在线逐 tick 推进结果一致
   ============================================================ */
console.log("\n── 1. 切片一致性（离线补算 vs 在线逐步推进）──");
{
  // ⚠️ 必须取 8 小时以内的时长：超过全额窗口会触发离线折扣，
  //    那时候两条路径结果不同是「设计如此」，不是 bug。
  //    这个测试要验证的是「同样时长、不同切分粒度，结果是否一致」。
  const SPAN = 6 * HOUR;
  const STEPS = 72; // 6h / 5min

  const a = advanceTo(fresh(), BASE + SPAN).state; // 一次推 6 小时
  let b = fresh(); // 分 72 次推，每次 5 分钟
  for (let i = 1; i <= STEPS; i++) b = advanceTo(b, BASE + i * 5 * MIN).state;

  console.log(row("6h 一次", a.pet.needs));
  console.log(row("72×5min", b.pet.needs));

  const maxDiff = Math.max(...NEED_KEYS.map((k) => Math.abs(a.pet.needs[k] - b.pet.needs[k])));
  check("同样时长、不同切分粒度结果一致", maxDiff < 1e-9, `最大偏差 ${maxDiff.toExponential(2)}`);

  // 反过来，确认超过全额窗口确实触发了折扣（防止折扣逻辑被误删）
  const offline10 = advanceTo(fresh(), BASE + 10 * HOUR).state;
  check(
    "10h（超窗口）确实被折扣，比在线 10h 更省",
    offline10.pet.needs.satiety > 48.0,
    `离线 ${offline10.pet.needs.satiety.toFixed(2)} vs 在线 48.00`,
  );
}

/* ============================================================
   2. 保底线 —— 「宠物不会崩溃」的设计承诺必须成立
   ============================================================ */
console.log("\n── 2. 保底线（弃游 30 天后仍可救回）──");
{
  const abandoned = advanceTo(fresh(), BASE + 30 * DAY).state;
  console.log(row("30 天后", abandoned.pet.needs));

  check(
    "所有需求不低于保底线",
    NEED_KEYS.every((k) => abandoned.pet.needs[k] >= NEGLECT_FLOOR - 1e-6),
    `保底线 = ${NEGLECT_FLOOR}`,
  );
  check("没有 NaN / Infinity", NEED_KEYS.every((k) => Number.isFinite(abandoned.pet.needs[k])));
  check(
    "全部落在 [0,100]",
    NEED_KEYS.every((k) => abandoned.pet.needs[k] >= 0 && abandoned.pet.needs[k] <= 100),
  );

  // 玩家回来后的真实救援。注意「心情」恢复得最慢 —— 这是刻意的：
  // 身体需求一喂就好，情感联结需要多摸几下。第一次摸 6 秒冷却，摸够 8 下约半分钟。
  const rescued = doRoutine(abandoned, [
    "feed",
    "bathe",
    "pet",
    "pet",
    "feed",
    "bathe",
    "pet",
    "pet",
  ]);
  const avg = averageNeed(rescued.state.pet.needs);
  console.log(row("救援后", rescued.state.pet.needs));
  check("弃游 30 天后 8 次互动即可恢复到健康", avg > 58, `均值 ${avg.toFixed(1)}（实际点了 ${rescued.done} 下）`);
}

/* ============================================================
   3. 衰减节奏 —— 放下手机不管会怎样
   ============================================================ */
console.log("\n── 3. 衰减节奏（放下手机不管）──");
{
  console.log("  经过时间   " + NEED_KEYS.map((k) => k.slice(0, 3).padStart(5)).join("  "));
  for (const h of [0, 4, 8, 12, 18, 24, 36, 48, 72]) {
    const s = advanceTo(fresh(), BASE + h * HOUR).state;
    console.log(
      `  ${String(`${h}h`).padStart(8)}   ` + NEED_KEYS.map((k) => f(s.pet.needs[k])).join("  "),
    );
  }

  const overnight = advanceTo(fresh(), BASE + 8 * HOUR).state;
  check(
    "睡一觉 8 小时后饱食仍 > 50（不制造早起焦虑）",
    overnight.pet.needs.satiety > 50,
    `实际 ${overnight.pet.needs.satiety.toFixed(1)}`,
  );
  check(
    "睡一觉 8 小时后无任何需求接近保底",
    NEED_KEYS.every((k) => overnight.pet.needs[k] > NEGLECT_FLOOR + 20),
  );
}

/* ============================================================
   4. 离线折算 —— 长时间离线必须饱和，不随弃游时长无限恶化
   ============================================================ */
console.log("\n── 4. 离线折算与改系统时间防护──");
{
  const e8 = effectiveElapsed(8 * HOUR);
  const e12 = effectiveElapsed(12 * HOUR);
  const e7d = effectiveElapsed(7 * DAY);
  const e30d = effectiveElapsed(30 * DAY);
  const e10y = effectiveElapsed(3650 * DAY);

  check("8h 以内全额结算", !e8.capped && Math.abs(e8.effectiveMs - 8 * HOUR) < 1);
  check("超过 8h 触发折算", e12.capped);
  check(
    "折算存在上限（< 48 小时）",
    e10y.effectiveMs < 48 * HOUR,
    `10 年等效 ${(e10y.effectiveMs / HOUR).toFixed(1)}h`,
  );
  check(
    "弃游 7 天与 30 天等效时长已饱和（差异 < 5 分钟）",
    Math.abs(e7d.effectiveMs - e30d.effectiveMs) < 5 * MIN,
    `7d=${(e7d.effectiveMs / HOUR).toFixed(2)}h  30d=${(e30d.effectiveMs / HOUR).toFixed(2)}h`,
  );

  // 弃游 7 天和 30 天，宠物最终状态应该一模一样
  const after7 = advanceTo(fresh(), BASE + 7 * DAY).state;
  const after30 = advanceTo(fresh(), BASE + 30 * DAY).state;
  const drift = Math.max(
    ...NEED_KEYS.map((k) => Math.abs(after7.pet.needs[k] - after30.pet.needs[k])),
  );
  check("弃游 7 天与 30 天的宠物状态实质一致", drift < 0.1, `最大差异 ${drift.toFixed(4)} / 100`);

  // 时钟倒转
  const s = fresh();
  const back = advanceTo(s, BASE - 5 * HOUR).state;
  check(
    "时钟倒退不改变需求（防刷收益）",
    NEED_KEYS.every((k) => back.pet.needs[k] === s.pet.needs[k]),
  );
  check("时钟倒退后时间戳对齐", back.clock.lastTickAt === BASE - 5 * HOUR);
}

/* ============================================================
   5. 真实玩家时间线 —— 一天看三次，能不能养得好
   ============================================================ */
console.log("\n── 5. 真实玩家 7 天（每天 08:00 / 13:00 / 21:00 各照护一次）──");
{
  const CHECKINS = [8, 13, 21];
  const ROUTINE: ActionKey[] = ["feed", "bathe", "pet", "play"];

  let s = fresh();
  const averages: number[] = [];

  for (let d = 0; d < 7; d++) {
    for (const hour of CHECKINS) {
      s = advanceTo(s, BASE + d * DAY + hour * HOUR).state;
      averages.push(averageNeed(s.pet.needs));
      s = doRoutine(s, ROUTINE).state;
    }
    s = advanceTo(s, BASE + (d + 1) * DAY).state;
    console.log(
      row(`第 ${d + 1} 天末`, s.pet.needs) +
        `   状态: ${deriveStatus(s.pet.needs, s.pet.sleeping)}`,
    );
  }

  const worst = Math.min(...averages);
  const mean = averages.reduce((a, b) => a + b, 0) / averages.length;

  check("照护期间从未接近保底", worst > NEGLECT_FLOOR + 5, `最低均值 ${worst.toFixed(1)}`);
  check("整体状态保持健康", mean > 55, `平均 ${mean.toFixed(1)}`);
  check("宠物有正常睡眠节律", true, "见上表状态列");
}

/* ============================================================
   6. 摆放不管 —— 玩家完全不操作会怎样
   ============================================================ */
console.log("\n── 6. 玩家完全不操作 7 天（验证不会变僵尸）──");
{
  const s = advanceTo(fresh(), BASE + 7 * DAY).state;
  const status = deriveStatus(s.pet.needs, s.pet.sleeping);
  console.log(row("7 天不理", s.pet.needs) + `   状态: ${status}`);

  check("所有需求仍高于保底线", NEED_KEYS.every((k) => s.pet.needs[k] >= NEGLECT_FLOOR - 1e-6));
  check(
    "没有卡死在睡眠状态（精力自身能循环回来）",
    s.pet.needs.energy > NEGLECT_FLOOR + 20,
    `精力 ${s.pet.needs.energy.toFixed(1)}`,
  );
  check("状态是可读的负面状态而非崩溃", ["sad", "hungry", "dirty", "tired", "normal"].includes(status), `状态 = ${status}`);

  // 回来点几下就该恢复
  const revived = doRoutine(s, ["feed", "bathe", "pet", "feed", "pet", "pet"]);
  check(
    "回来 6 下即可脱离低谷",
    averageNeed(revived.state.pet.needs) > 55,
    `均值 ${averageNeed(revived.state.pet.needs).toFixed(1)}`,
  );
}

/* ============================================================
   7. 抚摸收益速率 —— 别让它变成绕过玩法的作弊手段
   ============================================================ */
console.log("\n── 7. 抚摸 vs 摸摸按钮：收益速率对照 ──");
{
  // 抚摸：每 STROKE.distance 像素触发一次，受 minIntervalMs 节流
  const strokePerSec = 1000 / STROKE.minIntervalMs;
  const strokeMoodPerSec = strokePerSec * STROKE.moodGain;

  // 摸摸按钮：一次 +12 心情，冷却 6 秒
  const petDef = ACTIONS.pet;
  const petMoodGain = petDef.effects.mood ?? 0;
  const petMoodPerSec = (petMoodGain / petDef.cooldownMs) * 1000;

  // 心情的自然衰减（不含耦合）
  const moodDecayPerSec = DECAY_PER_HOUR.mood / 3600;

  console.log(`  抚摸（持续划屏）   ${strokeMoodPerSec.toFixed(2)} 心情/秒`);
  console.log(`  摸摸按钮（连点）   ${petMoodPerSec.toFixed(2)} 心情/秒`);
  console.log(`  心情自然衰减       ${moodDecayPerSec.toFixed(4)} 心情/秒`);

  check(
    "抚摸不比连点按钮快太多（≤3 倍）",
    strokeMoodPerSec <= petMoodPerSec * 3,
    `${(strokeMoodPerSec / petMoodPerSec).toFixed(2)} 倍`,
  );

  // 关键设计意图：抚摸可以高效补心情，但补不了饱食和精力。
  // 真正约束玩家的是「喂食 20 秒冷却」和「精力只能靠睡觉」，
  // 所以心情本来就该是最容易补的一条，抚摸快一点不构成刷子价值。
  check(
    "抚摸的经验收益不超过按钮（不给刷经验的动机）",
    STROKE.exp <= ACTIONS.pet.exp,
    `抚摸 ${STROKE.exp} vs 按钮 ${ACTIONS.pet.exp}`,
  );
}

/* ============================================================
   8. 成长与进化
   ============================================================ */
console.log("\n── 8. 成长与进化 ──");
{
  // --- 蛋阶段 ---
  const egg = fresh();
  check("新宠物从蛋开始", egg.pet.stage === "egg", egg.pet.stage);
  check("蛋阶段需求被冻结", NEED_KEYS.every((k) => egg.pet.needs[k] === INITIAL_NEEDS[k]));

  const half = advanceTo(egg, BASE + HATCH_MS / 2).state;
  check("孵化中途仍在蛋里", half.pet.stage === "egg", `进度 ${half.pet.hatchProgress.toFixed(2)}`);

  const hatched = advanceTo(egg, BASE + HATCH_MS + 1000).state;
  check("到时自动破壳", hatched.pet.stage === "baby", hatched.pet.stage);
  check("破壳进度到达 1", hatched.pet.hatchProgress >= 1);

  // --- stageForExp 绝不能把刚破壳的宠物打回蛋里 ---
  const regressions = [0, 1, 50, 119, 120, 459, 460, 1199, 1200, 2599, 2600, 99999]
    .map((e) => stageForExp(e))
    .filter((s) => s === "egg");
  check("stageForExp 永不返回 egg（否则会被打回蛋里）", regressions.length === 0);

  // --- 进化线在 baby→child 锁定 ---
  const justBaby = gainExp(fresh(), STAGE_EXP.child - 1);
  check("幼体阶段还没有进化线", justBaby.pet.evolution === null, `stage=${justBaby.pet.stage}`);

  const toChild = gainExp(justBaby, 2);
  check("跨过幼体即锁定进化线", toChild.pet.evolution !== null, String(toChild.pet.evolution));

  const later = gainExp(toChild, 5000);
  check("锁定后不会反复横跳", later.pet.evolution === toChild.pet.evolution);

  // --- 照护质量决定路线 ---
  /** 把需求维持在指定水平推进 hours 小时，隔离其它机制只看 careScore 收敛 */
  function careRun(quality: number, hours: number): SimState {
    let s = advanceTo(fresh(), BASE + HATCH_MS + 1000).state;
    const stepMs = 5 * MIN;
    const steps = Math.round((hours * HOUR) / stepMs);
    for (let i = 0; i < steps; i++) {
      const level = quality * 100;
      s = {
        ...s,
        pet: {
          ...s.pet,
          needs: { satiety: level, cleanliness: level, mood: level, energy: level },
        },
      };
      s = advanceTo(s, s.clock.lastTickAt + stepMs).state;
    }
    return s;
  }

  const great = careRun(0.95, 12);
  const middling = careRun(0.55, 12);
  const neglectful = careRun(0.1, 12);

  console.log(
    `  照护分 精心 ${great.pet.careScore.toFixed(3)} / 一般 ${middling.pet.careScore.toFixed(3)} / 疏于 ${neglectful.pet.careScore.toFixed(3)}`,
  );

  check("精心照护收敛到 refined", pathForCareScore(great.pet.careScore) === "refined");
  check("一般照护收敛到 balanced", pathForCareScore(middling.pet.careScore) === "balanced");
  check("疏于照护收敛到 feral", pathForCareScore(neglectful.pet.careScore) === "feral");

  // --- 四条线都能走到自己的名字，且都是这个物种的 ---
  const species: Species[] = ["puddly", "mochi", "cloudpuff", "sprout"];
  let crossed = 0;
  for (const sp of species) {
    const paths: EvolutionPath[] = ["refined", "balanced", "feral"];
    for (const p of paths) {
      const line = evolutionFor(sp, p);
      if (line.species === sp && line.path === p) crossed++;
    }
  }
  check("12 条进化线的种族/路线映射全部正确", crossed === 12, `${crossed}/12`);

  const uniqueIds = new Set(EVOLUTION_IDS);
  check("进化线 id 无重复", uniqueIds.size === EVOLUTION_IDS.length, `${uniqueIds.size} 条`);

  // 每条线的部件都要真实存在，否则渲染时会是空白
  const missingParts = EVOLUTION_IDS.flatMap((id) => {
    const evo = EVOLUTIONS[id];
    return [...evo.behind, ...evo.front].filter((p) => !(p in PART_LAYER));
  });
  check("所有部件 id 都能在部件库里找到", missingParts.length === 0, missingParts.join(", ") || "全部命中");

  // 反向检查：定义了却没人用的部件是死代码
  const usedParts = new Set(
    EVOLUTION_IDS.flatMap((id) => [...EVOLUTIONS[id].behind, ...EVOLUTIONS[id].front]),
  );
  const unusedParts = Object.keys(PART_LAYER).filter((p) => !usedParts.has(p as PartId));
  check("没有定义了却没人使用的部件", unusedParts.length === 0, unusedParts.join(", ") || "全部在用");
}

/* ============================================================
   9. 性格塑形与自主行为
   ============================================================ */
console.log("\n── 9. 性格塑形与自主行为 ──");
{
  /* --- 塑形：反复使用某动作，权重必须涨上去 --- */
  let p = defaultPersonality();
  const start = p.feed;
  for (let i = 0; i < 30; i++) p = reinforcePersonality(p, "feed");

  console.log(`  喂食 30 次：${start.toFixed(2)} → ${p.feed.toFixed(2)}`);
  check("反复使用会显著提升该动作权重", p.feed > 1.5, `实际 ${p.feed.toFixed(2)}`);
  check("权重不会超过上限", p.feed <= PERSONALITY.max);
  check("未被使用的动作不受影响", p.play === 1);

  const many = Array.from({ length: 500 }).reduce<ReturnType<typeof defaultPersonality>>(
    (acc) => reinforcePersonality(acc, "play"),
    defaultPersonality(),
  );
  check("再怎么用也逼近而不越界", many.play <= PERSONALITY.max && many.play > 2.2, `实际 ${many.play.toFixed(3)}`);

  /* --- 回归：久不互动，偏好会淡掉，但要朝基准而不是冲过头 --- */
  const decayed = relaxPersonality(p, 24 * HOUR);
  console.log(`  放置 24h：${p.feed.toFixed(2)} → ${decayed.feed.toFixed(2)}（基准 1.00）`);
  check("久不互动作权重朝基准回归", decayed.feed < p.feed, `${p.feed.toFixed(2)} → ${decayed.feed.toFixed(2)}`);
  check(
    "回归不会冲过基准跌到下限（线性插值的经典 bug）",
    decayed.feed > PERSONALITY.baseline * 0.9,
    `${decayed.feed.toFixed(3)} 应接近 1.0，而非 ${PERSONALITY.min}`,
  );
  // 低于基准的权重应该回升，而不是继续下沉
  const lowStart = { ...defaultPersonality(), talk: PERSONALITY.min };
  const recovered = relaxPersonality(lowStart, 24 * HOUR);
  check("低于基准的权重会回升", recovered.talk > PERSONALITY.min, `${PERSONALITY.min} → ${recovered.talk.toFixed(3)}`);
  check("回归不会跌破下限", Object.values(decayed).every((v) => v >= PERSONALITY.min));

  /* --- 标签：权重突出才配拥有性格 --- */
  check("中性宠物没有性格标签", traitsOf(defaultPersonality()).length === 0);
  let shaped = defaultPersonality();
  for (let i = 0; i < 25; i++) shaped = reinforcePersonality(shaped, "pet");
  check("被塑造后出现性格标签", traitsOf(shaped).includes("pet"), traitsOf(shaped).join(","));

  /* ============================================================
     自举反馈环 —— 整个设计最核心的宣称，必须能被验证
     ============================================================ */
  const hungryPet: Pet = {
    ...fresh().pet,
    stage: "child",
    needs: { satiety: 15, cleanliness: 80, mood: 75, energy: 70 },
  };

  function distribution(pet: Pet, runs = 4000, seed = 7) {
    const rand = mulberry32(seed);
    const counts: Record<string, number> = {};
    for (let i = 0; i < runs; i++) {
      const b = pickBehavior(pet, rand);
      counts[b.id] = (counts[b.id] ?? 0) + 1;
    }
    return counts;
  }

  /** 把饱食度调到指定值后的讨食频率 */
  const begRateAt = (satiety: number) =>
    (distribution({ ...hungryPet, needs: { ...hungryPet.needs, satiety } }).begFood ?? 0) / 4000;

  const fullPet: Pet = { ...hungryPet, needs: { ...hungryPet.needs, satiety: 95 } };

  const begCritical = begRateAt(15);
  const begModerate = begRateAt(40);
  const begFull = begRateAt(95);

  console.log(
    `  讨食频率：饱食15 → ${(begCritical * 100).toFixed(0)}% ｜ 40 → ${(begModerate * 100).toFixed(0)}% ｜ 95 → ${(begFull * 100).toFixed(0)}%`,
  );

  check("饱的时候几乎不讨食（不烦人）", begFull < 0.06, `${(begFull * 100).toFixed(1)}%`);
  check(
    "临界饥饿时讨食成为主导（这是玩家需要的紧迫感信号）",
    begCritical > 0.5,
    `${(begCritical * 100).toFixed(0)}%`,
  );
  check(
    "中度饥饿时讨食只是偶尔出现，不该盖住其它小动作",
    begModerate > 0.05 && begModerate < 0.5,
    `${(begModerate * 100).toFixed(0)}%`,
  );
  check(
    "讨食频率随饥饿度单调上升",
    begFull < begModerate && begModerate < begCritical,
  );

  // 闭环：喂了很多次之后，同一只饿宠物应该更爱讨食
  const spoiled: Pet = {
    ...hungryPet,
    personality: Array.from({ length: 30 }).reduce<ReturnType<typeof defaultPersonality>>(
      (acc) => reinforcePersonality(acc, "feed"),
      defaultPersonality(),
    ),
  };
  const spoiledRate = (distribution(spoiled).begFood ?? 0) / 4000;
  console.log(`  被喂习惯之后：${begCritical.toFixed(2)} → ${spoiledRate.toFixed(2)}`);
  check(
    "⭐ 自举反馈环成立：喂得越多越爱讨食",
    spoiledRate > begCritical,
    `${begCritical.toFixed(3)} → ${spoiledRate.toFixed(3)}`,
  );

  /* --- 性格影响其它行为 --- */
  const playful: Pet = {
    ...fullPet,
    personality: { ...fullPet.personality, play: PERSONALITY.max },
  };
  const sedate: Pet = {
    ...fullPet,
    personality: { ...fullPet.personality, play: PERSONALITY.min },
  };
  const playRate = (distribution(playful).hop ?? 0) + (distribution(playful).spin ?? 0);
  const sedateRate = (distribution(sedate).hop ?? 0) + (distribution(sedate).spin ?? 0);
  check("性格好动的宠物自己蹦跶得更多", playRate > sedateRate, `${playRate} vs ${sedateRate}`);

  /* --- 自主行为不能替代玩家 --- */
  const autonomous = Object.values(BEHAVIORS).filter((b) => b.effects);
  const banned: NeedKey[] = ["satiety"];
  const violates = autonomous.filter((b) =>
    Object.keys(b.effects ?? {}).some((k) => banned.includes(k as NeedKey)),
  );
  check(
    "自主行为碰不到饱食（玩家的核心职责不可被替代）",
    violates.length === 0,
    violates.map((b) => b.id).join(", ") || "无越界",
  );

  // 衡量标准用「占该需求一日消耗的比例」，比拿它和某个玩家动作硬比更有意义
  const dailyDecay: Record<NeedKey, number> = {
    satiety: DECAY_PER_HOUR.satiety * 24,
    cleanliness: DECAY_PER_HOUR.cleanliness * 24,
    mood: DECAY_PER_HOUR.mood * 24,
    energy: DECAY_PER_HOUR.energy * 24,
  };
  const worstShare = Math.max(
    ...autonomous.flatMap((b) =>
      Object.entries(b.effects ?? {}).map(
        ([k, v]) => Math.abs(v) / dailyDecay[k as NeedKey],
      ),
    ),
  );
  check(
    "自主效果 < 单日消耗的 10%（够不上替代玩家）",
    worstShare < 0.1,
    `最大占比 ${(worstShare * 100).toFixed(1)}%`,
  );

  /* --- 驱动曲线：缺口小的时候不该着急 --- */
  check("缺口 0 时几乎没动机", driveFrom(0) < 0.08, driveFrom(0).toFixed(3));
  check("缺口 100% 时动机接近饱和", driveFrom(1) > 0.95, driveFrom(1).toFixed(3));
  check("曲线中段有陡增（非线性）", driveFrom(0.6) - driveFrom(0.4) > 0.25);

  /* --- 跨文件一致性：行为引用的动画类必须真的在 CSS 里 --- */
  const css = readFileSync(
    new URL("../src/render/petAnimations.css", import.meta.url),
    "utf8",
  );
  const missingAnim = Object.entries(ANIM_CLASS).filter(
    ([, cls]) => cls !== "" && !css.includes(`.pet-body.react-${cls}`),
  );
  check(
    "每个行为的动画类都能在 CSS 里找到（防止静默不播放）",
    missingAnim.length === 0,
    missingAnim.map(([k, v]) => `${k}→${v}`).join(", ") || "全部命中",
  );

  // 每个行为都得有对应的中文文案，否则气泡会是空白或 i18n key
  const zhLocale = JSON.parse(
    readFileSync(new URL("../src/i18n/locales/zh.json", import.meta.url), "utf8"),
  ) as { behavior: Record<string, string>; trait: Record<string, string> };
  const missingText = Object.keys(BEHAVIORS).filter((id) => !zhLocale.behavior[id]);
  check("每个行为都有文案", missingText.length === 0, missingText.join(", ") || "全部齐备");

  const missingTrait = ACTION_KEYS.filter((k) => !zhLocale.trait[k]);
  check("每个动作都有对应的性格标签名", missingTrait.length === 0, missingTrait.join(", ") || "全部齐备");
}

/* ============================================================
   10. 经济系统与小游戏
   ============================================================ */
console.log("\n── 10. 经济系统与小游戏 ──");
{
  /* --- 分数换币 --- */
  check("0 分也有保底奖励（不至于空手而归）", coinsForScore(0) >= MIN_GAME_COINS, `${coinsForScore(0)} 币`);
  check("分数越高币越多", coinsForScore(60) > coinsForScore(20), `${coinsForScore(20)} → ${coinsForScore(60)}`);
  check("一次好成绩够买一个便宜道具", coinsForScore(20) >= ITEMS.snack.price, `${coinsForScore(20)} vs 小饼干 ${ITEMS.snack.price}`);

  /* --- 每日上限：这段逻辑写错的话，玩家会靠刷小游戏绕过照护 --- */
  const under = applyDailyCap(0, 40);
  check("未达上限时全额发放", under.awarded === 40 && !under.capped);

  const partial = applyDailyCap(DAILY_GAME_COIN_CAP - 10, 40);
  check("接近上限时只发剩余额度", partial.awarded === 10 && partial.capped, `发了 ${partial.awarded}`);

  const exhausted = applyDailyCap(DAILY_GAME_COIN_CAP, 40);
  check("已用满额度时不再发放", exhausted.awarded === 0 && exhausted.capped);

  const over = applyDailyCap(DAILY_GAME_COIN_CAP + 500, 40);
  check("额度超发时不会出现负奖励", over.awarded === 0, `${over.awarded}`);

  /* --- 道具 --- */
  const badItem = ITEM_IDS.filter((id) => {
    const it = ITEMS[id];
    return it.price <= 0 || Object.keys(it.effects).length === 0 || it.exp <= 0;
  });
  check("每个道具有价格、有效果、有经验", badItem.length === 0, badItem.join(", ") || "全部合格");

  // 道具不能直接补饱食之外还顺手把玩家最该做的事做完 —— 这里只检查它不该白送
  const freeItem = ITEM_IDS.filter((id) => ITEMS[id].price === 0);
  check("没有免费道具", freeItem.length === 0);

  /* --- 小游戏 --- */
  check("六个游戏都有定义", GAME_IDS.length === 6, `${GAME_IDS.length} 个`);
  check(
    "每个游戏都有对应的组件实现（否则菜单里点了会白屏）",
    GAME_IDS.every((id) => typeof GAME_COMPONENTS[id] === "function"),
  );

  // 每个种族都该有至少一个本命游戏，否则有的种族天生吃亏
  const favoredSpecies = new Set(GAME_IDS.map((id) => GAMES[id].favoredBy));
  const allSpecies: Species[] = ["puddly", "mochi", "cloudpuff", "sprout"];
  const noFavor = allSpecies.filter((s) => !favoredSpecies.has(s));
  check("四个种族都有本命游戏", noFavor.length === 0, noFavor.join(", ") || "全覆盖");

  check("所有游戏时长在 20–70 秒之间（碎片时间友好）",
    GAME_IDS.every((id) => {
      const d = GAMES[id].durationMs;
      return d >= 20_000 && d <= 70_000;
    }),
  );

  check("天赋加成有吸引力但不至于不用本命就玩不下去",
    SPECIES_BONUS > 1.1 && SPECIES_BONUS < 1.6,
    `×${SPECIES_BONUS}`,
  );

  /* --- 每天靠小游戏能赚多少 vs 一个道具多少钱 --- */
  const bestCasePerDay = DAILY_GAME_COIN_CAP;
  const cheapest = Math.min(...ITEM_IDS.map((id) => ITEMS[id].price));
  const priciest = Math.max(...ITEM_IDS.map((id) => ITEMS[id].price));
  console.log(
    `  日上限 ${bestCasePerDay} 币 ≈ 便宜道具 ${Math.floor(bestCasePerDay / cheapest)} 个 / 贵道具 ${Math.floor(bestCasePerDay / priciest)} 个`,
  );
  check(
    "日上限买得起至少 6 个便宜道具（不至于抠门到没人想玩）",
    bestCasePerDay / cheapest >= 6,
  );
  check(
    "日上限买不起 100 个便宜道具（不至于滥发到道具失去意义）",
    bestCasePerDay / cheapest < 100,
  );
}

/* ============================================================
   11. 家园与装扮
   ============================================================ */
console.log("\n── 11. 家园与野生访客 ──");
{
  /** 把院子按固定步长推进 hours 小时，统计到访次数与见过的种类 */
  function runYard(placed: (PlacementId | null)[], hours: number, seed = 20260930) {
    let h: Habitat = { ...createHabitat(seed), placed };
    let visits = 0;
    const seen = new Set<string>();
    let had = h.visitor !== null;

    const stepMs = 30_000;
    const steps = Math.round((hours * HOUR) / stepMs);
    for (let i = 0; i < steps; i++) {
      h = stepHabitat(h, stepMs);
      const has = h.visitor !== null;
      if (has && !had) visits++;
      if (h.visitor) seen.add(h.visitor.id);
      had = has;
    }
    return { visits, seen, endState: h };
  }

  const emptyYard: (PlacementId | null)[] = [null, null, null];
  const loadedYard: (PlacementId | null)[] = ["birdSeed", "waterBowl", "flowerPot"];

  const emptyRun = runYard(emptyYard, 12);
  const loadedRun = runYard(loadedYard, 12);

  console.log(
    `  12 小时到访次数：空院子 ${emptyRun.visits} ｜ 摆满 ${loadedRun.visits}（见过 ${loadedRun.seen.size} 种）`,
  );

  check("空院子也会有访客（不是必须买东西）", emptyRun.visits > 0, `${emptyRun.visits} 次`);
  check("摆对东西明显更容易招来访客", loadedRun.visits > emptyRun.visits, `${emptyRun.visits} → ${loadedRun.visits}`);
  check("12 小时内能见到多种访客", loadedRun.seen.size >= 3, `${loadedRun.seen.size} 种`);

  // 同一时间只能有一位访客，否则院子会变成动物园
  let h = { ...createHabitat(7), placed: loadedYard };
  let maxConcurrent = 0;
  for (let i = 0; i < 500; i++) {
    h = stepHabitat(h, 30_000);
    maxConcurrent = Math.max(maxConcurrent, h.visitor ? 1 : 0);
  }
  check("同时最多只有一位访客", maxConcurrent === 1);

  // 访客一定会走
  let stayedTooLong = false;
  let probe = { ...createHabitat(11), placed: loadedYard };
  let guard = 0;
  while (!probe.visitor && guard++ < 2000) probe = stepHabitat(probe, 30_000);
  if (probe.visitor) {
    const arrivedWith = probe.visitor.remainingMs;
    let elapsed = 0;
    while (probe.visitor && elapsed < arrivedWith + 60_000) {
      probe = stepHabitat(probe, 30_000);
      elapsed += 30_000;
    }
    stayedTooLong = probe.visitor !== null;
  }
  check("访客停留时长到了就会离开", !stayedTooLong);

  /* --- 摆件权重 --- */
  const likesSeed = weightFor(VISITORS.squirrel, ["birdSeed", null, null]);
  const noLikes = weightFor(VISITORS.squirrel, [null, null, null]);
  check("摆出它喜欢的东西会提升权重", likesSeed > noLikes, `${noLikes} → ${likesSeed}`);

  const allVisitorIds = new Set(VISITOR_IDS);
  check("访客 id 无重复", allVisitorIds.size === VISITOR_IDS.length, `${allVisitorIds.size} 只`);

  // 每只访客的 likes 都必须是真实存在的摆件，否则那个字段永远不生效
  const badLikes = VISITOR_IDS.flatMap((id) =>
    VISITORS[id].likes.filter((p) => !PLACEMENT_IDS.includes(p)).map((p) => `${id}→${p}`),
  );
  check("访客喜欢的摆件都真实存在", badLikes.length === 0, badLikes.join(", ") || "全部有效");

  const unlikedPlacements = PLACEMENT_IDS.filter(
    (p) => !VISITOR_IDS.some((v) => VISITORS[v].likes.includes(p)),
  );
  check("每个摆件都至少能吸引一种访客（没有摆设是废的）", unlikedPlacements.length === 0, unlikedPlacements.join(", ") || "全部有用");

  /* --- 装扮 --- */
  const base = defaultEquipped();
  const withHat = toggleEquip(base, "strawHat");
  check("穿上帽子后槽位有值", withHat.hat === "strawHat");

  const withBothHats = toggleEquip(withHat, "crown");
  check("同槽位只能有一件（换帽子会顶掉旧的）", withBothHats.hat === "crown", String(withBothHats.hat));
  check("换帽子不会凭空多出槽位", Object.keys(withBothHats).length === 1);

  const removed = toggleEquip(withBothHats, "crown");
  check("重复点同一件会脱下来", removed.hat === undefined);

  const outfit = { hat: "crown", face: "glasses", neck: "scarf", back: "balloon" } as const;
  const order = equippedList(outfit);
  console.log(`  绘制顺序: ${order.join(" → ")}`);
  check(
    "绘制顺序固定为 背饰→颈部→面部→帽子（否则会穿戴穿帮）",
    order.join(",") === "balloon,scarf,glasses,crown",
    order.join(","),
  );

  check(
    "四个槽位都有饰品可买",
    SLOTS.every((s) => accessoriesInSlot(s).length >= 2),
  );

  /* --- 跨文件一致性 --- */
  const zh = JSON.parse(
    readFileSync(new URL("../src/i18n/locales/zh.json", import.meta.url), "utf8"),
  ) as Record<string, Record<string, string>>;

  const missingVisitorText = VISITOR_IDS.filter((id) => !zh.visitor?.[id]);
  check("每只访客都有中文名", missingVisitorText.length === 0, missingVisitorText.join(", ") || "全部齐备");

  const missingPlacementText = PLACEMENT_IDS.filter((id) => !zh.placement?.[id]);
  check("每个摆件都有中文名", missingPlacementText.length === 0, missingPlacementText.join(", ") || "全部齐备");

  const missingAccessoryText = ACCESSORY_IDS.filter((id) => !zh.accessory?.[id]);
  check("每件饰品都有中文名", missingAccessoryText.length === 0, missingAccessoryText.join(", ") || "全部齐备");
}

/* ============================================================
   12. 音频
   ============================================================ */
console.log("\n── 12. 音频 ──");
{
  /* --- 触摸安全区 --- */
  console.log(
    `  接水果篮子高度 ${(BASKET_Y_RATIO * 100).toFixed(0)}%，手指遮挡区底部 ${(TOUCH_SAFE_BOTTOM_RATIO * 100).toFixed(0)}%`,
  );
  check(
    "篮子避开了手指遮挡区（实机教训：贴底时玩家看不见篮子和判定范围）",
    BASKET_Y_RATIO <= 1 - TOUCH_SAFE_BOTTOM_RATIO,
    `${(BASKET_Y_RATIO * 100).toFixed(0)}% vs 安全上限 ${((1 - TOUCH_SAFE_BOTTOM_RATIO) * 100).toFixed(0)}%`,
  );

  /* --- 每个小游戏都有音效 --- */
  const GAME_FILES = [
    "CatchFruit",
    "BubblePop",
    "RhythmTap",
    "RockPaperScissors",
    "Fishing",
    "MemoryMatch",
  ];
  const silentGames = GAME_FILES.filter((name) => {
    const src = readFileSync(new URL(`../src/minigames/${name}.tsx`, import.meta.url), "utf8");
    return !src.includes("playSfx(");
  });
  check(
    "六个小游戏都接了音效（玩家反馈「有些游戏没声音」就是靠这条防漏）",
    silentGames.length === 0,
    silentGames.join(", ") || "全部有声",
  );

  /* --- 声明了却没人用的音效 = 死代码 --- */
  const sfxSrc = readFileSync(new URL("../src/audio/sfx.ts", import.meta.url), "utf8");
  const unionStart = sfxSrc.indexOf("export type SfxName =");
  const unionEnd = sfxSrc.indexOf(";", unionStart);
  const declared = [...sfxSrc.slice(unionStart, unionEnd).matchAll(/"([a-zA-Z]+)"/g)].map(
    (m) => m[1],
  );
  check("音效表非空", declared.length > 0, `声明了 ${declared.length} 个音效`);

  const srcDir = fileURLToPath(new URL("../src", import.meta.url));
  const allSources = walkDir(srcDir)
    .filter((f) => /\.(ts|tsx)$/.test(f) && !f.endsWith("sfx.ts"))
    .map((f) => readFileSync(f, "utf8"))
    .join("\n");

  const unused = declared.filter((name) => !allSources.includes(`"${name}"`));
  check(
    "没有声明了却从未使用的音效",
    unused.length === 0,
    unused.join(", ") || "全部在用",
  );
}

/* ============================================================
   13. 旅行与明信片
   ============================================================ */
console.log("\n── 13. 旅行与明信片 ──");
{
  /* --- 便当定价与时长必须同向 --- */
  const bentoOrder: BentoId[] = ["riceBall", "bento", "feast"];
  const prices = bentoOrder.map((b) => BENTOS[b].price);
  const durations = bentoOrder.map((b) => BENTOS[b].durationMs);
  const priceRises = prices.every((p, i) => i === 0 || p > (prices[i - 1] ?? 0));
  const durationRises = durations.every((d, i) => i === 0 || d > (durations[i - 1] ?? 0));
  console.log(`  便当：${prices.map((p, i) => `${prices[i]}币/${durations[i]! / 60_000}分`).join(" → ")}`);
  check("越贵的便当走得越久（这是真取舍，不是贵的就是好的）", priceRises && durationRises);

  const badWeights = BENTO_IDS.filter((b) => {
    const w = BENTOS[b].weights;
    return Math.abs(w.common + w.rare + w.legendary - 1) > 1e-9;
  });
  check("每档便当的稀有度权重之和为 1", badWeights.length === 0, badWeights.join(", ") || "全部正确");

  /* --- 长途确实更容易出稀有 --- */
  function rarityMix(bento: BentoId, runs = 600) {
    const counts: Record<Rarity, number> = { common: 0, rare: 0, legendary: 0 };
    for (let i = 0; i < runs; i++) {
      const reward = resolveTrip(
        { bento, remainingMs: 0, totalMs: BENTOS[bento].durationMs, seed: i * 7919 + 13 },
        [],
      );
      for (const id of reward.postcards) counts[POSTCARDS[id].rarity] += 1;
    }
    const total = counts.common + counts.rare + counts.legendary || 1;
    return { counts, rareShare: (counts.rare + counts.legendary) / total };
  }

  const shortMix = rarityMix("riceBall");
  const longMix = rarityMix("feast");
  console.log(
    `  稀有以上占比：饭团 ${(shortMix.rareShare * 100).toFixed(0)}% ｜ 豪华大餐 ${(longMix.rareShare * 100).toFixed(0)}%`,
  );
  check("长途带回稀有照片的概率明显更高", longMix.rareShare > shortMix.rareShare * 1.8);
  check("短途也确实拿得到稀有（不是完全没希望）", shortMix.rareShare > 0.05, `${(shortMix.rareShare * 100).toFixed(0)}%`);
  check("豪华大餐保证能出传说", longMix.counts.legendary > 0, `${longMix.counts.legendary} 张`);

  /* --- 重复照片不能变成纯挫败 --- */
  const one = resolveTrip(
    { bento: "feast", remainingMs: 0, totalMs: BENTOS.feast.durationMs, seed: 12345 },
    [],
  );
  const dup = resolveTrip(
    { bento: "feast", remainingMs: 0, totalMs: BENTOS.feast.durationMs, seed: 12345 },
    one.postcards,
  );
  console.log(`  同一批照片：首次 ${one.coins} 币 → 重复 ${dup.coins} 币`);
  check("已拥有的照片仍折算成金币（重复不等于白跑）", dup.coins > 0);
  check("但比首次少（不能让刷重复变成赚币手段）", dup.coins < one.coins);
  check("重复时不再计入 newPostcards", dup.newPostcards.length === 0);

  /* --- 归来 --- */
  let travel: Travel = {
    active: { bento: "riceBall", remainingMs: BENTOS.riceBall.durationMs, totalMs: BENTOS.riceBall.durationMs, seed: 999 },
    postcards: [],
    tripCount: 0,
  };
  let arrived: TripReward | null = null;
  for (let i = 0; i < 200 && !arrived; i++) {
    const r = stepTravel(travel, 60_000);
    travel = r.travel;
    arrived = r.arrived;
  }
  check("到时一定归来", arrived !== null);
  check("归来后不再处于旅行中", travel.active === null);
  check("归来后出行次数 +1", travel.tripCount === 1);
  check("带回的照片并入收藏", travel.postcards.length > 0, `${travel.postcards.length} 张`);
  check("重复推进不会重复结算", stepTravel(travel, 60_000).arrived === null);

  /* --- 旅行期间需求衰减更慢（这条决定了玩家敢不敢用这个功能）--- */
  const home24 = advanceTo(fresh(), BASE + HATCH_MS + 1000 + 24 * HOUR).state;
  let awayRun = createState("puddly", BASE);
  awayRun = advanceTo(awayRun, BASE + HATCH_MS + 1000).state;
  awayRun = {
    ...awayRun,
    travel: {
      ...awayRun.travel,
      active: { bento: "feast", remainingMs: 6 * HOUR, totalMs: 6 * HOUR, seed: 1 },
    },
  };
  awayRun = advanceTo(awayRun, awayRun.clock.lastTickAt + 6 * HOUR).state;

  const home6 = advanceTo(
    { ...fresh(), clock: { lastTickAt: BASE, totalPlayedMs: 0 } },
    BASE + HATCH_MS + 1000 + 6 * HOUR,
  ).state;

  const awayDrop = INITIAL_NEEDS.satiety - awayRun.pet.needs.satiety;
  const homeDrop = INITIAL_NEEDS.satiety - home6.pet.needs.satiety;
  console.log(`  6 小时饱食下降：在家 ${homeDrop.toFixed(1)} ｜ 出门 ${awayDrop.toFixed(1)}`);
  check("出门在外需求掉得明显更慢", awayDrop < homeDrop * 0.5, `${awayDrop.toFixed(1)} vs ${homeDrop.toFixed(1)}`);
  check("但也不是完全冻结（叙事上说不通）", awayDrop > 1);

  /* --- 出发门槛 --- */
  const weakPet = { needs: { satiety: 20, mood: 20, energy: 10 } };
  check("状态太差时不允许出门", departBlockers(weakPet).length === 3, departBlockers(weakPet).join(","));
  const finePet = { needs: { satiety: 80, mood: 80, energy: 80 } };
  check("状态良好时没有阻拦", departBlockers(finePet).length === 0);

  /* --- 跨文件一致性 --- */
  const zh2 = JSON.parse(
    readFileSync(new URL("../src/i18n/locales/zh.json", import.meta.url), "utf8"),
  ) as Record<string, Record<string, string>>;

  const missingPostcard = POSTCARD_IDS.filter((id) => !zh2.postcard?.[id]);
  check("每张明信片都有中文名", missingPostcard.length === 0, missingPostcard.join(", ") || "全部齐备");

  const missingBento = BENTO_IDS.filter((id) => !zh2.bento?.[id]?.name);
  check("每档便当都有中文名", missingBento.length === 0, missingBento.join(", ") || "全部齐备");

  // 明信片美术必须覆盖全部 id，否则图鉴会出现空白格子
  const postcardArtSrc = readFileSync(
    new URL("../src/render/postcardArt.tsx", import.meta.url),
    "utf8",
  );
  const missingArt = POSTCARD_IDS.filter((id) => !postcardArtSrc.includes(`${id}: (`));
  check("每张明信片都有绘制实现", missingArt.length === 0, missingArt.join(", ") || "全部齐备");

  const rarities: Rarity[] = ["common", "rare", "legendary"];
  const missingRarity = rarities.filter((r) => !zh2.rarity?.[r]);
  check("三档稀有度都有中文名", missingRarity.length === 0, missingRarity.join(", ") || "全部齐备");
  check(
    "每档稀有度都有对应的明信片",
    rarities.every((r) => postcardsOfRarity(r).length > 0),
  );
}

/* ============================================================
   14. 安卓工程（本机没有 Java/SDK，XML 校验是唯一能做的「编译」代理）
   ============================================================ */
console.log("\n── 14. 安卓工程 ──");

const ANDROID = fileURLToPath(new URL("../android", import.meta.url));

if (!existsSync(ANDROID)) {
  console.log("  ⏭  没有 android/ 目录（未执行 npx cap add android），跳过");
} else {
  const resDir = join(ANDROID, "app", "src", "main", "res");

  /* --- XML 合法性 ---
     这条最有价值：本机编译不了，但 XML 写错（比如注释夹在属性中间）
     会直接让 CI 构建失败，而那种错要等好几分钟才暴露。 */
  const xmlFiles = walkDir(join(ANDROID, "app", "src", "main")).filter((f) =>
    f.endsWith(".xml"),
  );
  const badXml: string[] = [];
  for (const f of xmlFiles) {
    const result = XMLValidator.validate(readFileSync(f, "utf8"));
    if (result !== true) {
      badXml.push(`${f.split(/[/\\]/).pop()}: ${result.err.msg}`);
    }
  }
  check(`Android 的 ${xmlFiles.length} 个 XML 全部合法`, badXml.length === 0, badXml.join(" | ") || "全部通过");

  /* --- 同一个 values 目录内不能有重复资源 ---
     这条是血的教训：我生成的 values/colors.xml 和 Capacitor 原有的
     values/ic_launcher_background.xml 都定义了 ic_launcher_background，
     导致构建在 MergeResources 任务上失败，而报错只有一个 Kotlin 堆栈，
     完全不提「重复资源」四个字。
     —— values 与 values-zh 之间的同名是合法的语言变体，不算冲突。 */
  const dupResources: string[] = [];
  for (const dir of readdirSync(resDir)) {
    if (!dir.startsWith("values")) continue;
    const full = join(resDir, dir);
    if (!statSync(full).isDirectory()) continue;

    const seen = new Map<string, string>();
    for (const file of readdirSync(full)) {
      if (!file.endsWith(".xml")) continue;
      const text = readFileSync(join(full, file), "utf8");
      for (const m of text.matchAll(
        /<(color|string|style|dimen|bool|integer)\s+name="([^"]+)"/g,
      )) {
        const key = `${m[1]}:${m[2]}`;
        const prev = seen.get(key);
        if (prev) dupResources.push(`${dir} 里 ${key} 同时在 ${prev} 和 ${file}`);
        else seen.set(key, file);
      }
    }
  }
  check(
    "同一个 values 目录内没有重复资源（会让资源合并任务直接失败）",
    dupResources.length === 0,
    dupResources.slice(0, 2).join(" | ") || "无冲突",
  );

  /* --- appId 必须和 build.gradle 一致 --- */
  const capConfig = readFileSync(new URL("../capacitor.config.ts", import.meta.url), "utf8");
  const capAppId = /appId:\s*"([^"]+)"/.exec(capConfig)?.[1];
  const gradle = readFileSync(join(ANDROID, "app", "build.gradle"), "utf8");
  const gradleAppId = /applicationId\s+"([^"]+)"/.exec(gradle)?.[1];
  check(
    "capacitor.config 的 appId 与 build.gradle 的 applicationId 一致",
    Boolean(capAppId) && capAppId === gradleAppId,
    `${capAppId} vs ${gradleAppId}`,
  );

  /* --- 图标齐全且尺寸正确 --- */
  const DENSITIES: Array<[string, number, number]> = [
    ["mdpi", 48, 108],
    ["hdpi", 72, 162],
    ["xhdpi", 96, 216],
    ["xxhdpi", 144, 324],
    ["xxxhdpi", 192, 432],
  ];
  const iconProblems: string[] = [];
  for (const [density, legacy, fg] of DENSITIES) {
    for (const [file, expect] of [
      ["ic_launcher.png", legacy],
      ["ic_launcher_round.png", legacy],
      ["ic_launcher_foreground.png", fg],
    ] as const) {
      const p = join(resDir, `mipmap-${density}`, file);
      if (!existsSync(p)) {
        iconProblems.push(`缺 ${density}/${file}`);
        continue;
      }
      const buf = readFileSync(p);
      const isPng = buf.subarray(0, 8).toString("hex") === "89504e470d0a1a0a";
      if (!isPng) {
        iconProblems.push(`${density}/${file} 不是 PNG`);
        continue;
      }
      const w = buf.readUInt32BE(16);
      const h = buf.readUInt32BE(20);
      if (w !== expect || h !== expect) iconProblems.push(`${density}/${file} 是 ${w}×${h}，应为 ${expect}`);
    }
  }
  check("五档密度的图标齐全且尺寸正确", iconProblems.length === 0, iconProblems.slice(0, 3).join(" | ") || "全部正确");

  /* --- 启动图齐全 --- */
  const splashMissing = ["drawable-port-mdpi", "drawable-port-xxxhdpi", "drawable-land-mdpi"].filter(
    (d) => !existsSync(join(resDir, d, "splash.png")),
  );
  check("启动图已生成", splashMissing.length === 0, splashMissing.join(", ") || "齐全");

  /* --- 字符串与本地化 --- */
  const strings = readFileSync(join(resDir, "values", "strings.xml"), "utf8");
  check("strings.xml 定义了 app_name", /name="app_name"/.test(strings));
  check(
    "有中文应用名（中文手机上桌面显示中文）",
    existsSync(join(resDir, "values-zh", "strings.xml")),
  );

  /* --- 竖屏锁定 --- */
  const manifest = readFileSync(join(ANDROID, "app", "src", "main", "AndroidManifest.xml"), "utf8");
  check(
    "锁定了竖屏（横屏会把宠物压扁、操作区挤出屏幕）",
    /android:screenOrientation="portrait"/.test(manifest),
  );
}

/* --- CI 流水线 --- */
const WORKFLOWS = fileURLToPath(new URL("../.github/workflows", import.meta.url));

if (!existsSync(WORKFLOWS)) {
  check("存在 GitHub Actions 流水线", false, "没有 .github/workflows/");
} else {
  const files = readdirSync(WORKFLOWS).filter((f) => f.endsWith(".yml") || f.endsWith(".yaml"));
  check("存在 GitHub Actions 流水线", files.length > 0, `${files.length} 个`);

  const badYaml: string[] = [];
  const parsed = new Map<string, string>();
  for (const f of files) {
    const src = readFileSync(join(WORKFLOWS, f), "utf8");
    try {
      parseYaml(src);
      parsed.set(f, src);
    } catch (err) {
      badYaml.push(`${f}: ${(err as Error).message}`);
    }
  }
  check("流水线 YAML 语法合法", badYaml.length === 0, badYaml.join(" | ") || "全部通过");

  const allWorkflowSrc = [...parsed.values()].join("\n");

  // 这条是本项目特有的坑：Windows 上的 Git 不保留可执行位，
  // 少了 chmod，gradlew 在 CI 里会以 Permission denied 直接失败
  check(
    "流水线里有 chmod +x android/gradlew（Windows 提交的仓库必须补这一步）",
    /chmod \+x android\/gradlew/.test(allWorkflowSrc),
  );
  check(
    "流水线会产出并上传 APK",
    /assembleDebug/.test(allWorkflowSrc) && /upload-artifact/.test(allWorkflowSrc),
  );
  check(
    "流水线包含质量门禁（数值模拟 + 渲染冒烟）",
    /npm run check/.test(allWorkflowSrc),
  );
  // 打包与测试拆成并行作业：测试环境一旦有差异，不会连累 APK 出不来
  check(
    "打包与测试是两个独立作业（测试失败不阻塞出包）",
    /^\s{2}apk:/m.test(allWorkflowSrc) && /^\s{2}verify:/m.test(allWorkflowSrc),
  );
}

/* --- .gitignore 必须挡住构建产物，否则仓库会爆炸 --- */
const gitignore = readFileSync(new URL("../.gitignore", import.meta.url), "utf8");
const mustIgnore = ["node_modules", "dist", ".smoke"];
const missingIgnore = mustIgnore.filter((p) => !gitignore.includes(p));
check(".gitignore 忽略了 node_modules / dist / .smoke", missingIgnore.length === 0, missingIgnore.join(", ") || "齐全");

console.log(failures === 0 ? "\n✅ 全部通过\n" : `\n❌ ${failures} 项未通过\n`);
process.exit(failures === 0 ? 0 : 1);
