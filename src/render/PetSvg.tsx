/* ============================================================
   宠物 SVG 渲染
   全部由代码生成，无位图素材。

   造型遵循「婴儿图式」（baby schema）—— 跨文化公认的可爱触发器：
     · 头部占比大（≥50%）
     · 眼睛大、间距宽、高光明显
     · 身体圆润无棱角
     · 四肢短小
   眼睛高光是可爱度的命门，任何表情状态下都不能省。

   最终长相 = 种族基础形体 × 进化线配色/部件 × 阶段体型。
   三者正交，所以加一条进化线不用碰这个文件。
   ============================================================ */

import type { ReactNode } from "react";

import { EVOLUTIONS, isEvolutionLineId, type PartId } from "../core/evolution";
import type { PetStatus, Species, Stage } from "../core/types";
import { ACCESSORIES, equippedList, type Equipped } from "../core/wardrobe";

import { ACCESSORY_ART, ANCHORS } from "./accessories";
import { STILL_GAZE, type Gaze } from "./gaze";
import { PARTS, PART_LAYER } from "./parts";
import "./petAnimations.css";

const INK = "#4A3B63";

/* ============================================================
   各阶段的体型 —— 让「长大」这件事肉眼可见
   ============================================================ */

const STAGE_SCALE: Record<Stage, number> = {
  egg: 1,
  baby: 0.7,
  child: 0.87,
  adult: 1,
  elder: 1.05,
};

/* ============================================================
   种族基础形体
   ============================================================ */

interface SpeciesArt {
  color: string;
  shade: string;
  blush: string;
  body: ReactNode;
  eyeX: number;
  eyeY: number;
  eyeR: number;
  eyeRy: number;
  cheekX: number;
  cheekY: number;
  cheekR: number;
  mouthY: number;
}

