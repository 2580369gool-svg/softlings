import { useState } from "react";
import { useTranslation } from "react-i18next";

import { EVOLUTION_IDS, EVOLUTIONS, evolutionFor, type EvolutionPath } from "../core/evolution";
import { SPECIES, type Species } from "../core/types";
import { PetSvg } from "../render/PetSvg";

import { LanguageToggle } from "./LanguageToggle";

/**
 * 进化图鉴 —— 一次看全 12 条进化线。
 *
 * 存在的意义：正常玩要几周才能看全所有分支，但美术方向必须现在就能一眼评估。
 * 通过 ?gallery 打开；M7 的「收集图鉴」会在这个基础上加解锁状态。
 */
export function PetGallery({ onExit }: { onExit: () => void }) {
  const { t } = useTranslation();
  const [preview, setPreview] = useState<string | null>(null);

  const PATHS: EvolutionPath[] = ["refined", "balanced", "feral"];

  return (
    <div className="gallery">
      <header className="gallery__head">
        <h1 className="gallery__title">{t("gallery.title")}</h1>
        <div className="gallery__actions">
          <LanguageToggle />
          <button type="button" className="btn btn--primary" onClick={onExit}>
            {t("gallery.exit")}
          </button>
        </div>
      </header>

      {SPECIES.map((sp: Species) => (
        <section key={sp} className="gallery__group">
          <h2 className="gallery__species">{t(`species.${sp}`)}</h2>
          <ul className="gallery__list">
            {PATHS.map((path) => {
              const def = evolutionFor(sp, path);
              const zh = t(`evolution.${def.id}.name`);
              return (
                <li key={def.id}>
                  <button
                    type="button"
                    className="cell"
                    onClick={() => setPreview(def.id)}
                    aria-label={zh}
                  >
                    <span className="cell__art">
                      <PetSvg
                        species={sp}
                        stage="adult"
                        evolution={def.id}
                        status="happy"
                      />
                    </span>
                    <span className="cell__name">{zh}</span>
                    <span className={`cell__path cell__path--${path}`}>
                      {t(`path.${path}`)}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </section>
      ))}

      {preview && (
        <div
          className="modal"
          role="dialog"
          aria-modal="true"
          onClick={() => setPreview(null)}
        >
          <div className="modal__card modal__card--milestone">
            <div className="milestone__art">
              <PetSvg
                species={EVOLUTIONS[preview as keyof typeof EVOLUTIONS]?.species ?? "puddly"}
                stage="adult"
                evolution={preview}
                status="happy"
              />
            </div>
            <h3 className="milestone__name">{t(`evolution.${preview}.name`)}</h3>
            <p className="modal__body">{t(`evolution.${preview}.desc`)}</p>
          </div>
        </div>
      )}

      <p className="gallery__footnote">
        {t("gallery.count", { n: EVOLUTION_IDS.length })}
      </p>
    </div>
  );
}
