-- 이미지 업로드용 Storage 버킷 (images).
--
-- 권한 원칙
--   - 읽기: 공개 버킷이라 주소를 아는 누구나 본다 (위키 문서에 그림으로 나온다). 목록 조회는 막혀 있다(정책이 없다).
--   - 올리기: 일반 사용자(anon, authenticated)에게는 권한을 주지 않는다. 정책을 만들지 않아서 Storage API 로 직접 올릴 수 없다.
--     올리기는 우리 서버(src/app/images/new/actions.ts)가 로그인 여부와 파일 내용(형식, SVG 안의 스크립트)을 검사한 뒤
--     secret 키로만 한다.
--   - 고치기, 지우기: 정책이 없어서 일반 사용자는 못 한다. 잘못 올린 파일은 Supabase 대시보드(Storage)에서 지운다.
--
-- 한도와 허용 형식은 src/lib/wiki/image-upload.ts 의 MAX_IMAGE_BYTES, ACCEPTED_TYPES 와 같게 맞춘다.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'images',
  'images',
  true,
  8388608, -- 8MB
  array['image/png', 'image/jpeg', 'image/webp', 'image/gif', 'image/svg+xml']
)
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;
