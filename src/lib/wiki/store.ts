import "server-only";
import { createClient } from "@/lib/supabase/server";

/* DB 에 저장된 문서의 현재 판. 없으면 null 이다. */
export interface StoredDocument {
  title: string;
  markdown: string;
  /** 현재 판을 저장한 시각 (ISO 문자열) */
  modified: string;
}

/* 주소(slug)로 문서의 현재 판을 읽는다. 읽기는 누구나 할 수 있다 (RLS). */
export async function getDocumentSource(slug: string): Promise<StoredDocument | null> {
  const supabase = await createClient();

  const { data: doc } = await supabase
    .from("documents")
    .select("title, current_revision_id")
    .eq("slug", slug)
    .maybeSingle();
  if (!doc?.current_revision_id) return null;

  const { data: revision } = await supabase
    .from("document_revisions")
    .select("markdown, created_at")
    .eq("id", doc.current_revision_id)
    .maybeSingle();
  if (!revision) return null;

  return { title: doc.title, markdown: revision.markdown, modified: revision.created_at };
}
