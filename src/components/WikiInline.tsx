import FootnoteRef from "./FootnoteRef";
import Spoiler from "./Spoiler";
import type { WikiInline } from "./WikiDocument";
import styles from "./WikiDocument.module.css";

/* 문단, 리스트, 표 칸 안의 인라인 조각 하나. 문서 화면과 정보 상자가 같은 모양으로 그리도록 따로 뒀다. */
export function Inline({ part, footnotes }: { part: WikiInline; footnotes: string[] }) {
  if (typeof part === "string") return <>{part}</>;
  if ("footnote" in part) {
    const n = part.footnote;
    return <FootnoteRef n={n} text={footnotes[n - 1] ?? ""} />;
  }
  const inner = (list: WikiInline[]) =>
    list.map((p, i) => <Inline key={i} part={p} footnotes={footnotes} />);
  if ("strong" in part) return <strong>{inner(part.strong)}</strong>;
  if ("em" in part) return <em>{inner(part.em)}</em>;
  if ("del" in part) return <del>{inner(part.del)}</del>;
  if ("code" in part) return <code className={styles.code}>{part.code}</code>;
  if ("spoiler" in part) return <Spoiler>{inner(part.spoiler)}</Spoiler>;
  // 링크는 파서가 안전한 주소만 넘긴다 (/, #, https:// 로 시작)
  const { href, children } = part.link;
  const external = /^https?:\/\//.test(href);
  return (
    <a
      href={href}
      className={styles.link}
      {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
    >
      {inner(children)}
    </a>
  );
}
