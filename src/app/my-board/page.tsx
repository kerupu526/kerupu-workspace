import type { Metadata } from "next";
import Chip from "@/components/Chip";
import NoticeCard from "@/components/NoticeCard";
import PageFrame from "@/components/PageFrame";
import WriteDialog from "@/components/WriteDialog";
import styles from "./page.module.css";

export const metadata: Metadata = { title: "개인 게시판" };

/*
 * 내용은 자리표시(대괄호)다. 실제 공지는 기능 확장 단계에서 채운다.
 * 정렬 규칙: 고정한 공지가 먼저, 그다음은 최신순. 채운 이름표가 고정 공지다.
 * (자리표시에는 날짜가 없어서 지금은 순서대로 늘어놓기만 한다.)
 */
const NOTICES = [0, 1, 2, 3].map((i) => ({
  key: i,
  title: "[공지 제목]",
  preview: "[공지 미리보기]",
  date: "[날짜]",
  pinned: i === 0,
}));

export default function MyBoardPage() {
  return (
    <PageFrame className={styles.layout}>
      <div className={styles.head}>
        <div className={styles.heading}>
          <h1 className={styles.title}>개인 게시판</h1>
          <Chip variant="dashed">운영자 공지</Chip>
        </div>
        {/* 공지는 운영자만 쓴다. 누구에게 보일지는 로그인 기능이 생길 때 정한다. */}
        <WriteDialog
          id="notice-write"
          title="공지 작성"
          triggerLabel="공지 작성"
          badge={<Chip variant="dashed">운영자 전용</Chip>}
        />
      </div>

      <ul className={styles.notices} aria-label="공지 목록">
        {NOTICES.map(({ key, ...notice }) => (
          <NoticeCard key={key} {...notice} />
        ))}
      </ul>
    </PageFrame>
  );
}
