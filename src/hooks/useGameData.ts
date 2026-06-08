"use client";

import { useEffect, useState } from "react";

import { createBattle, type BattleState } from "@/lib/game/battle";
import { fallbackCards, type GameCard } from "@/lib/game/cards";
import { fallbackRankings, getInitialGameData, type RankingEntry } from "@/lib/game/backend";
import { mergeLoadedInventory, type InventoryEntry } from "@/lib/game/inventory";
import type { PlayerSession } from "@/lib/game/player";

export function useGameData(player: PlayerSession | null) {
  const [cards, setCards] = useState<GameCard[]>(fallbackCards);
  const [rankings, setRankings] = useState<RankingEntry[]>(fallbackRankings);
  const [inventory, setInventory] = useState<InventoryEntry[]>([]);
  const [battle, setBattle] = useState<BattleState>(() => createBattle(fallbackCards));

  useEffect(() => {
    let active = true;
    if (!player) {
      return;
    }

    getInitialGameData({ player }).then((data) => {
      if (!active) {
        return;
      }

      setCards(data.cards);
      setRankings(data.rankings);
      setInventory((current) => mergeLoadedInventory(current, data.inventory));
      setBattle(createBattle(data.cards));
    });

    return () => {
      active = false;
    };
  }, [player]);

  return {
    battle: player ? battle : createBattle(fallbackCards),
    cards: player ? cards : fallbackCards,
    inventory: player ? inventory : [],
    rankings: player ? rankings : fallbackRankings,
    setBattle,
    setInventory,
    setRankings,
  };
}
