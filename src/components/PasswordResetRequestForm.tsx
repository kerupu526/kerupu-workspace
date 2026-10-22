"use client";

import { useActionState } from "react";
import { Button } from "./Button";
import Field from "./Field";
import styles from "./AuthForms.module.css";
import { requestPasswordReset, type AuthState } from "@/app/login/actions";

const NO_MESSAGE: AuthState = {};

/* 비밀번호를 잊은 사람이 이메일을 적으면 재설정 링크를 보내 준다 */
export default function PasswordResetRequestForm() {
  const [state, action, pending] = useActionState(requestPasswordReset, NO_MESSAGE);

  return (
    <form className={styles.form} action={action} noValidate>
      <Field id="reset-email" label="가입한 이메일" type="email" autoComplete="email" required />
      <p className={styles.message} role="status">
        {state.message ?? ""}
      </p>
      <Button type="submit" className={styles.submit} disabled={pending}>
        {pending ? "보내는 중" : "재설정 메일 보내기"}
      </Button>
    </form>
  );
}
