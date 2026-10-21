"use client";

import { useDeferredValue, useMemo, useRef, useState } from "react";
import { parseWiki } from "@/lib/wiki/parse";
import { buildDocumentProps } from "@/lib/wiki/document";
import { Button, ButtonLink } from "./Button";
import Card from "./Card";
import WikiDocument from "./WikiDocument";
import WikiEditor, { type WikiEditorHandle } from "./WikiEditor";
import styles from "./WikiEditScreen.module.css";

interface WikiEditScreenProps {
  slug: string;
  /** 처음 편집기에 넣을 원문 */
  initialSource: string;
}

/*
 * 위키 문서 편집 화면: 왼쪽 편집기, 오른쪽 실시간 미리보기, 아래 경고 목록.
 * 입력한 글은 바로 편집기에 반영되고, 파싱과 미리보기는 입력이 잠잠할 때 따라온다 (useDeferredValue).
 * 저장 기능(문서 저장소)이 아직 없어서 "저장"은 점선 모양의 비활성 버튼이고, 새로고침하면 편집한 글이 사라진다.
 */
export default function WikiEditScreen({ slug, initialSource }: WikiEditScreenProps) {
  const [source, setSource] = useState(initialSource);
  const deferred = useDeferredValue(source);
  const parsed = useMemo(() => parseWiki(deferred), [deferred]);
  const documentProps = useMemo(() => buildDocumentProps(parsed, slug), [parsed, slug]);
  const editor = useRef<WikiEditorHandle>(null);

  const count = parsed.diagnostics.length;

  return (
    <div className={styles.screen}>
      <header className={styles.header}>
        <h1 className={styles.title}>문서 편집</h1>
        <div className={styles.actions}>
          <ButtonLink href={documentProps.href} variant="secondary" size="compact">
            문서로 돌아가기
          </ButtonLink>
          <Button variant="dashed" size="compact" disabled>
            저장<span className="visually-hidden"> (준비 중)</span>
          </Button>
        </div>
      </header>
      <p className={styles.notice}>
        저장 기능이 아직 없어서 이 화면에서 고친 글은 새로고침하거나 나가면 사라집니다. 문법이 헷갈리면 줄 맨 앞에서{" "}
        <kbd>Ctrl</kbd> + <kbd>Space</kbd> 로 문법 목록을 열 수 있습니다.
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
