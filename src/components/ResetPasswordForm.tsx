"use client";

import { useActionState } from "react";
import { Button } from "./Button";
import Field from "./Field";
import styles from "./AuthForms.module.css";
import { resetPassword } from "@/app/account/actions";
import type { AuthState } from "@/app/login/actions";
import { MIN_PASSWORD_LENGTH } from "@/lib/account";

const NO_MESSAGE: AuthState = {};

/* 재설정 링크로 들어온 사람이 새 비밀번호를 정한다. 성공하면 서버에서 내 계정으로 넘긴다. */
export default function ResetPasswordForm() {
  const [state, action, pending] = useActionState(resetPassword, NO_MESSAGE);

  return (
    <form className={styles.form} action={action} noValidate>
      <Field
        id="new-password"
        label={`새 비밀번호 (${MIN_PASSWORD_LENGTH}자 이상)`}
        type="password"
        autoComplete="new-password"
        required
      />
      <Field id="new-password-confirm" label="새 비밀번호 확인" type="password" autoComplete="new-password" required />
      <p className={styles.message} role="status">
        {state.message ?? ""}
      </p>
      <Button type="submit" className={styles.submit} disabled={pending}>
        {pending ? "바꾸는 중" : "비밀번호 바꾸기"}
      </Button>
    </form>
  );
}
