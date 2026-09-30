/* ============================================================
   明信片风景
   统一 120×84（约 10:7 的明信片比例）的 viewBox。
   每张只用几个形状堆出「一眼能认出是哪儿」的意象 ——
   明信片是收藏品，辨识度比细节重要。
   ============================================================ */

import type { ReactNode } from "react";

import type { PostcardId } from "../core/travel";

/** 天空底色 */
function Sky({ from, to, id }: { from: string; to: string; id: string }) {
  return (
    <>
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={from} />
          <stop offset="100%" stopColor={to} />
        </linearGradient>
      </defs>
      <rect x="0" y="0" width="120" height="84" fill={`url(#${id})`} />
    </>
  );
}

/** 明信片的白色描边内衬，统一所有场景的边界感 */
function Frame() {
  return (
    <rect
      x="2"
      y="2"
      width="116"
      height="80"
      rx="6"
      fill="none"
      stroke="rgba(74,59,99,0.28)"
      strokeWidth="2"
    />
  );
}

const POSTCARD_ART: Record<PostcardId, ReactNode> = {
  beach: (
    <g>
      <Sky from="#BFE9FF" to="#FFF0D9" id="pc-beach" />
      <circle cx="92" cy="22" r="11" fill="#FFE066" />
      <rect x="0" y="46" width="120" height="20" fill="#8FD4F0" />
      <path d="M0 46 q14 -5 28 0 t28 0 t28 0 t28 0 v6 H0 Z" fill="#B5E8F7" opacity=".8" />
      <path d="M0 64 q22 -7 46 -2 t74 2 V84 H0 Z" fill="#F2D08A" />
      <path d="M28 52 q6 -16 4 -22 q8 10 6 22 Z" fill="#6FC96C" />
      <Frame />
    </g>
  ),

  forest: (
    <g>
      <Sky from="#D9F0FF" to="#EAF7E4" id="pc-forest" />
      <path d="M0 84 V40 L18 20 L36 42 V84 Z" fill="#4E8F4A" />
      <path d="M26 84 V34 L48 12 L70 36 V84 Z" fill="#3C7A3A" />
      <path d="M62 84 V44 L82 24 L104 46 V84 Z" fill="#4E8F4A" />
      <path d="M96 84 V50 L112 34 L120 44 V84 Z" fill="#3C7A3A" />
      <path d="M48 12 L56 22 L48 24 L40 22 Z" fill="#2F5F2E" />
      <Frame />
    </g>
  ),

  flowerField: (
    <g>
      <Sky from="#CFEBFF" to="#FFF6E0" id="pc-flower" />
      <circle cx="24" cy="20" r="9" fill="#FFE066" />
      <path d="M0 52 q30 -8 60 -2 t60 0 V84 H0 Z" fill="#A8DE8C" />
      <path d="M0 64 q30 -6 60 -1 t60 0 V84 H0 Z" fill="#8FCE74" />
      {(
        [
          [16, 58, "#FF6B9D"],
          [34, 66, "#FFF3B0"],
          [52, 56, "#FF8FB1"],
          [72, 68, "#FFE066"],
          [90, 60, "#C7A0FF"],
          [106, 70, "#FF6B9D"],
        ] as const
      ).map(([x, y, c]) => (
        <g key={`${x}-${y}`}>
          <path d={`M${x} ${y + 8} L${x} ${y + 2}`} stroke="#5FAE4A" strokeWidth="1.6" />
          <circle cx={x} cy={y} r="4" fill={c} />
          <circle cx={x} cy={y} r="1.6" fill="#FFE066" />
        </g>
      ))}
      <Frame />
    </g>
  ),

  lake: (
    <g>
      <Sky from="#D6ECFF" to="#F2E6FF" id="pc-lake" />
      <path d="M0 50 L26 26 L52 50 Z" fill="#8FA9C7" />
      <path d="M40 50 L70 20 L100 50 Z" fill="#7694B5" />
      <path d="M70 20 L82 31 L70 34 L58 31 Z" fill="#EAF4FF" />
      <rect x="0" y="50" width="120" height="34" fill="#9ED4E8" />
      <path d="M0 54 q20 3 40 0 t40 0 t40 0" stroke="#CFEEF8" strokeWidth="2" fill="none" />
      <path d="M0 64 q24 3 48 0 t72 0" stroke="#CFEEF8" strokeWidth="2" fill="none" />
      <Frame />
    </g>
  ),

  bamboo: (
    <g>
      <Sky from="#E4F6E0" to="#F4FBEF" id="pc-bamboo" />
      {(
        [22, 48, 76, 100] as const
      ).map((x, i) => (
        <g key={x}>
          <rect x={x} y={6} width={i % 2 ? 7 : 9} height="78" rx="3" fill={i % 2 ? "#6FAE5C" : "#82C46C"} />
          <path
            d={`M${x - 8} ${30 + i * 6} q${i % 2 ? 7 : 9} -8 ${i % 2 ? 7 : 9} -16`}
            stroke="#5FAE4A"
            strokeWidth="3"
            fill="none"
            strokeLinecap="round"
          />
          <path
            d={`M${x + (i % 2 ? 7 : 9) + 2} ${46 + i * 4} q8 -8 9 -18`}
            stroke="#5FAE4A"
            strokeWidth="3"
            fill="none"
            strokeLinecap="round"
          />
        </g>
      ))}
      <Frame />
    </g>
  ),

  snowMountain: (
    <g>
      <Sky from="#CFE6FA" to="#F4FAFF" id="pc-snow" />
      <circle cx="98" cy="18" r="8" fill="#FFF3B0" opacity=".9" />
      <path d="M0 70 L36 26 L72 70 Z" fill="#8FA9C7" />
      <path d="M36 26 L50 44 L36 48 L22 44 Z" fill="#FFFFFF" />
      <path d="M52 70 L86 34 L120 70 Z" fill="#7694B5" />
      <path d="M86 34 L98 50 L86 54 L74 50 Z" fill="#FFFFFF" />
      <rect x="0" y="70" width="120" height="14" fill="#EAF4FF" />
      <Frame />
    </g>
  ),

  sakura: (
    <g>
      <Sky from="#FFE8F2" to="#FFF6EF" id="pc-sakura" />
      <path d="M68 84 V46" stroke="#8C6A4F" strokeWidth="7" strokeLinecap="round" />
      <path d="M68 56 L44 38 M68 60 L92 40 M68 50 L56 32" stroke="#8C6A4F" strokeWidth="5" strokeLinecap="round" />
      {(
        [
          [40, 32],
          [56, 24],
          [74, 28],
          [92, 34],
          [30, 44],
          [104, 44],
          [64, 18],
        ] as const
      ).map(([x, y]) => (
        <circle key={`${x}-${y}`} cx={x} cy={y} r="10" fill="#FFC2D6" opacity=".92" />
      ))}
      <path d="M0 76 q30 -8 60 -3 t60 0 V84 H0 Z" fill="#D9F0C8" />
      <Frame />
    </g>
  ),

  desert: (
    <g>
      <Sky from="#FFE0B0" to="#FFD08A" id="pc-desert" />
      <circle cx="34" cy="26" r="13" fill="#FF8A5B" />
      <path d="M0 62 q26 -20 54 -6 q28 14 66 -4 V84 H0 Z" fill="#F2C177" />
      <path d="M0 72 q34 -16 66 -2 q28 12 54 -2 V84 H0 Z" fill="#E0A85C" />
      <path d="M86 60 q6 -14 12 0 q-6 -5 -12 0 Z" fill="#8C6A4F" />
      <Frame />
    </g>
  ),

  starrySky: (
    <g>
      <Sky from="#2B2140" to="#4A3B63" id="pc-star" />
      <circle cx="88" cy="24" r="12" fill="#FFF3B0" />
      <circle cx="82" cy="21" r="11" fill="#382A52" />
      {(
        [
          [18, 16, 2],
          [36, 30, 1.5],
          [54, 12, 2.2],
          [72, 40, 1.6],
          [26, 48, 1.8],
          [60, 56, 1.4],
          [104, 50, 2],
          [46, 42, 1.3],
          [14, 62, 1.5],
        ] as const
      ).map(([x, y, r]) => (
        <circle key={`${x}-${y}`} cx={x} cy={y} r={r} fill="#FFFFFF" opacity=".9" />
      ))}
      <path d="M0 70 L30 54 L58 70 L86 52 L120 70 V84 H0 Z" fill="#241B33" />
      <Frame />
    </g>
  ),

  volcano: (
    <g>
      <Sky from="#4A2B3F" to="#8C4038" id="pc-volcano" />
      <path d="M0 84 L36 30 L52 30 L96 84 Z" fill="#5A3A4A" />
      <path d="M36 30 L44 22 L52 30 Z" fill="#3A2530" />
      <path d="M44 22 q6 -10 0 -16 q10 6 8 16 Z" fill="#FF7A3C" opacity=".9" />
      <path d="M40 34 q4 14 -2 22 q8 4 10 -6 q4 10 10 2 q-2 -12 -8 -18 Z" fill="#FF8A5B" />
      <path d="M0 84 h120 v-8 q-30 -8 -60 -2 t-60 4 Z" fill="#3A2530" />
      <Frame />
    </g>
  ),

  aurora: (
    <g>
      <Sky from="#0F2038" to="#22485E" id="pc-aurora" />
      <path d="M0 8 q30 30 60 14 q30 -16 60 8 v18 q-30 -22 -60 -6 q-30 16 -60 -12 Z" fill="#6FE3B0" opacity=".55" />
      <path d="M0 20 q30 26 60 12 q30 -14 60 6 v14 q-30 -18 -60 -4 q-30 14 -60 -10 Z" fill="#8FD0FF" opacity=".45" />
      <path d="M0 32 q30 22 60 10 q30 -12 60 4 v12 q-30 -14 -60 -2 q-30 12 -60 -8 Z" fill="#C7A0FF" opacity=".4" />
      {(
        [
          [20, 12],
          [70, 8],
          [100, 18],
        ] as const
      ).map(([x, y]) => (
        <circle key={`${x}-${y}`} cx={x} cy={y} r="1.8" fill="#fff" opacity=".9" />
      ))}
      <path d="M0 70 L34 52 L62 70 L92 50 L120 70 V84 H0 Z" fill="#16243A" />
      <Frame />
    </g>
  ),

  seaOfClouds: (
    <g>
      <Sky from="#8FB8E8" to="#FFE3F0" id="pc-clouds" />
      <circle cx="30" cy="20" r="10" fill="#FFF3B0" />
      <path d="M0 62 L28 32 L52 62 Z" fill="#8FA9C7" />
      <path d="M28 32 L38 46 L28 50 L18 46 Z" fill="#EAF4FF" />
      <path d="M58 62 L88 26 L120 62 Z" fill="#7694B5" />
      <path d="M88 26 L100 44 L88 48 L76 44 Z" fill="#EAF4FF" />
      {/* 云海：把山峰下半截埋掉 */}
      <ellipse cx="26" cy="64" rx="38" ry="12" fill="#FFFFFF" opacity=".95" />
      <ellipse cx="74" cy="70" rx="46" ry="14" fill="#FFFFFF" opacity=".95" />
      <ellipse cx="112" cy="62" rx="30" ry="11" fill="#FFFFFF" opacity=".9" />
      <Frame />
    </g>
  ),
};

/**
 * 单张明信片的绘制入口。
 *
 * 做成组件而不是直接导出那张 Record，是为了满足 Fast Refresh 的要求
 * （一个文件只导出组件），否则改这个文件时开发服务器会整页刷新。
 */
export function PostcardArt({ id }: { id: PostcardId }) {
  return <>{POSTCARD_ART[id]}</>;
}
