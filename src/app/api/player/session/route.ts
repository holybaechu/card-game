import { parsePlayerSessionInput, type PlayerSession } from "../../../../lib/game/player";
import { upsertPlayerSession } from "../../../../lib/game/server-backend";
import { createServerSupabaseClient } from "../../../../lib/supabase/server";

type PersistPlayerSession = (nickname: string) => Promise<PlayerSession | null>;

export async function handlePlayerSessionPost(
  request: Request,
  persist: PersistPlayerSession = (nickname) => upsertPlayerSession({ client: createServerSupabaseClient(), nickname }),
) {
  try {
    const { nickname } = parsePlayerSessionInput(await request.json());
    const player = await persist(nickname);

    if (!player) {
      return Response.json({ player: null }, { status: 503 });
    }

    return Response.json(player, { status: 200 });
  } catch {
    return Response.json({ player: null }, { status: 400 });
  }
}

export async function POST(request: Request) {
  return handlePlayerSessionPost(request);
}
