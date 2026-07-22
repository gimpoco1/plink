create or replace function public.is_game_owner(p_game_id text)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1
    from public.games game
    where game.id = p_game_id
      and game.user_id = auth.uid()
  );
$$;

revoke all on function public.is_game_owner(text) from public;
revoke all on function public.is_game_owner(text) from anon;
grant execute on function public.is_game_owner(text) to authenticated;

drop policy if exists "Owners can read game collaborators"
  on public.game_collaborators;
create policy "Owners can read game collaborators"
  on public.game_collaborators
  for select
  to authenticated
  using (public.is_game_owner(game_id));

create table if not exists public.game_player_merge_authorizations (
  transaction_id bigint not null,
  game_id text not null references public.games(id) on delete cascade,
  linked_player_id text not null,
  roster_player_id text not null,
  final_name text not null,
  primary key (transaction_id, game_id, linked_player_id)
);

alter table public.game_player_merge_authorizations enable row level security;
revoke all on table public.game_player_merge_authorizations from public;
revoke all on table public.game_player_merge_authorizations from anon;
revoke all on table public.game_player_merge_authorizations from authenticated;

create or replace function public.protect_linked_player_identity()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_collaborator record;
  v_old_player jsonb;
  v_new_player jsonb;
  v_merge_authorization public.game_player_merge_authorizations%rowtype;
  v_removed_player jsonb;
begin
  if not old.is_shared then
    return new;
  end if;

  for v_collaborator in
    select player_id
    from public.game_collaborators
    where game_id = old.id
  loop
    select player
    into v_old_player
    from jsonb_array_elements(coalesce(old.players, '[]'::jsonb)) player
    where player ->> 'id' = v_collaborator.player_id
    limit 1;

    if v_old_player is null then
      continue;
    end if;

    select player
    into v_new_player
    from jsonb_array_elements(coalesce(new.players, '[]'::jsonb)) player
    where player ->> 'id' = v_collaborator.player_id
    limit 1;

    if v_new_player is null then
      raise exception 'Remove joined players through the game player controls.'
        using errcode = '42501';
    end if;

    if (
      v_old_player - 'score' - 'reachedAt' - 'joinedViaInvite' - 'isGameOwner'
    ) is distinct from (
      v_new_player - 'score' - 'reachedAt' - 'joinedViaInvite' - 'isGameOwner'
    ) then
      select *
      into v_merge_authorization
      from public.game_player_merge_authorizations merge_auth
      where merge_auth.transaction_id = txid_current()
        and merge_auth.game_id = old.id
        and merge_auth.linked_player_id = v_collaborator.player_id;

      if not found then
        raise exception 'A joined player can only edit their own account identity.'
          using errcode = '42501';
      end if;

      select player
      into v_removed_player
      from jsonb_array_elements(coalesce(old.players, '[]'::jsonb)) player
      where player ->> 'id' = v_merge_authorization.roster_player_id
      limit 1;

      if v_removed_player is null
        or exists (
          select 1
          from jsonb_array_elements(coalesce(new.players, '[]'::jsonb)) player
          where player ->> 'id' = v_merge_authorization.roster_player_id
        )
        or v_new_player ->> 'name' <> v_merge_authorization.final_name
        or (
          v_old_player
            - 'name'
            - 'score'
            - 'reachedAt'
            - 'joinedViaInvite'
            - 'isGameOwner'
        ) is distinct from (
          v_new_player
            - 'name'
            - 'score'
            - 'reachedAt'
            - 'joinedViaInvite'
            - 'isGameOwner'
        ) then
        raise exception 'A joined player can only edit their own account identity.'
          using errcode = '42501';
      end if;
    end if;
  end loop;

  return new;
end;
$$;

revoke all on function public.protect_linked_player_identity() from public;
revoke all on function public.protect_linked_player_identity() from anon;
revoke all on function public.protect_linked_player_identity()
  from authenticated;

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
declare
  v_game public.games%rowtype;
  v_linked_player jsonb;
  v_roster_player jsonb;
  v_players jsonb;
  v_score_history jsonb;
  v_final_name text;
  v_merged_score integer;
  v_now bigint;
  v_has_ended boolean := false;
  v_participant_count integer;
  v_leader integer;
  v_runner_up integer;
