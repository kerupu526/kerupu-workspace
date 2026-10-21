import { test } from "node:test";
import assert from "node:assert/strict";
import { parseWiki } from "./parse.ts";

/* 첫 문단의 블록들 */
function firstBlocks(markdown: string) {
  return parseWiki(markdown).sections[0].blocks;
}

test("CSS 블록은 스타일을 입힌 블록이 된다", () => {
  const blocks = firstBlocks(
    ["## 개요", "", ":::style", "text-align: center;", "color: #647260;", ":::", "가운데 글", "", ":::", "", "뒤의 글"].join("\n"),
  );
  assert.equal(blocks.length, 2);
  assert.deepEqual(blocks[0], {
    type: "style",
    style: { textAlign: "center", color: "#647260" },
    children: [{ type: "p", children: ["가운데 글"] }],
  });
  assert.deepEqual(blocks[1], { type: "p", children: ["뒤의 글"] });
});

test("블록 앞뒤에 빈 줄이 없어도 블록으로 읽는다", () => {
  const blocks = firstBlocks(["## 개요", "앞", ":::style", "color: red;", ":::", "안", ":::", "뒤"].join("\n"));
  assert.deepEqual(
    blocks.map((b) => b.type),
    ["p", "style", "p"],
  );
});

test("블록 안에서 리스트, 표, 이미지, 인용문도 쓸 수 있다", () => {
  const blocks = firstBlocks(
    [
      "## 개요",
      ":::style",
      "color: red;",
      ":::",
      "- 하나",
      "- 둘",
      "",
      "> 인용",
      "",
      "| a | b |",
      "|---|---|",
      "| 1 | 2 |",
      "",
      "![그림](/uploads/a.png)",
      ":::",
    ].join("\n"),
  );
  assert.equal(blocks.length, 1);
  const block = blocks[0];
  assert.equal(block.type, "style");
  if (block.type === "style") {
    assert.deepEqual(
      block.children.map((b) => b.type),
      ["list", "quote", "table", "image"],
    );
  }
});

test("허용되지 않은 선언은 버리고 경고를 남긴다", () => {
  const parsed = parseWiki(
    ["## 개요", ":::style", "color: red;", "position: fixed;", "background: url(/a.png);", ":::", "글", ":::"].join("\n"),
  );
  const block = parsed.sections[0].blocks[0];
  assert.equal(block.type, "style");
  if (block.type === "style") assert.deepEqual(block.style, { color: "red" });
  assert.equal(parsed.warnings.length, 2);
  assert.match(parsed.warnings[0], /position: fixed/);
  assert.match(parsed.warnings[1], /url\(/);
});

test("통과한 선언이 없으면 감싸지 않고 안쪽 블록만 남긴다", () => {
  const parsed = parseWiki(["## 개요", ":::style", "position: fixed;", ":::", "글", ":::"].join("\n"));
  assert.deepEqual(parsed.sections[0].blocks, [{ type: "p", children: ["글"] }]);
  assert.equal(parsed.warnings.length, 1);
});

test("닫지 않은 블록은 글자로 남는다", () => {
  const noClose = firstBlocks(["## 개요", ":::style", "color: red;", ":::", "내용"].join("\n"));
  assert.ok(noClose.every((b) => b.type !== "style"));
  const noDeclarationClose = firstBlocks(["## 개요", ":::style", "color: red;", "내용"].join("\n"));
  assert.ok(noDeclarationClose.every((b) => b.type !== "style"));
});

test("블록 안의 :::style 은 중첩이 아니라 글자다", () => {
  const blocks = firstBlocks(
    ["## 개요", ":::style", "color: red;", ":::", "바깥", ":::style", "color: blue;", ":::", "남은 글", ":::"].join("\n"),
  );
  const first = blocks[0];
  assert.equal(first.type, "style");
  // 안쪽 블록은 스타일이 되지 않는다
  if (first.type === "style") {
    assert.deepEqual(first.style, { color: "red" });
    assert.ok(first.children.every((b) => b.type !== "style"));
  }
});

test("코드 블록 안의 :::style 은 건드리지 않는다", () => {
  const blocks = firstBlocks(
    ["## 개요", "```", ":::style", "color: red;", ":::", "x", ":::", "```", "뒤"].join("\n"),
  );
  assert.ok(blocks.every((b) => b.type !== "style"));
});

test("블록 안의 제목은 버리고 경고한다", () => {
  const parsed = parseWiki(["## 개요", ":::style", "color: red;", ":::", "### 작은 제목", "본문", ":::"].join("\n"));
  const block = parsed.sections[0].blocks[0];
  assert.equal(block.type, "style");
  if (block.type === "style") assert.deepEqual(block.children, [{ type: "p", children: ["본문"] }]);
  assert.equal(parsed.sections[0].children, undefined);
  assert.match(parsed.warnings[0], /작은 제목/);
});

test("각주 번호는 블록 안팎에서 문서 순서대로 이어진다", () => {
  const parsed = parseWiki(
    ["## 개요", "첫째^[하나]", "", ":::style", "color: red;", ":::", "둘째^[둘]", ":::", "", "셋째^[셋]"].join("\n"),
  );
  assert.deepEqual(parsed.footnotes, ["하나", "둘", "셋"]);
  const [p1, styled, p3] = parsed.sections[0].blocks;
  assert.deepEqual(p1, { type: "p", children: ["첫째", { footnote: 1 }] });
  if (styled.type === "style") assert.deepEqual(styled.children, [{ type: "p", children: ["둘째", { footnote: 2 }] }]);
  assert.deepEqual(p3, { type: "p", children: ["셋째", { footnote: 3 }] });
});

test("사용자가 자리표시 글자를 흉내 낼 수 없다", () => {
  const blocks = firstBlocks(["## 개요", ":::style", "color: red;", ":::", "진짜", ":::", "", "0"].join("\n"));
  // 가짜 자리표시는 지워지고 빈 문단이 된다 (두 번째 스타일 블록이 생기지 않는다)
  assert.equal(blocks.filter((b) => b.type === "style").length, 1);
  assert.ok(!JSON.stringify(blocks).includes(""));
});

test("제목 앞의 블록은 문서에 남지 않는다", () => {
  const parsed = parseWiki([":::style", "color: red;", ":::", "글", ":::", "", "## 개요", "본문"].join("\n"));
  assert.deepEqual(parsed.sections[0].blocks, [{ type: "p", children: ["본문"] }]);
});

test("CRLF 줄바꿈도 같다", () => {
  const blocks = firstBlocks(["## 개요", ":::style", "color: red;", ":::", "글", ":::"].join("\r\n"));
  assert.equal(blocks[0].type, "style");
});

test("CSS 블록이 없는 문서는 이전과 같다", () => {
  const parsed = parseWiki("## 개요\n\n**굵게** 와 [링크](/a)\n");
  assert.deepEqual(parsed.warnings, []);
  assert.deepEqual(parsed.sections[0].blocks, [
    { type: "p", children: [{ strong: ["굵게"] }, " 와 ", { link: { href: "/a", children: ["링크"] } }] },
  ]);
});
