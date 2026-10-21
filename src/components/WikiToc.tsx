import styles from "./WikiToc.module.css";

export interface TocItem {
  id: string;
  number: string;
  title: string;
  children: TocItem[];
}

function TocList({ items }: { items: TocItem[] }) {
  return (
    <ol className={styles.list}>
      {items.map((item) => (
        <li key={item.id}>
          <a className={styles.link} href={`#${item.id}`}>
            <span className={styles.number}>{item.number}</span>
            {item.title}
          </a>
          {item.children.length > 0 ? <TocList items={item.children} /> : null}
        </li>
      ))}
    </ol>
  );
}

/* 문서 맨 위 목차 상자. 번호는 문단 제목 앞 번호와 같다. */
export default function WikiToc({ items }: { items: TocItem[] }) {
  return (
    <nav className={styles.toc} id="toc" aria-labelledby="toc-title">
      <p className={styles.title} id="toc-title">
        목차
      </p>
      <TocList items={items} />
    </nav>
  );
}
