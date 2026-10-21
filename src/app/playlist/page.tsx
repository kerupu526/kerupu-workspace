import type { Metadata } from "next";
import PageFrame from "@/components/PageFrame";
import UnderConstruction from "@/components/UnderConstruction";

export const metadata: Metadata = { title: "플레이리스트" };

export default function PlaylistPage() {
  return (
    <PageFrame>
      <UnderConstruction title="플레이리스트" />
    </PageFrame>
  );
}
