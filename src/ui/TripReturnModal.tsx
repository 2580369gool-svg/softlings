import { useTranslation } from "react-i18next";

import { POSTCARDS } from "../core/travel";
import { PostcardArt } from "../render/postcardArt";
import { useGameStore } from "../store/gameStore";

/**
 * 归来结算。
 *
 * 这是「旅行」这条情绪曲线的收尾 —— 玩家等了半小时到三小时，
 * 打开游戏看到的就是这一刻。所以展示要做足：
 * 把带回来的照片一张张摆出来，新收集的额外标注。
 */
export function TripReturnModal() {
  const { t } = useTranslation();
  const sim = useGameStore((s) => s.sim);
  const dismiss = useGameStore((s) => s.dismissTrip);

  const reward = sim?.lastTrip;
  if (!reward) return null;

  const allNew = reward.postcards.every((id) => reward.newPostcards.includes(id));

  return (
    <div className="modal" role="dialog" aria-modal="true" aria-labelledby="trip-title">
      <div className="modal__card modal__card--trip">
        <h2 className="modal__title" id="trip-title">
          {t("travel.returnTitle")}
        </h2>
        <p className="modal__body">
          {allNew ? t("travel.returnAllNew") : t("travel.returnBody")}
        </p>

        <ul className="tripPhotos">
          {reward.postcards.map((id, i) => {
            const isNew = reward.newPostcards.includes(id);
            return (
              <li key={`${id}-${i}`} className={`tripPhoto${isNew ? " is-new" : ""}`}>
                <svg viewBox="0 0 120 84" className="tripPhoto__art">
                  <PostcardArt id={id} />
                </svg>
                <span className="tripPhoto__name">{t(`postcard.${id}`)}</span>
                <span className="tripPhoto__rarity">{t(`rarity.${POSTCARDS[id].rarity}`)}</span>
                {isNew && <span className="tripPhoto__badge">{t("travel.newBadge")}</span>}
              </li>
            );
          })}
        </ul>

        <p className="trip__coins">🪙 +{reward.coins}</p>

        <button type="button" className="btn btn--primary" onClick={dismiss}>
          {t("travel.returnConfirm")}
        </button>
      </div>
    </div>
  );
}
