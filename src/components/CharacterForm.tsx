"use client";

import { useActionState } from "react";
import Card from "./Card";
import { Button, ButtonLink } from "./Button";
import Field from "./Field";
import styles from "./CharacterForm.module.css";
import {
  createCharacter,
  type CreateCharacterState,
} from "@/app/dictionary/new/actions";
import { MAX_NAME_LENGTH, MAX_SUMMARY_LENGTH, MAX_WORK_LENGTH } from "@/lib/wiki/character";

const NO_MESSAGE: CreateCharacterState = {};

/*
 * 새 캐릭터 추가 폼. 제출은 서버 액션으로 가고, 실패하면 그 자리에 안내 문구가 나온다.
 * 성공하면 서버에서 새 문서 화면으로 넘긴다. 실패해도 입력한 값은 남는다.
 */
export default function CharacterForm() {
  const [state, action, pending] = useActionState(createCharacter, NO_MESSAGE);
  const values = state.values;

  return (
    <Card as="section" className={styles.card} aria-labelledby="character-new-title">
      <h2 className={styles.title} id="character-new-title">
        새 캐릭터 추가
      </h2>
      <form className={styles.form} action={action}>
        <Field id="name" label="이름" required maxLength={MAX_NAME_LENGTH} defaultValue={values?.name} />
        <Field id="work" label="작품" required maxLength={MAX_WORK_LENGTH} defaultValue={values?.work} />
        <Field
          id="summary"
          label="한 줄 설명 (목록에 보여요)"
          maxLength={MAX_SUMMARY_LENGTH}
          defaultValue={values?.summary}
        />
        <div className={styles.slug}>
          <Field
            id="slug"
            label="주소"
            required
            maxLength={80}
            autoComplete="off"
            placeholder="예: kelp-chan"
            defaultValue={values?.slug}
          />
          <p className={styles.hint}>
            문서 주소(/dictionary/주소)가 돼요. 영문 소문자, 숫자, 하이픈(-)만 쓸 수 있고 만든 뒤에는 바꿀 수 없어요.
          </p>
        </div>
        <p className={styles.message} role="status">
          {state.message ?? ""}
        </p>
        <div className={styles.actions}>
          <ButtonLink href="/dictionary" variant="secondary">
            취소
          </ButtonLink>
          <Button type="submit" disabled={pending}>
            {pending ? "만드는 중" : "추가"}
          </Button>
        </div>
      </form>
      <p className={styles.hint}>추가하면 기본 문서가 만들어지고, 문서 화면에서 편집할 수 있어요.</p>
    </Card>
  );
}
