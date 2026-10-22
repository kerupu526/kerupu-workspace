"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { parseNickname } from "@/lib/nickname";

/*
 * 이 사이트의 주소. 확인 메일 링크가 여기로 돌아오므로 고정 설정(SITE_URL)을 우선한다.
 * 요청 주소(0.0.0.0 같은 접속용 주소)를 쓰면 메일 링크가 엉뚱한 곳으로 간다.
 */
async function siteUrl(path: string): Promise<string> {
  const configured = process.env.SITE_URL;
  if (configured) return new URL(path, configured).toString();
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  const proto = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  return `${proto}://${host}${path}`;
}

/* 폼에 보여 줄 결과. 성공하면 다른 페이지로 넘어가므로 메시지는 실패할 때만 있다. */
export interface AuthState {
  message?: string;
}

// 아이디 칸에 쓰는 이메일 형식 (아주 느슨한 검사. 실제 확인은 Supabase 가 메일로 한다)
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function signIn(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const email = String(formData.get("login-email") ?? "").trim();
  const password = String(formData.get("login-password") ?? "");

  if (!email || !password) return { message: "이메일과 비밀번호를 모두 입력해 주세요." };
  if (!EMAIL.test(email)) return { message: "이메일 형식을 확인해 주세요." };

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  // 어느 칸이 틀렸는지 알려 주지 않는다 (가입 여부를 추측하지 못하게)
  if (error) return { message: "이메일 또는 비밀번호가 맞지 않아요." };

  redirect("/login");
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
  if (!EMAIL.test(email)) return { message: "이메일 형식을 확인해 주세요." };
  if (password.length < 8) return { message: "비밀번호는 8자 이상으로 써 주세요." };
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

  redirect("/login");
}

/* 내 계정에서 닉네임 바꾸기. 처음 정하는 것도 같은 동작이다 (대시보드에서 만든 계정은 닉네임이 없다). */
export async function updateNickname(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const nickname = parseNickname(formData.get("nickname"));
  if (!nickname.ok) return { message: nickname.message };

  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return { message: "로그인이 끝났어요. 다시 로그인해 주세요." };

  // 닉네임은 화면 표시용이다. 권한 판단에는 쓰지 않는다 (user_metadata 는 사용자가 고칠 수 있다).
  const { error } = await supabase.auth.updateUser({ data: { nickname: nickname.value } });
  if (error) return { message: "닉네임을 바꾸지 못했어요. 잠시 뒤 다시 해 주세요." };

  revalidatePath("/login");
  return { message: "닉네임을 저장했어요." };
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
