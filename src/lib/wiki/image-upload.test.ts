import { test } from "node:test";
import assert from "node:assert/strict";
import { checkSvg, detectRasterType, looksLikeSvg, MAX_IMAGE_BYTES } from "./image-upload.ts";
import { isLegacyUploadPath, isStorageImageUrl, storageImageUrl } from "./image-url.ts";

const bytes = (...values: number[]) => Uint8Array.from(values);
const ascii = (text: string) => Uint8Array.from([...text].map((c) => c.charCodeAt(0)));

test("한도는 8MB", () => {
  assert.equal(MAX_IMAGE_BYTES, 8 * 1024 * 1024);
});

test("PNG, JPEG, GIF, WebP 는 머리 글자로 알아본다", () => {
  assert.deepEqual(detectRasterType(bytes(0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0)), { ext: "png", mime: "image/png" });
  assert.deepEqual(detectRasterType(bytes(0xff, 0xd8, 0xff, 0xe0)), { ext: "jpg", mime: "image/jpeg" });
  assert.deepEqual(detectRasterType(ascii("GIF89a....")), { ext: "gif", mime: "image/gif" });
  assert.deepEqual(detectRasterType(ascii("GIF87a....")), { ext: "gif", mime: "image/gif" });
  assert.deepEqual(detectRasterType(ascii("RIFF\0\0\0\0WEBPVP8 ")), { ext: "webp", mime: "image/webp" });
});

test("이미지가 아닌 파일과 비슷한 이름의 파일은 거부한다", () => {
  assert.equal(detectRasterType(ascii("<html><script>alert(1)</script>")), null);
  assert.equal(detectRasterType(ascii("RIFF\0\0\0\0WAVEfmt ")), null); // WAV
  assert.equal(detectRasterType(ascii("%PDF-1.7")), null);
  assert.equal(detectRasterType(new Uint8Array(0)), null);
});

test("SVG 인지 알아본다 (BOM, XML 선언, 주석, DOCTYPE 건너뜀)", () => {
  assert.equal(looksLikeSvg('<svg xmlns="http://www.w3.org/2000/svg"></svg>'), true);
  assert.equal(looksLikeSvg('﻿<?xml version="1.0"?>\n<!-- 주석 -->\n<!DOCTYPE svg PUBLIC "-//W3C//DTD SVG 1.1//EN" "x.dtd">\n<svg width="1"/>'), true);
  assert.equal(looksLikeSvg("<html></html>"), false);
  assert.equal(looksLikeSvg("hello"), false);
});

const SIMPLE = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 10 10"><defs><linearGradient id="g"><stop offset="0" stop-color="#fff"/></linearGradient></defs><rect width="10" height="10" fill="url(#g)"/><use href="#g"/></svg>';

test("단순한 SVG 는 올릴 수 있다", () => {
  assert.equal(checkSvg(SIMPLE), null);
  assert.equal(checkSvg('<svg xmlns="http://www.w3.org/2000/svg"><style>.a{fill:red}</style><image href="data:image/png;base64,AAAA"/></svg>'), null);
});

test("위험한 SVG 는 거부한다", () => {
  const bad = [
    '<svg><script>alert(1)</script></svg>',
    '<svg><SCRIPT src="x.js"></SCRIPT></svg>',
    '<svg onload="alert(1)"></svg>',
    '<svg><rect onclick = "x()"/></svg>',
    '<svg><a href="javascript:alert(1)"><text>x</text></a></svg>',
    '<svg><a xlink:href="https://example.com/x"><text>x</text></a></svg>',
    "<svg><image href='http://tracker.example/p.png'/></svg>",
    '<svg><foreignObject><div>x</div></foreignObject></svg>',
    '<svg><iframe src="x"></iframe></svg>',
    '<svg><style>@import url(https://example.com/a.css);</style></svg>',
    '<svg><rect style="fill:url(https://example.com/a)"/></svg>',
    '<svg><rect style="width:expression(alert(1))"/></svg>',
    '<!DOCTYPE svg [<!ENTITY a "aaaa">]><svg>&a;</svg>',
    '<?xml-stylesheet href="x.css"?><svg/>',
    '<svg><!-- <script> --></svg>',
    '<svg><image href="data:text/html,<script>1</script>"/></svg>',
    '<svg><use href="other.svg#a"/></svg>',
  ];
  for (const svg of bad) assert.notEqual(checkSvg(svg), null, svg);
});

test("SVG 가 아닌 글은 거부한다", () => {
  assert.equal(checkSvg("<html><body>hi</body></html>"), "올바른 SVG 파일이 아니에요.");
});

const BASE = "https://abc.supabase.co";
const ID = "11111111-1111-1111-1111-111111111111";
const FILE = "22222222-2222-2222-2222-222222222222";

test("업로드 화면이 만든 주소만 위키 이미지로 받는다", () => {
  const ok = storageImageUrl(BASE, `${ID}/${FILE}.png`);
  assert.equal(ok, `${BASE}/storage/v1/object/public/images/${ID}/${FILE}.png`);
  assert.equal(isStorageImageUrl(ok, BASE), true);
  assert.equal(isStorageImageUrl(ok, `${BASE}/`), true);
  for (const ext of ["jpg", "webp", "gif", "svg"]) assert.equal(isStorageImageUrl(storageImageUrl(BASE, `${ID}/${FILE}.${ext}`), BASE), true, ext);
});

