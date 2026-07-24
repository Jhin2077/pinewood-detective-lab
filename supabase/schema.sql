create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null check (char_length(display_name) between 2 and 32),
  handle text unique,
  age_16_confirmed boolean not null check (age_16_confirmed),
  age_confirmed_at timestamptz not null default now(),
  terms_version text not null,
  terms_accepted_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.boards (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles(id) on delete cascade,
  title text not null check (char_length(title) between 1 and 80),
  case_code text not null,
  genre text not null check (
    genre in (
      '灵异',
      '超自然',
      '科幻',
      '民俗',
      '失踪',
      'ARG',
      '模拟恐怖',
      '都市传说',
      '档案异常'
    )
  ),
  description text not null default '',
  snapshot jsonb not null default '{"cards":[],"links":[]}'::jsonb,
  is_public boolean not null default false,
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.comments (
  id uuid primary key default gen_random_uuid(),
  board_id uuid not null references public.boards(id) on delete cascade,
  author_id uuid not null references public.profiles(id) on delete cascade,
  body text not null check (char_length(body) between 1 and 1000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.reactions (
  board_id uuid not null references public.boards(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  kind text not null check (kind in ('like', 'favorite')),
  created_at timestamptz not null default now(),
  primary key (board_id, user_id, kind)
);

create index if not exists boards_public_genre_published_idx
  on public.boards (genre, published_at desc)
  where is_public = true;

create index if not exists boards_owner_updated_idx
  on public.boards (owner_id, updated_at desc);

create index if not exists comments_board_created_idx
  on public.comments (board_id, created_at);

alter table public.profiles enable row level security;
alter table public.boards enable row level security;
alter table public.comments enable row level security;
alter table public.reactions enable row level security;

create policy "profiles are publicly readable"
  on public.profiles for select
  using (true);

create policy "users create their own profile"
  on public.profiles for insert
  to authenticated
  with check ((select auth.uid()) = id);

create policy "users update their own profile"
  on public.profiles for update
  to authenticated
  using ((select auth.uid()) = id)
  with check ((select auth.uid()) = id);

create policy "public boards and own drafts are readable"
  on public.boards for select
  using (is_public or (select auth.uid()) = owner_id);

create policy "users create their own boards"
  on public.boards for insert
  to authenticated
  with check ((select auth.uid()) = owner_id);

create policy "users update their own boards"
  on public.boards for update
  to authenticated
  using ((select auth.uid()) = owner_id)
  with check ((select auth.uid()) = owner_id);

create policy "users delete their own boards"
  on public.boards for delete
  to authenticated
  using ((select auth.uid()) = owner_id);

create policy "comments on visible boards are readable"
  on public.comments for select
  using (
    exists (
      select 1
      from public.boards
      where boards.id = comments.board_id
        and (boards.is_public or boards.owner_id = (select auth.uid()))
    )
  );

create policy "users create their own comments"
  on public.comments for insert
  to authenticated
  with check ((select auth.uid()) = author_id);

create policy "users update their own comments"
  on public.comments for update
  to authenticated
  using ((select auth.uid()) = author_id)
  with check ((select auth.uid()) = author_id);

create policy "users delete their own comments"
  on public.comments for delete
  to authenticated
  using ((select auth.uid()) = author_id);

create policy "reactions are publicly readable"
  on public.reactions for select
  using (true);

create policy "users create their own reactions"
  on public.reactions for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

create policy "users delete their own reactions"
  on public.reactions for delete
  to authenticated
  using ((select auth.uid()) = user_id);
