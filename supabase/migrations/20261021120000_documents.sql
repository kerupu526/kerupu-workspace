-- 위키 문서 저장소: 문서, 판(revision), 운영자.
-- 설계는 docs/wiki-syntax.md 와 docs/deploy.md 의 비밀값 규칙을 따른다.
--
-- 권한 원칙
--   - 읽기는 누구나 (로그인하지 않은 방문자 포함)
--   - 문서 만들기: 로그인한 사용자, 본인 이름으로만
--   - 문서 고치기: 문서 작성자 또는 운영자
--   - 판(revision)은 추가만 가능하다. 고치거나 지울 수 없다 (정책도 권한도 주지 않는다)
--   - 운영자는 사용자가 쓸 수 없는 operators 테이블로만 정한다 (user_metadata 는 쓰지 않는다)
--
-- 모든 테이블에 RLS 를 켠다. 정책이 없는 작업은 전부 막힌다.

-- ---------- 운영자 ----------
create table public.operators (
  user_id uuid primary key references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);

alter table public.operators enable row level security;
-- 정책을 하나도 주지 않는다. 방문자와 로그인 사용자 모두 이 테이블을 읽거나 바꿀 수 없다.
-- 운영자 추가와 제거는 대시보드 SQL 편집기나 관리용 DB 연결(admin.env)로만 한다.

-- 현재 사용자가 운영자인지. 정책에서 쓰므로 함수로 둔다.
create or replace function public.is_operator()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (select 1 from public.operators where user_id = (select auth.uid()));
$$;

revoke all on function public.is_operator() from public;
grant execute on function public.is_operator() to anon, authenticated;

-- ---------- 문서 ----------
create table public.documents (
  id uuid primary key default gen_random_uuid(),
  -- 주소 (예: 캐릭터 1 -> character-1). 소문자, 숫자, 하이픈만.
  slug text not null unique check (slug ~ '^[a-z0-9][a-z0-9-]{0,79}$'),
  title text not null check (char_length(title) between 1 and 200),
  -- 지금 보여 줄 판. 판을 만들고 나서 채운다.
  current_revision_id uuid,
  created_by uuid not null references auth.users (id) on delete restrict default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.documents enable row level security;

create policy "documents: 누구나 읽기"
  on public.documents for select
  to anon, authenticated
  using (true);

create policy "documents: 로그인 사용자가 본인 이름으로 만들기"
  on public.documents for insert
  to authenticated
  with check (created_by = (select auth.uid()));

create policy "documents: 작성자나 운영자가 고치기"
  on public.documents for update
  to authenticated
  using (created_by = (select auth.uid()) or (select public.is_operator()))
  with check (created_by = (select auth.uid()) or (select public.is_operator()));

-- 삭제 정책은 없다. 문서를 지우는 기능은 나중에 운영자 전용으로 따로 정한다.

-- ---------- 판(revision) ----------
create table public.document_revisions (
  id uuid primary key default gen_random_uuid(),
  document_id uuid not null references public.documents (id) on delete restrict,
  -- 원문(마크다운). 길이 상한은 lib/wiki/parse.ts 의 LIMITS.bodyLength 와 맞춘다.
  markdown text not null check (char_length(markdown) <= 100000),
  author_id uuid not null references auth.users (id) on delete restrict default auth.uid(),
  created_at timestamptz not null default now()
);

create index document_revisions_document_idx
  on public.document_revisions (document_id, created_at desc);

-- 문서의 현재 판은 그 문서에 속한 판이어야 한다
alter table public.documents
  add constraint documents_current_revision_fk
  foreign key (current_revision_id) references public.document_revisions (id)
  deferrable initially deferred;

alter table public.document_revisions enable row level security;

create policy "revisions: 누구나 읽기"
  on public.document_revisions for select
  to anon, authenticated
  using (true);

-- 추가만 가능하다: 작성자 본인 이름으로, 그 문서의 작성자 또는 운영자가.
create policy "revisions: 작성자나 운영자가 추가하기"
  on public.document_revisions for insert
  to authenticated
  with check (
    author_id = (select auth.uid())
    and exists (
      select 1 from public.documents d
      where d.id = document_id
        and (d.created_by = (select auth.uid()) or (select public.is_operator()))
    )
  );

-- update, delete 정책은 일부러 만들지 않는다 (판은 기록이라서 고치거나 지우지 못한다).
-- 권한도 한 번 더 뺏어 둔다 (정책이 실수로 생겨도 막히도록).
revoke update, delete, truncate on public.document_revisions from anon, authenticated;
revoke delete, truncate on public.documents from anon, authenticated;
revoke all on public.operators from anon, authenticated;

-- 바뀐 시각을 자동으로 기록한다
create or replace function public.touch_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create trigger documents_touch_updated_at
  before update on public.documents
  for each row execute function public.touch_updated_at();
