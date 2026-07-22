alter function public.merge_shared_game_players(text, text, text)
  rename to merge_shared_game_players_keep_linked;

revoke all on function public.merge_shared_game_players_keep_linked(
  text,
  text,
  text
) from public;
revoke all on function public.merge_shared_game_players_keep_linked(
  text,
  text,
  text
) from anon;
revoke all on function public.merge_shared_game_players_keep_linked(
  text,
  text,
  text
) from authenticated;

create or replace function public.merge_shared_game_players(
  p_game_id text,
  p_linked_player_id text,
  p_roster_player_id text,
  p_keep_player text
)
returns public.games
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_game public.games%rowtype;
  v_roster_player jsonb;
  v_collaborator_user_id uuid;
  v_roster_name text;
  v_roster_avatar_color text;
  v_now bigint;
begin
  if auth.uid() is null then
    raise exception 'Sign in to merge players.' using errcode = '42501';
  end if;

  if p_keep_player not in ('linked', 'local') then
    raise exception 'Choose which player should stay.' using errcode = '22023';
  end if;

  select *
  into v_game
  from public.games
  where id = p_game_id
    and user_id = auth.uid()
  for update;

  if not found then
    raise exception 'Only the game owner can merge players.'
      using errcode = '42501';
  end if;

  select player
  into v_roster_player
  from jsonb_array_elements(coalesce(v_game.players, '[]'::jsonb)) player
  where player ->> 'id' = p_roster_player_id
  limit 1;

  if v_roster_player is null or not exists (
    select 1
    from public.player_profiles profile
    where profile.id = v_roster_player ->> 'profileId'
      and profile.user_id = auth.uid()
  ) then
    raise exception 'Merge requires a linked player and one of your saved players.'
      using errcode = '22023';
  end if;

  select collaborator.user_id
  into v_collaborator_user_id
  from public.game_collaborators collaborator
  where collaborator.game_id = p_game_id
    and collaborator.player_id = p_linked_player_id;

  if v_collaborator_user_id is null or exists (
    select 1
    from public.game_collaborators collaborator
    where collaborator.game_id = p_game_id
      and collaborator.player_id = p_roster_player_id
  ) then
    raise exception 'Merge requires one linked player and one saved player.'
      using errcode = '22023';
  end if;

  if p_keep_player = 'linked' then
    select merged_game.*
    into v_game
    from public.merge_shared_game_players_keep_linked(
      p_game_id,
      p_linked_player_id,
      p_roster_player_id
    ) merged_game;
    return v_game;
  end if;

  v_roster_name := v_roster_player ->> 'name';
  v_roster_avatar_color := v_roster_player ->> 'avatarColor';

  update public.game_collaborators
  set player_id = p_roster_player_id
  where game_id = p_game_id
    and user_id = v_collaborator_user_id;

  select merged_game.*
  into v_game
  from public.merge_shared_game_players_keep_linked(
    p_game_id,
    p_roster_player_id,
    p_linked_player_id
  ) merged_game;

  delete from public.game_collaborators
  where game_id = p_game_id
    and user_id = v_collaborator_user_id;

  v_now := greatest(
    floor(extract(epoch from clock_timestamp()) * 1000),
    v_game.updated_at + 1
  );

  update public.games
  set players = (
        select coalesce(
          jsonb_agg(
            case
              when player ->> 'id' = p_roster_player_id then
                (player - 'joinedViaInvite') || jsonb_build_object(
                  'name', v_roster_name
                )
              else player
            end
            order by position
          ),
          '[]'::jsonb
        )
        from jsonb_array_elements(coalesce(players, '[]'::jsonb))
          with ordinality as entries(player, position)
      ),
      score_history = (
        select coalesce(
          jsonb_agg(
            case
              when entry ->> 'playerId' = p_roster_player_id then
                entry || jsonb_build_object(
                  'playerName', v_roster_name,
                  'avatarColor', v_roster_avatar_color
                )
              else entry
            end
            order by position
          ),
          '[]'::jsonb
        )
        from jsonb_array_elements(coalesce(score_history, '[]'::jsonb))
          with ordinality as entries(entry, position)
      ),
      updated_at = v_now
  where id = p_game_id
  returning * into v_game;

  return v_game;
end;
$$;

create or replace function public.merge_shared_game_players(
  p_game_id text,
  p_linked_player_id text,
  p_roster_player_id text
)
returns public.games
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  return public.merge_shared_game_players(
    p_game_id,
    p_linked_player_id,
    p_roster_player_id,
    'linked'
  );
end;
$$;

revoke all on function public.merge_shared_game_players(
  text,
  text,
  text,
  text
) from public;
revoke all on function public.merge_shared_game_players(
  text,
  text,
  text,
  text
) from anon;
grant execute on function public.merge_shared_game_players(
  text,
  text,
  text,
  text
) to authenticated;

revoke all on function public.merge_shared_game_players(text, text, text)
  from public;
revoke all on function public.merge_shared_game_players(text, text, text)
  from anon;
grant execute on function public.merge_shared_game_players(text, text, text)
  to authenticated;
