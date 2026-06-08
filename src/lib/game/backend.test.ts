import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { getInitialGameData, recordInventoryDraw, recordMatchResult } from "./backend";
import { fallbackCards } from "./cards";

describe("getInitialGameData", () => {
  it("returns fallback cards, rankings, and empty inventory when Supabase env vars are missing", async () => {
    const data = await getInitialGameData({ env: {} });

    assert.equal(data.cards.length, fallbackCards.length);
    assert.equal(data.cards[0]?.imagePath, "/cards/001-gemini-5wa9.png");
    assert.equal(data.rankings.length, 5);
    assert.deepEqual(data.inventory, []);
  });
});

describe("recordInventoryDraw", () => {
  it("posts draw count to the server and returns drawn cards", async () => {
    let postedBody: unknown;

    const result = await recordInventoryDraw({
      fetcher: async (_url, init) => {
        postedBody = JSON.parse(String(init?.body));
        return Response.json({
          persisted: true,
          drawnCards: [fallbackCards[0]],
          inventory: [{ cardId: 1, quantity: 2 }],
        });
      },
      count: 10,
    });

    assert.deepEqual(result, { persisted: true, drawnCards: [fallbackCards[0]], inventory: [{ cardId: 1, quantity: 2 }] });
    assert.deepEqual(postedBody, { count: 10 });
  });

  it("returns false when inventory persistence is unavailable", async () => {
    const result = await recordInventoryDraw({
      fetcher: async () => Response.json({ persisted: false, drawnCards: [], inventory: [] }, { status: 503 }),
      count: 1,
    });

    assert.deepEqual(result, { persisted: false, drawnCards: [], inventory: [] });
  });
});

describe("recordMatchResult", () => {
  it("posts match requests to the server without caller-controlled outcomes", async () => {
    let postedBody: unknown;

    const result = await recordMatchResult({
      fetcher: async (_url, init) => {
        postedBody = JSON.parse(String(init?.body));
        return Response.json({
          persisted: true,
          mode: "ranked",
          playerCardId: 1,
          enemyCardId: 2,
          result: "player-win",
          scoreDelta: 25,
        });
      },
      match: {
        mode: "ranked",
        playerCardId: 1,
        enemyCardId: 2,
      },
    });

    assert.deepEqual(result, {
      persisted: true,
      match: {
        mode: "ranked",
        playerCardId: 1,
        enemyCardId: 2,
        result: "player-win",
        scoreDelta: 25,
      },
    });
    assert.deepEqual(postedBody, {
      mode: "ranked",
      playerCardId: 1,
      enemyCardId: 2,
    });
  });

  it("returns false when server persistence is unavailable", async () => {
    const result = await recordMatchResult({
      fetcher: async () => Response.json({ persisted: false }, { status: 503 }),
      match: {
        mode: "ranked",
        playerCardId: 1,
        enemyCardId: 2,
      },
    });

    assert.deepEqual(result, { persisted: false, match: null });
  });
});
