/*
 * 위키 글에서 쓸 수 있는 이미지 주소의 규칙. 이 파일은 아무것도 가져오지 않는다 (Node 테스트에서 그대로 읽는다).
 *   - 이미지 업로드 화면에서 올린 파일: Supabase Storage 의 images 버킷 공개 주소
 *       <프로젝트 주소>/storage/v1/object/public/images/<사용자 ID>/<파일 ID>.<확장자>
 *     (업로드 화면이 만드는 모양 그대로만 받는다. 다른 버킷이나 다른 주소는 받지 않는다)
 *   - 예전 방식: /uploads/ 로 시작하는 사이트 안의 파일
 */

export const IMAGE_BUCKET = "images";

const UUID = "[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}";
const OBJECT_PATH = new RegExp(`^${UUID}/${UUID}\\.(?:png|jpg|webp|gif|svg)$`);

/* 업로드한 파일의 공개 주소 */
export function storageImageUrl(base: string, objectPath: string): string {
  return `${base.replace(/\/+$/, "")}/storage/v1/object/public/${IMAGE_BUCKET}/${objectPath}`;
}

/* base: NEXT_PUBLIC_SUPABASE_URL. 비어 있으면(설정이 없으면) 업로드 주소는 받지 않는다. */
export function isStorageImageUrl(src: string, base: string | undefined): boolean {
  if (!base) return false;
  const prefix = `${base.replace(/\/+$/, "")}/storage/v1/object/public/${IMAGE_BUCKET}/`;
  return src.startsWith(prefix) && OBJECT_PATH.test(src.slice(prefix.length));
}

export function isLegacyUploadPath(src: string): boolean {
  return src.startsWith("/uploads/") && !src.includes("..");
}

/*
 * 글과 화면에서 이미지로 써도 되는 주소인지 (업로드 화면의 Storage 주소 또는 예전 /uploads/).
 * NEXT_PUBLIC_ 값은 빌드할 때 코드에 박히므로 브라우저와 서버가 같은 주소를 쓴다.
 */
export function isAllowedImageSrc(src: string): boolean {
  return isLegacyUploadPath(src) || isStorageImageUrl(src, process.env.NEXT_PUBLIC_SUPABASE_URL);
}

/* documents.image 열의 check 와 같은 모양 (supabase/migrations/20261023100000_documents_image.sql) */
const DB_UPLOADS = /^\/uploads\/[A-Za-z0-9._/-]+$/;
const DB_STORAGE = new RegExp(`^https?://[A-Za-z0-9.-]+(?::[0-9]+)?/storage/v1/object/public/${IMAGE_BUCKET}/${UUID}/${UUID}\\.(?:png|jpg|webp|gif|svg)$`);

/*
 * 문서의 대표 이미지(목록 카드용)로 DB 에 넣을 값. 글에서 허용된 주소이면서 DB 의 모양 검사도 통과하는 것만 돌려주고,
 * 아니면 null 이다 (DB 검사에 걸려 저장 전체가 실패하지 않게 미리 거른다).
 */
export function imageForList(src: string | undefined): string | null {
  if (!src || src.length > 500) return null;
  if (!isAllowedImageSrc(src)) return null;
  const shapeOk = (DB_UPLOADS.test(src) && !src.includes("..")) || DB_STORAGE.test(src);
  return shapeOk ? src : null;
}
