import type { ElementType, HTMLAttributes } from "react";
import styles from "./Card.module.css";

type CardProps = HTMLAttributes<HTMLElement> & {
  as?: "div" | "section" | "article" | "li";
};

/*
 * 카드 컨테이너. 기본 크기는 450x700.
 * 크기를 바꾸려면 사용하는 쪽 CSS Module 에서 --card-w, --card-h 를 지정한다.
 * 테두리(card-border)와 그림자는 장식이므로 글자는 항상 main-logo 로 둔다.
 */
export default function Card({ as = "div", className, ...rest }: CardProps) {
  const Tag: ElementType = as;
  return <Tag className={className ? `${styles.card} ${className}` : styles.card} {...rest} />;
}
