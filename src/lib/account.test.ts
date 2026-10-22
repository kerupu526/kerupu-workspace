import { test } from "node:test";
import assert from "node:assert/strict";
import { isEmail, parseAccountSettings, parseNewPassword } from "./account.ts";

const current = { email: "me@example.com", nickname: "켈프" };
const base = { nickname: "켈프", email: "me@example.com", newPassword: "", newPasswordConfirm: "", currentPassword: "" };

test("이메일 형식", () => {
  assert.equal(isEmail("a@b.co"), true);
  for (const bad of ["", "a", "a@b", "a b@c.d", "@b.c"]) assert.equal(isEmail(bad), false, bad);
});

test("새 비밀번호: 8자 이상이고 확인과 같아야 한다", () => {
  assert.equal(parseNewPassword("1234567", "1234567").ok, false);
  assert.equal(parseNewPassword("12345678", "12345679").ok, false);
  assert.equal(parseNewPassword("", "").ok, false);
  assert.deepEqual(parseNewPassword("12345678", "12345678"), { ok: true, value: "12345678" });
  assert.equal(parseNewPassword(null, undefined).ok, false);
});

test("바뀐 게 없으면 거부한다", () => {
  const result = parseAccountSettings(base, current);
  assert.equal(result.ok, false);
});

test("닉네임만 바꾸면 현재 비밀번호가 필요 없다", () => {
  const result = parseAccountSettings({ ...base, nickname: "새 이름" }, current);
  assert.ok(result.ok);
  assert.equal(result.value.nicknameChanged, true);
  assert.equal(result.value.needsCurrentPassword, false);
  assert.equal(result.value.email, undefined);
  assert.equal(result.value.password, undefined);
});

test("닉네임이 아직 없는 계정은 닉네임을 정하면 바뀐 것으로 본다", () => {
  const result = parseAccountSettings(base, { ...current, nickname: null });
  assert.ok(result.ok);
  assert.equal(result.value.nicknameChanged, true);
});

test("이메일을 바꾸면 현재 비밀번호가 필요하고, 소문자로 맞춘다", () => {
  const without = parseAccountSettings({ ...base, email: "New@Example.com" }, current);
  assert.equal(without.ok, false);
  const withPw = parseAccountSettings({ ...base, email: "New@Example.com", currentPassword: "old-password" }, current);
  assert.ok(withPw.ok);
  assert.equal(withPw.value.email, "new@example.com");
  assert.equal(withPw.value.needsCurrentPassword, true);
});

test("이메일 대소문자만 다르면 바뀐 게 아니다", () => {
  const result = parseAccountSettings({ ...base, email: "ME@Example.com" }, current);
  assert.equal(result.ok, false);
});

test("비밀번호를 바꾸면 현재 비밀번호가 필요하다", () => {
  const input = { ...base, newPassword: "new-password-1", newPasswordConfirm: "new-password-1" };
  assert.equal(parseAccountSettings(input, current).ok, false);
  const result = parseAccountSettings({ ...input, currentPassword: "old-password" }, current);
  assert.ok(result.ok);
  assert.equal(result.value.password, "new-password-1");
});

test("새 비밀번호 칸이 한쪽만 차 있으면 거부한다", () => {
  assert.equal(parseAccountSettings({ ...base, newPassword: "new-password-1", currentPassword: "x" }, current).ok, false);
  assert.equal(parseAccountSettings({ ...base, newPasswordConfirm: "new-password-1", currentPassword: "x" }, current).ok, false);
});

test("닉네임, 이메일 형식 오류는 거부한다", () => {
  assert.equal(parseAccountSettings({ ...base, nickname: "가" }, current).ok, false);
  assert.equal(parseAccountSettings({ ...base, email: "not-an-email" }, current).ok, false);
  assert.equal(parseAccountSettings({ ...base, email: "" }, current).ok, false);
});

test("문자열이 아닌 값이 와도 죽지 않는다", () => {
  const result = parseAccountSettings({ nickname: {}, email: 3, newPassword: [], newPasswordConfirm: null, currentPassword: 1 }, current);
  assert.equal(result.ok, false);
});
