-- 캐릭터 사전: 문서(documents)에 목록용 열을 더하고, 캐릭터를 한 번에 만드는 함수를 둔다.
-- 앞선 마이그레이션(20261021120000_documents.sql)의 권한 원칙을 그대로 따른다.
--   - 목록에 쓰는 work(작품), summary(한 줄 설명)는 문서와 같은 줄에 두어 목록을 한 번에 읽는다.
--   - 두 열은 문서를 고칠 수 있는 사람(작성자, 운영자)만 바꾼다. 기존 documents 수정 정책이 그대로 적용된다.

alter table public.documents
  add column work text check (work is null or char_length(work) between 1 and 100),
  add column summary text check (summary is null or char_length(summary) between 1 and 200);

-- 작품별로 걸러 보는 목록에서 쓴다
create index documents_work_idx on public.documents (work);

-- /dictionary/new 는 "새 캐릭터 추가" 화면이라 문서 주소로 쓸 수 없다.
-- 이미 그 주소의 문서가 있어도 마이그레이션이 깨지지 않도록 기존 행은 검사하지 않는다 (not valid).
alter table public.documents
  add constraint documents_slug_not_reserved check (slug <> 'new') not valid;

-- 캐릭터 만들기: 문서 + 첫 판 + 현재 판 지정을 한 번에 한다. 중간에 실패하면 모두 되돌려진다.
-- security invoker 라서 호출한 사용자의 권한(RLS)으로 실행된다.
-- 로그인한 사용자 본인 이름으로만 만들 수 있다 (documents 의 insert 정책).
create or replace function public.create_character(
  p_slug text,
  p_name text,
  p_work text,
  p_summary text,
  p_markdown text
)
returns text
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_document_id uuid;
  v_revision_id uuid;
begin
  insert into public.documents (slug, title, work, summary)
  values (p_slug, p_name, p_work, p_summary)
  returning id into v_document_id;

  insert into public.document_revisions (document_id, markdown)
  values (v_document_id, p_markdown)
  returning id into v_revision_id;

  update public.documents set current_revision_id = v_revision_id where id = v_document_id;

  return p_slug;
end;
$$;

revoke all on function public.create_character(text, text, text, text, text) from public, anon;
grant execute on function public.create_character(text, text, text, text, text) to authenticated;
