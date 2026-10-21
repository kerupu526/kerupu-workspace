import { unified } from "unified";
import remarkParse from "remark-parse";
import remarkGfm from "remark-gfm";
import type { WikiBlock, WikiInline, WikiListItem, WikiSection } from "@/components/WikiDocument";
import { sanitizeStyle, toReactStyle } from "./css.ts";
import { extractMeta, stripCommentsMapped, type WikiMeta } from "./meta.ts";
import { extractFootnotes, restoreFootnoteText, splitFootnoteMarks, type RawFootnote } from "./footnote.ts";

/*
 * 위키 마크다운 파서 (6단계: 문단, 리스트, 인용문, 수평줄, 인라인 서식, 링크, 각주, 표, 이미지, CSS 블록,
 * 메타 블록, 목차, 주석).
 * 설계는 docs/wiki-syntax.md 참고.
 *
 * 처리 순서: 주석 지우기 → 메타 블록 → 각주 → CSS 블록 떼어 내기 → 마크다운 파싱 → 블록 변환
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
 *   - 메타 블록(분류, 정보, 이미지)과 주석(%%)의 규칙은 meta.ts 머리말에 있다. 메타 블록의 경고도 warnings 에 담는다.
 *   - 목차: 한 줄에 [toc] 만 있는 문단(맨 바깥 단계)은 그 자리에 목차가 나오는 toc 블록이 된다.
 *       - 문서에서 처음 나온 하나만 쓰고, 나머지는 버리며 warnings 에 남긴다 (목차 id 가 겹치지 않게).
 *       - 첫 제목 전에 쓴 [toc] 는 lead 에 담긴다 (첫 제목 전의 글은 버리지만 목차 자리는 남긴다).
 *       - 인용문, 리스트, CSS 블록 안의 [toc] 는 목차가 아니라 글자로 남는다. \[toc] 도 글자다.
 *   - 각주 ^[내용]: 파싱 전에 원문에서 떼어 낸다 (footnote.ts 머리말 참고). 안쪽의 [ ] 는 짝이 맞으면 내용이고,
 *     짝이 안 맞는 괄호는 [ ] 로 쓴다. 번호는 문서에 실제로 나온 순서대로 매긴다.
 *     제목, 링크 주소, 이미지 설명 안의 각주 표시는 각주가 되지 않고 원문 글자로 되돌린다.
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
  position?: { start: { line?: number; offset?: number }; end: { line?: number; offset?: number } };
};

/*
 * 제한 값 (docs/wiki-syntax.md 5장). 넘으면 문서를 거부하지 않고, 넘친 부분만 버리거나 풀어서 남기고
 * warnings 에 이유를 적는다. (선언 20개는 css.ts, 분류 20개와 정보 30행은 meta.ts 에 있다.)
 *   - 본문 길이: 넘는 뒤쪽을 자른다 (마지막 줄바꿈 기준).
 *   - 각주: 200개를 넘는 것은 각주로 만들지 않고 원문 글자로 둔다.
 *   - 이미지: 50개를 넘는 그림은 설명 글자만 남긴다.
 *   - 인용문 3단계, 리스트 4단계를 넘는 중첩은 껍데기를 벗기고 안의 내용만 남긴다.
 *   - 표: 열 12개, 행 300개를 넘으면 표 전체를 버린다.
 */
export const LIMITS = {
  bodyLength: 100_000,
  footnotes: 200,
  images: 50,
  quoteDepth: 3,
  listDepth: 4,
  tableCols: 12,
  tableRows: 300,
} as const;

/* 이미지 주소는 사이트에 올린 파일만 허용한다 */
export function isSafeImageSrc(src: string): boolean {
  return src.startsWith("/uploads/") && !src.includes("..");
}

/** 편집 화면용 경고 하나. line 은 원문의 줄(1부터)이고, 어느 줄인지 모를 때는 없다. */
export interface Diagnostic {
  message: string;
  line?: number;
}

export interface ParsedWiki {
  sections: WikiSection[];
  footnotes: string[];
  /** 편집 화면에 보여 줄 경고 (버린 CSS 선언 등). 읽기 화면에서는 쓰지 않는다. */
  warnings: string[];
  /** warnings 와 같은 내용에 줄 번호를 붙인 것 (같은 순서) */
  diagnostics: Diagnostic[];
  /** 메타 블록의 분류와 정보 상자 */
  meta: WikiMeta;
  /** 첫 제목 전에 쓴 [toc] (있으면 toc 블록 하나). 문서 본문 맨 앞에 놓는다. */
  lead: WikiBlock[];
}

