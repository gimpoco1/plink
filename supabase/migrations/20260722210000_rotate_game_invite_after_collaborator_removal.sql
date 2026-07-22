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
    v_code := upper(
      substr(md5(gen_random_uuid()::text || clock_timestamp()::text), 1, 8)
    );

    begin
      update public.game_invites
      set code = v_code,
          created_by = v_owner_id,
          created_at = floor(extract(epoch from clock_timestamp()) * 1000)
      where game_id = old.game_id;
      exit;
    exception when unique_violation then
      if v_attempt >= 5 then
        raise exception 'Could not rotate the invitation code. Please try again.';
      end if;
    end;
  end loop;

  return old;
end;
$$;

drop trigger if exists rotate_game_invite_after_collaborator_removal
  on public.game_collaborators;
create trigger rotate_game_invite_after_collaborator_removal
after delete on public.game_collaborators
for each row
execute function public.rotate_game_invite_after_collaborator_removal();

revoke all
  on function public.rotate_game_invite_after_collaborator_removal()
  from public;
revoke all
  on function public.rotate_game_invite_after_collaborator_removal()
  from anon;
revoke all
  on function public.rotate_game_invite_after_collaborator_removal()
  from authenticated;
