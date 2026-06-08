import type { GameCard } from "./cards";

export type InventoryEntry = {
  cardId: number;
  quantity: number;
};

export type InventoryRow = {
  card_id: number;
  quantity: number;
};

export type InventoryDrawInput = {
  count: 1 | 10 | 100;
};

const allowedDrawCounts = new Set<number>([1, 10, 100]);

function assertPositiveInteger(value: number, label: string) {
  if (!Number.isInteger(value) || value <= 0) {
    throw new Error(`Inventory requires a valid ${label}`);
  }
}

export function mapInventoryRow(row: InventoryRow): InventoryEntry {
  assertPositiveInteger(row.card_id, "card id");

  if (!Number.isInteger(row.quantity) || row.quantity < 0) {
    throw new Error("Inventory requires a valid quantity");
  }

  return {
    cardId: row.card_id,
    quantity: row.quantity,
  };
}

export function parseDrawInventoryInput(input: unknown): InventoryDrawInput {
  if (!input || typeof input !== "object" || !("count" in input)) {
    throw new Error("Draw payload requires a valid count");
  }

  const count = (input as { count: unknown }).count;
  if (typeof count !== "number" || !Number.isInteger(count) || !allowedDrawCounts.has(count)) {
    throw new Error("Draw payload requires a valid count");
  }

  return { count: count as InventoryDrawInput["count"] };
}

export function drawRandomCards(cards: GameCard[], count: InventoryDrawInput["count"], random: () => number = Math.random) {
  if (cards.length === 0) {
    throw new Error("Draw requires a non-empty card pool");
  }

  return Array.from({ length: count }, () => cards[Math.floor(random() * cards.length)] ?? cards[0]);
}

export function mergeInventoryEntries(current: InventoryEntry[], next: InventoryEntry[]) {
  const quantities = new Map(current.map((entry) => [entry.cardId, entry.quantity]));

  next.forEach((entry) => {
    quantities.set(entry.cardId, entry.quantity);
  });

  return [...quantities.entries()]
    .map(([cardId, quantity]) => ({ cardId, quantity }))
    .sort((a, b) => a.cardId - b.cardId);
}

export function getInventoryQuantity(inventory: InventoryEntry[], cardId: number) {
  return inventory.find((entry) => entry.cardId === cardId)?.quantity ?? 0;
}
