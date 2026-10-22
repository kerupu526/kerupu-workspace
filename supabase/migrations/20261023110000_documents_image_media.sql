-- 문서 대표 이미지(documents.image)에 우리 사이트 안 경로 /media/<UUID>/<UUID>.<확장자> 를 허용한다.
-- 이미지 업로드가 이제 이 경로를 돌려준다 (src/app/media 가 Storage 의 images 버킷에서 받아서 내려 준다).
-- 앞선 마이그레이션(20261023100000)의 두 가지(Storage 공개 주소, /uploads/)는 그대로 허용한다.

alter table public.documents drop constraint documents_image_check;

alter table public.documents
  add constraint documents_image_check check (
    image is null
    or (
      char_length(image) <= 500
      and (
        image ~ '^/media/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(png|jpg|webp|gif|svg)$'
        or (image ~ '^/uploads/[A-Za-z0-9._/-]+$' and image !~ '\.\.')
        or image ~ '^https?://[A-Za-z0-9.-]+(:[0-9]+)?/storage/v1/object/public/images/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(png|jpg|webp|gif|svg)$'
      )
    )
  );
