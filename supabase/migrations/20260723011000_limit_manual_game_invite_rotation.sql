alter table public.game_invites
  add column if not exists manual_rotation_count smallint not null default 0
  check (manual_rotation_count between 0 and 5);

comment on column public.game_invites.manual_rotation_count is
  'Number of owner-requested replacement invitation codes generated for this game.';

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
    raise exception 'Sign in to generate a new invitation code.'
      using errcode = '42501';
  end if;

  select user_id
  into v_owner_id
  from public.games
  where id = p_game_id
    and user_id = auth.uid()
  for update;

  if v_owner_id is null then
    raise exception 'Only the game owner can generate a new invitation code.'
      using errcode = '42501';
  end if;

  select manual_rotation_count
  into v_rotation_count
  from public.game_invites
  where game_id = p_game_id
  for update;

  if coalesce(v_rotation_count, 0) >= 5 then
    raise exception 'Invitation code limit reached. You can generate up to 5 new codes per game.'
      using errcode = 'P0001';
  end if;

  loop
    v_attempt := v_attempt + 1;
    v_code := upper(
      substr(md5(gen_random_uuid()::text || clock_timestamp()::text), 1, 8)
    );

    begin
      update public.game_invites
      set code = v_code,
          created_by = v_owner_id,
          created_at = floor(
            extract(epoch from clock_timestamp()) * 1000
          ),
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
