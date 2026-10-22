import type { Metadata } from "next";
import { ButtonLink } from "@/components/Button";
import Card from "@/components/Card";
import ImageUploadForm from "@/components/ImageUploadForm";
import PageFrame from "@/components/PageFrame";
import { createClient } from "@/lib/supabase/server";
import formStyles from "@/components/CharacterForm.module.css";
import styles from "./page.module.css";

// 올리는 화면은 검색에 나오지 않게 한다
export const metadata: Metadata = { title: "이미지 업로드", robots: { index: false, follow: false } };

/* 이미지 업로드 화면. 로그인한 사용자만 올릴 수 있어서, 로그인하지 않았으면 로그인 안내를 보여 준다. */
export default async function NewImagePage() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();

  return (
    <PageFrame>
      <h1 className="visually-hidden">이미지 업로드</h1>
      <div className={styles.center}>
        {data.user ? (
          <ImageUploadForm />
        ) : (
          <Card as="section" className={formStyles.card} aria-labelledby="image-login-title">
            <h2 className={formStyles.title} id="image-login-title">
              로그인이 필요해요
            </h2>
            <p className={formStyles.hint}>이미지를 올리려면 먼저 로그인해 주세요.</p>
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
