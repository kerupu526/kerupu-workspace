/*
 * Mona12 글꼴에서 자주 쓰는 글자만 담은 작은 글꼴 파일을 만든다.
 *
 * 왜: 원본 두 파일이 각각 약 1.2MB(한글 전체와 이모지 포함)라서 첫 방문이 느리다.
 *
 * 만드는 것
 *   - public/fonts/kerupu-pixel-regular.woff2, kerupu-pixel-bold.woff2   (작은 버전)
 *   - src/styles/fonts-subset.css                                        (@font-face 규칙, 자동 생성)
 * 원본 Mona12*.woff2 는 그대로 두고, 작은 버전에 없는 글자(희귀 한글, 이모지, 가나 등)가 쓰일 때만 내려받게 한다.
 * 두 벌의 글자 범위는 겹치지 않는다(원본은 "작은 버전이 담당하지 않는 모든 글자").
 *
 * 라이선스 (SIL OFL 1.1, Reserved Font Name "Mona")
 *   - 글자를 뺀 파일은 "수정본"이다. 수정본은 글꼴 이름에 "Mona"를 쓸 수 없으므로 내부 이름을 "Kerupu Pixel"로 바꾼다.
 *   - 저작권 문구(name ID 0)는 그대로 남기고, 라이선스 설명·주소(ID 13, 14)를 넣는다.
 *   - 라이선스 문서는 public/licenses/ 에 있고, public/fonts/README.md 에 수정 내용을 적어 둔다.
 *
 * 실행 (도구는 프로젝트 의존성에 넣지 않고 저장 없이 설치한다)
 *   npm install --no-save subset-font wawoff2
 *   node scripts/build-font-subset.mjs
 */
