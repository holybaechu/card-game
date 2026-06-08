create or replace function public.increment_game_player_score(
  target_player_id bigint,
  score_delta integer
)
returns table(id bigint, nickname text, score integer)
language sql
as $$
  update public.game_players
  set
    score = greatest(0, game_players.score + score_delta),
    updated_at = now()
  where game_players.id = target_player_id
  returning game_players.id, game_players.nickname, game_players.score;
$$;

revoke execute on function public.increment_game_player_score(bigint, integer) from public;
revoke execute on function public.increment_game_player_score(bigint, integer) from anon, authenticated;
grant execute on function public.increment_game_player_score(bigint, integer) to service_role;
