"use client";

import { useEffect, useState } from "react";

import { createBattle, type BattleState } from "@/lib/game/battle";
import { fallbackCards, type GameCard } from "@/lib/game/cards";
import { getInitialGameData, type PlayerSession, type RankingEntry } from "@/lib/game/backend";
import type { InventoryEntry } from "@/lib/game/inventory";

export function useGameData({ player }: { player: PlayerSession | null }) {
  const [cards, setCards] = useState<GameCard[]>(fallbackCards);
  const [rankings, setRankings] = useState<RankingEntry[]>([]);
  const [inventory, setInventory] = useState<InventoryEntry[]>([]);
  const [battle, setBattle] = useState<BattleState>(() => createBattle(fallbackCards));

  useEffect(() => {
    let active = true;

    if (!player) {
      setCards(fallbackCards);
      setRankings([]);
      setInventory([]);
      setBattle(createBattle(fallbackCards));
      return;
    }

    getInitialGameData({ player }).then((data) => {
      if (!active) {
        return;
      }

      setCards(data.cards);
      setRankings(data.rankings);
      setInventory(data.inventory);
      setBattle(createBattle(data.cards));
    }).catch(() => {
      setCards(fallbackCards);
      setRankings([]);
      setInventory([]);
      setBattle(createBattle(fallbackCards));
    });

    return () => {
      active = false;
    };
  }, [player]);

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
