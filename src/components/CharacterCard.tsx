import Link from "next/link";
import Card from "./Card";
import CircleFrame from "./CircleFrame";
import styles from "./CharacterCard.module.css";
import { isAllowedImageSrc } from "@/lib/wiki/image-url";

export interface Character {
  slug: string;
  name: string;
  /** 비어 있으면 "작품 미정"을 보여 준다 */
  work: string | null;
  /** 비어 있으면 그 줄을 그리지 않는다 */
  summary: string | null;
  /** 대표 이미지 주소. 없거나 허용된 주소가 아니면 빈 원을 보여 준다 */
  image?: string | null;
}

/*
 * 캐릭터 사전 목록의 카드 한 장.
 * 링크는 이름 글자 하나뿐이라(그래서 링크 이름이 캐릭터 이름이 된다), ::after 로 카드 전체를 눌리게 넓힌다.
 * "문서 보기" 글자는 눈에 보이는 안내일 뿐이라 보조기기에는 읽히지 않게 한다 (같은 이름의 링크가 여러 개 생기지 않도록).
 */
export default function CharacterCard({ slug, name, work, summary, image }: Character) {
  return (
    <Card as="li" className={styles.card}>
      {/* DB 에 든 주소도 그릴 때 한 번 더 확인한다 (다른 사이트의 그림이 나오지 않게) */}
      <CircleFrame
        label={image && isAllowedImageSrc(image) ? `${name} 이미지` : "이미지"}
        image={image && isAllowedImageSrc(image) ? image : undefined}
        className={styles.image}
      />
      <h3 className={styles.name}>
        <Link href={`/dictionary/${slug}`} className={styles.link}>
          {name}
        </Link>
      </h3>
      <p className={styles.work}>{work ?? "작품 미정"}</p>
      {summary ? <p className={styles.summary}>{summary}</p> : null}
      <p className={styles.more} aria-hidden="true">
        문서 보기 ›
      </p>
    </Card>
  );
}
