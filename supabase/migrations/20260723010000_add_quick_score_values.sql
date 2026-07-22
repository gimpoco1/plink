alter table public.games
  add column if not exists quick_score_value_1 integer not null default 1,
  add column if not exists quick_score_value_2 integer not null default 2;

alter table public.games
  drop constraint if exists games_quick_score_value_1_check,
  drop constraint if exists games_quick_score_value_2_check,
  drop constraint if exists games_quick_score_values_distinct_check;

alter table public.games
  add constraint games_quick_score_value_1_check
    check (quick_score_value_1 between 1 and 999999),
  add constraint games_quick_score_value_2_check
    check (quick_score_value_2 between 1 and 999999),
  add constraint games_quick_score_values_distinct_check
    check (quick_score_value_1 <> quick_score_value_2);

create or replace function public.update_shared_game_settings_v3(
  p_game_id text,
  p_name text,
  p_score_direction text,
  p_starting_score integer,
  p_target_score integer,
  p_win_condition text,
  p_win_by_two boolean,
  p_manual_end_only boolean,
  p_timer_enabled boolean,
  p_dice_enabled boolean,
  p_quick_score_value_1 integer,
  p_quick_score_value_2 integer,
  p_timer_mode text,
  p_timer_seconds integer,
  p_collaborators_can_manage boolean
)
returns public.games
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_game public.games%rowtype;
  v_now bigint;
begin
  if p_quick_score_value_1 not between 1 and 999999
    or p_quick_score_value_2 not between 1 and 999999
    or p_quick_score_value_1 = p_quick_score_value_2 then
    raise exception 'Choose two different positive quick-score values.'
      using errcode = '22023';
  end if;

  select * into v_game
  from public.update_shared_game_settings_v2(
    p_game_id,
    p_name,
    p_score_direction,
    p_starting_score,
    p_target_score,
    p_win_condition,
    p_win_by_two,
    p_manual_end_only,
    p_timer_enabled,
    p_dice_enabled,
    p_timer_mode,
    p_timer_seconds,
    p_collaborators_can_manage
  );

  if v_game.quick_score_value_1 is distinct from p_quick_score_value_1
    or v_game.quick_score_value_2 is distinct from p_quick_score_value_2 then
    v_now := greatest(
      floor(extract(epoch from clock_timestamp()) * 1000),
      v_game.updated_at + 1
    );
    update public.games
    set quick_score_value_1 = p_quick_score_value_1,
        quick_score_value_2 = p_quick_score_value_2,
        updated_at = v_now
    where id = p_game_id
    returning * into v_game;
  end if;

  return v_game;
end;
$$;

revoke all on function public.update_shared_game_settings_v3(
  text, text, text, integer, integer, text, boolean, boolean,
  boolean, boolean, integer, integer, text, integer, boolean
) from public;
revoke all on function public.update_shared_game_settings_v3(
  text, text, text, integer, integer, text, boolean, boolean,
  boolean, boolean, integer, integer, text, integer, boolean
) from anon;
grant execute on function public.update_shared_game_settings_v3(
  text, text, text, integer, integer, text, boolean, boolean,
  boolean, boolean, integer, integer, text, integer, boolean
) to authenticated;
