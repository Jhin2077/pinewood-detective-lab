create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null check (char_length(display_name) between 2 and 32),
  handle text not null unique,
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles
  add column if not exists avatar_url text;

create table if not exists public.user_consents (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  age_16_confirmed boolean not null check (age_16_confirmed),
  age_confirmed_at timestamptz not null default now(),
  terms_version text not null check (char_length(terms_version) between 1 and 64),
  terms_accepted_at timestamptz not null default now()
);

create table if not exists public.boards (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles(id) on delete cascade,
  client_id text not null check (char_length(client_id) between 1 and 120),
  title text not null check (char_length(title) between 1 and 80),
  case_code text not null check (char_length(case_code) between 1 and 60),
  genre text not null check (
    genre in (
      '超自然事件',
      '科幻',
      '民俗怪谈',
      '失踪调查',
      'ARG模拟恐怖',
      '都市传说',
      '八卦',
      '广播剧',
      '心理恐怖',
      '后室',
      '新怪谈',
      '未解事件',
      '网络谜案',
      '身份谜案'
    )
  ),
  description text not null default '',
  tags text[] not null default '{}',
  cover_url text,
  snapshot jsonb not null default '{"cards":[],"links":[]}'::jsonb
    check (jsonb_typeof(snapshot) = 'object'),
  is_public boolean not null default false,
  view_count bigint not null default 0 check (view_count >= 0),
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (owner_id, client_id)
);

