"use client";

import { useRef, useState } from "react";
import Modal, { ModalHeader } from "./Modal";
import PostCard, { type Post } from "./PostCard";
import styles from "./PostList.module.css";

/*
 * 게시글 목록과 "전체 내용 보기" 모달.
 * 모달은 하나만 두고, 누른 글을 상태로 기억해서 내용을 바꿔 보여준다.
 */
export default function PostList({ posts }: { posts: Post[] }) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [selected, setSelected] = useState<Post | null>(null);

  function open(post: Post) {
    setSelected(post);
    dialogRef.current?.showModal();
  }

  return (
    <>
      <ul className={styles.posts} aria-label="게시글 목록">
        {posts.map((post) => (
          <PostCard key={post.id} post={post} onOpen={() => open(post)} />
        ))}
      </ul>

      <Modal ref={dialogRef} labelledBy="post-dialog-title">
        <ModalHeader
          id="post-dialog-title"
          title={selected?.title ?? ""}
          onClose={() => dialogRef.current?.close()}
        />
        <p className={styles.meta}>
          <span>{selected?.author}</span>
          <span>{selected?.date}</span>
        </p>
        {/* 긴 글은 이 영역 안에서 스크롤한다. 키보드로도 스크롤할 수 있게 포커스를 받는다. */}
        <div className={styles.content} tabIndex={0}>
          {selected?.body}
        </div>
      </Modal>
    </>
  );
}
