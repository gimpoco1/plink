do $$
declare
  v_definition text;
  v_updated_definition text;
begin
  select pg_get_functiondef(routine.oid)
  into v_definition
  from pg_proc routine
  join pg_namespace namespace on namespace.oid = routine.pronamespace
  where namespace.nspname = 'public'
    and routine.proname = 'recalculate_player_ratings'
    and routine.pronargs = 0;

  if v_definition is null then
    raise exception 'recalculate_player_ratings() was not found';
  end if;

  v_updated_definition := replace(
    v_definition,
    'v_winner_participant_id text;',
    'v_winner_participant_id text;
  v_winner_is_rated boolean;'
  );
  v_updated_definition := replace(
    v_updated_definition,
    'avg(coalesce(state.rating, 5.0)),',
    'coalesce(
        avg(coalesce(state.rating, 5.0)) filter (where grouped.profile_id is not null),
        5.0
      ),'
  );
  v_updated_definition := replace(
    v_updated_definition,
    'select count(*) into v_participant_count
    from pg_temp.plink_rating_participants;
    if v_participant_count < 2 then
      continue;
    end if;
    if exists (
      select 1
      from pg_temp.plink_rating_participants participant
      where array_position(participant.member_profile_ids, null) is not null
    ) then
      continue;
    end if;',
    'select count(*) into v_participant_count
    from pg_temp.plink_rating_participants participant
    where cardinality(array_remove(participant.member_profile_ids, null)) > 0;
    if v_participant_count < 2 then
      continue;
    end if;'
  );
  v_updated_definition := replace(
    v_updated_definition,
    'else
      v_winner_participant_id := null;
    end if;

    for v_participant in
      select participant.*
      from pg_temp.plink_rating_participants participant
    loop',
    'else
      v_winner_participant_id := null;
    end if;

    select coalesce(
      cardinality(array_remove(participant.member_profile_ids, null)) > 0,
      false
    )
    into v_winner_is_rated
    from pg_temp.plink_rating_participants participant
    where participant.participant_id = v_winner_participant_id;
    v_winner_is_rated := coalesce(v_winner_is_rated, false);

    for v_participant in
      select participant.*
      from pg_temp.plink_rating_participants participant
      where cardinality(array_remove(participant.member_profile_ids, null)) > 0
    loop'
  );
  v_updated_definition := replace(
    v_updated_definition,
    'where opponent.participant_id <> v_participant.participant_id;

      v_outcome :=',
    'where opponent.participant_id <> v_participant.participant_id
        and cardinality(array_remove(opponent.member_profile_ids, null)) > 0;

      if not v_is_draw and not v_winner_is_rated then
        v_actual := v_expected;
      end if;

      v_outcome :='
  );

  if v_updated_definition = v_definition
    or v_updated_definition not like '%v_winner_is_rated boolean;%'
    or v_updated_definition not like '%v_actual := v_expected;%'
    or v_updated_definition not like '%filter (where grouped.profile_id is not null)%'
  then
    raise exception 'Expected mixed guest rating logic was not installed';
  end if;

  execute v_updated_definition;
  perform public.recalculate_player_ratings();
end;
$$;