const ART: Record<Species, SpeciesArt> = {
  /* ---------- 布丁兽：果冻布丁，宽底圆顶 ---------- */
  puddly: {
    color: "#FFD98E",
    shade: "#F2B95C",
    blush: "#FF6B9D",
    eyeX: 22,
    eyeY: 104,
    eyeR: 11,
    eyeRy: 13,
    cheekX: 40,
    cheekY: 124,
    cheekR: 9,
    mouthY: 132,
    body: (
      <>
        <path
          d="M100 28 C138 28 168 66 170 112 C171 148 152 176 100 176 C48 176 29 148 30 112 C32 66 62 28 100 28 Z"
          fill="currentColor"
        />
        <ellipse cx="100" cy="46" rx="34" ry="12" fill="#fff" opacity=".38" />
        <ellipse cx="66" cy="70" rx="14" ry="20" fill="#fff" opacity=".45" />
        <path
          d="M40 146 C60 168 140 168 160 146 C150 172 122 180 100 180 C78 180 50 172 40 146 Z"
          fill="#000"
          opacity=".07"
        />
      </>
    ),
  },

  /* ---------- 麻薯猫：圆身 + 三角耳 ---------- */
  mochi: {
    color: "#FFF3E4",
    shade: "#EBD9C4",
    blush: "#FF8FB1",
    eyeX: 21,
    eyeY: 106,
    eyeR: 11,
    eyeRy: 13,
    cheekX: 39,
    cheekY: 124,
    cheekR: 8,
    mouthY: 132,
    body: (
      <>
        <path d="M54 72 L44 24 L92 54 Z" fill="currentColor" />
        <path d="M146 72 L156 24 L108 54 Z" fill="currentColor" />
        <path d="M58 66 L52 38 L84 56 Z" fill="#FFC2D6" />
        <path d="M142 66 L148 38 L116 56 Z" fill="#FFC2D6" />
        <circle cx="100" cy="110" r="64" fill="currentColor" />
        <ellipse cx="76" cy="72" rx="18" ry="12" fill="#fff" opacity=".55" />
        <path
          d="M42 140 C60 172 140 172 158 140 C150 170 126 180 100 180 C74 180 50 170 42 140 Z"
          fill="#000"
          opacity=".06"
        />
      </>
    ),
  },

  /* ---------- 云朵羊：多圆叠加的蓬松身体 ---------- */
  cloudpuff: {
    color: "#E8F6FF",
    shade: "#CBE6F7",
    blush: "#FFA6C9",
    eyeX: 22,
    eyeY: 108,
    eyeR: 11,
    eyeRy: 13,
    cheekX: 40,
    cheekY: 126,
    cheekR: 9,
    mouthY: 134,
    body: (
      <>
        <circle cx="72" cy="102" r="36" fill="currentColor" />
        <circle cx="128" cy="102" r="36" fill="currentColor" />
        <circle cx="100" cy="74" r="34" fill="currentColor" />
        <circle cx="100" cy="128" r="36" fill="currentColor" />
        <circle cx="100" cy="102" r="46" fill="currentColor" />
        <circle cx="46" cy="126" r="16" fill="currentColor" />
        <circle cx="154" cy="126" r="16" fill="currentColor" />
        <circle cx="100" cy="42" r="16" fill="currentColor" />
        <ellipse cx="74" cy="72" rx="18" ry="12" fill="#fff" opacity=".6" />
      </>
    ),
  },

  /* ---------- 芽芽龙：圆身 + 头顶嫩芽 + 尾巴 ---------- */
  sprout: {
    color: "#C9F2C7",
    shade: "#A6DFA4",
    blush: "#FF9EC4",
    eyeX: 21,
    eyeY: 110,
    eyeR: 11,
    eyeRy: 13,
    cheekX: 39,
    cheekY: 128,
    cheekR: 8,
    mouthY: 136,
    body: (
      <>
        <path d="M164 138 C186 132 190 108 176 100 C182 118 176 128 160 130 Z" fill="currentColor" />
        <path
          d="M100 46 C140 46 168 78 168 118 C168 154 140 176 100 176 C60 176 32 154 32 118 C32 78 60 46 100 46 Z"
          fill="currentColor"
        />
        <path d="M100 48 L100 20" stroke={INK} strokeWidth="3.5" strokeLinecap="round" fill="none" />
        <path d="M100 30 C84 26 74 32 72 44 C86 48 96 42 100 30 Z" fill="#8FD98C" />
        <path d="M100 26 C116 20 128 26 130 38 C116 44 104 38 100 26 Z" fill="#6FC96C" />
        <ellipse cx="100" cy="140" rx="38" ry="26" fill="#fff" opacity=".35" />
        <ellipse cx="74" cy="78" rx="16" ry="11" fill="#fff" opacity=".5" />
      </>
    ),
  },
};

/* ============================================================
   眼睛 —— 表情的主要载体
   ============================================================ */

type EyeStyle = "round" | "happy" | "sad" | "tired" | "closed" | "hungry";

function eyeStyleFor(status: PetStatus): EyeStyle {
  switch (status) {
    case "happy":
      return "happy";
    case "sad":
      return "sad";
    case "tired":
      return "tired";
    case "sleeping":
      return "closed";
    case "hungry":
      return "hungry";
    default:
      return "round";
  }
}

interface EyeProps {
  x: number;
  y: number;
  rx: number;
  ry: number;
  style: EyeStyle;
  gazeX: number;
  gazeY: number;
}

