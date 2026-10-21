import Card from "./Card";
import styles from "./TrackRow.module.css";

interface TrackRowProps {
  no: number;
  title: string;
  artist: string;
  duration: string;
}

/* 플레이리스트의 한 곡. 번호는 목록(ol)이 이미 알려 주므로 보조기기에서는 숨긴다. */
export default function TrackRow({ no, title, artist, duration }: TrackRowProps) {
  return (
    <Card as="li" className={styles.row}>
      <span className={styles.no} aria-hidden="true">
        {no}
      </span>
      <p className={styles.title}>{title}</p>
      <p className={styles.artist}>{artist}</p>
      <p className={styles.duration}>{duration}</p>
    </Card>
  );
}
