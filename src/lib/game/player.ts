export type PlayerSession = {
  id: number;
  nickname: string;
  score: number;
};

export type PlayerRow = {
  id: number;
  nickname: string;
  score: number;
};

export type RankingPlayerRow = PlayerRow;

export type RankingEntry = PlayerSession & {
  place: number;
  isActivePlayer: boolean;
};

const nicknamePattern = /^[0-9A-Za-z가-힣ㄱ-ㅎㅏ-ㅣ _.-]+$/u;

function assertPositiveInteger(value: unknown, label: string): asserts value is number {
  if (!Number.isInteger(value) || Number(value) <= 0) {
    throw new Error(`Player requires a valid ${label}`);
  }
}

export function parseNickname(value: unknown) {
  if (typeof value !== "string") {
    throw new Error("Player session requires a valid nickname");
  }

  const nickname = value.trim().replace(/\s+/g, " ");
  if (nickname.length < 2 || nickname.length > 16 || !nicknamePattern.test(nickname)) {
    throw new Error("Player session requires a valid nickname");
  }

  return nickname;
}

export function parsePlayerSessionInput(input: unknown): { nickname: string } {
  if (!input || typeof input !== "object" || !("nickname" in input)) {
    throw new Error("Player session requires a valid nickname");
  }

  return { nickname: parseNickname((input as { nickname: unknown }).nickname) };
}

export function mapPlayerRow(row: PlayerRow): PlayerSession {
  assertPositiveInteger(row.id, "player id");
  const nickname = parseNickname(row.nickname);

  if (!Number.isInteger(row.score) || row.score < 0) {
    throw new Error("Player requires a valid score");
  }

  return { id: row.id, nickname, score: row.score };
}

export function mapRankingPlayerRow(row: RankingPlayerRow, place: number, activePlayerId: number): RankingEntry {
  return {
    ...mapPlayerRow(row),
    place,
    isActivePlayer: row.id === activePlayerId,
  };
}

export function sortRankingRows(rows: RankingPlayerRow[], activePlayerId: number): RankingEntry[] {
  return [...rows]
    .sort((a, b) => b.score - a.score || a.nickname.localeCompare(b.nickname))
    .map((row, index) => mapRankingPlayerRow(row, index + 1, activePlayerId));
}
