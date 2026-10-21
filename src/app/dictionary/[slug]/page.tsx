import type { Metadata } from "next";
import PageFrame from "@/components/PageFrame";
import UnderConstruction from "@/components/UnderConstruction";

export const metadata: Metadata = { title: "캐릭터 문서" };

/* 캐릭터 문서 화면은 아직 공사 중이다. 저장과 편집 기능은 /edit 에서 확인한다. */
export default async function DictionaryEntryPage() {
  return (
    <PageFrame>
      <UnderConstruction title="캐릭터 문서" />
    </PageFrame>
  );
}
