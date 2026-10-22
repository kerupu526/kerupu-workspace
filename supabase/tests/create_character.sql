-- 캐릭터 만들기 함수와 새 열 테스트 (마이그레이션 20261022120000_characters.sql 대상).
-- rls_documents.sql 과 같은 방식이다: 가짜 사용자로 "되어야 할 것"과 "막혀야 할 것"을 확인하고, 끝에 테스트 데이터를 지운다.
--   A: 로그인 사용자    B: 다른 로그인 사용자    anon: 로그인하지 않은 방문자
-- 실행: npx supabase db query --linked -f supabase/tests/create_character.sql
-- 결과 표의 matched 열이 모두 true 여야 한다.

create temp table tr (name text, expect text, actual text);

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

insert into auth.users (id, aud, role, email, created_at, updated_at) values
  ('11111111-1111-1111-1111-111111111111', 'authenticated', 'authenticated', 'cc-a@example.invalid', now(), now()),
  ('22222222-2222-2222-2222-222222222222', 'authenticated', 'authenticated', 'cc-b@example.invalid', now(), now());

-- ---------- 만들기 ----------
select pg_temp.run('A가 캐릭터 만들기', 'ok, 행 1', 'authenticated', '11111111-1111-1111-1111-111111111111',
  $q$select public.create_character('cc-test-a', '테스트 캐릭터', '테스트 작품', '한 줄 설명', '## 개요')$q$);

select pg_temp.run('같은 주소로 다시 만들기', 'error 23505', 'authenticated', '22222222-2222-2222-2222-222222222222',
  $q$select public.create_character('cc-test-a', '중복', '작품', '설명', '## 개요')$q$);

select pg_temp.run('익명이 캐릭터 만들기', 'error', 'anon', null,
  $q$select public.create_character('cc-test-anon', '익명', '작품', '설명', '## 개요')$q$);

select pg_temp.run('예약된 주소(new)로 만들기', 'error 23514', 'authenticated', '11111111-1111-1111-1111-111111111111',
  $q$select public.create_character('new', '예약', '작품', '설명', '## 개요')$q$);

select pg_temp.run('작품이 너무 길면 거부', 'error 23514', 'authenticated', '11111111-1111-1111-1111-111111111111',
  $q$select public.create_character('cc-test-long', '긴 작품', repeat('가', 101), '설명', '## 개요')$q$);

-- 중간 단계(판 추가)가 실패하면 문서도 남지 않아야 한다: 판 길이 상한(10만 자)을 넘겨 일부러 실패시킨다
select pg_temp.run('판 저장이 실패하면 문서도 만들어지지 않음', 'error 23514', 'authenticated', '11111111-1111-1111-1111-111111111111',
  $q$select public.create_character('cc-test-rollback', '되돌림', '작품', '설명', repeat('가', 100001))$q$);

select pg_temp.run('되돌린 문서가 남아 있지 않음', 'ok, 행 0', 'anon', null,
  $q$select 1 from public.documents where slug = 'cc-test-rollback'$q$);

-- ---------- 만들어진 모습 ----------
select pg_temp.run('만든 문서는 현재 판이 지정돼 있음', 'ok, 행 1', 'anon', null,
  $q$select 1 from public.documents d join public.document_revisions r on r.id = d.current_revision_id
     where d.slug = 'cc-test-a' and d.work = '테스트 작품' and d.summary = '한 줄 설명' and r.markdown = '## 개요'$q$);

-- ---------- 새 열 고치기는 기존 정책을 따른다 ----------
select pg_temp.run('B가 A 캐릭터의 작품 바꾸기', 'ok, 행 0', 'authenticated', '22222222-2222-2222-2222-222222222222',
  $q$update public.documents set work = '해킹' where slug = 'cc-test-a'$q$);

select pg_temp.run('A가 본인 캐릭터의 작품 바꾸기', 'ok, 행 1', 'authenticated', '11111111-1111-1111-1111-111111111111',
  $q$update public.documents set work = '바뀐 작품' where slug = 'cc-test-a'$q$);

-- ---------- 정리 ----------
update public.documents set current_revision_id = null where slug like 'cc-test-%';
delete from public.document_revisions where document_id in (select id from public.documents where slug like 'cc-test-%');
delete from public.documents where slug like 'cc-test-%';
delete from auth.users where id in ('11111111-1111-1111-1111-111111111111', '22222222-2222-2222-2222-222222222222');

select name, expect, actual,
  (expect = 'error' and actual like 'error%')
  or (actual like 'error%' and expect like 'error %' and split_part(actual, ':', 1) = split_part(expect, ':', 1))
  or (actual = expect) as matched
from tr
order by name;
