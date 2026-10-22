import { snippetCompletion, type Completion, type CompletionContext, type CompletionResult } from "@codemirror/autocomplete";
import { ALLOWED_PROPERTY_NAMES, cssValueSuggestions } from "../css.ts";
import { detectContext } from "./context.ts";

/*
 * 위키 편집기의 자동완성. 어떤 제안을 할지는 context.ts 가 알아낸 커서 자리로 정한다.
 *   줄 맨 앞        문법 조각 (제목, 목차, CSS 블록, 접기, 표, 이미지, 인용문, 목록, 수평줄, 주석, 메타 블록)
 *   :::style 선언   css.ts 의 허용 속성 이름, 그 속성에 쓸 수 있는 값 (허용되지 않은 속성은 제안하지 않는다)
 *   메타 블록       분류, 정보, 이미지 / 정보 아래의 이름
 *   ^ 뒤            각주 ^[ ]
 *   ]( 뒤           링크 주소 시작
 * 제안의 label 은 "쓰는 기호" 그대로라서 한글 문장을 쓸 때는 뜨지 않는다 (설명은 detail 에 둔다).
 */

const LINE_START: Completion[] = [
  snippetCompletion("## ${문단 제목}", { label: "##", detail: "큰 문단 제목", type: "keyword" }),
  snippetCompletion("### ${문단 제목}", { label: "###", detail: "하위 문단 제목", type: "keyword" }),
  snippetCompletion("#### ${문단 제목}", { label: "####", detail: "더 작은 문단 제목", type: "keyword" }),
  { label: "[toc]", detail: "목차 (한 번만)", type: "keyword", apply: "[toc]" },
  snippetCompletion(":::style\ntext-align: ${center};\n:::\n${내용}\n:::", {
    label: ":::style",
    detail: "CSS 블록",
    type: "keyword",
  }),
  snippetCompletion("+++ ${접기 제목}\n${숨길 내용}\n+++", {
    label: "+++",
    detail: "접기 (누르면 펼쳐짐, 스포일러용)",
    type: "keyword",
  }),
  snippetCompletion("## + ${접힌 문단 제목}", { label: "## +", detail: "처음부터 접힌 문단", type: "keyword" }),
  snippetCompletion("| ${항목} | ${내용} |\n|:---|:---|\n| ${} | ${} |", { label: "|", detail: "표 (칸 합치기는 < 와 ^)", type: "keyword" }),
  snippetCompletion("![${설명}](/uploads/${파일.png})", { label: "![", detail: "이미지", type: "keyword" }),
  snippetCompletion("> ${인용할 내용}", { label: ">", detail: "인용문", type: "keyword" }),
  snippetCompletion("- ${항목}", { label: "-", detail: "목록", type: "keyword" }),
  snippetCompletion("1. ${항목}", { label: "1.", detail: "번호 목록", type: "keyword" }),
  { label: "---", displayLabel: "--- (수평줄)", detail: "앞뒤에 빈 줄", type: "keyword", apply: "---" },
  snippetCompletion("%% ${메모}", { label: "%%", detail: "편집용 메모 (읽기 화면에는 안 보임)", type: "keyword" }),
];

const META_BLOCK = snippetCompletion(
  "---\n분류: ${분류, 분류}\n정보:\n  제목: ${이름}\n  작품: ${작품명}\n이미지: /uploads/${파일.png}\n---\n",
  { label: "---", displayLabel: "--- (메타 블록)", detail: "문서 맨 위에만", type: "keyword", boost: 1 },
);

const META_KEYS: Completion[] = [
  { label: "분류", detail: "쉼표로 나눔", apply: "분류: ", type: "property" },
  { label: "정보", detail: "정보 상자", apply: "정보:\n  ", type: "property" },
  { label: "이미지", detail: "/uploads/ 파일", apply: "이미지: /uploads/", type: "property" },
];

const INFO_KEYS: Completion[] = [
  ...["제목", "작품", "분류", "첫 등장", "출처"].map((name): Completion => ({
    label: name,
    apply: `${name}: `,
    type: "property",
  })),
  snippetCompletion("| ${항목} | < |\n  |:---|:---|\n  | ${이름} | ${값} |", {
    label: "|",
    detail: "정보 표 (칸 합치기는 < 와 ^)",
    type: "keyword",
  }),
];

const LINK_TARGETS: Completion[] = [
  { label: "/dictionary/", detail: "사이트 안의 문서", type: "text" },
  { label: "#", detail: "같은 문서의 문단", type: "text" },
  { label: "https://", detail: "외부 사이트", type: "text" },
];

const PROPERTY_OPTIONS: Completion[] = ALLOWED_PROPERTY_NAMES.map((name) => ({
  label: name,
  apply: `${name}: `,
  type: "property",
}));

export function wikiCompletions(context: CompletionContext): CompletionResult | null {
  const doc = context.state.doc.toString();
  const ctx = detectContext(doc, context.pos);

  switch (ctx.kind) {
    case "line-start": {
      const from = context.pos - ctx.prefix.length;
      // 메타 블록은 문서 맨 위에서만 제안한다
      const atTop = doc.slice(0, from).trim() === "";
      return {
        from,
        options: atTop ? [META_BLOCK, ...LINE_START] : LINE_START,
        validFor: /^[^\s]*$/,
      };
    }

    case "style-property": {
      const word = context.matchBefore(/[a-z-]*$/i);
      if (!word && !context.explicit) return null;
      return { from: word ? word.from : context.pos, options: PROPERTY_OPTIONS, validFor: /^[a-z-]*$/i };
    }

    case "style-value": {
      const values = cssValueSuggestions(ctx.property);
      if (values.length === 0) return null;
      const word = context.matchBefore(/[\w#().-]*$/);
      return {
        from: word ? word.from : context.pos,
        options: values.map((value) => ({
          label: value,
          apply: `${value};`,
          type: value.startsWith("var(") ? "variable" : "constant",
        })),
        validFor: /^[\w#().-]*$/,
      };
    }

    case "meta-key":
    case "meta-info-key": {
      const word = context.matchBefore(/[^\s:]*$/);
      return {
        from: word ? word.from : context.pos,
        options: ctx.kind === "meta-key" ? META_KEYS : INFO_KEYS,
        validFor: /^[^\s:]*$/,
      };
    }

    case "footnote-open":
      return {
        from: context.pos - 1,
        options: [snippetCompletion("^[${각주 내용}]", { label: "^", displayLabel: "^[ ] 각주", detail: "각주", type: "keyword" })],
        validFor: /^\^$/,
      };

    case "link-target":
      return { from: context.pos - ctx.prefix.length, options: LINK_TARGETS, validFor: /^[^)\s]*$/ };

    default:
      return null;
  }
}
