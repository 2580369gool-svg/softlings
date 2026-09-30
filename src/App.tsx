import { useTranslation } from "react-i18next";

import { ANIM_CLASS, BEHAVIORS } from "./core/behavior";
import { deriveStatus } from "./core/needs";
import { NEED_KEYS, type ActionKey } from "./core/types";
import { playSfx } from "./audio";
import { useAudio } from "./hooks/useAudio";
import { useAutonomy } from "./hooks/useAutonomy";
import { useGameLoop } from "./hooks/useGameLoop";
import { MiniGameStage } from "./minigames/MiniGameStage";
import { isGameId } from "./minigames/types";
import { PetStage } from "./render/PetStage";
import { useGameStore } from "./store/gameStore";
import { ActionBar } from "./ui/ActionBar";
import { ArcadeMenu } from "./ui/ArcadeMenu";
import { BehaviorBubble } from "./ui/BehaviorBubble";
import { GameResult } from "./ui/GameResult";
import { Habitat } from "./ui/Habitat";
import { InventoryStrip } from "./ui/InventoryStrip";
import { LanguageToggle } from "./ui/LanguageToggle";
import { MilestoneModal } from "./ui/MilestoneModal";
import { NeedBar } from "./ui/NeedBar";
import { OfflineModal } from "./ui/OfflineModal";
import { PersonalityChips } from "./ui/PersonalityChips";
import { PetGallery } from "./ui/PetGallery";
import { Shop } from "./ui/Shop";
import { SoundToggle } from "./ui/SoundToggle";
import { SpeciesPicker } from "./ui/SpeciesPicker";
import { SpeechBubble } from "./ui/SpeechBubble";
import { Travel } from "./ui/Travel";
import { TripReturnModal } from "./ui/TripReturnModal";
import { Wardrobe } from "./ui/Wardrobe";
import { humanizeDuration } from "./utils/format";

import "./App.css";
import "./minigames/minigames.css";
import "./ui/components.css";

/**
 * 启动时只读一次的 URL 参数。
 * 放在模块作用域而不是组件里：每次重渲染都 new 一个 URLSearchParams 没必要。
 * 本应用只在浏览器里跑，模块加载时 window 一定存在。
 */
const INITIAL_SCREEN = new URLSearchParams(window.location.search).get("screen");
/** ?game=catchFruit 直接开一局，用于冒烟测试与逐个验收游戏渲染 */
const INITIAL_GAME = new URLSearchParams(window.location.search).get("game");

/** 不同互动配不同的身体动画，让每个按钮摸起来手感不一样 */
function reactionKind(action: ActionKey, backfire: boolean): string {
  if (backfire) return "refuse";
  switch (action) {
    case "feed":
      return "chew";
    case "bathe":
      return "wiggle";
    case "sleep":
      return "";
    default:
      return "hop";
  }
}

