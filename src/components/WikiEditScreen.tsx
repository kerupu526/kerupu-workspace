"use client";

import { useActionState, useDeferredValue, useMemo, useRef, useState } from "react";
import { parseWiki } from "@/lib/wiki/parse";
import { buildDocumentProps } from "@/lib/wiki/document";
import { saveDocument, type SaveState } from "@/app/dictionary/[slug]/actions";
import { Button, ButtonLink } from "./Button";
import Card from "./Card";
import WikiDocument from "./WikiDocument";
import WikiEditor, { type WikiEditorHandle } from "./WikiEditor";
import styles from "./WikiEditScreen.module.css";

interface WikiEditScreenProps {
  slug: string;
  /** 처음 편집기에 넣을 원문 (저장된 최신 판 또는 견본) */
  initialSource: string;
  /** 로그인했는지. 로그인하지 않았으면 저장 대신 로그인 안내를 보여 준다. */
  signedIn: boolean;
}

const NO_MESSAGE: SaveState = {};

/*
 * 위키 문서 편집 화면: 왼쪽 편집기, 오른쪽 실시간 미리보기, 아래 경고 목록.
 * 저장은 로그인한 사용자가 하며, 저장하면 새 판이 쌓이고 문서 화면으로 간다.
 * 입력한 글은 바로 편집기에 반영되고, 파싱과 미리보기는 입력이 잠잠할 때 따라온다 (useDeferredValue).
 */
export default function WikiEditScreen({ slug, initialSource, signedIn }: WikiEditScreenProps) {
  const [source, setSource] = useState(initialSource);
  const deferred = useDeferredValue(source);
  const parsed = useMemo(() => parseWiki(deferred), [deferred]);
  const documentProps = useMemo(() => buildDocumentProps(parsed, slug), [parsed, slug]);
  const editor = useRef<WikiEditorHandle>(null);
  const [saveState, saveAction, saving] = useActionState(saveDocument, NO_MESSAGE);

  const count = parsed.diagnostics.length;

  return (
    <div className={styles.screen}>
      <header className={styles.header}>
        <h1 className={styles.title}>문서 편집</h1>
        <div className={styles.actions}>
          <ButtonLink href={documentProps.href} variant="secondary" size="compact">
            문서로 돌아가기
          </ButtonLink>
          {signedIn ? (
            <form action={saveAction}>
              <input type="hidden" name="slug" value={slug} />
              {/* 편집기의 현재 글을 저장 시점에 함께 보낸다 */}
              <input type="hidden" name="markdown" value={source} />
              <Button type="submit" size="compact" disabled={saving}>
                {saving ? "저장하는 중" : "저장"}
              </Button>
            </form>
          ) : (
            <ButtonLink href="/login" size="compact">
              로그인하고 저장
            </ButtonLink>
          )}
        </div>
      </header>

      <p className={styles.notice} role="status">
        {saveState.message ??
          (signedIn
            ? "저장하면 새 판이 만들어지고 문서에 바로 반영돼요. 이전 판은 그대로 남아요."
            : "저장하려면 로그인해 주세요. 로그인하지 않은 상태에서 고친 글은 저장되지 않아요.")}
      </p>
      <p className={styles.notice}>
        문법이 헷갈리면 줄 맨 앞에서 <kbd>Ctrl</kbd> + <kbd>Space</kbd> 로 문법 목록을 열 수 있습니다.
      </p>

      <div className={styles.panes}>
        <section className={styles.pane} aria-labelledby="editor-title">
          <h2 className={styles.paneTitle} id="editor-title">
            원문
          </h2>
          <div className={styles.editorBox}>
            <WikiEditor
              ref={editor}
              initialValue={initialSource}
              onChange={setSource}
              diagnostics={parsed.diagnostics}
              diagnosticsSource={deferred}
              label="위키 문서 원문"
            />
          </div>
        </section>

        <section className={styles.pane} aria-labelledby="preview-title">
          <h2 className={styles.paneTitle} id="preview-title">
            미리보기
          </h2>
          <Card className={styles.preview}>
            <div className={styles.previewScroll}>
              <WikiDocument {...documentProps} preview />
            </div>
          </Card>
        </section>
      </div>

      <section className={styles.warnings} aria-labelledby="warnings-title">
        <h2 className={styles.paneTitle} id="warnings-title">
          경고 <span className={styles.count}>{count}건</span>
        </h2>
        {count === 0 ? (
          <p className={styles.empty}>문법 경고가 없습니다.</p>
        ) : (
          <ul className={styles.warningList}>
            {parsed.diagnostics.map((d, i) => (
              <li key={i} className={styles.warning}>
                {d.line === undefined ? (
                  <span className={styles.where}>줄 모름</span>
                ) : (
                  <button type="button" className={styles.jump} onClick={() => editor.current?.goToLine(d.line!)}>
                    {d.line}번째 줄
                  </button>
                )}
                <span>{d.message}</span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
