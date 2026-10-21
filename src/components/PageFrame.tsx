import type { ComponentPropsWithoutRef } from "react";
import styles from "./PageFrame.module.css";

/*
 * 본문 폭과 좌우 여백을 정하는 틀.
 * 1920px 기준이며 그보다 좁은 화면은 아직 정의되지 않았다.
 */
export default function PageFrame({ className, ...rest }: ComponentPropsWithoutRef<"div">) {
  return <div className={className ? `${styles.frame} ${className}` : styles.frame} {...rest} />;
}
