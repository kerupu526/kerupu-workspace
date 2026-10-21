/*
 * 위키 CSS 블록의 허용 목록 필터. 설계는 docs/wiki-syntax.md 3장 참고.
 *
 * 이 파일은 아무것도 가져오지 않는다 (Node 테스트에서 그대로 읽는다).
 *
 * 원칙
 *   - 속성 이름과 값을 나눠서 하나씩 검사한다. 허용 목록에 없으면 그 선언만 버린다.
 *   - 값은 "허용한 조각"으로만 이루어져야 한다: 단어, 숫자(+허용 단위), #색, rgb/hsl 함수, var(토큰).
 *     3.3절의 금지 목록(url( 등)에 더해, 허용한 함수 말고는 모든 함수를 막는다
 *     (linear-gradient(, attr(, env( 같은 것이 background 같은 속성으로 들어오지 못하게).
 *   - `;` `{` `}` `\` `:` 따옴표 `!` 는 값에 들어올 수 없다. 서버 렌더링 때 style 속성 문자열이
 *     깨져서 다른 선언이 끼어드는 일을 막는다.
 *
 * 설계 문서가 정하지 않아서 여기서 정한 것
 *   - 단위 상한: px 2000, em/rem 100, % 500, vh/vw 100, fr 100, 단위 없는 숫자 1000.
 *   - fr 는 grid-* 속성에서만 쓴다.
 *   - 음수는 letter-spacing, word-spacing, text-indent, text-shadow, box-shadow, vertical-align 에서만
 *     허용한다. margin 처럼 내용을 헤더 쪽으로 끌어올릴 수 있는 곳에서는 막는다 (3.4절).
 *   - 슬래시(/)는 aspect-ratio, grid-column, grid-row, font, border-radius, background 에서만 쓴다.
 *   - 따옴표는 font-family, font-feature-settings, font-language-override 에서만 쓴다.
 *   - line-height 는 1.2~2.2 사이의 숫자만 쓴다 (단위 없음).
 *   - var() 는 아래 VAR_TOKENS 의 이름 하나만 쓴다 (대체값 없음). --px, --design-width 는 제외했다.
 */

export const MAX_DECLARATIONS = 20;
const MAX_VALUE_LENGTH = 200;
const MAX_FONT_FAMILIES = 8;

/* src/styles/tokens.css 에 있는 토큰 중 문서가 써도 되는 것 (색, 간격, 모서리, 글자) */
const VAR_TOKENS = new Set([
  "surface-page",
  "main-header",
  "main-logo",
  "card-surface",
  "card-border",
  "ui-border",
  "state-error",
  "state-success",
  "main-shadow",
  "card-shadow",
  "space-8",
  "space-12",
  "space-16",
  "space-24",
  "space-32",
  "space-48",
  "radius-card",
  "radius-pill",
  "radius-field",
  "border-width",
  "text-title-size",
  "text-heading-size",
  "text-body-size",
  "text-label-size",
  "text-caption-size",
  "font-weight-regular",
  "font-weight-bold",
  "font-display",
]);

const COLOR_FUNCTIONS = new Set(["rgb", "rgba", "hsl", "hsla"]);

/* ---- 허용 속성 (3.2절) ---- */

const sides = ["top", "right", "bottom", "left"] as const;
const corners = ["top-left", "top-right", "bottom-right", "bottom-left"] as const;