interface StyleBlockSource {
  declarations: string;
  content: string;
  /** 선언 글의 각 줄이 원문 몇 번째 줄(0부터)인지 */
  declarationLines: number[];
  /** 안쪽 글의 각 줄이 원문 몇 번째 줄(0부터)인지 */
  contentLines: number[];
}

/* 파싱 중에 함께 끌고 다니는 것들 */
interface Ctx {
  /** 문서에 실제로 나온 각주의 내용 (1번부터 순서대로) */
  footnotes: string[];
  /** 원문에서 떼어 낸 각주 전부 (표시의 번호가 이 목록의 위치다) */
  notes: RawFootnote[];
  warnings: string[];
  styled: StyleBlockSource[];
  /** 지금까지 만든 이미지 블록 수 */
  images: number;
  /** 지금 들어와 있는 인용문, 리스트 중첩 단계 */
  quoteDepth: number;
  listDepth: number;
  /** 같은 종류의 경고를 한 번만 남기기 위한 목록 */
  warned: Set<string>;
  /** 경고와 그 줄 (warnings 와 같은 순서) */
  diagnostics: Diagnostic[];
  /** 지금 읽는 마크다운 글의 각 줄이 원문 몇 번째 줄(0부터)인지 */
  lineMap: number[];
  /** 지금 처리 중인 블록이 있는 원문의 줄(1부터) */
  line: number | undefined;
}

/* 경고를 남긴다. line 은 원문의 줄(1부터). 생략하면 지금 처리 중인 블록의 줄이다. */
function warn(ctx: Ctx, message: string, line: number | undefined = ctx.line) {
  ctx.warnings.push(message);
  ctx.diagnostics.push(line === undefined ? { message } : { message, line });
}

function warnOnce(ctx: Ctx, key: string, message: string) {
  if (ctx.warned.has(key)) return;
  ctx.warned.add(key);
  warn(ctx, message);
}

/* 마크다운 노드가 원문의 몇 번째 줄(1부터)인지 */
function lineOf(node: MdNode, ctx: Ctx): number | undefined {
  const line = node.position?.start.line;
  const original = line === undefined ? undefined : ctx.lineMap[line - 1];
  return original === undefined ? undefined : original + 1;
}

/* CSS 블록 자리에 남기는 문단에 쓰는 글자 (사용자 글에서는 먼저 지운다) */
const SENTINEL = "";
const SENTINEL_PATTERN = new RegExp(`^${SENTINEL}(\\d+)${SENTINEL}$`);

const processor = unified().use(remarkParse).use(remarkGfm);

/* 허용하는 링크 주소인지 */
export function isSafeHref(href: string): boolean {
  return href.startsWith("/") || href.startsWith("#") || /^https:\/\//.test(href);
}

/* 글 속의 각주 표시를 각주로 바꾼다. 번호는 표시를 만난 순서대로 새로 매긴다. */
function splitFootnotes(text: string, ctx: Ctx): WikiInline[] {
  return splitFootnoteMarks(text).map((piece) => {
    if (typeof piece === "string") return piece;
    if (ctx.footnotes.length >= LIMITS.footnotes) {
      warnOnce(ctx, "footnotes", `각주는 ${LIMITS.footnotes}개까지만 쓸 수 있어 그 뒤의 각주는 글자로 남겼습니다.`);
      return ctx.notes[piece.note]?.source ?? "";
    }
    ctx.footnotes.push(ctx.notes[piece.note]?.content ?? "");
    return { footnote: ctx.footnotes.length };
  });
}

/* 마크다운 조각들을 위키 인라인 조각으로 바꾼다 */
function toInline(nodes: MdNode[] = [], ctx: Ctx): WikiInline[] {
  const out: WikiInline[] = [];
  for (const node of nodes) {
    switch (node.type) {
      case "text":
        out.push(...splitFootnotes(node.value ?? "", ctx));
        break;
      case "strong":
        out.push({ strong: toInline(node.children, ctx) });
        break;
      case "emphasis":
        out.push({ em: toInline(node.children, ctx) });
        break;
      case "delete":
        out.push({ del: toInline(node.children, ctx) });
        break;
      case "inlineCode":
        out.push({ code: node.value ?? "" });
        break;
      case "link": {
        const children = toInline(node.children, ctx);
        const href = restoreFootnoteText(node.url ?? "", ctx.notes);
        if (isSafeHref(href)) out.push({ link: { href, children } });
        else out.push(...children);
        break;
      }
      case "break":
        out.push(" ");
        break;
      case "image":
        // 문장 안의 이미지는 그림 대신 설명 글자로 남긴다 (그림은 문단 하나에 단독으로 쓴다)
        if (node.alt) out.push(restoreFootnoteText(node.alt, ctx.notes));
        break;
      default:
        if (node.children) out.push(...toInline(node.children, ctx));
        else if (node.value) out.push(...splitFootnotes(node.value, ctx));
    }
  }
  return out;
}

