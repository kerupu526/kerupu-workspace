import type { Metadata } from "next";
import PageFrame from "@/components/PageFrame";
import WikiEditScreen from "@/components/WikiEditScreen";
import { createClient } from "@/lib/supabase/server";
import { getDocumentSource } from "@/lib/wiki/store";
import { SAMPLE_DOCUMENT } from "@/lib/wiki/sample";

// 편집 화면은 검색에 나오지 않게 한다
export const metadata: Metadata = { title: "문서 편집", robots: { index: false, follow: false } };

/*
 * 캐릭터 문서 편집 화면. 저장된 문서가 있으면 그 현재 판으로, 없으면 견본으로 시작한다.
 * 저장은 로그인한 사용자만 할 수 있다.
 */
export default async function DictionaryEditPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const stored = await getDocumentSource(slug);
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();

  return (
    <PageFrame>
      <WikiEditScreen
        slug={slug}
        initialSource={stored?.markdown ?? SAMPLE_DOCUMENT}
        signedIn={Boolean(data.user)}
      />
    </PageFrame>
  );
}
