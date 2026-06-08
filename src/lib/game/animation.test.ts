import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { battleAnimationForTick, gachaAnimationLayout, gachaRevealTiming } from "./animation";

describe("gachaAnimationLayout", () => {
  it("centers a single draw as a large showcase card", () => {
    assert.deepEqual(gachaAnimationLayout(1), {
      gridClass: "gacha-grid gacha-grid-single gacha-grid-showcase",
      cardClass: "gacha-card-pop gacha-size-large",
    });
  });

  it("keeps multi draws in denser grids", () => {
    assert.deepEqual(gachaAnimationLayout(10), {
      gridClass: "gacha-grid gacha-grid-medium",
      cardClass: "gacha-card-pop gacha-size-medium",
    });
    assert.deepEqual(gachaAnimationLayout(100), {
      gridClass: "gacha-grid gacha-grid-large",
      cardClass: "gacha-card-pop gacha-size-small",
    });
  });
});

describe("gachaRevealTiming", () => {
  it("maps draw counts to reveal cadence and effect duration", () => {
    assert.deepEqual(gachaRevealTiming(1), { intervalMs: 650, effectSeconds: 1.25 });
    assert.deepEqual(gachaRevealTiming(10), { intervalMs: 260, effectSeconds: 1.05 });
    assert.deepEqual(gachaRevealTiming(100), { intervalMs: 45, effectSeconds: 0.72 });
  });
});

describe("battleAnimationForTick", () => {
  it("maps battle ticks to attacker and defender sides", () => {
    assert.deepEqual(battleAnimationForTick(0), null);
    assert.deepEqual(battleAnimationForTick(1), { attacker: "player", defender: "enemy", effect: "laser" });
    assert.deepEqual(battleAnimationForTick(2), { attacker: "enemy", defender: "player", effect: "explosion" });
    assert.deepEqual(battleAnimationForTick(3), { attacker: "player", defender: "enemy", effect: "fire" });
    assert.deepEqual(battleAnimationForTick(4), { attacker: "enemy", defender: "player", effect: "laser" });
  });
});
