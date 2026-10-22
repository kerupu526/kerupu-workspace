"use server";

import { randomUUID } from "node:crypto";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { checkSvg, detectRasterType, looksLikeSvg, MAX_IMAGE_BYTES, ACCEPTED_LABEL, type ImageKind } from "@/lib/wiki/image-upload";
import { IMAGE_BUCKET, storageImageUrl } from "@/lib/wiki/image-url";

/* 업로드 결과. 성공하면 올린 파일의 공개 주소가 있고, 실패하면 이유만 있다. */
export interface UploadState {
  message?: string;
  url?: string;
  /** 올린 원래 파일 이름 (화면 표시용) */
  fileName?: string;
}

/*
 * 이미지 업로드: 로그인한 사용자가 올린 파일을 검사하고 Storage 의 images 버킷에 넣는다.
 *   - 형식은 파일 이름이나 브라우저가 알려 준 형식이 아니라 내용으로 판단한다 (PNG, JPEG, WebP, GIF, SVG).
 *   - SVG 는 스크립트나 바깥 주소를 가리키는 것이 있으면 거부한다.
 *   - 저장 이름은 <사용자 ID>/<무작위 ID>.<확장자> 라서 원래 파일 이름이 주소에 남지 않고, 같은 이름끼리 덮어쓰지 않는다.
 * 버킷에는 일반 사용자의 올리기 권한이 없어서(마이그레이션 참고) 이 서버 동작만이 올릴 수 있다.
 */
export async function uploadImage(_prev: UploadState, formData: FormData): Promise<UploadState> {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return { message: "이미지를 올리려면 로그인해 주세요." };

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) return { message: "올릴 이미지 파일을 골라 주세요." };
  if (file.size > MAX_IMAGE_BYTES) {
    return { message: `파일이 너무 커요. ${MAX_IMAGE_BYTES / 1024 / 1024}MB 이하만 올릴 수 있어요.` };
  }

  const bytes = new Uint8Array(await file.arrayBuffer());
  let kind: ImageKind | null = detectRasterType(bytes);
  if (!kind) {
    const text = new TextDecoder("utf-8").decode(bytes);
    if (looksLikeSvg(text)) {
      const problem = checkSvg(text);
      if (problem) return { message: problem };
      kind = { ext: "svg", mime: "image/svg+xml" };
    }
  }
  if (!kind) return { message: `이 파일은 올릴 수 없어요. ${ACCEPTED_LABEL} 이미지만 올릴 수 있어요.` };

  const objectPath = `${auth.user.id}/${randomUUID()}.${kind.ext}`;
  const { error } = await createAdminClient()
    .storage.from(IMAGE_BUCKET)
    .upload(objectPath, bytes, { contentType: kind.mime, cacheControl: "31536000", upsert: false });
  if (error) return { message: "이미지를 올리지 못했어요. 잠시 뒤 다시 해 주세요." };

  const base = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!base) return { message: "이미지를 올리지 못했어요. 서버 설정을 확인해 주세요." };
  return { url: storageImageUrl(base, objectPath), fileName: file.name };
}
