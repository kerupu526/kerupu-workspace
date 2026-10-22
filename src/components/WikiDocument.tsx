import type { CSSProperties } from "react";
import Link from "next/link";
import { Button, ButtonLink } from "./Button";
import Card from "./Card";
import Chip from "./Chip";
import { Inline } from "./WikiInline";
import WikiInfobox, { type WikiInfoboxData } from "./WikiInfobox";
import WikiTable from "./WikiTable";
import WikiToc, { type TocItem } from "./WikiToc";
import styles from "./WikiDocument.module.css";

/*
 * 문단 안의 조각. 글자, 각주 번호, 또는 서식이 걸린 묶음.
 * 서식 묶음은 안에 다시 조각을 담을 수 있다 (예: 굵은 글자 안의 기울임).
 */
export type WikiInline =
  | string
  | { footnote: number }
  | { strong: WikiInline[] }
  | { em: WikiInline[] }
  | { del: WikiInline[] }
  | { code: string }
  | { link: { href: string; children: WikiInline[] } }
  /** 스포일러 ||글||: 가려져 있다가 누르면 보인다 */
  | { spoiler: WikiInline[] };

/* 블록: 문단, 리스트, 인용문, 수평줄 */
export type WikiBlock =
  | { type: "p"; children: WikiInline[] }
  | { type: "list"; ordered: boolean; items: WikiListItem[] }
  | { type: "quote"; children: WikiBlock[] }
  | { type: "hr" }
  | {
      type: "table";
      align: ("left" | "center" | "right" | null)[];
      head: WikiInline[][];
      rows: WikiInline[][][];
      /** 칸 합치기가 있을 때만: 머리글 줄을 첫 줄로 한 칸별 합치기 정보 (합쳐서 안 그리는 칸은 skip) */
      merges?: WikiCellMerge[][];
    }
  | { type: "image"; src: string; alt: string }
  /** CSS 블록: 허용 목록을 통과한 선언만 담긴다 (파서에서 걸러진다). 이름은 camelCase. */
  | { type: "style"; style: Record<string, string>; children: WikiBlock[] }
  /** [toc] 를 쓴 자리. 목차는 문서의 문단 제목에서 만든다. */
  | { type: "toc" }
  /** 접기 블록: 제목 줄을 누르면 안의 블록이 펼쳐진다. 처음에는 접혀 있다. title 이 비어 있으면 "더 보기". */
  | { type: "fold"; title: string; children: WikiBlock[] };

/** 표 칸 하나의 합치기: 왼쪽 위 칸만 colSpan, rowSpan 을 갖고, 합쳐진 나머지 칸은 skip 이다 */
export interface WikiCellMerge {
  colSpan?: number;
  rowSpan?: number;
  skip?: boolean;
}

export interface WikiListItem {
  content: WikiInline[];
  /** 항목 아래의 중첩 블록 (하위 리스트 등) */
  nested?: WikiBlock[];
}

export interface WikiSection {
  title: string;
  /** 처음부터 접혀 있는 문단 ("## + 제목") */
  folded?: boolean;
  blocks: WikiBlock[];
  children?: WikiSection[];
}

/** 현재 위치 한 칸. href 가 없으면 링크가 아닌 글자(마지막 칸이거나 갈 곳이 아직 없는 칸) */
export interface Crumb {
  label: string;
  href?: string;
}

