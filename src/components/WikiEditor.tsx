"use client";

import { useEffect, useImperativeHandle, useRef, type Ref } from "react";
import { EditorState } from "@codemirror/state";
import { EditorView, drawSelection, highlightActiveLine, keymap, lineNumbers } from "@codemirror/view";
import { defaultKeymap, history, historyKeymap } from "@codemirror/commands";
import { autocompletion, closeBrackets, closeBracketsKeymap, completionKeymap } from "@codemirror/autocomplete";
import { linter, lintGutter, lintKeymap, setDiagnostics } from "@codemirror/lint";
import { wikiCompletions } from "@/lib/wiki/editor/completions";
import { wikiHighlight } from "@/lib/wiki/editor/highlight";
import type { Diagnostic } from "@/lib/wiki/parse";

export interface WikiEditorHandle {
  /** 그 줄(1부터)로 커서를 옮기고 편집기에 포커스를 준다 */
  goToLine(line: number): void;
}

interface WikiEditorProps {
  /** 처음 보여 줄 원문. 그 뒤로는 편집기 안의 글이 기준이고, 이 값이 바뀌어도 반영하지 않는다. */
  initialValue: string;
  onChange(value: string): void;
  /** 편집기에 밑줄로 보여 줄 경고. diagnosticsSource 로 계산한 것이어야 한다. */
  diagnostics: Diagnostic[];
  /** diagnostics 를 계산한 원문. 편집기의 글과 다르면(아직 입력 중이면) 표시를 미룬다. */
  diagnosticsSource: string;
  /** 보조기기에 읽히는 이름 */
  label: string;
  ref?: Ref<WikiEditorHandle>;
}

/*
 * 위키 문서를 쓰는 편집기 (CodeMirror 6).
 *   - 자동완성: 줄 맨 앞 문법, CSS 블록의 허용 속성과 값, 메타 블록 이름, 각주, 링크 (lib/wiki/editor/completions.ts)
 *   - 문법 표시: 제목, 주석, CSS 블록 등을 색으로 구분 (highlight.ts)
 *   - 경고: 파서가 돌려준 diagnostics 를 해당 줄에 밑줄로 보여 준다. 파싱은 화면 쪽에서 하고 여기서는 받아서 그리기만 한다.
 * Tab 키는 편집기 안에서 들여쓰기에 쓰지 않는다. 키보드로 편집기를 벗어날 수 있어야 하기 때문이다 (갇힘 방지).
 * 색과 글자는 디자인 토큰을 따르고, 포커스 링은 사이트 공통 규칙(3px, 간격 4px)과 같다.
 */
export default function WikiEditor({ initialValue, onChange, diagnostics, diagnosticsSource, label, ref }: WikiEditorProps) {
  const hostRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<EditorView | null>(null);
  const onChangeRef = useRef(onChange);

  useEffect(() => {
    onChangeRef.current = onChange;
  });

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;

    const view = new EditorView({
      parent: host,
      state: EditorState.create({
        doc: initialValue,
        extensions: [
          lineNumbers(),
          history(),
          drawSelection(),
          highlightActiveLine(),
          closeBrackets(),
          EditorView.lineWrapping,
          autocompletion({ override: [wikiCompletions], icons: false }),
          linter(null), // 경고는 setDiagnostics 로 직접 넣는다
          lintGutter(),
          wikiHighlight,
          keymap.of([...closeBracketsKeymap, ...defaultKeymap, ...historyKeymap, ...completionKeymap, ...lintKeymap]),
          EditorView.contentAttributes.of({ "aria-label": label, lang: "ko", spellcheck: "false" }),
          EditorView.updateListener.of((update) => {
            if (update.docChanged) onChangeRef.current(update.state.doc.toString());
          }),
          editorTheme,
        ],
      }),
    });
    viewRef.current = view;
    return () => {
      view.destroy();
      viewRef.current = null;
    };
    // 편집기는 한 번만 만든다 (초기 원문과 이름은 처음 값만 쓴다)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const view = viewRef.current;
    if (!view || view.state.doc.toString() !== diagnosticsSource) return;
    const doc = view.state.doc;
    view.dispatch(
      setDiagnostics(
        view.state,
        diagnostics.map((d) => {
          const target = doc.line(Math.min(Math.max(d.line ?? 1, 1), doc.lines));
          return { from: target.from, to: target.to, severity: "warning" as const, message: d.message, source: "위키 문법" };
        }),
      ),
    );
  }, [diagnostics, diagnosticsSource]);

  useImperativeHandle(ref, () => ({
    goToLine(line: number) {
      const view = viewRef.current;
      if (!view) return;
      const target = view.state.doc.line(Math.min(Math.max(line, 1), view.state.doc.lines));
      view.dispatch({ selection: { anchor: target.from }, scrollIntoView: true });
      view.focus();
    },
  }));

  return <div ref={hostRef} style={{ height: "100%" }} />;
}

