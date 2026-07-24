alter table public.profiles
  add column if not exists avatar_url text;

create table if not exists public.board_views (
  board_id uuid not null references public.boards(id) on delete cascade,
  viewer_id uuid not null references public.profiles(id) on delete cascade,
  view_count bigint not null default 1 check (view_count >= 1),
  first_viewed_at timestamptz not null default now(),
  last_viewed_at timestamptz not null default now(),
  primary key (board_id, viewer_id)
);

create index if not exists board_views_board_recent_idx
  on public.board_views (board_id, last_viewed_at desc);

create or replace function public.record_board_view(target_board_id uuid)
returns bigint
language plpgsql
security definer
set search_path = public
as $$
declare
  next_view_count bigint;
  current_viewer uuid;
begin
  update public.boards
  set view_count = view_count + 1
  where id = target_board_id
    and is_public = true
  returning view_count into next_view_count;

  if next_view_count is null then
    raise exception 'Public board not found';
  end if;

  current_viewer := auth.uid();
  if current_viewer is not null then
    insert into public.board_views (
      board_id,
      viewer_id,
      view_count,
      first_viewed_at,
      last_viewed_at
    )
    values (
      target_board_id,
      current_viewer,
      1,
      now(),
      now()
    )
    on conflict (board_id, viewer_id) do update
    set
      view_count = public.board_views.view_count + 1,
      last_viewed_at = now();
  end if;

  return next_view_count;
end;
$$;

create or replace function public.get_board_viewers(target_board_id uuid)
returns table (
  viewer_id uuid,
  display_name text,
  handle text,
  avatar_url text,
  last_viewed_at timestamptz
)
language sql
stable
security definer
set search_path = public
as $$
  select
    board_views.viewer_id,
    profiles.display_name,
    profiles.handle,
    profiles.avatar_url,
    board_views.last_viewed_at
  from public.board_views
  join public.profiles on profiles.id = board_views.viewer_id
  join public.boards on boards.id = board_views.board_id
  where board_views.board_id = target_board_id
    and boards.is_public = true
  order by board_views.last_viewed_at desc
  limit 8;
$$;

alter table public.board_views enable row level security;

drop policy if exists "public board viewers are readable" on public.board_views;
drop policy if exists "users read their own view history" on public.board_views;
create policy "users read their own view history"
  on public.board_views for select
  to authenticated
  using ((select auth.uid()) = viewer_id);

revoke select on public.board_views from anon;
grant select on public.board_views to authenticated;
revoke all on function public.record_board_view(uuid) from public;
grant execute on function public.record_board_view(uuid) to anon, authenticated;
revoke all on function public.get_board_viewers(uuid) from public;
grant execute on function public.get_board_viewers(uuid) to anon, authenticated;

insert into storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
)
values (
  'profile-avatars',
  'profile-avatars',
  true,
  2097152,
  array['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "profile avatars are publicly readable" on storage.objects;
create policy "profile avatars are publicly readable"
  on storage.objects for select
  using (bucket_id = 'profile-avatars');

drop policy if exists "users upload their own profile avatar" on storage.objects;
create policy "users upload their own profile avatar"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'profile-avatars'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

drop policy if exists "users update their own profile avatar" on storage.objects;
create policy "users update their own profile avatar"
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'profile-avatars'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  )
  with check (
    bucket_id = 'profile-avatars'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

drop policy if exists "users delete their own profile avatar" on storage.objects;
create policy "users delete their own profile avatar"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'profile-avatars'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );
