"use client";

import { useEffect, useMemo, useRef, useState, type Dispatch, type SetStateAction } from "react";

import { createBattle, updatePlayerScore, type BattleState, type BattleStatus } from "@/lib/game/battle";
import { recordMatchResult, type RankingEntry } from "@/lib/game/backend";
import type { GameCard } from "@/lib/game/cards";

export type GameScreen = "home" | "normal" | "ranked" | "cards" | "ranking" | "gacha" | "matching";
type BattleMode = "normal" | "ranked";

export function useBattleFlow({
  battle,
  cards,
  rankings,
  screen,
  setBattle,
  setRankings,
  setScreen,
}: {
  battle: BattleState;
  cards: GameCard[];
  rankings: RankingEntry[];
  screen: GameScreen;
  setBattle: Dispatch<SetStateAction<BattleState>>;
  setRankings: Dispatch<SetStateAction<RankingEntry[]>>;
  setScreen: Dispatch<SetStateAction<GameScreen>>;
}) {
  const [pendingBattle, setPendingBattle] = useState<BattleMode | null>(null);
  const [matchingCountdown, setMatchingCountdown] = useState(3);
  const recordedMatches = useRef(new Set<string>());

  useEffect(() => {
    if (screen !== "matching" || !pendingBattle) {
      return;
    }

    const tickTimer = window.setInterval(() => {
      setMatchingCountdown((value) => Math.max(0, value - 1));
    }, 1000);

    const enterTimer = window.setTimeout(() => {
      setBattle(createBattle(cards));
      setScreen(pendingBattle);
      setPendingBattle(null);
    }, 3000);

    return () => {
      window.clearInterval(tickTimer);
      window.clearTimeout(enterTimer);
    };
  }, [cards, pendingBattle, screen, setBattle, setScreen]);

  useEffect(() => {
    if ((screen !== "normal" && screen !== "ranked") || battle.status !== "running") {
      return;
    }

    const timer = window.setInterval(() => {
      setBattle((current) => {
        if (current.status !== "running") {
          return current;
        }

        const playerTurn = current.tick % 2 === 0;
        const playerDamage = Math.max(8, Math.round(current.player.attack * (0.75 + Math.random() * 0.5)));
        const enemyDamage = Math.max(8, Math.round(current.enemy.attack * (0.75 + Math.random() * 0.5)));
        const nextEnemyHp = Math.max(0, current.enemyHp - (playerTurn ? playerDamage : 0));
        const nextPlayerHp = Math.max(0, current.playerHp - (playerTurn ? 0 : enemyDamage));
        const nextStatus: BattleStatus = nextEnemyHp <= 0 ? "player-win" : nextPlayerHp <= 0 ? "enemy-win" : "running";

        return {
          ...current,
          enemyHp: nextEnemyHp,
          playerHp: nextPlayerHp,
          status: nextStatus,
          tick: current.tick + 1,
        };
      });
    }, 1000);

    return () => window.clearInterval(timer);
  }, [battle.status, screen, setBattle]);

  useEffect(() => {
    if ((screen !== "normal" && screen !== "ranked") || battle.status === "running") {
      return;
    }

    const matchKey = `${screen}-${battle.player.id}-${battle.enemy.id}-${battle.tick}-${battle.status}`;
    if (recordedMatches.current.has(matchKey)) {
      return;
    }

    recordedMatches.current.add(matchKey);

    void recordMatchResult({
      match: {
        mode: screen,
        playerCardId: battle.player.id,
        enemyCardId: battle.enemy.id,
      },
    }).then((result) => {
      if (result.persisted && result.match && result.match.scoreDelta > 0) {
        setRankings((current) => updatePlayerScore(current, result.match?.scoreDelta ?? 0));
      }
    });
  }, [battle.enemy.id, battle.player.id, battle.status, battle.tick, screen, setRankings]);

  const rankedScore = rankings.find((entry) => entry.isPlayer)?.score ?? 1000;
  const rankedRows = useMemo(
    () =>
      [...rankings]
        .sort((a, b) => b.score - a.score)
        .map((entry, index) => ({ ...entry, place: index + 1 })),
    [rankings],
  );

  function startBattle(nextScreen: BattleMode) {
    setPendingBattle(nextScreen);
    setMatchingCountdown(3);
    setScreen("matching");
  }

  function cancelPendingBattle() {
    setPendingBattle(null);
  }

  return {
    cancelPendingBattle,
    matchingCountdown,
    pendingBattle,
    rankedRows,
    rankedScore,
    startBattle,
  };
}
