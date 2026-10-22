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

/* 캐릭터 사전 목록의 한 줄. 작품과 한 줄 설명은 비어 있을 수 있다 (목록 열이 생기기 전에 저장한 문서). */
export interface CharacterListItem {
  slug: string;
  name: string;
  work: string | null;
  summary: string | null;
  /** 대표 이미지 주소 (문서 맨 위 메타 블록의 이미지). 없으면 null */
  image: string | null;
}

export type CharacterSort = "name" | "recent";

/* 한 번에 보여 줄 캐릭터 수의 상한 */
export const CHARACTER_LIST_LIMIT = 100;

/* ilike 패턴에서 특별한 글자(% _ \)를 글자 그대로 찾도록 막는다 */
function escapeLike(text: string): string {
  return text.replace(/[\\%_]/g, (c) => `\\${c}`);
}

/*
 * 캐릭터 목록. 현재 판이 있는 문서만 나온다. 읽기는 누구나 할 수 있다 (RLS).
 * query: 이름에 들어 있는 글자 (대소문자 무시), work: 작품 이름이 정확히 같은 것만.
 */
export async function listCharacters(options: {
  query?: string;
  work?: string;
  sort: CharacterSort;
}): Promise<{ items: CharacterListItem[]; truncated: boolean }> {
  const supabase = await createClient();

  let request = supabase
    .from("documents")
    .select("slug, title, work, summary, image")
    .not("current_revision_id", "is", null);
  if (options.query) request = request.ilike("title", `%${escapeLike(options.query)}%`);
  if (options.work) request = request.eq("work", options.work);
  request =
    options.sort === "recent"
      ? request.order("created_at", { ascending: false })
      : request.order("title", { ascending: true });

  // 상한보다 하나 더 받아 와서 잘렸는지 안다
  const { data, error } = await request.limit(CHARACTER_LIST_LIMIT + 1);
  if (error || !data) return { items: [], truncated: false };

  const items = data
    .slice(0, CHARACTER_LIST_LIMIT)
    .map((row) => ({ slug: row.slug, name: row.title, work: row.work, summary: row.summary, image: row.image }));
  return { items, truncated: data.length > CHARACTER_LIST_LIMIT };
}

/* 작품 필터에 보여 줄 작품 이름들 (가나다순, 중복 없음) */
export async function listWorks(): Promise<string[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("documents")
    .select("work")
    .not("current_revision_id", "is", null)
    .not("work", "is", null)
    .limit(1000);
  const works = new Set<string>();
  for (const row of data ?? []) if (row.work) works.add(row.work);
  return [...works].sort((a, b) => a.localeCompare(b, "ko"));
}