function Eye({ x, y, rx, ry, style, gazeX, gazeY }: EyeProps) {
  const cx = x + gazeX * 2.6;
  const cy = y + gazeY * 1.8;

  switch (style) {
    /* 开心：弯月眼 ^ ^ */
    case "happy":
      return (
        <path
          d={`M${cx - rx - 1} ${cy + ry * 0.35} Q${cx} ${cy - ry * 0.95} ${cx + rx + 1} ${cy + ry * 0.35}`}
          stroke={INK}
          strokeWidth="3.6"
          strokeLinecap="round"
          fill="none"
        />
      );

    /* 睡着：平缓下弯弧 */
    case "closed":
      return (
        <path
          d={`M${cx - rx} ${cy} Q${cx} ${cy + ry * 0.7} ${cx + rx} ${cy}`}
          stroke={INK}
          strokeWidth="3.4"
          strokeLinecap="round"
          fill="none"
        />
      );

    /* 累：半睁眼 */
    case "tired":
      return (
        <g>
          <ellipse cx={cx} cy={cy} rx={rx} ry={ry * 0.45} fill={INK} />
          <circle cx={cx + rx * 0.3} cy={cy - 1} r={2.6} fill="#fff" />
        </g>
      );

    /* 难过：放大下垂 + 八字眉 */
    case "sad":
      return (
        <g>
          <ellipse cx={cx} cy={cy + 1} rx={rx + 0.6} ry={ry + 0.6} fill={INK} />
          <circle cx={cx + 3} cy={cy - 2.6} r={3.4} fill="#fff" />
          <circle cx={cx - 2.6} cy={cy + 4.4} r={1.7} fill="#fff" opacity=".7" />
          <path
            d={`M${cx - rx - 2} ${cy - ry - 7} Q${cx} ${cy - ry - 4} ${cx + rx + 2} ${cy - ry - 9}`}
            stroke={INK}
            strokeWidth="2.6"
            strokeLinecap="round"
            fill="none"
          />
        </g>
      );

    /* 饿：瞪大 + 瞳孔外扩 */
    case "hungry":
      return (
        <g>
          <ellipse cx={cx} cy={cy} rx={rx + 1} ry={ry + 1} fill={INK} />
          <circle cx={cx + 3.4} cy={cy - 3.4} r={3.8} fill="#fff" />
          <circle cx={cx - 2.8} cy={cy + 4.6} r={1.6} fill="#fff" opacity=".65" />
        </g>
      );

    default:
      return (
        <g>
          <ellipse cx={cx} cy={cy} rx={rx} ry={ry} fill={INK} />
          <circle cx={cx + 3.5} cy={cy - 4} r={3.6} fill="#fff" />
          <circle cx={cx - 3} cy={cy + 4} r={1.8} fill="#fff" opacity=".7" />
        </g>
      );
  }
}

/* ============================================================
   身体状态的可视提示
   ============================================================ */

function StatusOverlay({ status, art }: { status: PetStatus; art: SpeciesArt }) {
  switch (status) {
    case "hungry":
      return (
        <g className="pet-overlay">
          <path
            d={`M${100 + 6} ${art.mouthY + 8} q4 8 -1 12 q-5 -4 -1 -12 z`}
            fill="#9FD8F5"
            opacity=".9"
          />
          <g className="pet-hunger-wave" stroke={INK} strokeWidth="2.2" fill="none" opacity=".5">
            <path d="M64 148 q5 -5 10 0 q5 5 10 0" />
            <path d="M70 158 q4 -4 8 0 q4 4 8 0" />
          </g>
        </g>
      );

    case "dirty":
      return (
        <g className="pet-overlay">
          <ellipse cx="72" cy="132" rx="9" ry="6" fill="#8A7BA3" opacity=".45" />
          <ellipse cx="128" cy="146" rx="7" ry="5" fill="#8A7BA3" opacity=".4" />
          <g className="pet-flies">
            <g>
              <circle r="3" fill={INK} />
              <path d="M-4 -3 l-4 -3 M4 -3 l4 -3" stroke={INK} strokeWidth="1.4" />
            </g>
            <g>
              <circle r="2.4" fill={INK} />
              <path d="M-3 -2 l-3 -2 M3 -2 l3 -2" stroke={INK} strokeWidth="1.2" />
            </g>
          </g>
        </g>
      );

    case "tired":
      return (
        <g className="pet-overlay">
          <g className="pet-sweat">
            <path d="M150 74 q5 8 0 11 q-5 -3 0 -11 z" fill="#9FD8F5" />
            <path d="M162 88 q3.5 6 0 8 q-3.5 -2 0 -8 z" fill="#9FD8F5" opacity=".7" />
          </g>
        </g>
      );

    case "sad":
      return (
        <g className="pet-overlay">
          <g className="pet-tear">
            <path d="M78 122 q4 7 0 10 q-4 -3 0 -10 z" fill="#9FD8F5" />
          </g>
          <g className="pet-tear pet-tear--delay">
            <path d="M122 122 q4 7 0 10 q-4 -3 0 -10 z" fill="#9FD8F5" />
          </g>
        </g>
      );

    default:
      return null;
  }
}

