import Link from "next/link";
import HeaderNav from "./HeaderNav";
import styles from "./Header.module.css";

export default function Header() {
  return (
    <header className={styles.header}>
      <Link href="/" className={styles.brand}>
        <span className={styles.disc} aria-hidden="true">
          k
        </span>
        <span className={styles.wordmark}>kerupu_workspace</span>
      </Link>
      <HeaderNav />
    </header>
  );
}
