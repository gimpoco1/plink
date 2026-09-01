create or replace function public.generate_game_invite_code()
returns text
language sql
volatile
set search_path = public, pg_temp
as $$
  select
    chr(65 + floor(random() * 26)::integer)
    || chr(65 + floor(random() * 26)::integer)
    || lpad(floor(random() * 100)::integer::text, 2, '0');
$$;

revoke all on function public.generate_game_invite_code() from public;
revoke all on function public.generate_game_invite_code() from anon;
revoke all on function public.generate_game_invite_code() from authenticated;

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
      v_code := public.generate_game_invite_code();
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

create or replace function public.rotate_game_invite(p_game_id text)
returns text
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_code text;
  v_attempt integer := 0;
  v_owner_id uuid;
  v_rotation_count smallint;
begin
  if auth.uid() is null then
    raise exception 'Sign in to generate a new invitation code.' using errcode = '42501';
  end if;

  select user_id
  into v_owner_id
  from public.games
  where id = p_game_id
    and user_id = auth.uid()
  for update;

  if v_owner_id is null then
    raise exception 'Only the game owner can generate a new invitation code.' using errcode = '42501';
  end if;

  select manual_rotation_count
  into v_rotation_count
  from public.game_invites
  where game_id = p_game_id
  for update;

  if coalesce(v_rotation_count, 0) >= 5 then
    raise exception 'Invitation code limit reached. You can generate up to 5 new codes per game.' using errcode = 'P0001';
  end if;

  loop
    v_attempt := v_attempt + 1;
    v_code := public.generate_game_invite_code();
    begin
      update public.game_invites
      set code = v_code,
          created_by = v_owner_id,
          created_at = floor(extract(epoch from clock_timestamp()) * 1000),
          manual_rotation_count = manual_rotation_count + 1
      where game_id = p_game_id;

      if not found then
        insert into public.game_invites (
          game_id,
          code,
          created_by,
          created_at,
          manual_rotation_count
        ) values (
          p_game_id,
          v_code,
          v_owner_id,
          floor(extract(epoch from clock_timestamp()) * 1000),
          1
        );
      end if;
      exit;
    exception when unique_violation then
      if v_attempt >= 100 then
        raise exception 'Could not generate a new invitation code. Please try again.';
      end if;
    end;
  end loop;

  return v_code;
end;
$$;

create or replace function public.rotate_game_invite_after_collaborator_removal()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_code text;
  v_owner_id uuid;
  v_attempt integer := 0;
begin
  select user_id
  into v_owner_id
  from public.games
  where id = old.game_id;

  if v_owner_id is null or not exists (
    select 1
    from public.game_invites
    where game_id = old.game_id
  ) then
    return old;
  end if;

  loop
    v_attempt := v_attempt + 1;
    v_code := public.generate_game_invite_code();
    begin
      update public.game_invites
      set code = v_code,
          created_by = v_owner_id,
          created_at = floor(extract(epoch from clock_timestamp()) * 1000)
      where game_id = old.game_id;
      exit;
    exception when unique_violation then
      if v_attempt >= 100 then
        raise exception 'Could not rotate the invitation code. Please try again.';
      end if;
    end;
  end loop;

  return old;
end;
$$;
