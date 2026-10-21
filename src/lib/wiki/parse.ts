import { unified } from "unified";
import remarkParse from "remark-parse";
import remarkGfm from "remark-gfm";
import type { WikiBlock, WikiInline, WikiListItem, WikiSection } from "@/components/WikiDocument";
import { sanitizeStyle, toReactStyle } from "./css.ts";

/*
 * 위키 마크다운 파서 (5단계: 문단, 리스트, 인용문, 수평줄, 인라인 서식, 링크, 각주, 표, 이미지, CSS 블록).
 * 설계는 docs/wiki-syntax.md 참고.
 *
 * 규칙
 *   - ## 부터 문단 제목. ##이 1단계, ###이 2단계 ... ######이 5단계.
 *   - # (1단계 제목)은 문서 제목 자리라서 본문에서 무시한다.
 *   - 제목 아래 블록은 그 제목의 본문이 된다. 첫 제목 전의 글은 버린다.
 *   - 블록: 문단, 순서 없는/있는 리스트(중첩 가능), 인용문(중첩 가능), 수평줄, 표, 이미지(문단 하나에 단독).
 *   - 인라인: **굵게**, *기울임*, ~~취소선~~, `코드`, [글](주소), ^[각주].
 *   - 링크 주소는 /, #, https:// 로 시작하는 것만 허용한다. 나머지는 글자로만 남긴다.
 *   - 처리하지 않는 블록(코드 블록 등)은 버린다.
 *   - CSS 블록(:::style 선언 ::: 내용 :::)은 마크다운 파서가 모르는 문법이라서 파싱 전에 줄 단위로 먼저 떼어 낸다.
 *     떼어 낸 자리에는 자리표시 문단을 남기고, 그 문단을 만났을 때 안쪽 글을 따로 파싱한다
 *     (각주 번호가 문서 순서대로 이어지도록 같은 목록을 쓴다).
 *       - 선언은 css.ts 의 허용 목록으로 거른다. 버린 선언은 warnings 에 담는다 (읽기 화면에는 보이지 않는다).
 *       - 닫지 않은 블록과, 코드 블록 안의 :::style 은 그냥 글자로 둔다.
 *       - 블록 안에 :::style 이 또 있으면 중첩으로 보지 않고 글자로 둔다. 안쪽의 ::: 가 바깥 블록을 닫는다.
 *       - 블록 안의 제목(##)은 쓸 수 없다. 제목은 버리고 warnings 에 남긴다 (문단 구조는 블록 밖에서만 만든다).
 *       - 블록은 어떤 문단 아래에 있어야 문서에 남는다 (첫 제목 전의 글은 버린다는 규칙 그대로).
 *   - 각주 내용이 굵게 같은 서식을 가로지르면 각주로 인식하지 못한다 (알려진 한계).
 */

type MdNode = {
  type: string;
  depth?: number;
  value?: string;
  url?: string;
  alt?: string | null;
  ordered?: boolean;
  align?: (string | null)[];
  children?: MdNode[];
};

/* 표와 이미지의 제한 (docs/wiki-syntax.md 5장) */
const TABLE_MAX_COLS = 12;
const TABLE_MAX_ROWS = 300;

/* 이미지 주소는 사이트에 올린 파일만 허용한다 */
export function isSafeImageSrc(src: string): boolean {
  return src.startsWith("/uploads/") && !src.includes("..");
}

export interface ParsedWiki {
  sections: WikiSection[];
  footnotes: string[];
  /** 편집 화면에 보여 줄 경고 (버린 CSS 선언 등). 읽기 화면에서는 쓰지 않는다. */
  warnings: string[];
}

interface StyleBlockSource {
  declarations: string;
  content: string;
}

/* 파싱 중에 함께 끌고 다니는 것들 */
interface Ctx {
  footnotes: string[];
  warnings: string[];
  styled: StyleBlockSource[];
}

/* CSS 블록 자리에 남기는 문단에 쓰는 글자 (사용자 글에서는 먼저 지운다) */
const SENTINEL = "";
const SENTINEL_PATTERN = new RegExp(`^${SENTINEL}(\\d+)${SENTINEL}$`);

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
      case "image":
        // 문장 안의 이미지는 그림 대신 설명 글자로 남긴다 (그림은 문단 하나에 단독으로 쓴다)
        if (node.alt) out.push(node.alt);
        break;
      default:
        if (node.children) out.push(...toInline(node.children, footnotes));
        else if (node.value) out.push(node.value);
    }
  }
  return out;
}

/* 리스트 항목: 첫 문단은 내용, 나머지 블록(중첩 리스트 등)은 nested */
function toListItem(node: MdNode, ctx: Ctx): WikiListItem {
  const kids = node.children ?? [];
  const first = kids[0];
  const content = first && first.type === "paragraph" ? toInline(first.children, ctx.footnotes) : [];
  const rest = first && first.type === "paragraph" ? kids.slice(1) : kids;
  const nested = toBlocks(rest, ctx);
  return nested.length > 0 ? { content, nested } : { content };
}

/* 표: 열 12개, 행 300개를 넘으면 표 전체를 버린다 */
function toTable(node: MdNode, footnotes: string[]): WikiBlock | null {
  const rows = node.children ?? [];
  const cols = Math.max(0, ...rows.map((r) => (r.children ?? []).length));
  if (cols === 0 || cols > TABLE_MAX_COLS || rows.length > TABLE_MAX_ROWS) return null;
  const cells = rows.map((r) => (r.children ?? []).map((c) => toInline(c.children, footnotes)));
  const align = Array.from({ length: cols }, (_, i) => {
    const a = node.align?.[i];
    return a === "left" || a === "center" || a === "right" ? a : null;
  });
  const [head, ...body] = cells;
  return { type: "table", align, head: head ?? [], rows: body };
}

