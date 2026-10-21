import styles from "./CircleFrame.module.css";

interface CircleFrameProps {
  label: string;
  /** 있으면 이 사진을 원 안에 채운다 (사이트 안의 경로, 예: /images/profile.jpg) */
  image?: string;
  /** 크기를 바꾸려면 사용하는 쪽 CSS Module 에서 --circle-size 를 지정한다 (기본 300px) */
  className?: string;
}

/*
 * 원형 이미지 자리 (프로필 사진, 앨범 아트, 캐릭터 이미지 공용).
 * 이미지가 생기면 이 안을 바꾼다. 테두리는 의미를 담으므로 main-logo 3px.
 */
export default function CircleFrame({ label, image, className }: CircleFrameProps) {
  const classes = className ? `${styles.frame} ${className}` : styles.frame;
  if (image) {
    // 사진은 원 모양대로 자르고, 설명은 alt 로 읽힌다
    return (
      <div className={classes}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={image} alt={label} className={styles.photo} />
      </div>
    );
  }
  return <div className={classes}>{label}</div>;
}
