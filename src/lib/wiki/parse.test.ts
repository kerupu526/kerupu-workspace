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

/* ---- 5단계 뒤: 메타 블록, 목차, 주석 ---- */

test("[toc] 는 그 자리에 toc 블록이 된다", () => {
  const blocks = firstBlocks(["## 개요", "앞", "", "[toc]", "", "뒤"].join("\n"));
  assert.deepEqual(
    blocks.map((b) => b.type),
    ["p", "toc", "p"],
  );
});

test("첫 제목 전의 [toc] 는 lead 에 담긴다", () => {
  const parsed = parseWiki(["[toc]", "", "## 개요", "본문"].join("\n"));
  assert.deepEqual(parsed.lead, [{ type: "toc" }]);
  assert.deepEqual(parsed.sections[0].blocks, [{ type: "p", children: ["본문"] }]);
});

test("[toc] 는 대소문자와 앞뒤 공백을 가리지 않는다", () => {
  assert.equal(firstBlocks("## 개요\n\n[TOC]\n")[0].type, "toc");
  assert.equal(firstBlocks("## 개요\n\n [toc] \n")[0].type, "toc");
});

test("[toc] 는 한 번만 쓴다", () => {
  const parsed = parseWiki(["## 가", "[toc]", "", "## 나", "[toc]"].join("\n"));
  assert.equal(parsed.sections[0].blocks[0].type, "toc");
  assert.equal(parsed.sections[1].blocks.length, 0);
  assert.equal(parsed.warnings.length, 1);
});

test("글 중간의 [toc], 이스케이프한 \\[toc], 인용문·CSS 블록 안의 [toc] 는 글자다", () => {
  const types = (md: string) => JSON.stringify(firstBlocks(md));
  assert.ok(!types("## 개요\n\n여기 [toc] 입니다\n").includes('"toc"'));
  assert.ok(!types("## 개요\n\n\\[toc]\n").includes('"type":"toc"'));
  assert.deepEqual(firstBlocks("## 개요\n\n\\[toc]\n"), [{ type: "p", children: ["[toc]"] }]);
  assert.ok(!types("## 개요\n\n> [toc]\n").includes('"type":"toc"'));
  assert.ok(!types("## 개요\n:::style\ncolor: red;\n:::\n[toc]\n:::\n").includes('"type":"toc"'));
});

test("제목 단계를 건너뛰어도 오류 없이 가장 가까운 윗 문단 아래에 둔다", () => {
  const parsed = parseWiki(["## 가", "#### 깊은", "본문"].join("\n"));
  assert.equal(parsed.sections[0].children?.[0].title, "깊은");
});

test("메타 블록은 meta 로 나오고 본문에는 남지 않는다", () => {
  const parsed = parseWiki(
    ["---", "분류: 가, 나", "정보:", "  제목: 이름", "  작품: 작", "이미지: /uploads/a.png", "---", "## 개요", "본문"].join("\n"),
  );
  assert.deepEqual(parsed.meta.categories, ["가", "나"]);
  assert.equal(parsed.meta.infobox.title, "이름");
  assert.deepEqual(parsed.meta.infobox.rows, [{ label: "작품", value: "작" }]);
  assert.equal(parsed.meta.infobox.image, "/uploads/a.png");
  assert.equal(parsed.sections.length, 1);
  assert.deepEqual(parsed.sections[0].blocks, [{ type: "p", children: ["본문"] }]);
});

test("메타 블록의 경고는 warnings 에 합쳐진다", () => {
  const parsed = parseWiki("---\n작가: x\n---\n## 개요\n:::style\nposition: fixed;\n:::\n글\n:::\n");
  assert.equal(parsed.warnings.length, 2);
});

test("메타 블록이 없는 문서의 meta 는 비어 있다", () => {
  assert.deepEqual(parseWiki("## 개요\n본문").meta, { categories: [], infobox: { rows: [] } });
});

test("주석은 읽기 결과에 남지 않는다", () => {
  const parsed = parseWiki(["## 개요", "%% 편집 메모", "본문 %%이것도%% 이어짐", "^[각주]"].join("\n"));
  assert.deepEqual(parsed.sections[0].blocks, [
    // 줄바꿈은 문단 안에 \n 으로 남는다 (화면에서는 공백으로 보인다)
    { type: "p", children: ["본문  이어짐\n", { footnote: 1 }] },
  ]);
  assert.deepEqual(parsed.footnotes, ["각주"]);
});

test("주석 안의 각주와 CSS 블록은 없는 것으로 친다", () => {
  const parsed = parseWiki(["## 개요", "%% ^[숨은 각주]", "본문"].join("\n"));
  assert.deepEqual(parsed.footnotes, []);
});