/* 블록 노드들을 위키 블록으로 바꾼다. 처리하지 않는 블록은 버린다. */
function toBlocks(nodes: MdNode[], ctx: Ctx): WikiBlock[] {
  const out: WikiBlock[] = [];
  for (const node of nodes) {
    switch (node.type) {
      case "paragraph": {
        const only = node.children?.length === 1 ? node.children[0] : undefined;

        // CSS 블록이 있던 자리 (자리표시 문단)
        const marker = only?.type === "text" ? SENTINEL_PATTERN.exec(only.value ?? "") : null;
        if (marker) {
          const styled = toStyleBlock(ctx.styled[Number(marker[1])], ctx);
          if (styled) out.push(...styled);
          break;
        }

        // 문단이 이미지 하나뿐이면 그림 블록으로 바꾼다
        if (only && only.type === "image" && only.url && isSafeImageSrc(only.url)) {
          out.push({ type: "image", src: only.url, alt: only.alt || fileName(only.url) });
          break;
        }
        out.push({ type: "p", children: toInline(node.children, ctx.footnotes) });
        break;
      }
      case "table": {
        const table = toTable(node, ctx.footnotes);
        if (table) out.push(table);
        break;
      }
      case "list":
        out.push({
          type: "list",
          ordered: Boolean(node.ordered),
          items: (node.children ?? []).map((li) => toListItem(li, ctx)),
        });
        break;
      case "blockquote":
        out.push({ type: "quote", children: toBlocks(node.children ?? [], ctx) });
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

/* CSS 블록 하나를 위키 블록으로 바꾼다. 통과한 선언이 없으면 감싸지 않고 안쪽 블록만 남긴다. */
function toStyleBlock(source: StyleBlockSource | undefined, ctx: Ctx): WikiBlock[] | null {
  if (!source) return null;
  const { style, dropped } = sanitizeStyle(source.declarations);
  for (const declaration of dropped) {
    ctx.warnings.push(`CSS 블록: "${declaration}" 선언은 허용되지 않아 버렸습니다.`);
  }

  const children: WikiBlock[] = [];
  const inner = processor.parse(source.content) as MdNode;
  for (const node of inner.children ?? []) {
    if (node.type === "heading") {
      ctx.warnings.push(`CSS 블록 안에서는 제목을 쓸 수 없어 버렸습니다: "${plainText(node.children)}"`);
    } else if (BLOCK_TYPES.has(node.type)) {
      children.push(...toBlocks([node], ctx));
    }
  }

  if (Object.keys(style).length === 0) return children;
  if (children.length === 0) return [];
  return [{ type: "style", style: toReactStyle(style), children }];
}

/* 줄 하나가 ::: 뿐인지 (닫는 줄) */
function findClosing(lines: string[], from: number): number {
  for (let i = from; i < lines.length; i += 1) {
    if (/^:::[ \t]*$/.test(lines[i])) return i;
  }
  return -1;
}

/*
 * :::style 블록을 줄 단위로 떼어 낸다.
 *   :::style / 선언들 / ::: / 내용 / :::
 * 코드 블록(``` 나 ~~~) 안은 건드리지 않는다. 짝이 안 맞으면 그대로 둔다.
 */
function extractStyleBlocks(markdown: string): { text: string; blocks: StyleBlockSource[] } {
  const lines = markdown.replaceAll(SENTINEL, "").split(/\r?\n/);
  const out: string[] = [];
  const blocks: StyleBlockSource[] = [];
  let fence: string | null = null;

  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i];
    const fenceMatch = /^ {0,3}(`{3,}|~{3,})/.exec(line);

    if (fence) {
      if (fenceMatch && fenceMatch[1][0] === fence[0] && fenceMatch[1].length >= fence.length) fence = null;
      out.push(line);
      continue;
    }
    if (fenceMatch) {
      fence = fenceMatch[1];
      out.push(line);
      continue;
    }

    if (/^:::style[ \t]*$/.test(line)) {
      const declarationsEnd = findClosing(lines, i + 1);
      const contentEnd = declarationsEnd < 0 ? -1 : findClosing(lines, declarationsEnd + 1);
      if (contentEnd >= 0) {
        blocks.push({
          declarations: lines.slice(i + 1, declarationsEnd).join("\n"),
          content: lines.slice(declarationsEnd + 1, contentEnd).join("\n"),
        });
        // 앞뒤에 빈 줄을 둬서 자리표시가 독립된 문단이 되게 한다
        out.push("", `${SENTINEL}${blocks.length - 1}${SENTINEL}`, "");
        i = contentEnd;
        continue;
      }
    }
    out.push(line);
  }

  return { text: out.join("\n"), blocks };
}

/* 주소에서 파일 이름만 꺼낸다 (설명이 없을 때 대신 쓴다) */
function fileName(src: string): string {
  return src.split("/").pop() ?? src;
}

/* 제목 글자(평문) */
function plainText(nodes: MdNode[] = []): string {
  return nodes
    .map((n) => (n.value !== undefined ? n.value : plainText(n.children)))
    .join("");
}

const BLOCK_TYPES = new Set(["paragraph", "list", "blockquote", "thematicBreak", "table"]);

export function parseWiki(markdown: string): ParsedWiki {
  const { text, blocks } = extractStyleBlocks(markdown);
  const tree = processor.parse(text) as MdNode;
  const footnotes: string[] = [];
  const ctx: Ctx = { footnotes, warnings: [], styled: blocks };
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
      target.blocks.push(...toBlocks([node], ctx));
    }
  }

  return { sections: root, footnotes, warnings: ctx.warnings };
}

/* 문단 구조만 필요할 때 */
export function parseWikiSections(markdown: string): WikiSection[] {
  return parseWiki(markdown).sections;
}
