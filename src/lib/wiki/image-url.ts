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
