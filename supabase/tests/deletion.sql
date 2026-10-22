-- 영구 삭제 규칙 테스트 (마이그레이션 20261024090000_deletion.sql 대상).
-- create_character.sql 과 같은 방식: 가짜 사용자로 확인하고 끝에 테스트 데이터를 지운다.
--   A: 문서 작성자, 이미지 올린 사람    B: 다른 로그인 사용자    O: 운영자    anon: 방문자
-- 규칙: 운영자는 언제든, 작성자는 만든 지 30분 ~ 30일 사이에만 (30분 전 'too_early', 30일 후 'window_passed').
-- 실행: npx supabase db query --linked -f supabase/tests/deletion.sql
-- 결과 표의 matched 열이 모두 true 여야 한다 (actual 이 expect 로 시작하면 true).

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

-- 확인용: postgres 로 조건을 보고 true/false 를 기록한다
create or replace function pg_temp.check(p_name text, p_condition boolean)
returns void language plpgsql as $$
begin
  insert into tr values (p_name, 'true', coalesce(p_condition, false)::text);
end;
$$;

-- ---------- 준비 ----------
insert into auth.users (id, aud, role, email, created_at, updated_at) values
  ('11111111-1111-1111-1111-111111111111', 'authenticated', 'authenticated', 'del-a@example.invalid', now(), now()),
  ('22222222-2222-2222-2222-222222222222', 'authenticated', 'authenticated', 'del-b@example.invalid', now(), now()),
  ('33333333-3333-3333-3333-333333333333', 'authenticated', 'authenticated', 'del-o@example.invalid', now(), now());
insert into public.operators (user_id) values ('33333333-3333-3333-3333-333333333333');

-- A: 방금 만든 것(new), 1시간 전(ok), 31일 전(old). B: 1시간 전(b)
select pg_temp.run('A가 문서 만들기 (기존 흐름)', 'ok, 행 1', 'authenticated', '11111111-1111-1111-1111-111111111111',
  $q$select public.create_character('del-test-new', '방금 만든 문서', '작품', '설명', '## 개요')$q$);
select pg_temp.run('A가 문서 만들기 (ok)', 'ok, 행 1', 'authenticated', '11111111-1111-1111-1111-111111111111',
  $q$select public.create_character('del-test-ok', '1시간 전 문서', null, null, '## 개요')$q$);
select pg_temp.run('A가 문서 만들기 (old)', 'ok, 행 1', 'authenticated', '11111111-1111-1111-1111-111111111111',
  $q$select public.create_character('del-test-old', '오래된 문서', null, null, '## 개요')$q$);
select pg_temp.run('B가 문서 만들기', 'ok, 행 1', 'authenticated', '22222222-2222-2222-2222-222222222222',
  $q$select public.create_character('del-test-b', 'B 문서', null, null, '## 개요')$q$);
select pg_temp.run('A가 문서 하나 더 만들기 (29분 전)', 'ok, 행 1', 'authenticated', '11111111-1111-1111-1111-111111111111',
  $q$select public.create_character('del-test-29', '29분 전 문서', null, null, '## 개요')$q$);

-- 만든 시각을 바꾼다 (postgres 만 할 수 있다)
update public.documents set created_at = now() - interval '1 hour' where slug in ('del-test-ok', 'del-test-b');
update public.documents set created_at = now() - interval '31 days' where slug = 'del-test-old';
update public.documents set created_at = now() - interval '29 minutes' where slug = 'del-test-29';

-- ---------- 기존 수정 흐름은 그대로 ----------
select pg_temp.run('A가 본인 문서의 제목, 작품, 대표 이미지 바꾸기', 'ok, 행 1', 'authenticated', '11111111-1111-1111-1111-111111111111',
  $q$update public.documents set title = '고침', work = '새 작품', image = '/uploads/a.png' where slug = 'del-test-new'$q$);

-- ---------- 직접 건드릴 수 없는 것 ----------
select pg_temp.run('A가 만든 시각을 직접 바꾸기', 'error 42501', 'authenticated', '11111111-1111-1111-1111-111111111111',
  $q$update public.documents set created_at = now() - interval '1 hour' where slug = 'del-test-new'$q$);
select pg_temp.run('A가 만든 시각을 과거로 넣어 문서 만들기', 'error 42501', 'authenticated', '11111111-1111-1111-1111-111111111111',
  $q$insert into public.documents (slug, title, created_at) values ('del-test-past', '과거', now() - interval '1 day')$q$);
select pg_temp.run('A가 문서를 API 로 직접 지우기', 'error 42501', 'authenticated', '11111111-1111-1111-1111-111111111111',
  $q$delete from public.documents where slug = 'del-test-ok'$q$);

