/*
 * 계정 입력 검사: 이메일, 비밀번호, "계정 설정 변경" 폼.
 * 이 파일은 아무것도 가져오지 않는다 (Node 테스트에서 그대로 읽는다). 닉네임 규칙만 ./nickname.ts 를 쓴다.
 */
import { parseNickname } from "./nickname.ts";

export const MIN_PASSWORD_LENGTH = 8;

// 아주 느슨한 이메일 형식 검사. 실제 확인은 Supabase 가 메일로 한다.
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function isEmail(value: string): boolean {
  return EMAIL.test(value);
}

type Parsed<T> = { ok: true; value: T } | { ok: false; message: string };

/* 새 비밀번호와 확인 칸을 검사한다 */
export function parseNewPassword(password: unknown, confirm: unknown): Parsed<string> {
  const value = typeof password === "string" ? password : "";
  const again = typeof confirm === "string" ? confirm : "";
  if (value === "") return { ok: false, message: "새 비밀번호를 입력해 주세요." };
  if (value.length < MIN_PASSWORD_LENGTH) {
    return { ok: false, message: `비밀번호는 ${MIN_PASSWORD_LENGTH}자 이상으로 써 주세요.` };
  }
  if (value !== again) return { ok: false, message: "비밀번호 확인이 맞지 않아요." };
  return { ok: true, value };
}

export interface AccountSettingsInput {
  nickname: unknown;
  email: unknown;
  newPassword: unknown;
  newPasswordConfirm: unknown;
  currentPassword: unknown;
}

export interface AccountSettingsChange {
  nickname: string;
  /** 바뀐 경우에만 있다 (소문자로 맞춘 값) */
  email?: string;
  /** 바뀐 경우에만 있다 */
  password?: string;
  nicknameChanged: boolean;
  /** 이메일이나 비밀번호를 바꾸므로 현재 비밀번호를 확인해야 한다 */
  needsCurrentPassword: boolean;
  currentPassword: string;
}

/*
 * "계정 설정 변경" 폼의 값을 검사해서 무엇이 바뀌는지 돌려준다.
 *   - 새 비밀번호 칸을 둘 다 비워 두면 비밀번호는 그대로다.
 *   - 이메일이나 비밀번호를 바꿀 때만 현재 비밀번호가 필요하다 (닉네임만 바꿀 때는 필요 없다).
 *   - 아무것도 바뀌지 않았으면 거부한다.
 */
export function parseAccountSettings(
  input: AccountSettingsInput,
  current: { email: string; nickname: string | null },
): Parsed<AccountSettingsChange> {
  const nickname = parseNickname(input.nickname);
  if (!nickname.ok) return nickname;

  const emailText = typeof input.email === "string" ? input.email.trim().toLowerCase() : "";
  if (emailText === "") return { ok: false, message: "이메일을 입력해 주세요." };
  if (!isEmail(emailText)) return { ok: false, message: "이메일 형식을 확인해 주세요." };
  const emailChanged = emailText !== current.email.trim().toLowerCase();

  const newPassword = typeof input.newPassword === "string" ? input.newPassword : "";
  const newPasswordConfirm = typeof input.newPasswordConfirm === "string" ? input.newPasswordConfirm : "";
  let password: string | undefined;
  if (newPassword !== "" || newPasswordConfirm !== "") {
    const parsed = parseNewPassword(newPassword, newPasswordConfirm);
    if (!parsed.ok) return parsed;
    password = parsed.value;
  }

  const nicknameChanged = nickname.value !== current.nickname;
  if (!nicknameChanged && !emailChanged && password === undefined) {
    return { ok: false, message: "바뀐 내용이 없어요." };
  }

  const needsCurrentPassword = emailChanged || password !== undefined;
  const currentPassword = typeof input.currentPassword === "string" ? input.currentPassword : "";
  if (needsCurrentPassword && currentPassword === "") {
    return { ok: false, message: "이메일이나 비밀번호를 바꾸려면 현재 비밀번호를 입력해 주세요." };
  }

  return {
    ok: true,
    value: {
      nickname: nickname.value,
      email: emailChanged ? emailText : undefined,
      password,
      nicknameChanged,
      needsCurrentPassword,
      currentPassword,
    },
  };
}
