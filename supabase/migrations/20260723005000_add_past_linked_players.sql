create table if not exists public.linked_player_history (
  owner_user_id uuid not null references auth.users(id) on delete cascade,
  collaborator_user_id uuid not null references auth.users(id) on delete cascade,
  profile_id text not null,
  player_name text not null,
  avatar_color text not null,
  last_linked_at bigint not null,
  primary key (owner_user_id, collaborator_user_id),
  check (owner_user_id <> collaborator_user_id)
);

alter table public.linked_player_history enable row level security;
revoke all on table public.linked_player_history from public;
revoke all on table public.linked_player_history from anon;
revoke all on table public.linked_player_history from authenticated;

insert into public.linked_player_history (
  owner_user_id,
  collaborator_user_id,
  profile_id,
  player_name,
  avatar_color,
  last_linked_at
)
select distinct on (game.user_id, collaborator.user_id)
  game.user_id,
  collaborator.user_id,
  profile.id,
  profile.name,
  profile.avatar_color,
  collaborator.joined_at
from public.game_collaborators collaborator
join public.games game on game.id = collaborator.game_id
join public.player_profiles profile
  on profile.user_id = collaborator.user_id
  and profile.is_account_player = true
where game.user_id <> collaborator.user_id
order by game.user_id, collaborator.user_id, collaborator.joined_at desc
on conflict (owner_user_id, collaborator_user_id) do update
set profile_id = excluded.profile_id,
    player_name = excluded.player_name,
    avatar_color = excluded.avatar_color,
    last_linked_at = greatest(
      public.linked_player_history.last_linked_at,
      excluded.last_linked_at
    );

create or replace function public.remember_linked_player()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_owner_user_id uuid;
  v_profile public.player_profiles%rowtype;
begin
  select user_id
  into v_owner_user_id
  from public.games
  where id = new.game_id;

  if v_owner_user_id is null or v_owner_user_id = new.user_id then
    return new;
  end if;

  select *
  into v_profile
  from public.player_profiles
  where user_id = new.user_id
    and is_account_player = true
  order by updated_at desc
  limit 1;

  if not found then
    return new;
  end if;

  insert into public.linked_player_history (
    owner_user_id,
    collaborator_user_id,
    profile_id,
    player_name,
    avatar_color,
    last_linked_at
  ) values (
    v_owner_user_id,
    new.user_id,
    v_profile.id,
    v_profile.name,
    v_profile.avatar_color,
    new.joined_at
  )
  on conflict (owner_user_id, collaborator_user_id) do update
  set profile_id = excluded.profile_id,
      player_name = excluded.player_name,
      avatar_color = excluded.avatar_color,
      last_linked_at = greatest(
        public.linked_player_history.last_linked_at,
        excluded.last_linked_at
      );

  return new;
end;
$$;

drop trigger if exists remember_linked_player_on_join
  on public.game_collaborators;
create trigger remember_linked_player_on_join
after insert on public.game_collaborators
for each row execute function public.remember_linked_player();

revoke all on function public.remember_linked_player() from public;
revoke all on function public.remember_linked_player() from anon;
revoke all on function public.remember_linked_player() from authenticated;

create or replace function public.notify_game_owner_on_collaborator_join()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_owner_id uuid;
  v_game_name text;
  v_player_name text;
begin
  if current_setting('plink.owner_added_collaborator', true) = 'true' then
    return new;
  end if;

  select user_id, name
  into v_owner_id, v_game_name
  from public.games
  where id = new.game_id;

  select name
  into v_player_name
  from public.player_profiles
  where user_id = new.user_id
    and is_account_player = true
  order by updated_at desc
  limit 1;

  if v_owner_id is not null
    and v_game_name is not null
    and v_player_name is not null then
    insert into public.game_join_notifications (
      user_id,
      game_id,
      game_name,
      player_name
    ) values (
      v_owner_id,
      new.game_id,
      v_game_name,
      v_player_name
    );
  end if;

  return new;
end;
$$;

revoke all on function public.notify_game_owner_on_collaborator_join()
  from public;
revoke all on function public.notify_game_owner_on_collaborator_join()
  from anon;
revoke all on function public.notify_game_owner_on_collaborator_join()
  from authenticated;

