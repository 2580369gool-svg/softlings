/* ============================================================
   院子摆件的造型
   统一在 100×100 的 viewBox 里绘制，便于在院子里等比排布。
   ============================================================ */

import type { ReactNode } from "react";

import type { PlacementId } from "../core/habitat";

const INK = "#4A3B63";

export const PLACEMENT_ART: Record<PlacementId, ReactNode> = {
  foodBowl: (
    <g>
      <ellipse cx="50" cy="82" rx="30" ry="7" fill="#4A3B63" opacity=".14" />
      <path d="M20 52 L80 52 C80 74 68 84 50 84 C32 84 20 74 20 52 Z" fill="#FFA45B" stroke={INK} strokeWidth="2.6" strokeLinejoin="round" />
      <ellipse cx="50" cy="52" rx="30" ry="9" fill="#FFD9B5" stroke={INK} strokeWidth="2.4" />
      <circle cx="42" cy="50" r="4" fill="#B08968" />
      <circle cx="54" cy="48" r="3.4" fill="#8C6A4F" />
      <circle cx="50" cy="55" r="3.8" fill="#B08968" />
    </g>
  ),

  birdSeed: (
    <g>
      <ellipse cx="50" cy="84" rx="26" ry="6" fill="#4A3B63" opacity=".14" />
      <ellipse cx="50" cy="72" rx="26" ry="10" fill="#F2D08A" stroke={INK} strokeWidth="2.6" />
      <ellipse cx="50" cy="68" rx="22" ry="8" fill="#FFE3A8" />
      {/* 坐标写成 as const 的元组：否则 noUncheckedIndexedAccess 下
          解构出来的 x/y 会是 number | undefined，做算术时直接报错 */}
      {(
        [
          [40, 66],
          [50, 64],
          [60, 66],
          [45, 70],
          [56, 70],
        ] as const
      ).map(([x, y]) => (
        <circle key={`${x}-${y}`} cx={x} cy={y} r="3" fill="#C98F3C" />
      ))}
      <path d="M50 62 L50 34" stroke={INK} strokeWidth="2.4" strokeLinecap="round" />
      <path d="M50 44 l14 -8 M50 50 l-14 -8" stroke={INK} strokeWidth="2.2" strokeLinecap="round" />
    </g>
  ),

  cushion: (
    <g>
      <ellipse cx="50" cy="80" rx="30" ry="7" fill="#4A3B63" opacity=".14" />
      <ellipse cx="50" cy="62" rx="34" ry="22" fill="#C7A0FF" stroke={INK} strokeWidth="2.6" />
      <ellipse cx="50" cy="60" rx="27" ry="16" fill="#E5D4FF" />
      <path d="M50 46 L50 74 M36 60 L64 60" stroke={INK} strokeWidth="2" opacity=".35" />
      <circle cx="50" cy="60" r="4" fill="#B08CF0" stroke={INK} strokeWidth="2" />
    </g>
  ),

  toyMouse: (
    <g>
      <ellipse cx="50" cy="82" rx="24" ry="6" fill="#4A3B63" opacity=".14" />
      <ellipse cx="50" cy="66" rx="26" ry="16" fill="#B9BEC9" stroke={INK} strokeWidth="2.6" />
      <circle cx="30" cy="52" r="10" fill="#B9BEC9" stroke={INK} strokeWidth="2.4" />
      <circle cx="62" cy="50" r="10" fill="#B9BEC9" stroke={INK} strokeWidth="2.4" />
      <circle cx="30" cy="52" r="5" fill="#FFC2D6" />
      <circle cx="62" cy="50" r="5" fill="#FFC2D6" />
      <circle cx="34" cy="66" r="3" fill={INK} />
      <path d="M76 70 q10 4 6 12" stroke={INK} strokeWidth="2.2" fill="none" strokeLinecap="round" />
    </g>
  ),

  waterBowl: (
    <g>
      <ellipse cx="50" cy="82" rx="30" ry="7" fill="#4A3B63" opacity=".14" />
      <path d="M18 54 L82 54 C82 76 70 86 50 86 C30 86 18 76 18 54 Z" fill="#8FD4F0" stroke={INK} strokeWidth="2.6" strokeLinejoin="round" />
      <ellipse cx="50" cy="54" rx="32" ry="9" fill="#B5E8F7" stroke={INK} strokeWidth="2.4" />
      <ellipse cx="42" cy="54" rx="8" ry="3" fill="#fff" opacity=".7" />
      <ellipse cx="60" cy="58" rx="5" ry="2" fill="#fff" opacity=".5" />
    </g>
  ),

  flowerPot: (
    <g>
      <ellipse cx="50" cy="86" rx="24" ry="6" fill="#4A3B63" opacity=".14" />
      <path d="M50 48 L50 74" stroke="#6FC96C" strokeWidth="3" strokeLinecap="round" />
      <path d="M50 62 q-12 -4 -14 -14 q12 2 14 14 Z" fill="#8FD98C" />
      <path d="M50 68 q12 -4 14 -14 q-12 2 -14 14 Z" fill="#6FC96C" />
      {(
        [
          [34, 34],
          [50, 24],
          [66, 34],
        ] as const
      ).map(([x, y], i) => (
        <g key={`${x}-${y}`}>
          {[0, 72, 144, 216, 288].map((deg) => {
            const rad = (deg * Math.PI) / 180;
            return (
              <circle
                key={deg}
                cx={x + Math.cos(rad) * 7}
                cy={y + Math.sin(rad) * 7}
                r="6"
                fill={i === 1 ? "#FFF3B0" : "#FF8FB1"}
              />
            );
          })}
          <circle cx={x} cy={y} r="4" fill="#FFE066" />
        </g>
      ))}
      <path d="M30 74 L70 74 L64 90 L36 90 Z" fill="#E8794A" stroke={INK} strokeWidth="2.6" strokeLinejoin="round" />
      <rect x="26" y="70" width="48" height="8" rx="3" fill="#FFA45B" stroke={INK} strokeWidth="2.4" />
    </g>
  ),
};
