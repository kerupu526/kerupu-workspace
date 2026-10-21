import Card from "./Card";
import styles from "./PostCard.module.css";

export interface Post {
  id: number;
  title: string;
  author: string;
  date: string;
  body: string;
}

interface PostCardProps {
  post: Post;
  onOpen: () => void;
}

/*
 * 게시글 목록의 한 줄. 제목 버튼을 누르면 전체 내용 모달이 열린다.
 * 버튼은 제목 글자 하나뿐이고(그래서 이름이 제목이 된다), ::after 로 카드 전체를 눌리게 넓힌다.
 */
export default function PostCard({ post, onOpen }: PostCardProps) {
  const preview = post.body.split("\n")[0];

  return (
    <Card as="li" className={styles.card}>
      <span className={styles.no}>{post.id}</span>
      <div className={styles.body}>
        <button type="button" className={styles.open} aria-haspopup="dialog" onClick={onOpen}>
          {post.title}
        </button>
        <p className={styles.preview}>{preview}</p>
      </div>
      <p className={styles.meta}>
        <span>{post.author}</span>
        <span>{post.date}</span>
      </p>
    </Card>
  );
}
