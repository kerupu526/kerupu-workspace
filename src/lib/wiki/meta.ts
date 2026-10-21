/*
 * 위키 문서 맨 위의 메타 블록과 주석 처리. 설계는 docs/wiki-syntax.md 2.10, 2.11절 참고.
 *
 * 이 파일은 아무것도 가져오지 않는다 (Node 테스트에서 그대로 읽는다).
 *
 * 메타 블록
 *   ---
 *   분류: 등장인물, 주인공
 *   정보:
 *     제목: 캐릭터 1
 *     작품: 작품명
 *   이미지: /uploads/character-1.png
 *   ---
 *   - 문서의 맨 앞(빈 줄만 앞설 수 있다)에서 `---` 로 감싼 블록만 메타 블록이다.
 *     감싼 안쪽이 `이름: 값` 줄(과 들여쓴 줄)로만 이루어지지 않았으면 메타 블록으로 보지 않고
 *     그대로 둔다 (수평줄 두 개 사이에 글을 쓴 경우).
 *   - 허용한 이름(분류, 정보, 이미지)만 받는다. 나머지는 버리고 경고한다.
 *   - 정보 아래 줄은 들여써서 `이름: 값` 으로 쓴다. 탭은 쓸 수 없다. `제목` 은 정보 상자의 제목이 되고
 *     나머지는 행이 된다. 같은 이름이 두 번 나오면 뒤의 것을 쓴다.
 *   - 값은 그냥 글자다 (굵게, 링크 같은 문법은 풀지 않는다).
 *
 * 제한 (설계 문서에 없어서 여기서 정했다): 분류 20개(각 50자), 정보 30행(이름 30자, 값 200자).
 *
 * 주석
 *   - 줄 맨 앞이 `%%` 이면 그 줄 전체가 주석이다.
 *   - 줄 중간의 `%%메모%%` 한 쌍도 주석이다 (같은 줄 안에서만). 줄에 주석만 있으면 그 줄을 없앤다.
 *   - 코드 블록(``` , ~~~)과 `코드` 안, 그리고 `\%%` 는 주석이 아니다.
 */

export interface WikiMeta {
  categories: string[];
  infobox: {
    /** 정보 아래의 `제목` 값. 없으면 undefined */
    title?: string;
    rows: { label: string; value: string }[];
    /** 사이트에 올린 이미지 주소 (안전한 것만) */
    image?: string;
  };
}

export const MAX_CATEGORIES = 20;
const MAX_CATEGORY_LENGTH = 50;
export const MAX_INFO_ROWS = 30;
const MAX_LABEL_LENGTH = 30;
const MAX_VALUE_LENGTH = 200;

/** 경고와 그 줄 (입력 글 안에서 0부터 센다) */
export interface MetaDiagnostic {
  message: string;
  line: number;
}

export function emptyMeta(): WikiMeta {
  return { categories: [], infobox: { rows: [] } };
}

const FENCE = /^ {0,3}(`{3,}|~{3,})/;

/* ---- 주석 ---- */

/* 코드 조각(`...`)은 건드리지 않고, 나머지에서 %%...%% 를 지운다 */
function removeInlineComments(line: string): string {
  return line
    .split(/(`[^`]*`)/)
    .map((part, i) => (i % 2 === 1 ? part : part.replace(/(?<!\\)%%.*?(?<!\\)%%/g, "")))
    .join("");
}

/* text 와 함께, 결과의 각 줄이 입력의 몇 번째 줄(0부터)이었는지 돌려준다 */
export function stripCommentsMapped(markdown: string): { text: string; lineMap: number[] } {
  const out: string[] = [];
  const lineMap: number[] = [];
  let fence: string | null = null;

  markdown.split(/\r?\n/).forEach((line, index) => {
    const keep = (text: string) => {
      out.push(text);
      lineMap.push(index);
    };
    const fenceMatch = FENCE.exec(line);
    if (fence) {
      if (fenceMatch && fenceMatch[1][0] === fence[0] && fenceMatch[1].length >= fence.length) fence = null;
      keep(line);
      return;
    }
    if (fenceMatch) {
      fence = fenceMatch[1];
      keep(line);
      return;
    }

    if (line.startsWith("%%")) return; // 줄 전체가 주석

    if (line.includes("%%")) {
      const cleaned = removeInlineComments(line);
      // 주석뿐이던 줄은 빈 줄로 남기지 않고 없앤다 (문단이 끊어지지 않게)
      if (cleaned.trim() === "" && line.trim() !== "") return;
      keep(cleaned);
      return;
    }
    keep(line);
  });
  return { text: out.join("\n"), lineMap };
}

export function stripComments(markdown: string): string {
  return stripCommentsMapped(markdown).text;
}

/* ---- 메타 블록 ---- */

const DELIMITER = /^---[ \t]*$/;
const KEY_LINE = /^([^\s:][^:]*):(.*)$/;

function clip(text: string, max: number): string | null {
  const trimmed = text.trim();
  return trimmed.length > 0 && trimmed.length <= max ? trimmed : null;
}

