import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";

const css = readFileSync(new URL("./globals.css", import.meta.url), "utf8");

function blockFor(selector: string) {
  const escapedSelector = selector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = css.match(new RegExp(`${escapedSelector}\\s*\\{(?<body>[^}]*)\\}`));
  return match?.groups?.body ?? "";
}

describe("global game layout CSS", () => {
  it("keeps the game shell fixed to the viewport instead of scrollable", () => {
    const gameShell = blockFor(".game-shell");

    assert.match(gameShell, /(?:^|\n)\s*height:\s*100svh;/);
    assert.match(gameShell, /overflow-y:\s*hidden;/);
  });
});