const ALLOWED_PROPERTIES = new Set<string>([
  // 정렬·배치
  "align-items",
  "justify-content",
  "display",
  "flex-direction",
  "flex-grow",
  "flex-shrink",
  "flex-wrap",
  "float",
  "clear",
  "gap",
  "aspect-ratio",
  "box-sizing",
  "grid-template-columns",
  "grid-template-rows",
  "grid-column",
  "grid-row",
  "break-after",
  "break-before",
  "break-inside",
  // 크기·여백
  "width",
  "height",
  "min-width",
  "min-height",
  "max-width",
  "max-height",
  "margin",
  ...sides.map((s) => `margin-${s}`),
  "padding",
  ...sides.map((s) => `padding-${s}`),
  "overflow",
  "overflow-x",
  "overflow-y",
  // 글자
  "color",
  "font",
  "font-family",
  "font-size",
  "font-size-adjust",
  "font-stretch",
  "font-style",
  "font-synthesis",
  "font-weight",
  "font-kerning",
  "font-feature-settings",
  "font-language-override",
  "font-variant",
  "font-variant-alternates",
  "font-variant-caps",
  "font-variant-east-asian",
  "font-variant-ligatures",
  "font-variant-numeric",
  "font-variant-position",
  "line-height",
  "letter-spacing",
  "word-spacing",
  "text-indent",
  "text-align",
  "text-align-last",
  "text-combine-upright",
  "text-decoration",
  "text-decoration-color",
  "text-decoration-line",
  "text-decoration-skip",
  "text-decoration-style",
  "text-emphasis",
  "text-emphasis-color",
  "text-emphasis-position",
  "text-emphasis-style",
  "text-overflow",
  "text-shadow",
  "text-transform",
  "text-underline-position",
  "text-wrap",
  "text-orientation",
  "writing-mode",
  "vertical-align",
  "white-space",
  "word-break",
  "word-wrap",
  // 색·꾸밈 (background-image, border-image 계열, list-style-image 는 제외)
  "background",
  "background-attachment",
  "background-clip",
  "background-color",
  "background-origin",
  "background-position",
  "background-repeat",
  "background-size",
  "border",
  "border-color",
  "border-style",
  "border-width",
  "border-radius",
  "border-collapse",
  "border-spacing",
  ...sides.flatMap((s) => [`border-${s}`, `border-${s}-color`, `border-${s}-style`, `border-${s}-width`]),
  ...corners.map((c) => `border-${c}-radius`),
  "box-decoration-break",
  "box-shadow",
  "list-style",
  "list-style-position",
  "list-style-type",
  "cursor",
]);

/* ---- 값이 정해진 속성 ---- */

const ALIGN_ITEMS = new Set([
  "normal", "stretch", "center", "start", "end", "flex-start", "flex-end",
  "self-start", "self-end", "baseline", "first baseline", "last baseline",
]);
const JUSTIFY_CONTENT = new Set([
  "center", "start", "end", "flex-start", "left", "right", "normal",
  "space-between", "space-around", "space-evenly", "stretch",
]);
const DISPLAY = new Set([
  "block", "flex", "inline", "inline-block", "inline-flex", "inline-table", "list-item", "none",
  "table", "table-caption", "table-cell", "table-row", "table-column", "table-column-group",
  "table-footer-group", "table-header-group", "table-row-group",
]);
const FLEX_WRAP = new Set(["nowrap", "wrap", "wrap-reverse"]);
const OVERFLOW = new Set(["visible", "hidden", "scroll", "auto", "overlay"]);
const TEXT_ALIGN = new Set(["left", "right", "center"]);
const CURSOR = new Set([
  "auto", "default", "pointer", "help", "progress", "wait", "text", "move",
  "not-allowed", "grab", "zoom-in", "zoom-out",
]);

/* 값 전체가 이 중 하나여야 하는 속성 */
const WHOLE_VALUE: Record<string, Set<string>> = {
  "align-items": ALIGN_ITEMS,
  "justify-content": JUSTIFY_CONTENT,
  display: DISPLAY,
  "flex-wrap": FLEX_WRAP,
  "text-align": TEXT_ALIGN,
  cursor: CURSOR,
};
/* 값이 하나나 둘이고, 각각이 이 중 하나여야 하는 속성 */
const EACH_VALUE: Record<string, Set<string>> = {
  overflow: OVERFLOW,
  "overflow-x": OVERFLOW,
  "overflow-y": OVERFLOW,
};

