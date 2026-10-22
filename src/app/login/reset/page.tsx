import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import Card from "@/components/Card";
import PageFrame from "@/components/PageFrame";
import PasswordResetRequestForm from "@/components/PasswordResetRequestForm";
import { createClient } from "@/lib/supabase/server";
import styles from "./page.module.css";

export const metadata: Metadata = { title: "비밀번호 재설정", robots: { index: false, follow: false } };

/* 비밀번호를 잊은 사람이 재설정 메일을 받는 화면. 이미 로그인했으면 계정 화면(설정 변경)으로 보낸다. */
export default async function ResetRequestPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (data.user) redirect("/account");

  return (
    <PageFrame>
      <div className={styles.center}>
        <Card as="section" className={styles.card} aria-labelledby="reset-title">
          <h1 className={styles.title} id="reset-title">
            비밀번호 재설정
          </h1>
          <p className={styles.text}>가입한 이메일을 적으면 비밀번호를 다시 정하는 링크를 보내 드려요.</p>
          {error === "link" ? (
            <p className={styles.alert} role="alert">
              링크가 만료되었거나 이미 쓴 링크예요. 아래에서 메일을 다시 받아 주세요.
            </p>
          ) : null}
          <PasswordResetRequestForm />
          <p className={styles.back}>
            <Link href="/login">로그인으로 돌아가기</Link>
          </p>
        </Card>
      </div>
    </PageFrame>
  );
}
