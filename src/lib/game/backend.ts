import { createGameSupabaseClient, getPublicSupabaseEnv, hasPublicSupabaseEnv, type PublicSupabaseEnv } from "@/lib/supabase/client";
import { fallbackCards, mapCardRow, type CardRow, type GameCard } from "./cards";
import { mapInventoryRow, type InventoryDrawInput, type InventoryEntry } from "./inventory";
import { mapPlayerRow, sortRankingRows, type PlayerSession, type RankingEntry } from "./player";
import type { MatchRequestInput, PersistableMatchResult } from "./matches";

export type { RankingEntry } from "./player";

export type InitialGameData = {
  cards: GameCard[];
  rankings: RankingEntry[];
  inventory: InventoryEntry[];
};

const emptyRankings: RankingEntry[] = [];

export const fallbackRankings = emptyRankings;

function isPlayerRow(value: unknown): value is { id: unknown; nickname: unknown; score: unknown } {
  if (!value || typeof value !== "object") {
    return false;
  }

  const row = value as { id: unknown; nickname: unknown; score: unknown };
  return ["id", "nickname", "score"].every((key) => key in row);
}

function mapPlayerFromBody(value: unknown): PlayerSession | null {
  if (!isPlayerRow(value)) {
    return null;
  }

  try {
    return mapPlayerRow({ id: value.id as number, nickname: value.nickname as string, score: value.score as number });
  } catch {
    return null;
  }
}

function mapPlayerRowsFromBody(value: unknown): PlayerSession[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.map(mapPlayerFromBody).filter((entry): entry is PlayerSession => entry !== null);
}

function mapRankingEntryFromBody(value: unknown) {
  if (!value || typeof value !== "object") {
    return null;
  }

  const candidate = value as {
    id?: unknown;
    nickname?: unknown;
    score?: unknown;
    place?: unknown;
    isActivePlayer?: unknown;
  };

  const player = mapPlayerFromBody({ id: candidate.id, nickname: candidate.nickname, score: candidate.score });
  if (!player) {
    return null;
  }

  if (!Number.isInteger(candidate.place as number) || (candidate.place as number) <= 0 || typeof candidate.isActivePlayer !== "boolean") {
    return null;
  }

  return {
    ...player,
    place: candidate.place as number,
    isActivePlayer: candidate.isActivePlayer,
  };
}

function mapRankingsFromBody(value: unknown): RankingEntry[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.map(mapRankingEntryFromBody).filter((entry): entry is RankingEntry => entry !== null);
}

function mapInventoryEntryFromBody(value: unknown): InventoryEntry | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const candidate = value as { card_id?: unknown; cardId?: unknown; quantity?: unknown };

  if ("card_id" in candidate) {
    try {
      return mapInventoryRow({
        card_id: candidate.card_id as number,
        quantity: candidate.quantity as number,
      });
    } catch {
      return null;
    }
  }

  if (typeof candidate.cardId !== "number" || !Number.isInteger(candidate.cardId) || candidate.cardId <= 0) {
    return null;
  }

  if (typeof candidate.quantity !== "number" || !Number.isInteger(candidate.quantity) || candidate.quantity < 0) {
    return null;
  }

  return {
    cardId: candidate.cardId,
    quantity: candidate.quantity,
  };
}

function mapInventoryFromBody(value: unknown): InventoryEntry[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.map(mapInventoryEntryFromBody).filter((entry): entry is InventoryEntry => entry !== null);
}

export async function getPlayerSession({
  nickname,
  fetcher = fetch,
}: {
  nickname: string;
  fetcher?: typeof fetch;
}): Promise<PlayerSession | null> {
  try {
    const response = await fetcher("/api/player/session", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ nickname }),
    });

    if (!response.ok) {
      return null;
    }

    const data = (await response.json()) as unknown;
    return mapPlayerFromBody(data);
  } catch {
    return null;
  }
}

