alter table public.games
  add column if not exists calculator_enabled boolean not null default false;

create or replace function public.update_shared_game_settings_v4(
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
  p_calculator_enabled boolean,
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
  select * into v_game
  from public.update_shared_game_settings_v3(
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
    p_quick_score_value_1,
    p_quick_score_value_2,
    p_timer_mode,
    p_timer_seconds,
    p_collaborators_can_manage
  );

  if v_game.calculator_enabled is distinct from p_calculator_enabled then
    v_now := greatest(
      floor(extract(epoch from clock_timestamp()) * 1000),
      v_game.updated_at + 1
    );
    update public.games
    set calculator_enabled = p_calculator_enabled,
        updated_at = v_now
    where id = p_game_id
    returning * into v_game;
  end if;

  return v_game;
end;
$$;

revoke all on function public.update_shared_game_settings_v4(
  text, text, text, integer, integer, text, boolean, boolean,
  boolean, boolean, boolean, integer, integer, text, integer, boolean
) from public;
revoke all on function public.update_shared_game_settings_v4(
  text, text, text, integer, integer, text, boolean, boolean,
  boolean, boolean, boolean, integer, integer, text, integer, boolean
) from anon;
grant execute on function public.update_shared_game_settings_v4(
  text, text, text, integer, integer, text, boolean, boolean,
  boolean, boolean, boolean, integer, integer, text, integer, boolean
) to authenticated;
