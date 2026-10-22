import { test } from "node:test";
import assert from "node:assert/strict";
import { canDelete, deleteBlockedNote, deletePermission, deletionErrorMessage } from "./deletion.ts";

const NOW = Date.parse("2026-10-24T12:00:00Z");
const minutesAgo = (m: number) => new Date(NOW - m * 60 * 1000).toISOString();
const daysAgo = (d: number) => minutesAgo(d * 24 * 60);
const author = (createdAt: string) => deletePermission({ isOperator: false, isAuthor: true, createdAt, now: NOW });

test("운영자는 만든 지 얼마가 됐든 바로 지울 수 있다", () => {
  assert.deepEqual(deletePermission({ isOperator: true, isAuthor: false, createdAt: daysAgo(400), now: NOW }), { kind: "operator" });
  assert.deepEqual(deletePermission({ isOperator: true, isAuthor: true, createdAt: minutesAgo(1), now: NOW }), { kind: "operator" });
});

test("작성자는 만든 지 30분이 안 되면 지울 수 없고 남은 분을 알려 준다", () => {
  assert.deepEqual(author(minutesAgo(0)), { kind: "too_early", minutesLeft: 30 });
  assert.deepEqual(author(minutesAgo(10)), { kind: "too_early", minutesLeft: 20 });
  assert.deepEqual(author(minutesAgo(29.5)), { kind: "too_early", minutesLeft: 1 });
});

test("작성자는 30분이 지나면 30일 안에서 바로 지울 수 있다", () => {
  assert.deepEqual(author(minutesAgo(30)), { kind: "author", daysLeft: 30 });
  assert.deepEqual(author(daysAgo(10)), { kind: "author", daysLeft: 20 });
  assert.deepEqual(author(daysAgo(29.5)), { kind: "author", daysLeft: 1 });
});

test("30일이 지나면 작성자는 직접 지울 수 없다", () => {
  assert.deepEqual(author(daysAgo(30)), { kind: "expired" });
  assert.deepEqual(author(daysAgo(90)), { kind: "expired" });
});

test("남의 것은 지울 수 없다", () => {
  assert.deepEqual(deletePermission({ isOperator: false, isAuthor: false, createdAt: daysAgo(1), now: NOW }), { kind: "none" });
});

test("삭제 버튼을 눌러 볼 수 있는 경우와 막힌 이유", () => {
  assert.equal(canDelete({ kind: "operator" }), true);
  assert.equal(canDelete({ kind: "author", daysLeft: 3 }), true);
  assert.equal(canDelete({ kind: "too_early", minutesLeft: 5 }), false);
  assert.equal(canDelete({ kind: "expired" }), false);
  assert.equal(canDelete({ kind: "none" }), false);

  assert.match(deleteBlockedNote({ kind: "too_early", minutesLeft: 5 }) ?? "", /30분이 지나야.*약 5분 뒤/);
  assert.match(deleteBlockedNote({ kind: "expired" }) ?? "", /30일이 지나서/);
  assert.equal(deleteBlockedNote({ kind: "operator" }), null);
  assert.equal(deleteBlockedNote({ kind: "none" }), null);
});

test("DB 오류 이름을 문구로 바꾼다", () => {
  assert.match(deletionErrorMessage("too_early"), /30분이 지나야/);
  assert.match(deletionErrorMessage("window_passed"), /30일이 지나서/);
  assert.match(deletionErrorMessage("author_only"), /만든 사람이나 운영자만/);
  assert.match(deletionErrorMessage("not_found"), /이미 삭제됐거나/);
  assert.match(deletionErrorMessage(undefined), /삭제하지 못했어요/);
  assert.match(deletionErrorMessage("something else"), /삭제하지 못했어요/);
});
