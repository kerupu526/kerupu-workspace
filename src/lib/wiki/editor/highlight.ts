import { RangeSetBuilder } from "@codemirror/state";
import { Decoration, ViewPlugin, type DecorationSet, type EditorView, type ViewUpdate } from "@codemirror/view";

/*
 * 위키 문법을 편집기에서 색과 굵기로 구분해 보여 준다 (줄 단위 표시 + 줄 안의 몇 가지 표시).
 * 파서가 아니라 줄을 위에서부터 훑는 간단한 방식이라서 쓰는 중인 글에서도 깨지지 않는다.
 * 실제로 어떻게 읽히는지는 오른쪽 미리보기와 경고가 알려 준다.
 * 색은 EditorView.theme (WikiEditor.tsx)에서 디자인 토큰으로 정한다.
 */

const line = (name: string) => Decoration.line({ class: `cm-wiki-${name}` });
const mark = (name: string) => Decoration.mark({ class: `cm-wiki-${name}` });

const FENCE = /^ {0,3}(`{3,}|~{3,})/;

function build(view: EditorView): DecorationSet {
  const builder = new RangeSetBuilder<Decoration>();
  const doc = view.state.doc;

  let fence: string | null = null;
  let style: "none" | "declarations" | "content" = "none";
  let meta: "unknown" | "open" | "closed" = "unknown";

  for (let n = 1; n <= doc.lines; n += 1) {
    const { from, text } = doc.line(n);
    const fenceMatch = FENCE.exec(text);
    const classes: string[] = [];
    let inlineMarks = true;

    // 글자가 있는 첫 줄이 --- 이면 메타 블록의 시작이고, 아니면 이 문서에는 메타 블록이 없다
    let metaStart = false;
    if (!fence && !fenceMatch && meta === "unknown" && text.trim() !== "") {
      metaStart = /^---[ \t]*$/.test(text);
      meta = metaStart ? "open" : "closed";
    }

    if (metaStart) {
      classes.push("fence");
      inlineMarks = false;
    } else if (fence) {
      classes.push("code");
      inlineMarks = false;
      if (fenceMatch && fenceMatch[1][0] === fence[0] && fenceMatch[1].length >= fence.length) fence = null;
    } else if (fenceMatch) {
      fence = fenceMatch[1];
      classes.push("code");
      inlineMarks = false;
    } else if (meta === "open") {
      if (/^---[ \t]*$/.test(text)) {
        meta = "closed";
        classes.push("fence");
      } else classes.push(/^\s/.test(text) ? "meta-value" : "meta-key");
      inlineMarks = false;
    } else if (/^%%/.test(text)) {
      classes.push("comment");
      inlineMarks = false;
    } else if (/^:::style[ \t]*$/.test(text) && style === "none") {
      style = "declarations";
      classes.push("fence");
    } else if (/^:::[ \t]*$/.test(text) && style !== "none") {
      style = style === "declarations" ? "content" : "none";
      classes.push("fence");
    } else if (/^\+{3,}/.test(text) && style !== "declarations") {
      // 접기 블록의 여는 줄(+++ 제목)과 닫는 줄(+++)
      classes.push("fence");
      inlineMarks = false;
    } else if (style === "declarations") {
      classes.push("declaration");
      inlineMarks = false;
    } else if (/^#{1,6}\s/.test(text)) {
      classes.push("heading");
    } else if (/^\[toc\]\s*$/i.test(text)) {
      classes.push("toc");
    } else if (/^\s*>/.test(text)) {
      classes.push("quote");
    } else if (/^---[ \t]*$/.test(text)) {
      classes.push("rule");
    } else if (/^\|/.test(text)) {
      classes.push("table");
    }

    if (classes.length > 0) builder.add(from, from, line(classes.join(" cm-wiki-")));

    if (inlineMarks) {
      const found: { start: number; end: number; name: string }[] = [];
      for (const m of text.matchAll(/%%.*?%%/g)) found.push({ start: m.index, end: m.index + m[0].length, name: "comment" });
      for (const m of text.matchAll(/\^\[/g)) found.push({ start: m.index, end: m.index + 2, name: "footnote" });
      for (const m of text.matchAll(/`[^`]*`/g)) found.push({ start: m.index, end: m.index + m[0].length, name: "inline-code" });
      found.sort((a, b) => a.start - b.start || a.end - b.end);
      let last = -1;
      for (const f of found) {
        if (f.start < last) continue; // 겹치면 앞의 것만
        builder.add(from + f.start, from + f.end, mark(f.name));
        last = f.end;
      }
    }
  }
  return builder.finish();
}

export const wikiHighlight = ViewPlugin.fromClass(
  class {
    decorations: DecorationSet;
    constructor(view: EditorView) {
      this.decorations = build(view);
    }
    update(update: ViewUpdate) {
      if (update.docChanged) this.decorations = build(update.view);
    }
  },
  { decorations: (plugin) => plugin.decorations },
);
