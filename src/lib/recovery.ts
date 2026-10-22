/*
 * 비밀번호 재설정 링크로 들어왔다는 표식 쿠키의 이름.
 * /auth/recovery 가 링크를 확인한 뒤 15분짜리로 남기고, 새 비밀번호를 정하면 지운다.
 * 이 쿠키가 없으면 "현재 비밀번호 없이 비밀번호 바꾸기"를 할 수 없다.
 */
export const RECOVERY_COOKIE = "kerupu-recovery";
export const RECOVERY_MAX_AGE_SECONDS = 15 * 60;

/* 쿠키가 가는 경로. 쿠키를 지울 때도 같은 경로를 적어야 지워진다. */
export const RECOVERY_COOKIE_PATH = "/account/reset-password";
