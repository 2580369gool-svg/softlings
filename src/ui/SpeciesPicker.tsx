import { useTranslation } from "react-i18next";

import { SPECIES, type Species } from "../core/types";
import { PetSvg } from "../render/PetSvg";

import { LanguageToggle } from "./LanguageToggle";

interface Props {
  onPick: (species: Species) => void;
}

/** 首次进入的种族选择 —— 不替玩家决定，这一步本身就是情感投入的开始 */
export function SpeciesPicker({ onPick }: Props) {
  const { t } = useTranslation();

  return (
    <div className="picker">
      <header className="picker__head">
        <h1 className="picker__title">{t("app.name")}</h1>
        <p className="picker__tagline">{t("app.tagline")}</p>
        <LanguageToggle />
      </header>

      <ul className="picker__list">
        {SPECIES.map((sp) => (
          <li key={sp}>
            <button type="button" className="species" onClick={() => onPick(sp)}>
              <span className="species__art" aria-hidden="true">
                {/* 用成年体型预览：这是玩家挑的「它以后的样子」 */}
                <PetSvg species={sp} stage="adult" status="happy" />
              </span>
              <span className="species__text">
                <strong className="species__name">{t(`species.${sp}`)}</strong>
                <span className="species__desc">{t(`speciesDesc.${sp}`)}</span>
              </span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
