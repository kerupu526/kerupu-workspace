import type { Metadata } from "next";
import Card from "@/components/Card";
import PageFrame from "@/components/PageFrame";
import ProfileCard from "@/components/ProfileCard";
import { ABOUT_INTRO, ABOUT_LINKS } from "@/content/about";
import styles from "./page.module.css";

export const metadata: Metadata = { title: "소개" };

export default function AboutPage() {
  return (
    <PageFrame className={styles.layout}>
      <ProfileCard name="켈프 (kerupu526)" image="/images/profile.jpg">
        너는 정말 바보구나
      </ProfileCard>
      <div className={styles.content}>
        <h1 className={styles.heading}>소개</h1>
        <Card className={styles.intro}>
          {ABOUT_INTRO.ko.map((line) => (
            <p className={styles.text} key={line}>
              {line}
            </p>
          ))}
        </Card>

        <h2 className={styles.heading}>연락 · 링크</h2>

        <ul className={styles.links}>
          {ABOUT_LINKS.map((link) => (
            <Card as="li" key={link.name} className={styles.link}>
              <span className={styles.mark} aria-hidden="true" />
              <div className={styles.linkText}>
                <p className={styles.linkName}>
                  <a href={link.href} target="_blank" rel="noopener noreferrer" className={styles.linkAnchor}>
                    {link.name}
                  </a>
                </p>
                <p className={styles.linkNote}>{link.note}</p>
              </div>
            </Card>
          ))}
        </ul>
      </div>
    </PageFrame>
  );
}
