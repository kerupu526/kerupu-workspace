/*
 * 인라인 각주 ^[내용] 을 마크다운 파싱 전에 원문에서 떼어 낸다. 설계는 docs/wiki-syntax.md 2.5절 참고.
 *
 * 이 파일은 아무것도 가져오지 않는다 (Node 테스트에서 그대로 읽는다).
 *
 * 왜 파싱 전에 하나: 파싱 뒤의 글에서는 `\]` 가 이미 `]` 로 바뀌어 있어서 이스케이프한 괄호와 닫는 괄호를
 * 구별할 수 없고, 서식(굵게 등)이나 표의 `|` 가 각주를 가로지르면 각주가 끊어진다.
 *
 * 규칙
 *   - ^[ 로 열고 짝이 맞는 ] 로 닫는다. 안쪽의 [ ] 는 짝이 맞으면 그대로 내용이다: ^[참고 [1]권 3장]
 *   - 짝이 안 맞는 괄호는 \[ \] 로 쓴다. \\ 는 역슬래시 하나다. 다른 \문자 는 그대로 둔다.
 *   - 내용에 빈 줄이 들어가면 각주가 아니다 (닫지 않은 것으로 본다).
 *   - 각주 안에 각주(^[ 가 또 나옴)는 쓸 수 없다. 바깥 각주 전체를 각주로 만들지 않고 글자로 둔다.
 *   - 내용이 비어 있으면 각주가 아니다.
 *   - \^[ 는 각주가 아니다. 코드 블록(``` , ~~~)과 `코드` 안은 건드리지 않는다.
 *   - 닫지 않은 ^[ 는 글자로 남는다.
 *
 * 떼어 낸 자리에는 표시(FOOTNOTE_MARK 번호 FOOTNOTE_MARK)를 남긴다. 번호는 notes 의 위치이고,
 * 문서에 실제로 쓰이는 각주 번호(1, 2, 3 ...)는 파서가 표시를 만난 순서대로 새로 매긴다.
 */

export const FOOTNOTE_MARK = "";
const MARK_PATTERN = new RegExp(`${FOOTNOTE_MARK}(\\d+)${FOOTNOTE_MARK}`, "g");

export interface RawFootnote {
  /** 이스케이프를 푼 각주 내용 */
  content: string;
  /** 원문에 쓴 그대로 (표시를 되돌릴 때 쓴다) */
  source: string;
}

const FENCE = /^ {0,3}(`{3,}|~{3,})/;
const BLANK_LINE_AHEAD = /^\n[ \t]*\n/;

interface Read {
  content: string;
  end: number;
  nested: boolean;
}

/* start 는 ^[ 바로 뒤. 짝이 맞는 ] 까지 읽는다. 닫히지 않으면 null. */
function readFootnote(chunk: string, start: number): Read | null {
  let depth = 1;
  let nested = false;
  let content = "";

  for (let j = start; j < chunk.length; j += 1) {
    const c = chunk[j];
    if (c === "\\") {
      const next = chunk[j + 1];
      if (next === "[" || next === "]" || next === "\\") {
        content += next;
        j += 1;
      } else {
        content += c;
      }
      continue;
    }
    if (c === "\n" && BLANK_LINE_AHEAD.test(chunk.slice(j))) return null;
    if (c === "^" && chunk[j + 1] === "[") nested = true;
    if (c === "[") depth += 1;
    if (c === "]") {
      depth -= 1;
      if (depth === 0) return { content, end: j + 1, nested };
    }
    content += c;
  }
  return null;
}

/* 코드 블록이 아닌 한 덩어리의 글에서 각주를 떼어 낸다 */
function scanChunk(chunk: string, notes: RawFootnote[], warnings: string[]): string {
  let out = "";
  let i = 0;

  while (i < chunk.length) {
    const c = chunk[i];

    if (c === "\\") {
      out += chunk.slice(i, i + 2);
      i += 2;
      continue;
    }

    if (c === "`") {
      // `코드` : 같은 길이의 ` 로 닫힐 때까지 건드리지 않는다
      let n = 1;
      while (chunk[i + n] === "`") n += 1;
      const closing = new RegExp(`(?<!\`)\`{${n}}(?!\`)`).exec(chunk.slice(i + n));
      const end = closing ? i + n + closing.index + n : i + n;
      out += chunk.slice(i, end);
      i = end;
      continue;
    }

    if (c === "^" && chunk[i + 1] === "[") {
      const read = readFootnote(chunk, i + 2);
      if (read && read.nested) {
        warnings.push("각주 안에는 각주를 쓸 수 없어 그 부분을 각주로 만들지 않았습니다.");
        out += chunk.slice(i, read.end);
        i = read.end;
        continue;
      }
      if (read && read.content.trim() !== "") {
        const source = chunk.slice(i, read.end);
        notes.push({ content: read.content, source });
        out += `${FOOTNOTE_MARK}${notes.length - 1}${FOOTNOTE_MARK}`;
        i = read.end;
        continue;
      }
    }

    out += c;
    i += 1;
  }
  return out;
}

export function extractFootnotes(markdown: string): { text: string; notes: RawFootnote[]; warnings: string[] } {
  const notes: RawFootnote[] = [];
  const warnings: string[] = [];
  const clean = markdown.replaceAll(FOOTNOTE_MARK, "");
  const out: string[] = [];
  let buffer: string[] = [];
  let fence: string | null = null;

  const flush = () => {
    if (buffer.length > 0) out.push(scanChunk(buffer.join("\n"), notes, warnings));
    buffer = [];
  };

  for (const line of clean.split("\n")) {
    const fenceMatch = FENCE.exec(line);
    if (fence) {
      if (fenceMatch && fenceMatch[1][0] === fence[0] && fenceMatch[1].length >= fence.length) fence = null;
      out.push(line);
      continue;
    }
    if (fenceMatch) {
      flush();
      fence = fenceMatch[1];
      out.push(line);
      continue;
    }
    buffer.push(line);
  }
  flush();

  return { text: out.join("\n"), notes, warnings };
}

/* 글 속의 표시를 원문 그대로 되돌린다 (제목, 링크 주소, 이미지 설명처럼 각주가 될 수 없는 곳) */
export function restoreFootnoteText(text: string, notes: RawFootnote[]): string {
  return text.replace(MARK_PATTERN, (_m, n: string) => notes[Number(n)]?.source ?? "");
}

/* 글을 일반 글자 조각과 각주 번호(notes 위치)로 나눈다 */
export function splitFootnoteMarks(text: string): (string | { note: number })[] {
  const out: (string | { note: number })[] = [];
  let last = 0;
  for (const match of text.matchAll(MARK_PATTERN)) {
    const index = match.index ?? 0;
    if (index > last) out.push(text.slice(last, index));
    out.push({ note: Number(match[1]) });
    last = index + match[0].length;
  }
  if (last < text.length) out.push(text.slice(last));
  return out;
}
