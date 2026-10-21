import styles from "./Footer.module.css";

/* 메뉴는 넣지 않는다. 헤더와 겹치는 탭 정지점을 만들지 않기 위해서다. */
export default function Footer() {
  return (
    <footer className={styles.footer}>
      <div className={styles.id}>
        <p className={styles.title}>kerupu_workspace</p>
        <p className={styles.note}>© 2026 켈프 (kerupu526)</p>
      </div>
      <p className={styles.domain}>kerupu.tech</p>
    </footer>
  );
}
