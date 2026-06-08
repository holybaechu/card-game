import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { mapPlayerRow, mapRankingPlayerRow, parseNickname, parsePlayerSessionInput, sortRankingRows } from "./player";

describe("parseNickname", () => {
  it("trims and accepts nickname account identifiers", () => {
    assert.equal(parseNickname("  junhu  "), "junhu");
    assert.equal(parseNickname("배준후 7"), "배준후 7");
    assert.equal(parseNickname("neo-card_99"), "neo-card_99");
  });

  it("rejects empty, too short, too long, and unsafe nicknames", () => {
    assert.throws(() => parseNickname(""), /nickname/i);
    assert.throws(() => parseNickname("a"), /nickname/i);
    assert.throws(() => parseNickname("a".repeat(17)), /nickname/i);
    assert.throws(() => parseNickname("admin<script>"), /nickname/i);
  });

  it("rejects non-space whitespace instead of normalizing it", () => {
    assert.throws(() => parseNickname("ab\tcd"), /nickname/i);
    assert.throws(() => parseNickname("ab\ncd"), /nickname/i);
  });
});

describe("parsePlayerSessionInput", () => {
  it("returns a normalized nickname from request payloads", () => {
    assert.deepEqual(parsePlayerSessionInput({ nickname: "  player one " }), { nickname: "player one" });
  });

  it("rejects missing nickname payloads", () => {
    assert.throws(() => parsePlayerSessionInput({}), /nickname/i);
    assert.throws(() => parsePlayerSessionInput(null), /nickname/i);
  });
});

describe("player row mapping", () => {
  it("maps player rows and ranking rows", () => {
    assert.deepEqual(mapPlayerRow({ id: 12, nickname: "junhu", score: 1025 }), { id: 12, nickname: "junhu", score: 1025 });
    assert.deepEqual(mapRankingPlayerRow({ id: 12, nickname: "junhu", score: 1025 }, 2, 12), {
      id: 12,
      nickname: "junhu",
      score: 1025,
      place: 2,
      isActivePlayer: true,
    });
  });

  it("sorts ranking rows by score descending", () => {
    const rows = sortRankingRows([
      { id: 1, nickname: "low", score: 900 },
      { id: 2, nickname: "high", score: 1200 },
    ], 1);

    assert.deepEqual(rows, [
      { id: 2, nickname: "high", score: 1200, place: 1, isActivePlayer: false },
      { id: 1, nickname: "low", score: 900, place: 2, isActivePlayer: true },
    ]);
  });

  it("sorts ranking ties by nickname", () => {
    const rows = sortRankingRows([
      { id: 1, nickname: "zeta", score: 1000 },
      { id: 2, nickname: "alpha", score: 1000 },
      { id: 3, nickname: "middle", score: 1000 },
    ], 3);

    assert.deepEqual(rows, [
      { id: 2, nickname: "alpha", score: 1000, place: 1, isActivePlayer: false },
      { id: 3, nickname: "middle", score: 1000, place: 2, isActivePlayer: true },
      { id: 1, nickname: "zeta", score: 1000, place: 3, isActivePlayer: false },
    ]);
  });

  it("rejects invalid player row ids and scores", () => {
    assert.throws(() => mapPlayerRow({ id: 0, nickname: "junhu", score: 1000 }), /player id/i);
    assert.throws(() => mapPlayerRow({ id: 1.5, nickname: "junhu", score: 1000 }), /player id/i);
    assert.throws(() => mapPlayerRow({ id: 1, nickname: "junhu", score: -1 }), /score/i);
    assert.throws(() => mapPlayerRow({ id: 1, nickname: "junhu", score: 1000.5 }), /score/i);
  });
});