const NEGATIVE_OK = new Set([
  "letter-spacing",
  "word-spacing",
  "text-indent",
  "text-shadow",
  "box-shadow",
  "vertical-align",
]);
const SLASH_OK = new Set([
  "aspect-ratio",
  "grid-column",
  "grid-row",
  "font",
  "border-radius",
  "background",
]);

const UNIT_CAPS: Record<string, number> = {
  "": 1000,
  px: 2000,
  em: 100,
  rem: 100,
  "%": 500,
  vh: 100,
  vw: 100,
  fr: 100,
};

/* ---- 값 검사 ---- */

/* 이 문자열이 들어 있으면 그 선언은 버린다 (3.3절) */
const BANNED_TEXT = ["url(", "expression(", "image-set(", "element(", "@import", "/*", "!important"];

/* 따옴표를 쓰는 속성의 항목 하나 */
const FAMILY_ITEM = /^(?:[a-z0-9가-힣_-]+(?: [a-z0-9가-힣_-]+)*|"[a-z0-9가-힣 _-]+"|'[a-z0-9가-힣 _-]+')$/i;
const FEATURE_ITEM = /^"[a-z0-9]{4}"(?: (?:\d{1,3}|on|off))?$/i;
const LANGUAGE_ITEM = /^(?:normal|"[a-z0-9 ]{1,4}")$/i;
const VAR_EXACT = /^var\(\s*--([a-z0-9-]+)\s*\)$/i;

const NUMBER = /^(-?)(\d+(?:\.\d+)?|\.\d+)(px|em|rem|%|vh|vw|fr)?$/;
const HEX_COLOR = /^#(?:[0-9a-f]{3,4}|[0-9a-f]{6}|[0-9a-f]{8})$/;
const IDENT = /^-?[a-z][a-z0-9-]*$/;

/* var(--토큰) 하나인지 */
function isAllowedVar(text: string): boolean {
  const m = VAR_EXACT.exec(text.trim());
  return m !== null && VAR_TOKENS.has(m[1].toLowerCase());
}

/* rgb(), hsl() 안: 숫자, %, 쉼표, 공백, / 만 */
function isColorArgs(args: string): boolean {
  if (!/^[\d.%\s,/]+$/.test(args)) return false;
  const numbers = args.match(/\d+(?:\.\d+)?|\.\d+/g);
  return numbers !== null && numbers.every((n) => parseFloat(n) <= 360);
}

/* 따옴표를 쓰는 글꼴 속성 */
function validateQuotedList(prop: string, value: string): string | null {
  const items = value.split(",").map((s) => s.trim());
  if (items.some((s) => s === "")) return null;
  if (prop === "font-family") {
    if (items.length > MAX_FONT_FAMILIES) return null;
    return items.every((s) => FAMILY_ITEM.test(s) || isAllowedVar(s)) ? items.join(", ") : null;
  }
  if (prop === "font-feature-settings") {
    return items.every((s) => FEATURE_ITEM.test(s) || s.toLowerCase() === "normal") ? items.join(", ") : null;
  }
  return items.length === 1 && LANGUAGE_ITEM.test(items[0]) ? items[0] : null;
}

function validateToken(prop: string, token: string): boolean {
  if (token === "$v" || token === "$c") return true;
  if (token === "/") return SLASH_OK.has(prop);
  if (HEX_COLOR.test(token)) return true;
  const num = NUMBER.exec(token);
  if (num) {
    const n = parseFloat(num[2]);
    const unit = num[3] ?? "";
    if (num[1] === "-" && n !== 0 && !NEGATIVE_OK.has(prop)) return false;
    if (unit === "fr" && !prop.startsWith("grid-")) return false;
    return n <= UNIT_CAPS[unit];
  }
  return IDENT.test(token);
}

