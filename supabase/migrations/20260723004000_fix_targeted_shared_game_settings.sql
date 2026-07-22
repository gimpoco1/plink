create or replace function public.update_shared_game_settings_v2(
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
  from public.update_shared_game_settings(
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
    p_timer_seconds
  );

  if v_game.user_id = auth.uid()
    and v_game.collaborators_can_manage is distinct from p_collaborators_can_manage then
    v_now := greatest(
      floor(extract(epoch from clock_timestamp()) * 1000),
      v_game.updated_at + 1
    );
    update public.games
    set collaborators_can_manage = p_collaborators_can_manage,
        updated_at = v_now
    where id = p_game_id
    returning * into v_game;
  end if;

  return v_game;
end;
$$;

revoke all on function public.update_shared_game_settings_v2(
  text, text, text, integer, integer, text, boolean, boolean,
  boolean, boolean, text, integer, boolean
) from public;
revoke all on function public.update_shared_game_settings_v2(
  text, text, text, integer, integer, text, boolean, boolean,
  boolean, boolean, text, integer, boolean
) from anon;
grant execute on function public.update_shared_game_settings_v2(
  text, text, text, integer, integer, text, boolean, boolean,
  boolean, boolean, text, integer, boolean
) to authenticated;
