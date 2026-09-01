alter table public.game_invites
  add column if not exists expires_at bigint;

comment on column public.game_invites.expires_at is
  'Unix time in milliseconds after which a five-character invitation code can no longer be used. Legacy codes have no expiration.';

create or replace function public.generate_game_invite_code()
returns text
language plpgsql
volatile
set search_path = public, pg_temp
as $$
declare
  v_bytes bytea := extensions.gen_random_bytes(5);
begin
  return chr(65 + (get_byte(v_bytes, 0) % 26))
    || chr(65 + (get_byte(v_bytes, 1) % 26))
    || chr(65 + (get_byte(v_bytes, 2) % 26))
    || lpad(
      (
        ((get_byte(v_bytes, 3) * 256) + get_byte(v_bytes, 4)) % 100
      )::text,
      2,
      '0'
    );
end;
$$;

revoke all on function public.generate_game_invite_code() from public;
revoke all on function public.generate_game_invite_code() from anon;
revoke all on function public.generate_game_invite_code() from authenticated;

create or replace function public.set_game_invite_expiration()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  if new.code ~ '^[A-Z]{3}[0-9]{2}$' then
    new.expires_at := new.created_at + 3600000;
  else
    new.expires_at := null;
  end if;

  return new;
end;
$$;

revoke all on function public.set_game_invite_expiration() from public;
revoke all on function public.set_game_invite_expiration() from anon;
revoke all on function public.set_game_invite_expiration() from authenticated;

drop trigger if exists set_game_invite_expiration on public.game_invites;
create trigger set_game_invite_expiration
before insert or update of code, created_at
on public.game_invites
for each row
execute function public.set_game_invite_expiration();

update public.game_invites
set expires_at = created_at + 3600000
where code ~ '^[A-Z]{3}[0-9]{2}$'
  and expires_at is null;

do $$
declare
  v_invite record;
  v_code text;
  v_attempt integer;
  v_now bigint := floor(extract(epoch from clock_timestamp()) * 1000);
begin
  for v_invite in
    select game_id
    from public.game_invites
    where code ~ '^[A-Z]{2}[0-9]{2}$'
    for update
  loop
    v_attempt := 0;

    loop
      v_attempt := v_attempt + 1;
      v_code := public.generate_game_invite_code();

      begin
        update public.game_invites
        set code = v_code,
            created_at = v_now
        where game_id = v_invite.game_id;
        exit;
      exception when unique_violation then
        if v_attempt >= 100 then
          raise exception 'Could not replace an existing short invitation code.';
        end if;
      end;
    end loop;
  end loop;
end;
$$;

create or replace function public.create_game_invite(p_game_id text)
returns text
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_code text;
  v_attempt integer := 0;
  v_expires_at bigint;
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

  v_now := floor(extract(epoch from clock_timestamp()) * 1000);

  select code, expires_at
  into v_code, v_expires_at
  from public.game_invites
  where game_id = p_game_id
  for update;

  if v_code is null then
    loop
      v_attempt := v_attempt + 1;
      v_code := public.generate_game_invite_code();
      begin
        insert into public.game_invites (game_id, code, created_by, created_at)
        values (p_game_id, v_code, auth.uid(), v_now);
        exit;
      exception when unique_violation then
        select code, expires_at
        into v_code, v_expires_at
        from public.game_invites
        where game_id = p_game_id;

        if v_code is not null then
          exit;
        end if;

        if v_attempt >= 100 then
          raise exception 'Could not create an invitation code. Please try again.';
        end if;
      end;
    end loop;
  elsif v_expires_at is not null and v_expires_at <= v_now then
    loop
      v_attempt := v_attempt + 1;
      v_code := public.generate_game_invite_code();
      begin
        update public.game_invites
        set code = v_code,
            created_by = auth.uid(),
            created_at = v_now
        where game_id = p_game_id;
        exit;
      exception when unique_violation then
        if v_attempt >= 100 then
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
    and (
      invite.expires_at is null
      or invite.expires_at > floor(extract(epoch from clock_timestamp()) * 1000)
    )
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
