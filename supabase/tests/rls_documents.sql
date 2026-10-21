-- 문서 저장소 정책 테스트 (마이그레이션 20261021120000_documents.sql 대상).
-- 가짜 사용자 세 명으로 "되어야 할 것"과 "막혀야 할 것"을 확인하고, 끝에 테스트 데이터를 모두 지운다.
--   A: 문서 작성자    B: 다른 로그인 사용자    O: 운영자    anon: 로그인하지 않은 방문자
-- 실행: npx supabase db query --linked -f supabase/tests/rls_documents.sql
-- 결과 표에서 actual 열이 expect 와 맞는지 본다. "error 42501" 은 권한 거부, "error 42501" 이 아닌 행 수 0 은 RLS 가 걸러낸 것이다.

create temp table tr (name text, expect text, actual text);

-- 역할과 사용자를 바꿔 SQL 한 개를 실행하고 결과(성공 행 수 또는 오류 코드)를 기록한다.
create or replace function pg_temp.run(p_name text, p_expect text, p_role text, p_uid uuid, p_sql text)
returns void
language plpgsql
as $$
declare
  n int := 0;
  res text;
begin
  perform set_config(
    'request.jwt.claims',
    case when p_uid is null then '{}' else json_build_object('sub', p_uid, 'role', p_role)::text end,
    true
  );
  execute format('set local role %I', p_role);
  begin
    execute p_sql;
    get diagnostics n = row_count;
    res := 'ok, 행 ' || n;
  exception when others then
    res := 'error ' || sqlstate || ': ' || sqlerrm;
  end;
  execute 'reset role';
  insert into tr values (p_name, p_expect, res);
end;
$$;

-- ---------- 준비: 가짜 사용자 세 명과 운영자 지정 ----------
insert into auth.users (id, aud, role, email, created_at, updated_at) values
  ('11111111-1111-1111-1111-111111111111', 'authenticated', 'authenticated', 'rls-a@example.invalid', now(), now()),
  ('22222222-2222-2222-2222-222222222222', 'authenticated', 'authenticated', 'rls-b@example.invalid', now(), now()),
  ('33333333-3333-3333-3333-333333333333', 'authenticated', 'authenticated', 'rls-o@example.invalid', now(), now());

insert into public.operators (user_id) values ('33333333-3333-3333-3333-333333333333');

-- ---------- 문서 만들기 ----------
select pg_temp.run('A가 본인 이름으로 문서 만들기', 'ok, 행 1', 'authenticated', '11111111-1111-1111-1111-111111111111',
  $q$insert into public.documents (id, slug, title) values ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'rls-test-a', '테스트 A')$q$);

select pg_temp.run('B가 A 이름으로 문서 만들기 (위조)', 'error 42501', 'authenticated', '22222222-2222-2222-2222-222222222222',
  $q$insert into public.documents (slug, title, created_by) values ('rls-test-forged', '위조', '11111111-1111-1111-1111-111111111111')$q$);

select pg_temp.run('익명이 문서 만들기', 'error 42501', 'anon', null,
  $q$insert into public.documents (slug, title, created_by) values ('rls-test-anon', '익명', '11111111-1111-1111-1111-111111111111')$q$);

select pg_temp.run('잘못된 주소(대문자, 공백)로 문서 만들기', 'error 23514', 'authenticated', '11111111-1111-1111-1111-111111111111',
  $q$insert into public.documents (slug, title) values ('Bad Slug', '잘못')$q$);

-- ---------- 읽기 ----------
select pg_temp.run('익명이 문서 읽기', 'ok, 행 1', 'anon', null,
  $q$select 1 from public.documents where id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'$q$);

select pg_temp.run('B가 A 문서 읽기', 'ok, 행 1', 'authenticated', '22222222-2222-2222-2222-222222222222',
  $q$select 1 from public.documents where id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'$q$);

-- ---------- 판(revision) 추가 ----------
select pg_temp.run('A가 본인 문서에 첫 판 추가', 'ok, 행 1', 'authenticated', '11111111-1111-1111-1111-111111111111',
  $q$insert into public.document_revisions (id, document_id, markdown) values ('eeeeeeee-0000-0000-0000-000000000001', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '# 첫 판')$q$);

select pg_temp.run('A가 현재 판 지정 (본인 문서)', 'ok, 행 1', 'authenticated', '11111111-1111-1111-1111-111111111111',
  $q$update public.documents set current_revision_id = 'eeeeeeee-0000-0000-0000-000000000001' where id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'$q$);

select pg_temp.run('B가 A 문서에 판 추가', 'error 42501', 'authenticated', '22222222-2222-2222-2222-222222222222',
  $q$insert into public.document_revisions (document_id, markdown) values ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '침입')$q$);

select pg_temp.run('B가 판 작성자를 A로 위조해서 추가', 'error 42501', 'authenticated', '22222222-2222-2222-2222-222222222222',
  $q$insert into public.document_revisions (document_id, markdown, author_id) values ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '위조', '11111111-1111-1111-1111-111111111111')$q$);

select pg_temp.run('익명이 판 추가', 'error 42501', 'anon', null,
  $q$insert into public.document_revisions (document_id, markdown) values ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '익명')$q$);

