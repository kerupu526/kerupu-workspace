import { ButtonLink } from "./Button";
import styles from "./ServiceTabs.module.css";

const TABS = [
  { key: "board", href: "/board", label: "게시판" },
  { key: "playlist", href: "/playlist", label: "플레이리스트" },
  { key: "dictionary", href: "/dictionary", label: "캐릭터 사전" },
] as const;

export type ServiceTabKey = (typeof TABS)[number]["key"];

interface ServiceTabsProps {
  current: ServiceTabKey;
  className?: string;
}

/* "서비스" 아래 세 화면을 오가는 탭. 현재 탭은 채운 알약과 aria-current 로 표시한다. */
export default function ServiceTabs({ current, className }: ServiceTabsProps) {
  return (
    <nav className={className ? `${styles.tabs} ${className}` : styles.tabs} aria-label="서비스 메뉴">
      {TABS.map((tab) => {
        const active = tab.key === current;
        return (
          <ButtonLink
            key={tab.key}
            href={tab.href}
            variant={active ? "primary" : "secondary"}
            aria-current={active ? "page" : undefined}
          >
            {tab.label}
          </ButtonLink>
        );
      })}
    </nav>
  );
}
