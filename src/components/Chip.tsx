import type { ReactNode } from "react";
import styles from "./Chip.module.css";

type ChipVariant = "dashed" | "solid" | "plain";

interface ChipProps {
  /** dashed: 점선 테두리(운영자 전용 표시), solid: 채움(강조), plain: 흰 바탕 */
  variant?: ChipVariant;
  children: ReactNode;
}

/* 짧은 이름표. 뜻은 글자가 말하고, 모양(채움·점선)은 보조로만 쓴다. */
export default function Chip({ variant = "plain", children }: ChipProps) {
  return <span className={`${styles.chip} ${styles[variant]}`}>{children}</span>;
}
