"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { UserAttributes } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { parseAccountSettings, parseNewPassword } from "@/lib/account";
import { siteUrl } from "@/lib/site-url";
import { RECOVERY_COOKIE, RECOVERY_COOKIE_PATH } from "@/lib/recovery";
import type { AuthState } from "@/app/login/actions";

/* 계정 설정 결과. 실패해도 입력한 닉네임과 이메일은 돌려줘서 폼에 남긴다 (비밀번호 칸은 남기지 않는다). */
export interface AccountSettingsState {
  message?: string;
  values?: { nickname: string; email: string };
}

/* Supabase 오류를 사용자에게 보여 줄 문구로 바꾼다 */
function updateErrorMessage(code: string | undefined): string {
  switch (code) {
    case "email_exists":
    case "email_address_invalid":
      return "이 이메일은 쓸 수 없어요. 다른 이메일을 입력해 주세요.";
    case "same_password":
      return "지금 쓰는 비밀번호와 다른 비밀번호를 입력해 주세요.";
    case "weak_password":
      return "비밀번호가 너무 쉬워요. 더 길거나 복잡하게 써 주세요.";
    case "over_email_send_rate_limit":
      return "확인 메일을 너무 자주 보냈어요. 잠시 뒤 다시 해 주세요.";
    default:
      return "계정 설정을 바꾸지 못했어요. 잠시 뒤 다시 해 주세요.";
  }
}

/*
 * 계정 설정 변경: 닉네임, 이메일, 비밀번호를 한 번에 바꾼다.
 *   - 이메일이나 비밀번호를 바꿀 때는 현재 비밀번호를 먼저 확인한다 (로그인이 남아 있는 다른 사람이 바꾸지 못하게).
 *   - 이메일은 바로 바뀌지 않는다. 새 주소로 확인 메일이 가고, 링크를 눌러야 바뀐다.
 *   - 비밀번호를 바꾸면 이 기기를 뺀 다른 기기의 로그인은 끊는다.
 */
export async function updateAccountSettings(
  _prev: AccountSettingsState,
  formData: FormData,
): Promise<AccountSettingsState> {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  const user = auth.user;
  if (!user?.email) return { message: "로그인이 끝났어요. 다시 로그인해 주세요." };

  const currentNickname = typeof user.user_metadata?.nickname === "string" ? user.user_metadata.nickname : null;
  const values = {
    nickname: String(formData.get("nickname") ?? ""),
    email: String(formData.get("email") ?? ""),
  };
  const parsed = parseAccountSettings(
    {
      nickname: formData.get("nickname"),
      email: formData.get("email"),
      newPassword: formData.get("new-password"),
      newPasswordConfirm: formData.get("new-password-confirm"),
      currentPassword: formData.get("current-password"),
    },
    { email: user.email, nickname: currentNickname },
  );
  if (!parsed.ok) return { message: parsed.message, values };
  const change = parsed.value;

  if (change.needsCurrentPassword) {
    const { error } = await supabase.auth.signInWithPassword({ email: user.email, password: change.currentPassword });
    if (error) return { message: "현재 비밀번호가 맞지 않아요.", values };
  }

  // 닉네임은 화면 표시용이다. 권한 판단에는 쓰지 않는다 (user_metadata 는 사용자가 고칠 수 있다).
  const attributes: UserAttributes = { data: { nickname: change.nickname } };
  if (change.email) attributes.email = change.email;
  if (change.password) attributes.password = change.password;

  const { error } = await supabase.auth.updateUser(
    attributes,
    change.email ? { emailRedirectTo: await siteUrl("/auth/callback") } : undefined,
  );
  if (error) return { message: updateErrorMessage(error.code), values };

  if (change.password) await supabase.auth.signOut({ scope: "others" });

  revalidatePath("/account");
  // 이메일은 확인 메일의 링크를 눌러야 바뀌므로, 칸에는 지금 쓰는 이메일을 그대로 보여 준다
  return {
    values: { nickname: change.nickname, email: user.email },
    message: change.email
      ? `계정 설정을 바꿨어요. 이메일은 ${change.email} 로 보낸 확인 메일의 링크를 눌러야 바뀌어요 (이전 이메일에도 확인 메일이 갈 수 있어요).`
      : "계정 설정을 바꿨어요.",
  };
}

/*
 * 메일의 재설정 링크로 들어온 사람이 새 비밀번호를 정한다 (현재 비밀번호를 모르는 경우).
 * /auth/recovery 가 링크를 확인하고 남긴 짧은 표식(쿠키)이 있을 때만 된다. 평소 로그인으로는 이 길을 쓸 수 없다.
 */
export async function resetPassword(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const cookieStore = await cookies();
  if (cookieStore.get(RECOVERY_COOKIE)?.value !== "1") {
    return { message: "재설정 링크가 만료됐어요. 비밀번호 재설정 메일을 다시 받아 주세요." };
  }

  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return { message: "재설정 링크가 만료됐어요. 비밀번호 재설정 메일을 다시 받아 주세요." };

  const password = parseNewPassword(formData.get("new-password"), formData.get("new-password-confirm"));
  if (!password.ok) return { message: password.message };

  const { error } = await supabase.auth.updateUser({ password: password.value });
  if (error) return { message: updateErrorMessage(error.code) };

  await supabase.auth.signOut({ scope: "others" });
  // 쿠키를 남길 때와 같은 경로를 적어야 지워진다
  cookieStore.delete({ name: RECOVERY_COOKIE, path: RECOVERY_COOKIE_PATH });
  redirect("/account?notice=password");
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
