import { test } from "node:test";
import assert from "node:assert/strict";
import { MAX_DECLARATIONS, sanitizeStyle, toReactStyle } from "./css.ts";

/* 선언 하나를 넣어 통과한 값을 돌려준다 (버려지면 undefined) */
function accept(prop: string, value: string): string | undefined {
  return sanitizeStyle(`${prop}: ${value};`).style[prop];
}
function rejects(prop: string, value: string) {
  const result = sanitizeStyle(`${prop}: ${value};`);
  assert.equal(result.style[prop], undefined, `${prop}: ${value} 가 통과했다`);
  assert.equal(result.dropped.length, 1);
}

test("허용 속성은 통과한다", () => {
  assert.equal(accept("color", "#647260"), "#647260");
  assert.equal(accept("text-align", "center"), "center");
  assert.equal(accept("margin-top", "16px"), "16px");
  assert.equal(accept("font-size", "1.2em"), "1.2em");
  assert.equal(accept("gap", "12px"), "12px");
  assert.equal(accept("color", "rgb(100, 114, 96)"), "rgb(100, 114, 96)");
  assert.equal(accept("background", "hsl(120 30% 40%)"), "hsl(120 30% 40%)");
  assert.equal(accept("padding", "var(--space-8)"), "var(--space-8)");
  assert.equal(accept("border-top-left-radius", "8px"), "8px");
  assert.equal(accept("aspect-ratio", "16 / 9"), "16 / 9");
  assert.equal(accept("aspect-ratio", "16/9"), "16/9");
  assert.equal(accept("flex-grow", "2"), "2");
  assert.equal(accept("font-weight", "700"), "700");
});

test("속성 이름은 대소문자를 구분하지 않는다", () => {
  assert.equal(sanitizeStyle("COLOR: red;").style.color, "red");
  assert.equal(sanitizeStyle("Text-Align: center;").style["text-align"], "center");
});

test("목록에 없는 속성은 버린다", () => {
  for (const prop of ["position", "z-index", "top", "left", "content", "background-image", "border-image", "border-image-source", "list-style-image", "outline", "filter", "transform", "animation", "behavior", "-moz-binding"]) {
    rejects(prop, "none");
  }
});

test("url(, expression(, image-set(, element(, @import 는 어디에 있어도 버린다", () => {
  rejects("background", "url(https://example.com/a.png)");
  rejects("background", "URL(/uploads/a.png)");
  rejects("background", "url (/a.png)");
  rejects("color", "expression(alert(1))");
  rejects("background", "image-set(/a.png 1x)");
  rejects("background", "element(#x)");
  rejects("color", "red @import");
  rejects("cursor", "url(/a.cur), pointer");
});

test("허용하지 않은 함수는 모두 버린다 (그라데이션, attr, env, calc ...)", () => {
  rejects("background", "linear-gradient(red, blue)");
  rejects("background", "radial-gradient(red, blue)");
  rejects("background", "conic-gradient(red, blue)");
  rejects("background", "repeating-linear-gradient(red, blue)");
  rejects("width", "attr(data-w)");
  rejects("width", "env(safe-area-inset-top)");
  rejects("width", "calc(100% - 10px)");
  rejects("width", "min(10px, 20px)");
  rejects("color", "color-mix(in srgb, red, blue)");
  rejects("color", "(red)");
});

test("값에 끼어들 수 있는 문자는 막는다", () => {
  rejects("color", "red } body { color: blue");
  rejects("color", "red { }");
  rejects("color", "red\\");
  rejects("color", "re\\64");
  rejects("color", "red /* x */");
  rejects("color", "red !important");
  rejects("color", "red ! important");
  rejects("color", "red <script>");
  rejects("color", "\"red\"");
  rejects("width", "10px:20px");
});

test("선언은 ; 로 나눈다 (값에 ; 를 넣어 다른 선언을 끼울 수 없다)", () => {
  const result = sanitizeStyle("color: red; position: fixed; top: 0;");
  assert.deepEqual(result.style, { color: "red" });
  assert.deepEqual(result.dropped, ["position: fixed", "top: 0"]);
  // 통과한 값은 어떤 것도 ; 를 담지 않는다
  for (const value of Object.values(result.style)) assert.ok(!value.includes(";"));
});

test("줄 끝의 ; 를 빼먹어 합쳐진 선언은 버린다", () => {
  const result = sanitizeStyle("color: red\ntext-align: center;");
  assert.deepEqual(result.style, {});
  assert.equal(result.dropped.length, 1);
});

