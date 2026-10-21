import type { Metadata } from "next";
import Card from "@/components/Card";
import PageFrame from "@/components/PageFrame";
import ProfileCard from "@/components/ProfileCard";
import styles from "./page.module.css";

export const metadata: Metadata = { title: "소개" };

/* 내용은 자리표시(대괄호)다. 실제 문구는 콘텐츠 단계에서 채운다. */
const LINKS = ["[링크 이름]", "[링크 이름]", "[링크 이름]", "[링크 이름]"];

export default function AboutPage() {
  return (
    <PageFrame className={styles.layout}>
      <ProfileCard name="켈프 (kerupu526)">[짧은 설명]</ProfileCard>
      <div className={styles.content}>
        <h1 className={styles.heading}>소개</h1>
        <Card className={styles.intro}>
          <p className={styles.text}>[소개 문단]</p>
        </Card>

        <h2 className={styles.heading}>연락 · 링크</h2>
        {/* 링크 내용이 정해지면 이름이 서로 다른 <a> 로 바꾼다. 지금은 링크가 아니다. */}
        <ul className={styles.links}>
          {LINKS.map((name, i) => (
            <Card as="li" key={i} className={styles.link}>
              <span className={styles.mark} aria-hidden="true" />
              <div className={styles.linkText}>
                <p className={styles.linkName}>{name}</p>
                <p className={styles.linkNote}>[링크 설명]</p>
              </div>
            </Card>
          ))}
        </ul>
      </div>
    </PageFrame>
  );
}
