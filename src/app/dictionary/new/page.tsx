import type { Metadata } from "next";
import { ButtonLink } from "@/components/Button";
import Card from "@/components/Card";
import CharacterForm from "@/components/CharacterForm";
import PageFrame from "@/components/PageFrame";
import { createClient } from "@/lib/supabase/server";
import formStyles from "@/components/CharacterForm.module.css";
import styles from "./page.module.css";

// 만드는 화면은 검색에 나오지 않게 한다
export const metadata: Metadata = { title: "새 캐릭터 추가", robots: { index: false, follow: false } };

/* 새 캐릭터 추가 화면. 로그인한 사용자만 추가할 수 있어서, 로그인하지 않았으면 로그인 안내를 보여 준다. */
export default async function NewCharacterPage() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();

  return (
    <PageFrame>
      <h1 className="visually-hidden">새 캐릭터 추가</h1>
      <div className={styles.center}>
        {data.user ? (
          <CharacterForm />
        ) : (
          <Card as="section" className={formStyles.card} aria-labelledby="character-new-login-title">
            <h2 className={formStyles.title} id="character-new-login-title">
              로그인이 필요해요
            </h2>
            <p className={formStyles.hint}>캐릭터를 추가하려면 먼저 로그인해 주세요.</p>
            <div className={formStyles.actions}>
              <ButtonLink href="/dictionary" variant="secondary">
                사전으로
              </ButtonLink>
              <ButtonLink href="/login">로그인</ButtonLink>
            </div>
          </Card>
        )}
      </div>
    </PageFrame>
  );
}
