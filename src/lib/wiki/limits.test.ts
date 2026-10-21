import { test } from "node:test";
import assert from "node:assert/strict";
import { LIMITS, parseWiki } from "./parse.ts";
import type { WikiBlock } from "../../components/WikiDocument.tsx";

const blocksOf = (md: string) => parseWiki(md).sections[0].blocks;
const match = (warnings: string[], pattern: RegExp) => warnings.filter((w) => pattern.test(w));

test("제한 값은 설계 문서 5장과 같다", () => {
  assert.deepEqual(LIMITS, {
    bodyLength: 100_000,
    footnotes: 200,
    images: 50,
    quoteDepth: 3,
    listDepth: 4,
    tableCols: 12,
    tableRows: 300,
  });
});

test("본문이 10만 자를 넘으면 마지막 줄바꿈에서 자르고 경고한다", () => {
  const line = "가".repeat(99);
  const lines = Array.from({ length: 1100 }, () => line); // 줄당 100자(줄바꿈 포함)
  const parsed = parseWiki(`## 개요\n${lines.join("\n")}\n끝 줄`);
  assert.equal(match(parsed.warnings, /100,000자/).length, 1);
  const text = JSON.stringify(parsed.sections[0].blocks);
  assert.ok(!text.includes("끝 줄"));
  assert.ok(text.includes(line));
});

test("10만 자 이하는 자르지 않는다", () => {
  const parsed = parseWiki(`## 개요\n${"가".repeat(50_000)}\n끝 줄`);
  assert.equal(parsed.warnings.length, 0);
  assert.ok(JSON.stringify(parsed.sections[0].blocks).includes("끝 줄"));
});

test("줄바꿈이 없는 아주 긴 글도 자른다", () => {
  const parsed = parseWiki(`## 개요\n${"가".repeat(LIMITS.bodyLength + 10)}`);
  assert.equal(match(parsed.warnings, /100,000자/).length, 1);
});

test("각주는 200개까지만 만들고 나머지는 글자로 남긴다", () => {
  const notes = Array.from({ length: 202 }, (_, i) => `글${i}^[주${i}]`).join(" ");
  const parsed = parseWiki(`## 개요\n${notes}`);
  assert.equal(parsed.footnotes.length, 200);
  assert.equal(match(parsed.warnings, /각주는 200개/).length, 1);
  const text = JSON.stringify(parsed.sections[0].blocks);
  assert.ok(text.includes("^[주200]"));
  assert.ok(text.includes("^[주201]"));
  assert.ok(!text.includes("^[주199]"));
});

test("이미지는 50개까지만 그림으로 만들고 나머지는 설명 글자만 남긴다", () => {
  const images = Array.from({ length: 52 }, (_, i) => `![그림${i}](/uploads/p${i}.png)`).join("\n\n");
  const blocks = blocksOf(`## 개요\n${images}`);
  assert.equal(blocks.filter((b) => b.type === "image").length, 50);
  assert.deepEqual(blocks[50], { type: "p", children: ["그림50"] });
  assert.equal(match(parseWiki(`## 개요\n${images}`).warnings, /이미지는 50개/).length, 1);
});

test("인용문은 3단계까지, 넘는 중첩은 안의 내용만 남긴다", () => {
  const quoteDepth = (blocks: WikiBlock[]): number =>
    Math.max(0, ...blocks.map((b) => (b.type === "quote" ? 1 + quoteDepth(b.children) : 0)));
  const three = blocksOf("## 개요\n> > > 셋");
  assert.equal(quoteDepth(three), 3);
  const parsed = parseWiki("## 개요\n> 하나\n> > 둘\n> > > 셋\n> > > > 넷\n> > > > > 다섯");
  assert.equal(quoteDepth(parsed.sections[0].blocks), 3);
  assert.ok(JSON.stringify(parsed.sections[0].blocks).includes("다섯"));
  assert.equal(match(parsed.warnings, /인용문은 3단계/).length, 1);
  assert.equal(match(parseWiki("## 개요\n> > > 셋").warnings, /인용문/).length, 0);
});

