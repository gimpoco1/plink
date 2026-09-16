-- Keep the currently deployed client working until it is replaced by the
-- tools-enabled build. That client still selects and writes dice_enabled.
alter table public.games
  add column if not exists dice_enabled boolean not null default false;

update public.games
set dice_enabled = tools_enabled
where dice_enabled is distinct from tools_enabled;

create or replace function public.sync_legacy_dice_enabled()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  if tg_op = 'INSERT' then
    if new.tools_enabled and not new.dice_enabled then
      new.dice_enabled := true;
    elsif new.dice_enabled and not new.tools_enabled then
      new.tools_enabled := true;
    end if;
    return new;
  end if;

  if new.tools_enabled is distinct from old.tools_enabled
    and new.dice_enabled is not distinct from old.dice_enabled then
    new.dice_enabled := new.tools_enabled;
  elsif new.dice_enabled is distinct from old.dice_enabled
    and new.tools_enabled is not distinct from old.tools_enabled then
    new.tools_enabled := new.dice_enabled;
  elsif new.tools_enabled is distinct from new.dice_enabled then
    new.dice_enabled := new.tools_enabled;
  end if;
  return new;
end;
$$;

drop trigger if exists sync_legacy_dice_enabled on public.games;
create trigger sync_legacy_dice_enabled
before insert or update of tools_enabled, dice_enabled on public.games
for each row execute function public.sync_legacy_dice_enabled();

-- v3 is used by the production client. Delegate all validation and
-- permissions to the current implementation, mapping Dice to Tools.
create function public.update_shared_game_settings_v3(
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
language sql
security definer
set search_path = public, pg_temp
as $$
  select *
  from public.update_shared_game_settings_v5(
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
