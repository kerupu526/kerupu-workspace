"use client";

import { useActionState } from "react";
import Card from "./Card";
import { Button } from "./Button";
import Field from "./Field";
import styles from "./AuthForms.module.css";
import { signIn, signUp, type AuthState } from "@/app/login/actions";

const NO_MESSAGE: AuthState = {};

/*
 * 로그인과 회원가입 폼. 제출은 서버 액션으로 가고, 실패하면 그 자리에 안내 문구가 나온다.
 * 성공하면 서버에서 다른 페이지로 넘긴다.
 */
export default function AuthForms() {
  const [loginState, loginAction, loginPending] = useActionState(signIn, NO_MESSAGE);
  const [signupState, signupAction, signupPending] = useActionState(signUp, NO_MESSAGE);

  return (
    <div className={styles.forms}>
      <Card as="section" className={styles.card} aria-labelledby="login-title">
        <h2 className={styles.title} id="login-title">
          로그인
        </h2>
        <form className={styles.form} action={loginAction}>
          <Field id="login-email" label="이메일" type="email" autoComplete="email" />
          <Field id="login-password" label="비밀번호" type="password" autoComplete="current-password" />
          <p className={styles.message} role="status">
            {loginState.message ?? ""}
          </p>
          <Button type="submit" className={styles.submit} disabled={loginPending}>
            {loginPending ? "확인하는 중" : "로그인"}
          </Button>
        </form>
      </Card>

      <Card as="section" className={styles.card} aria-labelledby="signup-title">
        <h2 className={styles.title} id="signup-title">
          회원가입
        </h2>
        <form className={styles.form} action={signupAction}>
          <Field id="signup-nickname" label="닉네임" autoComplete="nickname" />
          <Field id="signup-email" label="이메일" type="email" autoComplete="email" />
          <Field id="signup-password" label="비밀번호 (8자 이상)" type="password" autoComplete="new-password" />
          <Field
            id="signup-password-confirm"
            label="비밀번호 확인"
            type="password"
            autoComplete="new-password"
          />
          <p className={styles.message} role="status">
            {signupState.message ?? ""}
          </p>
          <Button type="submit" className={styles.submit} disabled={signupPending}>
            {signupPending ? "가입하는 중" : "가입하기"}
          </Button>
        </form>
      </Card>
    </div>
  );
}
