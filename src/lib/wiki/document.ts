import type { WikiDocumentProps } from "@/components/WikiDocument";
import type { ParsedWiki } from "./parse";

/*
 * 파서 결과를 WikiDocument 의 props 로 바꾼다. 문서 화면과 편집 화면의 미리보기가 같은 모양이 되도록 함께 쓴다.
 * 메타 블록에 제목이 없으면 자리표시를 쓴다. 최근 수정 시각은 문서 저장소가 생기면 거기서 가져온다.
 */
export function buildDocumentProps(parsed: ParsedWiki, slug: string): WikiDocumentProps {
  const { sections, lead, footnotes, meta } = parsed;
  const title = meta.infobox.title ?? "[캐릭터 이름]";
  const work = meta.infobox.rows.find((row) => row.label === "작품")?.value;

  return {
    // 작품은 선택 항목이라 없으면 그 칸을 빼고 "캐릭터 사전 > 이름" 으로 보여 준다
    breadcrumb: [{ label: "캐릭터 사전", href: "/dictionary" }, ...(work ? [{ label: work }] : []), { label: title }],
    href: `/dictionary/${encodeURIComponent(slug)}`,
    title,
    modified: "[날짜]",
    categories: meta.categories,
    infobox: {
      title,
      imageLabel: "캐릭터 이미지",
      image: meta.infobox.image,
      rows: meta.infobox.rows,
    },
    lead,
    sections,
    footnotes,
  };
}
