/*
 * 표의 칸 합치기(colspan, rowspan). 설계는 docs/wiki-syntax.md 2.8절 참고.
 *   칸의 내용이 `<` 뿐이면 왼쪽 칸과, `^` 뿐이면 위쪽 칸과 합쳐진다.
 * 이 파일은 아무것도 가져오지 않는다 (Node 테스트에서 그대로 읽는다).
 *
 * 합쳐진 칸들은 반드시 직사각형이어야 한다. 직사각형이 아니거나, 맨 윗줄이나 맨 왼쪽 칸에서 합치려 하거나,
 * 머리글 줄과 본문 줄에 걸치면(HTML 표는 줄 묶음을 넘어 합칠 수 없다) 그 합치기는 없던 일로 하고
 * 해당 칸은 `<`, `^` 글자 그대로 둔다.
 */

/** n: 보통 칸, L: `<` (왼쪽과 합침), U: `^` (위쪽과 합침) */
export type CellMark = "n" | "L" | "U";

export interface CellMerge {
  /** 앵커 칸(합쳐진 영역의 왼쪽 위)만 갖는다. 1보다 클 때만 있다. */
  colSpan?: number;
  rowSpan?: number;
  /** 다른 칸에 합쳐져서 그리지 않는 칸 */
  skip?: boolean;
}

/*
 * marks: 머리글 줄을 첫 줄로 한 칸 표시 (모든 줄의 길이가 같아야 한다).
 * 돌려주는 merges 는 marks 와 같은 모양이고, 합쳐진 것이 하나도 없으면 null 이다.
 * reverted: 직사각형이 안 되어 글자로 되돌린 칸의 [줄, 칸] 위치들.
 */
export function computeMerges(marks: CellMark[][]): { merges: CellMerge[][] | null; reverted: [number, number][] } {
  const current = marks.map((row) => [...row]);
  const reverted: [number, number][] = [];
  const rows = current.length;
  const cols = rows === 0 ? 0 : current[0].length;

  for (let pass = 0; pass <= rows * cols; pass += 1) {
    // 각 칸이 어느 앵커 칸에 속하는지
    const owner: [number, number][][] = current.map(() => []);
    let invalid: [number, number] | null = null;

    for (let r = 0; r < rows && !invalid; r += 1) {
      for (let c = 0; c < cols; c += 1) {
        const mark = current[r][c];
        if (mark === "n") {
          owner[r][c] = [r, c];
        } else if (mark === "L") {
          if (c === 0) {
            invalid = [r, c];
            break;
          }
          owner[r][c] = owner[r][c - 1];
        } else {
          // 맨 윗줄이거나, 머리글 줄(0번) 바로 아래 줄에서 머리글과 합치려는 경우는 안 된다
          if (r <= 1) {
            invalid = [r, c];
            break;
          }
          owner[r][c] = owner[r - 1][c];
        }
      }
    }

    if (!invalid) {
      // 앵커별로 차지한 영역이 빈틈없는 직사각형인지 본다
      const boxes = new Map<string, { r0: number; r1: number; c0: number; c1: number; count: number; anchor: [number, number] }>();
      for (let r = 0; r < rows; r += 1) {
        for (let c = 0; c < cols; c += 1) {
          const [ar, ac] = owner[r][c];
          const key = `${ar},${ac}`;
          const box = boxes.get(key) ?? { r0: r, r1: r, c0: c, c1: c, count: 0, anchor: [ar, ac] as [number, number] };
          box.r0 = Math.min(box.r0, r);
          box.r1 = Math.max(box.r1, r);
          box.c0 = Math.min(box.c0, c);
          box.c1 = Math.max(box.c1, c);
          box.count += 1;
          boxes.set(key, box);
        }
      }
      for (const box of boxes.values()) {
        const area = (box.r1 - box.r0 + 1) * (box.c1 - box.c0 + 1);
        // 앵커가 영역의 왼쪽 위가 아니거나, 머리글 줄을 넘거나, 빈틈이 있으면 못 쓴다
        const crossesHead = box.r0 === 0 && box.r1 > 0;
        if (box.count !== area || box.anchor[0] !== box.r0 || box.anchor[1] !== box.c0 || crossesHead) {
          // 이 영역에서 앵커가 아닌 칸 하나를 골라 글자로 되돌리고 다시 계산한다
          for (let r = box.r0; r <= box.r1 && !invalid; r += 1) {
            for (let c = box.c0; c <= box.c1; c += 1) {
              const [or, oc] = owner[r][c];
              if ((or !== r || oc !== c) && or === box.anchor[0] && oc === box.anchor[1]) {
                invalid = [r, c];
                break;
              }
            }
          }
          if (invalid) break;
        }
      }
    }

    if (!invalid) {
      const merges: CellMerge[][] = current.map((row) => row.map(() => ({})));
      let any = false;
      const sizes = new Map<string, { r1: number; c1: number }>();
      for (let r = 0; r < rows; r += 1) {
        for (let c = 0; c < cols; c += 1) {
          const [ar, ac] = owner[r][c];
          const size = sizes.get(`${ar},${ac}`) ?? { r1: ar, c1: ac };
          size.r1 = Math.max(size.r1, r);
          size.c1 = Math.max(size.c1, c);
          sizes.set(`${ar},${ac}`, size);
          if (ar !== r || ac !== c) {
            merges[r][c] = { skip: true };
            any = true;
          }
        }
      }
      for (const [key, size] of sizes) {
        const [ar, ac] = key.split(",").map(Number);
        if (size.c1 > ac) merges[ar][ac].colSpan = size.c1 - ac + 1;
        if (size.r1 > ar) merges[ar][ac].rowSpan = size.r1 - ar + 1;
      }
      return { merges: any ? merges : null, reverted };
    }

    const [r, c] = invalid;
    current[r][c] = "n";
    reverted.push([r, c]);
  }
  return { merges: null, reverted };
}
