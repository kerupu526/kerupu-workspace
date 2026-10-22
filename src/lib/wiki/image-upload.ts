/*
 * 이미지 업로드 검사. 이 파일은 아무것도 가져오지 않는다 (Node 테스트에서 그대로 읽는다).
 *   - 형식은 파일 이름이나 브라우저가 알려 준 형식이 아니라 파일 내용(머리 글자)으로 판단한다.
 *   - SVG 는 글자 파일이라 스크립트를 담을 수 있어서, 위험한 구성(스크립트, 이벤트 속성, 바깥 주소 참조 등)이
 *     하나라도 있으면 올리지 않는다. 고쳐서 받아 주는 방식이 아니라 거부하는 방식이다.
 * 한도와 허용 형식은 supabase/migrations/20261023090000_images_bucket.sql 의 버킷 설정과 같게 맞춘다.
 */

export const MAX_IMAGE_BYTES = 8 * 1024 * 1024;

export interface ImageKind {
  /** 파일 이름 끝에 붙일 확장자 */
  ext: "png" | "jpg" | "webp" | "gif" | "svg";
  mime: "image/png" | "image/jpeg" | "image/webp" | "image/gif" | "image/svg+xml";
}

export const ACCEPTED_TYPES = "image/png,image/jpeg,image/webp,image/gif,image/svg+xml";
export const ACCEPTED_LABEL = "PNG, JPEG, WebP, GIF, SVG";

const startsWith = (bytes: Uint8Array, signature: number[], offset = 0) =>
  signature.every((value, i) => bytes[offset + i] === value);

/* 파일 내용의 머리 글자로 형식을 알아낸다. SVG 는 글자 파일이라 여기서 판단하지 않는다 (looksLikeSvg). */
export function detectRasterType(bytes: Uint8Array): ImageKind | null {
  if (startsWith(bytes, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) return { ext: "png", mime: "image/png" };
  if (startsWith(bytes, [0xff, 0xd8, 0xff])) return { ext: "jpg", mime: "image/jpeg" };
  if (startsWith(bytes, [0x47, 0x49, 0x46, 0x38, 0x37, 0x61]) || startsWith(bytes, [0x47, 0x49, 0x46, 0x38, 0x39, 0x61])) {
    return { ext: "gif", mime: "image/gif" };
  }
  // WebP: "RIFF" + 크기 4바이트 + "WEBP"
  if (startsWith(bytes, [0x52, 0x49, 0x46, 0x46]) && startsWith(bytes, [0x57, 0x45, 0x42, 0x50], 8)) {
    return { ext: "webp", mime: "image/webp" };
  }
  return null;
}

/* 앞쪽의 BOM, 공백, XML 선언, 주석, DOCTYPE 을 건너뛰고 <svg 로 시작하는 글인지 */
export function looksLikeSvg(text: string): boolean {
  const head = text
    .replace(/^﻿/, "")
    .replace(/^(?:\s|<\?xml[^>]*\?>|<!--[\s\S]*?-->|<!DOCTYPE[^>[]*>)*/i, "");
  return /^<svg[\s>]/i.test(head);
}

/*
 * SVG 를 올려도 되는지 본다. 문제가 있으면 사용자에게 보여 줄 이유를, 없으면 null 을 돌려준다.
 * 글 전체(주석, CDATA 안까지)에서 찾아서 숨겨 둔 것도 걸러지게 한다.
 */
export function checkSvg(text: string): string | null {
  const reject = (what: string) => `이 SVG 는 올릴 수 없어요 (${what}). 이미지 편집 프로그램에서 단순한 SVG 로 다시 내보내 주세요.`;

  if (!looksLikeSvg(text)) return "올바른 SVG 파일이 아니에요.";
  if (/<!ENTITY/i.test(text) || /<!DOCTYPE[^>]*\[/i.test(text)) return reject("엔티티 정의가 들어 있음");
  if (/<\?xml-stylesheet/i.test(text)) return reject("외부 스타일시트를 불러옴");
  if (/<\s*(script|foreignObject|iframe|embed|object|audio|video|link|meta|handler|listener)\b/i.test(text)) {
    return reject("스크립트나 외부 내용을 넣는 요소가 들어 있음");
  }
  if (/\son[a-z]+\s*=/i.test(text)) return reject("이벤트 속성(onclick 등)이 들어 있음");
  if (/javascript\s*:|vbscript\s*:|data\s*:\s*text\/html|expression\s*\(|-moz-binding|behavior\s*:/i.test(text)) {
    return reject("실행되는 주소나 스타일이 들어 있음");
  }
  if (/@import/i.test(text)) return reject("외부 스타일을 불러오는 @import 가 들어 있음");

  // 주소로 불러오는 것은 같은 파일 안의 조각(#id)과 작은 그림(data:image/png 등)만 쓸 수 있다
  const allowedTarget = (target: string) => /^#/.test(target) || /^data:image\/(png|jpeg|gif|webp);base64,/i.test(target);
  for (const m of text.matchAll(/(?:xlink:)?href\s*=\s*(?:"([^"]*)"|'([^']*)')/gi)) {
    if (!allowedTarget((m[1] ?? m[2] ?? "").trim())) return reject("바깥 주소를 가리키는 링크가 들어 있음");
  }
  for (const m of text.matchAll(/url\(\s*(?:"([^"]*)"|'([^']*)'|([^)\s]*))\s*\)/gi)) {
    if (!allowedTarget((m[1] ?? m[2] ?? m[3] ?? "").trim())) return reject("바깥 주소를 가리키는 url() 이 들어 있음");
  }
  return null;
}
