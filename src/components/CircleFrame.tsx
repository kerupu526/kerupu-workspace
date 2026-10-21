import styles from "./CircleFrame.module.css";

/*
 * 지름 300px 원형 이미지 자리 (프로필 사진, 앨범 아트 공용).
 * 이미지가 생기면 이 안을 바꾼다. 테두리는 의미를 담으므로 main-logo 3px.
 */
export default function CircleFrame({ label }: { label: string }) {
  return <div className={styles.frame}>{label}</div>;
}
