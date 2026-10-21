"use client";

import type { MouseEvent, ReactNode, Ref } from "react";
import { Button } from "./Button";
import Card from "./Card";
import styles from "./Modal.module.css";

interface ModalProps {
  /** 열고 닫는 쪽에서 showModal() / close() 를 부르기 위한 참조 */
  ref: Ref<HTMLDialogElement>;
  /** 창 이름이 되는 제목 요소의 id */
  labelledBy: string;
  /** 안쪽 카드에 더할 클래스 (크기 변수 등) */
  className?: string;
  children: ReactNode;
}

/*
 * 모달 창 틀. 브라우저 기본 <dialog> 의 showModal() 을 쓴다. 이 방식이 알아서 해 주는 것:
 * 뒤쪽 화면 비활성화, 포커스를 창 안에 가두기, Esc 로 닫기, 닫은 뒤 열었던 버튼으로 포커스 복귀.
 */
export default function Modal({ ref, labelledBy, className, children }: ModalProps) {
  // 창 바깥(어두운 배경)을 누르면 닫는다. 안쪽 카드가 창을 가득 채우므로 창 자체가 눌렸다면 배경이다.
  function closeOnBackdrop(event: MouseEvent<HTMLDialogElement>) {
    if (event.target === event.currentTarget) event.currentTarget.close();
  }

  return (
    <dialog ref={ref} className={styles.dialog} aria-labelledby={labelledBy} onClick={closeOnBackdrop}>
      <Card className={className ? `${styles.card} ${className}` : styles.card}>{children}</Card>
    </dialog>
  );
}

interface ModalHeaderProps {
  id: string;
  title: string;
  /** 제목 옆 이름표 (예: 운영자 전용) */
  badge?: ReactNode;
  onClose: () => void;
}

/* 모달 맨 위 줄: 제목, 이름표, 닫기 버튼 */
export function ModalHeader({ id, title, badge, onClose }: ModalHeaderProps) {
  return (
    <div className={styles.head}>
      <div className={styles.heading}>
        <h2 className={styles.title} id={id}>
          {title}
        </h2>
        {badge}
      </div>
      <Button variant="secondary" size="compact" onClick={onClose}>
        닫기
      </Button>
    </div>
  );
}
