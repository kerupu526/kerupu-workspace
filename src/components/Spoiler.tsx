"use client";

import { useState, type KeyboardEvent, type ReactNode } from "react";
import styles from "./Spoiler.module.css";

/*
 * 글 속의 스포일러 ||글||. 가려져 있다가 누르면 보이고, 다시 누르면 가려진다.
 *   마우스, 터치: 누른다.   키보드: Tab 으로 닿아서 Enter 나 Space.
 * 가려진 동안에는 글자를 보조기기에도 숨기고("스포일러, 눌러서 보기"라고만 읽는다), 속의 링크와 각주 번호도
 * 눌리거나 Tab 으로 닿지 않게 막는다(inert). 보이면 모두 되돌린다.
 * 안에 링크 같은 눌리는 것이 들어갈 수 있어서 <button> 이 아니라 role="button" 인 <span> 이다.
 */
export default function Spoiler({ children }: { children: ReactNode }) {
  const [shown, setShown] = useState(false);

  function onKeyDown(event: KeyboardEvent<HTMLSpanElement>) {
    // 속의 링크에서 누른 키는 링크가 처리한다
    if (event.target !== event.currentTarget) return;
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      setShown((value) => !value);
    }
  }

  return (
    <span
      role="button"
      tabIndex={0}
      aria-expanded={shown}
      aria-label={shown ? undefined : "스포일러, 눌러서 보기"}
      className={shown ? `${styles.spoiler} ${styles.shown}` : styles.spoiler}
      onClick={() => setShown((value) => !value)}
      onKeyDown={onKeyDown}
    >
      <span className={styles.content} aria-hidden={shown ? undefined : true} inert={!shown}>
        {children}
      </span>
    </span>
  );
}
