import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  getFallbackRankings,
  getInitialGameData,
  getPlayerSession,
  recordInventoryDraw,
  recordMatchResult,
} from "./backend";
import { fallbackCards } from "./cards";

describe("getPlayerSession", () => {
  it("posts a nickname and maps a player session", async () => {
    let postedBody: unknown;
    const result = await getPlayerSession({
      fetcher: async (_url, init) => {
        postedBody = JSON.parse(String(init?.body));
        return Response.json({ id: 42, nickname: "junhu", score: 750 });
      },
      nickname: "junhu",
    });

    assert.deepEqual(result, { id: 42, nickname: "junhu", score: 750 });
    assert.deepEqual(postedBody, { nickname: "junhu" });
  });

  it("returns null on non-ok response", async () => {
    const result = await getPlayerSession({
      fetcher: async () => Response.json({ id: 42 }, { status: 503 }),
      nickname: "junhu",
    });

    assert.equal(result, null);
  });

  it("returns null when session request throws", async () => {
    const result = await getPlayerSession({
      fetcher: async () => {
        throw new Error("network error");
      },
      nickname: "junhu",
    });

    assert.equal(result, null);
  });
});

describe("getInitialGameData", () => {
  it("returns fallback cards, rankings, and empty inventory when Supabase env vars are missing", async () => {
    const player = { id: 99, nickname: "junhu", score: 1000 };
    const data = await getInitialGameData({ env: {}, player });
    const expectedFallback = getFallbackRankings(player);

    assert.equal(data.cards.length, fallbackCards.length);
    assert.equal(data.cards[0]?.imagePath, "/cards/001-gemini-5wa9.png");
    assert.deepEqual(data.rankings, expectedFallback);
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
          player: { id: 42, nickname: "junhu", score: 1000 },
        });
      },
      draw: { nickname: "junhu", count: 10 },
    });

    assert.deepEqual(result, {
      persisted: true,
      drawnCards: [fallbackCards[0]],
      inventory: [{ cardId: 1, quantity: 2 }],
      player: { id: 42, nickname: "junhu", score: 1000 },
    });
    assert.deepEqual(postedBody, { nickname: "junhu", count: 10 });
  });

  it("returns false when inventory persistence is unavailable", async () => {
    const result = await recordInventoryDraw({
      fetcher: async () => Response.json({ persisted: false, drawnCards: [], inventory: [] }, { status: 503 }),
      draw: { nickname: "junhu", count: 1 },
    });

    assert.deepEqual(result, { persisted: false, drawnCards: [], inventory: [], player: null });
  });
});

describe("recordMatchResult", () => {
  it("posts match requests to the server without caller-controlled outcomes", async () => {
    let postedBody: unknown;

    const result = await recordMatchResult({
      player: { id: 10, nickname: "junhu", score: 1000 },
      fetcher: async (_url, init) => {
        postedBody = JSON.parse(String(init?.body));
        return Response.json({
          persisted: true,
          mode: "ranked",
          playerCardId: 1,
          enemyCardId: 2,
          result: "player-win",
          scoreDelta: 25,
          player: { id: 99, nickname: "junhu", score: 1025 },
          rankings: [
            { id: 99, nickname: "junhu", score: 1025 },
            { id: 1, nickname: "NeonMaster", score: 1360 },
          ],
        });
      },
      match: {
        mode: "ranked",
        playerCardId: 1,
        enemyCardId: 2,
        nickname: "junhu",
      },
    });

    assert.deepEqual(result, {
      persisted: true,
      player: { id: 99, nickname: "junhu", score: 1025 },
      match: {
        mode: "ranked",
        playerCardId: 1,
        enemyCardId: 2,
        result: "player-win",
        scoreDelta: 25,
      },
      rankings: [
        { name: "NeonMaster", score: 1360, isPlayer: false },
        { name: "junhu", score: 1025, isPlayer: true },
      ],
    });
    assert.deepEqual(postedBody, { mode: "ranked", playerCardId: 1, enemyCardId: 2, nickname: "junhu" });
  });

  it("returns false when server persistence is unavailable", async () => {
    const result = await recordMatchResult({
      player: { id: 10, nickname: "junhu", score: 1000 },
      fetcher: async () => Response.json({ persisted: false }, { status: 503 }),
      match: {
        mode: "ranked",
        playerCardId: 1,
        enemyCardId: 2,
        nickname: "junhu",
      },
    });

    assert.deepEqual(result, { persisted: false, match: null, player: null, rankings: [] });
  });
});
