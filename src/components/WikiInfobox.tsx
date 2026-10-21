import styles from "./WikiInfobox.module.css";

export interface WikiInfoboxData {
  title: string;
  imageLabel: string;
  rows: { label: string; value: string }[];
}

/*
 * 위키 문서의 정보 상자. 문서 본문 오른쪽에 떠 있고 글이 그 둘레로 흐른다.
 * 항목 이름과 값은 표(table)의 행 머리글(th)과 칸(td)으로 묶어서 보조기기가 짝을 알 수 있게 한다.
 * 칸 사이 선은 장식(card-border)이라 의미는 글자와 표 구조가 맡는다.
 */
export default function WikiInfobox({ title, imageLabel, rows }: WikiInfoboxData) {
  return (
    <aside className={styles.box} aria-label={`${title} 정보`}>
      <table className={styles.table}>
        <caption className={styles.caption}>{title}</caption>
        <tbody>
          <tr>
            <td className={styles.imageCell} colSpan={2}>
              <div className={styles.image}>{imageLabel}</div>
            </td>
          </tr>
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
    </aside>
  );
}