test("콜론이 없는 줄과 빈 선언", () => {
  const result = sanitizeStyle("; ; red; color: blue;;");
  assert.deepEqual(result.style, { color: "blue" });
  assert.deepEqual(result.dropped, ["red"]);
});

test("같은 속성이 두 번 나오면 뒤의 것을 쓴다", () => {
  assert.equal(sanitizeStyle("color: red; color: blue;").style.color, "blue");
  // 뒤의 것이 잘못됐으면 앞의 것이 남는다
  const result = sanitizeStyle("color: red; color: url(x);");
  assert.equal(result.style.color, "red");
  assert.equal(result.dropped.length, 1);
});

test("선언은 20개까지만 받는다", () => {
  const twenty = Array.from({ length: MAX_DECLARATIONS }, (_, i) => `margin-top: ${i + 1}px;`);
  const overflow = sanitizeStyle([...twenty, "color: red;"].join("\n"));
  assert.equal(overflow.style.color, undefined);
  assert.deepEqual(overflow.dropped, ["color: red"]);
  assert.equal(sanitizeStyle(twenty.join("\n")).dropped.length, 0);
});

test("단위는 px, em, rem, %, vh, vw 만 쓴다", () => {
  for (const unit of ["px", "em", "rem", "%", "vh", "vw"]) assert.equal(accept("margin-left", `1${unit}`), `1${unit}`);
  rejects("margin-left", "1pt");
  rejects("margin-left", "1cm");
  rejects("margin-left", "1vmin");
  rejects("margin-left", "1ch");
  rejects("margin-left", "1deg");
});

test("단위마다 상한이 있다", () => {
  assert.equal(accept("width", "2000px"), "2000px");
  rejects("width", "2001px");
  assert.equal(accept("width", "100vw"), "100vw");
  rejects("width", "101vw");
  rejects("height", "101vh");
  assert.equal(accept("font-size", "100rem"), "100rem");
  rejects("font-size", "101em");
  rejects("flex-grow", "1001");
});

test("fr 은 grid 속성에서만 쓴다", () => {
  assert.equal(accept("grid-template-columns", "1fr 2fr"), "1fr 2fr");
  rejects("grid-template-columns", "repeat(2, 1fr)");
  rejects("width", "1fr");
});

test("음수는 margin 같은 곳에서 막고, 글자 간격 등에서만 허용한다", () => {
  rejects("margin-top", "-10px");
  rejects("margin", "0 -1em");
  rejects("padding-left", "-1px");
  rejects("width", "-5%");
  assert.equal(accept("margin-top", "-0px"), "-0px");
  assert.equal(accept("letter-spacing", "-0.05em"), "-0.05em");
  assert.equal(accept("text-indent", "-1em"), "-1em");
  assert.equal(accept("box-shadow", "-2px 2px 4px rgb(0, 0, 0)"), "-2px 2px 4px rgb(0, 0, 0)");
});

test("var() 는 디자인 토큰만 쓴다", () => {
  assert.equal(accept("color", "var(--state-error)"), "var(--state-error)");
  assert.equal(accept("margin-top", "var(--space-24)"), "var(--space-24)");
  rejects("margin-top", "var(--unknown)");
  rejects("margin-top", "var(--px)");
  rejects("margin-top", "var(--space-8, 100px)");
  rejects("color", "var(--space-8");
  rejects("color", "rgb(var(--space-8))");
});

test("rgb, hsl 안에는 숫자만 쓴다", () => {
  assert.equal(accept("color", "rgba(0 0 0 / 50%)"), "rgba(0 0 0 / 50%)");
  rejects("color", "rgb(0, 0, red)");
  rejects("color", "rgb(0, 0, 0, -1)");
  rejects("color", "hsl(999, 10%, 10%)");
  rejects("color", "rgb()");
});

test("#색은 3, 4, 6, 8자리만", () => {
  for (const color of ["#abc", "#abcd", "#aabbcc", "#aabbccdd"]) assert.equal(accept("color", color), color);
  rejects("color", "#ab");
  rejects("color", "#abcde");
  rejects("color", "#gggggg");
});

test("text-align 은 left, right, center 만", () => {
  for (const v of ["left", "right", "center"]) assert.equal(accept("text-align", v), v);
  rejects("text-align", "justify");
  rejects("text-align", "start");
});

