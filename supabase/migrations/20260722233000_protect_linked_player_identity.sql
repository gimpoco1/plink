update public.games game
set players = (
  select coalesce(
    jsonb_agg(
      case
        when exists (
          select 1
          from public.game_collaborators collaborator
          where collaborator.game_id = game.id
            and collaborator.player_id = player ->> 'id'
        ) then player || jsonb_build_object('joinedViaInvite', true)
        else player
      end
      order by position
    ),
    '[]'::jsonb
  )
  from jsonb_array_elements(coalesce(game.players, '[]'::jsonb))
    with ordinality as entries(player, position)
)
where exists (
  select 1
  from public.game_collaborators collaborator
  where collaborator.game_id = game.id
);

create or replace function public.mark_linked_account_players()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if not new.is_shared then
    return new;
  end if;

  select coalesce(
    jsonb_agg(
      case
        when exists (
          select 1
          from public.game_collaborators collaborator
          where collaborator.game_id = new.id
            and collaborator.player_id = player ->> 'id'
        ) then player || jsonb_build_object('joinedViaInvite', true)
        else player
      end
      order by position
    ),
    '[]'::jsonb
  )
  into new.players
  from jsonb_array_elements(coalesce(new.players, '[]'::jsonb))
    with ordinality as entries(player, position);

  return new;
end;
$$;

drop trigger if exists mark_linked_account_players on public.games;
create trigger mark_linked_account_players
before update of players on public.games
for each row execute function public.mark_linked_account_players();

revoke all on function public.mark_linked_account_players() from public;
revoke all on function public.mark_linked_account_players() from anon;
revoke all on function public.mark_linked_account_players()
  from authenticated;

create or replace function public.protect_linked_player_identity()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_collaborator record;
  v_old_player jsonb;
  v_new_player jsonb;
begin
  if not old.is_shared then
    return new;
  end if;

  for v_collaborator in
    select player_id
    from public.game_collaborators
    where game_id = old.id
  loop
    select player
    into v_old_player
    from jsonb_array_elements(coalesce(old.players, '[]'::jsonb)) player
    where player ->> 'id' = v_collaborator.player_id
    limit 1;

    if v_old_player is null then
      continue;
    end if;

    select player
    into v_new_player
    from jsonb_array_elements(coalesce(new.players, '[]'::jsonb)) player
    where player ->> 'id' = v_collaborator.player_id
    limit 1;

    if v_new_player is null then
      raise exception 'Remove joined players through the game player controls.'
        using errcode = '42501';
    end if;

    if (
      v_old_player - 'score' - 'reachedAt' - 'joinedViaInvite'
    ) is distinct from (
      v_new_player - 'score' - 'reachedAt' - 'joinedViaInvite'
    ) then
      raise exception 'A joined player can only edit their own account identity.'
        using errcode = '42501';
    end if;
  end loop;

  return new;
end;
$$;

drop trigger if exists protect_linked_player_identity on public.games;
create trigger protect_linked_player_identity
before update of players on public.games
for each row execute function public.protect_linked_player_identity();

revoke all on function public.protect_linked_player_identity() from public;
revoke all on function public.protect_linked_player_identity() from anon;
revoke all on function public.protect_linked_player_identity()
  from authenticated;
