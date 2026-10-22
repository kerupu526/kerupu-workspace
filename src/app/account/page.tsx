import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Button, ButtonLink } from "@/components/Button";
import Card from "@/components/Card";
import Chip from "@/components/Chip";
import NicknameForm from "@/components/NicknameForm";
import PageFrame from "@/components/PageFrame";
import { createClient } from "@/lib/supabase/server";
import { DASHBOARD_CHARACTER_LIMIT, formatKst, getAccountDashboard } from "@/lib/wiki/dashboard";
import { signOut } from "./actions";
import styles from "./page.module.css";

// 내 계정은 본인만 보는 화면이라 검색에 나오지 않게 한다
export const metadata: Metadata = { title: "내 계정", robots: { index: false, follow: false } };

/*
 * 내 계정 대시보드. 왼쪽은 계정 카드(닉네임, 이메일, 로그아웃), 오른쪽은 내 활동이다.
 * 로그인하지 않았으면 로그인 화면으로 보낸다.
 */
export default async function AccountPage() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  const user = data.user;
  if (!user) redirect("/login");

  const nickname = typeof user.user_metadata?.nickname === "string" ? user.user_metadata.nickname : null;
  const dashboard = await getAccountDashboard(user.id);

  return (
    <PageFrame className={styles.layout}>
      <Card as="section" className={styles.profile} aria-labelledby="account-title">
        <h1 className={styles.title} id="account-title">
          내 계정
        </h1>
        <div className={styles.identity}>
          <p className={styles.name}>{nickname ?? "닉네임 없음"}</p>
          {dashboard.isOperator ? <Chip variant="solid">관리자</Chip> : null}
        </div>
        <p className={styles.meta}>{user.email}</p>
        <p className={styles.meta}>가입한 날 {formatKst(user.created_at)}</p>
        <NicknameForm nickname={nickname} />
        <form action={signOut}>
          <Button type="submit" variant="secondary" className={styles.logout}>
            로그아웃
          </Button>
        </form>
      </Card>

      <div className={styles.activity}>
        <h2 className="visually-hidden">내 활동</h2>

        <dl className={styles.stats}>
          <Card className={styles.stat}>
            <dt>만든 캐릭터</dt>
            <dd>{dashboard.characterCount}</dd>
          </Card>
          <Card className={styles.stat}>
            <dt>저장한 판</dt>
            <dd>{dashboard.revisionCount}</dd>
          </Card>
        </dl>

        <Card as="section" className={styles.panel} aria-labelledby="my-characters-title">
          <div className={styles.panelHeader}>
            <h3 className={styles.panelTitle} id="my-characters-title">
              내가 만든 캐릭터
            </h3>
            <ButtonLink href="/dictionary/new" size="compact">
              새 캐릭터 추가
            </ButtonLink>
          </div>
          {dashboard.characters.length === 0 ? (
            <p className={styles.empty}>아직 만든 캐릭터가 없어요.</p>
          ) : (
            <ul className={styles.list}>
              {dashboard.characters.map((character) => (
                <li key={character.slug} className={styles.row}>
                  <Link href={`/dictionary/${character.slug}`} className={styles.rowLink}>
                    {character.name}
                  </Link>
                  <span className={styles.rowWork}>{character.work ?? "작품 미정"}</span>
                  <span className={styles.rowTime}>{formatKst(character.updated)}</span>
                </li>
              ))}
            </ul>
          )}
          {dashboard.characterCount > DASHBOARD_CHARACTER_LIMIT ? (
            <p className={styles.note}>
              {dashboard.characterCount}개 중 최근에 바뀐 {DASHBOARD_CHARACTER_LIMIT}개만 보여 줘요.
            </p>
          ) : null}
        </Card>

        <Card as="section" className={styles.panel} aria-labelledby="my-edits-title">
          <h3 className={styles.panelTitle} id="my-edits-title">
            최근에 저장한 문서
          </h3>
          {dashboard.recentEdits.length === 0 ? (
            <p className={styles.empty}>아직 저장한 문서가 없어요.</p>
          ) : (
            <ul className={styles.list}>
              {dashboard.recentEdits.map((edit, index) => (
                <li key={`${edit.slug}-${edit.saved}-${index}`} className={styles.row}>
                  <Link href={`/dictionary/${edit.slug}`} className={styles.rowLink}>
                    {edit.title}
                  </Link>
                  <span className={styles.rowTime}>{formatKst(edit.saved)}</span>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </PageFrame>
  );
}
