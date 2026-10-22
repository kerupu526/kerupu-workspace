"use client";

import { useActionState, useEffect, useRef, useState, type ChangeEvent, type DragEvent } from "react";
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

const ACCEPTED = ACCEPTED_TYPES.split(",");
const ACCEPTED_EXT = /\.(?:png|jpe?g|webp|gif|svg)$/i;

function sizeLabel(bytes: number): string {
  return bytes >= 1024 * 1024 ? `${(bytes / 1024 / 1024).toFixed(1)}MB` : `${Math.max(1, Math.round(bytes / 1024))}KB`;
}

/* 고른 파일을 올리기 전에 알아볼 수 있는 문제 (형식과 크기). 내용 검사는 서버가 한다. */
function problemWith(file: File): string | null {
  if (file.size > MAX_IMAGE_BYTES) return `파일이 너무 커요. ${MAX_MB}MB 이하만 올릴 수 있어요.`;
  if (!ACCEPTED.includes(file.type) && !ACCEPTED_EXT.test(file.name)) {
    return `이 파일은 올릴 수 없어요. ${ACCEPTED_LABEL} 이미지만 올릴 수 있어요.`;
  }
  return null;
}

/*
 * 이미지 업로드 폼. 파일을 끌어다 놓거나 눌러서 고르면 미리보기와 이름이 보이고, "업로드"를 누르면 올라간다.
 * 올리면 그 파일의 주소와, 문서에 바로 붙여 넣을 글(본문 이미지, 정보 상자 이미지)을 보여 준다.
 *   - 진짜 파일 입력(input type=file)은 화면에서만 숨기고(보조기기와 키보드는 그대로 쓴다) 점선이 아닌 우리 모양의 칸이 그 라벨이다.
 *   - 고른 파일은 State 에 들고 있다가 제출할 때 폼에 얹는다. 폼은 제출이 끝나면 입력을 비우는데, 실패했을 때 파일을 다시 골라야 하지 않게 하려는 것이다.
 *   - 서버가 한도(8MB)를 넘는 요청을 받기 전에 걸러지지 않도록, 큰 파일은 여기서 먼저 알려 준다.
 */
