import { test } from "node:test";
import assert from "node:assert/strict";
import { parseNickname } from "./nickname.ts";

test("앞뒤 공백을 지우고 받는다", () => {
  assert.deepEqual(parseNickname("  켈프  "), { ok: true, value: "켈프" });
});

test("비어 있거나 공백뿐이면 거부한다", () => {
  assert.equal(parseNickname("").ok, false);
  assert.equal(parseNickname("   ").ok, false);
  assert.equal(parseNickname(null).ok, false);
  assert.equal(parseNickname(undefined).ok, false);
});

test("2자 미만, 20자 초과는 거부하고 경계는 받는다", () => {
  assert.equal(parseNickname("가").ok, false);
  assert.equal(parseNickname("가나").ok, true);
  assert.equal(parseNickname("가".repeat(20)).ok, true);
  assert.equal(parseNickname("가".repeat(21)).ok, false);
});

test("문자열이 아닌 값이 와도 죽지 않는다", () => {
  assert.equal(parseNickname({}).ok, false);
  assert.equal(parseNickname(12).ok, false);
  assert.equal(parseNickname(new File(["x"], "a.txt")).ok, false);
});
