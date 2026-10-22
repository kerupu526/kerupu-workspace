"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isEmail, MIN_PASSWORD_LENGTH } from "@/lib/account";
import { parseNickname } from "@/lib/nickname";
import { siteUrl } from "@/lib/site-url";

/* 폼에 보여 줄 결과. 성공하면 다른 페이지로 넘어가므로 메시지는 실패할 때만 있다. */
export interface AuthState {
  message?: string;
}

export async function signIn(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const email = String(formData.get("login-email") ?? "").trim();
  const password = String(formData.get("login-password") ?? "");

  if (!email || !password) return { message: "이메일과 비밀번호를 모두 입력해 주세요." };
  if (!isEmail(email)) return { message: "이메일 형식을 확인해 주세요." };

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  // 어느 칸이 틀렸는지 알려 주지 않는다 (가입 여부를 추측하지 못하게)
  if (error) return { message: "이메일 또는 비밀번호가 맞지 않아요." };

  redirect("/account");
}

export async function signUp(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const nicknameText = String(formData.get("signup-nickname") ?? "").trim();
  const email = String(formData.get("signup-email") ?? "").trim();
  const password = String(formData.get("signup-password") ?? "");
  const confirm = String(formData.get("signup-password-confirm") ?? "");

  if (!nicknameText || !email || !password) return { message: "모든 칸을 입력해 주세요." };
  const nicknameInput = parseNickname(nicknameText);
  if (!nicknameInput.ok) return { message: nicknameInput.message };
  const nickname = nicknameInput.value;
  if (!isEmail(email)) return { message: "이메일 형식을 확인해 주세요." };
  if (password.length < MIN_PASSWORD_LENGTH) return { message: `비밀번호는 ${MIN_PASSWORD_LENGTH}자 이상으로 써 주세요.` };
  if (password !== confirm) return { message: "비밀번호 확인이 맞지 않아요." };

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      // 닉네임은 화면 표시용이다. 권한 판단에는 쓰지 않는다 (user_metadata 는 사용자가 고칠 수 있다).
      data: { nickname },
      // 확인 메일의 링크는 이 사이트의 /auth/callback 으로 돌아온다 (대시보드의 Redirect URLs 에 허용되어 있어야 한다)
      emailRedirectTo: await siteUrl("/auth/callback"),
    },
  });
  if (error) return { message: "가입하지 못했어요. 이미 쓰는 이메일인지 확인해 주세요." };

  // 이메일 확인이 켜져 있으면 세션이 바로 없다. 메일의 링크를 눌러야 가입이 끝난다.
  if (!data.session) {
    return { message: "입력한 이메일로 확인 메일을 보냈어요. 메일의 링크를 누르면 가입이 끝나요." };
  }

  redirect("/account");
}

/*
 * 비밀번호 재설정 메일 요청. 가입된 이메일인지 알려 주지 않도록 결과는 항상 같은 문구다.
 * 메일의 링크는 /auth/recovery 로 돌아온다 (대시보드의 Redirect URLs 에 허용되어 있어야 한다).
 */
export async function requestPasswordReset(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const email = String(formData.get("reset-email") ?? "").trim();
  if (!email) return { message: "이메일을 입력해 주세요." };
  if (!isEmail(email)) return { message: "이메일 형식을 확인해 주세요." };

  const supabase = await createClient();
  await supabase.auth.resetPasswordForEmail(email, { redirectTo: await siteUrl("/auth/recovery") });

  return { message: "가입된 이메일이라면 비밀번호를 다시 정하는 링크를 보냈어요. 메일함을 확인해 주세요." };
}
