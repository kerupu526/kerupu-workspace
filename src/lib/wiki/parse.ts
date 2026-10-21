import { unified } from "unified";
import remarkParse from "remark-parse";
import { toString } from "mdast-util-to-string";
import type { WikiSection } from "@/components/WikiDocument";

/*
 * 위키 마크다운 파서 (1단계: 문단 제목과 본문 문단만).
 * 설계는 docs/wiki-syntax.md 참고. 아직 굵게·링크·각주 등은 글자로만 옮긴다.
 *
 * 규칙
 *   - ## 부터 문단 제목. ##이 1단계, ###이 2단계 ... ######이 5단계.
 *   - # (1단계 제목)은 문서 제목 자리라서 본문에서 무시한다.
 *   - 제목 아래 문단은 그 제목의 본문이 된다.
 */

type MdNode = {
  type: string;
  depth?: number;
  children?: MdNode[];
  value?: string;
};

const processor = unified().use(remarkParse);

export function parseWikiSections(markdown: string): WikiSection[] {
  const tree = processor.parse(markdown) as MdNode;
  const root: WikiSection[] = [];
  // 현재 열린 문단 스택: stack[i]는 (i+1)단계 문단
  const stack: WikiSection[] = [];

  for (const node of tree.children ?? []) {
    if (node.type === "heading" && node.depth !== undefined) {
      if (node.depth < 2) continue; // # 은 문서 제목 자리
      const level = node.depth - 2; // ## -> 0
      const section: WikiSection = { title: toString(node), paragraphs: [] };
      // 같은 단계 또는 더 깊은 단계는 닫는다
      stack.length = Math.min(stack.length, level);
      if (level === 0) root.push(section);
      else stack[level - 1].children = [...(stack[level - 1].children ?? []), section];
      stack[level] = section;
      continue;
    }

    if (node.type === "paragraph") {
      const text = toString(node);
      const target = stack[stack.length - 1];
      if (!target) continue; // 첫 제목 전의 글은 아직 둘 곳이 없다 (1차에서는 버림)
      target.paragraphs.push([text]);
    }
  }

  return root;
}
