create or replace function public.join_game_by_code(p_code text)
returns text
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_game public.games%rowtype;
  v_profile public.player_profiles%rowtype;
  v_player_id text;
  v_existing_player_id text;
  v_player_name text;
  v_suffix integer := 2;
  v_now bigint;
begin
  if auth.uid() is null then
    raise exception 'Sign in to join a game.' using errcode = '42501';
  end if;

  select game.* into v_game
  from public.game_invites invite
  join public.games game on game.id = invite.game_id
  where invite.code = upper(regexp_replace(trim(p_code), '[^a-zA-Z0-9]', '', 'g'))
  for update of game;

  if not found then
    raise exception 'Invitation code not found.' using errcode = '22023';
  end if;

  if v_game.participant_mode = 'teams' then
    raise exception 'Shared play is currently available for player games only.' using errcode = '22023';
  end if;

  if v_game.user_id = auth.uid() then
    return v_game.id;
  end if;

  v_now := greatest(
    floor(extract(epoch from clock_timestamp()) * 1000),
    v_game.updated_at + 1
  );

  select * into v_profile
  from public.player_profiles
  where user_id = auth.uid()
    and is_account_player = true
  order by updated_at desc
  limit 1;

  if not found then
    raise exception 'Set up your account player before joining a game.' using errcode = '22023';
  end if;

  select player ->> 'id' into v_existing_player_id
  from jsonb_array_elements(coalesce(v_game.players, '[]'::jsonb)) player
  where player ->> 'profileId' = v_profile.id
  limit 1;

  select player_id into v_player_id
  from public.game_collaborators
  where game_id = v_game.id
    and user_id = auth.uid();

  if v_player_id is null then
    v_player_id := coalesce(v_existing_player_id, gen_random_uuid()::text);
    insert into public.game_collaborators (game_id, user_id, player_id, joined_at)
    values (v_game.id, auth.uid(), v_player_id, v_now);
  end if;

  if not exists (
    select 1
    from jsonb_array_elements(coalesce(v_game.players, '[]'::jsonb)) player
    where player ->> 'profileId' = v_profile.id
  ) then
    v_player_name := v_profile.name;
    while exists (
      select 1
      from jsonb_array_elements(coalesce(v_game.players, '[]'::jsonb)) player
      where lower(trim(player ->> 'name')) = lower(trim(v_player_name))
    ) loop
      v_player_name := v_profile.name || ' #' || v_suffix;
      v_suffix := v_suffix + 1;
    end loop;

    update public.games
    set players = coalesce(players, '[]'::jsonb) || jsonb_build_array(
          jsonb_build_object(
            'id', v_player_id,
            'name', v_player_name,
            'score', v_game.starting_score,
            'createdAt', v_now,
            'reachedAt', v_now,
            'avatarColor', v_profile.avatar_color,
            'profileId', v_profile.id,
            'joinedViaInvite', true
          )
        ),
        is_shared = true,
        updated_at = v_now
    where id = v_game.id;
  end if;

  return v_game.id;
end;
$$;

revoke all on function public.join_game_by_code(text) from public;
revoke all on function public.join_game_by_code(text) from anon;
grant execute on function public.join_game_by_code(text) to authenticated;
