/* ============================================================
   小游戏注册表
   加一个新游戏只需要两步：写一个组件、在这里注册一行。
   计时/计分/HUD/结算都不用管，外壳会处理。
   ============================================================ */

import type { ComponentType } from "react";

import { BubblePop } from "./BubblePop";
import { CatchFruit } from "./CatchFruit";
import { Fishing } from "./Fishing";
import { MemoryMatch } from "./MemoryMatch";
import { RhythmTap } from "./RhythmTap";
import { RockPaperScissors } from "./RockPaperScissors";
import type { GameId, GameProps } from "./types";

export const GAME_COMPONENTS: Record<GameId, ComponentType<GameProps>> = {
  catchFruit: CatchFruit,
  bubblePop: BubblePop,
  rhythmTap: RhythmTap,
  rockPaperScissors: RockPaperScissors,
  fishing: Fishing,
  memoryMatch: MemoryMatch,
};

export const GAME_ICON: Record<GameId, string> = {
  catchFruit: "🧺",
  bubblePop: "🫧",
  rhythmTap: "🎵",
  rockPaperScissors: "✌️",
  fishing: "🎣",
  memoryMatch: "🃏",
};
