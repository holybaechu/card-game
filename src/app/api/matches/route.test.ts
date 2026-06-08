import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { handleMatchPost } from "./route";

describe("handleMatchPost", () => {
  it("persists validated matches with server-derived score deltas", async () => {
    let persistedRequest: unknown;
    const response = await handleMatchPost(
      new Request("http://localhost/api/matches", {
        method: "POST",
        body: JSON.stringify({
          nickname: "junhu",
          mode: "ranked",
          playerCardId: 1,
          enemyCardId: 2,
          result: "player-win",
        }),
      }),
      async (match) => {
        persistedRequest = match;
        return {
          persisted: true,
          match: {
            nickname: "junhu",
            mode: "ranked",
            playerCardId: 1,
            enemyCardId: 2,
            result: "player-win",
            scoreDelta: 25,
          },
          player: { id: 7, nickname: "junhu", score: 1025 },
          rankings: [{ id: 7, nickname: "junhu", score: 1025, place: 1, isActivePlayer: true }],
        };
      },
    );

    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), {
      persisted: true,
      nickname: "junhu",
      mode: "ranked",
      playerCardId: 1,
      enemyCardId: 2,
      result: "player-win",
      scoreDelta: 25,
      player: { id: 7, nickname: "junhu", score: 1025 },
      rankings: [{ id: 7, nickname: "junhu", score: 1025, place: 1, isActivePlayer: true }],
    });
    assert.deepEqual(persistedRequest, {
      nickname: "junhu",
      mode: "ranked",
      playerCardId: 1,
      enemyCardId: 2,
      result: "player-win",
    });
  });

  it("rejects invalid results from the browser", async () => {
    const response = await handleMatchPost(
      new Request("http://localhost/api/matches", {
        method: "POST",
        body: JSON.stringify({
          nickname: "junhu",
          mode: "ranked",
          playerCardId: 1,
          enemyCardId: 2,
          result: "free-win",
        }),
      }),
      async () => ({ persisted: true, match: null, player: null, rankings: [] }),
    );

    assert.equal(response.status, 400);
    assert.deepEqual(await response.json(), { persisted: false });
  });

  it("rejects score deltas from the browser", async () => {
    const response = await handleMatchPost(
      new Request("http://localhost/api/matches", {
        method: "POST",
        body: JSON.stringify({
          nickname: "junhu",
          mode: "ranked",
          playerCardId: 1,
          enemyCardId: 2,
          scoreDelta: 1000,
        }),
      }),
      async () => ({ persisted: true, match: null, player: null, rankings: [] }),
    );

    assert.equal(response.status, 400);
    assert.deepEqual(await response.json(), { persisted: false });
  });

  it("returns a calculated fallback match when database persistence is unavailable", async () => {
    const response = await handleMatchPost(
      new Request("http://localhost/api/matches", {
        method: "POST",
        body: JSON.stringify({
          nickname: "junhu",
          mode: "normal",
          playerCardId: 1,
          enemyCardId: 2,
        }),
      }),
      async () => ({
        persisted: false,
        match: {
          nickname: "junhu",
          mode: "normal",
          playerCardId: 1,
          enemyCardId: 2,
          result: "player-win",
          scoreDelta: 0,
        },
        player: null,
        rankings: [],
      }),
    );

    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), {
      persisted: false,
      nickname: "junhu",
      mode: "normal",
      playerCardId: 1,
      enemyCardId: 2,
      result: "player-win",
      scoreDelta: 0,
      player: null,
      rankings: [],
    });
  });

  it("returns unavailable when a match cannot be calculated or persisted", async () => {
    const response = await handleMatchPost(
      new Request("http://localhost/api/matches", {
        method: "POST",
        body: JSON.stringify({
          nickname: "junhu",
          mode: "ranked",
          playerCardId: 1,
          enemyCardId: 2,
        }),
      }),
      async () => ({
        persisted: false,
        match: null,
        player: { id: 7, nickname: "junhu", score: 1000 },
        rankings: [{ id: 7, nickname: "junhu", score: 1000, place: 1, isActivePlayer: true }],
      }),
    );

    assert.equal(response.status, 503);
    assert.deepEqual(await response.json(), {
      persisted: false,
      player: { id: 7, nickname: "junhu", score: 1000 },
      rankings: [{ id: 7, nickname: "junhu", score: 1000, place: 1, isActivePlayer: true }],
    });
  });
});
