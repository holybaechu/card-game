import type { GameCard } from "./cards";
import { parseNickname } from "./player";

export type MatchMode = "normal" | "ranked";
export type MatchResult = "player-win" | "enemy-win" | "draw";

export type MatchRequestInput = {
  nickname: string;
  mode: MatchMode;
  playerCardId: number;
  enemyCardId: number;
  result?: MatchResult;
};

export type PersistableMatchResult = {
  nickname: string;
  mode: MatchMode;
  playerCardId: number;
  enemyCardId: number;
  result: MatchResult;
  scoreDelta: number;
};

const matchModes = new Set<MatchMode>(["normal", "ranked"]);
const matchResults = new Set<MatchResult>(["player-win", "enemy-win", "draw"]);

function assertPositiveInteger(value: unknown, label: string): asserts value is number {
  if (!Number.isInteger(value) || Number(value) <= 0) {
    throw new Error(`Match result requires a valid ${label}`);
  }
}

export function getRankedScoreDelta({ mode, result }: { mode: MatchMode; result: MatchResult }) {
  return mode === "ranked" && result === "player-win" ? 25 : 0;
}

export function parseMatchRequestInput(input: unknown): MatchRequestInput {
  if (!input || typeof input !== "object") {
    throw new Error("Match request requires an object payload");
  }

  const value = input as MatchRequestInput & Record<string, unknown>;

  if (!("nickname" in value)) {
    throw new Error("Match request requires a valid nickname");
  }

  const nickname = parseNickname(value.nickname);

  if (!matchModes.has(value.mode)) {
    throw new Error("Match request requires a valid mode");
  }

  const result = "result" in value ? value.result : undefined;
  if (result !== undefined && !matchResults.has(result as MatchResult)) {
    throw new Error("Match request requires a valid result");
  }

  if ("scoreDelta" in value) {
    throw new Error("Match request score delta is server controlled");
  }

  assertPositiveInteger(value.playerCardId, "player card id");
  assertPositiveInteger(value.enemyCardId, "enemy card id");

  if (value.playerCardId === value.enemyCardId) {
    throw new Error("Match request requires two different card ids");
  }

  return {
    nickname,
    mode: value.mode,
    playerCardId: value.playerCardId,
    enemyCardId: value.enemyCardId,
    ...(result !== undefined ? { result: result as MatchResult } : {}),
  };
}

function cardPower(card: GameCard) {
  return card.attack * 2 + card.hp;
}

export function createServerMatchResult(request: MatchRequestInput, cards: GameCard[]): PersistableMatchResult {
  const player = cards.find((card) => card.id === request.playerCardId);
  const enemy = cards.find((card) => card.id === request.enemyCardId);

  if (!player || !enemy) {
    throw new Error("Match request requires known cards");
  }

  const playerPower = cardPower(player);
  const enemyPower = cardPower(enemy);
  const result: MatchResult =
    request.result ?? (playerPower > enemyPower ? "player-win" : enemyPower > playerPower ? "enemy-win" : "draw");

  return {
    ...request,
    result,
    scoreDelta: getRankedScoreDelta({ mode: request.mode, result }),
  };
}
