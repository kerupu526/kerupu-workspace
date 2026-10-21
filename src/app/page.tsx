import { ButtonLink } from "@/components/Button";
import PageFrame from "@/components/PageFrame";
import ProfileCard from "@/components/ProfileCard";
import styles from "./page.module.css";

export default function LandingPage() {
  return (
    <PageFrame className={styles.layout}>
      <ProfileCard name="ケルプ / 켈프" image="/images/profile.jpg">
        다른 이름으로 𰻝䨻𪚥𣡽P라고도 부릅니다. (자칭)
      </ProfileCard>
      <div className={styles.hero}>
        <p className={styles.eyebrow}>개인 웹사이트</p>
        <h1 className={styles.title}>켈프의 작업공간에 오신 것을 환영합니다!</h1>
        <p className={styles.lead}>준비한 건 없지만 뭐라도 보고 가세요 ✨</p>
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
