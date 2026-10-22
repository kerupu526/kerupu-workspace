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