test("display, flex-wrap, overflow 는 정해진 값만", () => {
  assert.equal(accept("display", "flex"), "flex");
  assert.equal(accept("display", "none"), "none");
  rejects("display", "grid");
  rejects("display", "contents");
  assert.equal(accept("flex-wrap", "wrap-reverse"), "wrap-reverse");
  rejects("flex-wrap", "wrap reverse");
  assert.equal(accept("overflow", "hidden auto"), "hidden auto");
  assert.equal(accept("overflow-x", "scroll"), "scroll");
  rejects("overflow", "clip");
  rejects("overflow", "hidden auto scroll");
});

test("align-items, justify-content", () => {
  assert.equal(accept("align-items", "first baseline"), "first baseline");
  assert.equal(accept("justify-content", "space-evenly"), "space-evenly");
  rejects("align-items", "safe center");
  rejects("justify-content", "space-between center");
});

test("cursor 는 정해진 값만", () => {
  for (const v of ["pointer", "help", "grab", "zoom-in", "not-allowed"]) assert.equal(accept("cursor", v), v);
  rejects("cursor", "crosshair");
  rejects("cursor", "url(/a.cur)");
});

test("line-height 는 1.2 ~ 2.2 사이의 숫자만", () => {
  assert.equal(accept("line-height", "1.8"), "1.8");
  assert.equal(accept("line-height", "1.2"), "1.2");
  assert.equal(accept("line-height", "2.2"), "2.2");
  rejects("line-height", "1.1");
  rejects("line-height", "2.3");
  rejects("line-height", "24px");
  rejects("line-height", "150%");
  rejects("line-height", "normal");
});

test("font-family 는 8개 이하의 글꼴 이름만", () => {
  assert.equal(accept("font-family", "Georgia, serif"), "Georgia, serif");
  assert.equal(accept("font-family", '"Noto Sans KR", sans-serif'), '"Noto Sans KR", sans-serif');
  assert.equal(accept("font-family", "var(--font-display), serif"), "var(--font-display), serif");
  assert.equal(accept("font-family", "a, b, c, d, e, f, g, h"), "a, b, c, d, e, f, g, h");
  rejects("font-family", "a, b, c, d, e, f, g, h, i");
  rejects("font-family", "a,, b");
  rejects("font-family", "url(/a.woff)");
  rejects("font-family", '"a" b');
  rejects("font-family", "serif <x>");
  // 따옴표는 font-family 말고는 쓸 수 없다
  rejects("color", '"red"');
});

test("font-feature-settings, font-language-override 는 따옴표 태그만", () => {
  assert.equal(accept("font-feature-settings", '"liga" 1, "kern" off'), '"liga" 1, "kern" off');
  rejects("font-feature-settings", '"ligature"');
  assert.equal(accept("font-language-override", '"KOR"'), '"KOR"');
  assert.equal(accept("font-language-override", "normal"), "normal");
  rejects("font-language-override", '"KORKOR"');
});

test("슬래시는 정해진 속성에서만 쓴다", () => {
  assert.equal(accept("grid-column", "1 / 3"), "1 / 3");
  assert.equal(accept("border-radius", "10px / 20px"), "10px / 20px");
  rejects("margin", "1px / 2px");
  rejects("color", "red / blue");
});

test("값이 비었거나 너무 길면 버린다", () => {
  rejects("color", "");
  rejects("color", "   ");
  rejects("font-family", "a".repeat(201));
});

test("테두리 속성은 방향별로 허용하되 border-image 는 막는다", () => {
  assert.equal(accept("border", "3px solid #647260"), "3px solid #647260");
  assert.equal(accept("border-bottom-width", "3px"), "3px");
  assert.equal(accept("border-left-color", "red"), "red");
  rejects("border-image", "url(/a.png) 30");
  rejects("border-image-slice", "30");
  rejects("border-top-image", "none");
});

test("background-image 는 막지만 background 의 색은 쓸 수 있다", () => {
  rejects("background-image", "none");
  assert.equal(accept("background", "#f4f6ef"), "#f4f6ef");
  assert.equal(accept("background-color", "rgb(244 246 239)"), "rgb(244 246 239)");
  assert.equal(accept("background-size", "50% auto"), "50% auto");
});

test("toReactStyle 은 이름을 camelCase 로 바꾼다", () => {
  assert.deepEqual(toReactStyle({ "text-align": "center", color: "red", "border-top-left-radius": "4px" }), {
    textAlign: "center",
    color: "red",
    borderTopLeftRadius: "4px",
  });
});
