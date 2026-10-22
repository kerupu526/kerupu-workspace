import { test } from "node:test";
import assert from "node:assert/strict";
import { parseWiki } from "./parse.ts";

function tableOf(body: string) {
  const parsed = parseWiki(`## 개요\n${body}`);
  const block = parsed.sections[0].blocks.find((b) => b.type === "table");
  assert.ok(block && block.type === "table", `표가 있어야 한다: ${JSON.stringify(parsed.sections[0].blocks)}`);
  return { table: block, parsed };
}

test("합치기가 없는 표는 예전 모양 그대로다 (merges 없음)", () => {
  const { table } = tableOf("| a | b |\n|:---|:---|\n| 1 | 2 |\n");
  assert.equal("merges" in table, false);
  assert.deepEqual(table.head, [["a"], ["b"]]);
  assert.deepEqual(table.rows, [[["1"], ["2"]]]);
});

test("< 칸은 왼쪽과 합쳐진다 (colspan)", () => {
  const { table } = tableOf("| 기본 정보 | < |\n|:---|:---|\n| 이름 | 켈프 |\n");
  assert.deepEqual(table.merges?.[0], [{ colSpan: 2 }, { skip: true }]);
  assert.deepEqual(table.merges?.[1], [{}, {}]);
});

test("^ 칸은 위쪽과 합쳐진다 (rowspan)", () => {
  const { table } = tableOf("| 항목 | 값 |\n|:---|:---|\n| 소속 | 가 |\n| ^ | 나 |\n");
  assert.deepEqual(table.merges?.[1][0], { rowSpan: 2 });
  assert.deepEqual(table.merges?.[2][0], { skip: true });
});

test("가로세로 합치기가 함께 있어도 된다", () => {
  const { table, parsed } = tableOf("| a | b | c |\n|:---|:---|:---|\n| 큰 칸 | < | 1 |\n| ^ | < | 2 |\n");
  assert.deepEqual(table.merges?.[1][0], { colSpan: 2, rowSpan: 2 });
  assert.equal(parsed.diagnostics.length, 0);
});

test("코드로 쓴 < 는 합치기가 아니라 글자다", () => {
  const { table } = tableOf("| a | b |\n|:---|:---|\n| 1 | `<` |\n");
  assert.equal("merges" in table, false);
  assert.deepEqual(table.rows[0][1], [{ code: "<" }]);
});

test("합칠 수 없는 < ^ 는 글자로 남기고 경고한다", () => {
  const { table, parsed } = tableOf("| < | b |\n|:---|:---|\n| ^ | 1 |\n");
  assert.equal("merges" in table, false);
  assert.deepEqual(table.head[0], ["<"]);
  assert.ok(parsed.warnings.some((w) => w.includes("합칠 수 없는")));
});

test("칸의 정렬과 서식은 그대로이고 합쳐진 칸의 내용은 앵커 칸의 것이다", () => {
  const { table } = tableOf("| **굵게** | < |\n|:---:|:---|\n| 1 | 2 |\n");
  assert.deepEqual(table.head[0], [{ strong: ["굵게"] }]);
  assert.equal(table.align[0], "center");
});

/* ---- 정보 상자의 표 (메타 블록의 정보 아래) ---- */

const META = (inner: string) => `---\n분류: 등장인물\n정보:\n  제목: 켈프\n${inner}---\n\n## 개요\n글\n`;

test("정보 아래의 표는 정보 상자의 표가 된다", () => {
  const parsed = parseWiki(META("  | 기본 정보 | < |\n  |:---|:---|\n  | 이름 | **켈프** |\n  | 소속 | \\|\\|비밀\\|\\| |\n"));
  const table = parsed.meta.infobox.table;
  assert.ok(table);
  assert.deepEqual(table.merges?.[0], [{ colSpan: 2 }, { skip: true }]);
  assert.deepEqual(table.rows[0][1], [{ strong: ["켈프"] }]);
  assert.deepEqual(table.rows[1][1], [{ spoiler: ["비밀"] }]);
  assert.equal(parsed.meta.infobox.title, "켈프");
  assert.equal(parsed.diagnostics.length, 0);
});

test("정보의 이름: 값 줄과 표를 함께 쓸 수 있다", () => {
  const parsed = parseWiki(
    `---\n정보:\n  제목: 켈프\n  작품: 바다\n  | a | b |\n  |:---|:---|\n  | 1 | 2 |\n---\n\n## 개요\n글\n`,
  );
  assert.deepEqual(parsed.meta.infobox.rows, [{ label: "작품", value: "바다" }]);
  assert.ok(parsed.meta.infobox.table);
  assert.equal(parsed.diagnostics.length, 0);
});

test("들여쓰지 않은 표 줄도 정보의 표로 받는다", () => {
  const parsed = parseWiki(`---\n정보:\n  제목: 켈프\n| a | b |\n|:---|:---|\n| 1 | 2 |\n---\n\n## 개요\n글\n`);
  assert.ok(parsed.meta.infobox.table);
  assert.equal(parsed.meta.infobox.title, "켈프");
});

test("올바른 표가 아니면 버리고 경고한다 (--- 줄 없음)", () => {
  const parsed = parseWiki(META("  | a | b |\n  | 1 | 2 |\n"));
  assert.equal(parsed.meta.infobox.table, undefined);
  const warning = parsed.diagnostics.find((d) => d.message.includes("올바른 표가 아니라"));
  assert.ok(warning);
  assert.equal(warning.line, 5); // 원문에서 표의 첫 줄
});

test("정보 밖의 표 줄은 버리고 경고한다", () => {
  const parsed = parseWiki(`---\n분류: 등장인물\n| a | b |\n|:---|:---|\n| 1 | 2 |\n정보:\n  제목: 켈프\n---\n\n## 개요\n글\n`);
  assert.equal(parsed.meta.infobox.table, undefined);
  assert.ok(parsed.diagnostics.some((d) => d.message.includes("정보: 아래에 써야")));
});

test("정보 표 안의 합칠 수 없는 칸도 경고 줄 번호가 원문 기준이다", () => {
  const parsed = parseWiki(META("  | < | b |\n  |:---|:---|\n  | 1 | 2 |\n"));
  assert.ok(parsed.meta.infobox.table);
  assert.equal("merges" in parsed.meta.infobox.table, false);
  const w = parsed.diagnostics.find((d) => d.message.includes("합칠 수 없는"));
  assert.ok(w);
  assert.equal(w.line, 5);
});
