"use client";

import { useEffect, useId, useLayoutEffect, useRef, useState, type FocusEvent } from "react";
import styles from "./FootnoteRef.module.css";

interface FootnoteRefProps {
  /** 각주 번호 (1부터) */
  n: number;
  /** 각주 내용 (문서 맨 아래 "각주" 목록과 같은 글) */
  text: string;
}

/*
 * 본문 속 각주 번호 [n]. 누르거나 올려 두면 각주 내용이 작은 창(팝오버)으로 뜬다.
 *   마우스: 올리면 열리고, 벗어나면 잠시 뒤 닫힌다. 창 안으로 옮겨도 유지된다.
 *   키보드: Tab 으로 닿으면 열리고, Enter 로도 열며, Esc 로 닫는다. 창 안의 "각주로 이동" 링크에도 Tab 으로 갈 수 있다.
 *   터치: 한 번 누르면 열리고, 바깥을 누르면 닫힌다.
 * 번호 자체는 버튼이라서 누른다고 페이지가 이동하지 않는다. 목록으로 가려면 창 안의 링크를 쓴다.
 * 문서 맨 아래 각주 목록은 그대로 있어서, 창을 못 쓰는 환경에서도 내용을 읽을 수 있다.
 */
export default function FootnoteRef({ n, text }: FootnoteRefProps) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLSpanElement>(null);
  const popRef = useRef<HTMLSpanElement>(null);
  const closeTimer = useRef<number | undefined>(undefined);
  // Esc 로 닫고 번호로 포커스를 되돌릴 때는, 그 포커스 때문에 다시 열리지 않게 한다
  const skipFocusOpen = useRef(false);
  const popId = useId();

  function show() {
    window.clearTimeout(closeTimer.current);
    setOpen(true);
  }

  function hideSoon() {
    window.clearTimeout(closeTimer.current);
    closeTimer.current = window.setTimeout(() => setOpen(false), 150);
  }

  // 키보드로 닿았을 때만 자동으로 연다 (마우스로 눌러서 생긴 포커스는 onClick 이 처리한다)
  function onFocus(event: FocusEvent<HTMLButtonElement>) {
    if (skipFocusOpen.current) {
      skipFocusOpen.current = false;
      return;
    }
    if (event.currentTarget.matches(":focus-visible")) show();
  }

  // 포커스가 번호와 창 둘 다에서 벗어나면 닫는다
  function onBlur(event: FocusEvent<HTMLSpanElement>) {
    if (!event.currentTarget.contains(event.relatedTarget)) hideSoon();
  }

  // 열려 있는 동안: Esc 로 닫기(번호로 포커스 되돌리기), 바깥을 누르면 닫기
  useEffect(() => {
    if (!open) return;
    function onKey(event: KeyboardEvent) {
      if (event.key !== "Escape") return;
      setOpen(false);
      const button = wrapRef.current?.querySelector("button");
      if (button && document.activeElement !== button) skipFocusOpen.current = true;
      button?.focus();
    }
    function onPointerDown(event: PointerEvent) {
      if (!wrapRef.current?.contains(event.target as Node)) setOpen(false);
    }
    document.addEventListener("keydown", onKey);
    document.addEventListener("pointerdown", onPointerDown);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("pointerdown", onPointerDown);
    };
  }, [open]);

  // 창이 화면 밖으로 나가지 않게 좌우로 밀어 넣는다
  useLayoutEffect(() => {
    const pop = popRef.current;
    if (!open || !pop) return;
    pop.style.setProperty("--shift", "0px");
    const rect = pop.getBoundingClientRect();
    const margin = 8;
    let shift = 0;
    if (rect.right > window.innerWidth - margin) shift = window.innerWidth - margin - rect.right;
    if (rect.left + shift < margin) shift = margin - rect.left;
    pop.style.setProperty("--shift", `${shift}px`);
  }, [open]);

  useEffect(() => () => window.clearTimeout(closeTimer.current), []);

  return (
    <sup className={styles.sup}>
      <span ref={wrapRef} className={styles.wrap} onMouseLeave={hideSoon} onBlur={onBlur}>
        <button
          type="button"
          id={`fnref-${n}`}
          className={styles.ref}
          aria-label={`각주 ${n}`}
          aria-expanded={open}
          aria-controls={open ? popId : undefined}
          onMouseEnter={show}
          onFocus={onFocus}
          onClick={show}
        >
          [{n}]
        </button>
        {open ? (
          <span ref={popRef} id={popId} role="group" aria-label={`각주 ${n} 내용`} className={styles.pop} onMouseEnter={show}>
            <span className={styles.label}>각주 {n}</span>
            <span className={styles.text}>{text}</span>
            <a className={styles.jump} href={`#fn-${n}`}>
              각주 {n}번으로 이동
            </a>
          </span>
        ) : null}
      </span>
    </sup>
  );
}
