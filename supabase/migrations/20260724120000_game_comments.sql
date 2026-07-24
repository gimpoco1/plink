create table if not exists public.game_comments (
  id uuid primary key default gen_random_uuid(),
  game_id text not null references public.games(id) on delete cascade,
  author_user_id uuid references auth.users(id) on delete set null,
  author_name text not null,
  author_avatar_color text not null,
  body text not null,
  created_at bigint not null
    default floor(extract(epoch from clock_timestamp()) * 1000),
  updated_at bigint not null
    default floor(extract(epoch from clock_timestamp()) * 1000),
  constraint game_comments_body_length_check
    check (char_length(trim(body)) between 1 and 500)
);

create index if not exists game_comments_game_created_idx
  on public.game_comments (game_id, created_at, id);

alter table public.game_comments enable row level security;

drop policy if exists "Players can read accessible game comments"
  on public.game_comments;
create policy "Players can read accessible game comments"
  on public.game_comments
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.games game
      where game.id = game_comments.game_id
        and (
          game.user_id = auth.uid()
          or exists (
            select 1
            from public.game_collaborators collaborator
            where collaborator.game_id = game.id
              and collaborator.user_id = auth.uid()
          )
        )
    )
  );

revoke all on public.game_comments from public;
revoke all on public.game_comments from anon;
revoke insert, update, delete on public.game_comments from authenticated;
grant select on public.game_comments to authenticated;

create or replace function public.add_game_comment(
  p_game_id text,
  p_body text
)
returns public.game_comments
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_profile public.player_profiles%rowtype;
  v_comment public.game_comments%rowtype;
  v_body text := trim(coalesce(p_body, ''));
begin
  if auth.uid() is null then
    raise exception 'Sign in to comment on this game.'
      using errcode = '42501';
  end if;

  if char_length(v_body) not between 1 and 500 then
    raise exception 'Comments must be between 1 and 500 characters.'
      using errcode = '22023';
  end if;

  if not exists (
    select 1
    from public.games game
    where game.id = p_game_id
      and (
        game.user_id = auth.uid()
        or exists (
          select 1
          from public.game_collaborators collaborator
          where collaborator.game_id = game.id
            and collaborator.user_id = auth.uid()
        )
      )
  ) then
    raise exception 'You do not have access to comment on this game.'
      using errcode = '42501';
  end if;

  select profile.*
  into v_profile
  from public.player_profiles profile
  where profile.user_id = auth.uid()
    and profile.is_account_player = true
  order by profile.updated_at desc
  limit 1;

  if not found then
    raise exception 'Set up your account player before adding comments.'
      using errcode = '22023';
  end if;

  insert into public.game_comments (
    game_id,
    author_user_id,
    author_name,
    author_avatar_color,
    body
  )
  values (
    p_game_id,
    auth.uid(),
    v_profile.name,
    v_profile.avatar_color,
    v_body
  )
  returning * into v_comment;

  return v_comment;
end;
$$;

create or replace function public.update_game_comment(
  p_comment_id uuid,
  p_body text
)
returns public.game_comments
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_comment public.game_comments%rowtype;
  v_body text := trim(coalesce(p_body, ''));
  v_now bigint := floor(extract(epoch from clock_timestamp()) * 1000);
begin
  if auth.uid() is null then
    raise exception 'Sign in to update this comment.'
      using errcode = '42501';
  end if;

  if char_length(v_body) not between 1 and 500 then
    raise exception 'Comments must be between 1 and 500 characters.'
      using errcode = '22023';
  end if;

  update public.game_comments comment
  set body = v_body,
      updated_at = greatest(v_now, comment.updated_at + 1)
  where comment.id = p_comment_id
    and comment.author_user_id = auth.uid()
    and exists (
      select 1
      from public.games game
      where game.id = comment.game_id
        and (
          game.user_id = auth.uid()
          or exists (
            select 1
            from public.game_collaborators collaborator
            where collaborator.game_id = game.id
              and collaborator.user_id = auth.uid()
          )
        )
    )
  returning * into v_comment;

  if not found then
    raise exception 'Only the comment author can edit this comment.'
      using errcode = '42501';
  end if;

  return v_comment;
end;
$$;

create or replace function public.delete_game_comment(
  p_comment_id uuid
)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if auth.uid() is null then
    raise exception 'Sign in to delete this comment.'
      using errcode = '42501';
  end if;

  delete from public.game_comments comment
  where comment.id = p_comment_id
    and comment.author_user_id = auth.uid()
    and exists (
      select 1
      from public.games game
      where game.id = comment.game_id
        and (
          game.user_id = auth.uid()
          or exists (
            select 1
            from public.game_collaborators collaborator
            where collaborator.game_id = game.id
              and collaborator.user_id = auth.uid()
          )
        )
    );

  if not found then
    raise exception 'Only the comment author can delete this comment.'
      using errcode = '42501';
  end if;
end;
$$;

revoke all on function public.add_game_comment(text, text) from public;
revoke all on function public.add_game_comment(text, text) from anon;
grant execute on function public.add_game_comment(text, text)
  to authenticated;

revoke all on function public.update_game_comment(uuid, text) from public;
revoke all on function public.update_game_comment(uuid, text) from anon;
grant execute on function public.update_game_comment(uuid, text)
  to authenticated;

revoke all on function public.delete_game_comment(uuid) from public;
revoke all on function public.delete_game_comment(uuid) from anon;
grant execute on function public.delete_game_comment(uuid)
  to authenticated;

do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'game_comments'
  ) then
    alter publication supabase_realtime
      add table public.game_comments;
  end if;
end
$$;

comment on table public.game_comments is
  'Account-attributed notes attached to owned and shared games.';
