create table if not exists public.game_players (
  id bigint primary key generated always as identity,
  nickname text not null check (length(trim(nickname)) > 0),
  score integer not null default 1000 check (score >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (nickname)
);

alter table public.game_players enable row level security;

revoke all on public.game_players from public;
revoke all on public.game_players from anon, authenticated;
grant select on public.game_players to anon, authenticated;

drop policy if exists "public can read game players" on public.game_players;
create policy "public can read game players"
on public.game_players
for select
to anon, authenticated
using (true);

insert into public.game_players (nickname, score, created_at, updated_at)
select
  trimmed_rankings.nickname,
  max(trimmed_rankings.score),
  min(trimmed_rankings.created_at),
  max(trimmed_rankings.updated_at)
from (
  select
    trim(player_name) as nickname,
    score,
    created_at,
    updated_at
  from public.game_rankings
  where length(trim(player_name)) > 0
) as trimmed_rankings
group by trimmed_rankings.nickname
on conflict (nickname) do update
set
  score = excluded.score,
  updated_at = excluded.updated_at;

alter table public.game_inventory
  add column if not exists player_id bigint;

revoke all on public.game_inventory from public;
revoke all on public.game_inventory from anon, authenticated;
grant select on public.game_inventory to anon, authenticated;
grant select, insert, update, delete on public.game_inventory to service_role;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'game_inventory_player_id_fkey'
      and conrelid = 'public.game_inventory'::regclass
  ) then
    alter table public.game_inventory
      add constraint game_inventory_player_id_fkey
      foreign key (player_id)
      references public.game_players(id)
      on delete cascade;
  end if;
end
$$;

insert into public.game_players (nickname, score)
select 'Player', 1000
where exists (
  select 1
  from public.game_inventory
  where player_id is null
)
and not exists (select 1 from public.game_players);

update public.game_inventory
set player_id = (
  select game_players.id
  from public.game_players
  left join public.game_rankings
    on trim(game_rankings.player_name) = game_players.nickname
  order by
    game_rankings.is_player desc nulls last,
    game_players.id
  limit 1
)
where player_id is null;

alter table public.game_inventory
  alter column player_id set not null;

alter table public.game_inventory
  drop constraint if exists game_inventory_card_id_key;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'game_inventory_player_card_key'
      and conrelid = 'public.game_inventory'::regclass
  ) then
    alter table public.game_inventory
      add constraint game_inventory_player_card_key
      unique (player_id, card_id);
  end if;
end
$$;

create index if not exists game_inventory_player_id_idx
on public.game_inventory(player_id);

create index if not exists game_inventory_player_card_id_idx
on public.game_inventory(player_id, card_id);

alter table public.game_matches
  add column if not exists player_id bigint;

revoke all on public.game_matches from public;
revoke all on public.game_matches from anon, authenticated;
grant select, insert, update, delete on public.game_matches to service_role;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'game_matches_player_id_fkey'
      and conrelid = 'public.game_matches'::regclass
  ) then
    alter table public.game_matches
      add constraint game_matches_player_id_fkey
      foreign key (player_id)
      references public.game_players(id)
      on delete set null;
  end if;
end
$$;

create index if not exists game_matches_player_id_idx
on public.game_matches(player_id);

do $$
begin
  if exists (
    select 1
    from pg_proc
    where oid = 'public.increment_game_inventory(bigint[])'::regprocedure
  ) then
    revoke execute on function public.increment_game_inventory(bigint[]) from public;
    revoke execute on function public.increment_game_inventory(bigint[]) from anon, authenticated;
    revoke execute on function public.increment_game_inventory(bigint[]) from service_role;
  end if;
exception
  when undefined_function then
    null;
end
$$;

drop function if exists public.increment_game_inventory(bigint[]);

create or replace function public.increment_game_inventory(
  target_player_id bigint,
  drawn_card_ids bigint[]
)
returns table(card_id bigint, quantity integer)
language sql
as $$
  with target_player as (
    select id
    from public.game_players
    where id = target_player_id
  ),
  drawn_cards as (
    select drawn_card_id as card_id, count(*)::integer as drawn_quantity
    from unnest(drawn_card_ids) as drawn_card_id
    group by drawn_card_id
  ),
  valid_drawn_cards as (
    select drawn_cards.card_id, drawn_cards.drawn_quantity
    from drawn_cards
    join public.game_cards on game_cards.id = drawn_cards.card_id
    cross join target_player
  ),
  upserted_inventory as (
    insert into public.game_inventory (player_id, card_id, quantity, updated_at)
    select target_player_id, card_id, drawn_quantity, now()
    from valid_drawn_cards
    on conflict (player_id, card_id)
    do update set
      quantity = game_inventory.quantity + excluded.quantity,
      updated_at = now()
    returning game_inventory.card_id, game_inventory.quantity
  )
  select upserted_inventory.card_id, upserted_inventory.quantity
  from upserted_inventory
  order by upserted_inventory.card_id;
$$;

revoke execute on function public.increment_game_inventory(bigint, bigint[]) from public;
revoke execute on function public.increment_game_inventory(bigint, bigint[]) from anon, authenticated;
grant execute on function public.increment_game_inventory(bigint, bigint[]) to service_role;
