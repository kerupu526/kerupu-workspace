import { test } from "node:test";
import assert from "node:assert/strict";
import { escapeTableSpoilers } from "./table-spoiler.ts";
import { parseWiki } from "./parse.ts";

test("표 줄의 ||글|| 은 \\|\\|글\\|\\| 로 바뀐다", () => {
  assert.equal(escapeTableSpoilers("| 정체 | ||집사|| |"), "| 정체 | \\|\\|집사\\|\\| |");
  assert.equal(escapeTableSpoilers("| ||가|| | ||나|| |"), "| \\|\\|가\\|\\| | \\|\\|나\\|\\| |");
});

test("표 줄이 아니면 건드리지 않는다", () => {
  assert.equal(escapeTableSpoilers("범인은 ||집사||였다"), "범인은 ||집사||였다");
  assert.equal(escapeTableSpoilers("- 항목 ||숨김||"), "- 항목 ||숨김||");
});

test("이미 이스케이프한 것과 코드 조각, 코드 블록 안은 그대로 둔다", () => {
  assert.equal(escapeTableSpoilers("| a | \\|\\|b\\|\\| |"), "| a | \\|\\|b\\|\\| |");
  assert.equal(escapeTableSpoilers("| a | `||b||` |"), "| a | `||b||` |");
  assert.equal(escapeTableSpoilers("```\n| a | ||b|| |\n```"), "```\n| a | ||b|| |\n```");
});

test("속이 비었거나 공백뿐이거나 | 가 끼면 짝이 아니다", () => {
  assert.equal(escapeTableSpoilers("| a |||| b |"), "| a |||| b |");
  assert.equal(escapeTableSpoilers("| a || || b |"), "| a || || b |");
  assert.equal(escapeTableSpoilers("| a || b | c |"), "| a || b | c |");
});

test("줄 수는 바뀌지 않는다", () => {
  const md = "| a | b |\n|:---|:---|\n| ||x|| | y |\n";
  assert.equal(escapeTableSpoilers(md).split("\n").length, md.split("\n").length);
});

test("본문 표 칸에서 ||글|| 이 이스케이프 없이 스포일러가 된다", () => {
  const parsed = parseWiki("## 개요\n| 항목 | 값 |\n|:---|:---|\n| 정체 | ||집사|| |\n| 나이 | 18세 |\n");
  const table = parsed.sections[0].blocks[0];
  assert.ok(table.type === "table");
  assert.equal(table.head.length, 2);
  assert.deepEqual(table.rows[0], [["정체"], [{ spoiler: ["집사"] }]]);
  assert.deepEqual(table.rows[1], [["나이"], ["18세"]]);
});

test("머리글 칸과 굵은 글 속에서도 된다", () => {
  const table = parseWiki("## 개요\n| ||숨김|| | b |\n|:---|:---|\n| **a ||x||** | 1 |\n").sections[0].blocks[0];
  assert.ok(table.type === "table");
  assert.deepEqual(table.head[0], [{ spoiler: ["숨김"] }]);
});

test("정보 상자의 표에서도 이스케이프 없이 된다", () => {
  const parsed = parseWiki("---\n정보:\n  제목: 켈프\n  | 기본 정보 | < |\n  |:---:|:---|\n  | 이름 | ||니얼굴|| |\n---\n\n## 개요\n글\n");
  const table = parsed.meta.infobox.table;
  assert.ok(table);
  assert.deepEqual(table.rows[0][1], [{ spoiler: ["니얼굴"] }]);
  assert.equal(parsed.diagnostics.length, 0);
});

test("\\|\\|글\\|\\| 로 직접 써도 여전히 된다", () => {
  const table = parseWiki("## 개요\n| a | b |\n|:---|:---|\n| 1 | \\|\\|숨김\\|\\| |\n").sections[0].blocks[0];
  assert.ok(table.type === "table");
  assert.deepEqual(table.rows[0][1], [{ spoiler: ["숨김"] }]);
});

test("빈 칸을 띄어 쓴 표는 예전처럼 읽힌다", () => {
  const table = parseWiki("## 개요\n| a | b | c |\n|:---|:---|:---|\n| 1 | | 3 |\n").sections[0].blocks[0];
  assert.ok(table.type === "table");
  assert.deepEqual(table.rows[0].map((cell) => cell.length), [1, 0, 1]);
});
