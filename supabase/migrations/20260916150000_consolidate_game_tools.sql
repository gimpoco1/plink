alter table public.games
  add column if not exists tools_enabled boolean not null default false;

update public.games
set tools_enabled = coalesce(dice_enabled, false) or coalesce(calculator_enabled, false)
where coalesce(dice_enabled, false) or coalesce(calculator_enabled, false);

drop function if exists public.update_shared_game_settings_v4(
  text, text, text, integer, integer, text, boolean, boolean,
  boolean, boolean, boolean, integer, integer, text, integer, boolean
);

drop function if exists public.update_shared_game_settings_v3(
  text, text, text, integer, integer, text, boolean, boolean,
  boolean, boolean, integer, integer, text, integer, boolean
);

alter table public.games
  drop column if exists dice_enabled,
  drop column if exists calculator_enabled;

create or replace function public.update_shared_game_settings_v5(
  p_game_id text,
  p_name text,
  p_score_direction text,
  p_starting_score integer,
  p_target_score integer,
  p_win_condition text,
  p_win_by_two boolean,
  p_manual_end_only boolean,
  p_timer_enabled boolean,
  p_tools_enabled boolean,
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
  v_name text;
  v_now bigint;
  v_has_ended boolean;
  v_participant_count integer;
  v_leader integer;
  v_runner_up integer;
begin
  if auth.uid() is null then
    raise exception 'Sign in to update this game.' using errcode = '42501';
  end if;
  if p_starting_score is null or p_target_score is null
    or p_win_by_two is null or p_manual_end_only is null
    or p_timer_enabled is null or p_tools_enabled is null
    or p_timer_seconds is null or p_collaborators_can_manage is null then
    raise exception 'Game settings are incomplete.' using errcode = '22023';
  end if;
  if p_quick_score_value_1 not between 1 and 999999
    or p_quick_score_value_2 not between 1 and 999999
    or p_quick_score_value_1 = p_quick_score_value_2 then
    raise exception 'Choose two different positive quick-score values.' using errcode = '22023';
  end if;

  v_name := upper(left(trim(coalesce(p_name, '')), 28));
  if v_name = '' then raise exception 'Enter a game name.' using errcode = '22023'; end if;
  if p_score_direction not in ('up', 'down') then raise exception 'Choose a valid score direction.' using errcode = '22023'; end if;
  if p_win_condition not in ('reach_target', 'reach_zero', 'lowest') then raise exception 'Choose a valid win condition.' using errcode = '22023'; end if;
  if p_timer_mode not in ('countdown', 'stopwatch') then raise exception 'Choose a valid timer mode.' using errcode = '22023'; end if;
  if not p_manual_end_only and p_win_condition <> 'reach_zero' and p_target_score <= 0 then raise exception 'Target score must be greater than 0.' using errcode = '22023'; end if;
  if p_win_condition = 'reach_zero' and p_starting_score <= p_target_score then raise exception 'Starting score must be greater than the target score.' using errcode = '22023'; end if;
  if p_timer_enabled and p_timer_seconds <= 0 then raise exception 'Timer duration must be greater than 0.' using errcode = '22023'; end if;

  select * into v_game from public.games where id = p_game_id for update;
  if not found or not (
    v_game.user_id = auth.uid() or exists (
      select 1 from public.game_collaborators collaborator
      where collaborator.game_id = p_game_id and collaborator.user_id = auth.uid()
    )
  ) then raise exception 'You do not have access to change this game.' using errcode = '42501'; end if;
  if not v_game.is_shared then raise exception 'This game is not shared.' using errcode = '22023'; end if;
  if v_game.user_id <> auth.uid() and not v_game.collaborators_can_manage then
    raise exception 'The game owner has not allowed collaborators to change settings.' using errcode = '42501';
  end if;

  v_participant_count := jsonb_array_length(coalesce(v_game.players, '[]'::jsonb));
  if (p_win_condition = 'lowest' or p_win_by_two) and v_participant_count < 2 then
    raise exception 'This rule needs at least 2 players.' using errcode = '22023';
  end if;
  v_now := greatest(floor(extract(epoch from clock_timestamp()) * 1000), v_game.updated_at + 1);
  v_has_ended := v_game.ended_at is not null;

  if not v_has_ended and not p_manual_end_only and v_participant_count > 0 then
    if p_win_condition = 'reach_zero' then
      select exists (select 1 from jsonb_array_elements(v_game.players) player where (player ->> 'score')::integer <= p_target_score) into v_has_ended;
    elsif p_win_by_two and p_win_condition = 'lowest' then
      select score into v_leader from (select (player ->> 'score')::integer score from jsonb_array_elements(v_game.players) player order by score asc limit 1) scores;
      select score into v_runner_up from (select (player ->> 'score')::integer score from jsonb_array_elements(v_game.players) player order by score asc offset 1 limit 1) scores;
      select exists (select 1 from jsonb_array_elements(v_game.players) player where (player ->> 'score')::integer >= p_target_score) and v_runner_up - v_leader >= 2 into v_has_ended;
    elsif p_win_by_two then
      select score into v_leader from (select (player ->> 'score')::integer score from jsonb_array_elements(v_game.players) player order by score desc limit 1) scores;
      select score into v_runner_up from (select (player ->> 'score')::integer score from jsonb_array_elements(v_game.players) player order by score desc offset 1 limit 1) scores;
      v_has_ended := v_leader >= p_target_score and v_leader - v_runner_up >= 2;
    else
      select exists (select 1 from jsonb_array_elements(v_game.players) player where (player ->> 'score')::integer >= p_target_score) into v_has_ended;
    end if;
  end if;

  update public.games set
    name = v_name, score_direction = p_score_direction, starting_score = p_starting_score,
    target_score = p_target_score, win_condition = p_win_condition, win_by_two = p_win_by_two,
    manual_end_only = p_manual_end_only, timer_enabled = p_timer_enabled,
    tools_enabled = p_tools_enabled, quick_score_value_1 = p_quick_score_value_1,
    quick_score_value_2 = p_quick_score_value_2, timer_mode = p_timer_mode,
    timer_seconds = case when p_timer_seconds > 0 then p_timer_seconds else 300 end,
    collaborators_can_manage = p_collaborators_can_manage,
    completion_mode = case when v_game.ended_at is not null then v_game.completion_mode else null end,
    ended_at = case when v_has_ended then coalesce(v_game.ended_at, v_now) else null end,
    updated_at = v_now
  where id = p_game_id returning * into v_game;
  return v_game;
end;
$$;

revoke all on function public.update_shared_game_settings_v5(
  text, text, text, integer, integer, text, boolean, boolean,
  boolean, boolean, integer, integer, text, integer, boolean
) from public;
revoke all on function public.update_shared_game_settings_v5(
  text, text, text, integer, integer, text, boolean, boolean,
  boolean, boolean, integer, integer, text, integer, boolean
) from anon;
grant execute on function public.update_shared_game_settings_v5(
  text, text, text, integer, integer, text, boolean, boolean,
  boolean, boolean, integer, integer, text, integer, boolean
) to authenticated;
