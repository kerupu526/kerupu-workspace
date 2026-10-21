import { test } from "node:test";
import assert from "node:assert/strict";
import { extractFootnotes, FOOTNOTE_MARK, restoreFootnoteText, splitFootnoteMarks } from "./footnote.ts";
import { parseWiki } from "./parse.ts";

const contents = (md: string) => extractFootnotes(md).notes.map((n) => n.content);

test("기본 각주", () => {
  const { text, notes } = extractFootnotes("본문^[내용] 뒤");
  assert.deepEqual(notes, [{ content: "내용", source: "^[내용]" }]);
  assert.equal(text, `본문${FOOTNOTE_MARK}0${FOOTNOTE_MARK} 뒤`);
});

test("안쪽의 짝이 맞는 대괄호는 내용이다", () => {
  assert.deepEqual(contents("^[참고 [1]권 3장]"), ["참고 [1]권 3장"]);
  assert.deepEqual(contents("^[[각주 내용]]"), ["[각주 내용]"]);
  assert.deepEqual(contents("^[a [b [c]] d]"), ["a [b [c]] d"]);
});

test("\\] 와 \\[ 로 짝이 안 맞는 괄호를 쓴다", () => {
  assert.deepEqual(contents("^[닫는 괄호 \\] 가 있다]"), ["닫는 괄호 ] 가 있다"]);
  assert.deepEqual(contents("^[여는 괄호 \\[ 가 있다]"), ["여는 괄호 [ 가 있다"]);
  assert.deepEqual(contents("^[웃음 :\\]]"), ["웃음 :]"]);
});

test("역슬래시 하나는 \\\\ 로 쓰고, 다른 \\문자는 그대로 둔다", () => {
  assert.deepEqual(contents("^[경로 C:\\\\temp]"), ["경로 C:\\temp"]);
  assert.deepEqual(contents("^[a\\nb]"), ["a\\nb"]);
  // 역슬래시로 끝나는 내용: \\ 다음의 ] 가 닫는다
  assert.deepEqual(contents("^[끝 \\\\]"), ["끝 \\"]);
});

test("서식이 각주를 가로질러도 된다", () => {
  const parsed = parseWiki("## 개요\n**굵게 ^[안의 각주] 끝**");
  assert.deepEqual(parsed.footnotes, ["안의 각주"]);
  assert.deepEqual(parsed.sections[0].blocks, [
    { type: "p", children: [{ strong: ["굵게 ", { footnote: 1 }, " 끝"] }] },
  ]);
});

test("각주 내용의 * 나 | 가 문단과 표를 깨지 않는다", () => {
  assert.deepEqual(parseWiki("## 개요\n본문^[a *b] 끝").sections[0].blocks, [
    { type: "p", children: ["본문", { footnote: 1 }, " 끝"] },
  ]);
  const table = parseWiki("## 개요\n| 가 | 나 |\n|---|---|\n| 1^[a | b] | 2 |\n").sections[0].blocks[0];
  assert.equal(table.type, "table");
  if (table.type === "table") assert.equal(table.rows[0].length, 2);
});

test("닫지 않은 ^[ 는 글자로 남는다", () => {
  const { text, notes } = extractFootnotes("본문^[닫지 않음");
  assert.equal(text, "본문^[닫지 않음");
  assert.equal(notes.length, 0);
});

test("빈 줄이 들어가면 각주가 아니다", () => {
  const { notes } = extractFootnotes("^[앞\n\n뒤]");
  assert.equal(notes.length, 0);
  assert.deepEqual(contents("^[줄을\n바꾼 내용]"), ["줄을\n바꾼 내용"]);
});

test("빈 내용은 각주가 아니다", () => {
  assert.equal(extractFootnotes("^[]").notes.length, 0);
  assert.equal(extractFootnotes("^[  ]").notes.length, 0);
});

test("각주 안의 각주는 만들지 않고 글자로 둔다", () => {
  const { text, notes, warnings } = extractFootnotes("가 ^[바깥 ^[안쪽] 끝] 나 ^[정상]");
  assert.deepEqual(notes.map((n) => n.content), ["정상"]);
  assert.equal(text, `가 ^[바깥 ^[안쪽] 끝] 나 ${FOOTNOTE_MARK}0${FOOTNOTE_MARK}`);
  assert.equal(warnings.length, 1);
});

test("\\^[ 는 각주가 아니다", () => {
  const parsed = parseWiki("## 개요\n\\^[글자]");
  assert.deepEqual(parsed.footnotes, []);
  assert.deepEqual(parsed.sections[0].blocks, [{ type: "p", children: ["^[글자]"] }]);
});

test("코드 조각과 코드 블록 안의 ^[ 는 건드리지 않는다", () => {
  assert.equal(extractFootnotes("`^[코드]` 와 ^[각주]").notes.length, 1);
  assert.equal(extractFootnotes("``^[a`b]``").notes.length, 0);
  assert.equal(extractFootnotes("```\n^[코드 블록]\n```\n^[밖]").notes.length, 1);
  assert.equal(extractFootnotes("~~~\n^[코드 블록]\n~~~").notes.length, 0);
});

test("자리표시를 흉내 낸 글자는 지운다", () => {
  const { text, notes } = extractFootnotes(`가${FOOTNOTE_MARK}0${FOOTNOTE_MARK}나`);
  assert.equal(notes.length, 0);
  assert.equal(text, "가0나");
});

test("제목, 링크 주소, 이미지 설명 안의 각주 표시는 원문으로 되돌린다", () => {
  const parsed = parseWiki("## 제목^[주]\n[글](/a^[b]) ![설명^[c]](/uploads/x.png)\n\n![그림^[d]](/uploads/y.png)\n");
  assert.equal(parsed.sections[0].title, "제목^[주]");
  assert.ok(!JSON.stringify(parsed).includes(FOOTNOTE_MARK));
  const image = parsed.sections[0].blocks.find((b) => b.type === "image");
  assert.deepEqual(image, { type: "image", src: "/uploads/y.png", alt: "그림^[d]" });
});

test("번호는 문서에 실제로 나온 순서대로 이어진다 (제목 속 각주는 세지 않는다)", () => {
  const parsed = parseWiki("## 제목^[제목 주]\n첫째^[하나]\n\n## 둘\n둘째^[둘]");
  assert.deepEqual(parsed.footnotes, ["하나", "둘"]);
});

test("링크 안의 각주도 된다", () => {
  const parsed = parseWiki("## 개요\n[링크 ^[주] 글](/a)");
  assert.deepEqual(parsed.footnotes, ["주"]);
});

test("splitFootnoteMarks / restoreFootnoteText", () => {
  const { text, notes } = extractFootnotes("a^[1]b^[2]c");
  assert.deepEqual(splitFootnoteMarks(text), ["a", { note: 0 }, "b", { note: 1 }, "c"]);
  assert.equal(restoreFootnoteText(text, notes), "a^[1]b^[2]c");
});
