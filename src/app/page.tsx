import { ButtonLink } from "@/components/Button";
import PageFrame from "@/components/PageFrame";
import ProfileCard from "@/components/ProfileCard";
import styles from "./page.module.css";

/* 내용은 자리표시(대괄호)다. 실제 문구는 콘텐츠 단계에서 채운다. */
export default function LandingPage() {
  return (
    <PageFrame className={styles.layout}>
      <ProfileCard name="[이름]">[짧은 설명]</ProfileCard>
      <div className={styles.hero}>
        <p className={styles.eyebrow}>개인 웹사이트</p>
        <h1 className={styles.title}>[한 줄 소개 문구]</h1>
        <p className={styles.lead}>[소개 문단]</p>
        <div className={styles.actions}>
          <ButtonLink href="/about" size="large">
            자기소개 보기
          </ButtonLink>
          <ButtonLink href="/login" size="large" variant="secondary">
            로그인 · 회원가입
          </ButtonLink>
        </div>
      </div>
    </PageFrame>
  );
}
