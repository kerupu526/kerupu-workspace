import type { Metadata } from "next";
import PageFrame from "@/components/PageFrame";
import PostCard from "@/components/PostCard";
import SearchField from "@/components/SearchField";
import ServiceTabs from "@/components/ServiceTabs";
import WritePanel from "@/components/WritePanel";
import styles from "./page.module.css";

export const metadata: Metadata = { title: "게시판" };

/* 내용은 자리표시(대괄호)다. 실제 글은 기능 확장 단계에서 채운다. */
const POSTS = [1, 2, 3, 4, 5].map((no) => ({
  no,
  title: "[게시글 제목]",
  preview: "[게시글 미리보기]",
  author: "[닉네임]",
  date: "[날짜]",
}));

export default function BoardPage() {
  return (
    <PageFrame className={styles.layout}>
      {/* 화면에는 탭의 "게시판"이 보이므로 페이지 제목은 보조기기용으로만 둔다 */}
      <h1 className="visually-hidden">게시판</h1>
      <ServiceTabs current="board" className={styles.tabs} />

      <div className={styles.list}>
        <SearchField id="board-search" label="게시글 검색" className={styles.search} />
        <ul className={styles.posts} aria-label="게시글 목록">
          {POSTS.map((post) => (
            <PostCard key={post.no} {...post} />
          ))}
        </ul>
      </div>

      <WritePanel id="board-write" title="글쓰기" className={styles.panel} />
    </PageFrame>
  );
}
