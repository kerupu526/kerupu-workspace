import type { Metadata } from "next";
import { redirect } from "next/navigation";
import Card from "@/components/Card";
import { Button } from "@/components/Button";
import NicknameForm from "@/components/NicknameForm";
import PageFrame from "@/components/PageFrame";
import styles from "@/components/AuthForms.module.css";
import { createClient } from "@/lib/supabase/server";
import { signOut } from "./actions";

// 내 계정은 본인만 보는 화면이라 검색에 나오지 않게 한다
export const metadata: Metadata = { title: "내 계정", robots: { index: false, follow: false } };

/* 로그인한 사용자의 계정 화면. 로그인하지 않았으면 로그인 화면으로 보낸다. */
export default async function AccountPage() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  const user = data.user;
  if (!user) redirect("/login");

  const nickname = typeof user.user_metadata?.nickname === "string" ? user.user_metadata.nickname : null;

  return (
    <PageFrame>
      <div className={styles.single}>
        <Card as="section" className={styles.account} aria-labelledby="account-title">
          <h1 className={styles.title} id="account-title">
            내 계정
          </h1>
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
    </PageFrame>
  );
}
