"use client";

import { useActionState, useState, type ChangeEvent } from "react";
import Card from "./Card";
import { Button, ButtonLink } from "./Button";
import styles from "./ImageUploadForm.module.css";
import { uploadImage, type UploadState } from "@/app/images/new/actions";
import { ACCEPTED_LABEL, ACCEPTED_TYPES, MAX_IMAGE_BYTES } from "@/lib/wiki/image-upload";

const NO_MESSAGE: UploadState = {};
const MAX_MB = MAX_IMAGE_BYTES / 1024 / 1024;

/* 복사할 글 한 줄: 글과 복사 버튼. 복사하면 잠깐 "복사했어요"로 바뀐다. */
function CopyRow({ label, text }: { label: string; text: string }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      // 복사 권한이 없으면 글을 직접 골라서 복사할 수 있게 둔다
    }
  }

  return (
    <div className={styles.copyRow}>
      <p className={styles.copyLabel}>{label}</p>
      <div className={styles.copyLine}>
        <code className={styles.copyText}>{text}</code>
        <Button type="button" variant="secondary" size="compact" onClick={copy}>
          {copied ? "복사했어요" : "복사"}
        </Button>
      </div>
    </div>
  );
}

/*
 * 이미지 업로드 폼. 올리면 그 파일의 주소와, 문서에 바로 붙여 넣을 글(본문 이미지, 정보 상자 이미지)을 보여 준다.
 * 서버가 한도(8MB)를 넘는 요청을 받기 전에 걸러지지 않도록, 고른 파일이 크면 여기서 먼저 알려 준다.
 */
export default function ImageUploadForm() {
  const [state, action, pending] = useActionState(uploadImage, NO_MESSAGE);
  const [tooBig, setTooBig] = useState(false);

  function onPick(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    setTooBig(Boolean(file && file.size > MAX_IMAGE_BYTES));
  }

  const message = tooBig ? `파일이 너무 커요. ${MAX_MB}MB 이하만 올릴 수 있어요.` : state.message;

  return (
    <Card as="section" className={styles.card} aria-labelledby="image-upload-title">
      <h2 className={styles.title} id="image-upload-title">
        새 이미지 업로드
      </h2>
      <p className={styles.hint}>
        {ACCEPTED_LABEL} 이미지를 {MAX_MB}MB까지 올릴 수 있어요. 올리면 문서에 쓸 주소를 알려 드려요.
      </p>

      <form className={styles.form} action={action} noValidate>
        <div className={styles.field}>
          <label className={styles.label} htmlFor="image-file">
            이미지 파일 <span className={styles.required} aria-hidden="true">*</span>
          </label>
          <input
            className={styles.file}
            id="image-file"
            name="file"
            type="file"
            accept={ACCEPTED_TYPES}
            required
            onChange={onPick}
          />
        </div>
        <p className={styles.message} role="status">
          {message ?? ""}
        </p>
        <div className={styles.actions}>
          <ButtonLink href="/dictionary" variant="secondary">
            캐릭터 사전으로
          </ButtonLink>
          <Button type="submit" disabled={pending || tooBig}>
            {pending ? "올리는 중" : "업로드"}
          </Button>
        </div>
      </form>

      {state.url ? (
        <div className={styles.result} role="region" aria-label="올린 이미지">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={state.url} alt={state.fileName ? `올린 이미지: ${state.fileName}` : "올린 이미지"} className={styles.preview} />
          <CopyRow label="이미지 주소" text={state.url} />
          <CopyRow label="본문에 넣기 (설명을 고쳐 쓰세요)" text={`![설명](${state.url})`} />
          <CopyRow label="정보 상자 이미지로 쓰기 (문서 맨 위 메타 블록에)" text={`이미지: ${state.url}`} />
        </div>
      ) : null}
    </Card>
  );
}