/* 디자인 토큰으로 정한 편집기 모양. 편집기 DOM 은 CSS Module 밖이라서 EditorView.theme 으로 정한다. */
const editorTheme = EditorView.theme({
  "&": {
    height: "100%",
    color: "var(--main-logo)",
    backgroundColor: "var(--surface-page)",
    fontSize: "var(--text-body-size)",
  },
  "&.cm-focused": { outline: "3px solid var(--main-logo)", outlineOffset: "4px" },
  ".cm-scroller": { overflow: "auto", fontFamily: "inherit", lineHeight: "1.8" },
  ".cm-content": { padding: "var(--space-12) 0", caretColor: "var(--main-logo)" },
  ".cm-line": { padding: "0 var(--space-16)" },
  ".cm-gutters": {
    backgroundColor: "var(--card-surface)",
    color: "var(--main-logo)",
    borderRight: "var(--border-width) solid var(--card-border)",
  },
  ".cm-activeLine": { backgroundColor: "color-mix(in srgb, var(--card-border) 25%, transparent)" },
  ".cm-activeLineGutter": { backgroundColor: "var(--main-header)", fontWeight: "var(--font-weight-bold)" },
  ".cm-selectionBackground, &.cm-focused > .cm-scroller > .cm-selectionLayer .cm-selectionBackground": {
    backgroundColor: "var(--main-header)",
  },
  // 문법 표시 (highlight.ts). 색만으로 구분하지 않도록 굵기와 모양도 함께 쓴다.
  ".cm-wiki-heading": { fontWeight: "var(--font-weight-bold)", borderBottom: "var(--border-width) solid var(--card-border)" },
  ".cm-wiki-comment": { opacity: "0.6", fontStyle: "italic" },
  ".cm-wiki-fence": { fontWeight: "var(--font-weight-bold)", backgroundColor: "var(--card-surface)" },
  ".cm-wiki-declaration": { backgroundColor: "var(--card-surface)", fontFamily: "monospace" },
  ".cm-wiki-meta-key": { fontWeight: "var(--font-weight-bold)", backgroundColor: "var(--card-surface)" },
  ".cm-wiki-meta-value": { backgroundColor: "var(--card-surface)" },
  ".cm-wiki-code": { fontFamily: "monospace", opacity: "0.8" },
  ".cm-wiki-toc": { fontWeight: "var(--font-weight-bold)", textDecoration: "underline" },
  ".cm-wiki-quote": { borderLeft: "calc(3 * var(--px)) solid var(--card-border)" },
  ".cm-wiki-rule": { fontWeight: "var(--font-weight-bold)" },
  ".cm-wiki-table": { fontFamily: "monospace" },
  ".cm-wiki-footnote": { fontWeight: "var(--font-weight-bold)", textDecoration: "underline" },
  ".cm-wiki-spoiler": { fontWeight: "var(--font-weight-bold)", backgroundColor: "var(--card-surface)", borderRadius: "4px" },
  ".cm-wiki-inline-code": { fontFamily: "monospace", backgroundColor: "var(--card-surface)" },
  // 자동완성 창
  ".cm-tooltip": {
    backgroundColor: "var(--surface-page)",
    color: "var(--main-logo)",
    border: "var(--border-width) solid var(--card-border)",
    borderRadius: "var(--radius-field)",
  },
  ".cm-tooltip-autocomplete ul li[aria-selected]": { backgroundColor: "var(--main-header)", color: "var(--main-logo)" },
  ".cm-completionDetail": { fontStyle: "normal", marginLeft: "var(--space-8)", opacity: "0.8" },
  // 경고 표시: 색만이 아니라 물결 모양 밑줄로도 구분한다
  ".cm-lintRange-warning": { backgroundImage: "none", textDecoration: "underline wavy var(--state-error)", textUnderlineOffset: "3px" },
});