create or replace function public.list_past_linked_players(p_game_id text)
returns table (
  collaborator_user_id uuid,
  profile_id text,
  player_name text,
  avatar_color text,
  last_linked_at bigint
)
language plpgsql
security definer
stable
set search_path = public, pg_temp
as $$
begin
  if auth.uid() is null then
    raise exception 'Sign in to view linked players.' using errcode = '42501';
  end if;

  if not exists (
    select 1
    from public.games game
    where game.id = p_game_id
      and game.user_id = auth.uid()
      and game.participant_mode <> 'teams'
  ) then
    raise exception 'Only the game owner can view past linked players.'
      using errcode = '42501';
  end if;

  return query
  select
    history.collaborator_user_id,
    profile.id,
    profile.name,
    profile.avatar_color,
    history.last_linked_at
  from public.linked_player_history history
  join lateral (
    select account_profile.*
    from public.player_profiles account_profile
    where account_profile.user_id = history.collaborator_user_id
      and account_profile.is_account_player = true
    order by account_profile.updated_at desc
    limit 1
  ) profile on true
  where history.owner_user_id = auth.uid()
    and not exists (
      select 1
      from public.game_collaborators collaborator
      where collaborator.game_id = p_game_id
        and collaborator.user_id = history.collaborator_user_id
    )
  order by history.last_linked_at desc, profile.name asc;
end;
$$;

revoke all on function public.list_past_linked_players(text) from public;
revoke all on function public.list_past_linked_players(text) from anon;
grant execute on function public.list_past_linked_players(text)
  to authenticated;

create or replace function public.add_past_linked_player_to_game(
  p_game_id text,
  p_collaborator_user_id uuid
)
returns public.games
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_game public.games%rowtype;
  v_profile public.player_profiles%rowtype;
  v_player_id text;
  v_player_name text;
  v_suffix integer := 2;
  v_now bigint;
begin
  if auth.uid() is null then
    raise exception 'Sign in to add a linked player.' using errcode = '42501';
  end if;

  select *
  into v_game
  from public.games
  where id = p_game_id
    and user_id = auth.uid()
  for update;

  if not found then
    raise exception 'Only the game owner can add linked players.'
      using errcode = '42501';
  end if;

  if v_game.participant_mode = 'teams' then
    raise exception 'Linked players are currently available for player games only.'
      using errcode = '22023';
  end if;

  if not exists (
    select 1
    from public.linked_player_history history
    where history.owner_user_id = auth.uid()
      and history.collaborator_user_id = p_collaborator_user_id
  ) then
    raise exception 'That account has not joined one of your games before.'
      using errcode = '42501';
  end if;

  select *
  into v_profile
  from public.player_profiles
  where user_id = p_collaborator_user_id
    and is_account_player = true
  order by updated_at desc
  limit 1;

  if not found then
    raise exception 'That linked account no longer has an account player.'
      using errcode = '22023';
  end if;

  select player_id
  into v_player_id
  from public.game_collaborators
  where game_id = p_game_id
    and user_id = p_collaborator_user_id;

  if v_player_id is not null then
    return v_game;
  end if;

  select player ->> 'id'
  into v_player_id
  from jsonb_array_elements(coalesce(v_game.players, '[]'::jsonb)) player
  where player ->> 'profileId' = v_profile.id
  limit 1;

  v_now := greatest(
    floor(extract(epoch from clock_timestamp()) * 1000),
    v_game.updated_at + 1
  );

  if v_player_id is null then
    v_player_id := gen_random_uuid()::text;
    v_player_name := v_profile.name;
    while exists (
      select 1
      from jsonb_array_elements(coalesce(v_game.players, '[]'::jsonb)) player
      where lower(trim(player ->> 'name')) = lower(trim(v_player_name))
    ) loop
      v_player_name := v_profile.name || ' #' || v_suffix;
      v_suffix := v_suffix + 1;
    end loop;
  end if;

  update public.games
  set is_shared = true
  where id = p_game_id;

  perform set_config('plink.owner_added_collaborator', 'true', true);
  insert into public.game_collaborators (
    game_id,
    user_id,
    player_id,
    joined_at
  ) values (
    p_game_id,
    p_collaborator_user_id,
    v_player_id,
    v_now
  );

  if exists (
    select 1
    from jsonb_array_elements(coalesce(v_game.players, '[]'::jsonb)) player
    where player ->> 'id' = v_player_id
  ) then
    update public.games
    set players = (
          select coalesce(
            jsonb_agg(
              case
                when player ->> 'id' = v_player_id then
                  player || jsonb_build_object('joinedViaInvite', true)
                else player
              end
              order by position
            ),
            '[]'::jsonb
          )
          from jsonb_array_elements(coalesce(players, '[]'::jsonb))
            with ordinality as entries(player, position)
        ),
        updated_at = v_now
    where id = p_game_id
    returning * into v_game;
  else
    select added_game.*
    into v_game
    from public.add_shared_game_player(
      p_game_id,
      v_player_id,
      v_player_name,
      v_profile.avatar_color,
      v_profile.id
    ) added_game;
  end if;

  return v_game;