export interface WikiDocumentProps {
  /** 이 문서가 어디에 속하는지 보여 주는 현재 위치 (맨 앞이 가장 상위) */
  breadcrumb: Crumb[];
  /** "문서" 메뉴가 가리키는, 지금 이 문서의 주소 */
  href: string;
  title: string;
  /** 최근 수정 시각 */
  modified: string;
  categories: string[];
  infobox: WikiInfoboxData;
  sections: WikiSection[];
  /** 첫 문단 제목 앞에 놓을 블록 (첫 제목 전에 쓴 [toc]) */
  lead?: WikiBlock[];
  footnotes: string[];
  /** 있으면 "편집" 메뉴가 이 주소로 가는 링크가 된다. 없으면 점선 모양의 비활성 버튼이다. */
  editHref?: string;
  /** 있으면 "삭제" 메뉴가 이 주소(삭제 확인 화면)로 가는 링크가 된다. 없으면 메뉴에 나오지 않는다. */
  deleteHref?: string;
  /** 편집 화면의 미리보기로 쓸 때: 문서 메뉴를 숨긴다 (눌러서 편집 중인 글을 잃지 않게) */
  preview?: boolean;
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

function Blocks({ blocks, footnotes, toc }: { blocks: WikiBlock[]; footnotes: string[]; toc: TocItem[] }) {
  return (
    <>
      {blocks.map((block, i) => {
        switch (block.type) {
          case "p":
            return (
              <p key={i} className={styles.paragraph}>
                {block.children.map((part, j) => (
                  <Inline key={j} part={part} footnotes={footnotes} />
                ))}
              </p>
            );
          case "list": {
            const List = block.ordered ? "ol" : "ul";
            return (
              <List key={i} className={styles.list}>
                {block.items.map((item, j) => (
                  <li key={j}>
                    {item.content.map((part, k) => (
                      <Inline key={k} part={part} footnotes={footnotes} />
                    ))}
                    {item.nested ? <Blocks blocks={item.nested} footnotes={footnotes} toc={toc} /> : null}
                  </li>
                ))}
              </List>
            );
          }
          case "quote":
            return (
              <blockquote key={i} className={styles.quote}>
                <Blocks blocks={block.children} footnotes={footnotes} toc={toc} />
              </blockquote>
            );
          case "hr":
            return <hr key={i} className={styles.hr} />;
          case "table":
            return <WikiTable key={i} block={block} footnotes={footnotes} />;
          case "toc":
            return <WikiToc key={i} items={toc} />;
          case "style":
            // 스타일은 style 속성으로만 준다 (<style> 태그나 HTML 주입은 쓰지 않는다)
            return (
              <div key={i} style={block.style as CSSProperties}>
                <Blocks blocks={block.children} footnotes={footnotes} toc={toc} />
              </div>
            );
          case "fold":
            // <details> 라서 JS 없이 열고 닫히고, 열고 닫는 상태는 키보드와 보조기기도 안다
            return (
              <details key={i} className={styles.fold}>
                <summary className={styles.foldSummary}>{block.title || "더 보기"}</summary>
                <div className={styles.foldBody}>
                  <Blocks blocks={block.children} footnotes={footnotes} toc={toc} />
                </div>
              </details>
            );
          case "image":
            // 이미지는 사이트에 올린 파일만 (파서에서 걸러진다). 설명은 항상 있다.
            return (
              <figure key={i} className={styles.figure}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={block.src} alt={block.alt} className={styles.image} loading="lazy" />
              </figure>
            );
        }
      })}
    </>
  );
}

function Sections({ items, footnotes, toc }: { items: Numbered[]; footnotes: string[]; toc: TocItem[] }) {
  return items.map((item) => {
    const Heading = `h${item.headingLevel}` as "h2" | "h3" | "h4" | "h5" | "h6";
    const heading = (
      <Heading className={`${styles.heading} ${styles[`level${item.headingLevel}`] ?? ""}`} id={item.id}>
        <span className={styles.number}>{item.number}</span>
        {item.section.title}
      </Heading>
    );
    const body = (
      <>
        <Blocks blocks={item.section.blocks} footnotes={footnotes} toc={toc} />
        <Sections items={item.children} footnotes={footnotes} toc={toc} />
      </>
    );
    return (
      <section key={item.id} className={styles.section} aria-labelledby={item.id}>
        {item.section.folded ? (
          // 접힌 문단: 제목 줄이 열고 닫는 줄이다. 목차 링크로 들어오면 브라우저가 알아서 펼친다.
          <details className={styles.sectionFold}>
            <summary className={styles.sectionFoldSummary}>{heading}</summary>
            {body}
          </details>
        ) : (
          <>
            {heading}
            {body}
          </>
        )}
      </section>
    );
  });
}

/*
 * 위키 문서 한 편. 나무위키 같은 the seed 계열 위키의 화면 관습을 따른다.
 *   제목과 문서 메뉴 → 최근 수정 시각 → 분류 → (오른쪽 정보 상자) → 목차 → 번호 붙은 문단 → 각주
 * 편집은 편집 화면으로 가는 링크(editHref)이고, 역사 같은 나머지 위키 기능은 아직 없다.
 */
export default function WikiDocument({
  breadcrumb,
  href,
  title,
  modified,
  categories,
  infobox,
  sections,
  lead = [],
  footnotes,
  editHref,
  deleteHref,
  preview = false,
}: WikiDocumentProps) {
  const numbered = numberSections(sections);
  const toc = toTocItems(numbered);

  return (
    <article className={styles.doc}>
      <header className={styles.header}>
        <nav aria-label="현재 위치">
          <ol className={styles.crumbs}>
            {breadcrumb.map((crumb, i) => {
              const last = i === breadcrumb.length - 1;
              return (
                <li key={crumb.label} className={styles.crumb}>
                  {crumb.href && !last ? (
                    <Link className={styles.crumbLink} href={crumb.href}>
                      {crumb.label}
                    </Link>
                  ) : (
                    <span aria-current={last ? "page" : undefined}>{crumb.label}</span>
                  )}
                  {last ? null : (
                    <span className={styles.crumbSep} aria-hidden="true">
                      ›
                    </span>
                  )}
                </li>
              );
            })}
          </ol>
        </nav>
        <div className={styles.titleRow}>
          <h1 className={styles.title}>{title}</h1>
          {preview ? null : (
            <nav className={styles.menu} aria-label="문서 메뉴">
              <ButtonLink href={href} size="compact" aria-current="page">
                문서
              </ButtonLink>
              {editHref ? (
                <ButtonLink href={editHref} variant="secondary" size="compact">
                  편집
                </ButtonLink>
              ) : (
                <Button variant="dashed" size="compact" disabled>
                  편집<span className="visually-hidden"> (준비 중)</span>
                </Button>
              )}
              {deleteHref ? (
                <ButtonLink href={deleteHref} variant="secondary" size="compact">
                  삭제
                </ButtonLink>
              ) : null}
              {/* 역사는 위키 기능이 생기면 쓸 수 있다. 지금은 점선 모양의 비활성 버튼이다. */}
              <Button variant="dashed" size="compact" disabled>
                역사<span className="visually-hidden"> (준비 중)</span>
              </Button>
            </nav>
          )}
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
        {/* 목차는 작성자가 [toc] 를 쓴 자리에만 나온다 (자동으로 만들지 않는다) */}
        <Blocks blocks={lead} footnotes={footnotes} toc={toc} />
        <Sections items={numbered} footnotes={footnotes} toc={toc} />

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
