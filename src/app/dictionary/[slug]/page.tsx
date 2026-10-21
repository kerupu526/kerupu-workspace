import type { Metadata } from "next";
import PageFrame from "@/components/PageFrame";
import ServiceTabs from "@/components/ServiceTabs";
import WikiDocument, { type WikiSection } from "@/components/WikiDocument";
import styles from "./page.module.css";

export const metadata: Metadata = { title: "캐릭터 문서" };

/* 내용은 모두 자리표시(대괄호)다. 실제 문서는 콘텐츠 단계에서 채운다. */
const SECTIONS: WikiSection[] = [
  {
    title: "개요",
    paragraphs: [["[개요 본문]", { footnote: 1 }, " [이어지는 문장]"]],
  },
  {
    title: "설정",
    paragraphs: [["[설정 본문]"]],
    children: [
      { title: "외모", paragraphs: [["[외모 설명]", { footnote: 2 }]] },
      { title: "성격", paragraphs: [["[성격 설명]"]] },
    ],
  },
  {
    title: "관계",
    paragraphs: [["[관계 설명]"]],
  },
];

export default async function DictionaryEntryPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  return (
    <PageFrame className={styles.layout}>
      <ServiceTabs current="dictionary" />
      <WikiDocument
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
        footnotes={["[각주 내용]", "[각주 내용]"]}
      />
    </PageFrame>
  );
}
