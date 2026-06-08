revoke update on public.game_rankings from anon, authenticated;
revoke insert on public.game_matches from anon, authenticated;
revoke usage, select on all sequences in schema public from anon, authenticated;

drop policy if exists "public can update player ranking score" on public.game_rankings;
drop policy if exists "public can record match results" on public.game_matches;

alter table public.game_matches
  add constraint game_matches_distinct_cards
  check (player_card_id is null or enemy_card_id is null or player_card_id <> enemy_card_id);

alter table public.game_matches
  add constraint game_matches_server_scored_delta
  check (
    (
      mode = 'ranked'
      and result = 'player-win'
      and score_delta = 25
    )
    or score_delta = 0
  );
