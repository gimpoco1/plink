create or replace function public.list_past_invited_players()
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
    raise exception 'Sign in to view invited players.'
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
  order by history.last_linked_at desc, profile.name asc;
end;
$$;

revoke all on function public.list_past_invited_players() from public;
revoke all on function public.list_past_invited_players() from anon;
grant execute on function public.list_past_invited_players()
  to authenticated;
