import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { persistInventoryDraw, persistMatchResult, upsertPlayerSession } from "./server-backend";

type SupabaseResponse<T> = Promise<{ data: T; error: unknown }>;

function playerUpsertClient(row: { id: number; nickname: string; score: number }, calls: unknown[]) {
  return {
    from(table: string) {
      assert.equal(table, "game_players");
      return {
        upsert(payload: unknown, options: unknown) {
          calls.push({ payload, options });
          return {
            select(columns: string) {
              calls.push({ columns });
              return {
                maybeSingle(): SupabaseResponse<typeof row> {
                  return Promise.resolve({ data: row, error: null });
                },
              };
            },
          };
        },
      };
    },
  };
}

describe("persistMatchResult", () => {
  it("upserts and maps a player session by normalized nickname", async () => {
    const calls: unknown[] = [];
    const player = await upsertPlayerSession({
      client: playerUpsertClient({ id: 42, nickname: "junhu", score: 1025 }, calls),
      nickname: "  junhu  ",
    });

    assert.deepEqual(player, { id: 42, nickname: "junhu", score: 1025 });
    assert.deepEqual(calls, [
      { payload: { nickname: "junhu" }, options: { onConflict: "nickname" } },
      { columns: "id,nickname,score" },
    ]);
  });

  it("calculates a match without persistence when the server client is unavailable", async () => {
    const result = await persistMatchResult({
      client: null,
      cards: [
        { id: 1, name: "Strong", rank: "SSR", attack: 30, hp: 120, imagePath: "/cards/1.png", sortOrder: 1 },
        { id: 2, name: "Weak", rank: "R", attack: 10, hp: 100, imagePath: "/cards/2.png", sortOrder: 2 },
      ],
      match: { nickname: "  junhu  ", mode: "ranked", playerCardId: 1, enemyCardId: 2 },
    });

    assert.deepEqual(result, {
      persisted: false,
      match: {
        nickname: "junhu",
        mode: "ranked",
        playerCardId: 1,
        enemyCardId: 2,
        result: "player-win",
        scoreDelta: 25,
      },
      player: { id: 1, nickname: "junhu", score: 1000 },
      rankings: [{ id: 1, nickname: "junhu", score: 1000, place: 1, isActivePlayer: true }],
    });
  });

  it("persists ranked wins against the resolved player and returns the updated player score", async () => {
    const inserts: unknown[] = [];
    const rpcCalls: unknown[] = [];
    const client = {
      from(table: string) {
        if (table === "game_players") {
          return {
            upsert(payload: unknown, options: unknown) {
              assert.deepEqual(payload, { nickname: "junhu" });
              assert.deepEqual(options, { onConflict: "nickname" });
              return {
                select() {
                  return {
                    maybeSingle() {
                      return Promise.resolve({ data: { id: 7, nickname: "junhu", score: 1000 }, error: null });
                    },
                  };
                },
              };
            },
            select() {
              return {
                order() {
                  return Promise.resolve({
                    data: [
                      { id: 8, nickname: "alpha", score: 1100 },
                      { id: 7, nickname: "junhu", score: 1025 },
                    ],
                    error: null,
                  });
                },
              };
            },
          };
        }

        assert.equal(table, "game_matches");
        return {
          insert(payload: unknown) {
            inserts.push(payload);
            return Promise.resolve({ error: null });
          },
        };
      },
      rpc(name: string, args: unknown) {
        rpcCalls.push({ name, args });
        return Promise.resolve({
          data: { id: 7, nickname: "junhu", score: 1025 },
          error: null,
        });
      },
    };

    const result = await persistMatchResult({
      client,
      cards: [
        { id: 1, name: "Strong", rank: "SSR", attack: 30, hp: 120, imagePath: "/cards/1.png", sortOrder: 1 },
        { id: 2, name: "Weak", rank: "R", attack: 10, hp: 100, imagePath: "/cards/2.png", sortOrder: 2 },
      ],
      match: { nickname: "junhu", mode: "ranked", playerCardId: 1, enemyCardId: 2 },
    });

    assert.deepEqual(inserts, [
      {
        player_id: 7,
        mode: "ranked",
        player_card_id: 1,
        enemy_card_id: 2,
        result: "player-win",
        score_delta: 25,
      },
    ]);
    assert.deepEqual(rpcCalls, [
      {
        name: "increment_game_player_score",
        args: { target_player_id: 7, score_delta: 25 },
      },
    ]);
    assert.deepEqual(result.player, { id: 7, nickname: "junhu", score: 1025 });
    assert.deepEqual(result.rankings, [
      { id: 8, nickname: "alpha", score: 1100, place: 1, isActivePlayer: false },
      { id: 7, nickname: "junhu", score: 1025, place: 2, isActivePlayer: true },
    ]);
    assert.equal(result.persisted, true);
  });
});

describe("persistInventoryDraw", () => {
  it("draws cards server-side before calling the inventory increment RPC", async () => {
    let rpcName: unknown;
    let rpcArgs: unknown;
    const client = {
      from(table: string) {
        assert.equal(table, "game_players");
        return {
          upsert() {
            return {
              select() {
                return {
                  maybeSingle() {
                    return Promise.resolve({ data: { id: 9, nickname: "junhu", score: 1000 }, error: null });
                  },
                };
              },
            };
          },
        };
      },
      rpc(name: string, args: unknown) {
        rpcName = name;
        rpcArgs = args;
        return Promise.resolve({
          data: [{ card_id: 1, quantity: 2 }],
          error: null,
        });
      },
    };

    const result = await persistInventoryDraw({
      client,
      draw: { nickname: "junhu", count: 10 },
      cards: [
        { id: 1, name: "One", rank: "R", attack: 10, hp: 100, imagePath: "/cards/1.png", sortOrder: 1 },
        { id: 2, name: "Two", rank: "SR", attack: 20, hp: 100, imagePath: "/cards/2.png", sortOrder: 2 },
      ],
      random: () => 0,
    });

    assert.deepEqual(result, {
      persisted: true,
      drawnCards: Array.from({ length: 10 }, () => ({ id: 1, name: "One", rank: "R", attack: 10, hp: 100, imagePath: "/cards/1.png", sortOrder: 1 })),
      inventory: [{ cardId: 1, quantity: 2 }],
      player: { id: 9, nickname: "junhu", score: 1000 },
    });
    assert.equal(rpcName, "increment_game_inventory");
    assert.deepEqual(rpcArgs, { target_player_id: 9, drawn_card_ids: Array.from({ length: 10 }, () => 1) });
  });

  it("returns false when the server client is unavailable", async () => {
    const result = await persistInventoryDraw({
      client: null,
      cards: [{ id: 1, name: "One", rank: "R", attack: 10, hp: 100, imagePath: "/cards/1.png", sortOrder: 1 }],
      draw: { nickname: "junhu", count: 1 },
    });

    assert.deepEqual(result, {
      persisted: false,
      drawnCards: [{ id: 1, name: "One", rank: "R", attack: 10, hp: 100, imagePath: "/cards/1.png", sortOrder: 1 }],
      inventory: [],
      player: { id: 1, nickname: "junhu", score: 1000 },
    });
  });
});
