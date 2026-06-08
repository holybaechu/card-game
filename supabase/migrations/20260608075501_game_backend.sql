create table public.game_cards (
  id bigint primary key generated always as identity,
  name text not null check (length(trim(name)) > 0),
  rarity text not null check (length(trim(rarity)) > 0),
  attack integer not null check (attack > 0),
  hp integer not null check (hp > 0),
  image_path text not null check (image_path like '/cards/%'),
  sort_order integer not null unique check (sort_order > 0),
  created_at timestamptz not null default now()
);

create table public.game_rankings (
  id bigint primary key generated always as identity,
  player_name text not null check (length(trim(player_name)) > 0),
  score integer not null check (score >= 0),
  is_player boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.game_matches (
  id bigint primary key generated always as identity,
  mode text not null check (mode in ('normal', 'ranked')),
  player_card_id bigint references public.game_cards(id) on delete set null,
  enemy_card_id bigint references public.game_cards(id) on delete set null,
  result text not null check (result in ('player-win', 'enemy-win', 'draw')),
  score_delta integer not null default 0,
  created_at timestamptz not null default now()
);

alter table public.game_cards enable row level security;
alter table public.game_rankings enable row level security;
alter table public.game_matches enable row level security;

grant usage on schema public to anon, authenticated;
grant select on public.game_cards to anon, authenticated;
grant select, update on public.game_rankings to anon, authenticated;
grant insert on public.game_matches to anon, authenticated;
grant usage, select on all sequences in schema public to anon, authenticated;

create policy "public can read game cards"
on public.game_cards
for select
to anon, authenticated
using (true);

create policy "public can read rankings"
on public.game_rankings
for select
to anon, authenticated
using (true);

create policy "public can update player ranking score"
on public.game_rankings
for update
to anon, authenticated
using (is_player = true)
with check (is_player = true);

create policy "public can record match results"
on public.game_matches
for insert
to anon, authenticated
with check (mode in ('normal', 'ranked') and result in ('player-win', 'enemy-win', 'draw'));