function mouthPath(status: PetStatus, y: number): string {
  switch (status) {
    case "happy":
      return `M86 ${y - 4} Q100 ${y + 12} 114 ${y - 4}`;
    case "sad":
      return `M86 ${y + 6} Q100 ${y - 7} 114 ${y + 6}`;
    case "hungry":
      return `M88 ${y} Q100 ${y + 11} 112 ${y}`;
    case "sleeping":
      return `M90 ${y + 2} Q100 ${y + 8} 110 ${y + 2}`;
    case "tired":
      return `M92 ${y + 2} Q100 ${y + 6} 108 ${y + 2}`;
    default:
      return `M90 ${y} Q100 ${y + 7} 110 ${y}`;
  }
}

/* ============================================================
   蛋 —— 每个生命开始的地方
   ============================================================ */

function Egg({
  species,
  hatchProgress,
}: {
  species: Species;
  hatchProgress: number;
}) {
  const art = ART[species];
  // 裂纹随孵化进度一条条出现，给玩家「快出来了」的期待
  const cracks = [
    "M100 62 l-9 12 l7 8 l-11 12",
    "M78 108 l10 -7 l6 9 l10 -6",
    "M124 96 l-9 9 l8 7 l-10 9",
  ];
  const visibleCracks = Math.floor(hatchProgress * (cracks.length + 1));

  return (
    <svg viewBox="0 0 200 200" className="pet-svg" style={{ color: art.color }} role="img" aria-label="egg">
      <ellipse className="pet-shadow" cx="100" cy="188" rx="44" ry="8" />

      <g className="pet-root is-egg">
        <g className="pet-body">
          <path
            d="M100 32 C128 32 150 74 150 120 C150 156 128 178 100 178 C72 178 50 156 50 120 C50 74 72 32 100 32 Z"
            fill="currentColor"
          />
          {/* 蛋壳斑点 —— 用种族色区分是谁的蛋 */}
          <ellipse cx="78" cy="104" rx="12" ry="15" fill={art.shade} opacity=".55" />
          <ellipse cx="122" cy="132" rx="10" ry="12" fill={art.shade} opacity=".45" />
          <ellipse cx="112" cy="80" rx="7" ry="9" fill={art.shade} opacity=".4" />
          <ellipse cx="84" cy="60" rx="20" ry="12" fill="#fff" opacity=".5" />

          {cracks.slice(0, visibleCracks).map((d) => (
            <path key={d} d={d} stroke={INK} strokeWidth="2.4" fill="none" strokeLinecap="round" opacity=".75" />
          ))}
        </g>
      </g>
    </svg>
  );
}

/* ============================================================
   主组件
   ============================================================ */

interface PetSvgProps {
  species: Species;
  stage: Stage;
  /**
   * 已确定的进化线；幼体阶段为 null，用种族默认配色。
   * 类型刻意放宽成 string：值来自存档，可能是脏数据，内部会校验。
   */
  evolution?: string | null;
  status: PetStatus;
  gaze?: Gaze;
  reaction?: { kind: string; key: number } | null;
  /** 蛋阶段的孵化进度 0..1，用于逐渐浮现裂纹 */
  hatchProgress?: number;
  /** 已穿戴的饰品 */
  accessories?: Equipped;
}

