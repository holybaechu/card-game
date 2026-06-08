import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { handleInventoryDrawPost } from "./route";

describe("handleInventoryDrawPost", () => {
  it("persists a validated draw count", async () => {
    let persistedRequest: unknown;
    const response = await handleInventoryDrawPost(
      new Request("http://localhost/api/inventory/draws", {
        method: "POST",
        body: JSON.stringify({ nickname: "junhu", count: 10 }),
      }),
      async (draw) => {
        persistedRequest = draw;
        return {
          persisted: true,
          drawnCards: [
            { id: 1, name: "One", rank: "R", attack: 10, hp: 100, imagePath: "/cards/1.png", sortOrder: 1 },
            { id: 2, name: "Two", rank: "SR", attack: 20, hp: 100, imagePath: "/cards/2.png", sortOrder: 2 },
          ],
          inventory: [{ cardId: 1, quantity: 1 }, { cardId: 2, quantity: 1 }],
          player: { id: 7, nickname: "junhu", score: 1000 },
        };
      },
    );

    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), {
      persisted: true,
      drawnCards: [
        { id: 1, name: "One", rank: "R", attack: 10, hp: 100, imagePath: "/cards/1.png", sortOrder: 1 },
        { id: 2, name: "Two", rank: "SR", attack: 20, hp: 100, imagePath: "/cards/2.png", sortOrder: 2 },
      ],
      inventory: [{ cardId: 1, quantity: 1 }, { cardId: 2, quantity: 1 }],
      player: { id: 7, nickname: "junhu", score: 1000 },
    });
    assert.deepEqual(persistedRequest, { nickname: "junhu", count: 10 });
  });

  it("rejects malformed draw payloads", async () => {
    const response = await handleInventoryDrawPost(
      new Request("http://localhost/api/inventory/draws", {
        method: "POST",
        body: JSON.stringify({ cardIds: [1, "2"] }),
      }),
      async () => ({ persisted: true, drawnCards: [], inventory: [], player: null }),
    );

    assert.equal(response.status, 400);
    assert.deepEqual(await response.json(), { persisted: false, drawnCards: [], inventory: [] });
  });

  it("returns server-drawn fallback cards when database persistence is unavailable", async () => {
    const response = await handleInventoryDrawPost(
      new Request("http://localhost/api/inventory/draws", {
        method: "POST",
        body: JSON.stringify({ nickname: "junhu", count: 1 }),
      }),
      async () => ({
        persisted: false,
        drawnCards: [{ id: 1, name: "One", rank: "R", attack: 10, hp: 100, imagePath: "/cards/1.png", sortOrder: 1 }],
        inventory: [],
        player: { id: 7, nickname: "junhu", score: 1000 },
      }),
    );

    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), {
      persisted: false,
      drawnCards: [{ id: 1, name: "One", rank: "R", attack: 10, hp: 100, imagePath: "/cards/1.png", sortOrder: 1 }],
      inventory: [],
      player: { id: 7, nickname: "junhu", score: 1000 },
    });
  });
});