begin
  if auth.uid() is null then
    raise exception 'Sign in to merge players.' using errcode = '42501';
  end if;

  if p_linked_player_id = p_roster_player_id then
    raise exception 'Choose two different players to merge.' using errcode = '22023';
  end if;

  select * into v_game
  from public.games
  where id = p_game_id
    and user_id = auth.uid()
  for update;

  if not found then
    raise exception 'Only the game owner can merge players.' using errcode = '42501';
  end if;

  if not v_game.is_shared then
    raise exception 'This game is not shared.' using errcode = '22023';
  end if;

  select player
  into v_linked_player
  from jsonb_array_elements(coalesce(v_game.players, '[]'::jsonb)) player
  where player ->> 'id' = p_linked_player_id
  limit 1;

  select player
  into v_roster_player
  from jsonb_array_elements(coalesce(v_game.players, '[]'::jsonb)) player
  where player ->> 'id' = p_roster_player_id
  limit 1;

  if v_linked_player is null or v_roster_player is null then
    raise exception 'One of these players is no longer in the game.' using errcode = '22023';
  end if;

  if not exists (
    select 1
    from public.game_collaborators collaborator
    where collaborator.game_id = p_game_id
      and collaborator.player_id = p_linked_player_id
  ) or exists (
    select 1
    from public.game_collaborators collaborator
    where collaborator.game_id = p_game_id
      and collaborator.player_id = p_roster_player_id
  ) then
    raise exception 'Merge requires one linked player and one roster player.'
      using errcode = '22023';
  end if;

  if lower(regexp_replace(trim(v_linked_player ->> 'name'), '\s+#\d+$', '', 'i'))
    <> lower(regexp_replace(trim(v_roster_player ->> 'name'), '\s+#\d+$', '', 'i')) then
    raise exception 'Only players with the same name can be merged.' using errcode = '22023';
  end if;

  v_final_name := v_roster_player ->> 'name';
  v_now := greatest(
    floor(extract(epoch from clock_timestamp()) * 1000),
    v_game.updated_at + 1
  );
  v_merged_score := greatest(
    -999999,
    least(
      999999,
      coalesce((v_linked_player ->> 'score')::integer, v_game.starting_score)
        + coalesce((v_roster_player ->> 'score')::integer, v_game.starting_score)
        - v_game.starting_score
    )
  );

  insert into public.game_player_merge_authorizations (
    transaction_id,
    game_id,
    linked_player_id,
    roster_player_id,
    final_name
  ) values (
    txid_current(),
    p_game_id,
    p_linked_player_id,
    p_roster_player_id,
    v_final_name
  );

  select coalesce(
    jsonb_agg(
      case
        when player ->> 'id' = p_linked_player_id then
          player || jsonb_build_object(
            'name', v_final_name,
            'score', v_merged_score,
            'reachedAt', v_now
          )
        else player
      end
      order by position
    ),
    '[]'::jsonb
  )
  into v_players
  from jsonb_array_elements(coalesce(v_game.players, '[]'::jsonb))
    with ordinality as entries(player, position)
  where player ->> 'id' <> p_roster_player_id;

  select coalesce(
    jsonb_agg(
      case
        when entry ->> 'playerId' in (p_linked_player_id, p_roster_player_id) then
          entry || jsonb_build_object(
            'playerId', p_linked_player_id,
            'playerName', v_final_name,
            'avatarColor', v_linked_player ->> 'avatarColor'
          )
        else entry
      end
      order by position
    ),
    '[]'::jsonb
  )
  into v_score_history
  from jsonb_array_elements(coalesce(v_game.score_history, '[]'::jsonb))
    with ordinality as entries(entry, position);

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
      score_history = v_score_history,
      completion_mode = null,
      ended_at = case when v_has_ended then coalesce(v_game.ended_at, v_now) else null end,
      updated_at = v_now
  where id = p_game_id
  returning * into v_game;

  delete from public.game_player_merge_authorizations
  where transaction_id = txid_current()
    and game_id = p_game_id
    and linked_player_id = p_linked_player_id;

  return v_game;
end;
$$;

revoke all on function public.merge_shared_game_players(text, text, text)
  from public;
revoke all on function public.merge_shared_game_players(text, text, text)
  from anon;
grant execute on function public.merge_shared_game_players(text, text, text)
  to authenticated;
