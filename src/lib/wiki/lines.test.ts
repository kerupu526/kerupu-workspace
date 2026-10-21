import { test } from "node:test";
import assert from "node:assert/strict";
import { parseWiki } from "./parse.ts";

/* 원문에서 줄 번호(1부터)를 찾기 쉽게, 각 줄 끝에 줄 번호를 적어 둔 문서를 쓴다 */
const doc = (lines: string[]) => lines.join("\n");
const lineOf = (md: string, marker: string) => md.split("\n").findIndex((l) => l.includes(marker)) + 1;
const linesFor = (md: string, pattern: RegExp) =>
  parseWiki(md)
    .diagnostics.filter((d) => pattern.test(d.message))
    .map((d) => d.line);

test("diagnostics 는 warnings 와 같은 내용과 순서다", () => {
  const parsed = parseWiki(doc(["앞", "# 제목", "## 개요", "```", "x", "```"]));
  assert.deepEqual(
    parsed.diagnostics.map((d) => d.message),
    parsed.warnings,
  );
});

test("블록이 있는 줄을 가리킨다: 코드 블록, # 제목, 첫 제목 앞의 글", () => {
  const md = doc(["앞의 글 LEAD", "", "# 큰 제목 H1", "", "## 개요", "본문", "", "```", "code CODE", "```"]);
  assert.deepEqual(linesFor(md, /첫 문단 제목/), [lineOf(md, "LEAD")]);
  assert.deepEqual(linesFor(md, /# 제목은/), [lineOf(md, "H1")]);
  assert.deepEqual(linesFor(md, /코드 블록/), [lineOf(md, "```")]);
});

test("앞에서 주석 줄이 지워져도 원문 줄 번호가 맞는다", () => {
  const md = doc(["## 개요", "%% 주석 1", "%% 주석 2", "본문", "%% 주석 3", "```", "code CODE", "```"]);
  assert.deepEqual(linesFor(md, /코드 블록/), [lineOf(md, "```")]);
});

test("메타 블록 뒤의 줄 번호가 맞는다", () => {
  const md = doc(["---", "분류: 가", "정보:", "  작품: 작", "---", "", "## 개요", "본문", "", "```", "x", "```"]);
  assert.deepEqual(linesFor(md, /코드 블록/), [lineOf(md, "```")]);
});

test("메타 블록 안의 경고는 그 줄을 가리킨다", () => {
  const md = doc(["---", "분류: 가", "작가: 누구 BAD", "정보:", "\t탭 TAB", "---", "## 개요"]);
  assert.deepEqual(linesFor(md, /알 수 없는 이름/), [lineOf(md, "BAD")]);
  assert.deepEqual(linesFor(md, /탭/), [lineOf(md, "TAB")]);
});

test("여러 줄에 걸친 각주 뒤의 줄 번호가 맞는다", () => {
  const md = doc(["## 개요", "앞^[줄을", "바꾼", "각주] 뒤", "", "```", "x", "```"]);
  assert.deepEqual(linesFor(md, /코드 블록/), [lineOf(md, "```")]);
});

test("각주 안의 각주 경고는 그 각주가 시작한 줄을 가리킨다", () => {
  const md = doc(["## 개요", "첫 줄", "둘째 ^[바깥 ^[안쪽] 끝] NESTED"]);
  assert.deepEqual(linesFor(md, /각주 안에는/), [lineOf(md, "NESTED")]);
});

test("CSS 블록 뒤의 줄 번호가 맞는다", () => {
  const md = doc(["## 개요", ":::style", "color: red;", ":::", "안 1", "안 2", ":::", "", "```", "x", "```"]);
  assert.deepEqual(linesFor(md, /코드 블록/), [lineOf(md, "```")]);
});

test("버린 CSS 선언은 그 선언이 있는 줄을 가리킨다", () => {
  const md = doc(["## 개요", ":::style", "color: red;", "position: fixed;", "margin-top: 1px;", "top: 0;", ":::", "글", ":::"]);
  const lines = linesFor(md, /선언은 허용되지 않아/);
  assert.deepEqual(lines, [lineOf(md, "position"), lineOf(md, "top: 0")]);
});

test("CSS 블록 안의 제목과 코드 블록 경고도 원문 줄을 가리킨다", () => {
  const md = doc(["## 개요", "앞", ":::style", "color: red;", ":::", "본문", "", "### 안의 제목 INNER", "", "```", "x", "```", ":::"]);
  assert.deepEqual(linesFor(md, /제목을 쓸 수 없어/), [lineOf(md, "INNER")]);
  assert.deepEqual(linesFor(md, /코드 블록/), [lineOf(md, "```")]);
});

test("표·이미지·리스트 제한 경고는 그 블록의 줄을 가리킨다", () => {
  const wide = `| ${Array.from({ length: 13 }, (_, i) => i).join(" | ")} |`;
  const sep = `|${"---|".repeat(13)}`;
  const md = doc(["## 개요", "앞", "", wide, sep, wide, "", "- 1", "  - 2", "    - 3", "      - 4", "        - 5 FIVE"]);
  assert.deepEqual(linesFor(md, /표는 열/), [4]);
  // 넘친 가장 깊은 단계(5번째)의 줄을 가리킨다
  assert.deepEqual(linesFor(md, /리스트는 4단계/), [lineOf(md, "FIVE")]);
});

test("본문이 잘리면 잘린 줄을 알려 준다", () => {
  const line = "가".repeat(99);
  const md = `## 개요\n${Array.from({ length: 1100 }, () => line).join("\n")}\n끝 줄`;
  const [d] = parseWiki(md).diagnostics.filter((x) => /100,000자/.test(x.message));
  assert.ok(d.line !== undefined && d.line > 900 && d.line <= 1102);
});

test("[toc] 를 두 번 쓰면 두 번째 줄을 가리킨다", () => {
  const md = doc(["## 가", "[toc]", "", "## 나", "[toc]"]);
  assert.deepEqual(linesFor(md, /\[toc\] 는 한 번만/), [5]);
});

test("CRLF 줄바꿈이어도 줄 번호가 맞는다", () => {
  const md = ["## 개요", "%% 주석", "본문", "```", "x", "```"].join("\r\n");
  assert.deepEqual(linesFor(md, /코드 블록/), [4]);
});
