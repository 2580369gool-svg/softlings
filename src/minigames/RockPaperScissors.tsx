/* ============================================================
   猜拳
   五局定胜负。赢 +3 / 平 +1 / 输不计分。
   宠物出拳前有一小段「思考」停顿 —— 秒出结果会让胜负显得没有分量。
   ============================================================ */

import { useCallback, useRef, useState } from "react";
import { useTranslation } from "react-i18next";

import { playSfx } from "../audio";

import type { GameProps } from "./types";

const ROUNDS = 5;
/** 宠物「出手」前的停顿 */
const REVEAL_DELAY_MS = 620;

type Hand = "rock" | "paper" | "scissors";
const HANDS: Hand[] = ["rock", "paper", "scissors"];
const EMOJI: Record<Hand, string> = { rock: "✊", paper: "✋", scissors: "✌️" };

/** 玩家是否获胜：石头胜剪刀胜布胜石头 */
function beats(player: Hand, pet: Hand): boolean | null {
  if (player === pet) return null; // 平局
  const wins =
    (player === "rock" && pet === "scissors") ||
    (player === "paper" && pet === "rock") ||
    (player === "scissors" && pet === "paper");
  return wins;
}

export function RockPaperScissors({ onScore, onEarlyFinish }: GameProps) {
  const { t } = useTranslation();

  const [round, setRound] = useState(1);
  const [playerHand, setPlayerHand] = useState<Hand | null>(null);
  const [petHand, setPetHand] = useState<Hand | null>(null);
  const [outcome, setOutcome] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const wins = useRef(0);
  const done = useRef(false);

  const play = useCallback(
    (hand: Hand) => {
      if (busy || done.current) return;

      setBusy(true);
      setPlayerHand(hand);
      setPetHand(null);
      setOutcome(null);

      window.setTimeout(() => {
        const pet = HANDS[Math.floor(Math.random() * HANDS.length)] ?? "rock";
        const result = beats(hand, pet);

        setPetHand(pet);

        if (result === null) {
          setOutcome("draw");
          playSfx("draw");
          onScore(1);
        } else if (result) {
          setOutcome("win");
          playSfx("win");
          wins.current += 1;
          onScore(3);
        } else {
          setOutcome("lose");
          playSfx("lose");
        }

        window.setTimeout(() => {
          if (round >= ROUNDS) {
            done.current = true;
            onEarlyFinish();
            return;
          }
          setRound((r) => r + 1);
          setPlayerHand(null);
          setPetHand(null);
          setOutcome(null);
          setBusy(false);
        }, 900);
      }, REVEAL_DELAY_MS);
    },
    [busy, onEarlyFinish, onScore, round],
  );

  return (
    <div className="rps">
      <div className="rps__round"> {t("rps.round", { n: round, total: ROUNDS })}</div>

      <div className="rps__arena">
        <div className="rps__side">
          <span className="rps__label">{t("rps.you")}</span>
          <span className={`rps__hand${playerHand ? "" : " is-empty"}`}>
            {playerHand ? EMOJI[playerHand] : "❔"}
          </span>
        </div>

        <span className="rps__vs">VS</span>

        <div className="rps__side">
          <span className="rps__label">{t("rps.pet")}</span>
          <span className={`rps__hand${petHand ? "" : " is-empty"}`}>
            {petHand ? EMOJI[petHand] : "❔"}
          </span>
        </div>
      </div>

      <div className="rps__outcomeSlot">
        {outcome && (
          <span className={`rps__outcome rps__outcome--${outcome}`} key={`${round}-${outcome}`}>
            {t(`rps.${outcome}`)}
          </span>
        )}
      </div>

      <div className="rps__buttons">
        {HANDS.map((hand) => (
          <button
            key={hand}
            type="button"
            className="rps__btn"
            disabled={busy}
            onPointerDown={() => play(hand)}
          >
            <span className="rps__btnIcon">{EMOJI[hand]}</span>
            <span className="rps__btnLabel">{t(`rps.${hand}`)}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
