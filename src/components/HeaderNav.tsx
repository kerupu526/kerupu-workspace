"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import PixelIcon, { type PixelIconName } from "./PixelIcon";
import styles from "./Header.module.css";

interface NavItem {
  href: string;
  label: string;
  icon: PixelIconName;
  /** 이 경로들(하위 경로 포함)에서도 현재 항목으로 표시한다. */
  activeBases: string[];
}

const NAV_ITEMS: NavItem[] = [
  { href: "/about", label: "소개", icon: "about", activeBases: ["/about"] },
  {
    href: "/board",
    label: "서비스",
    icon: "service",
    activeBases: ["/board", "/playlist", "/dictionary"],
  },
  { href: "/my-board", label: "개인 게시판", icon: "note", activeBases: ["/my-board"] },
  { href: "/login", label: "로그인", icon: "login", activeBases: ["/login"] },
];

function isActive(pathname: string, bases: string[]): boolean {
  return bases.some((base) => pathname === base || pathname.startsWith(`${base}/`));
}

export default function HeaderNav() {
  const pathname = usePathname();

  return (
    <nav className={styles.nav} aria-label="주 메뉴">
      {NAV_ITEMS.map((item) => {
        const active = isActive(pathname, item.activeBases);
        return (
          <Link
            key={item.href}
            href={item.href}
            className={active ? `${styles.navItem} ${styles.active}` : styles.navItem}
            aria-current={active ? "page" : undefined}
          >
            <PixelIcon name={item.icon} className={styles.icon} />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
