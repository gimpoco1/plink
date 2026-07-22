alter table public.games
  add column if not exists is_shared boolean not null default false;

create table if not exists public.game_invites (
  game_id text primary key references public.games(id) on delete cascade,
  code text not null unique,
  created_by uuid not null references auth.users(id) on delete cascade,
  created_at bigint not null default floor(extract(epoch from clock_timestamp()) * 1000)
);

create table if not exists public.game_collaborators (
  game_id text not null references public.games(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  player_id text not null,
  joined_at bigint not null default floor(extract(epoch from clock_timestamp()) * 1000),
  primary key (game_id, user_id)
);

create index if not exists game_collaborators_user_id_idx
  on public.game_collaborators(user_id);

alter table public.game_invites enable row level security;
alter table public.game_collaborators enable row level security;

drop policy if exists "Users manage their own games" on public.games;
drop policy if exists "Users can read accessible games" on public.games;
drop policy if exists "Users can create their own games" on public.games;
drop policy if exists "Owners can update their games" on public.games;
drop policy if exists "Owners can delete their games" on public.games;

create policy "Users can read accessible games"
  on public.games
  for select
  to authenticated
  using (
    auth.uid() = user_id
    or exists (
      select 1
      from public.game_collaborators collaborator
      where collaborator.game_id = games.id
        and collaborator.user_id = auth.uid()
    )
  );

create policy "Users can create their own games"
  on public.games
  for insert
  to authenticated
  with check (auth.uid() = user_id);

create policy "Owners can update their games"
  on public.games
  for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Owners can delete their games"
  on public.games
  for delete
  to authenticated
  using (auth.uid() = user_id);

drop policy if exists "Users can read their collaborations" on public.game_collaborators;
create policy "Users can read their collaborations"
  on public.game_collaborators
  for select
  to authenticated
  using (auth.uid() = user_id);

create or replace function public.create_game_invite(p_game_id text)
returns text
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_code text;
  v_attempt integer := 0;
  v_now bigint;
begin
  if auth.uid() is null then
    raise exception 'Sign in to invite players.' using errcode = '42501';
  end if;

  if not exists (
    select 1
    from public.games game
    where game.id = p_game_id
      and (
        game.user_id = auth.uid()
        or exists (
          select 1
          from public.game_collaborators collaborator
          where collaborator.game_id = game.id
            and collaborator.user_id = auth.uid()
        )
      )
  ) then
    raise exception 'You do not have access to invite players to this game.' using errcode = '42501';
  end if;

  if exists (
    select 1
    from public.games
    where id = p_game_id
      and participant_mode = 'teams'
  ) then
    raise exception 'Shared play is currently available for player games only.' using errcode = '22023';
  end if;

  select code into v_code
  from public.game_invites
  where game_id = p_game_id;

  if v_code is null then
    loop
      v_attempt := v_attempt + 1;
      v_code := upper(substr(md5(gen_random_uuid()::text || clock_timestamp()::text), 1, 8));
      begin
        insert into public.game_invites (game_id, code, created_by)
        values (p_game_id, v_code, auth.uid());
        exit;
      exception when unique_violation then
        select code into v_code
        from public.game_invites
        where game_id = p_game_id;
        if v_code is not null then
          exit;
        end if;
        if v_attempt >= 5 then
          raise exception 'Could not create an invitation code. Please try again.';
        end if;
      end;
    end loop;
  end if;

  select greatest(
    floor(extract(epoch from clock_timestamp()) * 1000),
    updated_at + 1
  ) into v_now
  from public.games
  where id = p_game_id;

  update public.games
  set is_shared = true,
      updated_at = v_now
  where id = p_game_id
    and is_shared = false;

  return v_code;
end;
$$;

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
    update public.games
    set players = coalesce(players, '[]'::jsonb) || jsonb_build_array(
          jsonb_build_object(
            'id', v_player_id,
            'name', v_profile.name,
            'score', v_game.starting_score,
            'createdAt', v_now,
            'reachedAt', v_now,
            'avatarColor', v_profile.avatar_color,
            'profileId', v_profile.id
          )
        ),
        is_shared = true,
        updated_at = v_now
    where id = v_game.id;
  end if;

  return v_game.id;
end;
$$;

create or replace function public.apply_shared_game_score_delta(
  p_game_id text,
  p_player_id text,
  p_delta integer
)
returns public.games
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_game public.games%rowtype;
  v_player jsonb;
  v_players jsonb := '[]'::jsonb;
  v_history jsonb;
  v_before integer;
  v_after integer;
  v_actual_delta integer;
  v_now bigint;
  v_did_change boolean := false;
  v_has_ended boolean := false;
  v_leader integer;
  v_runner_up integer;
  v_participant_count integer;
begin
  if auth.uid() is null then
    raise exception 'Sign in to update this game.' using errcode = '42501';
  end if;

  select * into v_game
  from public.games
  where id = p_game_id
  for update;

  if not found or not (
    v_game.user_id = auth.uid()
    or exists (
      select 1
      from public.game_collaborators
      where game_id = p_game_id
        and user_id = auth.uid()
    )
  ) then
    raise exception 'You do not have access to update this game.' using errcode = '42501';
  end if;

  if not v_game.is_shared then
    raise exception 'This game is not shared.' using errcode = '22023';
  end if;

  v_now := greatest(
    floor(extract(epoch from clock_timestamp()) * 1000),
    v_game.updated_at + 1
  );

  if p_delta = 0 then
    return v_game;
  end if;

  v_history := coalesce(v_game.score_history, '[]'::jsonb);

  for v_player in
    select value from jsonb_array_elements(coalesce(v_game.players, '[]'::jsonb))
  loop
    if v_player ->> 'id' = p_player_id then
      v_before := coalesce((v_player ->> 'score')::integer, v_game.starting_score);
      v_after := greatest(
        -999999::bigint,
        least(999999::bigint, v_before::bigint + p_delta::bigint)
      )::integer;
      if v_game.win_condition = 'reach_zero' then
        v_after := greatest(v_game.target_score, v_after);
      end if;
      v_actual_delta := v_after - v_before;

      if v_actual_delta <> 0 then
        v_did_change := true;
        v_player := jsonb_set(v_player, '{score}', to_jsonb(v_after), true);
        v_player := jsonb_set(v_player, '{reachedAt}', to_jsonb(v_now), true);
        v_history := jsonb_build_array(
          jsonb_build_object(
            'id', gen_random_uuid()::text,
            'playerId', p_player_id,
            'playerName', v_player ->> 'name',
            'avatarColor', v_player ->> 'avatarColor',
            'delta', v_actual_delta,
            'scoreBefore', v_before,
            'scoreAfter', v_after,
            'createdAt', v_now
          )
        ) || v_history;
      end if;
    end if;

    v_players := v_players || jsonb_build_array(v_player);
  end loop;

  if not v_did_change then
    return v_game;
  end if;

  if not v_game.manual_end_only then
    select count(*) into v_participant_count
    from jsonb_array_elements(v_players);

    if v_game.win_condition = 'reach_zero' then
      select exists (
        select 1 from jsonb_array_elements(v_players) player
        where (player ->> 'score')::integer <= v_game.target_score
      ) into v_has_ended;
    elsif v_game.win_by_two and v_participant_count >= 2 then
      if v_game.win_condition = 'lowest' then
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
          select 1 from jsonb_array_elements(v_players) player
          where (player ->> 'score')::integer >= v_game.target_score
        ) and v_runner_up - v_leader >= 2 into v_has_ended;
      else
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
        select 1 from jsonb_array_elements(v_players) player
        where (player ->> 'score')::integer >= v_game.target_score
      ) into v_has_ended;
    end if;
  end if;

  update public.games
  set players = v_players,
      score_history = v_history,
      completion_mode = null,
      ended_at = case when v_has_ended then coalesce(v_game.ended_at, v_now) else null end,
      updated_at = v_now
  where id = p_game_id
  returning * into v_game;

  return v_game;
end;
$$;

revoke all on function public.create_game_invite(text) from public;
revoke all on function public.join_game_by_code(text) from public;
revoke all on function public.apply_shared_game_score_delta(text, text, integer) from public;
revoke all on function public.create_game_invite(text) from anon;
revoke all on function public.join_game_by_code(text) from anon;
revoke all on function public.apply_shared_game_score_delta(text, text, integer) from anon;
grant execute on function public.create_game_invite(text) to authenticated;
grant execute on function public.join_game_by_code(text) to authenticated;
grant execute on function public.apply_shared_game_score_delta(text, text, integer) to authenticated;

do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'games'
  ) then
    alter publication supabase_realtime add table public.games;
  end if;
end;
$$;
