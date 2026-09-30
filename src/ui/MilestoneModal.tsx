import { useTranslation } from "react-i18next";

import { EVOLUTIONS, isEvolutionLineId } from "../core/evolution";
import type { Species } from "../core/types";
import { PetSvg } from "../render/PetSvg";
import type { Milestone } from "../store/gameStore";

interface Props {
  milestone: Milestone;
  species: Species;
  onClose: () => void;
}

/**
 * 破壳 / 进化演出。
 *
 * 这两个时刻是养成游戏里最值得放大的情绪峰值 —— 玩家投入了几天时间，
 * 需要一次明确的「你的付出有回报」的确认。所以给足仪式感：
 * 展示新形态 + 说明是什么养法造就了它。
 */
export function MilestoneModal({ milestone, species, onClose }: Props) {
  const { t } = useTranslation();

  const isHatch = milestone.kind === "hatch";
  const line = isEvolutionLineId(milestone.line) ? EVOLUTIONS[milestone.line] : null;

  return (
    <div className="modal" role="dialog" aria-modal="true" aria-labelledby="milestone-title">
      <div className="modal__card modal__card--milestone">
        {/* 展示新形态本身，比任何文案都有说服力 */}
        <div className="milestone__art">
          <PetSvg
            species={species}
            stage={isHatch ? "baby" : "child"}
            evolution={line?.id ?? null}
            status="happy"
          />
        </div>

        <h2 className="modal__title" id="milestone-title">
          {t(isHatch ? "milestone.hatchTitle" : "milestone.evolveTitle")}
        </h2>

        {line ? (
          <>
            <p className="milestone__name">{t(`evolution.${line.id}.name`)}</p>
            <p className="modal__body">{t(`evolution.${line.id}.desc`)}</p>
            <p className="milestone__path">
              {t("milestone.evolvePath", { path: t(`path.${line.path}`) })}
            </p>
          </>
        ) : (
          <p className="modal__body">{t("milestone.hatchBody")}</p>
        )}

        <button type="button" className="btn btn--primary" onClick={onClose}>
          {t("milestone.confirm")}
        </button>
      </div>
    </div>
  );
}
