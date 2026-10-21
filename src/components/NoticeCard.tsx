import Card from "./Card";
import Chip from "./Chip";
import styles from "./NoticeCard.module.css";

interface NoticeCardProps {
  title: string;
  preview: string;
  date: string;
  /** 첫 공지처럼 눈에 띄게 보일 때 (채운 이름표) */
  emphasized?: boolean;
}

/* 개인 게시판(운영자 공지)의 한 줄. 내용은 자리표시다. */
export default function NoticeCard({ title, preview, date, emphasized = false }: NoticeCardProps) {
  return (
    <Card as="li" className={styles.card}>
      <Chip variant={emphasized ? "solid" : "plain"}>공지</Chip>
      <div className={styles.body}>
        <p className={styles.title}>{title}</p>
        <p className={styles.preview}>{preview}</p>
      </div>
      <p className={styles.date}>{date}</p>
    </Card>
  );
}
