import { unified } from "unified";
import remarkParse from "remark-parse";
import remarkGfm from "remark-gfm";
import type { WikiBlock, WikiInline, WikiListItem, WikiSection } from "@/components/WikiDocument";

/*
 * 위키 마크다운 파서 (3단계: 문단, 리스트, 인용문, 수평줄, 인라인 서식, 링크, 각주).
 * 설계는 docs/wiki-syntax.md 참고.
 *
 * 규칙
 *   - ## 부터 문단 제목. ##이 1단계, ###이 2단계 ... ######이 5단계.
 *   - # (1단계 제목)은 문서 제목 자리라서 본문에서 무시한다.
 *   - 제목 아래 블록은 그 제목의 본문이 된다. 첫 제목 전의 글은 버린다.
 *   - 블록: 문단, 순서 없는/있는 리스트(중첩 가능), 인용문(중첩 가능), 수평줄.
 *   - 인라인: **굵게**, *기울임*, ~~취소선~~, `코드`, [글](주소), ^[각주].
 *   - 링크 주소는 /, #, https:// 로 시작하는 것만 허용한다. 나머지는 글자로만 남긴다.
 *   - 아직 처리하지 않는 블록(코드 블록, 표, 이미지 단독 줄 등)은 버린다. 4단계 이후에 처리한다.
 *   - 각주 내용이 굵게 같은 서식을 가로지르면 각주로 인식하지 못한다 (알려진 한계).
 */

type MdNode = {
  type: string;
  depth?: number;
  value?: string;
  url?: string;
  ordered?: boolean;
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

/* 문장 안의 ^[내용] 을 찾아 각주로 바꾼다 */
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
        else out.push(...children);
        break;
      }
      case "break":
        out.push(" ");
        break;
      default:
        if (node.children) out.push(...toInline(node.children, footnotes));
        else if (node.value) out.push(node.value);
    }
  }
  return out;
}

/* 리스트 항목: 첫 문단은 내용, 나머지 블록(중첩 리스트 등)은 nested */
function toListItem(node: MdNode, footnotes: string[]): WikiListItem {
  const kids = node.children ?? [];
  const first = kids[0];
  const content = first && first.type === "paragraph" ? toInline(first.children, footnotes) : [];
  const rest = first && first.type === "paragraph" ? kids.slice(1) : kids;
  const nested = toBlocks(rest, footnotes);
  return nested.length > 0 ? { content, nested } : { content };
}

/* 블록 노드들을 위키 블록으로 바꾼다. 처리하지 않는 블록은 버린다. */
function toBlocks(nodes: MdNode[], footnotes: string[]): WikiBlock[] {
  const out: WikiBlock[] = [];
  for (const node of nodes) {
    switch (node.type) {
      case "paragraph":
        out.push({ type: "p", children: toInline(node.children, footnotes) });
        break;
      case "list":
        out.push({
          type: "list",
          ordered: Boolean(node.ordered),
          items: (node.children ?? []).map((li) => toListItem(li, footnotes)),
        });
        break;
      case "blockquote":
        out.push({ type: "quote", children: toBlocks(node.children ?? [], footnotes) });
        break;
      case "thematicBreak":
        out.push({ type: "hr" });
        break;
      default:
        // 아직 처리하지 않는 블록(코드, 표, 이미지 등)은 버린다
        break;
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

const BLOCK_TYPES = new Set(["paragraph", "list", "blockquote", "thematicBreak"]);

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
      const section: WikiSection = { title: plainText(node.children), blocks: [] };
      stack.length = Math.min(stack.length, level);
      if (level === 0) root.push(section);
      else {
        const parent = stack[level - 1];
        parent.children = [...(parent.children ?? []), section];
      }
      stack[level] = section;
      continue;
    }

    if (BLOCK_TYPES.has(node.type)) {
      const target = stack[stack.length - 1];
      if (!target) continue;
      target.blocks.push(...toBlocks([node], footnotes));
    }
  }

  return { sections: root, footnotes };
}

/* 문단 구조만 필요할 때 */
export function parseWikiSections(markdown: string): WikiSection[] {
  return parseWiki(markdown).sections;
}
