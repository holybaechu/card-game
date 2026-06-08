import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { mapCardRow } from "./cards";

describe("mapCardRow", () => {
  it("preserves card identity, stats, and image path", () => {
    const card = mapCardRow({
      id: 7,
      name: "왕준후",
      rarity: "SSR",
      attack: 21,
      hp: 132,
      image_path: "/cards/007-wang-junhu.png",
      sort_order: 7,
    });

    assert.deepEqual(card, {
      id: 7,
      name: "왕준후",
      rank: "SSR",
      attack: 21,
      hp: 132,
      imagePath: "/cards/007-wang-junhu.png",
      sortOrder: 7,
    });
  });

  it("rejects rows with invalid stat values", () => {
    assert.throws(
      () =>
        mapCardRow({
          id: 1,
          name: "Broken",
          rarity: "N",
          attack: 0,
          hp: 120,
          image_path: "/cards/broken.png",
          sort_order: 1,
        }),
      /valid attack/i,
    );
  });

  it("rejects rows with non-public image paths", () => {
    assert.throws(
      () =>
        mapCardRow({
          id: 1,
          name: "Broken",
          rarity: "N",
          attack: 12,
          hp: 120,
          image_path: "https://example.com/broken.png",
          sort_order: 1,
        }),
      /public image path/i,
    );
  });
});
