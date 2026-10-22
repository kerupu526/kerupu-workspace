/*
 * 새 캐릭터를 추가할 때 쓰는 입력 검사와 첫 원문 만들기.
 * 이 파일은 아무것도 가져오지 않는다 (Node 테스트에서 그대로 읽는다).
 * 길이 상한은 supabase/migrations/20261022120000_characters.sql 과 meta.ts 의 제한에 맞춘다.
 */

/* 문서 주소: 소문자, 숫자, 하이픈만 (documents.slug 의 check 와 같다) */
export const SLUG_PATTERN = /^[a-z0-9][a-z0-9-]{0,79}$/;

/* /dictionary/new 는 "새 캐릭터 추가" 화면이라 문서 주소로 쓸 수 없다 */
export const RESERVED_SLUGS: readonly string[] = ["new"];

export const MAX_NAME_LENGTH = 100;
export const MAX_WORK_LENGTH = 100;
export const MAX_SUMMARY_LENGTH = 200;

export interface CharacterInput {
  slug: string;
  name: string;
  work: string;
  summary: string;
}

/* 줄바꿈과 겹친 공백을 한 칸으로 줄이고, 위키의 주석 표시(%%)는 뺀다. 메타 블록의 값은 한 줄이어야 한다. */
function oneLine(text: string): string {
  return text.replace(/%%/g, "%").replace(/\s+/g, " ").trim();
}

/*
 * 폼에서 받은 값을 다듬고 검사한다. 문제가 있으면 사용자에게 보여 줄 메시지를 돌려준다.
 * 한 줄 설명은 비워 둘 수 있다.
 */
export function parseCharacterInput(raw: {
  slug: unknown;
  name: unknown;
  work: unknown;
  summary: unknown;
}): { ok: true; value: CharacterInput } | { ok: false; message: string } {
  const slug = String(raw.slug ?? "").trim();
  const name = oneLine(String(raw.name ?? ""));
  const work = oneLine(String(raw.work ?? ""));
  const summary = oneLine(String(raw.summary ?? ""));

  if (name === "") return { ok: false, message: "캐릭터 이름을 적어 주세요." };
  if (name.length > MAX_NAME_LENGTH) return { ok: false, message: `이름은 ${MAX_NAME_LENGTH}자까지 쓸 수 있어요.` };
  if (work === "") return { ok: false, message: "작품 이름을 적어 주세요." };
  if (work.length > MAX_WORK_LENGTH) return { ok: false, message: `작품 이름은 ${MAX_WORK_LENGTH}자까지 쓸 수 있어요.` };
  if (summary.length > MAX_SUMMARY_LENGTH) {
    return { ok: false, message: `한 줄 설명은 ${MAX_SUMMARY_LENGTH}자까지 쓸 수 있어요.` };
  }
  if (!SLUG_PATTERN.test(slug)) {
    return { ok: false, message: "주소는 영문 소문자, 숫자, 하이픈(-)만 쓸 수 있고 80자까지예요. 하이픈으로 시작할 수 없어요." };
  }
  if (RESERVED_SLUGS.includes(slug)) return { ok: false, message: "이 주소는 쓸 수 없어요. 다른 주소를 적어 주세요." };

  return { ok: true, value: { slug, name, work, summary } };
}

/*
 * 새 캐릭터의 첫 원문. 메타 블록에 제목과 작품을 넣어 두면 문서 화면과 목록이 같은 값을 쓴다.
 * 이름과 작품은 메타 블록의 값 길이 제한(200자) 안이다.
 */
export function buildCharacterMarkdown({ name, work, summary }: Pick<CharacterInput, "name" | "work" | "summary">): string {
  const lines = ["---", "분류: 등장인물", "정보:", `  제목: ${name}`, `  작품: ${work}`, "---", "", "## 개요"];
  lines.push(summary === "" ? "아직 쓰지 않았어요." : summary);
  return `${lines.join("\n")}\n`;
}
