import { test } from "node:test";
import assert from "node:assert/strict";
import { parseWiki, LIMITS } from "./parse.ts";

/* 문단 하나(## 개요) 아래에 본문을 놓고 첫 문단의 블록을 돌려준다 */
function blocksOf(body: string) {
  const parsed = parseWiki(`## 개요\n${body}`);
  return { blocks: parsed.sections[0]?.blocks ?? [], parsed };
}

const text = (block: { type: string; children?: unknown }) => JSON.stringify(block);

test("접기 블록: 제목과 안쪽 블록이 들어간다", () => {
  const { blocks } = blocksOf("+++ 스포일러 주의\n숨은 내용\n\n- 항목\n+++\n");
  assert.equal(blocks.length, 1);
  const fold = blocks[0];
  assert.equal(fold.type, "fold");
  assert.ok(fold.type === "fold");
  assert.equal(fold.title, "스포일러 주의");
  assert.deepEqual(fold.children.map((b) => b.type), ["p", "list"]);
});

test("제목을 쓰지 않으면 제목은 비어 있다 (화면에서 더 보기로 보인다)", () => {
  const { blocks } = blocksOf("+++\n내용\n+++\n");
  assert.ok(blocks[0].type === "fold");
  assert.equal(blocks[0].title, "");
});

test("앞뒤 문단과 이어서 써도 접기만 따로 떨어진다", () => {
  const { blocks } = blocksOf("앞 문단\n+++ 접기\n안\n+++\n뒤 문단\n");
  assert.deepEqual(blocks.map((b) => b.type), ["p", "fold", "p"]);
});

test("닫지 않은 접기는 글자로 남는다", () => {
  const { blocks, parsed } = blocksOf("+++ 접기\n닫지 않음\n");
  assert.equal(blocks.some((b) => b.type === "fold"), false);
  assert.match(text(blocks[0]), /\+\+\+/);
  assert.equal(parsed.diagnostics.length, 0);
});

test("코드 블록 안의 +++ 는 닫는 줄이 아니다", () => {
  const { blocks } = blocksOf("+++ 접기\n```\n+++\n```\n끝\n+++\n");
  assert.equal(blocks.length, 1);
  assert.ok(blocks[0].type === "fold");
});

test("코드 블록 안의 +++ 는 접기를 열지 않는다", () => {
  const { blocks } = blocksOf("```\n+++ 접기\n안\n+++\n```\n");
  assert.equal(blocks.some((b) => b.type === "fold"), false);
});

test("바깥을 + 더 많이 쓰면 접기 안에 접기를 넣을 수 있다", () => {
  const { blocks } = blocksOf("++++ 바깥\n바깥 글\n+++ 안쪽\n안쪽 글\n+++\n++++\n");
  assert.ok(blocks[0].type === "fold");
  const outer = blocks[0];
  assert.equal(outer.title, "바깥");
  assert.deepEqual(outer.children.map((b) => b.type), ["p", "fold"]);
  const inner = outer.children[1];
  assert.ok(inner.type === "fold");
  assert.equal(inner.title, "안쪽");
});

test("+ 개수가 같으면 안쪽의 닫는 줄이 바깥을 닫는다", () => {
  const { blocks } = blocksOf("+++ 바깥\n+++ 안쪽\n내용\n+++\n뒤\n+++\n");
  assert.ok(blocks[0].type === "fold");
  // 첫 닫는 줄에서 바깥이 닫히고, 남은 "뒤 / +++" 는 닫히지 않은 접기라 글자다
  assert.equal(blocks[0].title, "바깥");
});

test("접기는 3단계까지만 중첩할 수 있고 더 깊은 것은 풀린다", () => {
  // 바깥부터 + 7개, 6개, 5개, 4개로 네 단계를 쓴다
  const md = "+++++++ 1\n++++++ 2\n+++++ 3\n++++ 4\n깊은 글\n++++\n+++++\n++++++\n+++++++\n";
  const { blocks, parsed } = blocksOf(md);
  let depth = 0;
  let cursor = blocks;
  while (cursor.length === 1 && cursor[0].type === "fold") {
    depth += 1;
    cursor = cursor[0].children;
  }
  assert.equal(depth, LIMITS.foldDepth);
  assert.match(text(cursor[0]), /깊은 글/);
  assert.ok(parsed.warnings.some((w) => w.includes("접기는")));
});

