import type { Metadata } from "next";
import AuthForms from "@/components/AuthForms";
import NicknameForm from "@/components/NicknameForm";
import Card from "@/components/Card";
import { Button } from "@/components/Button";
import PageFrame from "@/components/PageFrame";
import styles from "@/components/AuthForms.module.css";
import { createClient } from "@/lib/supabase/server";
import { signOut } from "./actions";

export const metadata: Metadata = { title: "로그인 · 회원가입" };

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  // 로그인한 사용자는 계정 카드를, 아니면 로그인과 가입 폼을 보여 준다
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  const user = data.user;
  const nickname = typeof user?.user_metadata?.nickname === "string" ? user.user_metadata.nickname : null;

  return (
    <PageFrame>
      {/* 화면에는 카드 제목이 보이므로 페이지 제목은 보조기기용으로만 둔다 */}
      <h1 className="visually-hidden">로그인 · 회원가입</h1>
      {error === "confirm" && !user ? (
        <p role="alert" style={{ textAlign: "center", marginBottom: "var(--space-24)" }}>
          확인 링크가 만료되었거나 이미 쓴 링크예요. 다시 가입하거나 로그인해 주세요.
        </p>
      ) : null}
      {user ? (
        <div className={styles.single}>
          <Card as="section" className={styles.account} aria-labelledby="account-title">
            <h2 className={styles.title} id="account-title">
              내 계정
            </h2>
            <p className={styles.accountName}>{nickname ?? "사용자"}님, 환영합니다.</p>
            <p className={styles.accountEmail}>{user.email}</p>
            <NicknameForm nickname={nickname} />
            <form action={signOut}>
              <Button type="submit" variant="secondary" className={styles.logout}>
                로그아웃
              </Button>
            </form>
          </Card>
        </div>
      ) : (
        <AuthForms />
      )}
    </PageFrame>
  );
}
