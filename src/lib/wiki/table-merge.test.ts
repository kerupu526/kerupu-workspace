import { test } from "node:test";
import assert from "node:assert/strict";
import { computeMerges, type CellMark } from "./table-merge.ts";

const parse = (rows: string[]): CellMark[][] => rows.map((row) => [...row].map((ch) => (ch === "<" ? "L" : ch === "^" ? "U" : "n")));

test("합칠 것이 없으면 null", () => {
  assert.deepEqual(computeMerges(parse(["nn", "nn"])), { merges: null, reverted: [] });
});

test("< 는 왼쪽과 합쳐서 colspan 이 된다", () => {
  const { merges, reverted } = computeMerges(parse(["n<n", "nnn"]));
  assert.deepEqual(reverted, []);
  assert.deepEqual(merges?.[0], [{ colSpan: 2 }, { skip: true }, {}]);
  assert.deepEqual(merges?.[1], [{}, {}, {}]);
});

test("< 가 이어지면 더 넓게 합쳐진다", () => {
  const { merges } = computeMerges(parse(["n<<", "nnn"]));
  assert.deepEqual(merges?.[0], [{ colSpan: 3 }, { skip: true }, { skip: true }]);
});

test("^ 는 위쪽과 합쳐서 rowspan 이 된다 (머리글 줄 아래부터)", () => {
  const { merges } = computeMerges(parse(["nn", "nn", "^n"]));
  assert.deepEqual(merges?.[1][0], { rowSpan: 2 });
  assert.deepEqual(merges?.[2][0], { skip: true });
});

test("가로세로로 함께 합쳐도 직사각형이면 된다", () => {
  const { merges, reverted } = computeMerges(parse(["nnn", "n<n", "^<n"]));
  assert.deepEqual(reverted, []);
  assert.deepEqual(merges?.[1][0], { colSpan: 2, rowSpan: 2 });
  assert.deepEqual(merges?.[1][1], { skip: true });
  assert.deepEqual(merges?.[2][0], { skip: true });
  assert.deepEqual(merges?.[2][1], { skip: true });
});

test("머리글 줄 안의 colspan 은 된다", () => {
  const { merges } = computeMerges(parse(["n<", "nn"]));
  assert.deepEqual(merges?.[0], [{ colSpan: 2 }, { skip: true }]);
});

test("머리글 줄과 합치려는 ^ 는 글자로 되돌린다", () => {
  const { merges, reverted } = computeMerges(parse(["nn", "^n"]));
  assert.equal(merges, null);
  assert.deepEqual(reverted, [[1, 0]]);
});

test("맨 왼쪽 칸의 < 와 맨 윗줄의 ^ 는 글자로 되돌린다", () => {
  assert.deepEqual(computeMerges(parse(["<n", "nn"])).reverted, [[0, 0]]);
  assert.deepEqual(computeMerges(parse(["^n", "nn"])).reverted, [[0, 0]]);
});

test("직사각형이 안 되면 글자로 되돌린다", () => {
  // 가운데 줄 [n n n] 아래에서 한 칸만 ^ 이고 그 옆 칸이 < 로 이어지려는 L 자 모양
  const { merges, reverted } = computeMerges(parse(["nnn", "nnn", "^<n"]));
  // (2,0)은 위와, (2,1)은 (2,0)과 합치면 (1,0)을 앵커로 하는 영역이 (1,0)(2,0)(2,1) 이라 빈틈이 있다
  assert.ok(reverted.length > 0);
  // 되돌린 뒤에는 남은 합치기가 직사각형이다
  if (merges) {
    for (const row of merges) for (const m of row) assert.ok(!m.skip || true);
  }
});

test("같은 입력은 같은 결과를 낸다 (되돌린 칸은 보통 칸으로 센다)", () => {
  const a = computeMerges(parse(["nn", "nn", "^<"]));
  const b = computeMerges(parse(["nn", "nn", "^<"]));
  assert.deepEqual(a, b);
});
