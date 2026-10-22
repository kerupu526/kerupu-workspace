import type { Metadata } from "next";
import PageFrame from "@/components/PageFrame";
import type { Post } from "@/components/PostCard";
import PostList from "@/components/PostList";
import SearchField from "@/components/SearchField";
import ServiceTabs from "@/components/ServiceTabs";
import WriteDialog from "@/components/WriteDialog";
import styles from "./page.module.css";

export const metadata: Metadata = { title: "자유게시판" };

/*
 * 임의로 만든 샘플 글 하나 + 자리표시(대괄호) 글 넷. 실제 글은 기능 확장 단계에서 채운다.
 * 로그인하지 않고 쓴 글은 작성자를 "익명"으로 보여주는 방명록 방식을 생각 중이다 (아직 미정).
 */
const POSTS: Post[] = [
  {
    id: 1,
    title: "처음 남겨보는 방명록",
    author: "익명",
    date: "2026-10-21",
    body: [
      "안녕하세요! 지나가다 들렀어요.",
      "",
      "사이트 분위기가 포근해서 한참 구경했습니다. 초록빛 색감이 눈에 편하고, 픽셀 글꼴이 특히 귀엽네요.",
      "",
      "앞으로 플레이리스트와 캐릭터 사전도 기대할게요. 좋은 하루 보내세요!",
    ].join("\n"),
  },
  ...[2, 3, 4, 5].map((id) => ({
    id,
    title: "[게시글 제목]",
    author: "[닉네임]",
    date: "[날짜]",
    body: "[게시글 내용]",
  })),
];

export default function BoardPage() {
  return (
    <PageFrame className={styles.layout}>
      {/* 화면에는 탭의 "자유게시판"이 보이므로 페이지 제목은 보조기기용으로만 둔다 */}
      <h1 className="visually-hidden">자유게시판</h1>
      <ServiceTabs current="board" />

      <div className={styles.toolbar}>
        <SearchField id="board-search" label="게시글 검색" />
        {/*
          로그인 기능이 없어서 지금은 항상 익명 상태로 본다. 로그인 후에는 이 안내를 빼고 닉네임으로 남긴다.
          문구는 임시 초안이다.
        */}
        <WriteDialog
          id="board-write"
          title="글쓰기"
          triggerLabel="글쓰기"
          notice={
            <>
              <strong>익명 글 안내</strong> 로그인하지 않고 쓴 글은 &quot;익명&quot;으로 남습니다. 작성자는
              글을 수정하거나 삭제할 수 없고, 운영자만 삭제할 수 있습니다.
            </>
          }
        />
      </div>

      <PostList posts={POSTS} />
    </PageFrame>
  );
}
