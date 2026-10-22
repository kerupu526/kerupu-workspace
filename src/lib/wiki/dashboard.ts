import "server-only";
import { createClient } from "@/lib/supabase/server";

/* 내 계정 화면(대시보드)에 보여 줄 내 활동. 읽기는 모두 로그인한 본인의 세션으로 한다 (RLS). */

/* 한 번에 보여 줄 개수 */
export const DASHBOARD_CHARACTER_LIMIT = 12;
export const DASHBOARD_RECENT_LIMIT = 8;

export interface MyCharacter {
  slug: string;
  name: string;
  work: string | null;
  /** 마지막으로 바뀐 시각 (ISO 문자열) */
  updated: string;
}

export interface MyEdit {
  slug: string;
  title: string;
  /** 판을 저장한 시각 (ISO 문자열) */
  saved: string;
}

export interface AccountDashboard {
  /** 내가 만든 캐릭터 (최근에 바뀐 순) */
  characters: MyCharacter[];
  characterCount: number;
  /** 내가 저장한 판의 수 (새 캐릭터의 첫 판 포함) */
  revisionCount: number;
  /** 내가 최근에 저장한 판 */
  recentEdits: MyEdit[];
  /** 운영자인지. operators 표는 읽을 수 없어서 DB 함수(is_operator)로 묻는다. */
  isOperator: boolean;
}

/* 판 조회에서 문서의 주소와 제목을 함께 가져온 한 줄 (documents 로 이어지는 외래키 조인) */
interface RevisionRow {
  created_at: string;
  documents: { slug: string; title: string } | { slug: string; title: string }[] | null;
}

export async function getAccountDashboard(userId: string): Promise<AccountDashboard> {
  const supabase = await createClient();

  const [characters, revisionCount, recent, operator] = await Promise.all([
    supabase
      .from("documents")
      .select("slug, title, work, updated_at", { count: "exact" })
      .eq("created_by", userId)
      .not("current_revision_id", "is", null)
      .order("updated_at", { ascending: false })
      .limit(DASHBOARD_CHARACTER_LIMIT),
    supabase.from("document_revisions").select("id", { count: "exact", head: true }).eq("author_id", userId),
    supabase
      .from("document_revisions")
      .select("created_at, documents(slug, title)")
      .eq("author_id", userId)
      .order("created_at", { ascending: false })
      .limit(DASHBOARD_RECENT_LIMIT),
    supabase.rpc("is_operator"),
  ]);

  const recentEdits: MyEdit[] = [];
  for (const row of (recent.data ?? []) as RevisionRow[]) {
    const doc = Array.isArray(row.documents) ? row.documents[0] : row.documents;
    if (doc) recentEdits.push({ slug: doc.slug, title: doc.title, saved: row.created_at });
  }

  return {
    characters: (characters.data ?? []).map((row) => ({
      slug: row.slug,
      name: row.title,
      work: row.work,
      updated: row.updated_at,
    })),
    characterCount: characters.count ?? 0,
    revisionCount: revisionCount.count ?? 0,
    recentEdits,
    isOperator: operator.data === true,
  };
}

/* 시각을 한국 시간으로 "2026년 10월 22일 14:05" 처럼 보여 준다 */
export function formatKst(iso: string): string {
  return new Date(iso).toLocaleString("ko-KR", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}
