import { unified } from "unified";
import remarkParse from "remark-parse";
import remarkGfm from "remark-gfm";
import type { WikiInline, WikiSection } from "@/components/WikiDocument";

/*
 * 위키 마크다운 파서 (2단계: 문단, 본문, 인라인 서식, 링크, 각주).
 * 설계는 docs/wiki-syntax.md 참고.
 *
 * 규칙
 *   - ## 부터 문단 제목. ##이 1단계, ###이 2단계 ... ######이 5단계.
 *   - # (1단계 제목)은 문서 제목 자리라서 본문에서 무시한다.
 *   - 제목 아래 문단은 그 제목의 본문이 된다. 첫 제목 전의 글은 버린다.
 *   - **굵게**, *기울임*, ~~취소선~~, `코드`, [글](주소) 를 처리한다.
 *   - 링크 주소는 /, #, https:// 로 시작하는 것만 허용한다. 나머지는 글자로만 남긴다.
 *   - ^[내용] 은 각주다. 번호는 등장 순서대로 1부터 붙는다.
 *     (한계: 각주 내용이 굵게 같은 서식을 가로지르면 각주로 인식하지 못한다. 후속 단계에서 확장으로 고친다.)
 */

type MdNode = {
  type: string;
  depth?: number;
  value?: string;
  url?: string;
  children?: MdNode[];
};

export interface ParsedWiki {
  sections: WikiSection[];
  footnotes: string[];
}

const processor = unified().use(remarkParse).use(remarkGfm);

/* 허용하는 링크 주소인지 */
export function isSafeHref(href: string): boolean {
  return href.startsWith("/") || href.startsWith("#") || /^https:\/\//.test(href);
}

/* 문장 안의 ^[내용] 을 찾아 각주로 바꾼다. 글자 조각과 각주 번호가 섞인 목록을 돌려준다. */
function splitFootnotes(text: string, footnotes: string[]): WikiInline[] {
  const out: WikiInline[] = [];
  const pattern = /\^\[([^\]]*)\]/g;
  let last = 0;
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(text)) !== null) {
    if (match.index > last) out.push(text.slice(last, match.index));
    footnotes.push(match[1]);
    out.push({ footnote: footnotes.length });
    last = match.index + match[0].length;
  }
  if (last < text.length) out.push(text.slice(last));
  return out;
}

/* 마크다운 조각들을 위키 인라인 조각으로 바꾼다 */
function toInline(nodes: MdNode[] = [], footnotes: string[]): WikiInline[] {
  const out: WikiInline[] = [];
  for (const node of nodes) {
    switch (node.type) {
      case "text":
        out.push(...splitFootnotes(node.value ?? "", footnotes));
        break;
      case "strong":
        out.push({ strong: toInline(node.children, footnotes) });
        break;
      case "emphasis":
        out.push({ em: toInline(node.children, footnotes) });
        break;
      case "delete":
        out.push({ del: toInline(node.children, footnotes) });
        break;
      case "inlineCode":
        out.push({ code: node.value ?? "" });
        break;
      case "link": {
        const children = toInline(node.children, footnotes);
        const href = node.url ?? "";
        if (isSafeHref(href)) out.push({ link: { href, children } });
        else out.push(...children); // 안전하지 않은 주소는 글자만 남긴다
        break;
      }
      case "break":
        out.push(" ");
        break;
      default:
        // 지원하지 않는 조각(이미지, HTML 등)은 글자만 남긴다
        if (node.children) out.push(...toInline(node.children, footnotes));
        else if (node.value) out.push(node.value);
    }
  }
  return out;
}

/* 제목 글자(평문) */
function plainText(nodes: MdNode[] = []): string {
  return nodes
    .map((n) => (n.value !== undefined ? n.value : plainText(n.children)))
    .join("");
}

export function parseWiki(markdown: string): ParsedWiki {
  const tree = processor.parse(markdown) as MdNode;
  const footnotes: string[] = [];
  const root: WikiSection[] = [];
  // stack[i]는 (i+1)단계 문단
  const stack: WikiSection[] = [];

  for (const node of tree.children ?? []) {
    if (node.type === "heading" && node.depth !== undefined) {
      if (node.depth < 2) continue; // # 은 문서 제목 자리
      const level = node.depth - 2; // ## -> 0
      const section: WikiSection = { title: plainText(node.children), paragraphs: [] };
      stack.length = Math.min(stack.length, level); // 같은 단계 이상은 닫는다
      if (level === 0) root.push(section);
      else {
        const parent = stack[level - 1];
        parent.children = [...(parent.children ?? []), section];
      }
      stack[level] = section;
      continue;
    }

    if (node.type === "paragraph") {
      const target = stack[stack.length - 1];
      if (!target) continue;
      target.paragraphs.push(toInline(node.children, footnotes));
    }
  }

  return { sections: root, footnotes };
}

/* 문단 구조만 필요할 때 */
export function parseWikiSections(markdown: string): WikiSection[] {
  return parseWiki(markdown).sections;
}
