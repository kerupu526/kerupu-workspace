import type { Metadata } from "next";
import Chip from "@/components/Chip";
import NoticeCard from "@/components/NoticeCard";
import PageFrame from "@/components/PageFrame";
import WritePanel from "@/components/WritePanel";
import styles from "./page.module.css";

export const metadata: Metadata = { title: "개인 게시판" };

/* 내용은 자리표시(대괄호)다. 실제 공지는 기능 확장 단계에서 채운다. */
const NOTICES = [0, 1, 2, 3].map((i) => ({
  key: i,
  title: "[공지 제목]",
  preview: "[공지 미리보기]",
  date: "[날짜]",
  // 와이어프레임에서 첫 공지만 채운 이름표로 그려져 있다 (이유는 미정: 고정/최신?)
  emphasized: i === 0,
}));

export default function MyBoardPage() {
  return (
    <PageFrame className={styles.layout}>
      <div className={styles.list}>
        <div className={styles.head}>
          <h1 className={styles.heading}>개인 게시판</h1>
          <Chip variant="dashed">운영자 공지</Chip>
        </div>
        <ul className={styles.notices} aria-label="공지 목록">
          {NOTICES.map(({ key, ...notice }) => (
            <NoticeCard key={key} {...notice} />
          ))}
        </ul>
      </div>

      <WritePanel
        id="notice-write"
        title="공지 작성"
        badge={<Chip variant="dashed">운영자 전용</Chip>}
        className={styles.panel}
      />
    </PageFrame>
  );
}