/* 리스트 항목: 첫 문단은 내용, 나머지 블록(중첩 리스트 등)은 nested */
function toListItem(node: MdNode, ctx: Ctx): WikiListItem {
  const kids = node.children ?? [];
  const first = kids[0];
  const content = first && first.type === "paragraph" ? toInline(first.children, ctx) : [];
  const rest = first && first.type === "paragraph" ? kids.slice(1) : kids;
  const nested = toBlocks(rest, ctx);
  return nested.length > 0 ? { content, nested } : { content };
}

/* 표: 열 12개, 행 300개를 넘으면 표 전체를 버린다 */
function toTable(node: MdNode, ctx: Ctx): WikiBlock | null {
  const rows = node.children ?? [];
  const cols = Math.max(0, ...rows.map((r) => (r.children ?? []).length));
  if (cols > LIMITS.tableCols || rows.length > LIMITS.tableRows) {
    warn(
      ctx,
      `표는 열 ${LIMITS.tableCols}개, 행 ${LIMITS.tableRows}개까지만 쓸 수 있어 표를 버렸습니다 (열 ${cols}개, 행 ${rows.length}개).`,
    );
    return null;
  }
  if (cols === 0) return null;
  const cells = rows.map((r) => (r.children ?? []).map((c) => toInline(c.children, ctx)));
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
    ctx.line = lineOf(node, ctx) ?? ctx.line;
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
        const imageSrc = only?.type === "image" && only.url ? restoreFootnoteText(only.url, ctx.notes) : "";
        if (only && imageSrc && isSafeImageSrc(imageSrc)) {
          const alt = restoreFootnoteText(only.alt ?? "", ctx.notes) || fileName(imageSrc);
          if (ctx.images >= LIMITS.images) {
            warnOnce(ctx, "images", `이미지는 ${LIMITS.images}개까지만 쓸 수 있어 그 뒤의 그림은 설명 글자만 남겼습니다.`);
            out.push({ type: "p", children: [alt] });
          } else {
            ctx.images += 1;
            out.push({ type: "image", src: imageSrc, alt });
          }
          break;
        }
        out.push({ type: "p", children: toInline(node.children, ctx) });
        break;
      }
      case "table": {
        const table = toTable(node, ctx);
        if (table) out.push(table);
        break;
      }
      case "list": {
        const tooDeep = ctx.listDepth >= LIMITS.listDepth;
        if (tooDeep) {
          warnOnce(ctx, "list", `리스트는 ${LIMITS.listDepth}단계까지만 중첩할 수 있어 더 깊은 항목은 문단으로 풀었습니다.`);
        }
        ctx.listDepth += 1;
        const items = (node.children ?? []).map((li) => toListItem(li, ctx));
        ctx.listDepth -= 1;
        if (tooDeep) {
          for (const item of items) {
            out.push({ type: "p", children: item.content });
            if (item.nested) out.push(...item.nested);
          }
        } else {
          out.push({ type: "list", ordered: Boolean(node.ordered), items });
        }
        break;
      }
      case "blockquote": {
        const tooDeep = ctx.quoteDepth >= LIMITS.quoteDepth;
        if (tooDeep) {
          warnOnce(ctx, "quote", `인용문은 ${LIMITS.quoteDepth}단계까지만 중첩할 수 있어 더 깊은 인용 표시는 없앴습니다.`);
        }
        ctx.quoteDepth += 1;
        const children = toBlocks(node.children ?? [], ctx);
        ctx.quoteDepth -= 1;
        if (tooDeep) out.push(...children);
        else out.push({ type: "quote", children });
        break;
      }
      case "html":
        // HTML 은 쓸 수 없다. 태그를 해석하지 않고 쓴 그대로 글자로 보여 준다 (docs/wiki-syntax.md 1장 3번).
        out.push({ type: "p", children: splitFootnotes(node.value ?? "", ctx) });
        break;
      case "thematicBreak":
        out.push({ type: "hr" });
        break;
      default:
        // 처리하지 않는 블록(코드 등)은 버린다
        warnDropped(node, ctx);
        break;
    }
  }
  return out;
}

