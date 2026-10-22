"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

const SLUG = /^[a-z0-9][a-z0-9-]{0,79}$/;
const KNOWN_ERRORS = ["too_early", "window_passed", "author_only", "not_found", "login_required"] as const;

/*
 * 문서 영구 삭제. 권한과 시간 규칙(운영자는 언제든, 작성자는 만든 지 30분 ~ 30일 사이)은 DB 함수 delete_document 가 검사한다.
 * 문서와 모든 판이 지워지고 되돌릴 수 없다. 확인 입력(문서 주소)을 맞게 적어야만 지운다.
 * 실패하면 삭제 화면으로 돌아가 이유를 보여 준다 (?error=<이름>).
 */
export async function deleteDocument(formData: FormData): Promise<void> {
  const slug = String(formData.get("slug") ?? "");
  const confirm = String(formData.get("confirm") ?? "").trim();
  if (!SLUG.test(slug)) redirect("/dictionary");
  if (confirm !== slug) redirect(`/dictionary/${slug}/delete?error=confirm`);

  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) redirect("/login");

  const { error } = await supabase.rpc("delete_document", { p_slug: slug });
  if (error) {
    const known = KNOWN_ERRORS.find((code) => error.message.includes(code));
    if (!known) console.error("[delete-document] 삭제하지 못했습니다:", error.message);
    redirect(`/dictionary/${slug}/delete?error=${known ?? "failed"}`);
  }

  revalidatePath("/dictionary");
  revalidatePath(`/dictionary/${slug}`);
  redirect("/dictionary?deleted=document");
}
