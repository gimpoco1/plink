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
