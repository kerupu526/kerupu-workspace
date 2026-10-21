"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { parseWiki } from "@/lib/wiki/parse";

/* 저장 결과. 성공하면 문서 화면으로 넘어가므로 메시지는 실패할 때만 있다. */
export interface SaveState {
  message?: string;
}

const SLUG = /^[a-z0-9][a-z0-9-]{0,79}$/;
const MAX_LENGTH = 100000;

/*
 * 문서 저장: 새 판을 추가하고, 문서의 현재 판을 그 판으로 바꾼다.
 * 권한은 로그인한 사용자 본인의 세션으로 정해진다 (RLS). 작성자나 운영자가 아니면 DB 가 막는다.
 * 제목은 메타 블록의 "제목"을 쓰고, 없으면 주소를 쓴다.
 */
export async function saveDocument(_prev: SaveState, formData: FormData): Promise<SaveState> {
  const slug = String(formData.get("slug") ?? "");
  const markdown = String(formData.get("markdown") ?? "");

  if (!SLUG.test(slug)) return { message: "주소가 올바르지 않아요." };
  if (markdown.length > MAX_LENGTH) return { message: "문서가 10만 자를 넘어 저장할 수 없어요." };

  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return { message: "저장하려면 로그인해 주세요." };

  // 문법 검사는 저장을 막지 않는다. 경고는 편집 화면에서 이미 보여 준다.
  const titleFromSource = parseWiki(markdown).meta.infobox.title;

  const { data: existing } = await supabase.from("documents").select("id").eq("slug", slug).maybeSingle();

  let documentId = existing?.id;
  if (!documentId) {
    const { data: created, error } = await supabase
      .from("documents")
      .insert({ slug, title: titleFromSource ?? slug })
      .select("id")
      .single();
    if (error || !created) return { message: "문서를 만들지 못했어요. 잠시 뒤 다시 해 주세요." };
    documentId = created.id;
  }

  const { data: revision, error: revisionError } = await supabase
    .from("document_revisions")
    .insert({ document_id: documentId, markdown })
    .select("id")
    .single();
  if (revisionError || !revision) {
    return { message: "이 문서를 고칠 권한이 없어요. 문서를 만든 사람이나 운영자만 고칠 수 있어요." };
  }

  const update: { current_revision_id: string; title?: string } = { current_revision_id: revision.id };
  if (titleFromSource) update.title = titleFromSource;
  const { error: updateError } = await supabase.from("documents").update(update).eq("id", documentId);
  if (updateError) return { message: "저장은 됐지만 최신 판으로 바꾸지 못했어요. 다시 저장해 주세요." };

  revalidatePath(`/dictionary/${slug}`);
  revalidatePath(`/dictionary/${slug}/edit`);
  redirect(`/dictionary/${slug}`);
}
