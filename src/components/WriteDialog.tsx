"use client";

import { useRef, type ReactNode } from "react";
import { Button } from "./Button";
import Field from "./Field";
import Modal, { ModalHeader } from "./Modal";
import NoopForm from "./NoopForm";
import styles from "./WriteDialog.module.css";

interface WriteDialogProps {
  /** 요소 id 접두어 (같은 화면에서 겹치지 않게) */
  id: string;
  title: string;
  /** 열기 버튼에 쓰는 글자 */
  triggerLabel: string;
  /** 제목 옆 이름표 (예: 운영자 전용) */
  badge?: ReactNode;
  /** 등록 버튼 위에 보여줄 주의 문구 (예: 익명 글 안내) */
  notice?: ReactNode;
  submitLabel?: string;
}

/* 글쓰기 모달 (자유게시판, 개인 게시판 공용). 제출해도 아무 일도 하지 않는다 (기능은 이후 단계). */
export default function WriteDialog({
  id,
  title,
  triggerLabel,
  badge,
  notice,
  submitLabel = "등록",
}: WriteDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  return (
    <>
      <Button size="compact" aria-haspopup="dialog" onClick={() => dialogRef.current?.showModal()}>
        {triggerLabel}
      </Button>

      <Modal ref={dialogRef} labelledBy={`${id}-title`} className={styles.content}>
        <ModalHeader
          id={`${id}-title`}
          title={title}
          badge={badge}
          onClose={() => dialogRef.current?.close()}
        />
        <NoopForm className={styles.form}>
          <Field id={`${id}-subject`} label="제목" autoFocus />
          <Field id={`${id}-body`} label="내용" type="textarea" />
          {notice ? <p className={styles.notice}>{notice}</p> : null}
          <Button type="submit" className={styles.submit}>
            {submitLabel}
          </Button>
        </NoopForm>
      </Modal>
    </>
  );
}
