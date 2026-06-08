import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { persistInventoryDraw, persistMatchResult } from "./server-backend";

describe("persistMatchResult", () => {
  it("calculates a match without persistence when the server client is unavailable", async () => {
    const result = await persistMatchResult({
      client: null,
      cards: [
        { id: 1, name: "Strong", rank: "SSR", attack: 30, hp: 120, imagePath: "/cards/1.png", sortOrder: 1 },
        { id: 2, name: "Weak", rank: "R", attack: 10, hp: 100, imagePath: "/cards/2.png", sortOrder: 2 },
      ],
      match: { mode: "ranked", playerCardId: 1, enemyCardId: 2 },
    });

    assert.deepEqual(result, {
      persisted: false,
      match: {
        mode: "ranked",
        playerCardId: 1,
        enemyCardId: 2,
        result: "player-win",
        scoreDelta: 25,
      },
    });
  });
});

describe("persistInventoryDraw", () => {
  it("draws cards server-side before calling the inventory increment RPC", async () => {
    let rpcName: unknown;
    let rpcArgs: unknown;
    const client = {
      rpc(name: string, args: unknown) {
        rpcName = name;
        rpcArgs = args;
        return Promise.resolve({
          data: [{ card_id: 1, quantity: 2 }],
          error: null,
        });
      },
    };

    const result = await persistInventoryDraw({
      client,
      draw: { count: 10 },
      cards: [
        { id: 1, name: "One", rank: "R", attack: 10, hp: 100, imagePath: "/cards/1.png", sortOrder: 1 },
        { id: 2, name: "Two", rank: "SR", attack: 20, hp: 100, imagePath: "/cards/2.png", sortOrder: 2 },
      ],
      random: () => 0,
    });

    assert.deepEqual(result, {
      persisted: true,
      drawnCards: Array.from({ length: 10 }, () => ({ id: 1, name: "One", rank: "R", attack: 10, hp: 100, imagePath: "/cards/1.png", sortOrder: 1 })),
      inventory: [{ cardId: 1, quantity: 2 }],
    });
    assert.equal(rpcName, "increment_game_inventory");
    assert.deepEqual(rpcArgs, { drawn_card_ids: Array.from({ length: 10 }, () => 1) });
  });

  it("returns false when the server client is unavailable", async () => {
    const result = await persistInventoryDraw({
      client: null,
      cards: [{ id: 1, name: "One", rank: "R", attack: 10, hp: 100, imagePath: "/cards/1.png", sortOrder: 1 }],
      draw: { count: 1 },
    });

    assert.deepEqual(result, {
      persisted: false,
      drawnCards: [{ id: 1, name: "One", rank: "R", attack: 10, hp: 100, imagePath: "/cards/1.png", sortOrder: 1 }],
      inventory: [],
    });
  });
});
