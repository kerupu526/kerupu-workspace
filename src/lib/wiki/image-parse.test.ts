import { test } from "node:test";
import assert from "node:assert/strict";
import { parseWiki } from "./parse.ts";

const BASE = "https://abc.supabase.co";
const ID = "11111111-1111-1111-1111-111111111111";
const FILE = "22222222-2222-2222-2222-222222222222";
const URL_OK = `${BASE}/storage/v1/object/public/images/${ID}/${FILE}.png`;

/* NEXT_PUBLIC_SUPABASE_URL 을 잠깐 바꿔서 실행한다 */
function withBase<T>(value: string | undefined, run: () => T): T {
  const before = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (value === undefined) delete process.env.NEXT_PUBLIC_SUPABASE_URL;
  else process.env.NEXT_PUBLIC_SUPABASE_URL = value;
  try {
    return run();
  } finally {
    if (before === undefined) delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    else process.env.NEXT_PUBLIC_SUPABASE_URL = before;
  }
}

test("업로드한 이미지 주소는 본문 이미지로 쓸 수 있다", () => {
  const parsed = withBase(BASE, () => parseWiki(`## 개요\n\n![그림](${URL_OK})\n`));
  assert.deepEqual(parsed.sections[0].blocks[0], { type: "image", src: URL_OK, alt: "그림" });
});

test("업로드한 이미지 주소는 정보 상자 이미지로 쓸 수 있다", () => {
  const parsed = withBase(BASE, () => parseWiki(`---\n정보:\n  제목: 켈프\n이미지: ${URL_OK}\n---\n\n## 개요\n글\n`));
  assert.equal(parsed.meta.infobox.image, URL_OK);
  assert.equal(parsed.diagnostics.length, 0);
});

test("다른 사이트나 다른 버킷의 주소는 이미지가 되지 않는다", () => {
  withBase(BASE, () => {
    for (const src of [
      `https://evil.example/storage/v1/object/public/images/${ID}/${FILE}.png`,
      `${BASE}/storage/v1/object/public/other/${ID}/${FILE}.png`,
      "https://example.com/a.png",
    ]) {
      const parsed = parseWiki(`## 개요\n\n![그림](${src})\n`);
      assert.notEqual(parsed.sections[0].blocks[0].type, "image", src);
    }
  });
});

test("프로젝트 주소 설정이 없으면 업로드 주소는 받지 않고 /uploads/ 는 그대로 받는다", () => {
  withBase(undefined, () => {
    assert.notEqual(parseWiki(`## 개요\n\n![그림](${URL_OK})\n`).sections[0].blocks[0].type, "image");
    assert.equal(parseWiki("## 개요\n\n![그림](/uploads/a.png)\n").sections[0].blocks[0].type, "image");
  });
});

test("이미지 주소가 거부되면 경고가 편집 화면에 뜬다 (정보 상자 이미지)", () => {
  const parsed = withBase(BASE, () => parseWiki("---\n정보:\n  제목: 켈프\n이미지: https://example.com/a.png\n---\n\n## 개요\n글\n"));
  assert.ok(parsed.diagnostics.some((d) => d.message.includes("이미지 업로드 화면")));
});
