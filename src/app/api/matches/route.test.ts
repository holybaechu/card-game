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
          mode: "ranked",
          playerCardId: 1,
          enemyCardId: 2,
        }),
      }),
      async (match) => {
        persistedRequest = match;
        return {
          persisted: true,
          match: {
            mode: "ranked",
            playerCardId: 1,
            enemyCardId: 2,
            result: "player-win",
            scoreDelta: 25,
          },
        };
      },
    );

    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), {
      persisted: true,
      mode: "ranked",
      playerCardId: 1,
      enemyCardId: 2,
      result: "player-win",
      scoreDelta: 25,
    });
    assert.deepEqual(persistedRequest, {
      mode: "ranked",
      playerCardId: 1,
      enemyCardId: 2,
    });
  });

  it("rejects results from the browser", async () => {
    const response = await handleMatchPost(
      new Request("http://localhost/api/matches", {
        method: "POST",
        body: JSON.stringify({
          mode: "ranked",
          playerCardId: 1,
          enemyCardId: 2,
          result: "player-win",
        }),
      }),
      async () => ({ persisted: true, match: null }),
    );

    assert.equal(response.status, 400);
    assert.deepEqual(await response.json(), { persisted: false });
  });

  it("rejects score deltas from the browser", async () => {
    const response = await handleMatchPost(
      new Request("http://localhost/api/matches", {
        method: "POST",
        body: JSON.stringify({
          mode: "ranked",
          playerCardId: 1,
          enemyCardId: 2,
          scoreDelta: 1000,
        }),
      }),
      async () => ({ persisted: true, match: null }),
    );

    assert.equal(response.status, 400);
    assert.deepEqual(await response.json(), { persisted: false });
  });

  it("returns a calculated fallback match when database persistence is unavailable", async () => {
    const response = await handleMatchPost(
      new Request("http://localhost/api/matches", {
        method: "POST",
        body: JSON.stringify({
          mode: "normal",
          playerCardId: 1,
          enemyCardId: 2,
        }),
      }),
      async () => ({
        persisted: false,
        match: {
          mode: "normal",
          playerCardId: 1,
          enemyCardId: 2,
          result: "player-win",
          scoreDelta: 0,
        },
      }),
    );

    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), {
      persisted: false,
      mode: "normal",
      playerCardId: 1,
      enemyCardId: 2,
      result: "player-win",
      scoreDelta: 0,
    });
  });
});
