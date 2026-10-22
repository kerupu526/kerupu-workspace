"use client";

import { useActionState } from "react";
import { Button } from "./Button";
import Field from "./Field";
import styles from "./AuthForms.module.css";
import { updateNickname } from "@/app/account/actions";
import type { AuthState } from "@/app/login/actions";
import { MAX_NICKNAME_LENGTH } from "@/lib/nickname";

const NO_MESSAGE: AuthState = {};

/* "내 계정"의 닉네임 칸. 저장하면 이 화면의 인사말과 메뉴가 바로 새 닉네임으로 바뀐다. */
export default function NicknameForm({ nickname }: { nickname: string | null }) {
  const [state, action, pending] = useActionState(updateNickname, NO_MESSAGE);

  return (
    <form className={styles.nicknameForm} action={action}>
      <Field
        id="nickname"
        label="닉네임"
        autoComplete="nickname"
        required
        maxLength={MAX_NICKNAME_LENGTH}
        defaultValue={nickname ?? ""}
      />
      <p className={styles.message} role="status">
        {state.message ?? (nickname ? "" : "아직 닉네임이 없어요. 정해 주세요.")}
      </p>
      <Button type="submit" size="compact" disabled={pending}>
        {pending ? "저장하는 중" : "닉네임 저장"}
      </Button>
    </form>
  );
}
