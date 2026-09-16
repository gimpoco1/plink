drop function if exists public.update_shared_game_settings_v2(
  text, text, text, integer, integer, text, boolean, boolean,
  boolean, boolean, text, integer, boolean
);

drop function if exists public.update_shared_game_settings(
  text, text, text, integer, integer, text, boolean, boolean,
  boolean, boolean, text, integer
);
