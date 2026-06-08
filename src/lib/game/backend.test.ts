import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { getInitialGameData, getPlayerSession, recordInventoryDraw, recordMatchResult } from "./backend";
import { fallbackCards } from "./cards";
import { sortRankingRows, type PlayerSession } from "./player";

describe("getInitialGameData", () => {
  it("returns fallback cards, rankings, and empty inventory when Supabase env vars are missing", async () => {
    const player: PlayerSession = { id: 99, nickname: "junhu", score: 420 };
    const data = await getInitialGameData({ env: {}, player });

    assert.equal(data.cards.length, fallbackCards.length);
    assert.equal(data.cards[0]?.imagePath, "/cards/001-gemini-5wa9.png");
    assert.deepEqual(data.rankings, sortRankingRows([player], player.id));
    assert.deepEqual(data.inventory, []);
  });
});

describe("getPlayerSession", () => {
  it("posts nickname and maps player response", async () => {
    let postedBody: unknown;

    const result = await getPlayerSession({
      fetcher: async (_url, init) => {
        postedBody = JSON.parse(String(init?.body));
        return Response.json({ id: 17, nickname: "junhu", score: 900 });
      },
      nickname: "junhu",
    });

    assert.deepEqual(result, { id: 17, nickname: "junhu", score: 900 });
    assert.deepEqual(postedBody, { nickname: "junhu" });
  });

  it("returns null when player session persistence is unavailable", async () => {
    const result = await getPlayerSession({
      fetcher: async () => Response.json({ player: null }, { status: 503 }),
      nickname: "junhu",
    });

    assert.equal(result, null);
  });

  it("returns null when fetch throws", async () => {
    const result = await getPlayerSession({
      fetcher: async () => {
        throw new Error("network down");
      },
      nickname: "junhu",
    });

    assert.equal(result, null);
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
          player: { id: 7, nickname: "junhu", score: 250 },
        });
      },
      draw: { nickname: "junhu", count: 10 },
    });

    assert.deepEqual(result, {
      persisted: true,
      drawnCards: [fallbackCards[0]],
      inventory: [{ cardId: 1, quantity: 2 }],
      player: { id: 7, nickname: "junhu", score: 250 },
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
      fetcher: async (_url, init) => {
        postedBody = JSON.parse(String(init?.body));
        return Response.json({
          persisted: true,
          player: { id: 12, nickname: "junhu", score: 1000 },
          mode: "ranked",
          nickname: "junhu",
          playerCardId: 1,
          enemyCardId: 2,
          rankings: [{ id: 12, nickname: "junhu", score: 1000, place: 1, isActivePlayer: true }],
          result: "player-win",
          scoreDelta: 25,
        });
      },
      match: {
        nickname: "junhu",
        mode: "ranked",
        playerCardId: 1,
        enemyCardId: 2,
      },
    });

    assert.deepEqual(result, {
      persisted: true,
      player: { id: 12, nickname: "junhu", score: 1000 },
      match: {
        nickname: "junhu",
        mode: "ranked",
        playerCardId: 1,
        enemyCardId: 2,
        result: "player-win",
        scoreDelta: 25,
      },
      rankings: [{ id: 12, nickname: "junhu", score: 1000, place: 1, isActivePlayer: true }],
    });
    assert.deepEqual(postedBody, {
      nickname: "junhu",
      mode: "ranked",
      playerCardId: 1,
      enemyCardId: 2,
    });
  });

  it("returns false when server persistence is unavailable", async () => {
    const result = await recordMatchResult({
      fetcher: async () => Response.json({ persisted: false }, { status: 503 }),
      match: {
        nickname: "junhu",
        mode: "ranked",
        playerCardId: 1,
        enemyCardId: 2,
      },
    });

    assert.deepEqual(result, { persisted: false, match: null, player: null, rankings: [] });
  });
});