import { readFile, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import path from "node:path";

const require = createRequire(import.meta.url);
const subsetFont = require("subset-font");
const fontverter = require("fontverter");

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const FONT_DIR = path.join(ROOT, "public", "fonts");

const FAMILY = "Kerupu Pixel";
const FILES = [
  { weight: 400, style: "Regular", source: "Mona12.woff2", out: "kerupu-pixel-regular.woff2" },
  { weight: 700, style: "Bold", source: "Mona12-Bold.woff2", out: "kerupu-pixel-bold.woff2" },
];

/* ---------- 담을 글자 ---------- */

// [시작, 끝] 코드 포인트 범위
const RANGES = [
  [0x0020, 0x007e], // 기본 라틴(영문, 숫자, 기호)
  [0x00a0, 0x00ff], // 라틴-1 (© · ° 등)
  [0x2010, 0x2027], // 줄표, 따옴표, 불릿, 말줄임표
  [0x2030, 0x203e], // ‰ ′ ″ ※ 등
  [0x20a9, 0x20a9], // ₩
  [0x20ac, 0x20ac], // €
  [0x2122, 0x2122], // ™
  [0x2190, 0x2199], // 화살표
  [0x2605, 0x2606], // ★ ☆
  [0x2661, 0x2665], // ♡ ♥ 등
  [0x266a, 0x266c], // ♪ ♬
  [0x3000, 0x303f], // 한중일 문장부호
  [0x3130, 0x318f], // 한글 호환 자모 (ㅋㅋ ㅎㅎ ㅠㅠ)
];

// 한국 표준 완성형(KS X 1001): 한글 2,350자(0xB0A1~0xC8FE)와 기호(0xA1A1~0xA2E5)
function ksx1001() {
  const decoder = new TextDecoder("euc-kr");
  const out = [];
  const rows = [
    [0xa1, 0xa2], // 기호, 도형, 화살표, 수학 기호
    [0xb0, 0xc8], // 한글 음절
  ];
  for (const [from, to] of rows) {
    for (let hi = from; hi <= to; hi++) {
      for (let lo = 0xa1; lo <= 0xfe; lo++) {
        const ch = decoder.decode(new Uint8Array([hi, lo]));
        if ([...ch].length === 1 && ch !== "�") out.push(ch.codePointAt(0));
      }
    }
  }
  return out;
}

function wantedCodepoints() {
  const set = new Set(ksx1001());
  for (const [a, b] of RANGES) for (let c = a; c <= b; c++) set.add(c);
  return set;
}

/* ---------- sfnt(TTF) 읽기·쓰기 ---------- */

function readTables(buf) {
  const dv = new DataView(buf.buffer, buf.byteOffset, buf.byteLength);
  const count = dv.getUint16(4);
  const tables = new Map();
  for (let i = 0; i < count; i++) {
    const rec = 12 + i * 16;
    const tag = String.fromCharCode(...buf.subarray(rec, rec + 4));
    const offset = dv.getUint32(rec + 8);
    const length = dv.getUint32(rec + 12);
    tables.set(tag, Buffer.from(buf.subarray(offset, offset + length)));
  }
  return { version: dv.getUint32(0), tables };
}

function checksum(data) {
  let sum = 0;
  const padded = Buffer.concat([data, Buffer.alloc((4 - (data.length % 4)) % 4)]);
  for (let i = 0; i < padded.length; i += 4) sum = (sum + padded.readUInt32BE(i)) >>> 0;
  return sum;
}

function writeSfnt({ version, tables }) {
  const tags = [...tables.keys()].sort();
  const n = tags.length;
  const entrySelector = Math.floor(Math.log2(n));
  const searchRange = 16 * 2 ** entrySelector;
  const header = Buffer.alloc(12);
  header.writeUInt32BE(version, 0);
  header.writeUInt16BE(n, 4);
  header.writeUInt16BE(searchRange, 6);
  header.writeUInt16BE(entrySelector, 8);
  header.writeUInt16BE(n * 16 - searchRange, 10);

  // head.checkSumAdjustment 는 전체 체크섬이 정해진 뒤에 채운다
  const head = tables.get("head");
  if (head) head.writeUInt32BE(0, 8);

  const dir = Buffer.alloc(n * 16);
  const bodies = [];
  let offset = 12 + n * 16;
  tags.forEach((tag, i) => {
    const data = tables.get(tag);
    dir.write(tag, i * 16, 4, "ascii");
    dir.writeUInt32BE(checksum(data), i * 16 + 4);
    dir.writeUInt32BE(offset, i * 16 + 8);
    dir.writeUInt32BE(data.length, i * 16 + 12);
    const pad = (4 - (data.length % 4)) % 4;
    bodies.push(data, Buffer.alloc(pad));
    offset += data.length + pad;
  });

  const whole = Buffer.concat([header, dir, ...bodies]);
  if (head) {
    const adjust = (0xb1b0afba - checksum(whole)) >>> 0;
    const headOffset = dir.readUInt32BE(tags.indexOf("head") * 16 + 8);
    whole.writeUInt32BE(adjust, headOffset + 8);
  }
  return whole;
}

/* ---------- name 테이블 다시 쓰기 ---------- */

function readNameRecords(data) {
  const format = data.readUInt16BE(0);
  const count = data.readUInt16BE(2);
  const stringOffset = data.readUInt16BE(4);
  const records = [];
  for (let i = 0; i < count; i++) {
    const p = 6 + i * 12;
    const [platformID, encodingID, languageID, nameID, length, offset] = [0, 2, 4, 6, 8, 10].map((d) =>
      data.readUInt16BE(p + d),
    );
    // 형식 1 의 언어 태그(0x8000 이상)는 다루지 않는다
    if (format === 1 && languageID >= 0x8000) continue;
    records.push({
      platformID,
      encodingID,
      languageID,
      nameID,
      bytes: Buffer.from(data.subarray(stringOffset + offset, stringOffset + offset + length)),
    });
  }
  return records;
}

function encodeName(platformID, text) {
  if (platformID === 3) {
    const out = Buffer.from(text, "utf16le");
    out.swap16();
    return out;
  }
  return Buffer.from(text, "latin1"); // 맥(플랫폼 1)은 영문만 쓴다
}

function buildNameTable(records) {
  const sorted = [...records].sort(
    (a, b) =>
      a.platformID - b.platformID ||
      a.encodingID - b.encodingID ||
      a.languageID - b.languageID ||
      a.nameID - b.nameID,
  );
  const stringOffset = 6 + sorted.length * 12;
  const head = Buffer.alloc(stringOffset);
  head.writeUInt16BE(0, 0);
  head.writeUInt16BE(sorted.length, 2);
  head.writeUInt16BE(stringOffset, 4);
  const strings = [];
  let offset = 0;
  sorted.forEach((r, i) => {
    const p = 6 + i * 12;
    [r.platformID, r.encodingID, r.languageID, r.nameID, r.bytes.length, offset].forEach((v, k) =>
      head.writeUInt16BE(v, p + k * 2),
    );
    strings.push(r.bytes);
    offset += r.bytes.length;
  });
  return Buffer.concat([head, ...strings]);
}

function renameFont(tables, style) {
  const records = readNameRecords(tables.get("name"));
  const replaced = new Set([1, 2, 3, 4, 6, 16, 17, 21, 22, 13, 14]);
  const kept = records.filter((r) => !replaced.has(r.nameID));

  const full = `${FAMILY} ${style}`;
  const postScript = `${FAMILY.replace(/ /g, "")}-${style}`;
  const names = {
    1: style === "Bold" ? `${FAMILY}` : FAMILY, // 가족 이름
    2: style, // 스타일
    3: `${postScript};subset`, // 고유 식별자
    4: full, // 전체 이름
    6: postScript, // 포스트스크립트 이름
    13: 'This Font Software is licensed under the SIL Open Font License, Version 1.1. This is a subset (Modified Version) of Mona12; the Reserved Font Name "Mona" is not used.',
    14: "https://openfontlicense.org",
  };
  for (const [id, text] of Object.entries(names)) {
    for (const platformID of [3, 1]) {
      kept.push({
        platformID,
        encodingID: platformID === 3 ? 1 : 0,
        languageID: platformID === 3 ? 0x0409 : 0,
        nameID: Number(id),
        bytes: encodeName(platformID, text),
      });
    }
  }
  tables.set("name", buildNameTable(kept));
}

/* ---------- cmap 읽기 (실제로 담긴 글자 알아내기) ---------- */

// 글자(코드 포인트) → 글리프 번호 (0 은 "없음")
function cmapMap(cmap) {
  const count = cmap.readUInt16BE(2);
  const out = new Map();
  for (let i = 0; i < count; i++) {
    const offset = cmap.readUInt32BE(4 + i * 8 + 4);
    const format = cmap.readUInt16BE(offset);
    if (format === 12) {
      const groups = cmap.readUInt32BE(offset + 12);
      for (let g = 0; g < groups; g++) {
        const p = offset + 16 + g * 12;
        const start = cmap.readUInt32BE(p);
        const end = cmap.readUInt32BE(p + 4);
        const glyph = cmap.readUInt32BE(p + 8);
        for (let c = start; c <= end; c++) if (glyph + (c - start) !== 0) out.set(c, glyph + (c - start));
      }
    } else if (format === 4) {
      const segX2 = cmap.readUInt16BE(offset + 6);
      const seg = segX2 / 2;
      const endBase = offset + 14;
      const startBase = endBase + segX2 + 2;
      const deltaBase = startBase + segX2;
      const rangeBase = deltaBase + segX2;
      for (let s = 0; s < seg; s++) {
        const end = cmap.readUInt16BE(endBase + s * 2);
        const start = cmap.readUInt16BE(startBase + s * 2);
        const delta = cmap.readInt16BE(deltaBase + s * 2);
        const rangeOffset = cmap.readUInt16BE(rangeBase + s * 2);
        for (let c = start; c <= end && c !== 0xffff; c++) {
          let glyph;
          if (rangeOffset === 0) glyph = (c + delta) & 0xffff;
          else {
            const p = rangeBase + s * 2 + rangeOffset + (c - start) * 2;
            const raw = cmap.readUInt16BE(p);
            glyph = raw === 0 ? 0 : (raw + delta) & 0xffff;
          }
          if (glyph !== 0) out.set(c, glyph);
        }
      }
    }
  }
  return out;
}

// 원본에서 컬러 글리프(COLR 테이블의 기본 글리프)인 글자들.
// 작은 버전은 COLR 를 담지 않으므로(용량), 이런 글자가 들어가면 색이 빠진 단색으로 그려진다.
// 그래서 작은 버전에서 빼고 원본이 맡게 한다 (예: ♥).
function colorCodepoints(tables) {
  const colr = tables.get("COLR");
  if (!colr) return new Set();
  const records = colr.readUInt16BE(2);
  const offset = colr.readUInt32BE(4);
  const colorGlyphs = new Set();
  for (let i = 0; i < records; i++) colorGlyphs.add(colr.readUInt16BE(offset + i * 6));
  const out = new Set();
  for (const [cp, gid] of cmapMap(tables.get("cmap"))) if (colorGlyphs.has(gid)) out.add(cp);
  return out;
}

/* ---------- CSS 범위 문자열 ---------- */

function toUnicodeRange(codepoints) {
  const sorted = [...codepoints].sort((a, b) => a - b);
  const ranges = [];
  for (const c of sorted) {
    const last = ranges[ranges.length - 1];
    if (last && c === last[1] + 1) last[1] = c;
    else ranges.push([c, c]);
  }
  const hex = (n) => n.toString(16).toUpperCase().padStart(4, "0");
  return ranges.map(([a, b]) => (a === b ? `U+${hex(a)}` : `U+${hex(a)}-${hex(b)}`)).join(", ");
}

/* ---------- 실행 ---------- */

const wanted = wantedCodepoints();
console.log(`요청한 글자: ${wanted.size}개`);

// 원본이 맡는 글자: 아래 블록 중 작은 버전에 없는 글자만.
// 두 글꼴의 글자 범위가 겹치지 않아서, 영문·한글 화면이 작은 버전을 기다리는 동안
// 브라우저가 같은 글자 때문에 원본(1.2MB)까지 내려받는 일이 없다.
// 한글 음절 블록(U+AC00~D7A3)은 일부러 넣지 않는다. KS X 1001 에 없는 희귀 음절까지 원본이 맡으면
// 범위 목록이 수천 개로 늘어 CSS 가 커진다. 그런 글자는 시스템 글꼴(폭을 맞춘 Mona12 Fallback)로 보인다.
const ORIGINAL_BLOCKS = [
  [0x2000, 0x2bff], // 문장부호, 기호, 화살표, 도형, 딩뱃 (ZWJ U+200D, 키캡 U+20E3 포함)
  [0x3040, 0x30ff], // 히라가나, 가타카나
  [0x31f0, 0x31ff], // 가타카나 확장
  [0x3200, 0x33ff], // 둘러싼 한중일 글자
  [0x4e00, 0x9fff], // 한자
  [0xfe00, 0xfe0f], // 변형 선택자 (이모지 U+FE0F)
  [0xff00, 0xffef], // 전각 문자
  [0x1f000, 0x1faff], // 이모지
];

function originalCodepoints(present) {
  const out = [];
  for (const [a, b] of ORIGINAL_BLOCKS) for (let c = a; c <= b; c++) if (!present.has(c)) out.push(c);
  return out;
}

let css = `/*
 * 자동 생성 파일: scripts/build-font-subset.mjs 가 만든다. 직접 고치지 않는다.
 *
 * Mona12 글꼴을 두 벌로 나눠 선언한다. 글자 범위(unicode-range)가 서로 겹치지 않는다.
 *   1) 작은 버전 "kerupu-pixel-*.woff2" (Mona12 의 수정본, SIL OFL 1.1, 각 약 43KB)
 *      영문, 숫자, 기호, 한글 2,350자(KS X 1001), 자모 등 자주 쓰는 글자
 *   2) 원본 "Mona12*.woff2" (각 약 1.2MB)
 *      이모지, 가나, 한자, 각종 기호. 그런 글자가 화면에 나올 때만 내려받는다.
 *      (KS X 1001 에 없는 희귀 한글 음절은 담당하지 않아 시스템 글꼴로 보인다)
 * 폰트 이름(font-family)은 둘 다 "Mona12" 로 같다 (디자인 문서의 이름). 파일 안의 이름만 "Kerupu Pixel" 로 바꿨다.
 */
`;

for (const { weight, style, source, out } of FILES) {
  const original = await readFile(path.join(FONT_DIR, source));

  // 컬러 글리프인 글자는 뺀다 (원본이 맡는다)
  const colored = colorCodepoints(readTables(await fontverter.convert(original, "truetype")).tables);
  const kept = [...wanted].filter((c) => !colored.has(c));
  const dropped = [...wanted].filter((c) => colored.has(c));
  if (dropped.length) {
    console.log(
      `${out}: 컬러 글리프라 원본에 맡기는 글자 ${dropped.length}개 (${dropped
        .map((c) => String.fromCodePoint(c))
        .join("")})`,
    );
  }

  const sfnt = await subsetFont(original, String.fromCodePoint(...kept), {
    targetFormat: "sfnt",
    preserveNameIds: [0, 5, 13, 14],
    // 글자 모양은 그대로 두고 힌팅 등도 건드리지 않는다
  });

  const { version, tables } = readTables(sfnt);
  const present = new Set(cmapMap(tables.get("cmap")).keys());
  const missing = [...wanted].filter((c) => !present.has(c));
  renameFont(tables, style);
  const renamed = writeSfnt({ version, tables });
  const woff2 = await fontverter.convert(renamed, "woff2");
  await writeFile(path.join(FONT_DIR, out), woff2);

  const hangul = [...present].filter((c) => c >= 0xac00 && c <= 0xd7a3).length;
  console.log(
    `${out}: ${(woff2.length / 1024).toFixed(0)}KB  (원본 ${(original.length / 1024).toFixed(0)}KB)` +
      `  글자 ${present.size}개(한글 음절 ${hangul}), 원본에 없어 빠진 요청 ${missing.length}개`,
  );

  css += `
/* ${weight} 작은 버전 */
@font-face {
  font-family: "Mona12";
  src: url("/fonts/${out}") format("woff2");
  font-weight: ${weight};
  font-style: normal;
  font-display: swap;
  unicode-range: ${toUnicodeRange(present)};
}

/* ${weight} 원본: 작은 버전에 없는 글자만 */
@font-face {
  font-family: "Mona12";
  src: url("/fonts/${source}") format("woff2");
  font-weight: ${weight};
  font-style: normal;
  font-display: swap;
  unicode-range: ${toUnicodeRange(new Set(originalCodepoints(present)))};
}
`;
}

await writeFile(path.join(ROOT, "src", "styles", "fonts-subset.css"), css);
console.log("src/styles/fonts-subset.css 를 만들었습니다.");
