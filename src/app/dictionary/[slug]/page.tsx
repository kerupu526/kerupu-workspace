import type { Metadata } from "next";
import PageFrame from "@/components/PageFrame";
import WikiDocument from "@/components/WikiDocument";
import { parseWiki } from "@/lib/wiki/parse";
import { SAMPLE_DOCUMENT } from "@/lib/wiki/sample";
import styles from "./page.module.css";

export const metadata: Metadata = { title: "캐릭터 문서" };

/*
 * 캐릭터 문서 화면. 문서가 화면의 중심이 되도록 서비스 탭(게시판·플레이리스트·캐릭터 사전)은 두지 않고,
 * 어디에 속하는 문서인지만 현재 위치로 보여 준다. 사전으로 돌아가는 길은 현재 위치의 첫 칸이다.
 * (헤더의 "서비스" 메뉴는 그대로 켜져 있다.)
 *
 * 문서 원문(마크다운)을 파서로 읽어 화면 부품에 넘긴다. 원문을 저장하는 곳은 콘텐츠 단계에서 만들고,
 * 그 전까지는 견본 원문(SAMPLE_DOCUMENT)을 모든 주소에서 같게 보여 준다.
 * 파서의 warnings(버린 CSS 선언 등)는 편집 화면이 생기면 거기서 보여 준다. 읽기 화면에서는 쓰지 않는다.
 */
export default async function DictionaryEntryPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const { sections, lead, footnotes, meta } = parseWiki(SAMPLE_DOCUMENT);

  const title = meta.infobox.title ?? "[캐릭터 이름]";
  const work = meta.infobox.rows.find((row) => row.label === "작품")?.value ?? "[작품]";

  return (
    <PageFrame className={styles.layout}>
      <WikiDocument
        breadcrumb={[{ label: "캐릭터 사전", href: "/dictionary" }, { label: work }, { label: title }]}
        href={`/dictionary/${encodeURIComponent(slug)}`}
        title={title}
        modified="[날짜]"
        categories={meta.categories}
        infobox={{
          title,
          imageLabel: "캐릭터 이미지",
          image: meta.infobox.image,
          rows: meta.infobox.rows,
        }}
        lead={lead}
        sections={sections}
        footnotes={footnotes}
      />
    </PageFrame>
  );
}
