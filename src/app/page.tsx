"use client";

import { useEffect, useState } from "react";

import { BattleScreen } from "@/components/game/screens/BattleScreen";
import { CardsScreen } from "@/components/game/screens/CardsScreen";
import { GachaScreen } from "@/components/game/screens/GachaScreen";
import { HomeScreen } from "@/components/game/screens/HomeScreen";
import { LoginScreen } from "@/components/game/screens/LoginScreen";
import { MatchingScreen } from "@/components/game/screens/MatchingScreen";
import { RankingScreen } from "@/components/game/screens/RankingScreen";
import { Sparkles } from "@/components/game/Sparkles";
import { getPlayerSession } from "@/lib/game/backend";
import type { PlayerSession } from "@/lib/game/player";
import { useBattleFlow, type GameScreen } from "@/hooks/useBattleFlow";
import { useGachaFlow } from "@/hooks/useGachaFlow";
import { useGameData } from "@/hooks/useGameData";

const NICKNAME_STORAGE_KEY = "cg:nickname";

export default function Home() {
  const [screen, setScreen] = useState<GameScreen>("home");
  const [player, setPlayer] = useState<PlayerSession | null>(null);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);

  const { battle, cards, inventory, rankings, setBattle, setInventory, setRankings } = useGameData(player);
  const { cancelPendingBattle, matchingCountdown, pendingBattle, rankedRows, rankedScore, startBattle } = useBattleFlow({
    battle,
    cards,
    player,
    rankings,
    screen,
    setBattle,
    setPlayer,
    setRankings,
    setScreen,
  });
  const { gachaCards, gachaCount, isDrawing, openGacha, startGacha } = useGachaFlow({
    player,
    setPlayer,
    setInventory,
    setScreen,
  });

  useEffect(() => {
    let isActive = true;

    const savedNickname = window.localStorage.getItem(NICKNAME_STORAGE_KEY);
    if (!savedNickname) {
      return;
    }

    setIsLoggingIn(true);
    setLoginError(null);

    void getPlayerSession({ nickname: savedNickname }).then((nextPlayer) => {
      if (!isActive) {
        return;
      }

      if (nextPlayer) {
        setPlayer(nextPlayer);
      } else {
        setLoginError("Auto-login failed.");
        window.localStorage.removeItem(NICKNAME_STORAGE_KEY);
      }

      setIsLoggingIn(false);
    });

    return () => {
      isActive = false;
    };
  }, []);

  function handleLoginSubmit(nickname: string) {
    const trimmedNickname = nickname.trim();
    if (!trimmedNickname) {
      setLoginError("Please enter a nickname.");
      return;
    }

    setIsLoggingIn(true);
    setLoginError(null);

    void getPlayerSession({ nickname: trimmedNickname }).then((nextPlayer) => {
      if (nextPlayer) {
        setPlayer(nextPlayer);
        window.localStorage.setItem(NICKNAME_STORAGE_KEY, nextPlayer.nickname);
      } else {
        setLoginError("Unable to login.");
      }

      setIsLoggingIn(false);
    });
  }

  function handleLogout() {
    setPlayer(null);
    setScreen("home");
    window.localStorage.removeItem(NICKNAME_STORAGE_KEY);
  }

  function goHome() {
    cancelPendingBattle();
    setScreen("home");
  }

  if (!player) {
    return (
      <main className="game-shell">
        <Sparkles />
        <LoginScreen error={loginError} isLoading={isLoggingIn} onSubmit={handleLoginSubmit} />
      </main>
    );
  }

  return (
    <main className="game-shell">
      <Sparkles />
      {screen !== "home" && (
        <button className="back-button" onClick={goHome} type="button">
          Back
        </button>
      )}

      {screen === "home" && (
        <HomeScreen
          player={player}
          cards={cards}
          onOpenCards={() => setScreen("cards")}
          onOpenGacha={openGacha}
          onOpenRanking={() => setScreen("ranking")}
          onStartBattle={startBattle}
          onLogout={handleLogout}
        />
      )}

      {(screen === "normal" || screen === "ranked") && <BattleScreen battle={battle} rankedScore={rankedScore} screen={screen} />}

      {screen === "matching" && <MatchingScreen matchingCountdown={matchingCountdown} pendingBattle={pendingBattle} />}

      {screen === "cards" && <CardsScreen cards={cards} inventory={inventory} />}

      {screen === "gacha" && (
        <GachaScreen gachaCards={gachaCards} gachaCount={gachaCount} isDrawing={isDrawing} onStartGacha={startGacha} />
      )}

      {screen === "ranking" && <RankingScreen rankedRows={rankedRows} />}
    </main>
  );
}

