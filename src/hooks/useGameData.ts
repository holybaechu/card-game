"use client";

import { useEffect, useState } from "react";

import { createBattle, type BattleState } from "@/lib/game/battle";
import { fallbackCards, type GameCard } from "@/lib/game/cards";
import { fallbackRankings, getInitialGameData, type RankingEntry } from "@/lib/game/backend";
import type { InventoryEntry } from "@/lib/game/inventory";

export function useGameData() {
  const [cards, setCards] = useState<GameCard[]>(fallbackCards);
  const [rankings, setRankings] = useState<RankingEntry[]>(fallbackRankings);
  const [inventory, setInventory] = useState<InventoryEntry[]>([]);
  const [battle, setBattle] = useState<BattleState>(() => createBattle(fallbackCards));

  useEffect(() => {
    let active = true;

    getInitialGameData().then((data) => {
      if (!active) {
        return;
      }

      setCards(data.cards);
      setRankings(data.rankings);
      setInventory(data.inventory);
      setBattle(createBattle(data.cards));
    });

    return () => {
      active = false;
    };
  }, []);

  return {
    battle,
    cards,
    inventory,
    rankings,
    setBattle,
    setInventory,
    setRankings,
  };
}
