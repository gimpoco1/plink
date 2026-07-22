create or replace function public.annotate_shared_score_history_updater()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_actor_player_id text;
  v_actor_name text;
  v_actor_avatar_color text;
begin
  if auth.uid() is null
    or new.is_shared is not true
    or new.score_history is not distinct from old.score_history
  then
    return new;
  end if;

  if new.user_id = auth.uid() then
    select
      player ->> 'id',
      player ->> 'name',
      player ->> 'avatarColor'
    into
      v_actor_player_id,
      v_actor_name,
      v_actor_avatar_color
    from jsonb_array_elements(coalesce(new.players, '[]'::jsonb)) player
    where coalesce((player ->> 'isGameOwner')::boolean, false)
    limit 1;
  else
    select collaborator.player_id
    into v_actor_player_id
    from public.game_collaborators collaborator
    where collaborator.game_id = new.id
      and collaborator.user_id = auth.uid()
    limit 1;

    if v_actor_player_id is not null then
      select
        player ->> 'name',
        player ->> 'avatarColor'
      into
        v_actor_name,
        v_actor_avatar_color
      from jsonb_array_elements(coalesce(new.players, '[]'::jsonb)) player
      where player ->> 'id' = v_actor_player_id
      limit 1;
    end if;
  end if;

  if v_actor_name is null or v_actor_avatar_color is null then
    select
      profile.id,
      profile.name,
      profile.avatar_color
    into
      v_actor_player_id,
      v_actor_name,
      v_actor_avatar_color
    from public.player_profiles profile
    where profile.user_id = auth.uid()
      and profile.is_account_player = true
    order by profile.updated_at desc
    limit 1;
  end if;

  if v_actor_player_id is null
    or v_actor_name is null
    or v_actor_avatar_color is null
  then
    return new;
  end if;

  select coalesce(
    jsonb_agg(
      case
        when not exists (
          select 1
          from jsonb_array_elements(coalesce(old.score_history, '[]'::jsonb)) old_entry
          where old_entry ->> 'id' = entry ->> 'id'
        ) then entry || jsonb_build_object(
          'updatedByPlayerId', v_actor_player_id,
          'updatedByPlayerName', v_actor_name,
          'updatedByAvatarColor', v_actor_avatar_color
        )
        else entry
      end
      order by position
    ),
    '[]'::jsonb
  )
  into new.score_history
  from jsonb_array_elements(coalesce(new.score_history, '[]'::jsonb))
    with ordinality as entries(entry, position);

  return new;
end;
$$;

revoke all on function public.annotate_shared_score_history_updater() from public;
revoke all on function public.annotate_shared_score_history_updater() from anon;
revoke all on function public.annotate_shared_score_history_updater() from authenticated;
