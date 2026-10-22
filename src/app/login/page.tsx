import type { Metadata } from "next";
import { redirect } from "next/navigation";
import AuthForms from "@/components/AuthForms";
import PageFrame from "@/components/PageFrame";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "로그인 · 회원가입" };

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  // 이미 로그인했으면 계정 화면으로 보낸다 (예전 주소를 저장해 둔 경우도 포함)
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (data.user) redirect("/account");

  return (
    <PageFrame>
      {/* 화면에는 카드 제목이 보이므로 페이지 제목은 보조기기용으로만 둔다 */}
      <h1 className="visually-hidden">로그인 · 회원가입</h1>
      {error === "confirm" ? (
        <p role="alert" style={{ textAlign: "center", marginBottom: "var(--space-24)" }}>
          확인 링크가 만료되었거나 이미 쓴 링크예요. 다시 가입하거나 로그인해 주세요.
        </p>
      ) : null}
      <AuthForms />
    </PageFrame>
  );
}
