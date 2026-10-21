import Card from "./Card";
import CircleFrame from "./CircleFrame";
import styles from "./PlayerCard.module.css";

/*
 * 재생 카드. 화면만 있고 재생 기능은 아직 없다.
 * 버튼은 실제 button 이고 이름은 aria-label 로 붙인다 (아이콘은 장식).
 */
export default function PlayerCard() {
  return (
    <Card as="section" className={styles.player} aria-label="재생기">
      <div className={styles.top}>
        <CircleFrame label="앨범 아트" />
        <p className={styles.title}>[재생 중인 곡]</p>
        <p className={styles.artist}>[아티스트]</p>
        <progress className={styles.progress} value={38} max={100} aria-label="재생 위치" />
      </div>

      <div className={styles.controls}>
        <button type="button" className={styles.control} aria-label="이전 곡">
          <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false" fill="currentColor">
            <rect x="5" y="5" width="3" height="14" />
            <polygon points="19,5 19,19 9,12" />
          </svg>
        </button>
        <button type="button" className={`${styles.control} ${styles.play}`} aria-label="재생">
          <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false" fill="currentColor">
            <polygon points="7,4 7,20 20,12" />
          </svg>
        </button>
        <button type="button" className={styles.control} aria-label="다음 곡">
          <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false" fill="currentColor">
            <rect x="16" y="5" width="3" height="14" />
            <polygon points="5,5 5,19 15,12" />
          </svg>
        </button>
      </div>
    </Card>
  );
}
