"use client";

import { useEffect, useState, type Dispatch, type SetStateAction } from "react";

import { recordInventoryDraw } from "@/lib/game/backend";
import type { GameCard } from "@/lib/game/cards";
import { mergeInventoryEntries, type InventoryDrawInput, type InventoryEntry } from "@/lib/game/inventory";
import { gachaRevealTiming } from "@/lib/game/animation";
import type { PlayerSession } from "@/lib/game/player";
import type { GameScreen } from "./useBattleFlow";

export function useGachaFlow({
  player,
  setPlayer,
  setInventory,
  setScreen,
}: {
  player: PlayerSession | null;
  setPlayer: Dispatch<SetStateAction<PlayerSession | null>>;
  setInventory: Dispatch<SetStateAction<InventoryEntry[]>>;
  setScreen: Dispatch<SetStateAction<GameScreen>>;
}) {
  const [gachaCards, setGachaCards] = useState<GameCard[]>([]);
  const [gachaCount, setGachaCount] = useState<InventoryDrawInput["count"]>(10);
  const [isDrawing, setIsDrawing] = useState(false);
  const [pendingCards, setPendingCards] = useState<GameCard[]>([]);

  useEffect(() => {
    if (!isDrawing || pendingCards.length === 0) {
      return;
    }

    let index = 0;
    const intervalMs = gachaRevealTiming(gachaCount).intervalMs;
    const timer = window.setInterval(() => {
      const nextCard = pendingCards[index];
      if (!nextCard) {
        window.clearInterval(timer);
        setIsDrawing(false);
        setPendingCards([]);
        return;
      }

      setGachaCards((current) => [...current, nextCard]);
      index += 1;

      if (index >= pendingCards.length) {
        window.clearInterval(timer);
        setIsDrawing(false);
        setPendingCards([]);
      }
    }, intervalMs);

    return () => window.clearInterval(timer);
  }, [isDrawing, pendingCards, gachaCount]);

  function openGacha() {
    setGachaCards([]);
    setIsDrawing(false);
    setPendingCards([]);
    setScreen("gacha");
  }

  function startGacha(count: InventoryDrawInput["count"]) {
    if (isDrawing || !player) {
      return;
    }

    setGachaCount(count);
    setGachaCards([]);
    setPendingCards([]);
    setIsDrawing(true);

    void recordInventoryDraw({ draw: { nickname: player.nickname, count } }).then((result) => {
      if (result.player) {
        setPlayer(result.player);
      }
      if (result.drawnCards.length === 0) {
        setIsDrawing(false);
        return;
      }

      if (result.persisted) {
        setInventory((current) => mergeInventoryEntries(current, result.inventory));
      }
      setPendingCards(result.drawnCards);
    });
  }

  return {
    gachaCards,
    gachaCount,
    isDrawing,
    openGacha,
    startGacha,
  };
}
