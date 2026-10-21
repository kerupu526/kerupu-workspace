import Card from "./Card";
import { Button } from "./Button";
import Field from "./Field";
import NoopForm from "./NoopForm";
import styles from "./AuthForms.module.css";

/* 이번 단계는 화면만 만든다. 제출해도 아무 일도 하지 않는다. */
export default function AuthForms() {
  return (
    <div className={styles.forms}>
      <Card as="section" className={styles.card} aria-labelledby="login-title">
        <h2 className={styles.title} id="login-title">
          로그인
        </h2>
        <NoopForm className={styles.form}>
          <Field id="login-id" label="아이디" autoComplete="username" />
          <Field id="login-password" label="비밀번호" type="password" autoComplete="current-password" />
          {/* 오류·안내 문구가 들어갈 자리 */}
          <p className={styles.message} role="status" />
          <Button type="submit" className={styles.submit}>
            로그인
          </Button>
        </NoopForm>
      </Card>

      <Card as="section" className={styles.card} aria-labelledby="signup-title">
        <h2 className={styles.title} id="signup-title">
          회원가입
        </h2>
        <NoopForm className={styles.form}>
          <Field id="signup-nickname" label="닉네임" autoComplete="nickname" />
          <Field id="signup-id" label="아이디" autoComplete="username" />
          <Field id="signup-password" label="비밀번호" type="password" autoComplete="new-password" />
          <Field
            id="signup-password-confirm"
            label="비밀번호 확인"
            type="password"
            autoComplete="new-password"
          />
          <Button type="submit" className={styles.submit}>
            가입하기
          </Button>
        </NoopForm>
      </Card>
    </div>
  );
}