/*
 * 문서 맨 위의 메타 블록을 떼어 낸다. 메타 블록이 없으면 meta 는 비어 있고 text 는 그대로다.
 * isSafeImage: 이미지 주소가 사이트에 올린 파일인지 (파서가 정한 규칙을 그대로 쓰려고 받는다)
 */
export function extractMeta(
  markdown: string,
  isSafeImage: (src: string) => boolean,
): { text: string; meta: WikiMeta; warnings: string[]; diagnostics: MetaDiagnostic[]; removedLines: number } {
  const meta = emptyMeta();
  const warnings: string[] = [];
  const diagnostics: MetaDiagnostic[] = [];
  const lines = markdown.split("\n");
  let current = 0; // 지금 읽는 줄 (경고가 가리킨다)
  const warn = (message: string) => {
    warnings.push(message);
    diagnostics.push({ message, line: current });
  };

  let start = 0;
  while (start < lines.length && lines[start].trim() === "") start += 1;
  if (start >= lines.length || !DELIMITER.test(lines[start])) return { text: markdown, meta, warnings, diagnostics, removedLines: 0 };

  let end = -1;
  for (let i = start + 1; i < lines.length; i += 1) {
    if (DELIMITER.test(lines[i])) {
      end = i;
      break;
    }
  }
  if (end < 0) return { text: markdown, meta, warnings, diagnostics, removedLines: 0 };

  const body = lines.slice(start + 1, end);
  const content = body.filter((l) => l.trim() !== "");
  const looksLikeMeta =
    content.length > 0 &&
    KEY_LINE.test(content[0]) &&
    content.every((l) => /^\s/.test(l) || KEY_LINE.test(l));
  if (!looksLikeMeta) return { text: markdown, meta, warnings, diagnostics, removedLines: 0 };

  let section: "분류" | "정보" | "이미지" | null = null;
  const rows = new Map<string, string>();

  for (const [offset, raw] of body.entries()) {
    current = start + 1 + offset;
    if (raw.trim() === "") continue;
    const indented = /^\s/.test(raw);

    if (!indented) {
      const m = KEY_LINE.exec(raw) as RegExpExecArray;
      const key = m[1].trim();
      const value = m[2].trim();
      section = null;

      if (key === "분류") {
        section = "분류";
        const names = value
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean);
        for (const name of names) {
          const ok = clip(name, MAX_CATEGORY_LENGTH);
          if (!ok) warn(`메타 블록: 분류 "${name.slice(0, 20)}"은(는) ${MAX_CATEGORY_LENGTH}자를 넘어 버렸습니다.`);
          else if (!meta.categories.includes(ok)) {
            if (meta.categories.length >= MAX_CATEGORIES) {
              warn(`메타 블록: 분류는 ${MAX_CATEGORIES}개까지만 쓸 수 있어 "${ok}"을(를) 버렸습니다.`);
            } else meta.categories.push(ok);
          }
        }
      } else if (key === "정보") {
        section = "정보";
        if (value !== "") warn("메타 블록: 정보 뒤에는 값을 쓰지 않고 다음 줄부터 들여써서 씁니다.");
      } else if (key === "이미지") {
        section = "이미지";
        if (value !== "" && isSafeImage(value)) meta.infobox.image = value;
        else warn(`메타 블록: 이미지 주소는 /uploads/ 로 시작하는 올린 파일만 쓸 수 있습니다: "${value.slice(0, 40)}"`);
      } else {
        warn(`메타 블록: 알 수 없는 이름 "${key.slice(0, 20)}"은(는) 버렸습니다.`);
      }
      continue;
    }

    // 들여쓴 줄
    if (/^[ ]*\t/.test(raw) || raw.startsWith("\t")) {
      warn("메타 블록: 들여쓰기에 탭을 쓸 수 없어 그 줄을 버렸습니다. 공백 2칸을 쓰세요.");
      continue;
    }
    if (section !== "정보") continue; // 알 수 없는 이름 아래의 줄은 함께 버린다 (이미 경고했다)

    const m = KEY_LINE.exec(raw.trim());
    if (!m) {
      warn(`메타 블록: 정보의 "${raw.trim().slice(0, 20)}" 줄은 "이름: 값" 형식이 아니라 버렸습니다.`);
      continue;
    }
    const label = clip(m[1], MAX_LABEL_LENGTH);
    const value = clip(m[2], MAX_VALUE_LENGTH);
    if (!label || !value) {
      warn(`메타 블록: 정보의 "${m[1].trim().slice(0, 20)}" 항목은 이름이나 값이 비었거나 너무 길어 버렸습니다.`);
      continue;
    }
    if (label === "제목") {
      meta.infobox.title = value;
      continue;
    }
    if (!rows.has(label) && rows.size >= MAX_INFO_ROWS) {
      warn(`메타 블록: 정보는 ${MAX_INFO_ROWS}행까지만 쓸 수 있어 "${label}"을(를) 버렸습니다.`);
      continue;
    }
    rows.delete(label); // 같은 이름은 뒤의 것을 쓴다
    rows.set(label, value);
  }

  meta.infobox.rows = [...rows].map(([label, value]) => ({ label, value }));
  return { text: lines.slice(end + 1).join("\n"), meta, warnings, diagnostics, removedLines: end + 1 };
}