end;
$$;

revoke all on function public.add_past_linked_player_to_game(text, uuid)
  from public;
revoke all on function public.add_past_linked_player_to_game(text, uuid)
  from anon;
grant execute on function public.add_past_linked_player_to_game(text, uuid)
  to authenticated;

create or replace function public.replay_shared_game(
  p_game_id text,
  p_new_game_id text,
  p_name text
)
returns public.games
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_source_game public.games%rowtype;
  v_new_game public.games%rowtype;
  v_source_player jsonb;
  v_new_player jsonb;
  v_players jsonb := '[]'::jsonb;
  v_player_id_map jsonb := '{}'::jsonb;
  v_collaborator record;
  v_new_player_id text;
  v_name text;
  v_now bigint;
  v_has_collaborators boolean;
begin
  if auth.uid() is null then
    raise exception 'Sign in to play again.' using errcode = '42501';
  end if;

  v_name := upper(left(trim(coalesce(p_name, '')), 28));
  if trim(coalesce(p_new_game_id, '')) = '' or v_name = '' then
    raise exception 'The new game details are incomplete.' using errcode = '22023';
  end if;

  select *
  into v_source_game
  from public.games
  where id = p_game_id
    and user_id = auth.uid()
  for update;

  if not found then
    raise exception 'Only the game owner can play again with linked players.'
      using errcode = '42501';
  end if;

  if not v_source_game.is_shared then
    raise exception 'This game is not shared.' using errcode = '22023';
  end if;

  if v_source_game.participant_mode = 'teams' then
    raise exception 'Linked players are currently available for player games only.'
      using errcode = '22023';
  end if;

  if exists (select 1 from public.games where id = p_new_game_id) then
    raise exception 'That new game already exists.' using errcode = '23505';
  end if;

  v_now := greatest(
    floor(extract(epoch from clock_timestamp()) * 1000),
    v_source_game.updated_at + 1
  );

  for v_source_player in
    select player
    from jsonb_array_elements(coalesce(v_source_game.players, '[]'::jsonb))
      with ordinality as entries(player, position)
    order by position
  loop
    v_new_player_id := gen_random_uuid()::text;
    v_player_id_map := v_player_id_map || jsonb_build_object(
      v_source_player ->> 'id',
      v_new_player_id
    );

    v_new_player := (
      v_source_player
      - 'joinedViaInvite'
      - 'isGameOwner'
    ) || jsonb_build_object(
      'id', v_new_player_id,
      'score', v_source_game.starting_score,
      'createdAt', v_now,
      'reachedAt', v_now
    );

    if exists (
      select 1
      from public.game_collaborators collaborator
      where collaborator.game_id = p_game_id
        and collaborator.player_id = v_source_player ->> 'id'
    ) then
      v_new_player := v_new_player || jsonb_build_object(
        'joinedViaInvite',
        true
      );
    end if;

    v_players := v_players || jsonb_build_array(v_new_player);
  end loop;

  select exists (
    select 1
    from public.game_collaborators collaborator
    where collaborator.game_id = p_game_id
  ) into v_has_collaborators;

  v_new_game := v_source_game;
  v_new_game.id := p_new_game_id;
  v_new_game.name := v_name;
  v_new_game.is_shared := v_has_collaborators;
  v_new_game.players := v_players;
  v_new_game.score_history := '[]'::jsonb;
  v_new_game.completion_mode := null;
  v_new_game.created_at := v_now;
  v_new_game.updated_at := v_now;
  v_new_game.ended_at := null;

  insert into public.games
  select (v_new_game).*
  returning * into v_new_game;

  perform set_config('plink.owner_added_collaborator', 'true', true);
  for v_collaborator in
    select user_id, player_id
    from public.game_collaborators
    where game_id = p_game_id
    order by joined_at
  loop
    v_new_player_id := v_player_id_map ->> v_collaborator.player_id;
    if v_new_player_id is null then
      raise exception 'A linked player is missing from the source game.'
        using errcode = '22023';
    end if;

    insert into public.game_collaborators (
      game_id,
      user_id,
      player_id,
      joined_at
    ) values (
      p_new_game_id,
      v_collaborator.user_id,
      v_new_player_id,
      v_now
    );
  end loop;

  if v_has_collaborators then
    update public.games
    set updated_at = v_now + 1
    where id = p_new_game_id
    returning * into v_new_game;
  end if;

  return v_new_game;
end;
$$;

revoke all on function public.replay_shared_game(text, text, text)
  from public;
revoke all on function public.replay_shared_game(text, text, text)
  from anon;
grant execute on function public.replay_shared_game(text, text, text)
  to authenticated;