test("접기 안의 제목(##)은 버리고 경고한다", () => {
  const { blocks, parsed } = blocksOf("+++ 접기\n## 제목\n내용\n+++\n");
  assert.ok(blocks[0].type === "fold");
  assert.deepEqual(blocks[0].children.map((b) => b.type), ["p"]);
  const warning = parsed.diagnostics.find((d) => d.message.includes("제목을 쓸 수 없어"));
  assert.ok(warning);
  assert.equal(warning.line, 3); // 원문의 세 번째 줄(## 개요 가 1번)
});

test("내용이 없는 접기는 버리고 경고한다", () => {
  const { blocks, parsed } = blocksOf("+++ 빈 접기\n\n+++\n");
  assert.equal(blocks.length, 0);
  assert.ok(parsed.diagnostics.some((d) => d.message.includes("내용이 없는 접기") && d.line === 2));
});

test("제목은 글자 그대로다 (서식을 풀지 않는다)", () => {
  const { blocks } = blocksOf("+++ **굵게** `코드`\n내용\n+++\n");
  assert.ok(blocks[0].type === "fold");
  assert.equal(blocks[0].title, "**굵게** `코드`");
});

test("제목이 길면 잘라서 경고한다", () => {
  const { blocks, parsed } = blocksOf(`+++ ${"가".repeat(LIMITS.foldTitle + 5)}\n내용\n+++\n`);
  assert.ok(blocks[0].type === "fold");
  assert.equal(blocks[0].title.length, LIMITS.foldTitle);
  assert.ok(parsed.warnings.some((w) => w.includes("접기 제목")));
});

test("각주 번호는 접기 안팎에서 문서 순서대로 이어진다", () => {
  const parsed = parseWiki("## 개요\n앞^[하나]\n\n+++ 접기\n안^[둘]\n+++\n\n뒤^[셋]\n");
  assert.deepEqual(parsed.footnotes, ["하나", "둘", "셋"]);
});

test("CSS 블록 안에 접기, 접기 안에 CSS 블록을 넣을 수 있다", () => {
  const a = blocksOf(":::style\ncolor: red;\n:::\n+++ 접기\n안\n+++\n:::\n").blocks;
  assert.ok(a[0].type === "style");
  assert.ok(a[0].children[0].type === "fold");

  const b = blocksOf("+++ 접기\n:::style\ncolor: red;\n:::\n안\n:::\n+++\n").blocks;
  assert.ok(b[0].type === "fold");
  assert.ok(b[0].children[0].type === "style");
});

test("첫 문단 제목 앞의 접기는 다른 블록처럼 버린다", () => {
  const parsed = parseWiki("+++ 접기\n안\n+++\n\n## 개요\n글\n");
  assert.equal(parsed.sections[0].blocks.some((b) => b.type === "fold"), false);
});

test("사용자가 쓴 자리표시 글자는 지워서 접기로 위장할 수 없다", () => {
  const { blocks } = blocksOf("0\n");
  assert.equal(blocks.some((b) => b.type === "fold"), false);
});

test("인용문과 리스트 안의 +++ 는 접기가 아니다", () => {
  const { blocks } = blocksOf("> +++ 접기\n> 안\n> +++\n");
  assert.equal(JSON.stringify(blocks).includes('"fold"'), false);
});

test("## + 제목 은 처음부터 접혀 있는 문단이다", () => {
  const parsed = parseWiki("## + 접힌 문단\n글\n\n## 일반 문단\n글\n\n## +붙여 쓴 제목\n글\n");
  assert.equal(parsed.sections[0].title, "접힌 문단");
  assert.equal(parsed.sections[0].folded, true);
  assert.equal(parsed.sections[1].folded, undefined);
  assert.equal(parsed.sections[2].title, "+붙여 쓴 제목");
  assert.equal(parsed.sections[2].folded, undefined);
});

test("하위 문단도 접을 수 있다", () => {
  const parsed = parseWiki("## 위\n글\n\n### + 아래\n글\n");
  assert.equal(parsed.sections[0].folded, undefined);
  assert.equal(parsed.sections[0].children?.[0].folded, true);
  assert.equal(parsed.sections[0].children?.[0].title, "아래");
});