export function PetSvg({
  species,
  stage,
  evolution = null,
  status,
  gaze = STILL_GAZE,
  reaction,
  hatchProgress = 0,
  accessories = {},
}: PetSvgProps) {
  if (stage === "egg") {
    return <Egg species={species} hatchProgress={hatchProgress} />;
  }

  const base = ART[species];
  // 取值前校验：存档里的 evolution 可能是不认识的脏字符串
  const evo = isEvolutionLineId(evolution) ? EVOLUTIONS[evolution] : null;

  // 进化线只覆盖配色与部件，脸的位置沿用种族基础形体
  const color = evo?.palette.color ?? base.color;
  const accent = evo?.palette.accent ?? base.shade;
  const blush = evo?.palette.blush ?? base.blush;
  const opacity = evo?.bodyOpacity ?? 1;

  const scale = STAGE_SCALE[stage] * (evo?.scale ?? 1);
  const parts = evo ? [...evo.behind, ...evo.front.map((p) => p) as PartId[]] : [];

  const behind = parts.filter((p) => PART_LAYER[p] === "behind");
  const pattern = parts.filter((p) => PART_LAYER[p] === "pattern");
  const top = parts.filter((p) => PART_LAYER[p] === "top");

  // 饰品按槽位分层：背包/气球要露在身体外面，其余盖在脸上
  const anchors = ANCHORS[species];
  const worn = equippedList(accessories);
  const wornBehind = worn.filter((id) => ACCESSORIES[id].slot === "back");
  const wornFront = worn.filter((id) => ACCESSORIES[id].slot !== "back");

  const eyeStyle = eyeStyleFor(status);
  const mouth = mouthPath(status, base.mouthY);
  const blinking = eyeStyle === "round" || eyeStyle === "hungry";

  return (
    <svg
      viewBox="0 0 200 200"
      className="pet-svg"
      style={
        {
          color,
          ["--pet-blush" as string]: blush,
        } as React.CSSProperties
      }
      role="img"
      aria-label={evolution ?? species}
    >
      {/* 地面投影不随体型缩放，否则小幼体会有个巨大影子 */}
      <ellipse className="pet-shadow" cx="100" cy="188" rx={54 * Math.min(scale, 1)} ry="8" />

      {/* 以底部中心为锚点缩放 —— 这样宠物是「长高」而不是「浮空」 */}
      <g transform={`translate(100 176) scale(${scale}) translate(-100 -176)`}>
        <g className={`pet-root${status === "sleeping" ? " is-sleeping" : ""}`}>
          <g
            className={`pet-body${reaction ? ` react-${reaction.kind}` : ""}`}
            key={reaction ? reaction.key : "idle"}
          >
            {/* 1. 身后层：翅膀、尾巴、光环，以及背在身后的饰品 */}
            {behind.map((p) => PARTS[p](accent))}
            {wornBehind.map((id) => ACCESSORY_ART[id](anchors))}

            {/* 2. 身体本体 */}
            <g opacity={opacity}>{base.body}</g>

            {/* 3. 皮肤层：斑纹、裂纹、闪粉 —— 必须在五官之前，否则会画到眼睛上 */}
            {pattern.map((p) => PARTS[p](accent))}

            {/* 4. 五官 */}
            <g className="pet-gaze" style={{ transform: `translate(${gaze.x * 2.6}px, ${gaze.y * 1.8}px)` }}>
              <g className={blinking ? "pet-eye" : undefined}>
                <Eye x={100 - base.eyeX} y={base.eyeY} rx={base.eyeR} ry={base.eyeRy} style={eyeStyle} gazeX={gaze.x} gazeY={gaze.y} />
              </g>
              <g className={blinking ? "pet-eye" : undefined}>
                <Eye x={100 + base.eyeX} y={base.eyeY} rx={base.eyeR} ry={base.eyeRy} style={eyeStyle} gazeX={gaze.x} gazeY={gaze.y} />
              </g>
            </g>

            <circle cx={100 - base.cheekX} cy={base.cheekY} r={base.cheekR} fill={blush} opacity=".5" />
            <circle cx={100 + base.cheekX} cy={base.cheekY} r={base.cheekR} fill={blush} opacity=".5" />

            <path d={mouth} stroke={INK} strokeWidth="3.2" strokeLinecap="round" fill="none" />

            <StatusOverlay status={status} art={base} />

            {/* 5. 头顶层：花冠、角、火焰 —— 盖住一切 */}
            {top.map((p) => PARTS[p](accent))}

            {/* 6. 饰品：围巾 → 眼镜 → 帽子，顺序固定，否则会出现穿戴穿帮 */}
            {wornFront.map((id) => ACCESSORY_ART[id](anchors))}
          </g>
        </g>
      </g>

      {status === "sleeping" && (
        <g className="pet-zzz" fill={INK} fontWeight="900">
          <text x="152" y="62" fontSize="18">z</text>
          <text x="166" y="44" fontSize="13">z</text>
          <text x="176" y="30" fontSize="10">z</text>
        </g>
      )}
    </svg>
  );
}
