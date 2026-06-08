create table public.game_inventory (
  id bigint primary key generated always as identity,
  card_id bigint not null references public.game_cards(id) on delete cascade,
  quantity integer not null default 0 check (quantity >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (card_id)
);

create index game_inventory_card_id_idx on public.game_inventory(card_id);

alter table public.game_inventory enable row level security;

grant select on public.game_inventory to anon, authenticated;

create policy "public can read game inventory"
on public.game_inventory
for select
to anon, authenticated
using (true);

create or replace function public.increment_game_inventory(drawn_card_ids bigint[])
returns table(card_id bigint, quantity integer)
language sql
as $$
  with drawn_cards as (
    select card_id, count(*)::integer as drawn_quantity
    from unnest(drawn_card_ids) as card_id
    group by card_id
  ),
  valid_drawn_cards as (
    select drawn_cards.card_id, drawn_cards.drawn_quantity
    from drawn_cards
    join public.game_cards on game_cards.id = drawn_cards.card_id
  ),
  upserted_inventory as (
    insert into public.game_inventory (card_id, quantity, updated_at)
    select card_id, drawn_quantity, now()
    from valid_drawn_cards
    on conflict (card_id)
    do update set
      quantity = game_inventory.quantity + excluded.quantity,
      updated_at = now()
    returning game_inventory.card_id, game_inventory.quantity
  )
  select upserted_inventory.card_id, upserted_inventory.quantity
  from upserted_inventory
  order by upserted_inventory.card_id;
$$;

revoke execute on function public.increment_game_inventory(bigint[]) from public;
revoke execute on function public.increment_game_inventory(bigint[]) from anon, authenticated;
grant execute on function public.increment_game_inventory(bigint[]) to service_role;
