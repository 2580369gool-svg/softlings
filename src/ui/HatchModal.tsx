import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";

import { playSfx } from "../audio";
import type { Species } from "../core/types";
import { SPECIES_BASE } from "../render/palette";
import { PetSvg } from "../render/PetSvg";

/** 蛋壳炸开的演出时长，之后才切到「看，它出来了」 */
const BURST_MS = 1_000;

const INK = "#4A3B63";

interface Props {
  species: Species;
  onClose: () => void;
}

/**
 * 破壳演出。
 *
 * 第一版是直接弹一个弹窗说「破壳啦」，跳过了最有画面感的那一瞬间。
 * 现在拆成两拍：先让蛋壳真的裂开飞出去（带音效），再露出幼体。
 *
 * 这是玩家与宠物的第一次见面，值得多花一秒钟。
 */
export function HatchModal({ species, onClose }: Props) {
  const { t } = useTranslation();
  const [bursting, setBursting] = useState(true);
  const palette = SPECIES_BASE[species];

  useEffect(() => {
    playSfx("hatch");
    const timer = window.setTimeout(() => setBursting(false), BURST_MS);
    return () => window.clearTimeout(timer);
  }, []);

  return (
    <div className="modal" role="dialog" aria-modal="true" aria-labelledby="hatch-title">
      <div className="modal__card modal__card--milestone">
        {bursting ? (
          <div className="hatch" aria-hidden="true">
            <svg viewBox="0 0 200 200" className="hatch__svg">
              {/* 上半壳：向上翻飞 */}
              <g className="hatch__top">
                <path
                  d="M100 34 C126 34 146 68 150 112 L52 112 C56 68 76 34 100 34 Z"
                  fill={palette.color}
                  stroke={INK}
                  strokeWidth="3"
                  strokeLinejoin="round"
                />
                <ellipse cx="82" cy="62" rx="14" ry="9" fill="#fff" opacity=".5" />
              </g>
              {/* 下半壳：向下塌 */}
              <g className="hatch__bottom">
                <path
                  d="M52 116 L150 116 C148 154 128 176 100 176 C72 176 54 154 52 116 Z"
                  fill={palette.shade}
                  stroke={INK}
                  strokeWidth="3"
                  strokeLinejoin="round"
                />
              </g>

              {/* 迸发的小光点 */}
              {(
                [
                  [40, 70],
                  [162, 62],
                  [30, 120],
                  [172, 122],
                  [100, 24],
                  [66, 40],
                  [136, 40],
                ] as const
              ).map(([x, y], i) => (
                <circle
                  key={`${x}-${y}`}
                  className="hatch__spark"
                  style={{ animationDelay: `${i * 45}ms` }}
                  cx={x}
                  cy={y}
                  r={i % 2 ? 4 : 6}
                  fill="#FFE066"
                />
              ))}
            </svg>
          </div>
        ) : (
          <>
            <div className="milestone__art">
              <PetSvg species={species} stage="baby" status="happy" />
            </div>
            <h2 className="modal__title" id="hatch-title">
              {t("milestone.hatchTitle")}
            </h2>
            <p className="modal__body">{t("milestone.hatchBody")}</p>
            <button type="button" className="btn btn--primary" onClick={onClose}>
              {t("milestone.confirm")}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
