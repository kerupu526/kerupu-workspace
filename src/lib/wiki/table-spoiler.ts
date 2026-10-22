/*
 * 표 줄 안의 스포일러 ||글|| 을 이스케이프 없이 쓸 수 있게 한다. 이 파일은 아무것도 가져오지 않는다 (Node 테스트에서 그대로 읽는다).
 *
 * 표에서는 | 가 칸 나누기라서 ||글|| 을 그대로 두면 칸이 쪼개진다. 그래서 파싱 전에 | 로 시작하는 줄(표 줄)에서만
 * ||글|| 짝을 \|\|글\|\| 로 바꿔 준다 (마크다운이 \| 를 | 글자로 풀어 주므로 그 뒤로는 일반 스포일러 규칙으로 묶인다).
 * 직접 \|\|글\|\| 로 써도 그대로 된다.
 *   - 코드 조각(`...`)과 코드 블록 안은 건드리지 않는다.
 *   - 속이 비었거나 공백뿐이거나 | 가 들어 있는 것은 짝으로 보지 않는다 (| a | | b | 같은 빈 칸은 그대로).
 *   - 빈 칸 둘을 붙여 쓴 `| a || b || c |` 는 b 가 스포일러로 읽힌다. 빈 칸은 `| a | | b |` 처럼 띄어 쓴다.
 * 줄 수는 바꾸지 않는다 (줄 번호가 어긋나지 않는다).
 */
const FENCE = /^ {0,3}(`{3,}|~{3,})/;
const PAIR = /(?<![\\|])\|\|(?!\s*\|\|)([^|\n]+?)(?<!\\)\|\|/g;

export function escapeTableSpoilers(markdown: string): string {
  let fence: string | null = null;
  return markdown
    .split("\n")
    .map((line) => {
      const fenceMatch = FENCE.exec(line);
      if (fence) {
        if (fenceMatch && fenceMatch[1][0] === fence[0] && fenceMatch[1].length >= fence.length) fence = null;
        return line;
      }
      if (fenceMatch) {
        fence = fenceMatch[1];
        return line;
      }
      if (!/^ {0,3}\|/.test(line) || !line.includes("||")) return line;
      return line
        .split(/(`[^`]*`)/)
        .map((part, i) => (i % 2 === 1 ? part : part.replace(PAIR, "\\|\\|$1\\|\\|")))
        .join("");
    })
    .join("\n");
}
