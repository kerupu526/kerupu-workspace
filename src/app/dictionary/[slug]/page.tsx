import type { Metadata } from "next";
import { notFound } from "next/navigation";
import PageFrame from "@/components/PageFrame";
import WikiDocument from "@/components/WikiDocument";
import { buildDocumentProps } from "@/lib/wiki/document";
import { parseWiki } from "@/lib/wiki/parse";
import { deletePermission } from "@/lib/deletion";
import { getDocumentInfo, getDocumentSource } from "@/lib/wiki/store";
import { getViewer } from "@/lib/wiki/viewer";
import styles from "./page.module.css";

export const metadata: Metadata = { title: "캐릭터 문서" };

/*
 * 캐릭터 문서 화면. 문서가 화면의 중심이 되도록 서비스 탭(게시판·플레이리스트·캐릭터 사전)은 두지 않고,
 * 어디에 속하는 문서인지만 현재 위치로 보여 준다. 사전으로 돌아가는 길은 현재 위치의 첫 칸이다.
 *
 * 저장된 문서의 현재 판을 보여 준다. 저장된 문서가 없으면 404 이다
 * (새 문서는 사전의 "새 캐릭터 추가"로 만들고, 주소로 직접 편집 화면을 열어 저장해도 만들어진다).
 */
export default async function DictionaryEntryPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const stored = await getDocumentSource(slug);
  if (!stored) notFound();

  // 삭제 메뉴는 이 문서를 만든 사람과 운영자에게만 보인다 (실제 권한과 시간 규칙은 삭제 화면과 DB 가 검사한다)
  const [viewer, info] = await Promise.all([getViewer(), getDocumentInfo(slug)]);
  const canSeeDelete =
    viewer !== null &&
    info !== null &&
    deletePermission({ isOperator: viewer.isOperator, isAuthor: info.createdBy === viewer.id, createdAt: info.createdAt })
      .kind !== "none";

  const props = buildDocumentProps(parseWiki(stored.markdown), slug);
  const modified = new Date(stored.modified).toLocaleString("ko-KR", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <PageFrame className={styles.layout}>
      <WikiDocument
        {...props}
        modified={modified}
        editHref={`${props.href}/edit`}
        deleteHref={canSeeDelete ? `${props.href}/delete` : undefined}
      />
    </PageFrame>
  );
}
