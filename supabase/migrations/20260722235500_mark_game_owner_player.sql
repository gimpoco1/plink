update public.games game
set players = (
  select coalesce(
    jsonb_agg(
      case
        when exists (
          select 1
          from public.player_profiles profile
          where profile.user_id = game.user_id
            and profile.is_account_player = true
            and profile.id = player ->> 'profileId'
        ) then player || jsonb_build_object('isGameOwner', true)
        else player - 'isGameOwner'
      end
      order by position
    ),
    '[]'::jsonb
  )
  from jsonb_array_elements(coalesce(game.players, '[]'::jsonb))
    with ordinality as entries(player, position)
)
where exists (
  select 1
  from jsonb_array_elements(coalesce(game.players, '[]'::jsonb)) player
  join public.player_profiles profile
    on profile.id = player ->> 'profileId'
    and profile.user_id = game.user_id
    and profile.is_account_player = true
);

create or replace function public.mark_game_owner_player()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  select coalesce(
    jsonb_agg(
      case
        when exists (
          select 1
          from public.player_profiles profile
          where profile.user_id = new.user_id
            and profile.is_account_player = true
            and profile.id = player ->> 'profileId'
        ) then player || jsonb_build_object('isGameOwner', true)
        else player - 'isGameOwner'
      end
      order by position
    ),
    '[]'::jsonb
  )
  into new.players
  from jsonb_array_elements(coalesce(new.players, '[]'::jsonb))
    with ordinality as entries(player, position);

  return new;
end;
$$;

drop trigger if exists mark_game_owner_player_on_insert on public.games;
create trigger mark_game_owner_player_on_insert
before insert on public.games
for each row execute function public.mark_game_owner_player();

drop trigger if exists mark_game_owner_player_on_update on public.games;
create trigger mark_game_owner_player_on_update
before update of players, user_id on public.games
for each row execute function public.mark_game_owner_player();

revoke all on function public.mark_game_owner_player() from public;
revoke all on function public.mark_game_owner_player() from anon;
revoke all on function public.mark_game_owner_player() from authenticated;
