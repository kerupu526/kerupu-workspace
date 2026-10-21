import { test } from "node:test";
import assert from "node:assert/strict";
import { detectContext } from "./context.ts";

/* 문서 안의 | 를 커서 자리로 본다 */
function at(marked: string) {
  const pos = marked.indexOf("|");
  return detectContext(marked.slice(0, pos) + marked.slice(pos + 1), pos);
}

test("줄 맨 앞", () => {
  assert.deepEqual(at("|"), { kind: "line-start", prefix: "" });
  assert.deepEqual(at("본문\n##|"), { kind: "line-start", prefix: "##" });
  assert.deepEqual(at(":::|"), { kind: "line-start", prefix: ":::" });
});

test("글 중간은 text", () => {
  assert.deepEqual(at("본문 글|"), { kind: "text" });
});

test("각주 열기와 링크 주소", () => {
  assert.deepEqual(at("본문^|"), { kind: "footnote-open" });
  assert.deepEqual(at("[글](|)"), { kind: "link-target", prefix: "" });
  assert.deepEqual(at("[글](/dic|"), { kind: "link-target", prefix: "/dic" });
});

test("코드 블록 안에서는 제안하지 않는다", () => {
  assert.deepEqual(at("```\n:::|\n```"), { kind: "none" });
  assert.deepEqual(at("```\n코드\n```\n:::|"), { kind: "line-start", prefix: ":::" });
});

test("CSS 블록의 선언 자리: 속성 이름과 값", () => {
  assert.deepEqual(at(":::style\ntext|"), { kind: "style-property", prefix: "text" });
  assert.deepEqual(at(":::style\n|"), { kind: "style-property", prefix: "" });
  assert.deepEqual(at(":::style\ncolor: red;\ntext-align: ce|"), { kind: "style-value", property: "text-align", prefix: "ce" });
  assert.deepEqual(at(":::style\nTEXT-ALIGN:|"), { kind: "style-value", property: "text-align", prefix: "" });
});

test("선언을 닫은 뒤의 내용 자리는 일반 글이다", () => {
  assert.deepEqual(at(":::style\ncolor: red;\n:::\n내용|"), { kind: "line-start", prefix: "내용" });
  assert.deepEqual(at(":::style\ncolor: red;\n:::\n내용 글|"), { kind: "text" });
});

test("블록을 모두 닫은 뒤에는 다시 일반 글이다", () => {
  assert.deepEqual(at(":::style\ncolor: red;\n:::\n내용\n:::\n##|"), { kind: "line-start", prefix: "##" });
});

test("선언 자리에서 닫는 ::: 줄 자체는 선언이 아니다", () => {
  assert.deepEqual(at(":::style\ncolor: red;\n:::|"), { kind: "line-start", prefix: ":::" });
});

test("메타 블록: 이름과 정보의 이름", () => {
  assert.deepEqual(at("---\n|"), { kind: "meta-key", prefix: "" });
  assert.deepEqual(at("---\n분|"), { kind: "meta-key", prefix: "분" });
  assert.deepEqual(at("---\n분류: 가\n정보:\n  |"), { kind: "meta-info-key", prefix: "" });
  assert.deepEqual(at("---\n정보:\n  작|"), { kind: "meta-info-key", prefix: "작" });
});

test("메타 블록의 값 자리는 제안하지 않는다", () => {
  assert.deepEqual(at("---\n분류: 가|"), { kind: "text" });
  assert.deepEqual(at("---\n정보:\n  작품: 작|"), { kind: "text" });
});

test("메타 블록을 닫은 뒤에는 일반 글이다", () => {
  assert.deepEqual(at("---\n분류: 가\n---\n##|"), { kind: "line-start", prefix: "##" });
});

test("본문 중간의 --- 는 메타 블록이 아니다", () => {
  assert.deepEqual(at("## 개요\n본문\n\n---\n|"), { kind: "line-start", prefix: "" });
});

test("앞에 빈 줄이 있어도 맨 위 --- 는 메타 블록이다", () => {
  assert.deepEqual(at("\n\n---\n|"), { kind: "meta-key", prefix: "" });
});
