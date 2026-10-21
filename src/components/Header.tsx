import Link from "next/link";
import HeaderNav from "./HeaderNav";
import styles from "./Header.module.css";
import { createClient } from "@/lib/supabase/server";

/* 로그인 상태는 서버에서 읽어서 메뉴에 넘긴다 (로그인하면 "로그인" 대신 "내 계정") */
export default async function Header() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  const signedIn = Boolean(data.user);

  return (
    <header className={styles.header}>
      <Link href="/" className={styles.brand}>
        <span className={styles.disc} aria-hidden="true">
          k
        </span>
        <span className={styles.wordmark}>kerupu_workspace</span>
      </Link>
      <HeaderNav signedIn={signedIn} />
    </header>
  );
}
