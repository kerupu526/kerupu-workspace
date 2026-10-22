-- 문서의 대표 이미지: 캐릭터 사전 목록 카드에 보인다.
-- 값은 문서 맨 위 메타 블록의 "이미지:" 를 저장할 때 서버가 따라 넣는다 (작품, 제목과 같은 방식).
-- 수정 권한은 기존 documents 수정 정책(작성자 또는 운영자)이 그대로 적용된다.
--
-- 작성자가 API 로 직접 아무 주소나 넣지 못하도록 모양을 검사한다:
--   - 이미지 업로드 화면이 만드는 Storage 공개 주소: <프로젝트 주소>/storage/v1/object/public/images/<UUID>/<UUID>.<확장자>
--   - 예전 방식의 /uploads/ 파일 (영문, 숫자, . _ - / 만)
-- (프로젝트 주소가 우리 것인지는 화면에서 그릴 때 한 번 더 확인한다. DB 는 프로젝트 주소를 모른다.)

alter table public.documents
  add column image text check (
    image is null
    or (
      char_length(image) <= 500
      and (
        (image ~ '^/uploads/[A-Za-z0-9._/-]+$' and image !~ '\.\.')
        or image ~ '^https?://[A-Za-z0-9.-]+(:[0-9]+)?/storage/v1/object/public/images/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(png|jpg|webp|gif|svg)$'
      )
    )
  );
