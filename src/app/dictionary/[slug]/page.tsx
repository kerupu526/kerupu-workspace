import type { Metadata } from "next";
import PageFrame from "@/components/PageFrame";
import WikiDocument from "@/components/WikiDocument";
import { buildDocumentProps } from "@/lib/wiki/document";
import { parseWiki } from "@/lib/wiki/parse";
import { getDocumentSource } from "@/lib/wiki/store";
import { SAMPLE_DOCUMENT } from "@/lib/wiki/sample";
import styles from "./page.module.css";

export const metadata: Metadata = { title: "캐릭터 문서" };

/*
 * 캐릭터 문서 화면. 문서가 화면의 중심이 되도록 서비스 탭(게시판·플레이리스트·캐릭터 사전)은 두지 않고,
 * 어디에 속하는 문서인지만 현재 위치로 보여 준다. 사전으로 돌아가는 길은 현재 위치의 첫 칸이다.
 *
 * 저장된 문서가 있으면 그 문서의 현재 판을, 없으면 견본 원문을 보여 준다.
 */
export default async function DictionaryEntryPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const stored = await getDocumentSource(slug);
  const props = buildDocumentProps(parseWiki(stored?.markdown ?? SAMPLE_DOCUMENT), slug);

  const modified = stored
    ? new Date(stored.modified).toLocaleString("ko-KR", {
        timeZone: "Asia/Seoul",
        year: "numeric",
        month: "long",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    : props.modified;

  return (
    <PageFrame className={styles.layout}>
      <WikiDocument {...props} modified={modified} editHref={`${props.href}/edit`} />
    </PageFrame>
  );
}
