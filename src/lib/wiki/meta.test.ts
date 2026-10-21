import { test } from "node:test";
import assert from "node:assert/strict";
import { extractMeta, stripComments, MAX_CATEGORIES, MAX_INFO_ROWS } from "./meta.ts";

const safe = (src: string) => src.startsWith("/uploads/") && !src.includes("..");
const extract = (md: string) => extractMeta(md, safe);

const FULL = [
  "---",
  "분류: 등장인물, 주인공",
  "정보:",
  "  제목: 캐릭터 1",
  "  작품: 작품명",
  "  첫 등장: 1화",
  "이미지: /uploads/character-1.png",
  "---",
  "## 개요",
  "본문",
].join("\n");

test("메타 블록의 분류, 정보, 이미지를 읽고 본문만 남긴다", () => {
  const { text, meta, warnings } = extract(FULL);
  assert.deepEqual(meta.categories, ["등장인물", "주인공"]);
  assert.equal(meta.infobox.title, "캐릭터 1");
  assert.deepEqual(meta.infobox.rows, [
    { label: "작품", value: "작품명" },
    { label: "첫 등장", value: "1화" },
  ]);
  assert.equal(meta.infobox.image, "/uploads/character-1.png");
  assert.deepEqual(warnings, []);
  assert.equal(text, "## 개요\n본문");
});

test("앞에 빈 줄만 있어도 메타 블록이다", () => {
  assert.deepEqual(extract(`\n\n${FULL}`).meta.categories, ["등장인물", "주인공"]);
});

test("메타 블록이 없으면 글을 그대로 둔다", () => {
  const md = "## 개요\n본문\n\n---\n\n뒤";
  const result = extract(md);
  assert.equal(result.text, md);
  assert.deepEqual(result.meta, { categories: [], infobox: { rows: [] } });
});

test("본문 앞에 글이 있으면 그 뒤의 --- 는 메타 블록이 아니다", () => {
  const md = "글\n---\n분류: 가\n---\n뒤";
  assert.equal(extract(md).text, md);
});

test("수평줄 두 개 사이에 쓴 일반 글은 메타 블록이 아니다", () => {
  const md = "---\n그냥 글입니다\n---\n뒤";
  const result = extract(md);
  assert.equal(result.text, md);
  assert.deepEqual(result.meta.categories, []);
});

test("닫지 않은 메타 블록은 그대로 둔다", () => {
  const md = "---\n분류: 가\n\n## 개요";
  assert.equal(extract(md).text, md);
});

test("허용하지 않은 이름은 버리고 경고한다", () => {
  const { meta, warnings } = extract("---\n분류: 가\n작가: 누구\n  메모: x\n---\n");
  assert.deepEqual(meta.categories, ["가"]);
  assert.equal(meta.infobox.rows.length, 0);
  assert.equal(warnings.length, 1);
  assert.match(warnings[0], /작가/);
});

test("정보 행: 같은 이름은 뒤의 것을 쓰고 값의 콜론은 그대로 둔다", () => {
  const { meta } = extract("---\n정보:\n  나이: 20\n  시간: 12:30\n  나이: 21\n---\n");
  assert.deepEqual(meta.infobox.rows, [
    { label: "시간", value: "12:30" },
    { label: "나이", value: "21" },
  ]);
});

test("값은 문법을 풀지 않는 글자다", () => {
  const { meta } = extract("---\n정보:\n  작품: **굵게** <b>x</b>\n---\n");
  assert.equal(meta.infobox.rows[0].value, "**굵게** <b>x</b>");
});

test("탭 들여쓰기는 버리고 경고한다", () => {
  const { meta, warnings } = extract("---\n정보:\n\t작품: 가\n  나이: 1\n---\n");
  assert.deepEqual(meta.infobox.rows, [{ label: "나이", value: "1" }]);
  assert.match(warnings[0], /탭/);
});

test("정보의 형식이 틀린 줄과 빈 값은 버린다", () => {
  const { meta, warnings } = extract("---\n정보:\n  콜론없음\n  작품:\n  나이: 1\n---\n");
  assert.deepEqual(meta.infobox.rows, [{ label: "나이", value: "1" }]);
  assert.equal(warnings.length, 2);
});

test("이미지는 올린 파일만 쓴다", () => {
  for (const src of ["https://example.com/a.png", "/uploads/../secret.png", "javascript:alert(1)", "/public/a.png"]) {
    const { meta, warnings } = extract(`---\n이미지: ${src}\n---\n`);
    assert.equal(meta.infobox.image, undefined, src);
    assert.equal(warnings.length, 1, src);
  }
});

test("분류는 중복을 합치고 20개까지만 받는다", () => {
  const names = Array.from({ length: MAX_CATEGORIES + 2 }, (_, i) => `c${i}`);
  const { meta, warnings } = extract(`---\n분류: ${["a", "a", ...names].join(", ")}\n---\n`);
  assert.equal(meta.categories.length, MAX_CATEGORIES);
  assert.equal(meta.categories.filter((c) => c === "a").length, 1);
  // 서로 다른 이름은 a, c0 ~ c21 의 23개이고, 앞의 20개만 받으니 c19, c20, c21 셋이 경고된다
  assert.equal(warnings.length, 3);
});

test("정보는 30행까지만 받는다", () => {
  const rows = Array.from({ length: MAX_INFO_ROWS + 1 }, (_, i) => `  k${i}: v`);
  const { meta, warnings } = extract(["---", "정보:", ...rows, "---"].join("\n"));
  assert.equal(meta.infobox.rows.length, MAX_INFO_ROWS);
  assert.equal(warnings.length, 1);
});

test("너무 긴 값은 버린다", () => {
  const { meta, warnings } = extract(`---\n정보:\n  작품: ${"가".repeat(201)}\n---\n`);
  assert.equal(meta.infobox.rows.length, 0);
  assert.equal(warnings.length, 1);
});

/* ---- 주석 ---- */

test("줄 맨 앞의 %% 는 그 줄 전체가 주석이다", () => {
  assert.equal(stripComments("앞\n%% 메모\n뒤"), "앞\n뒤");
  assert.equal(stripComments("앞\n%%메모%% 같은 줄 글\n뒤"), "앞\n뒤");
});

test("줄 중간의 %%메모%% 한 쌍도 주석이다", () => {
  assert.equal(stripComments("본문 %%메모%% 이어짐"), "본문  이어짐");
  assert.equal(stripComments("a %%x%% b %%y%% c"), "a  b  c");
});

test("주석뿐인 줄은 빈 줄을 남기지 않는다", () => {
  assert.equal(stripComments("- 하나\n   %%메모%%\n- 둘"), "- 하나\n- 둘");
});

test("원래 있던 빈 줄은 그대로 둔다", () => {
  assert.equal(stripComments("앞\n\n뒤"), "앞\n\n뒤");
});

test("짝이 없는 줄 중간의 %% 는 글자다", () => {
  assert.equal(stripComments("50%% 할인"), "50%% 할인");
});

test("코드 조각, 코드 블록, 이스케이프 안의 %% 는 주석이 아니다", () => {
  assert.equal(stripComments("`%%x%%` 와 %%y%%"), "`%%x%%` 와 ");
  assert.equal(stripComments("```\n%% 코드\n```"), "```\n%% 코드\n```");
  assert.equal(stripComments("\\%%x%% 글"), "\\%%x%% 글");
});

test("CRLF 줄바꿈도 처리한다", () => {
  assert.equal(stripComments("앞\r\n%% 메모\r\n뒤"), "앞\n뒤");
});
