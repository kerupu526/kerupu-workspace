import Card from "./Card";
import Chip from "./Chip";
import styles from "./NoticeCard.module.css";

interface NoticeCardProps {
  title: string;
  preview: string;
  date: string;
  /** 고정한 공지. 채운 이름표로 그리고, 보조기기에는 "고정"을 따로 읽어 준다. */
  pinned?: boolean;
}

/* 개인 게시판(운영자 공지)의 한 줄. 내용은 자리표시다. */
export default function NoticeCard({ title, preview, date, pinned = false }: NoticeCardProps) {
  return (
    <Card as="li" className={styles.card}>
      <Chip variant={pinned ? "solid" : "plain"}>
        공지
        {pinned ? <span className="visually-hidden"> (고정)</span> : null}
      </Chip>
      <div className={styles.body}>
        <p className={styles.title}>{title}</p>
        <p className={styles.preview}>{preview}</p>
      </div>
      <p className={styles.date}>{date}</p>
    </Card>
  );
}
