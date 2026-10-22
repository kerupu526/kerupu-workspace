/*
 * 닉네임 검사. 가입 화면과 "내 계정"의 닉네임 바꾸기가 같은 규칙을 쓴다.
 * 이 파일은 아무것도 가져오지 않는다 (Node 테스트에서 그대로 읽는다).
 */
export const MIN_NICKNAME_LENGTH = 2;
export const MAX_NICKNAME_LENGTH = 20;

/* 앞뒤 공백을 지우고 길이를 본다. 문제가 있으면 사용자에게 보여 줄 메시지를 돌려준다. */
export function parseNickname(raw: unknown): { ok: true; value: string } | { ok: false; message: string } {
  // 폼에서 문자열이 아닌 값(파일 등)이 오면 글자로 바꾸지 않고 비어 있는 것으로 본다
  const value = typeof raw === "string" ? raw.trim() : "";
  if (value === "") return { ok: false, message: "닉네임을 입력해 주세요." };
  if (value.length < MIN_NICKNAME_LENGTH || value.length > MAX_NICKNAME_LENGTH) {
    return { ok: false, message: `닉네임은 ${MIN_NICKNAME_LENGTH}~${MAX_NICKNAME_LENGTH}자로 써 주세요.` };
  }
  return { ok: true, value };
}
