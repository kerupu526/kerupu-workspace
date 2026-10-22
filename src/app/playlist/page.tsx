import type { Metadata } from "next";
import PageFrame from "@/components/PageFrame";
import PlayerCard from "@/components/PlayerCard";
import ServiceTabs from "@/components/ServiceTabs";
import TrackRow from "@/components/TrackRow";
import styles from "./page.module.css";

export const metadata: Metadata = { title: "플레이리스트" };

/* 내용은 자리표시(대괄호)다. 실제 곡은 콘텐츠 단계에서 채운다. */
const TRACKS = [1, 2, 3, 4, 5, 6, 7, 8].map((no) => ({
  no,
  title: "[곡 제목]",
  artist: "[아티스트]",
  duration: "0:00",
}));

export default function PlaylistPage() {
  return (
    <PageFrame className={styles.layout}>
      <ServiceTabs current="playlist" className={styles.tabs} />
      <PlayerCard />
      <div className={styles.list}>
        <h1 className={styles.heading}>플레이리스트</h1>
        <ol className={styles.tracks} aria-label="곡 목록">
          {TRACKS.map((track) => (
            <TrackRow key={track.no} {...track} />
          ))}
        </ol>
      </div>
    </PageFrame>
  );
}
