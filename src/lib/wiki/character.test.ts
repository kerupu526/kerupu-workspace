import { test } from "node:test";
import assert from "node:assert/strict";
import { buildCharacterMarkdown, parseCharacterInput } from "./character.ts";
import { parseWiki } from "./parse.ts";

const valid = { slug: "kelp-chan", name: "켈프", work: "테스트 작품", summary: "바다에 사는 아이" };

test("올바른 입력은 그대로 받는다", () => {
  assert.deepEqual(parseCharacterInput(valid), { ok: true, value: valid });
});

test("앞뒤 공백을 지우고 줄바꿈과 겹친 공백은 한 칸으로 줄인다", () => {
  const result = parseCharacterInput({ ...valid, name: "  켈프 \n  쨩  ", summary: "한 줄\n두 줄" });
  assert.ok(result.ok);
  assert.equal(result.value.name, "켈프 쨩");
  assert.equal(result.value.summary, "한 줄 두 줄");
});

test("위키 주석 표시(%%)는 빼고 받는다", () => {
  const result = parseCharacterInput({ ...valid, name: "켈%%프" });
  assert.ok(result.ok);
  assert.equal(result.value.name, "켈%프");
});

test("이름은 비울 수 없고, 작품과 한 줄 설명은 비울 수 있다", () => {
  assert.equal(parseCharacterInput({ ...valid, name: "  " }).ok, false);
  const noWork = parseCharacterInput({ ...valid, work: "  " });
  assert.ok(noWork.ok);
  assert.equal(noWork.value.work, "");
  assert.equal(parseCharacterInput({ ...valid, summary: "" }).ok, true);
});

test("길이 상한을 넘으면 거부한다", () => {
  assert.equal(parseCharacterInput({ ...valid, name: "가".repeat(101) }).ok, false);
  assert.equal(parseCharacterInput({ ...valid, name: "가".repeat(100) }).ok, true);
  assert.equal(parseCharacterInput({ ...valid, work: "가".repeat(101) }).ok, false);
  assert.equal(parseCharacterInput({ ...valid, summary: "가".repeat(201) }).ok, false);
  assert.equal(parseCharacterInput({ ...valid, summary: "가".repeat(200) }).ok, true);
});

test("주소는 소문자, 숫자, 하이픈만 쓸 수 있다", () => {
  for (const slug of ["", "Kelp", "kelp chan", "켈프", "-kelp", "kelp_chan", "a".repeat(81)]) {
    assert.equal(parseCharacterInput({ ...valid, slug }).ok, false, slug);
  }
  for (const slug of ["k", "kelp-1", "1", "a".repeat(80)]) {
    assert.equal(parseCharacterInput({ ...valid, slug }).ok, true, slug);
  }
});

test("new 는 예약된 주소라 쓸 수 없다", () => {
  assert.equal(parseCharacterInput({ ...valid, slug: "new" }).ok, false);
  assert.equal(parseCharacterInput({ ...valid, slug: "new-1" }).ok, true);
});

test("문자열이 아닌 값이 와도 죽지 않고 거부한다", () => {
  assert.equal(parseCharacterInput({ slug: null, name: undefined, work: 3, summary: {} }).ok, false);
});

test("첫 원문은 파서가 제목과 작품을 읽을 수 있고 경고가 없다", () => {
  const parsed = parseWiki(buildCharacterMarkdown(valid));
  assert.equal(parsed.meta.infobox.title, "켈프");
  assert.deepEqual(parsed.meta.infobox.rows, [{ label: "작품", value: "테스트 작품" }]);
  assert.deepEqual(parsed.meta.categories, ["등장인물"]);
  assert.equal(parsed.diagnostics.length, 0);
});

test("작품이 없으면 첫 원문에 작품 줄을 쓰지 않는다", () => {
  const markdown = buildCharacterMarkdown({ ...valid, work: "" });
  assert.doesNotMatch(markdown, /작품/);
  const parsed = parseWiki(markdown);
  assert.equal(parsed.meta.infobox.title, "켈프");
  assert.deepEqual(parsed.meta.infobox.rows, []);
  assert.equal(parsed.diagnostics.length, 0);
});

test("값에 콜론이나 쉼표가 있어도 제목과 작품이 그대로 나온다", () => {
  const parsed = parseWiki(buildCharacterMarkdown({ name: "A: B, C", work: "작품: 1, 2", summary: "" }));
  assert.equal(parsed.meta.infobox.title, "A: B, C");
  assert.equal(parsed.meta.infobox.rows[0].value, "작품: 1, 2");
});

test("한 줄 설명이 비면 안내 문구를 넣는다", () => {
  assert.match(buildCharacterMarkdown({ ...valid, summary: "" }), /## 개요\n아직 쓰지 않았어요\./);
});
