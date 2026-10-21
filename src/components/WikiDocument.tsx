import { Button, ButtonLink } from "./Button";
import Card from "./Card";
import Chip from "./Chip";
import WikiInfobox, { type WikiInfoboxData } from "./WikiInfobox";
import WikiToc, { type TocItem } from "./WikiToc";
import styles from "./WikiDocument.module.css";

/* 문단 안의 조각: 글자, 또는 각주 번호 */
export type WikiInline = string | { footnote: number };

export interface WikiSection {
  title: string;
  paragraphs: WikiInline[][];
  children?: WikiSection[];
}

interface WikiDocumentProps {
  /** "문서" 메뉴가 가리키는, 지금 이 문서의 주소 */
  href: string;
  title: string;
  /** 최근 수정 시각 */
  modified: string;
  categories: string[];
  infobox: WikiInfoboxData;
  sections: WikiSection[];
  footnotes: string[];
}

interface Numbered {
  id: string;
  number: string;
  /** 제목 단계: 1단계 문단은 h2, 그 아래는 h3, h4 ... */
  headingLevel: number;
  section: WikiSection;
  children: Numbered[];
}

/* 문단 번호를 붙인다: 1., 2., 2.1., 2.2. ... */
function numberSections(sections: WikiSection[], parent: number[] = []): Numbered[] {
  return sections.map((section, index) => {
    const path = [...parent, index + 1];
    return {
      id: `s-${path.join("-")}`,
      number: `${path.join(".")}.`,
      headingLevel: Math.min(path.length + 1, 6),
      section,
      children: numberSections(section.children ?? [], path),
    };
  });
}

function toTocItems(items: Numbered[]): TocItem[] {
  return items.map((item) => ({
    id: item.id,
    number: item.number,
    title: item.section.title,
    children: toTocItems(item.children),
  }));
}

function Inline({ part }: { part: WikiInline }) {
  if (typeof part === "string") return <>{part}</>;
  const n = part.footnote;
  return (
    <sup className={styles.fnRef}>
      <a id={`fnref-${n}`} href={`#fn-${n}`} aria-label={`각주 ${n}번으로 이동`}>
        [{n}]
      </a>
    </sup>
  );
}

function Sections({ items }: { items: Numbered[] }) {
  return items.map((item) => {
    const Heading = `h${item.headingLevel}` as "h2" | "h3" | "h4" | "h5" | "h6";
    return (
      <section key={item.id} className={styles.section} aria-labelledby={item.id}>
        <Heading className={`${styles.heading} ${styles[`level${item.headingLevel}`] ?? ""}`} id={item.id}>
          <span className={styles.number}>{item.number}</span>
          {item.section.title}
        </Heading>
        {item.section.paragraphs.map((paragraph, i) => (
          <p key={i} className={styles.paragraph}>
            {paragraph.map((part, j) => (
              <Inline key={j} part={part} />
            ))}
          </p>
        ))}
        <Sections items={item.children} />
      </section>
    );
  });
}

/*
 * 위키 문서 한 편. 나무위키 같은 the seed 계열 위키의 화면 관습을 따른다.
 *   제목과 문서 메뉴 → 최근 수정 시각 → 분류 → (오른쪽 정보 상자) → 목차 → 번호 붙은 문단 → 각주
 * 내용은 모두 자리표시이고, 편집·역사 같은 위키 기능은 아직 없다.
 */
export default function WikiDocument({
  href,
  title,
  modified,
  categories,
  infobox,
  sections,
  footnotes,
}: WikiDocumentProps) {
  const numbered = numberSections(sections);

  return (
    <article className={styles.doc}>
      <header className={styles.header}>
        <div className={styles.titleRow}>
          <h1 className={styles.title}>{title}</h1>
          <nav className={styles.menu} aria-label="문서 메뉴">
            <ButtonLink href={href} size="compact" aria-current="page">
              문서
            </ButtonLink>
            {/* 편집과 역사는 위키 기능이 생기면 쓸 수 있다. 지금은 점선 모양의 비활성 버튼이다. */}
            <Button variant="dashed" size="compact" disabled>
              편집<span className="visually-hidden"> (준비 중)</span>
            </Button>
            <Button variant="dashed" size="compact" disabled>
              역사<span className="visually-hidden"> (준비 중)</span>
            </Button>
          </nav>
        </div>
        <p className={styles.meta}>최근 수정 시각: {modified}</p>
        <div className={styles.categories}>
          <p className={styles.categoryLabel} id="doc-category-label">
            분류
          </p>
          <ul className={styles.categoryList} aria-labelledby="doc-category-label">
            {categories.map((category) => (
              <li key={category}>
                <Chip>{category}</Chip>
              </li>
            ))}
          </ul>
        </div>
      </header>

      <Card className={styles.body}>
        <WikiInfobox {...infobox} />
        <WikiToc items={toTocItems(numbered)} />
        <Sections items={numbered} />

        {footnotes.length > 0 ? (
          <section className={styles.footnotes} aria-labelledby="fn-title">
            <h2 className={styles.heading} id="fn-title">
              각주
            </h2>
            <ol className={styles.fnList}>
              {footnotes.map((text, i) => (
                <li key={i} id={`fn-${i + 1}`} className={styles.fnItem}>
                  <a
                    className={styles.fnBack}
                    href={`#fnref-${i + 1}`}
                    aria-label={`본문의 각주 ${i + 1}번 위치로 돌아가기`}
                  >
                    [{i + 1}]
                  </a>
                  <span>{text}</span>
                </li>
              ))}
            </ol>
          </section>
        ) : null}
      </Card>
    </article>
  );
}
