import type { Metadata } from "next";
import PageFrame from "@/components/PageFrame";
import UnderConstruction from "@/components/UnderConstruction";

export const metadata: Metadata = { title: "자유게시판" };

export default function BoardPage() {
  return (
    <PageFrame>
      <UnderConstruction title="자유게시판" />
    </PageFrame>
  );
}