-- ---------- 작성자의 삭제 ----------
select pg_temp.run('A가 방금 만든 문서 삭제 (30분 전이라 막힘)', 'error P0001: too_early', 'authenticated', '11111111-1111-1111-1111-111111111111',
  $q$select public.delete_document('del-test-new')$q$);
select pg_temp.run('A가 29분 전에 만든 문서 삭제 (막힘)', 'error P0001: too_early', 'authenticated', '11111111-1111-1111-1111-111111111111',
  $q$select public.delete_document('del-test-29')$q$);
select pg_temp.check('막힌 문서는 그대로 있다', (select count(*) = 2 from public.documents where slug in ('del-test-new', 'del-test-29')));
select pg_temp.run('B가 A 문서 삭제', 'error P0001: author_only', 'authenticated', '22222222-2222-2222-2222-222222222222',
  $q$select public.delete_document('del-test-ok')$q$);
select pg_temp.run('A가 31일 지난 본인 문서 삭제 (막힘)', 'error P0001: window_passed', 'authenticated', '11111111-1111-1111-1111-111111111111',
  $q$select public.delete_document('del-test-old')$q$);
select pg_temp.run('없는 문서 삭제', 'error P0001: not_found', 'authenticated', '11111111-1111-1111-1111-111111111111',
  $q$select public.delete_document('del-test-nothing')$q$);
select pg_temp.run('방문자가 삭제', 'error 42501', 'anon', null,
  $q$select public.delete_document('del-test-ok')$q$);
select pg_temp.check('규칙에 막힌 삭제는 아무것도 지우지 않았다',
  (select count(*) = 5 from public.documents where slug like 'del-test-%'));

select pg_temp.run('A가 1시간 전에 만든 본인 문서 삭제', 'ok, 행 1', 'authenticated', '11111111-1111-1111-1111-111111111111',
  $q$select public.delete_document('del-test-ok')$q$);
select pg_temp.check('삭제하면 문서와 모든 판이 바로 없다',
  not exists (select 1 from public.documents where slug = 'del-test-ok')
  and (select count(*) = 4 from public.document_revisions r join public.documents d on d.id = r.document_id where d.slug like 'del-test-%'));

-- ---------- 운영자 ----------
select pg_temp.run('운영자가 방금 만든 남의 문서도 삭제', 'ok, 행 1', 'authenticated', '33333333-3333-3333-3333-333333333333',
  $q$select public.delete_document('del-test-new')$q$);
select pg_temp.run('운영자가 31일 지난 문서도 삭제', 'ok, 행 1', 'authenticated', '33333333-3333-3333-3333-333333333333',
  $q$select public.delete_document('del-test-old')$q$);
select pg_temp.run('운영자가 없는 문서 삭제', 'error P0001: not_found', 'authenticated', '33333333-3333-3333-3333-333333333333',
  $q$select public.delete_document('del-test-old')$q$);
select pg_temp.check('운영자가 지운 문서와 판이 모두 없다',
  not exists (select 1 from public.documents where slug in ('del-test-new', 'del-test-old'))
  and (select count(*) = 2 from public.document_revisions r join public.documents d on d.id = r.document_id where d.slug like 'del-test-%'));

-- ---------- 이미지 ----------
-- a1: A, 방금 / a2: A, 1시간 전 / a3: A, 31일 전 / b1: B, 1시간 전
insert into public.images (id, owner_id, path, mime, bytes, original_name) values
  ('aaaaaaaa-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111',
   '11111111-1111-1111-1111-111111111111/aaaaaaaa-0000-0000-0000-000000000001.png', 'image/png', 100, 'a1.png'),
  ('aaaaaaaa-0000-0000-0000-000000000002', '11111111-1111-1111-1111-111111111111',
   '11111111-1111-1111-1111-111111111111/aaaaaaaa-0000-0000-0000-000000000002.png', 'image/png', 100, 'a2.png'),
  ('aaaaaaaa-0000-0000-0000-000000000003', '11111111-1111-1111-1111-111111111111',
   '11111111-1111-1111-1111-111111111111/aaaaaaaa-0000-0000-0000-000000000003.png', 'image/png', 100, 'a3.png'),
  ('bbbbbbbb-0000-0000-0000-000000000001', '22222222-2222-2222-2222-222222222222',
   '22222222-2222-2222-2222-222222222222/bbbbbbbb-0000-0000-0000-000000000001.png', 'image/png', 100, 'b1.png');
update public.images set created_at = now() - interval '1 hour' where id in ('aaaaaaaa-0000-0000-0000-000000000002', 'bbbbbbbb-0000-0000-0000-000000000001');
update public.images set created_at = now() - interval '31 days' where id = 'aaaaaaaa-0000-0000-0000-000000000003';

select pg_temp.run('A가 자기 이미지 목록 읽기 (본인 것 3개)', 'ok, 행 3', 'authenticated', '11111111-1111-1111-1111-111111111111',
  $q$select 1 from public.images$q$);
