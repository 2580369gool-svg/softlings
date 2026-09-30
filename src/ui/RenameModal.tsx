import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";

import { PET_NAME_MAX, sanitizePetName } from "../core/pet";
import { useGameStore } from "../store/gameStore";

/**
 * 给宠物改昵称。
 *
 * 移动端细节：
 * - 自动聚焦并全选，玩家可以直接覆写而不是先删掉旧名字；
 * - enterKeyHint="done" 把软键盘的回车键变成「完成」；
 * - 回车即提交，不强迫玩家去够按钮；
 * - maxLength 只是顺手，真正的截断在 sanitizePetName 里（中文输入法的
 *   候选词阶段可能绕过 maxLength）。
 */
export function RenameModal({ onClose }: { onClose: () => void }) {
  const { t } = useTranslation();
  const sim = useGameStore((s) => s.sim);
  const renamePet = useGameStore((s) => s.renamePet);

  const [value, setValue] = useState(() => sim?.pet.name ?? "");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const el = inputRef.current;
    if (!el) return;
    el.focus();
    el.select();
  }, []);

  const submit = () => {
    renamePet(value);
    onClose();
  };

  return (
    <div
      className="modal"
      role="dialog"
      aria-modal="true"
      aria-labelledby="rename-title"
      onClick={(e) => {
        // 点遮罩关闭，和大多数弹窗的一致行为
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="modal__card modal__card--rename">
        <h2 className="modal__title" id="rename-title">
          {t("rename.title")}
        </h2>
        <p className="modal__body">{t("rename.hint", { max: PET_NAME_MAX })}</p>

        <input
          ref={inputRef}
          className="rename__input"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") submit();
            if (e.key === "Escape") onClose();
          }}
          maxLength={PET_NAME_MAX}
          placeholder={t("rename.placeholder")}
          autoComplete="off"
          autoCorrect="off"
          spellCheck={false}
          enterKeyHint="done"
          aria-label={t("rename.title")}
        />

        <div className="rename__actions">
          <button type="button" className="btn btn--ghost" onClick={onClose}>
            {t("common.cancel")}
          </button>
          <button
            type="button"
            className="btn btn--primary"
            onClick={submit}
            disabled={sanitizePetName(value).length === 0 && (sim?.pet.name ?? "") === ""}
          >
            {t("common.confirm")}
          </button>
        </div>
      </div>
    </div>
  );
}
