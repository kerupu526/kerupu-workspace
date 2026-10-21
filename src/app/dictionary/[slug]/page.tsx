import type { Metadata } from "next";
import PageFrame from "@/components/PageFrame";
import WikiDocument, { type WikiSection } from "@/components/WikiDocument";
import styles from "./page.module.css";

export const metadata: Metadata = { title: "캐릭터 문서" };

/* 내용은 모두 자리표시(대괄호)다. 실제 문서는 콘텐츠 단계에서 채운다. */
const SECTIONS: WikiSection[] = [
  {
    title: "개요",
    blocks: [{ type: "p", children: ["[개요 본문]", { footnote: 1 }, " [이어지는 문장]"] }],
  },
  {
    title: "설정",
    blocks: [
      { type: "p", children: ["[설정 본문]"] },
      {
        type: "list",
        ordered: false,
        items: [
          { content: ["[항목 1]"] },
          { content: ["[항목 2]"], nested: [{ type: "list", ordered: true, items: [{ content: ["[하위 1]"] }] }] },
        ],
      },
      { type: "quote", children: [{ type: "p", children: ["[인용 내용]"] }] },
      { type: "hr" },
    ],
    children: [
      { title: "외모", blocks: [{ type: "p", children: ["[외모 설명]", { footnote: 2 }] }] },
      { title: "성격", blocks: [{ type: "p", children: ["[성격 설명]"] }] },
    ],
  },
  {
    title: "관계",
    blocks: [{ type: "p", children: ["[관계 설명]"] }],
  },
];

/*
 * 캐릭터 문서 화면. 문서가 화면의 중심이 되도록 서비스 탭(게시판·플레이리스트·캐릭터 사전)은 두지 않고,
 * 어디에 속하는 문서인지만 현재 위치로 보여 준다. 사전으로 돌아가는 길은 현재 위치의 첫 칸이다.
 * (헤더의 "서비스" 메뉴는 그대로 켜져 있다.)
 */
export default async function DictionaryEntryPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  return (
    <PageFrame className={styles.layout}>
      <WikiDocument
        breadcrumb={[
          { label: "캐릭터 사전", href: "/dictionary" },
          { label: "[작품]" },
          { label: "[캐릭터 이름]" },
        ]}
        href={`/dictionary/${encodeURIComponent(slug)}`}
        title="[캐릭터 이름]"
        modified="[날짜]"
        categories={["[작품]", "[분류]"]}
        infobox={{
          title: "[캐릭터 이름]",
          imageLabel: "캐릭터 이미지",
          rows: [
            { label: "작품", value: "[작품명]" },
            { label: "분류", value: "[분류]" },
            { label: "첫 등장", value: "[첫 등장]" },
            { label: "출처", value: "[출처]" },
          ],
        }}
        sections={SECTIONS}
        footnotes={["[각주 내용: 문서에 쓰인 근거나 보충 설명이 들어갑니다]", "[각주 내용]"]}
      />
    </PageFrame>
  );
}
