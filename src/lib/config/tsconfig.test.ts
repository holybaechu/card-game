import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it } from "node:test";

describe("tsconfig path aliases", () => {
  it("maps @ imports to the src directory for Next and Turbopack", () => {
    const tsconfig = JSON.parse(readFileSync(join(process.cwd(), "tsconfig.json"), "utf8"));

    assert.equal(tsconfig.compilerOptions.baseUrl, ".");
    assert.deepEqual(tsconfig.compilerOptions.paths, {
      "@/*": ["./src/*"],
    });
  });
});
