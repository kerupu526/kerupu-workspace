import type { Metadata } from "next";
import { ButtonLink } from "@/components/Button";
import Card from "@/components/Card";
import PageFrame from "@/components/PageFrame";
import styles from "./not-found.module.css";

export const metadata: Metadata = { title: "페이지를 찾을 수 없음" };

/* 문구는 임시 초안이다. */
export default function NotFound() {
  return (
    <PageFrame className={styles.layout}>
      <p className={styles.code}>404</p>
      <Card as="section" className={styles.card} aria-labelledby="not-found-title">
        <h1 className={styles.title} id="not-found-title">
          페이지를 찾을 수 없습니다
        </h1>
        <p className={styles.text}>주소를 잘못 입력했거나, 페이지가 옮겨지거나 사라졌을 수 있습니다.</p>
      </Card>
      <ButtonLink href="/" size="large">
        처음으로
      </ButtonLink>
    </PageFrame>
  );
}
