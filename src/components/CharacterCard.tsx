import Link from "next/link";
import Card from "./Card";
import CircleFrame from "./CircleFrame";
import styles from "./CharacterCard.module.css";

export interface Character {
  slug: string;
  name: string;
  work: string;
  summary: string;
}

/*
 * 캐릭터 사전 목록의 카드 한 장. 내용은 자리표시다.
 * 링크는 이름 글자 하나뿐이라(그래서 링크 이름이 캐릭터 이름이 된다), ::after 로 카드 전체를 눌리게 넓힌다.
 * "문서 보기" 글자는 눈에 보이는 안내일 뿐이라 보조기기에는 읽히지 않게 한다 (같은 이름의 링크가 여러 개 생기지 않도록).
 */
export default function CharacterCard({ slug, name, work, summary }: Character) {
  return (
    <Card as="li" className={styles.card}>
      <CircleFrame label="이미지" className={styles.image} />
      <h3 className={styles.name}>
        <Link href={`/dictionary/${slug}`} className={styles.link}>
          {name}
        </Link>
      </h3>
      <p className={styles.work}>{work}</p>
      <p className={styles.summary}>{summary}</p>
      <p className={styles.more} aria-hidden="true">
        문서 보기 ›
      </p>
    </Card>
  );
}
