import Link from "next/link";
import type { ComponentPropsWithoutRef } from "react";
import styles from "./Button.module.css";

/** dashed: 점선 테두리. 운영자 전용이거나 아직 준비 중인 기능에 쓴다. */
type Variant = "primary" | "secondary" | "dashed";
/** compact: 입력창(field-height)과 같은 높이. 검색창 옆처럼 나란히 놓을 때 쓴다. */
type Size = "default" | "large" | "compact";

interface StyleProps {
  variant?: Variant;
  size?: Size;
}

function buttonClass({ variant = "primary", size = "default" }: StyleProps, extra?: string) {
  return [styles.button, styles[variant], size === "default" ? "" : styles[size], extra ?? ""]
    .filter(Boolean)
    .join(" ");
}

type ButtonProps = ComponentPropsWithoutRef<"button"> & StyleProps;

/* 실제 동작(제출 등)이 있는 버튼 */
export function Button({ variant, size, className, type = "button", ...rest }: ButtonProps) {
  return <button type={type} className={buttonClass({ variant, size }, className)} {...rest} />;
}

type ButtonLinkProps = ComponentPropsWithoutRef<typeof Link> & StyleProps;

/* 모양만 버튼인 링크. 다른 페이지로 이동할 때 쓴다. */
export function ButtonLink({ variant, size, className, ...rest }: ButtonLinkProps) {
  return <Link className={buttonClass({ variant, size }, className)} {...rest} />;
}
