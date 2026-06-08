import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { handlePlayerSessionPost } from "./route";

describe("handlePlayerSessionPost", () => {
  it("upserts a validated player session", async () => {
    let persistedNickname: unknown;
    const response = await handlePlayerSessionPost(
      new Request("http://localhost/api/player/session", {
        method: "POST",
        body: JSON.stringify({ nickname: "junhu" }),
      }),
      async (nickname) => {
        persistedNickname = nickname;
        return { id: 7, nickname: "junhu", score: 1000 };
      },
    );

    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), { id: 7, nickname: "junhu", score: 1000 });
    assert.equal(persistedNickname, "junhu");
  });

  it("returns unavailable when persistence cannot create a player", async () => {
    const response = await handlePlayerSessionPost(
      new Request("http://localhost/api/player/session", {
        method: "POST",
        body: JSON.stringify({ nickname: "junhu" }),
      }),
      async () => null,
    );

    assert.equal(response.status, 503);
    assert.deepEqual(await response.json(), { player: null });
  });

  it("rejects malformed player session payloads", async () => {
    const response = await handlePlayerSessionPost(
      new Request("http://localhost/api/player/session", {
        method: "POST",
        body: JSON.stringify({ nickname: "" }),
      }),
      async () => ({ id: 7, nickname: "junhu", score: 1000 }),
    );

    assert.equal(response.status, 400);
    assert.deepEqual(await response.json(), { player: null });
  });
});
