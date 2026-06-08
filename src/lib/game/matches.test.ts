import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { createServerMatchResult, getRankedScoreDelta, parseMatchRequestInput } from "./matches";

describe("parseMatchRequestInput", () => {
  it("accepts a valid match request without a caller-controlled result", () => {
    const match = parseMatchRequestInput({
      mode: "ranked",
      playerCardId: 1,
      enemyCardId: 2,
    });

    assert.deepEqual(match, {
      mode: "ranked",
      playerCardId: 1,
      enemyCardId: 2,
    });
  });

  it("rejects caller-provided results", () => {
    assert.throws(
      () =>
        parseMatchRequestInput({
          mode: "ranked",
          playerCardId: 1,
          enemyCardId: 2,
          result: "player-win",
        }),
      /result/i,
    );
  });

  it("rejects caller-provided score deltas", () => {
    assert.throws(
      () =>
        parseMatchRequestInput({
          mode: "ranked",
          playerCardId: 1,
          enemyCardId: 2,
          scoreDelta: 1000,
        }),
      /score delta/i,
    );
  });

  it("rejects malformed card ids", () => {
    assert.throws(
      () =>
        parseMatchRequestInput({
          mode: "normal",
          playerCardId: 0,
          enemyCardId: 2,
        }),
      /card id/i,
    );
  });
});

describe("createServerMatchResult", () => {
  it("derives the match result and ranked score delta from server-owned card stats", () => {
    const match = createServerMatchResult(
      { mode: "ranked", playerCardId: 1, enemyCardId: 2 },
      [
        { id: 1, name: "Strong", rank: "SSR", attack: 30, hp: 120, imagePath: "/cards/1.png", sortOrder: 1 },
        { id: 2, name: "Weak", rank: "R", attack: 10, hp: 100, imagePath: "/cards/2.png", sortOrder: 2 },
      ],
    );

    assert.deepEqual(match, {
      mode: "ranked",
      playerCardId: 1,
      enemyCardId: 2,
      result: "player-win",
      scoreDelta: 25,
    });
  });

  it("rejects match requests for missing cards", () => {
    assert.throws(
      () =>
        createServerMatchResult({ mode: "normal", playerCardId: 1, enemyCardId: 99 }, [
          { id: 1, name: "Only", rank: "R", attack: 10, hp: 100, imagePath: "/cards/1.png", sortOrder: 1 },
        ]),
      /known cards/i,
    );
  });
});

describe("getRankedScoreDelta", () => {
  it("only awards ranked player wins", () => {
    assert.equal(getRankedScoreDelta({ mode: "ranked", result: "player-win" }), 25);
    assert.equal(getRankedScoreDelta({ mode: "ranked", result: "enemy-win" }), 0);
    assert.equal(getRankedScoreDelta({ mode: "normal", result: "player-win" }), 0);
  });
});
