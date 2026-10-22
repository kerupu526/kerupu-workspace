import type { Metadata } from "next";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import Card from "@/components/Card";
import PageFrame from "@/components/PageFrame";
import ResetPasswordForm from "@/components/ResetPasswordForm";
import { createClient } from "@/lib/supabase/server";
import { RECOVERY_COOKIE } from "@/lib/recovery";
import styles from "@/app/login/reset/page.module.css";

export const metadata: Metadata = { title: "새 비밀번호 정하기", robots: { index: false, follow: false } };

/*
 * 재설정 메일의 링크(/auth/recovery)를 확인한 사람만 들어올 수 있는 화면.
 * 표식 쿠키나 로그인이 없으면 재설정 요청 화면으로 보낸다.
 */
export default async function ResetPasswordPage() {
  const cookieStore = await cookies();
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user || cookieStore.get(RECOVERY_COOKIE)?.value !== "1") redirect("/login/reset?error=link");

  return (
    <PageFrame>
      <div className={styles.center}>
        <Card as="section" className={styles.card} aria-labelledby="new-password-title">
          <h1 className={styles.title} id="new-password-title">
            새 비밀번호 정하기
          </h1>
          <p className={styles.text}>{data.user.email} 계정의 새 비밀번호를 정해 주세요. 다른 기기의 로그인은 끊겨요.</p>
          <ResetPasswordForm />
        </Card>
      </div>
    </PageFrame>
  );
}
