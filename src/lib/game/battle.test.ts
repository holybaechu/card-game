import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { createBattle, hpPercent, updatePlayerScore } from "./battle";
import { fallbackCards } from "./cards";

describe("createBattle", () => {
  it("creates a battle with two different cards when the deck allows it", () => {
    const battle = createBattle(fallbackCards.slice(0, 2), () => 0);

    assert.notEqual(battle.player.id, battle.enemy.id);
    assert.equal(battle.playerHp, battle.player.hp);
    assert.equal(battle.enemyHp, battle.enemy.hp);
    assert.equal(battle.status, "running");
  });
});

describe("hpPercent", () => {
  it("clamps hp percentages to the visible range", () => {
    assert.equal(hpPercent(50, 100), 50);
    assert.equal(hpPercent(-10, 100), 0);
    assert.equal(hpPercent(150, 100), 100);
  });
});

describe("updatePlayerScore", () => {
  it("only updates the player score and keeps scores non-negative", () => {
    const rankings = [
      { id: 1, nickname: "Player", score: 10, place: 1, isActivePlayer: true },
      { id: 2, nickname: "Rival", score: 20, place: 2, isActivePlayer: false },
    ];

    assert.deepEqual(updatePlayerScore(rankings, -30), [
      { id: 1, nickname: "Player", score: 0, place: 1, isActivePlayer: true },
      { id: 2, nickname: "Rival", score: 20, place: 2, isActivePlayer: false },
    ]);
  });
});