test("다른 주소, 다른 버킷, 이상한 모양은 받지 않는다", () => {
  const prefix = `${BASE}/storage/v1/object/public/images/`;
  const bad = [
    `https://evil.example/storage/v1/object/public/images/${ID}/${FILE}.png`,
    `${BASE}/storage/v1/object/public/other/${ID}/${FILE}.png`,
    `${prefix}${ID}/${FILE}.exe`,
    `${prefix}${ID}/${FILE}.png?x=1`,
    `${prefix}${ID}/../${FILE}.png`,
    `${prefix}../${FILE}.png`,
    `${prefix}${ID}/${FILE}.png/extra`,
    `${prefix}not-a-uuid/${FILE}.png`,
    `${BASE}/storage/v1/object/sign/images/${ID}/${FILE}.png`,
    `${BASE}.evil.example/storage/v1/object/public/images/${ID}/${FILE}.png`,
  ];
  for (const src of bad) assert.equal(isStorageImageUrl(src, BASE), false, src);
  assert.equal(isStorageImageUrl(`${prefix}${ID}/${FILE}.png`, undefined), false);
  assert.equal(isStorageImageUrl(`${prefix}${ID}/${FILE}.png`, ""), false);
});

test("예전 /uploads/ 주소는 그대로 받는다", () => {
  assert.equal(isLegacyUploadPath("/uploads/a.png"), true);
  assert.equal(isLegacyUploadPath("/uploads/../a.png"), false);
  assert.equal(isLegacyUploadPath("/other/a.png"), false);
});

/* ---- 목록 카드용 대표 이미지 (imageForList) ---- */

import { imageForList, isAllowedImageSrc } from "./image-url.ts";

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

test("업로드한 주소와 /uploads/ 주소는 목록 카드 이미지로 쓸 수 있다", () => {
  withBase(BASE, () => {
    const url = storageImageUrl(BASE, `${ID}/${FILE}.webp`);
    assert.equal(imageForList(url), url);
    assert.equal(imageForList("/uploads/characters/a-1.png"), "/uploads/characters/a-1.png");
    assert.equal(isAllowedImageSrc(url), true);
  });
});

test("없거나 허용되지 않거나 DB 모양 검사에 걸릴 주소는 null 이다", () => {
  withBase(BASE, () => {
    assert.equal(imageForList(undefined), null);
    assert.equal(imageForList(""), null);
    assert.equal(imageForList("https://example.com/a.png"), null);
    assert.equal(imageForList(`https://evil.example/storage/v1/object/public/images/${ID}/${FILE}.png`), null);
    assert.equal(imageForList("/uploads/한글 이름.png"), null); // DB 모양(영문, 숫자, . _ - /)이 아니다
    assert.equal(imageForList("/uploads/../x.png"), null);
    assert.equal(imageForList(`${storageImageUrl(BASE, `${ID}/${FILE}.png`)}?x=1`), null);
  });
  // 프로젝트 주소 설정이 없으면 업로드 주소는 받지 않는다
  withBase(undefined, () => assert.equal(imageForList(storageImageUrl(BASE, `${ID}/${FILE}.png`)), null));
});

/* ---- 사이트 안 경로 /media/... ---- */

import { isMediaPath, mediaObjectPath, mediaPath } from "./image-url.ts";

test("업로드 경로는 /media/<사용자 ID>/<파일 ID>.<확장자> 이고 프로젝트 주소 설정 없이도 이미지로 받는다", () => {
  const path = mediaPath(`${ID}/${FILE}.webp`);
  assert.equal(path, `/media/${ID}/${FILE}.webp`);
  assert.equal(isMediaPath(path), true);
  withBase(undefined, () => {
    assert.equal(isAllowedImageSrc(path), true);
    assert.equal(imageForList(path), path);
  });
});

test("모양이 다른 /media/ 경로는 받지 않는다", () => {
  for (const src of [
    `/media/${ID}/${FILE}.exe`,
    `/media/${ID}/${FILE}.png?x=1`,
    `/media/${ID}/${FILE}.png/extra`,
    `/media/${ID}/../${FILE}.png`,
    `/media/someone/${FILE}.png`,
    `/media/${ID}/photo.png`,
    `//evil.example/media/${ID}/${FILE}.png`,
    `/other/${ID}/${FILE}.png`,
  ]) {
    assert.equal(isMediaPath(src), false, src);
    assert.equal(isAllowedImageSrc(src), false, src);
  }
});

test("/media 길은 UUID 두 조각과 허용한 확장자만 Storage 경로로 바꾼다", () => {
  assert.deepEqual(mediaObjectPath(ID, `${FILE}.png`), { path: `${ID}/${FILE}.png`, ext: "png" });
  assert.deepEqual(mediaObjectPath(ID, `${FILE}.svg`), { path: `${ID}/${FILE}.svg`, ext: "svg" });
  for (const [uid, file] of [
    ["..", `${FILE}.png`],
    [ID, "../x.png"],
    [ID, `${FILE}.png%2f..%2f..`],
    [ID, `${FILE}.exe`],
    [ID, FILE],
    ["other-bucket", `${FILE}.png`],
    [`${ID}/..`, `${FILE}.png`],
  ]) {
    assert.equal(mediaObjectPath(uid, file), null, `${uid}/${file}`);
  }
});

test("예전에 올린 Storage 주소도 그대로 받는다", () => {
  withBase(BASE, () => {
    const old = storageImageUrl(BASE, `${ID}/${FILE}.png`);
    assert.equal(isAllowedImageSrc(old), true);
    assert.equal(imageForList(old), old);
  });
});
