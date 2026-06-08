import { persistMatchResult } from "@/lib/game/server-backend";
import { parseMatchRequestInput, type MatchRequestInput, type PersistableMatchResult } from "@/lib/game/matches";

type PersistMatch = (match: MatchRequestInput) => Promise<{ persisted: boolean; match: PersistableMatchResult | null }>;

export async function handleMatchPost(request: Request, persist: PersistMatch = (match) => persistMatchResult({ match })) {
  try {
    const match = parseMatchRequestInput(await request.json());
    const result = await persist(match);

    if (!result.match) {
      return Response.json({ persisted: false }, { status: 503 });
    }

    return Response.json({ persisted: result.persisted, ...result.match }, { status: 200 });
  } catch {
    return Response.json({ persisted: false }, { status: 400 });
  }
}

export async function POST(request: Request) {
  return handleMatchPost(request);
}