select pg_temp.run('판 원문 10만 자 초과', 'error 23514', 'authenticated', '11111111-1111-1111-1111-111111111111',
  $q$insert into public.document_revisions (document_id, markdown) values ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', repeat('가', 100001))$q$);

select pg_temp.run('판 원문 정확히 10만 자', 'ok, 행 1', 'authenticated', '11111111-1111-1111-1111-111111111111',
  $q$insert into public.document_revisions (document_id, markdown) values ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', repeat('가', 100000))$q$);

-- ---------- 판은 고칠 수도 지울 수도 없다 ----------
select pg_temp.run('A가 자기 판 고치기', 'error 42501', 'authenticated', '11111111-1111-1111-1111-111111111111',
  $q$update public.document_revisions set markdown = '고침' where id = 'eeeeeeee-0000-0000-0000-000000000001'$q$);

select pg_temp.run('A가 자기 판 지우기', 'error 42501', 'authenticated', '11111111-1111-1111-1111-111111111111',
  $q$delete from public.document_revisions where id = 'eeeeeeee-0000-0000-0000-000000000001'$q$);

-- ---------- 문서 고치기, 지우기 ----------
select pg_temp.run('B가 A 문서 제목 바꾸기', 'ok, 행 0', 'authenticated', '22222222-2222-2222-2222-222222222222',
  $q$update public.documents set title = '해킹' where id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'$q$);

select pg_temp.run('익명이 A 문서 제목 바꾸기', 'ok, 행 0', 'anon', null,
  $q$update public.documents set title = '익명' where id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'$q$);

select pg_temp.run('A가 본인 문서 제목 바꾸기', 'ok, 행 1', 'authenticated', '11111111-1111-1111-1111-111111111111',
  $q$update public.documents set title = '테스트 A 수정' where id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'$q$);

select pg_temp.run('A가 문서 지우기', 'error 42501', 'authenticated', '11111111-1111-1111-1111-111111111111',
  $q$delete from public.documents where id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'$q$);

-- ---------- 운영자 ----------
select pg_temp.run('운영자 O가 A 문서 고치기', 'ok, 행 1', 'authenticated', '33333333-3333-3333-3333-333333333333',
  $q$update public.documents set title = '운영자 수정' where id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'$q$);

select pg_temp.run('운영자 O가 A 문서에 판 추가', 'ok, 행 1', 'authenticated', '33333333-3333-3333-3333-333333333333',
  $q$insert into public.document_revisions (document_id, markdown) values ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '운영자 판')$q$);

select pg_temp.run('B가 운영자 명단 읽기', 'error 42501', 'authenticated', '22222222-2222-2222-2222-222222222222',
  $q$select 1 from public.operators$q$);

select pg_temp.run('A가 자기 자신을 운영자로 넣기', 'error 42501', 'authenticated', '11111111-1111-1111-1111-111111111111',
  $q$insert into public.operators (user_id) values ('11111111-1111-1111-1111-111111111111')$q$);

-- ---------- 정리: 테스트 데이터 모두 지우기 (postgres 는 정책을 거치지 않는다) ----------
update public.documents set current_revision_id = null where id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
delete from public.document_revisions where document_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
delete from public.documents where id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
delete from public.operators where user_id = '33333333-3333-3333-3333-333333333333';
delete from auth.users where id in (
  '11111111-1111-1111-1111-111111111111',
  '22222222-2222-2222-2222-222222222222',
  '33333333-3333-3333-3333-333333333333'
);

-- 결과
select name, expect, actual, (actual like 'error%' and expect like 'error%' and split_part(actual, ':', 1) = split_part(expect, ':', 1)) or (actual = expect) as matched
from tr
order by name;
