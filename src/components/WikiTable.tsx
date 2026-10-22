import type { WikiBlock } from "./WikiDocument";
import { Inline } from "./WikiInline";
import styles from "./WikiDocument.module.css";

type TableBlock = Extract<WikiBlock, { type: "table" }>;

/*
 * 위키 표. 가로로 넘치면 표만 스크롤한다 (페이지는 넘치지 않는다).
 * 칸 합치기(block.merges)가 있으면 합쳐진 왼쪽 위 칸에 colSpan, rowSpan 을 주고 나머지 칸은 그리지 않는다.
 * 문서 본문과 정보 상자 안의 표가 같이 쓴다. className 으로 바깥 틀의 모양을 바꿀 수 있다.
 */
export default function WikiTable({
  block,
  footnotes,
  className,
}: {
  block: TableBlock;
  footnotes: string[];
  className?: string;
}) {
  const merge = (row: number, col: number) => block.merges?.[row]?.[col];
  const colSpan = (row: number, col: number) => merge(row, col)?.colSpan;
  const rowSpan = (row: number, col: number) => merge(row, col)?.rowSpan;

  return (
    <div className={className ? `${styles.tableWrap} ${className}` : styles.tableWrap}>
      <table className={styles.table}>
        <thead>
          <tr>
            {block.head.map((cell, j) =>
              merge(0, j)?.skip ? null : (
                <th
                  key={j}
                  scope={(colSpan(0, j) ?? 1) > 1 ? "colgroup" : "col"}
                  colSpan={colSpan(0, j)}
                  style={{ textAlign: block.align[j] ?? undefined }}
                >
                  {cell.map((part, k) => (
                    <Inline key={k} part={part} footnotes={footnotes} />
                  ))}
                </th>
              ),
            )}
          </tr>
        </thead>
        <tbody>
          {block.rows.map((row, i) => (
            <tr key={i}>
              {row.map((cell, j) =>
                merge(i + 1, j)?.skip ? null : (
                  <td
                    key={j}
                    colSpan={colSpan(i + 1, j)}
                    rowSpan={rowSpan(i + 1, j)}
                    style={{ textAlign: block.align[j] ?? undefined }}
                  >
                    {cell.map((part, k) => (
                      <Inline key={k} part={part} footnotes={footnotes} />
                    ))}
                  </td>
                ),
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
