import { test } from "node:test";
import assert from "node:assert/strict";
import { parseWiki } from "./parse.ts";

/* 문단 하나를 쓰고 그 문단의 인라인 조각을 돌려준다 */
function inlineOf(line: string) {
  const block = parseWiki(`## 개요\n${line}`).sections[0].blocks[0];
  assert.ok(block.type === "p", `문단이어야 한다: ${JSON.stringify(block)}`);
  return block.children;
}

test("||글|| 은 스포일러가 된다", () => {
  assert.deepEqual(inlineOf("범인은 ||집사||였다."), ["범인은 ", { spoiler: ["집사"] }, "였다."]);
});

test("한 문단에 여러 개를 쓸 수 있다", () => {
  assert.deepEqual(inlineOf("||하나|| 그리고 ||둘||"), [{ spoiler: ["하나"] }, " 그리고 ", { spoiler: ["둘"] }]);
});

test("속에 굵게, 링크 같은 서식을 넣을 수 있다", () => {
  assert.deepEqual(inlineOf("||앞 **굵게** 뒤||"), [{ spoiler: ["앞 ", { strong: ["굵게"] }, " 뒤"] }]);
  assert.deepEqual(inlineOf("||[링크](/dictionary/x)||"), [
    { spoiler: [{ link: { href: "/dictionary/x", children: ["링크"] } }] },
  ]);
});

test("속에 각주가 들어가도 번호는 문서 순서대로다", () => {
  const parsed = parseWiki("## 개요\n앞^[하나] ||가림^[둘]|| 뒤^[셋]\n");
  assert.deepEqual(parsed.footnotes, ["하나", "둘", "셋"]);
  const block = parsed.sections[0].blocks[0];
  assert.ok(block.type === "p");
  assert.ok(block.children.some((c) => typeof c === "object" && "spoiler" in c));
});

test("짝이 없는 || 는 글자로 남는다", () => {
  assert.deepEqual(inlineOf("끝이 없는 ||스포"), ["끝이 없는 ||스포"]);
  assert.deepEqual(inlineOf("||하나|| 그리고 ||짝 없음"), [{ spoiler: ["하나"] }, " 그리고 ||짝 없음"]);
});

test("속이 비었거나 공백뿐이면 글자로 남는다", () => {
  assert.deepEqual(inlineOf("앞 |||| 뒤"), ["앞 |||| 뒤"]);
  assert.deepEqual(inlineOf("앞 ||  || 뒤"), ["앞 ||  || 뒤"]);
});

test("코드 조각 안의 || 는 스포일러가 아니다", () => {
  assert.deepEqual(inlineOf("`a || b || c` 는 코드"), [{ code: "a || b || c" }, " 는 코드"]);
});

test("서로 다른 서식 단계에 걸친 ||는 짝으로 보지 않는다", () => {
  const result = inlineOf("**굵게 ||안**에서 열고 밖에서 닫음||");
  assert.equal(JSON.stringify(result).includes("spoiler"), false);
});

test("표 셀 안에서는 \\|\\| 로 쓴다", () => {
  const parsed = parseWiki("## 개요\n| 항목 | 값 |\n|:---|:---|\n| 정체 | \\|\\|집사\\|\\| |\n");
  const table = parsed.sections[0].blocks[0];
  assert.ok(table.type === "table");
  assert.deepEqual(table.rows[0][1], [{ spoiler: ["집사"] }]);
});

test("리스트, 인용문, 접기 안에서도 된다", () => {
  const parsed = parseWiki("## 개요\n- 항목 ||숨김||\n\n> 인용 ||숨김||\n\n+++ 접기\n안 ||숨김||\n+++\n");
  const json = JSON.stringify(parsed.sections[0].blocks);
  assert.equal(json.match(/"spoiler"/g)?.length, 3);
});

test("제목 안의 ||는 스포일러가 되지 않고 글자로 남는다", () => {
  const parsed = parseWiki("## ||제목||\n글\n");
  assert.equal(parsed.sections[0].title, "||제목||");
});

test("스포일러를 써도 경고는 생기지 않는다", () => {
  assert.equal(parseWiki("## 개요\n||가림|| 과 ||짝 없음\n").diagnostics.length, 0);
});