create table if not exists public.comments (
  id uuid primary key default gen_random_uuid(),
  board_id uuid not null references public.boards(id) on delete cascade,
  author_id uuid not null references public.profiles(id) on delete cascade,
  parent_id uuid references public.comments(id) on delete cascade,
  body text not null check (char_length(body) between 1 and 1000),
  constraint comments_no_self_reply check (parent_id is null or parent_id <> id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.comments
  add column if not exists parent_id uuid references public.comments(id) on delete cascade;

alter table public.comments
  drop constraint if exists comments_no_self_reply;

alter table public.comments
  add constraint comments_no_self_reply
  check (parent_id is null or parent_id <> id);

create table if not exists public.reactions (
  board_id uuid not null references public.boards(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  kind text not null check (kind in ('like', 'favorite')),
  created_at timestamptz not null default now(),
  primary key (board_id, user_id, kind)
);

create table if not exists public.comment_reactions (
  comment_id uuid not null references public.comments(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  kind text not null default 'like' check (kind = 'like'),
  created_at timestamptz not null default now(),
  primary key (comment_id, user_id, kind)
);

create table if not exists public.board_views (
  board_id uuid not null references public.boards(id) on delete cascade,
  viewer_id uuid not null references public.profiles(id) on delete cascade,
  view_count bigint not null default 1 check (view_count >= 1),
  first_viewed_at timestamptz not null default now(),
  last_viewed_at timestamptz not null default now(),
  primary key (board_id, viewer_id)
);

create index if not exists boards_public_published_idx
  on public.boards (is_public, published_at desc);
create index if not exists boards_genre_public_idx
  on public.boards (genre, is_public, published_at desc);
create index if not exists comments_board_created_idx
  on public.comments (board_id, created_at);
create index if not exists comments_parent_created_idx
  on public.comments (parent_id, created_at)
  where parent_id is not null;
create index if not exists comment_reactions_comment_idx
  on public.comment_reactions (comment_id, created_at desc);
create index if not exists comment_reactions_user_idx
  on public.comment_reactions (user_id, created_at desc);
create index if not exists board_views_board_recent_idx
  on public.board_views (board_id, last_viewed_at desc);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at
before update on public.profiles
for each row execute procedure public.set_updated_at();

drop trigger if exists boards_set_updated_at on public.boards;
create trigger boards_set_updated_at
before update on public.boards
for each row execute procedure public.set_updated_at();

drop trigger if exists comments_set_updated_at on public.comments;
create trigger comments_set_updated_at
before update on public.comments
for each row execute procedure public.set_updated_at();

create or replace function public.validate_comment_reply()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  parent_board_id uuid;
  parent_parent_id uuid;
begin
  if tg_op = 'UPDATE'
    and (
      new.board_id <> old.board_id
      or new.parent_id is distinct from old.parent_id
    )
  then
    raise exception 'Comment thread target cannot be changed';
  end if;

  if new.parent_id is null then
    return new;
  end if;

  select board_id, parent_id
  into parent_board_id, parent_parent_id
  from public.comments
  where id = new.parent_id;

  if not found then
    raise exception 'Reply target does not exist';
  end if;

  if parent_board_id <> new.board_id then
    raise exception 'Reply target belongs to another board';
  end if;

  if parent_parent_id is not null then
    raise exception 'Only one reply level is supported';
  end if;

  return new;
end;
$$;

drop trigger if exists comments_validate_reply on public.comments;
create trigger comments_validate_reply
before insert or update of board_id, parent_id on public.comments
for each row execute procedure public.validate_comment_reply();

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  requested_name text;
  requested_terms text;
  age_confirmed boolean;
begin
  requested_name := trim(coalesce(new.raw_user_meta_data ->> 'display_name', ''));
  requested_terms := trim(coalesce(new.raw_user_meta_data ->> 'terms_version', ''));
  age_confirmed := coalesce((new.raw_user_meta_data ->> 'age_16_confirmed')::boolean, false);

  if char_length(requested_name) < 2 or char_length(requested_name) > 32 then
    raise exception 'A valid display name is required';
  end if;
  if not age_confirmed or requested_terms = '' then
    raise exception 'Age and terms confirmation are required';
  end if;

  insert into public.profiles (id, display_name, handle)
  values (
    new.id,
    requested_name,
    'detective_' || replace(left(new.id::text, 8), '-', '')
  );

  insert into public.user_consents (
    user_id,
    age_16_confirmed,
    age_confirmed_at,
    terms_version,
    terms_accepted_at
  )
  values (
    new.id,
    true,
    now(),
    requested_terms,
    coalesce(
      nullif(new.raw_user_meta_data ->> 'terms_accepted_at', '')::timestamptz,
      now()
    )
  );

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute procedure public.handle_new_user();

create or replace function public.increment_board_views(target_board_id uuid)
returns void
language sql
security definer
set search_path = public
as $$
  update public.boards
  set view_count = view_count + 1
  where id = target_board_id
    and is_public = true;
$$;

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

create or replace function public.get_detective_profile_stats(target_user_id uuid)
returns table (
  likes_received bigint,
  replies_received bigint
)
language sql
stable
security definer
set search_path = public
as $$
  select
    (
      select count(*)::bigint
      from public.comments
      join public.comment_reactions
        on comment_reactions.comment_id = comments.id
       and comment_reactions.kind = 'like'
      where comments.author_id = target_user_id
    ) as likes_received,
    (
      select count(*)::bigint
      from public.comments as parent_comment
      join public.comments as reply
        on reply.parent_id = parent_comment.id
      where parent_comment.author_id = target_user_id
        and reply.author_id <> target_user_id
    ) as replies_received;
$$;

create or replace function public.get_detective_leaderboard(max_rows integer default 5)
returns table (
  user_id uuid,
  display_name text,
  handle text,
  avatar_url text,
  likes_received bigint,
  replies_received bigint
)
language sql
stable
security definer
set search_path = public
as $$
  with likes as (
    select comments.author_id, count(*)::bigint as likes_received
    from public.comments
    join public.comment_reactions
      on comment_reactions.comment_id = comments.id
     and comment_reactions.kind = 'like'
    group by comments.author_id
  ),
  replies as (
    select parent_comment.author_id, count(*)::bigint as replies_received
    from public.comments as parent_comment
    join public.comments as reply
      on reply.parent_id = parent_comment.id
     and reply.author_id <> parent_comment.author_id
    group by parent_comment.author_id
  )
  select
    profiles.id as user_id,
    profiles.display_name,
    profiles.handle,
    profiles.avatar_url,
    coalesce(likes.likes_received, 0)::bigint,
    coalesce(replies.replies_received, 0)::bigint
  from public.profiles
  left join likes on likes.author_id = profiles.id
  left join replies on replies.author_id = profiles.id
  where exists (
    select 1 from public.comments where comments.author_id = profiles.id
  )
  order by
    coalesce(likes.likes_received, 0) desc,
    coalesce(replies.replies_received, 0) desc,
    profiles.created_at asc
  limit greatest(1, least(coalesce(max_rows, 5), 50));
$$;

alter table public.profiles enable row level security;
alter table public.user_consents enable row level security;
alter table public.boards enable row level security;
alter table public.comments enable row level security;
alter table public.reactions enable row level security;
alter table public.comment_reactions enable row level security;
alter table public.board_views enable row level security;

drop policy if exists "profiles are publicly readable" on public.profiles;
create policy "profiles are publicly readable"
  on public.profiles for select
  using (true);

drop policy if exists "users update their own profile" on public.profiles;
create policy "users update their own profile"
  on public.profiles for update
  to authenticated
  using ((select auth.uid()) = id)
  with check ((select auth.uid()) = id);

drop policy if exists "users read their own consents" on public.user_consents;
create policy "users read their own consents"
  on public.user_consents for select
  to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "users update their own consents" on public.user_consents;
create policy "users update their own consents"
  on public.user_consents for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id and age_16_confirmed);

drop policy if exists "public boards are readable" on public.boards;
create policy "public boards are readable"
  on public.boards for select
  using (is_public or (select auth.uid()) = owner_id);

drop policy if exists "users create their own boards" on public.boards;
create policy "users create their own boards"
  on public.boards for insert
  to authenticated
  with check ((select auth.uid()) = owner_id);

drop policy if exists "users update their own boards" on public.boards;
create policy "users update their own boards"
  on public.boards for update
  to authenticated
  using ((select auth.uid()) = owner_id)
  with check ((select auth.uid()) = owner_id);

drop policy if exists "users delete their own boards" on public.boards;
create policy "users delete their own boards"
  on public.boards for delete
  to authenticated
  using ((select auth.uid()) = owner_id);

drop policy if exists "public comments are readable" on public.comments;
create policy "public comments are readable"
  on public.comments for select
  using (
    exists (
      select 1 from public.boards
      where boards.id = comments.board_id
        and (boards.is_public or boards.owner_id = (select auth.uid()))
    )
  );

drop policy if exists "authenticated users create comments" on public.comments;
create policy "authenticated users create comments"
  on public.comments for insert
  to authenticated
  with check (
    (select auth.uid()) = author_id
    and exists (
      select 1 from public.boards
      where boards.id = comments.board_id
        and boards.is_public
    )
    and (
      comments.parent_id is null
      or exists (
        select 1 from public.boards
        where boards.id = comments.board_id
          and boards.owner_id = (select auth.uid())
      )
    )
  );

drop policy if exists "users update their own comments" on public.comments;
create policy "users update their own comments"
  on public.comments for update
  to authenticated
  using ((select auth.uid()) = author_id)
  with check (
    (select auth.uid()) = author_id
    and (
      comments.parent_id is null
      or exists (
        select 1 from public.boards
        where boards.id = comments.board_id
          and boards.owner_id = (select auth.uid())
      )
    )
  );

drop policy if exists "users delete their own comments" on public.comments;
create policy "users delete their own comments"
  on public.comments for delete
  to authenticated
  using ((select auth.uid()) = author_id);

drop policy if exists "public reactions are readable" on public.reactions;
create policy "public reactions are readable"
  on public.reactions for select
  using (
    exists (
      select 1 from public.boards
      where boards.id = reactions.board_id
        and (boards.is_public or boards.owner_id = (select auth.uid()))
    )
  );

drop policy if exists "users create their own reactions" on public.reactions;
create policy "users create their own reactions"
  on public.reactions for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

drop policy if exists "users delete their own reactions" on public.reactions;
create policy "users delete their own reactions"
  on public.reactions for delete
  to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "public comment reactions are readable" on public.comment_reactions;
create policy "public comment reactions are readable"
  on public.comment_reactions for select
  using (
    exists (
      select 1
      from public.comments
      join public.boards on boards.id = comments.board_id
      where comments.id = comment_reactions.comment_id
        and boards.is_public = true
    )
  );

drop policy if exists "users like public comments" on public.comment_reactions;
create policy "users like public comments"
  on public.comment_reactions for insert
  to authenticated
  with check (
    (select auth.uid()) = user_id
    and exists (
      select 1
      from public.comments
      join public.boards on boards.id = comments.board_id
      where comments.id = comment_reactions.comment_id
        and comments.author_id <> (select auth.uid())
        and boards.is_public = true
    )
  );

drop policy if exists "users remove their comment likes" on public.comment_reactions;
create policy "users remove their comment likes"
  on public.comment_reactions for delete
  to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "public board viewers are readable" on public.board_views;
drop policy if exists "users read their own view history" on public.board_views;
create policy "users read their own view history"
  on public.board_views for select
  to authenticated
  using ((select auth.uid()) = viewer_id);

grant usage on schema public to anon, authenticated;
grant select on public.profiles to anon, authenticated;
grant update on public.profiles to authenticated;
grant select, insert, update, delete on public.boards to authenticated;
grant select on public.boards to anon;
grant select, insert, update, delete on public.comments to authenticated;
grant select on public.comments to anon;
grant select, insert, delete on public.reactions to authenticated;
grant select on public.reactions to anon;
grant select on public.comment_reactions to anon, authenticated;
grant insert, delete on public.comment_reactions to authenticated;
revoke select on public.board_views from anon;
grant select on public.board_views to authenticated;
grant select, update on public.user_consents to authenticated;
grant execute on function public.increment_board_views(uuid) to anon, authenticated;
revoke all on function public.record_board_view(uuid) from public;
grant execute on function public.record_board_view(uuid) to anon, authenticated;
revoke all on function public.get_board_viewers(uuid) from public;
grant execute on function public.get_board_viewers(uuid) to anon, authenticated;
revoke all on function public.get_detective_profile_stats(uuid) from public;
grant execute on function public.get_detective_profile_stats(uuid) to anon, authenticated;
revoke all on function public.get_detective_leaderboard(integer) from public;
grant execute on function public.get_detective_leaderboard(integer) to anon, authenticated;

insert into storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
)
values (
  'case-assets',
  'case-assets',
  true,
  2097152,
  array['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "case assets are publicly readable" on storage.objects;
create policy "case assets are publicly readable"
  on storage.objects for select
  using (bucket_id = 'case-assets');

drop policy if exists "users upload their own case assets" on storage.objects;
create policy "users upload their own case assets"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'case-assets'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

drop policy if exists "users update their own case assets" on storage.objects;
create policy "users update their own case assets"
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'case-assets'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  )
  with check (
    bucket_id = 'case-assets'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

drop policy if exists "users delete their own case assets" on storage.objects;
create policy "users delete their own case assets"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'case-assets'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

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
