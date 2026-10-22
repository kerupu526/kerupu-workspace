import type { ReactNode } from "react";
import Link from "next/link";
import styles from "./ToggleChip.module.css";

interface ToggleChipProps {
  /** 지금 선택된 상태 (채운 알약) */
  pressed?: boolean;
  /** 있으면 버튼 대신 이 주소로 가는 링크가 된다 (고른 값이 주소에 담기는 필터용). 없으면 아직 눌러도 바뀌지 않는다. */
  href?: string;
  children: ReactNode;
}

/* 필터·정렬을 고르는 알약. 선택 여부는 aria-pressed(버튼) 또는 aria-current(링크)로도 알린다. */
export default function ToggleChip({ pressed = false, href, children }: ToggleChipProps) {
  const className = pressed ? `${styles.chip} ${styles.on}` : styles.chip;
  if (href !== undefined) {
    return (
      <Link href={href} className={className} aria-current={pressed ? "true" : undefined}>
        {children}
      </Link>
    );
  }
  return (
    <button type="button" className={className} aria-pressed={pressed}>
      {children}
    </button>
  );
}
