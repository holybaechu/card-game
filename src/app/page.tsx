"use client";

import { useState } from "react";

import { BattleScreen } from "@/components/game/screens/BattleScreen";
import { CardsScreen } from "@/components/game/screens/CardsScreen";
import { GachaScreen } from "@/components/game/screens/GachaScreen";
import { HomeScreen } from "@/components/game/screens/HomeScreen";
import { MatchingScreen } from "@/components/game/screens/MatchingScreen";
import { RankingScreen } from "@/components/game/screens/RankingScreen";
import { Sparkles } from "@/components/game/Sparkles";
import { useBattleFlow, type GameScreen } from "@/hooks/useBattleFlow";
import { useGachaFlow } from "@/hooks/useGachaFlow";
import { useGameData } from "@/hooks/useGameData";

export default function Home() {
  const [screen, setScreen] = useState<GameScreen>("home");
  const { battle, cards, inventory, rankings, setBattle, setInventory, setRankings } = useGameData();
  const { cancelPendingBattle, matchingCountdown, pendingBattle, rankedRows, rankedScore, startBattle } = useBattleFlow({
    battle,
    cards,
    rankings,
    screen,
    setBattle,
    setRankings,
    setScreen,
  });
  const { gachaCards, gachaCount, isDrawing, openGacha, startGacha } = useGachaFlow({ setInventory, setScreen });

  function goHome() {
    cancelPendingBattle();
    setScreen("home");
  }

  return (
    <main className="game-shell">
      <Sparkles />
      {screen !== "home" && (
        <button className="back-button" onClick={goHome} type="button">
          뒤로
        </button>
      )}

      {screen === "home" && (
        <HomeScreen cards={cards} onOpenCards={() => setScreen("cards")} onOpenGacha={openGacha} onOpenRanking={() => setScreen("ranking")} onStartBattle={startBattle} />
      )}

      {(screen === "normal" || screen === "ranked") && <BattleScreen battle={battle} rankedScore={rankedScore} screen={screen} />}

      {screen === "matching" && <MatchingScreen matchingCountdown={matchingCountdown} pendingBattle={pendingBattle} />}

      {screen === "cards" && <CardsScreen cards={cards} inventory={inventory} />}

      {screen === "gacha" && <GachaScreen gachaCards={gachaCards} gachaCount={gachaCount} isDrawing={isDrawing} onStartGacha={startGacha} />}

      {screen === "ranking" && <RankingScreen rankedRows={rankedRows} />}
    </main>
  );
}