export default function App() {
  useGameLoop();
  useAutonomy();
  useAudio();

  const { t } = useTranslation();
  const sim = useGameStore((s) => s.sim);
  const feedback = useGameStore((s) => s.feedback);
  const offlineReport = useGameStore((s) => s.offlineReport);
  const dismissOffline = useGameStore((s) => s.dismissOffline);
  const newGame = useGameStore((s) => s.newGame);
  const perform = useGameStore((s) => s.perform);
  const stroke = useGameStore((s) => s.stroke);
  const milestone = useGameStore((s) => s.milestone);
  const dismissMilestone = useGameStore((s) => s.dismissMilestone);
  const behavior = useGameStore((s) => s.behavior);
  const screen = useGameStore((s) => s.screen);
  const activeGame = useGameStore((s) => s.activeGame);
  const lastGameResult = useGameStore((s) => s.lastGameResult);
  const openScreen = useGameStore((s) => s.openScreen);

  // 玩家的操作反馈优先于宠物自己的小动作。
  // key 变化才会重启 CSS 动画，所以这里不必用 useMemo 稳定对象引用。
  const reaction = (() => {
    if (feedback?.ok) {
      const kind = reactionKind(feedback.action, feedback.backfire);
      if (kind) return { kind, key: feedback.at };
    }
    if (behavior) {
      const kind = ANIM_CLASS[BEHAVIORS[behavior.id].anim];
      if (kind) return { kind, key: behavior.key };
    }
    return null;
  })();

  // ?gallery 打开进化图鉴 —— 美术评审用，正常游戏不会走到这里
  if (new URLSearchParams(window.location.search).has("gallery")) {
    return <PetGallery onExit={() => { window.location.search = ""; }} />;
  }

  // ?screen=arcade|shop 直接进对应界面，用于冒烟测试与快速直达
  if (INITIAL_SCREEN === "arcade") return <ArcadeMenu />;
  if (INITIAL_SCREEN === "shop") return <Shop />;
  if (INITIAL_SCREEN === "wardrobe") return <Wardrobe />;
  if (INITIAL_SCREEN === "habitat") return <Habitat />;
  if (INITIAL_SCREEN === "travel") return <Travel />;

  // ?game=<id> 直接开一局。走独立的渲染分支而不是调 store.startGame，
  // 是为了避免在 render 期间产生副作用。
  if (isGameId(INITIAL_GAME)) return <MiniGameStage gameId={INITIAL_GAME} />;

  // 没有存档 → 先选种族
  if (!sim) return <SpeciesPicker onPick={newGame} />;

  /* ---------------- 独立界面 ---------------- */

  if (screen === "arcade") return <ArcadeMenu />;
  if (screen === "shop") return <Shop />;
  if (screen === "wardrobe") return <Wardrobe />;
  if (screen === "habitat") return <Habitat />;
  if (screen === "travel") return <Travel />;

  if (screen === "game") {
    if (lastGameResult) return <GameResult />;
    if (activeGame) return <MiniGameStage gameId={activeGame} />;
    // activeGame 丢了（比如存档被清）就退回列表，不要白屏
    return <ArcadeMenu />;
  }

  /* ---------------- 主界面 ---------------- */

  const { pet, economy } = sim;
  const status = deriveStatus(pet.needs, pet.sleeping);
  const isEgg = pet.stage === "egg";

  // 旅行中：主界面换成「它在路上」。
  // remainingMs 每个 tick（5 秒）都会刷新，所以不需要额外的定时器。
  const traveling = sim.travel.active !== null;
  const travelRemaining = sim.travel.active?.remainingMs ?? 0;

  return (
    <div className="app">
      <header className="app__header">
        <div className="app__identity">
          <span className="app__name">{pet.name || t("app.name")}</span>
          <span className="app__badge">{t(`stage.${pet.stage}`)}</span>
        </div>

        <div className="app__meta">
          <span className="coin" title={t("ui.coins")}>
            🪙 {Math.floor(economy.coins)}
          </span>
          <SoundToggle />
          <LanguageToggle />
        </div>
      </header>

      {/* 二级导航做成独立一行：塞进顶部栏在窄屏上会挤成一团，
          而且 44px 的触摸目标在 header 里放不下 */}
      <nav className="app__nav" aria-label={t("nav.sections")}>
        {(
          [
            ["arcade", "🕹️"],
            ["travel", "🎒"],
            ["habitat", "🏡"],
            ["wardrobe", "👕"],
            ["shop", "🛒"],
          ] as const
        ).map(([key, icon]) => (
          <button
            key={key}
            type="button"
            className="app__navBtn"
            onClick={() => {
              playSfx("tap");
              openScreen(key);
            }}
          >
            <span aria-hidden="true">{icon}</span>
            {t(`nav.${key}`)}
          </button>
        ))}
      </nav>

      {!isEgg && (
        <section className="app__needs" aria-label={t("ui.needs")}>
          {NEED_KEYS.map((key) => (
            <NeedBar key={key} need={key} value={pet.needs[key]} />
          ))}
        </section>
      )}

      <main className="app__stage">
        <div className="app__badges">
          <span className="app__status">
            {isEgg ? t("egg.status") : t(`status.${status}`)}
          </span>
          <PersonalityChips />
        </div>

        {traveling ? (
          <div className="app__traveling">
            <span className="app__travelingIcon" aria-hidden="true">
              🎒
            </span>
            <p className="app__travelingTitle">{t("travel.onTheWay")}</p>
            <p className="app__travelingEta">
              {t("travel.backIn", {
                d: humanizeDuration(travelRemaining, {
                  day: t("units.day"),
                  hour: t("units.hour"),
                  minute: t("units.minute"),
                  second: t("units.second"),
                }),
              })}
            </p>
            <button
              type="button"
              className="btn btn--ghost"
              onClick={() => openScreen("travel")}
            >
              {t("travel.viewTrip")}
            </button>
          </div>
        ) : (
          <PetStage
            species={pet.species}
            stage={pet.stage}
            evolution={pet.evolution}
            hatchProgress={pet.hatchProgress}
            accessories={pet.accessories}
            status={status}
            reaction={reaction}
            onStroke={stroke}
            onTap={() => perform("pet")}
          />
        )}

        <SpeechBubble />
        <BehaviorBubble />
      </main>

      {isEgg ? (
        <p className="app__hint">{t("egg.hint")}</p>
      ) : traveling ? (
        <p className="app__hint">{t("travel.awayHint")}</p>
      ) : (
        <>
          <InventoryStrip />
          <ActionBar />
        </>
      )}

      {offlineReport && !isEgg && (
        <OfflineModal report={offlineReport} onClose={dismissOffline} />
      )}

      {milestone && (
        <MilestoneModal
          milestone={milestone}
          species={pet.species}
          onClose={dismissMilestone}
        />
      )}

      {/* 归来结算优先于其它弹窗：它是玩家等了半小时才等到的一刻 */}
      {!milestone && <TripReturnModal />}

      {/* 屏幕阅读器可读的状态播报 */}
      <p className="sr-only" aria-live="polite">
        {NEED_KEYS.map((k) => `${t(`needs.${k}`)} ${Math.round(pet.needs[k])}`).join(", ")}
      </p>
    </div>
  );
}
