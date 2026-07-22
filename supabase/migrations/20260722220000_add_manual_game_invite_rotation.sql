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

  loop
    v_attempt := v_attempt + 1;
    v_code := upper(
      substr(md5(gen_random_uuid()::text || clock_timestamp()::text), 1, 8)
    );

    begin
      insert into public.game_invites (
        game_id,
        code,
        created_by,
        created_at
      ) values (
        p_game_id,
        v_code,
        v_owner_id,
        floor(extract(epoch from clock_timestamp()) * 1000)
      )
      on conflict (game_id) do update
      set code = excluded.code,
          created_by = excluded.created_by,
          created_at = excluded.created_at;
      exit;
    exception when unique_violation then
      if v_attempt >= 5 then
        raise exception 'Could not generate a new invitation code. Please try again.';
      end if;
    end;
  end loop;

  return v_code;
end;
$$;

revoke all on function public.rotate_game_invite(text) from public;
revoke all on function public.rotate_game_invite(text) from anon;
grant execute on function public.rotate_game_invite(text) to authenticated;
