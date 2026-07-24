alter table public.comments
  add column if not exists parent_id uuid references public.comments(id) on delete cascade;

create index if not exists comments_parent_created_idx
  on public.comments (parent_id, created_at)
  where parent_id is not null;

alter table public.comments
  drop constraint if exists comments_no_self_reply;

alter table public.comments
  add constraint comments_no_self_reply
  check (parent_id is null or parent_id <> id);

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