/* 버리는 블록 중 작성자가 알아야 할 것만 경고한다 */
function warnDropped(node: MdNode, ctx: Ctx) {
  if (node.type === "code") warnOnce(ctx, "code", "코드 블록은 지원하지 않아 버렸습니다.");
  else if (node.type === "footnoteDefinition") {
    warnOnce(ctx, "footnoteDefinition", "[^1]: 형식의 각주는 쓸 수 없어 버렸습니다. 본문에 ^[내용] 으로 씁니다.");
  }
}

/* CSS 블록 하나를 위키 블록으로 바꾼다. 통과한 선언이 없으면 감싸지 않고 안쪽 블록만 남긴다. */
function toStyleBlock(source: StyleBlockSource | undefined, ctx: Ctx): WikiBlock[] | null {
  if (!source) return null;
  const { style, dropped, droppedAt } = sanitizeStyle(source.declarations);
  dropped.forEach((declaration, k) => {
    const original = source.declarationLines[droppedAt[k]];
    warn(ctx, `CSS 블록: "${declaration}" 선언은 허용되지 않아 버렸습니다.`, original === undefined ? ctx.line : original + 1);
  });

  // 안쪽 글은 따로 파싱하므로 줄 번호도 안쪽 글의 지도로 바꿔서 읽는다
  const outerMap = ctx.lineMap;
  const outerLine = ctx.line;
  ctx.lineMap = source.contentLines;
  const children: WikiBlock[] = [];
  const inner = processor.parse(source.content) as MdNode;
  for (const node of inner.children ?? []) {
    ctx.line = lineOf(node, ctx) ?? outerLine;
    if (node.type === "heading") {
      warn(ctx, `CSS 블록 안에서는 제목을 쓸 수 없어 버렸습니다: "${plainText(node.children, ctx.notes)}"`);
    } else if (BLOCK_TYPES.has(node.type)) {
      children.push(...toBlocks([node], ctx));
    } else {
      warnDropped(node, ctx);
    }
  }
  ctx.lineMap = outerMap;
  ctx.line = outerLine;

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
function extractStyleBlocks(markdown: string): { text: string; blocks: StyleBlockSource[]; lineMap: number[] } {
  const lines = markdown.replaceAll(SENTINEL, "").split(/\r?\n/);
  const out: string[] = [];
  const lineMap: number[] = []; // 결과의 각 줄이 입력의 몇 번째 줄(0부터)이었는지
  const blocks: StyleBlockSource[] = [];
  let fence: string | null = null;

  const range = (from: number, to: number) => Array.from({ length: Math.max(0, to - from) }, (_, k) => from + k);

  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i];
    const fenceMatch = /^ {0,3}(`{3,}|~{3,})/.exec(line);

    if (fence) {
      if (fenceMatch && fenceMatch[1][0] === fence[0] && fenceMatch[1].length >= fence.length) fence = null;
      out.push(line);
      lineMap.push(i);
      continue;
    }
    if (fenceMatch) {
      fence = fenceMatch[1];
      out.push(line);
      lineMap.push(i);
      continue;
    }

    if (/^:::style[ \t]*$/.test(line)) {
      const declarationsEnd = findClosing(lines, i + 1);
      const contentEnd = declarationsEnd < 0 ? -1 : findClosing(lines, declarationsEnd + 1);
      if (contentEnd >= 0) {
        blocks.push({
          declarations: lines.slice(i + 1, declarationsEnd).join("\n"),
          content: lines.slice(declarationsEnd + 1, contentEnd).join("\n"),
          declarationLines: range(i + 1, declarationsEnd),
          contentLines: range(declarationsEnd + 1, contentEnd),
        });
        // 앞뒤에 빈 줄을 둬서 자리표시가 독립된 문단이 되게 한다
        out.push("", `${SENTINEL}${blocks.length - 1}${SENTINEL}`, "");
        lineMap.push(i, i, i);
        i = contentEnd;
        continue;
      }
    }
    out.push(line);
    lineMap.push(i);
  }

  return { text: out.join("\n"), blocks, lineMap };
}

/* 문단이 [toc] 한 줄뿐인지. 원문을 보고 판단해서 \[toc] 처럼 이스케이프한 것은 글자로 남긴다. */
function isTocParagraph(node: MdNode, source: string): boolean {
  const start = node.position?.start.offset;
  const end = node.position?.end.offset;
  if (start === undefined || end === undefined) return false;
  return source.slice(start, end).trim().toLowerCase() === "[toc]";
}

/* 주소에서 파일 이름만 꺼낸다 (설명이 없을 때 대신 쓴다) */
function fileName(src: string): string {
  return src.split("/").pop() ?? src;
}

/* 제목 글자(평문) */
function plainText(nodes: MdNode[] = [], notes: RawFootnote[]): string {
  return restoreFootnoteText(
    nodes.map((n) => (n.value !== undefined ? n.value : plainText(n.children, notes))).join(""),
    notes,
  );
}

const BLOCK_TYPES = new Set(["paragraph", "list", "blockquote", "thematicBreak", "table", "html"]);

export function parseWiki(markdown: string): ParsedWiki {
  const early: Diagnostic[] = [];
  let source = markdown;
  if (source.length > LIMITS.bodyLength) {
    const cut = source.lastIndexOf("\n", LIMITS.bodyLength);
    source = source.slice(0, cut > 0 ? cut : LIMITS.bodyLength);
    // 잘린 곳이 몇 번째 줄인지 알려 준다
    early.push({
      message: `문서가 ${LIMITS.bodyLength.toLocaleString("en-US")}자를 넘어 뒤쪽을 잘랐습니다.`,
      line: source.split("\n").length + 1,
    });
  }

  // 파싱 전 단계마다 "결과의 이 줄은 앞 단계 글의 몇 번째 줄이었나"를 돌려받아 이어 붙이면,
  // 마지막 글의 줄 번호를 원문의 줄 번호로 되돌릴 수 있다 (모두 0부터 센다).
  const stripped = stripCommentsMapped(source);
  const withoutMeta = extractMeta(stripped.text, isSafeImageSrc);
  const afterMeta = stripped.lineMap.slice(withoutMeta.removedLines);
  const withNotes = extractFootnotes(withoutMeta.text);
  const afterNotes = withNotes.lineMap.map((i) => afterMeta[i]);
  const extracted = extractStyleBlocks(withNotes.text);
  const { text, blocks } = extracted;
  const lineMap = extracted.lineMap.map((i) => afterNotes[i]);
  const toOriginal = (map: number[]) => (lines: number[]) => lines.map((i) => map[i]);
  const originalOf = toOriginal(afterNotes);
  for (const block of blocks) {
    block.declarationLines = originalOf(block.declarationLines);
    block.contentLines = originalOf(block.contentLines);
  }

  const diagnostics: Diagnostic[] = [
    ...early,
    ...withoutMeta.diagnostics.map((d) => ({ message: d.message, line: stripped.lineMap[d.line] + 1 })),
    ...withNotes.diagnostics.map((d) => ({ message: d.message, line: afterMeta[d.line] + 1 })),
  ];

  const tree = processor.parse(text) as MdNode;
  const footnotes: string[] = [];
  const ctx: Ctx = {
    footnotes,
    notes: withNotes.notes,
    warnings: diagnostics.map((d) => d.message),
    diagnostics,
    styled: blocks,
    images: 0,
    quoteDepth: 0,
    listDepth: 0,
    warned: new Set(),
    lineMap,
    line: undefined,
  };
  const root: WikiSection[] = [];
  const lead: WikiBlock[] = [];
  let tocSeen = false;
  // stack[i]는 (i+1)단계 문단
  const stack: WikiSection[] = [];

  for (const node of tree.children ?? []) {
    ctx.line = lineOf(node, ctx);
    if (node.type === "paragraph" && isTocParagraph(node, text)) {
      if (tocSeen) {
        warn(ctx, "[toc] 는 한 번만 쓸 수 있어 두 번째부터 버렸습니다.");
      } else {
        tocSeen = true;
        const target = stack[stack.length - 1];
        (target ? target.blocks : lead).push({ type: "toc" });
      }
      continue;
    }

    if (node.type === "heading" && node.depth !== undefined) {
      if (node.depth < 2) {
        // # 은 문서 제목 자리
        warnOnce(ctx, "h1", "# 제목은 문서 제목 자리라서 본문에서 버렸습니다. 문단 제목은 ## 부터 씁니다.");
        continue;
      }
      // ## 다음에 바로 #### 처럼 단계를 건너뛰면 가장 가까운 윗단계 아래에 둔다
      const level = Math.min(node.depth - 2, stack.length); // ## -> 0
      const section: WikiSection = { title: plainText(node.children, ctx.notes), blocks: [] };
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
      if (!target) {
        warnOnce(ctx, "lead", "첫 문단 제목(##) 앞의 글은 문서에 나오지 않아 버렸습니다.");
        continue;
      }
      target.blocks.push(...toBlocks([node], ctx));
    } else {
      warnDropped(node, ctx);
    }
  }

  return { sections: root, footnotes, warnings: ctx.warnings, diagnostics: ctx.diagnostics, meta: withoutMeta.meta, lead };
}

/* 문단 구조만 필요할 때 */
export function parseWikiSections(markdown: string): WikiSection[] {
  return parseWiki(markdown).sections;
}
