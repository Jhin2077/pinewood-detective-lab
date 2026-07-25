begin;

alter table public.boards
  drop constraint if exists boards_genre_check;

with normalized as (
  select
    id,
    case genre
      when '灵异' then '超自然事件'
      when '超自然' then '超自然事件'
      when '民俗' then '民俗怪谈'
      when '失踪' then '失踪调查'
      when 'ARG' then 'ARG模拟恐怖'
      when '模拟恐怖' then 'ARG模拟恐怖'
      when '档案异常' then '未解事件'
      else genre
    end as next_genre
  from public.boards
)
update public.boards as boards
set
  genre = normalized.next_genre,
  tags = case
    when cardinality(boards.tags) = 0 then array[normalized.next_genre]::text[]
    else array(
      select distinct case tag
        when '灵异' then '超自然事件'
        when '超自然' then '超自然事件'
        when '民俗' then '民俗怪谈'
        when '失踪' then '失踪调查'
        when 'ARG' then 'ARG模拟恐怖'
        when '模拟恐怖' then 'ARG模拟恐怖'
        when '档案异常' then '未解事件'
        else tag
      end
      from unnest(boards.tags) as tag
    )
  end,
  snapshot = case
    when jsonb_typeof(boards.snapshot -> 'meta') = 'object'
      then jsonb_set(
        boards.snapshot,
        '{meta,genre}',
        to_jsonb(normalized.next_genre),
        true
      )
    else boards.snapshot
  end
from normalized
where boards.id = normalized.id
  and boards.genre is distinct from normalized.next_genre;

alter table public.boards
  add constraint boards_genre_check
  check (
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
  );

create table if not exists public.comment_reactions (
  comment_id uuid not null references public.comments(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  kind text not null default 'like' check (kind = 'like'),
  created_at timestamptz not null default now(),
  primary key (comment_id, user_id, kind)
);

create index if not exists comment_reactions_comment_idx
  on public.comment_reactions (comment_id, created_at desc);

create index if not exists comment_reactions_user_idx
  on public.comment_reactions (user_id, created_at desc);

alter table public.comment_reactions enable row level security;

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

grant select on public.comment_reactions to anon, authenticated;
grant insert, delete on public.comment_reactions to authenticated;

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

revoke all on function public.get_detective_profile_stats(uuid) from public;
grant execute on function public.get_detective_profile_stats(uuid) to anon, authenticated;

revoke all on function public.get_detective_leaderboard(integer) from public;
grant execute on function public.get_detective_leaderboard(integer) to anon, authenticated;

commit;
