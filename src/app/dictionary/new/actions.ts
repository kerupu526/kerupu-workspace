"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { buildCharacterMarkdown, parseCharacterInput } from "@/lib/wiki/character";

/* 캐릭터 추가 결과. 성공하면 문서 화면으로 넘어가므로 실패할 때만 메시지가 있다. 입력한 값은 돌려줘서 폼에 남긴다. */
export interface CreateCharacterState {
  message?: string;
  values?: { slug: string; name: string; work: string; summary: string };
}

/*
 * 새 캐릭터 만들기: 문서와 첫 판을 DB 함수(create_character) 하나로 한 번에 만든다.
 * 권한은 로그인한 사용자 본인의 세션으로 정해진다 (RLS). 로그인하지 않았으면 만들지 못한다.
 */
export async function createCharacter(_prev: CreateCharacterState, formData: FormData): Promise<CreateCharacterState> {
  const raw = {
    slug: formData.get("slug"),
    name: formData.get("name"),
    work: formData.get("work"),
    summary: formData.get("summary"),
  };
  const values = {
    slug: String(raw.slug ?? ""),
    name: String(raw.name ?? ""),
    work: String(raw.work ?? ""),
    summary: String(raw.summary ?? ""),
  };

  const parsed = parseCharacterInput(raw);
  if (!parsed.ok) return { message: parsed.message, values };
  const input = parsed.value;

  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return { message: "캐릭터를 추가하려면 로그인해 주세요.", values };

  const { error } = await supabase.rpc("create_character", {
    p_slug: input.slug,
    p_name: input.name,
    p_work: input.work,
    p_summary: input.summary === "" ? null : input.summary,
    p_markdown: buildCharacterMarkdown(input),
  });
  if (error) {
    // 23505: 같은 주소의 문서가 이미 있다
    if (error.code === "23505") return { message: "이미 쓰고 있는 주소예요. 다른 주소를 적어 주세요.", values };
    return { message: "캐릭터를 만들지 못했어요. 잠시 뒤 다시 해 주세요.", values };
  }

  revalidatePath("/dictionary");
  redirect(`/dictionary/${input.slug}`);
}
