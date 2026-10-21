import type { ReactNode } from "react";
import { Button } from "./Button";
import Card from "./Card";
import Field from "./Field";
import NoopForm from "./NoopForm";
import styles from "./WritePanel.module.css";

interface WritePanelProps {
  /** 요소 id 접두어 (같은 화면에서 겹치지 않게) */
  id: string;
  title: string;
  /** 제목 옆 이름표 (예: 운영자 전용) */
  badge?: ReactNode;
  submitLabel?: string;
  className?: string;
}

/* 오른쪽 글쓰기 카드 (게시판, 개인 게시판 공용). 제출해도 아무 일도 하지 않는다. */
export default function WritePanel({
  id,
  title,
  badge,
  submitLabel = "등록",
  className,
}: WritePanelProps) {
  return (
    <Card
      as="section"
      className={className ? `${styles.panel} ${className}` : styles.panel}
      aria-labelledby={`${id}-title`}
    >
      <div className={styles.head}>
        <h2 className={styles.title} id={`${id}-title`}>
          {title}
        </h2>
        {badge}
      </div>
      <NoopForm className={styles.form}>
        <Field id={`${id}-subject`} label="제목" />
        <Field id={`${id}-body`} label="내용" type="textarea" />
        <Button type="submit" className={styles.submit}>
          {submitLabel}
        </Button>
      </NoopForm>
    </Card>
  );
}
