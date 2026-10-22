import type { Metadata } from "next";
import PageFrame from "@/components/PageFrame";
import UnderConstruction from "@/components/UnderConstruction";

export const metadata: Metadata = { title: "개인 게시판" };

export default function MyBoardPage() {
  return (
    <PageFrame>
      <UnderConstruction title="개인 게시판" />
    </PageFrame>
  );
}
