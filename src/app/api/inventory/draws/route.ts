import { parseDrawInventoryInput, type InventoryDrawInput } from "../../../../lib/game/inventory";
import { persistInventoryDraw } from "../../../../lib/game/server-backend";
import type { GameCard } from "../../../../lib/game/cards";
import type { PlayerSession } from "../../../../lib/game/player";

type PersistInventoryDraw = (draw: InventoryDrawInput) => Promise<{
  persisted: boolean;
  drawnCards: GameCard[];
  inventory: { cardId: number; quantity: number }[];
  player: PlayerSession | null;
}>;

export async function handleInventoryDrawPost(
  request: Request,
  persist: PersistInventoryDraw = (draw) => persistInventoryDraw({ draw }),
) {
  try {
    const draw = parseDrawInventoryInput(await request.json());
    const result = await persist(draw);

    return Response.json(result, { status: result.persisted || result.drawnCards.length > 0 ? 200 : 503 });
  } catch {
    return Response.json({ persisted: false, drawnCards: [], inventory: [] }, { status: 400 });
  }
}

export async function POST(request: Request) {
  return handleInventoryDrawPost(request);
}
