import { useTranslation } from "react-i18next";

import { traitsOf } from "../core/personality";
import { useGameStore } from "../store/gameStore";

/**
 * 性格标签。
 *
 * 这一步不是装饰，而是必需品：性格塑形是后台悄悄改数值的，
 * 玩家感受不到。必须给这件事一个能被看见的名字，
 * 「我的养法改变了它」才成立。
 *
 * 没有任何权重突出时就什么都不显示 —— 一只还没被塑造出性格的宠物，
 * 不该硬贴一个「普通」的标签。
 */
export function PersonalityChips() {
  const { t } = useTranslation();
  const sim = useGameStore((s) => s.sim);

  if (!sim || sim.pet.stage === "egg") return null;

  const traits = traitsOf(sim.pet.personality);
  if (traits.length === 0) return null;

  return (
    <div className="traits">
      {traits.map((key) => (
        <span key={key} className="trait">
          {t(`trait.${key}`)}
        </span>
      ))}
    </div>
  );
}
