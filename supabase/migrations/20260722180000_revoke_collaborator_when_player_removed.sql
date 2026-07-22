create or replace function public.remove_shared_game_player(
  p_game_id text,
  p_player_id text
)
returns public.games
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_game public.games%rowtype;
  v_players jsonb;
  v_now bigint;
  v_has_ended boolean := false;
  v_participant_count integer;
  v_leader integer;
  v_runner_up integer;
begin
  if auth.uid() is null then
    raise exception 'Sign in to remove a player.' using errcode = '42501';
  end if;

  select * into v_game
  from public.games
  where id = p_game_id
    and user_id = auth.uid()
  for update;

  if not found then
    raise exception 'Only the game owner can remove players.' using errcode = '42501';
  end if;

  if not v_game.is_shared then
    raise exception 'This game is not shared.' using errcode = '22023';
  end if;

  delete from public.game_collaborators
  where game_id = p_game_id
    and player_id = p_player_id;

  if not exists (
    select 1
    from jsonb_array_elements(coalesce(v_game.players, '[]'::jsonb)) player
    where player ->> 'id' = p_player_id
  ) then
    return v_game;
  end if;

  v_now := greatest(
    floor(extract(epoch from clock_timestamp()) * 1000),
    v_game.updated_at + 1
  );

  select coalesce(jsonb_agg(player order by position), '[]'::jsonb)
  into v_players
  from jsonb_array_elements(coalesce(v_game.players, '[]'::jsonb))
    with ordinality as entries(player, position)
  where player ->> 'id' <> p_player_id;

  v_participant_count := jsonb_array_length(v_players);
  if not v_game.manual_end_only and v_participant_count > 0 then
    if v_game.win_condition = 'reach_zero' then
      select exists (
        select 1
        from jsonb_array_elements(v_players) player
        where (player ->> 'score')::integer <= v_game.target_score
      ) into v_has_ended;
    elsif v_game.win_by_two and v_game.win_condition = 'lowest' then
      if v_participant_count >= 2 then
        select score into v_leader from (
          select (player ->> 'score')::integer score
          from jsonb_array_elements(v_players) player
          order by score asc
          limit 1
        ) scores;
        select score into v_runner_up from (
          select (player ->> 'score')::integer score
          from jsonb_array_elements(v_players) player
          order by score asc
          offset 1 limit 1
        ) scores;
        select exists (
          select 1
          from jsonb_array_elements(v_players) player
          where (player ->> 'score')::integer >= v_game.target_score
        ) and v_runner_up - v_leader >= 2 into v_has_ended;
      end if;
    elsif v_game.win_by_two then
      if v_participant_count >= 2 then
        select score into v_leader from (
          select (player ->> 'score')::integer score
          from jsonb_array_elements(v_players) player
          order by score desc
          limit 1
        ) scores;
        select score into v_runner_up from (
          select (player ->> 'score')::integer score
          from jsonb_array_elements(v_players) player
          order by score desc
          offset 1 limit 1
        ) scores;
        v_has_ended := v_leader >= v_game.target_score
          and v_leader - v_runner_up >= 2;
      end if;
    else
      select exists (
        select 1
        from jsonb_array_elements(v_players) player
        where (player ->> 'score')::integer >= v_game.target_score
      ) into v_has_ended;
    end if;
  end if;

  update public.games
  set players = v_players,
      completion_mode = null,
      ended_at = case when v_has_ended then coalesce(v_game.ended_at, v_now) else null end,
      updated_at = v_now
  where id = p_game_id
  returning * into v_game;

  return v_game;
end;
$$;

revoke all on function public.remove_shared_game_player(text, text) from public;
revoke all on function public.remove_shared_game_player(text, text) from anon;
grant execute on function public.remove_shared_game_player(text, text) to authenticated;
