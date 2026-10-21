import type { ReactNode } from "react";
import Card from "./Card";
import CircleFrame from "./CircleFrame";
import styles from "./ProfileCard.module.css";

interface ProfileCardProps {
  name: string;
  children?: ReactNode;
}

/*
 * 프로필 카드 (첫 화면, 소개 화면 공용).
 * 이름은 h1 보다 먼저 나오므로 제목 요소가 아니라 문단으로 둔다.
 * 사진은 아직 없어서 자리표시 원만 그린다.
 */
export default function ProfileCard({ name, children }: ProfileCardProps) {
  return (
    <Card className={styles.profile}>
      <CircleFrame label="프로필 사진" />
      <p className={styles.name}>{name}</p>
      {children ? <p className={styles.description}>{children}</p> : null}
    </Card>
  );
}
