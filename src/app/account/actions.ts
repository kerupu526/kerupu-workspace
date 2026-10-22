"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { parseNickname } from "@/lib/nickname";
import type { AuthState } from "@/app/login/actions";

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

  revalidatePath("/account");
  return { message: "닉네임을 저장했어요." };
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