export default function ImageUploadForm() {
  const [state, action, pending] = useActionState(uploadImage, NO_MESSAGE);
  const inputRef = useRef<HTMLInputElement>(null);
  // 마지막으로 올리기에 성공한 결과. 이후 실패해도(state 가 바뀌어도) 지난 결과 주소는 계속 보여 준다.
  const [done, setDone] = useState<{ url: string; fileName?: string } | null>(null);
  if (state.url && state.url !== done?.url) setDone({ url: state.url, fileName: state.fileName });

  // baseline: 고른 때의 마지막 성공 주소. 그 뒤로 업로드에 성공했으면 이미 올린 파일이라 비운 것으로 본다. 실패하면 그대로 남아 다시 올릴 수 있다.
  const [pickedRaw, setPicked] = useState<{ file: File; preview: string; baseline: string | undefined } | null>(null);
  const picked = pickedRaw && pickedRaw.baseline === done?.url ? pickedRaw : null;
  const [problem, setProblem] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);

  // 미리보기 주소는 바뀌거나 화면을 떠날 때 해제한다
  const previewUrl = pickedRaw?.preview;
  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  function choose(file: File | undefined, extraCount = 0) {
    if (!file) return;
    const found = problemWith(file);
    if (found) {
      setPicked(null);
      setProblem(found);
      if (inputRef.current) inputRef.current.value = "";
      return;
    }
    setProblem(extraCount > 0 ? "한 번에 한 장씩 올릴 수 있어서 첫 번째 파일만 골랐어요." : null);
    setPicked({ file, preview: URL.createObjectURL(file), baseline: done?.url });
  }

  function onPick(event: ChangeEvent<HTMLInputElement>) {
    choose(event.target.files?.[0]);
  }

  function onDrop(event: DragEvent<HTMLLabelElement>) {
    event.preventDefault();
    setDragging(false);
    const files = event.dataTransfer.files;
    if (files.length === 0) return;
    // 눌러서 고른 것과 같은 입력에 담아 둔다 (키보드와 보조기기가 보는 값도 같게)
    if (inputRef.current) {
      const transfer = new DataTransfer();
      transfer.items.add(files[0]);
      inputRef.current.files = transfer.files;
    }
    choose(files[0], files.length - 1);
  }

  function submit(formData: FormData) {
    if (picked) formData.set("file", picked.file);
    action(formData);
  }

  const message = problem ?? state.message;

  return (
    <Card as="section" className={styles.card} aria-labelledby="image-upload-title">
      <h2 className={styles.title} id="image-upload-title">
        새 이미지 업로드
      </h2>
      <p className={styles.hint}>
        {ACCEPTED_LABEL} 이미지를 {MAX_MB}MB까지 올릴 수 있어요. 올리면 문서에 쓸 주소를 알려 드려요.
      </p>

      <form className={styles.form} action={submit} noValidate>
        <div className={styles.field}>
          <span className={styles.label} id="image-file-label">
            이미지 파일 <span className={styles.required} aria-hidden="true">*</span>
          </span>
          <label
            className={dragging ? `${styles.dropzone} ${styles.dragging}` : styles.dropzone}
            htmlFor="image-file"
            onDragOver={(event) => {
              event.preventDefault();
              setDragging(true);
            }}
            onDragEnter={(event) => {
              event.preventDefault();
              setDragging(true);
            }}
            onDragLeave={(event) => {
              // 칸 안의 글자 위로 옮길 때 깜빡이지 않도록, 칸을 완전히 벗어날 때만 끈다
              if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setDragging(false);
            }}
            onDrop={onDrop}
          >
            <input
              ref={inputRef}
              className="visually-hidden"
              id="image-file"
              name="file"
              type="file"
              accept={ACCEPTED_TYPES}
              aria-labelledby="image-file-label"
              onChange={onPick}
            />
            {picked ? (
              <span className={styles.picked}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={picked.preview} alt="" className={styles.thumb} />
                <span className={styles.pickedText}>
                  <span className={styles.fileName}>{picked.file.name}</span>
                  <span className={styles.fileMeta}>{sizeLabel(picked.file.size)} · 다른 파일을 끌어다 놓거나 눌러서 바꿀 수 있어요</span>
                </span>
              </span>
            ) : (
              <span className={styles.empty}>
                <span className={styles.dropTitle}>{dragging ? "여기에 놓으세요" : "이미지를 여기로 끌어다 놓으세요"}</span>
                <span className={styles.dropSub}>또는</span>
                <span className={styles.pickButton}>파일 선택</span>
              </span>
            )}
          </label>
        </div>
        <p className={styles.message} role="status">
          {message ?? ""}
        </p>
        <div className={styles.actions}>
          <ButtonLink href="/dictionary" variant="secondary">
            캐릭터 사전으로
          </ButtonLink>
          <ButtonLink href="/images" variant="secondary">
            내 이미지
          </ButtonLink>
          <Button type="submit" disabled={pending || !picked}>
            {pending ? "올리는 중" : "업로드"}
          </Button>
        </div>
      </form>

      {done ? (
        <div className={styles.result} role="region" aria-label="올린 이미지">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={done.url} alt={done.fileName ? `올린 이미지: ${done.fileName}` : "올린 이미지"} className={styles.preview} />
          <CopyRow label="이미지 주소" text={done.url} />
          <CopyRow label="본문에 넣기 (설명을 고쳐 쓰세요)" text={`![설명](${done.url})`} />
          <CopyRow label="정보 상자 이미지로 쓰기 (문서 맨 위 메타 블록에)" text={`이미지: ${done.url}`} />
        </div>
      ) : null}
    </Card>
  );
}
