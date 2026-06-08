import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { drawRandomCards, mapInventoryRow, parseDrawInventoryInput } from "./inventory";

describe("parseDrawInventoryInput", () => {
  it("accepts an allowed draw count", () => {
    assert.deepEqual(parseDrawInventoryInput({ count: 1 }), { count: 1 });
    assert.deepEqual(parseDrawInventoryInput({ count: 10 }), { count: 10 });
    assert.deepEqual(parseDrawInventoryInput({ count: 100 }), { count: 100 });
  });

  it("rejects caller-provided card ids", () => {
    assert.throws(() => parseDrawInventoryInput({ cardIds: [1, 2, 2, 20] }), /count/i);
  });

  it("rejects invalid counts", () => {
    assert.throws(() => parseDrawInventoryInput({ count: 0 }), /count/i);
    assert.throws(() => parseDrawInventoryInput({ count: 2 }), /count/i);
    assert.throws(() => parseDrawInventoryInput({ count: 101 }), /count/i);
    assert.throws(() => parseDrawInventoryInput({ count: "10" }), /count/i);
  });
});

describe("drawRandomCards", () => {
  it("draws cards from the provided pool using the supplied random function", () => {
    const cards = [
      { id: 1, name: "One", rank: "R", attack: 10, hp: 100, imagePath: "/cards/1.png", sortOrder: 1 },
      { id: 2, name: "Two", rank: "SR", attack: 20, hp: 100, imagePath: "/cards/2.png", sortOrder: 2 },
    ];

    assert.deepEqual(
      drawRandomCards(cards, 3, () => 0.99).map((card) => card.id),
      [2, 2, 2],
    );
  });

  it("rejects empty card pools", () => {
    assert.throws(() => drawRandomCards([], 1), /card pool/i);
  });
});

describe("mapInventoryRow", () => {
  it("maps Supabase rows into inventory entries", () => {
    assert.deepEqual(mapInventoryRow({ card_id: 3, quantity: 7 }), { cardId: 3, quantity: 7 });
  });

  it("rejects invalid quantities", () => {
    assert.throws(() => mapInventoryRow({ card_id: 3, quantity: -1 }), /quantity/i);
  });
});
