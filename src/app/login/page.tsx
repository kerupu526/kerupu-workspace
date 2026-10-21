import type { Metadata } from "next";
import AuthForms from "@/components/AuthForms";
import PageFrame from "@/components/PageFrame";

export const metadata: Metadata = { title: "로그인 · 회원가입" };

export default function LoginPage() {
  return (
    <PageFrame>
      {/* 화면에는 카드 제목(로그인, 회원가입)이 보이므로 페이지 제목은 보조기기용으로만 둔다 */}
      <h1 className="visually-hidden">로그인 · 회원가입</h1>
      <AuthForms />
    </PageFrame>
  );
}