test("리스트는 4단계까지, 넘는 중첩은 문단으로 푼다", () => {
  const md = ["## 개요", "- 하나", "  - 둘", "    - 셋", "      - 넷", "        - 다섯", "          - 여섯"].join("\n");
  const parsed = parseWiki(md);
  const listDepth = (blocks: WikiBlock[]): number =>
    Math.max(0, ...blocks.map((b) => (b.type === "list" ? 1 + Math.max(0, ...b.items.map((i) => listDepth(i.nested ?? []))) : 0)));
  assert.equal(listDepth(parsed.sections[0].blocks), 4);
  const text = JSON.stringify(parsed.sections[0].blocks);
  assert.ok(text.includes("다섯") && text.includes("여섯"));
  assert.equal(match(parsed.warnings, /리스트는 4단계/).length, 1);

  const four = parseWiki(["## 개요", "- 하나", "  - 둘", "    - 셋", "      - 넷"].join("\n"));
  assert.equal(four.warnings.length, 0);
  assert.equal(listDepth(four.sections[0].blocks), 4);
});

test("표가 열 12개, 행 300개를 넘으면 버리고 경고한다", () => {
  const row = (n: number) => `| ${Array.from({ length: n }, (_, i) => i).join(" | ")} |`;
  const sep = (n: number) => `|${"---|".repeat(n)}`;

  const wide = parseWiki(`## 개요\n${row(13)}\n${sep(13)}\n${row(13)}`);
  assert.equal(wide.sections[0].blocks.length, 0);
  assert.equal(match(wide.warnings, /표는 열 12개/).length, 1);

  const ok = parseWiki(`## 개요\n${row(12)}\n${sep(12)}\n${row(12)}`);
  assert.equal(ok.sections[0].blocks[0].type, "table");
  assert.equal(ok.warnings.length, 0);

  const body = Array.from({ length: 300 }, () => row(2)).join("\n"); // 머리 1 + 본문 300 = 301행
  const tall = parseWiki(`## 개요\n${row(2)}\n${sep(2)}\n${body}`);
  assert.equal(tall.sections[0].blocks.length, 0);
  assert.equal(match(tall.warnings, /표는 열 12개, 행 300개/).length, 1);

  const body299 = Array.from({ length: 299 }, () => row(2)).join("\n"); // 머리 1 + 본문 299 = 300행
  assert.equal(parseWiki(`## 개요\n${row(2)}\n${sep(2)}\n${body299}`).sections[0].blocks[0].type, "table");
});

test("같은 종류의 경고는 한 번만 남긴다", () => {
  const parsed = parseWiki("## 개요\n```\na\n```\n\n```\nb\n```\n");
  assert.equal(match(parsed.warnings, /코드 블록/).length, 1);
});

test("버린 것을 알려 준다: 코드 블록, # 제목, 첫 제목 앞의 글, [^1]: 각주", () => {
  const parsed = parseWiki("앞의 글\n\n# 큰 제목\n\n## 개요\n```\ncode\n```\n\n문장[^1]\n\n[^1]: 정의\n");
  assert.equal(match(parsed.warnings, /첫 문단 제목/).length, 1);
  assert.equal(match(parsed.warnings, /# 제목은/).length, 1);
  assert.equal(match(parsed.warnings, /코드 블록/).length, 1);
  assert.equal(match(parsed.warnings, /\[\^1\]:/).length, 1);
});

test("정상 문서는 경고가 없다", () => {
  const parsed = parseWiki("---\n분류: 가\n---\n\n[toc]\n\n## 개요\n본문^[주]\n\n- 하나\n\n> 인용\n");
  assert.deepEqual(parsed.warnings, []);
});

test("HTML 블록은 해석하지 않고 쓴 그대로 글자로 보여 준다", () => {
  const blocks = blocksOf("## 개요\n<div>안녕</div>\n\n<script>alert(1)</script>\n");
  assert.deepEqual(blocks, [
    { type: "p", children: ["<div>안녕</div>"] },
    { type: "p", children: ["<script>alert(1)</script>"] },
  ]);
});

test("글 속의 HTML 태그도 글자다", () => {
  const blocks = blocksOf("## 개요\n앞 <b>굵게</b> 뒤");
  assert.equal(JSON.stringify(blocks).includes("<b>"), true);
  assert.ok(blocks.every((b) => b.type === "p"));
});
