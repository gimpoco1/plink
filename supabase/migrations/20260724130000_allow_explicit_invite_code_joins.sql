create or replace function public.prevent_blocked_automatic_game_addition()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_allows_invites boolean;
begin
  -- Entering an invitation code is explicit consent from the account being
  -- added. The preference only applies when a previous player adds them.
  if auth.uid() = new.user_id then
    return new;
  end if;

  if current_setting('plink.owner_added_collaborator', true) <> 'true' then
    return new;
  end if;

  select coalesce(
    (
      select preferences.allow_previous_players_to_invite
      from public.account_sharing_preferences preferences
      where preferences.user_id = new.user_id
    ),
    true
  )
  into v_allows_invites;

  if not v_allows_invites then
    raise exception
      'That account does not allow previous players to add them to games.'
      using errcode = '42501';
  end if;

  return new;
end;
$$;

revoke all on function public.prevent_blocked_automatic_game_addition()
  from public;
revoke all on function public.prevent_blocked_automatic_game_addition()
  from anon;
revoke all on function public.prevent_blocked_automatic_game_addition()
  from authenticated;
