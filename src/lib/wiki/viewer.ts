import "server-only";
import { createClient } from "@/lib/supabase/server";

/* 지금 화면을 보는 사람. 로그인하지 않았으면 null 이다. */
export interface Viewer {
  id: string;
  /** 운영자인지. operators 표는 읽을 수 없어서 DB 함수(is_operator)로 묻는다. */
  isOperator: boolean;
}

export async function getViewer(): Promise<Viewer | null> {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) return null;
  const { data: operator } = await supabase.rpc("is_operator");
  return { id: data.user.id, isOperator: operator === true };
}
