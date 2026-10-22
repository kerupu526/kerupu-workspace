-- 영구 삭제: 캐릭터 문서와 이미지.
--
-- 규칙
--   - 운영자: 언제든 바로 영구 삭제한다.
--   - 작성자(문서를 만든 사람, 이미지를 올린 사람): 만든 지 30분이 지나야 하고, 30일이 지나기 전에만 삭제할 수 있다.
--       * 30분 전: 막힌다 (너무 일찍 지울 수 없다. 'too_early')
--       * 30분 ~ 30일: 바로 영구 삭제된다
--       * 30일 후: 작성자는 못 지운다 (운영자만. 'window_passed')
--   - 삭제는 되돌릴 수 없다: 문서는 모든 판(기록)까지, 이미지는 Storage 파일까지 지운다.
--
-- 사용자가 만든 시각을 직접 바꿔 규칙을 피하지 못하게, documents 는 열 단위 권한만 남기고
-- 삭제는 아래 함수로만 한다 (함수가 권한과 시간 규칙을 검사한다).

-- ---------- 문서 ----------
-- 사용자가 직접 넣고 고칠 수 있는 열만 권한을 남긴다. created_at 을 미래로 넣어 시간 규칙을 피하는 것을 막는다.
revoke insert, update on public.documents from anon, authenticated;
grant insert (slug, title, work, summary, image, created_by) on public.documents to authenticated;
grant update (title, current_revision_id, work, summary, image) on public.documents to authenticated;

-- 문서 하나를 지운다 (판 -> 문서 순서). 다른 함수 안에서만 쓴다.
create or replace function public.purge_document(p_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.documents set current_revision_id = null where id = p_id;
  delete from public.document_revisions where document_id = p_id;
  delete from public.documents where id = p_id;
end;
$$;
revoke all on function public.purge_document(uuid) from public, anon, authenticated;

-- 문서 삭제: 운영자는 바로, 작성자는 만든 지 30분 ~ 30일 사이에만.
create or replace function public.delete_document(p_slug text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
  d public.documents%rowtype;
begin
  if v_uid is null then raise exception 'login_required'; end if;
  select * into d from public.documents where slug = p_slug for update;
  if not found then raise exception 'not_found'; end if;
  if not public.is_operator() then
    if d.created_by is distinct from v_uid then raise exception 'author_only'; end if;
    if d.created_at > now() - interval '30 minutes' then raise exception 'too_early'; end if;
    if d.created_at < now() - interval '30 days' then raise exception 'window_passed'; end if;
  end if;
  perform public.purge_document(d.id);
end;
$$;

revoke all on function public.delete_document(text) from public, anon;
grant execute on function public.delete_document(text) to authenticated;

-- ---------- 이미지 ----------
-- Storage 의 images 버킷에 올린 파일마다 한 줄. 올릴 때 서버가 넣는다 (사용자는 넣거나 고칠 수 없다).
create table public.images (
  -- 파일 ID (경로 <사용자 ID>/<파일 ID>.<확장자> 의 가운데 조각)
  id uuid primary key,
  owner_id uuid not null references auth.users (id) on delete restrict,
  -- Storage 안의 경로
  path text not null unique check (
    path ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(png|jpg|webp|gif|svg)$'
  ),
  mime text,
  bytes bigint,
  original_name text check (original_name is null or char_length(original_name) <= 300),
  created_at timestamptz not null default now()
);

create index images_owner_idx on public.images (owner_id, created_at desc);

alter table public.images enable row level security;

-- 읽기: 올린 사람과 운영자. 방문자는 못 본다 (이미지 파일 자체는 /media 로 누구나 본다).
create policy "images: 올린 사람과 운영자가 읽기"
  on public.images for select
  to authenticated
  using (owner_id = (select auth.uid()) or (select public.is_operator()));

-- 넣기, 고치기, 지우기 정책은 만들지 않는다. 권한도 거둔다 (기록은 서버의 관리자 키로만 넣고 지운다).
revoke all on public.images from anon, authenticated;
grant select on public.images to authenticated;

-- 이미지 삭제 허가: 지워도 되는 사람이면 Storage 안의 경로를 돌려준다 (운영자는 바로, 올린 사람은 30분 ~ 30일 사이).
-- 파일과 기록을 실제로 지우는 것은 서버(관리자 키)다. 사용자는 이 함수를 통과해야만 서버가 지운다.
create or replace function public.check_image_deletion(p_id uuid)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
  i public.images%rowtype;
begin
  if v_uid is null then raise exception 'login_required'; end if;
  select * into i from public.images where id = p_id;
  if not found then raise exception 'not_found'; end if;
  if not public.is_operator() then
    if i.owner_id <> v_uid then raise exception 'author_only'; end if;
    if i.created_at > now() - interval '30 minutes' then raise exception 'too_early'; end if;
    if i.created_at < now() - interval '30 days' then raise exception 'window_passed'; end if;
  end if;
  return i.path;
end;
$$;

revoke all on function public.check_image_deletion(uuid) from public, anon;
grant execute on function public.check_image_deletion(uuid) to authenticated;

-- 이미 올라가 있는 파일을 표에 채운다 (이 마이그레이션 전에 올린 것)
insert into public.images (id, owner_id, path, mime, bytes, created_at)
select
  (regexp_match(o.name, '^([0-9a-f-]{36})/([0-9a-f-]{36})\.(png|jpg|webp|gif|svg)$'))[2]::uuid,
  (regexp_match(o.name, '^([0-9a-f-]{36})/([0-9a-f-]{36})\.(png|jpg|webp|gif|svg)$'))[1]::uuid,
  o.name,
  o.metadata ->> 'mimetype',
  (o.metadata ->> 'size')::bigint,
  coalesce(o.created_at, now())
from storage.objects o
where o.bucket_id = 'images'
  and o.name ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(png|jpg|webp|gif|svg)$'
  and exists (
    select 1 from auth.users u
    where u.id = (regexp_match(o.name, '^([0-9a-f-]{36})/'))[1]::uuid
  )
on conflict do nothing;
