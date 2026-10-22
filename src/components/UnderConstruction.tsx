import Card from "./Card";
import styles from "./UnderConstruction.module.css";

/* 아직 만들지 않은 페이지에 두는 공사 중 안내. 제목은 화면에 보이는 글이다. */
export default function UnderConstruction({ title }: { title: string }) {
  return (
    <Card as="section" className={styles.card} aria-labelledby="construction-title">
      <h1 className={styles.title} id="construction-title">
        {title}
      </h1>
      <p className={styles.message}>공사 중이에요. 곧 찾아올게요!</p>
    </Card>
  );
}
