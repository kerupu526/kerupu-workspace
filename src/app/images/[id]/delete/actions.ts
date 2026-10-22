"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { IMAGE_BUCKET } from "@/lib/wiki/image-url";

const ID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
const KNOWN_ERRORS = ["too_early", "window_passed", "author_only", "not_found", "login_required"] as const;

/*
 * 이미지 영구 삭제.
 *   1. DB 함수 check_image_deletion 이 로그인한 본인의 권한과 시간 규칙(운영자는 언제든, 올린 사람은 올린 지 30분 ~ 30일 사이)을 검사하고
 *      Storage 안의 경로를 돌려준다. 통과하지 못하면 아무것도 지우지 않는다.
 *   2. 서버가 관리자 키로 Storage 의 파일을 지운다 (사용자에게는 Storage 지우기 권한이 없다).
 *   3. 파일이 지워진 뒤에 기록을 지우고, 이 이미지를 대표 이미지로 쓰던 문서의 대표 이미지를 비운다.
 * 되돌릴 수 없다. 글 본문에 넣어 둔 이미지는 깨진 그림으로 보이게 된다 (삭제 화면에서 미리 알려 준다).
 */
export async function deleteImage(formData: FormData): Promise<void> {
  const id = String(formData.get("id") ?? "");
  if (!ID.test(id)) redirect("/images");

  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) redirect("/login");

  const { data: path, error } = await supabase.rpc("check_image_deletion", { p_id: id });
  if (error || typeof path !== "string") {
    const known = KNOWN_ERRORS.find((code) => error?.message.includes(code));
    if (!known) console.error("[delete-image] 삭제 허가를 받지 못했습니다:", error?.message);
    redirect(`/images/${id}/delete?error=${known ?? "failed"}`);
  }

  let admin: ReturnType<typeof createAdminClient>;
  try {
    admin = createAdminClient();
  } catch (e) {
    console.error("[delete-image] 관리자 클라이언트를 만들지 못했습니다:", e instanceof Error ? e.message : e);
    redirect(`/images/${id}/delete?error=failed`);
  }

  const { error: removeError } = await admin.storage.from(IMAGE_BUCKET).remove([path]);
  if (removeError) {
    console.error("[delete-image] Storage 에서 파일을 지우지 못했습니다:", removeError.message);
    redirect(`/images/${id}/delete?error=failed`);
  }

  // 파일은 이미 없다. 기록 정리가 실패해도 다시 시도하면 된다 (없는 파일을 지우는 것은 오류가 아니다).
  const { error: rowError } = await admin.from("images").delete().eq("id", id);
  if (rowError) {
    console.error("[delete-image] 이미지 기록을 지우지 못했습니다:", rowError.message);
    redirect(`/images/${id}/delete?error=failed`);
  }
  const { error: cardError } = await admin.from("documents").update({ image: null }).ilike("image", `%${id}%`);
  if (cardError) console.error("[delete-image] 대표 이미지를 비우지 못했습니다:", cardError.message);

  revalidatePath("/images");
  revalidatePath("/dictionary");
  redirect("/images?deleted=1");
}