/* 통과하면 정리한 값을, 아니면 null 을 돌려준다 */
function validateValue(prop: string, raw: string): string | null {
  const value = raw.replace(/\s+/g, " ").trim();
  if (value === "" || value.length > MAX_VALUE_LENGTH) return null;
  const lower = value.toLowerCase();
  if (BANNED_TEXT.some((banned) => lower.includes(banned))) return null;

  // 따옴표를 쓰는 글꼴 속성은 항목별로 따로 본다
  if (prop === "font-family" || prop === "font-feature-settings" || prop === "font-language-override") {
    if (/[;{}\\:!<>@$`]/.test(value)) return null;
    return validateQuotedList(prop, value);
  }

  // 나머지 속성은 따옴표를 쓸 수 없다. $ 는 아래의 자리표시용이라 막는다.
  if (/["'`;{}\\:!<>@$]/.test(value)) return null;

  // 허용한 함수(var, rgb, hsl)만 자리표시로 바꾸고, 그 밖의 괄호는 모두 거부한다
  let ok = true;
  const flat = lower.replace(/([a-z][a-z0-9-]*)?\(([^()]*)\)/g, (_m, name: string | undefined, args: string) => {
    if (name === "var" && isAllowedVar(`var(${args})`)) return " $v ";
    if (name && COLOR_FUNCTIONS.has(name) && isColorArgs(args)) return " $c ";
    ok = false;
    return " ";
  });
  if (!ok || /[()]/.test(flat)) return null;

  const tokens = flat.replace(/\//g, " / ").split(/[\s,]+/).filter(Boolean);
  if (tokens.length === 0) return null;

  if (prop === "line-height") {
    const n = tokens.length === 1 && /^\d+(?:\.\d+)?$/.test(tokens[0]) ? parseFloat(tokens[0]) : NaN;
    return n >= 1.2 && n <= 2.2 ? value : null;
  }

  const whole = WHOLE_VALUE[prop];
  if (whole) return whole.has(tokens.join(" ")) ? tokens.join(" ") : null;
  const each = EACH_VALUE[prop];
  if (each) return tokens.length <= 2 && tokens.every((t) => each.has(t)) ? tokens.join(" ") : null;

  return tokens.every((t) => validateToken(prop, t)) ? value : null;
}

/* ---- 공개 ---- */

export interface SanitizedStyle {
  /** 통과한 선언 (속성 이름은 소문자 kebab-case) */
  style: Record<string, string>;
  /** 버린 선언 (편집 화면 경고용 글자) */
  dropped: string[];
}

function describe(text: string): string {
  return text.length > 80 ? `${text.slice(0, 80)}…` : text;
}

/* `속성: 값;` 이 이어진 글을 검사한다. 허용 목록에 없는 선언은 버린다. */
export function sanitizeStyle(source: string): SanitizedStyle {
  const accepted = new Map<string, string>();
  const dropped: string[] = [];
  let count = 0;

  for (const chunk of source.split(";")) {
    const text = chunk.replace(/\s+/g, " ").trim();
    if (text === "") continue;
    count += 1;
    if (count > MAX_DECLARATIONS) {
      dropped.push(describe(text));
      continue;
    }
    const colon = text.indexOf(":");
    if (colon <= 0) {
      dropped.push(describe(text));
      continue;
    }
    const prop = text.slice(0, colon).trim().toLowerCase();
    const cleaned = ALLOWED_PROPERTIES.has(prop) ? validateValue(prop, text.slice(colon + 1)) : null;
    if (cleaned === null) {
      dropped.push(describe(text));
      continue;
    }
    // 같은 속성이 또 나오면 뒤의 것을 쓴다
    accepted.delete(prop);
    accepted.set(prop, cleaned);
  }

  return { style: Object.fromEntries(accepted), dropped };
}

/* React 의 style 속성은 camelCase 이름을 쓴다 (text-align -> textAlign) */
export function toReactStyle(style: Record<string, string>): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [prop, value] of Object.entries(style)) {
    out[prop.replace(/-([a-z])/g, (_m, c: string) => c.toUpperCase())] = value;
  }
  return out;
}
