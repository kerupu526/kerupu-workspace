import type { Metadata } from "next";
import PageFrame from "@/components/PageFrame";
import WikiEditScreen from "@/components/WikiEditScreen";
import { SAMPLE_DOCUMENT } from "@/lib/wiki/sample";

// 편집 화면은 검색에 나오지 않게 한다 (저장 기능이 생기기 전의 테스트용 화면이기도 하다)
export const metadata: Metadata = { title: "문서 편집", robots: { index: false, follow: false } };

/*
 * 캐릭터 문서 편집 화면. 문서를 저장하는 곳이 아직 없어서 견본 원문으로 시작하고 저장은 되지 않는다.
 * 문서 저장소가 생기면 slug 로 원문을 읽어 initialSource 로 넘긴다.
 */
export default async function DictionaryEditPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  return (
    <PageFrame>
      <WikiEditScreen slug={slug} initialSource={SAMPLE_DOCUMENT} />
    </PageFrame>
  );
}
