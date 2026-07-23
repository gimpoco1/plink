create or replace function public.ensure_owned_game_player_marker(
  p_game_id text
)
returns public.games
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_account_profile_id text;
  v_game public.games%rowtype;
begin
  if auth.uid() is null then
    raise exception 'Sign in to update the game owner.'
      using errcode = '42501';
  end if;

  select profile.id
  into v_account_profile_id
  from public.player_profiles profile
  where profile.user_id = auth.uid()
    and profile.is_account_player = true
  order by profile.updated_at desc
  limit 1;

  if v_account_profile_id is null then
    raise exception 'Your account player could not be found.'
      using errcode = '22023';
  end if;

  update public.games game
  set players = (
    select coalesce(
      jsonb_agg(
        case
          when player ->> 'profileId' = v_account_profile_id
            then player || jsonb_build_object('isGameOwner', true)
          else player - 'isGameOwner'
        end
        order by position
      ),
      '[]'::jsonb
    )
    from jsonb_array_elements(coalesce(game.players, '[]'::jsonb))
      with ordinality as entries(player, position)
  )
  where game.id = p_game_id
    and game.user_id = auth.uid()
    and exists (
      select 1
      from jsonb_array_elements(coalesce(game.players, '[]'::jsonb)) player
      where player ->> 'profileId' = v_account_profile_id
    )
  returning * into v_game;

  if not found then
    raise exception 'The game owner player could not be identified.'
      using errcode = '22023';
  end if;

  return v_game;
end;
$$;

revoke all on function public.ensure_owned_game_player_marker(text)
  from public;
revoke all on function public.ensure_owned_game_player_marker(text)
  from anon;
grant execute on function public.ensure_owned_game_player_marker(text)
  to authenticated;

with owner_profiles as (
  select distinct on (profile.user_id)
    profile.user_id,
    profile.id
  from public.player_profiles profile
  where profile.is_account_player = true
  order by profile.user_id, profile.updated_at desc
)
update public.games game
set players = (
  select coalesce(
    jsonb_agg(
      case
        when player ->> 'profileId' = owner_profiles.id
          then player || jsonb_build_object('isGameOwner', true)
        else player - 'isGameOwner'
      end
      order by position
    ),
    '[]'::jsonb
  )
  from jsonb_array_elements(coalesce(game.players, '[]'::jsonb))
    with ordinality as entries(player, position)
)
from owner_profiles
where game.user_id = owner_profiles.user_id
  and game.is_shared = true
  and exists (
    select 1
    from jsonb_array_elements(coalesce(game.players, '[]'::jsonb)) player
    where player ->> 'profileId' = owner_profiles.id
  )
  and not exists (
    select 1
    from jsonb_array_elements(coalesce(game.players, '[]'::jsonb)) player
    where coalesce((player ->> 'isGameOwner')::boolean, false)
  );
