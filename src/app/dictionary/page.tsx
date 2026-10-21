import type { Metadata } from "next";
import Card from "@/components/Card";
import CharacterCard, { type Character } from "@/components/CharacterCard";
import PageFrame from "@/components/PageFrame";
import SearchField from "@/components/SearchField";
import ServiceTabs from "@/components/ServiceTabs";
import ToggleChip from "@/components/ToggleChip";
import styles from "./page.module.css";

export const metadata: Metadata = { title: "캐릭터 사전" };

/* 내용은 자리표시(대괄호)다. 실제 캐릭터는 콘텐츠 단계에서 채운다. */
const CHARACTERS: Character[] = [1, 2, 3, 4, 5, 6].map((n) => ({
  slug: `character-${n}`,
  name: `[캐릭터 ${n}]`,
  work: "[작품]",
  summary: "[캐릭터 한 줄 설명]",
}));

export default function DictionaryPage() {
  return (
    <PageFrame className={styles.layout}>
      {/* 화면에는 탭의 "캐릭터 사전"이 보이므로 페이지 제목은 보조기기용으로만 둔다 */}
      <h1 className="visually-hidden">캐릭터 사전</h1>
      <ServiceTabs current="dictionary" className={styles.tabs} />

      <Card as="section" className={styles.filters} aria-labelledby="dict-filter-title">
        <h2 className={styles.filterTitle} id="dict-filter-title">
          찾아보기
        </h2>
        <SearchField
          id="dict-search"
          label="캐릭터 검색"
          placeholder="캐릭터 검색"
          className={styles.search}
        />

        {/* 아래 필터와 정렬은 화면만 있고 아직 목록을 바꾸지 않는다 */}
        <div role="group" aria-labelledby="dict-work-label" className={styles.group}>
          <p className={styles.groupLabel} id="dict-work-label">
            작품
          </p>
          <div className={styles.chips}>
            <ToggleChip pressed>전체</ToggleChip>
            <ToggleChip>[작품 A]</ToggleChip>
            <ToggleChip>[작품 B]</ToggleChip>
            <ToggleChip>[작품 C]</ToggleChip>
          </div>
        </div>

        <div role="group" aria-labelledby="dict-sort-label" className={styles.group}>
          <p className={styles.groupLabel} id="dict-sort-label">
            정렬
          </p>
          <div className={styles.chips}>
            <ToggleChip pressed>이름순</ToggleChip>
            <ToggleChip>최근 추가</ToggleChip>
          </div>
        </div>
      </Card>

      <div className={styles.results}>
        <h2 className="visually-hidden">캐릭터 목록</h2>
        <ul className={styles.cards} aria-label="캐릭터 목록">
          {CHARACTERS.map((character) => (
            <CharacterCard key={character.slug} {...character} />
          ))}
        </ul>
      </div>
    </PageFrame>
  );
}
