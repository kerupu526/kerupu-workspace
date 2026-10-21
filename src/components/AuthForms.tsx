"use client";

import type { FormEvent } from "react";
import Card from "./Card";
import { Button } from "./Button";
import styles from "./AuthForms.module.css";

interface FieldProps {
  id: string;
  label: string;
  type?: "text" | "password";
  autoComplete: string;
}

function Field({ id, label, type = "text", autoComplete }: FieldProps) {
  return (
    <div className={styles.field}>
      <label className={styles.label} htmlFor={id}>
        {label}
      </label>
      <input className={styles.input} id={id} name={id} type={type} autoComplete={autoComplete} />
    </div>
  );
}

/* 이번 단계는 화면만 만든다. 제출해도 아무 일도 하지 않고 주소도 바뀌지 않는다. */
function ignoreSubmit(event: FormEvent<HTMLFormElement>) {
  event.preventDefault();
}

export default function AuthForms() {
  return (
    <div className={styles.forms}>
      <Card as="section" className={styles.card} aria-labelledby="login-title">
        <h2 className={styles.title} id="login-title">
          로그인
        </h2>
        <form className={styles.form} onSubmit={ignoreSubmit}>
          <Field id="login-id" label="아이디" autoComplete="username" />
          <Field id="login-password" label="비밀번호" type="password" autoComplete="current-password" />
          {/* 오류·안내 문구가 들어갈 자리 */}
          <p className={styles.message} role="status" />
          <Button type="submit" className={styles.submit}>
            로그인
          </Button>
        </form>
      </Card>

      <Card as="section" className={styles.card} aria-labelledby="signup-title">
        <h2 className={styles.title} id="signup-title">
          회원가입
        </h2>
        <form className={styles.form} onSubmit={ignoreSubmit}>
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
        </form>
      </Card>
    </div>
  );
}