export async function getInitialGameData({
  player,
  env = getPublicSupabaseEnv(),
}: {
  player: PlayerSession;
  env?: PublicSupabaseEnv;
}): Promise<InitialGameData> {
  if (!hasPublicSupabaseEnv(env)) {
    return { cards: fallbackCards, rankings: sortRankingRows([player], player.id), inventory: [] };
  }

  const supabase = createGameSupabaseClient(env);
  if (!supabase) {
    return { cards: fallbackCards, rankings: sortRankingRows([player], player.id), inventory: [] };
  }

  const [cardsResponse, rankingsResponse, inventoryResponse] = await Promise.all([
    supabase.from("game_cards").select("id,name,rarity,attack,hp,image_path,sort_order").order("sort_order"),
    supabase.from("game_players").select("id,nickname,score").order("score", { ascending: false }),
    supabase.from("game_inventory").select("card_id,quantity").eq("player_id", player.id).order("card_id"),
  ]);

  const cards = cardsResponse.error || !cardsResponse.data?.length ? fallbackCards : (cardsResponse.data as CardRow[]).map(mapCardRow);
  const mappedPlayers = !rankingsResponse.error ? mapPlayerRowsFromBody(rankingsResponse.data) : [];
  const rankings =
    !rankingsResponse.error && mappedPlayers.length > 0 ? sortRankingRows(mappedPlayers, player.id) : sortRankingRows([player], player.id);
  const inventory = mapInventoryFromBody(!inventoryResponse.error ? inventoryResponse.data : null);

  return { cards, rankings, inventory };
}

type InventoryApiResponse = {
  persisted?: unknown;
  drawnCards?: unknown;
  inventory?: unknown;
  player?: unknown;
};

export async function recordInventoryDraw({
  draw,
  fetcher = fetch,
}: {
  draw: InventoryDrawInput;
  fetcher?: typeof fetch;
}): Promise<{ persisted: boolean; drawnCards: GameCard[]; inventory: InventoryEntry[]; player: PlayerSession | null }> {
  try {
    const response = await fetcher("/api/inventory/draws", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(draw),
    });

    if (!response.ok) {
      return { persisted: false, drawnCards: [], inventory: [], player: null };
    }

    const data = (await response.json()) as InventoryApiResponse;
    return {
      persisted: data.persisted === true,
      drawnCards: Array.isArray(data.drawnCards) ? (data.drawnCards as GameCard[]) : [],
      inventory: mapInventoryFromBody(data.inventory),
      player: mapPlayerFromBody(data.player),
    };
  } catch {
    return { persisted: false, drawnCards: [], inventory: [], player: null };
  }
}

type MatchApiResponse = {
  persisted?: unknown;
  player?: unknown;
  match?: unknown;
  rankings?: unknown;
};

function mapMatchResult(value: unknown): PersistableMatchResult | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const maybeMatch = value as {
    nickname?: unknown;
    mode?: unknown;
    playerCardId?: unknown;
    enemyCardId?: unknown;
    result?: unknown;
    scoreDelta?: unknown;
  };

  if (
    typeof maybeMatch.nickname !== "string" ||
    !["normal", "ranked"].includes(maybeMatch.mode as "normal" | "ranked") ||
    !Number.isInteger(maybeMatch.playerCardId as number) ||
    !Number.isInteger(maybeMatch.enemyCardId as number) ||
    !["player-win", "enemy-win", "draw"].includes(maybeMatch.result as "player-win" | "enemy-win" | "draw") ||
    !Number.isInteger(maybeMatch.scoreDelta as number)
  ) {
    return null;
  }

  return {
    nickname: maybeMatch.nickname,
    mode: maybeMatch.mode as PersistableMatchResult["mode"],
    playerCardId: maybeMatch.playerCardId as number,
    enemyCardId: maybeMatch.enemyCardId as number,
    result: maybeMatch.result as PersistableMatchResult["result"],
    scoreDelta: maybeMatch.scoreDelta as number,
  };
}

export async function recordMatchResult({
  fetcher = fetch,
  match,
}: {
  match: MatchRequestInput;
  fetcher?: typeof fetch;
}): Promise<{ persisted: boolean; match: PersistableMatchResult | null; player: PlayerSession | null; rankings: RankingEntry[] }> {
  try {
    const response = await fetcher("/api/matches", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(match),
    });

    if (!response.ok) {
      return { persisted: false, match: null, player: null, rankings: [] };
    }

    const data = (await response.json()) as MatchApiResponse;
    const matchCandidate = "match" in (data as object) ? data.match : undefined;
    return {
      persisted: data.persisted === true,
      match: mapMatchResult(matchCandidate ?? data),
      player: mapPlayerFromBody(data.player),
      rankings: mapRankingsFromBody(data.rankings),
    };
  } catch {
    return { persisted: false, match: null, player: null, rankings: [] };
  }
}
