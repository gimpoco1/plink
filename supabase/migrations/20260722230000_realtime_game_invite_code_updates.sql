drop policy if exists "Authorized game members can read invitation codes"
  on public.game_invites;
create policy "Authorized game members can read invitation codes"
  on public.game_invites
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.games game
      where game.id = game_invites.game_id
        and (
          game.user_id = auth.uid()
          or (
            game.collaborators_can_manage = true
            and exists (
              select 1
              from public.game_collaborators collaborator
              where collaborator.game_id = game.id
                and collaborator.user_id = auth.uid()
            )
          )
        )
    )
  );

grant select on public.game_invites to authenticated;

do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'game_invites'
  ) then
    alter publication supabase_realtime
      add table public.game_invites;
  end if;
end;
$$;
