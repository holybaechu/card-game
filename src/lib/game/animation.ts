import type { InventoryDrawInput } from "./inventory";

export type BattleSide = "player" | "enemy";
export type BattleEffect = "laser" | "explosion" | "fire";

const BATTLE_EFFECT_SEQUENCE: BattleEffect[] = ["laser", "explosion", "fire"];

export function gachaAnimationLayout(count: InventoryDrawInput["count"]) {
  if (count === 1) {
    return {
      gridClass: "gacha-grid gacha-grid-single gacha-grid-showcase",
      cardClass: "gacha-card-pop gacha-size-large",
    };
  }

  if (count === 10) {
    return {
      gridClass: "gacha-grid gacha-grid-medium",
      cardClass: "gacha-card-pop gacha-size-medium",
    };
  }

  return {
    gridClass: "gacha-grid gacha-grid-large",
    cardClass: "gacha-card-pop gacha-size-small",
  };
}

export function gachaRevealTiming(count: InventoryDrawInput["count"]) {
  if (count === 1) {
    return { intervalMs: 650, effectSeconds: 1.25 };
  }

  if (count === 10) {
    return { intervalMs: 260, effectSeconds: 1.05 };
  }

  return { intervalMs: 45, effectSeconds: 0.72 };
}

export function battleAnimationForTick(tick: number): { attacker: BattleSide; defender: BattleSide; effect: BattleEffect } | null {
  if (tick <= 0) {
    return null;
  }

  const effect = BATTLE_EFFECT_SEQUENCE[(tick - 1) % BATTLE_EFFECT_SEQUENCE.length];

  return tick % 2 === 1 ? { attacker: "player", defender: "enemy", effect } : { attacker: "enemy", defender: "player", effect };
}
