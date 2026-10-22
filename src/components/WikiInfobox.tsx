import type { WikiBlock } from "./WikiDocument";
import WikiTable from "./WikiTable";
import styles from "./WikiInfobox.module.css";

export interface WikiInfoboxData {
  title: string;
  /** 이미지 설명(alt) */
  imageLabel: string;
  /** 사이트에 올린 이미지 주소 (파서가 안전한 것만 넘긴다). 없으면 이미지 칸을 그리지 않는다 */
  image?: string;
  rows: { label: string; value: string }[];
  /** 메타 블록의 정보 아래에 쓴 표 (칸 서식과 합치기가 풀려 있다). 이름: 값 줄 아래에 이어서 그린다. */
  table?: Extract<WikiBlock, { type: "table" }>;
}

/*
 * 위키 문서의 정보 상자. 문서 본문 오른쪽에 떠 있고 글이 그 둘레로 흐른다.
 * 항목 이름과 값은 표(table)의 행 머리글(th)과 칸(td)으로 묶어서 보조기기가 짝을 알 수 있게 한다.
 * 칸 사이 선은 장식(card-border)이라 의미는 글자와 표 구조가 맡는다.
 */
export default function WikiInfobox({ title, imageLabel, image, rows, table }: WikiInfoboxData) {
  return (
    <aside className={styles.box} aria-label={`${title} 정보`}>
      <table className={styles.table}>
        <caption className={styles.caption}>{title}</caption>
        <tbody>
          {/* 이미지는 메타 블록에 "이미지:" 를 쓴 문서에만 나온다 (없으면 이미지 칸 자체가 없다) */}
          {image ? (
            <tr>
              <td className={styles.imageCell} colSpan={2}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={image} alt={imageLabel} className={styles.picture} loading="lazy" />
              </td>
            </tr>
          ) : null}
          {rows.map((row) => (
            <tr key={row.label}>
              <th className={styles.label} scope="row">
                {row.label}
              </th>
              <td className={styles.value}>{row.value}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {/* 머리글 줄은 맨 위 제목처럼 가운데에 둔다. 표의 칸 안 각주는 지원하지 않아서(본문에서만 만든다) 각주 목록은 비어 있다 */}
      {table ? <WikiTable block={table} footnotes={[]} className={styles.extraTable} centerHeader /> : null}
    </aside>
  );
}
