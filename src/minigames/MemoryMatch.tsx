/* ============================================================
   记忆翻牌
   4×4 共 8 对，翻出配对得分，全部配对完成后提前结束。

   配对判定直接写在点击处理里，而不是用 useEffect 监听 picked 变化 ——
   后者会让「两张牌翻开了」这个因果链绕一圈，还会引发级联渲染。
   ============================================================ */

import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";

import { playSfx } from "../audio";

import type { GameProps } from "./types";

const SYMBOLS = ["🍎", "🍊", "🍇", "🍓", "🍋", "🍑", "🍒", "🥝"];
/** 翻错后盖回去的延迟 */
const FLIP_BACK_MS = 720;
/** 配对成功的基础分 */
const MATCH_SCORE = 3;
/** 全部配对完成的额外奖励 */
const COMPLETION_BONUS = 6;

interface Card {
  id: number;
  symbol: string;
  flipped: boolean;
  matched: boolean;
}

function buildDeck(): Card[] {
  const deck: Card[] = [...SYMBOLS, ...SYMBOLS].map((symbol, i) => ({
    id: i,
    symbol,
    flipped: false,
    matched: false,
  }));

  // Fisher–Yates
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const a = deck[i];
    const b = deck[j];
    if (a && b) {
      deck[i] = b;
      deck[j] = a;
    }
  }
  return deck;
}

export function MemoryMatch({ onScore, onEarlyFinish }: GameProps) {
  const { t } = useTranslation();
  const [cards, setCards] = useState<Card[]>(buildDeck);
  const [picked, setPicked] = useState<number[]>([]);

  const lock = useRef(false);
  const matchedPairs = useRef(0);
  const done = useRef(false);
  const pendingTimer = useRef(0);

  // 卸载时清掉待执行的「盖回去」定时器，避免对已卸载组件操作
  useEffect(() => () => window.clearTimeout(pendingTimer.current), []);

  const flip = useCallback(
    (index: number) => {
      if (lock.current || done.current) return;

      const card = cards[index];
      if (!card || card.flipped || card.matched) return;
      if (picked.includes(index)) return;

      playSfx("flip");
      const flipped = cards.map((c, i) => (i === index ? { ...c, flipped: true } : c));
      const nextPicked = [...picked, index];

      // 只翻了一张：等第二张
      if (nextPicked.length < 2) {
        setCards(flipped);
        setPicked(nextPicked);
        return;
      }

      const [a, b] = nextPicked;
      const first = a !== undefined ? flipped[a] : undefined;
      const second = b !== undefined ? flipped[b] : undefined;
      setPicked([]);

      if (first && second && first.symbol === second.symbol) {
        setCards((prev) =>
          prev.map((c, i) => (i === a || i === b ? { ...c, matched: true, flipped: true } : c)),
        );
        matchedPairs.current += 1;
        playSfx("match");
        onScore(MATCH_SCORE);

        if (matchedPairs.current >= SYMBOLS.length && !done.current) {
          done.current = true;
          onScore(COMPLETION_BONUS);
          window.setTimeout(onEarlyFinish, 600);
        }
        return;
      }

      // 配对失败：先显示两张牌，再一起盖回去
      setCards(flipped);
      lock.current = true;
      pendingTimer.current = window.setTimeout(() => {
        setCards((prev) =>
          prev.map((c, i) => (i === a || i === b ? { ...c, flipped: false } : c)),
        );
        lock.current = false;
      }, FLIP_BACK_MS);
    },
    [cards, picked, onScore, onEarlyFinish],
  );

  return (
    <div className="memory">
      <p className="memory__hint">{t("memory.hint")}</p>

      <div className="memory__grid">
        {cards.map((card, i) => (
          <button
            key={card.id}
            type="button"
            className={`memory__card${card.flipped ? " is-flipped" : ""}${
              card.matched ? " is-matched" : ""
            }`}
            onPointerDown={() => flip(i)}
            aria-label={card.flipped ? card.symbol : t("memory.hidden")}
          >
            <span className="memory__face memory__face--back">?</span>
            <span className="memory__face memory__face--front">{card.symbol}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
