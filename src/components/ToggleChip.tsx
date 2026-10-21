import type { ReactNode } from "react";
import styles from "./ToggleChip.module.css";

interface ToggleChipProps {
  /** 지금 선택된 상태 (채운 알약). 아직 눌러도 바뀌지 않는다 (기능은 이후 단계). */
  pressed?: boolean;
  children: ReactNode;
}

/* 필터·정렬을 고르는 알약 버튼. 선택 여부는 aria-pressed 로도 알린다. */
export default function ToggleChip({ pressed = false, children }: ToggleChipProps) {
  return (
    <button type="button" className={pressed ? `${styles.chip} ${styles.on}` : styles.chip} aria-pressed={pressed}>
      {children}
    </button>
  );
}
