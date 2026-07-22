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

revoke all on function public.create_game_invite(text) from public;
revoke all on function public.create_game_invite(text) from anon;
grant execute on function public.create_game_invite(text) to authenticated;
