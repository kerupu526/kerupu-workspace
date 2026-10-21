import styles from "./CircleFrame.module.css";

interface CircleFrameProps {
  label: string;
  /** 크기를 바꾸려면 사용하는 쪽 CSS Module 에서 --circle-size 를 지정한다 (기본 300px) */
  className?: string;
}

/*
 * 원형 이미지 자리 (프로필 사진, 앨범 아트, 캐릭터 이미지 공용).
 * 이미지가 생기면 이 안을 바꾼다. 테두리는 의미를 담으므로 main-logo 3px.
 */
export default function CircleFrame({ label, className }: CircleFrameProps) {
  return <div className={className ? `${styles.frame} ${className}` : styles.frame}>{label}</div>;
}
