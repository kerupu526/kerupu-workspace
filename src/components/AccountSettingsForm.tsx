"use client";

import { useActionState } from "react";
import { Button } from "./Button";
import Field from "./Field";
import styles from "./AccountSettingsForm.module.css";
import { updateAccountSettings, type AccountSettingsState } from "@/app/account/actions";
import { MIN_PASSWORD_LENGTH } from "@/lib/account";
import { MAX_NICKNAME_LENGTH } from "@/lib/nickname";

const NO_MESSAGE: AccountSettingsState = {};

/*
 * "계정 설정 변경": 닉네임, 이메일, 비밀번호를 한 폼에서 바꾼다.
 * 새 비밀번호는 비워 두면 그대로다. 이메일이나 비밀번호를 바꿀 때만 현재 비밀번호가 필요하다.
 */
export default function AccountSettingsForm({ nickname, email }: { nickname: string | null; email: string }) {
  const [state, action, pending] = useActionState(updateAccountSettings, NO_MESSAGE);

  return (
    <form className={styles.form} action={action} noValidate>
      <div className={styles.grid}>
        <Field
          id="nickname"
          label="닉네임"
          autoComplete="nickname"
          required
          maxLength={MAX_NICKNAME_LENGTH}
          defaultValue={state.values?.nickname ?? nickname ?? ""}
        />
        <Field
          id="email"
          label="이메일"
          type="email"
          autoComplete="email"
          required
          defaultValue={state.values?.email ?? email}
        />
        <Field
          id="new-password"
          label={`새 비밀번호 (${MIN_PASSWORD_LENGTH}자 이상, 바꿀 때만)`}
          type="password"
          autoComplete="new-password"
        />
        <Field id="new-password-confirm" label="새 비밀번호 확인" type="password" autoComplete="new-password" />
      </div>
      <Field
        id="current-password"
        label="현재 비밀번호 (이메일이나 비밀번호를 바꿀 때만)"
        type="password"
        autoComplete="current-password"
      />
      <p className={styles.message} role="status">
        {state.message ?? (nickname ? "" : "아직 닉네임이 없어요. 정해 주세요.")}
      </p>
      <div className={styles.actions}>
        <Button type="submit" size="compact" disabled={pending}>
          {pending ? "바꾸는 중" : "계정 설정 변경"}
        </Button>
      </div>
    </form>
  );
}
