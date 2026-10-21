/*
 * 편집기에서 커서가 문서의 어디에 있는지 알아낸다 (자동완성이 무엇을 제안할지 정하는 데 쓴다).
 *
 * 이 파일은 아무것도 가져오지 않는다 (Node 테스트에서 그대로 읽는다).
 * 파서가 아니라 줄을 위에서부터 훑는 간단한 방식이라서, 아직 닫지 않은 블록이나 쓰는 중인 글에서도 동작한다.
 */

export type EditorContext =
  /** 코드 블록 안: 제안하지 않는다 */
  | { kind: "none" }
  /** :::style 의 선언 자리. 속성 이름을 쓰는 중 */
  | { kind: "style-property"; prefix: string }
  /** :::style 의 선언 자리. prop 의 값을 쓰는 중 */
  | { kind: "style-value"; property: string; prefix: string }
  /** 메타 블록(맨 위 ---) 안. 이름을 쓰는 중 */
  | { kind: "meta-key"; prefix: string }
  /** 메타 블록의 정보: 아래 들여쓴 줄. 이름을 쓰는 중 */
  | { kind: "meta-info-key"; prefix: string }
  /** 줄의 맨 앞 (아직 공백 없이 글자만 쓴 상태): 문법 조각 */
  | { kind: "line-start"; prefix: string }
  /** ](  바로 뒤: 링크 주소를 쓰는 중 */
  | { kind: "link-target"; prefix: string }
  /** ^ 를 방금 쓴 자리 */
  | { kind: "footnote-open" }
  | { kind: "text" };

const FENCE = /^ {0,3}(`{3,}|~{3,})/;
const DELIMITER = /^---[ \t]*$/;

export function detectContext(doc: string, pos: number): EditorContext {
  const lines = doc.split("\n");
  // pos 가 있는 줄과 줄 안의 위치
  let lineIndex = 0;
  let lineStart = 0;
  while (lineIndex < lines.length - 1 && lineStart + lines[lineIndex].length < pos) {
    lineStart += lines[lineIndex].length + 1;
    lineIndex += 1;
  }
  const column = Math.max(0, Math.min(pos - lineStart, lines[lineIndex].length));
  const line = lines[lineIndex];
  const before = line.slice(0, column);

  // 앞줄들을 훑어서 코드 블록, CSS 블록, 메타 블록 안인지 본다
  let fence: string | null = null;
  let style: "none" | "declarations" | "content" = "none";
  for (let i = 0; i < lineIndex; i += 1) {
    const text = lines[i];
    const fenceMatch = FENCE.exec(text);
    if (fence) {
      if (fenceMatch && fenceMatch[1][0] === fence[0] && fenceMatch[1].length >= fence.length) fence = null;
      continue;
    }
    if (fenceMatch) {
      fence = fenceMatch[1];
      continue;
    }
    if (style === "none" && /^:::style[ \t]*$/.test(text)) style = "declarations";
    else if (style === "declarations" && /^:::[ \t]*$/.test(text)) style = "content";
    else if (style === "content" && /^:::[ \t]*$/.test(text)) style = "none";
  }
  if (fence) return { kind: "none" };
  if (FENCE.test(line)) return { kind: "none" };

  if (style === "declarations" && !/^:::/.test(line)) {
    const colon = before.indexOf(":");
    if (colon < 0) return { kind: "style-property", prefix: before.trim() };
    return {
      kind: "style-value",
      property: before.slice(0, colon).trim().toLowerCase(),
      prefix: before.slice(colon + 1).trim(),
    };
  }

  // 메타 블록: 첫 글자 있는 줄이 --- 이고, 닫는 --- 가 커서 앞에 아직 없다
  let first = 0;
  while (first < lines.length && lines[first].trim() === "") first += 1;
  if (first < lineIndex && DELIMITER.test(lines[first])) {
    let closed = false;
    let inInfo = false;
    for (let i = first + 1; i < lineIndex; i += 1) {
      if (DELIMITER.test(lines[i])) {
        closed = true;
        break;
      }
      if (!/^\s/.test(lines[i]) && lines[i].trim() !== "") inInfo = /^정보\s*:/.test(lines[i]);
    }
    if (!closed && !DELIMITER.test(line)) {
      if (/^\s/.test(line) || (inInfo && line === "")) {
        if (inInfo && !before.includes(":")) return { kind: "meta-info-key", prefix: before.trim() };
        return { kind: "text" };
      }
      if (!before.includes(":")) return { kind: "meta-key", prefix: before.trim() };
      return { kind: "text" };
    }
  }

  const link = /\]\(([^)\s]*)$/.exec(before);
  if (link) return { kind: "link-target", prefix: link[1] };
  if (before.endsWith("^")) return { kind: "footnote-open" };
  if (before.length > 0 && !/\s/.test(before)) return { kind: "line-start", prefix: before };
  if (before.length === 0) return { kind: "line-start", prefix: "" };
  return { kind: "text" };
}
