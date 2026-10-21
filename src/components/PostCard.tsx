import Card from "./Card";
import styles from "./PostCard.module.css";

interface PostCardProps {
  no: number;
  title: string;
  preview: string;
  author: string;
  date: string;
}

/*
 * 게시글 목록의 한 줄. 내용은 자리표시다.
 * 글 보기 기능이 생기면 제목을 서로 다른 이름의 링크로 바꾼다.
 */
export default function PostCard({ no, title, preview, author, date }: PostCardProps) {
  return (
    <Card as="li" className={styles.card}>
      <span className={styles.no}>{no}</span>
      <div className={styles.body}>
        <p className={styles.title}>{title}</p>
        <p className={styles.preview}>{preview}</p>
      </div>
      <p className={styles.meta}>
        <span>{author}</span>
        <span>{date}</span>
      </p>
    </Card>
  );
}
