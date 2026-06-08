"use client";

import { useEffect, useState } from "react";

import { BattleScreen } from "@/components/game/screens/BattleScreen";
import { CardsScreen } from "@/components/game/screens/CardsScreen";
import { GachaScreen } from "@/components/game/screens/GachaScreen";
import { HomeScreen } from "@/components/game/screens/HomeScreen";
import { MatchingScreen } from "@/components/game/screens/MatchingScreen";
import { RankingScreen } from "@/components/game/screens/RankingScreen";
import { LoginScreen } from "@/components/game/screens/LoginScreen";
import { Sparkles } from "@/components/game/Sparkles";
import { useBattleFlow, type GameScreen } from "@/hooks/useBattleFlow";
import { useGachaFlow } from "@/hooks/useGachaFlow";
import { useGameData } from "@/hooks/useGameData";
import { getPlayerSession } from "@/lib/game/backend";
import type { PlayerSession } from "@/lib/game/backend";

const nicknameStorageKey = "cg:nickname";

export default function Home() {
  const [screen, setScreen] = useState<GameScreen>("home");
  const [player, setPlayer] = useState<PlayerSession | null>(null);
  const [isLoginLoading, setIsLoginLoading] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);

  const { battle, cards, inventory, rankings, setBattle, setInventory, setRankings } = useGameData({ player });
  const { cancelPendingBattle, matchingCountdown, pendingBattle, rankedRows, rankedScore, startBattle } = useBattleFlow({
    battle,
    cards,
    rankings,
    screen,
    player,
    setBattle,
    setRankings,
    setPlayer,
    setScreen,
  });
  const { gachaCards, gachaCount, isDrawing, openGacha, startGacha } = useGachaFlow({
    player,
    setPlayer,
    setInventory,
    setScreen,
  });

  useEffect(() => {
    if (typeof window === "undefined" || player) {
      return;
    }

    const savedNickname = window.localStorage.getItem(nicknameStorageKey);
    if (!savedNickname) {
      return;
    }

    setIsLoginLoading(true);
    void getPlayerSession({ nickname: savedNickname }).then((session) => {
      if (session) {
        setPlayer(session);
        setLoginError(null);
      } else {
        window.localStorage.removeItem(nicknameStorageKey);
      }
    }).finally(() => {
      setIsLoginLoading(false);
    });
  }, [player]);

  function handleLoginSubmit(nickname: string) {
    setIsLoginLoading(true);
    setLoginError(null);

    void getPlayerSession({ nickname }).then((session) => {
      if (!session) {
        setLoginError("닉네임 조회에 실패했습니다.");
        return;
      }

      setPlayer(session);
      setLoginError(null);
      if (typeof window !== "undefined") {
        window.localStorage.setItem(nicknameStorageKey, session.nickname);
      }
      setScreen("home");
    }).finally(() => {
      setIsLoginLoading(false);
    });
  }

  function handleLogout() {
    setPlayer(null);
    setLoginError(null);
    if (typeof window !== "undefined") {
      window.localStorage.removeItem(nicknameStorageKey);
    }
    setScreen("home");
  }

  if (!player) {
    return (
      <main className="game-shell">
        <Sparkles />
        <LoginScreen error={loginError} isLoading={isLoginLoading} onSubmit={handleLoginSubmit} />
      </main>
    );
  }

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
        <HomeScreen
          cards={cards}
          player={player}
          onLogout={handleLogout}
          onOpenCards={() => setScreen("cards")}
          onOpenGacha={openGacha}
          onOpenRanking={() => setScreen("ranking")}
          onStartBattle={startBattle}
        />
      )}

      {(screen === "normal" || screen === "ranked") && <BattleScreen battle={battle} rankedScore={rankedScore} screen={screen} />}

      {screen === "matching" && <MatchingScreen matchingCountdown={matchingCountdown} pendingBattle={pendingBattle} />}

      {screen === "cards" && <CardsScreen cards={cards} inventory={inventory} />}

      {screen === "gacha" && <GachaScreen gachaCards={gachaCards} gachaCount={gachaCount} isDrawing={isDrawing} onStartGacha={startGacha} />}

      {screen === "ranking" && <RankingScreen rankedRows={rankedRows} />}
    </main>
  );
}
