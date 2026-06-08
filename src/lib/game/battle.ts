import { fallbackCards, type GameCard } from "./cards";
import type { RankingEntry } from "./backend";

export type BattleStatus = "running" | "player-win" | "enemy-win" | "draw";

export type BattleState = {
  player: GameCard;
  enemy: GameCard;
  playerHp: number;
  enemyHp: number;
  status: BattleStatus;
  tick: number;
};

export function randomCard(deck: GameCard[], exceptId?: number, random: () => number = Math.random) {
  const pool = deck.filter((card) => card.id !== exceptId);
  return pool[Math.floor(random() * pool.length)] ?? deck[0] ?? fallbackCards[0];
}

export function createBattle(deck: GameCard[], random: () => number = Math.random): BattleState {
  const player = randomCard(deck, undefined, random);
  const enemy = randomCard(deck, player.id, random);

  return {
    player,
    enemy,
    playerHp: player.hp,
    enemyHp: enemy.hp,
    status: "running",
    tick: 0,
  };
}

export function hpPercent(value: number, max: number) {
  return Math.max(0, Math.min(100, Math.round((value / max) * 100)));
}

export function updatePlayerScore(rankings: RankingEntry[], delta: number) {
  return rankings.map((entry) => (entry.isPlayer ? { ...entry, score: Math.max(0, entry.score + delta) } : entry));
}