select pg_temp.run('B는 자기 것 1개만 읽는다', 'ok, 행 1', 'authenticated', '22222222-2222-2222-2222-222222222222',
  $q$select 1 from public.images$q$);
select pg_temp.run('운영자는 모든 이미지(4개)를 읽는다', 'ok, 행 4', 'authenticated', '33333333-3333-3333-3333-333333333333',
  $q$select 1 from public.images$q$);
select pg_temp.run('방문자는 이미지 표를 못 읽는다', 'error 42501', 'anon', null, $q$select 1 from public.images$q$);
select pg_temp.run('A가 이미지 줄을 직접 넣기', 'error 42501', 'authenticated', '11111111-1111-1111-1111-111111111111',
  $q$insert into public.images (id, owner_id, path) values ('cccccccc-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111', '11111111-1111-1111-1111-111111111111/cccccccc-0000-0000-0000-000000000001.png')$q$);
select pg_temp.run('A가 이미지 줄을 직접 고치기', 'error 42501', 'authenticated', '11111111-1111-1111-1111-111111111111',
  $q$update public.images set created_at = now() - interval '1 day' where id = 'aaaaaaaa-0000-0000-0000-000000000001'$q$);
select pg_temp.run('A가 이미지 줄을 직접 지우기', 'error 42501', 'authenticated', '11111111-1111-1111-1111-111111111111',
  $q$delete from public.images where id = 'aaaaaaaa-0000-0000-0000-000000000002'$q$);

select pg_temp.run('A가 방금 올린 이미지 삭제 (막힘)', 'error P0001: too_early', 'authenticated', '11111111-1111-1111-1111-111111111111',
  $q$select public.check_image_deletion('aaaaaaaa-0000-0000-0000-000000000001')$q$);
select pg_temp.run('A가 1시간 전에 올린 이미지 삭제 허가', 'ok, 행 1', 'authenticated', '11111111-1111-1111-1111-111111111111',
  $q$select public.check_image_deletion('aaaaaaaa-0000-0000-0000-000000000002')$q$);
select pg_temp.check('허가는 경로를 돌려준다',
  (select path from public.images where id = 'aaaaaaaa-0000-0000-0000-000000000002') = '11111111-1111-1111-1111-111111111111/aaaaaaaa-0000-0000-0000-000000000002.png');
select pg_temp.run('A가 31일 지난 이미지 삭제 (막힘)', 'error P0001: window_passed', 'authenticated', '11111111-1111-1111-1111-111111111111',
  $q$select public.check_image_deletion('aaaaaaaa-0000-0000-0000-000000000003')$q$);
select pg_temp.run('B가 A 이미지 삭제', 'error P0001: author_only', 'authenticated', '22222222-2222-2222-2222-222222222222',
  $q$select public.check_image_deletion('aaaaaaaa-0000-0000-0000-000000000002')$q$);
select pg_temp.run('운영자가 방금 올린 남의 이미지도 허가', 'ok, 행 1', 'authenticated', '33333333-3333-3333-3333-333333333333',
  $q$select public.check_image_deletion('aaaaaaaa-0000-0000-0000-000000000001')$q$);
select pg_temp.run('운영자가 31일 지난 이미지도 허가', 'ok, 행 1', 'authenticated', '33333333-3333-3333-3333-333333333333',
  $q$select public.check_image_deletion('aaaaaaaa-0000-0000-0000-000000000003')$q$);
select pg_temp.run('없는 이미지', 'error P0001: not_found', 'authenticated', '11111111-1111-1111-1111-111111111111',
  $q$select public.check_image_deletion('dddddddd-0000-0000-0000-000000000001')$q$);
select pg_temp.run('방문자가 이미지 삭제', 'error 42501', 'anon', null,
  $q$select public.check_image_deletion('aaaaaaaa-0000-0000-0000-000000000002')$q$);
select pg_temp.check('허가 확인만으로는 이미지 줄이 지워지지 않는다',
  (select count(*) = 4 from public.images where id::text like '%-0000-0000-0000-00000000000_'));

-- ---------- 정리 ----------
delete from public.images where id::text like '%-0000-0000-0000-00000000000_';
update public.documents set current_revision_id = null where slug like 'del-test-%';
delete from public.document_revisions where document_id in (select id from public.documents where slug like 'del-test-%');
delete from public.documents where slug like 'del-test-%';
delete from public.operators where user_id = '33333333-3333-3333-3333-333333333333';
delete from auth.users where id in (
  '11111111-1111-1111-1111-111111111111', '22222222-2222-2222-2222-222222222222', '33333333-3333-3333-3333-333333333333'
);

select name, expect, actual, actual like expect || '%' as matched
from tr
order by matched, name;
