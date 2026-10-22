-- 문서 대표 이미지 열 테스트 (마이그레이션 20261023100000_documents_image.sql 과 20261023110000_documents_image_media.sql 대상).
-- create_character.sql 과 같은 방식: 가짜 사용자로 확인하고 끝에 테스트 데이터를 지운다.
-- 실행: npx supabase db query --linked -f supabase/tests/documents_image.sql
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
  ('11111111-1111-1111-1111-111111111111', 'authenticated', 'authenticated', 'img-a@example.invalid', now(), now()),
  ('22222222-2222-2222-2222-222222222222', 'authenticated', 'authenticated', 'img-b@example.invalid', now(), now());

select pg_temp.run('A가 문서 만들기', 'ok, 행 1', 'authenticated', '11111111-1111-1111-1111-111111111111',
  $q$select public.create_character('img-test-a', '이미지 테스트', null, null, '## 개요')$q$);

-- ---------- 허용되는 값 ----------
select pg_temp.run('Storage 공개 주소', 'ok, 행 1', 'authenticated', '11111111-1111-1111-1111-111111111111',
  $q$update public.documents set image = 'https://abc.supabase.co/storage/v1/object/public/images/11111111-1111-1111-1111-111111111111/22222222-2222-2222-2222-222222222222.png' where slug = 'img-test-a'$q$);

select pg_temp.run('사이트 안 /media/ 경로', 'ok, 행 1', 'authenticated', '11111111-1111-1111-1111-111111111111',
  $q$update public.documents set image = '/media/11111111-1111-1111-1111-111111111111/22222222-2222-2222-2222-222222222222.webp' where slug = 'img-test-a'$q$);

select pg_temp.run('예전 /uploads/ 주소', 'ok, 행 1', 'authenticated', '11111111-1111-1111-1111-111111111111',
  $q$update public.documents set image = '/uploads/characters/a-1.png' where slug = 'img-test-a'$q$);

select pg_temp.run('비우기(null)', 'ok, 행 1', 'authenticated', '11111111-1111-1111-1111-111111111111',
  $q$update public.documents set image = null where slug = 'img-test-a'$q$);

-- ---------- 거부되는 값 (check 위반 23514) ----------
select pg_temp.run('외부 사이트 아무 주소', 'error 23514', 'authenticated', '11111111-1111-1111-1111-111111111111',
  $q$update public.documents set image = 'https://example.com/a.png' where slug = 'img-test-a'$q$);

select pg_temp.run('다른 버킷 주소', 'error 23514', 'authenticated', '11111111-1111-1111-1111-111111111111',
  $q$update public.documents set image = 'https://abc.supabase.co/storage/v1/object/public/other/11111111-1111-1111-1111-111111111111/22222222-2222-2222-2222-222222222222.png' where slug = 'img-test-a'$q$);

select pg_temp.run('허용 안 되는 확장자', 'error 23514', 'authenticated', '11111111-1111-1111-1111-111111111111',
  $q$update public.documents set image = 'https://abc.supabase.co/storage/v1/object/public/images/11111111-1111-1111-1111-111111111111/22222222-2222-2222-2222-222222222222.exe' where slug = 'img-test-a'$q$);

select pg_temp.run('쿼리가 붙은 주소', 'error 23514', 'authenticated', '11111111-1111-1111-1111-111111111111',
  $q$update public.documents set image = 'https://abc.supabase.co/storage/v1/object/public/images/11111111-1111-1111-1111-111111111111/22222222-2222-2222-2222-222222222222.png?x=1' where slug = 'img-test-a'$q$);

select pg_temp.run('/media/ 경로에 UUID 가 아닌 조각', 'error 23514', 'authenticated', '11111111-1111-1111-1111-111111111111',
  $q$update public.documents set image = '/media/someone/photo.png' where slug = 'img-test-a'$q$);

select pg_temp.run('/media/ 경로에 쿼리', 'error 23514', 'authenticated', '11111111-1111-1111-1111-111111111111',
  $q$update public.documents set image = '/media/11111111-1111-1111-1111-111111111111/22222222-2222-2222-2222-222222222222.png?x=1' where slug = 'img-test-a'$q$);

select pg_temp.run('/uploads/ 안의 .. 경로', 'error 23514', 'authenticated', '11111111-1111-1111-1111-111111111111',
  $q$update public.documents set image = '/uploads/../secret.png' where slug = 'img-test-a'$q$);

select pg_temp.run('javascript: 주소', 'error 23514', 'authenticated', '11111111-1111-1111-1111-111111111111',
  $q$update public.documents set image = 'javascript:alert(1)' where slug = 'img-test-a'$q$);

select pg_temp.run('500자를 넘는 주소', 'error 23514', 'authenticated', '11111111-1111-1111-1111-111111111111',
  $q$update public.documents set image = '/uploads/' || repeat('a', 500) where slug = 'img-test-a'$q$);

-- ---------- 권한은 기존 정책 그대로 ----------
select pg_temp.run('B가 A 문서의 이미지 바꾸기', 'ok, 행 0', 'authenticated', '22222222-2222-2222-2222-222222222222',
  $q$update public.documents set image = '/uploads/b.png' where slug = 'img-test-a'$q$);

select pg_temp.run('누구나 대표 이미지 읽기', 'ok, 행 1', 'anon', null,
  $q$select image from public.documents where slug = 'img-test-a'$q$);

-- ---------- 정리 ----------
update public.documents set current_revision_id = null where slug like 'img-test-%';
delete from public.document_revisions where document_id in (select id from public.documents where slug like 'img-test-%');
delete from public.documents where slug like 'img-test-%';
delete from auth.users where id in ('11111111-1111-1111-1111-111111111111', '22222222-2222-2222-2222-222222222222');

select name, expect, actual,
  (actual like 'error%' and expect like 'error %' and split_part(actual, ':', 1) = split_part(expect, ':', 1))
  or (actual = expect) as matched
from tr
order by name;
