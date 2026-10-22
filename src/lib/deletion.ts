/*
 * 영구 삭제 규칙 (문서와 이미지 공통). 이 파일은 아무것도 가져오지 않는다 (Node 테스트에서 그대로 읽는다).
 * 실제 권한은 DB 함수(supabase/migrations/20261024090000_deletion.sql)가 정한다. 여기는 화면에 보여 주기 위한 같은 계산이다.
 *   - 운영자: 언제든 바로 삭제.
 *   - 작성자(만든 사람, 올린 사람): 만든 지 30분이 지나야 하고 30일이 지나기 전에만 바로 삭제할 수 있다.
 *       30분 전에는 막히고(too_early), 30일 뒤에는 작성자가 못 지운다(expired, 운영자만).
 */

export const DELETE_MIN_AGE_MINUTES = 30;
export const DELETE_WINDOW_DAYS = 30;

const MINUTE_MS = 60 * 1000;
const DAY_MS = 24 * 60 * MINUTE_MS;

/* 이 사람이 이 항목에 할 수 있는 삭제 */
export type DeletePermission =
  /** 운영자: 바로 영구 삭제 */
  | { kind: "operator" }
  /** 작성자: 지금 바로 영구 삭제할 수 있다. 삭제할 수 있는 기간이 며칠 남았는지 함께 준다. */
  | { kind: "author"; daysLeft: number }
  /** 작성자지만 만든 지 30분이 안 됐다. 몇 분 뒤에 지울 수 있는지 함께 준다. */
  | { kind: "too_early"; minutesLeft: number }
  /** 작성자지만 30일이 지났다 */
  | { kind: "expired" }
  /** 남의 것이다 */
  | { kind: "none" };

export function deletePermission(input: {
  isOperator: boolean;
  isAuthor: boolean;
  /** 만든(올린) 시각 */
  createdAt: string;
  now?: number;
}): DeletePermission {
  if (input.isOperator) return { kind: "operator" };
  if (!input.isAuthor) return { kind: "none" };
  const now = input.now ?? Date.now();
  const age = now - new Date(input.createdAt).getTime();
  if (age < DELETE_MIN_AGE_MINUTES * MINUTE_MS) {
    return { kind: "too_early", minutesLeft: Math.max(1, Math.ceil((DELETE_MIN_AGE_MINUTES * MINUTE_MS - age) / MINUTE_MS)) };
  }
  if (age >= DELETE_WINDOW_DAYS * DAY_MS) return { kind: "expired" };
  return { kind: "author", daysLeft: Math.max(1, Math.ceil((DELETE_WINDOW_DAYS * DAY_MS - age) / DAY_MS)) };
}

/* 화면에서 삭제 버튼을 눌러 볼 수 있는지 (운영자이거나 기간 안의 작성자) */
export function canDelete(permission: DeletePermission): boolean {
  return permission.kind === "operator" || permission.kind === "author";
}

/* 작성자에게 보여 줄, 지금 삭제할 수 없는 이유 (삭제할 수 있거나 남의 것이면 null) */
export function deleteBlockedNote(permission: DeletePermission): string | null {
  if (permission.kind === "too_early") {
    return `만든 지 ${DELETE_MIN_AGE_MINUTES}분이 지나야 삭제할 수 있어요. 약 ${permission.minutesLeft}분 뒤에 삭제할 수 있어요.`;
  }
  if (permission.kind === "expired") {
    return `만든 지 ${DELETE_WINDOW_DAYS}일이 지나서 직접 삭제할 수 없어요. 운영자에게 요청해 주세요.`;
  }
  return null;
}

/* DB 함수가 던지는 오류 이름(메시지)을 사용자에게 보여 줄 문구로 */
export function deletionErrorMessage(raw: string | undefined): string {
  const code = (raw ?? "").trim();
  if (code.includes("too_early")) return `만든 지 ${DELETE_MIN_AGE_MINUTES}분이 지나야 삭제할 수 있어요.`;
  if (code.includes("window_passed")) return `만든 지 ${DELETE_WINDOW_DAYS}일이 지나서 직접 삭제할 수 없어요. 운영자에게 요청해 주세요.`;
  if (code.includes("author_only")) return "만든 사람이나 운영자만 삭제할 수 있어요.";
  if (code.includes("not_found")) return "이미 삭제됐거나 없는 항목이에요.";
  if (code.includes("login_required")) return "로그인이 끝났어요. 다시 로그인해 주세요.";
  return "삭제하지 못했어요. 잠시 뒤 다시 해 주세요.";
}
