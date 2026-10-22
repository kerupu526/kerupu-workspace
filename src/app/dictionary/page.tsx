import type { Metadata } from "next";
import { ButtonLink } from "@/components/Button";
import Card from "@/components/Card";
import CharacterCard from "@/components/CharacterCard";
import PageFrame from "@/components/PageFrame";
import SearchField from "@/components/SearchField";
import ServiceTabs from "@/components/ServiceTabs";
import ToggleChip from "@/components/ToggleChip";
import { CHARACTER_LIST_LIMIT, listCharacters, listWorks, type CharacterSort } from "@/lib/wiki/store";
import styles from "./page.module.css";

export const metadata: Metadata = { title: "캐릭터 사전" };

type SearchParams = Record<string, string | string[] | undefined>;

/* 주소 변수는 같은 이름이 여러 번 올 수 있다. 첫 값만 쓰고 길이를 제한한다. */
function pick(value: string | string[] | undefined): string | undefined {
  const first = Array.isArray(value) ? value[0] : value;
  const trimmed = first?.trim().slice(0, 100);
  return trimmed ? trimmed : undefined;
}

interface Filters {
  query?: string;
  work?: string;
  sort: CharacterSort;
}

/* 고른 조건을 주소로 만든다. 기본값(이름순)과 빈 값은 주소에 싣지 않는다. */
function listHref({ query, work, sort }: Filters): string {
  const search = new URLSearchParams();
  if (query) search.set("q", query);
  if (work) search.set("work", work);
  if (sort !== "name") search.set("sort", sort);
  const text = search.toString();
  return text ? `/dictionary?${text}` : "/dictionary";
}

export default async function DictionaryPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const params = await searchParams;
  const deleted = pick(params.deleted) === "document";
  const filters: Filters = {
    query: pick(params.q),
    work: pick(params.work),
    sort: pick(params.sort) === "recent" ? "recent" : "name",
  };

  const [{ items, truncated }, works] = await Promise.all([listCharacters(filters), listWorks()]);
  const filtered = Boolean(filters.query || filters.work);

  // 검색해도 고른 작품과 정렬은 그대로 둔다
  const keep: Record<string, string> = {};
  if (filters.work) keep.work = filters.work;
  if (filters.sort !== "name") keep.sort = filters.sort;

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
          name="q"
          action="/dictionary"
          label="캐릭터 검색"
          placeholder="캐릭터 검색"
          defaultValue={filters.query}
          keep={keep}
          className={styles.search}
        />

        <div role="group" aria-labelledby="dict-work-label" className={styles.group}>
          <p className={styles.groupLabel} id="dict-work-label">
            작품
          </p>
          <div className={styles.chips}>
            <ToggleChip pressed={!filters.work} href={listHref({ ...filters, work: undefined })}>
              전체
            </ToggleChip>
            {works.map((work) => (
              <ToggleChip key={work} pressed={filters.work === work} href={listHref({ ...filters, work })}>
                {work}
              </ToggleChip>
            ))}
          </div>
        </div>

        <div role="group" aria-labelledby="dict-sort-label" className={styles.group}>
          <p className={styles.groupLabel} id="dict-sort-label">
            정렬
          </p>
          <div className={styles.chips}>
            <ToggleChip pressed={filters.sort === "name"} href={listHref({ ...filters, sort: "name" })}>
              이름순
            </ToggleChip>
            <ToggleChip pressed={filters.sort === "recent"} href={listHref({ ...filters, sort: "recent" })}>
              최근 추가
            </ToggleChip>
          </div>
        </div>
      </Card>

      <div className={styles.results}>
        <div className={styles.toolbar}>
          <p className={styles.count} role="status">
            {filtered ? `조건에 맞는 캐릭터 ${items.length}명` : `캐릭터 ${items.length}명`}
          </p>
          <div className={styles.toolbarActions}>
            <ButtonLink href="/images" variant="secondary" size="compact">
              이미지 관리
            </ButtonLink>
            <ButtonLink href="/images/new" variant="secondary" size="compact">
              새 이미지 업로드
            </ButtonLink>
            <ButtonLink href="/dictionary/new" size="compact">
              새 캐릭터 추가
            </ButtonLink>
          </div>
        </div>
        {deleted ? (
          <p className={styles.notice} role="status">
            문서를 삭제했어요.
          </p>
        ) : null}
        <h2 className="visually-hidden">캐릭터 목록</h2>
        {items.length === 0 ? (
          <p className={styles.empty}>
            {filtered ? "조건에 맞는 캐릭터가 없어요." : "아직 등록된 캐릭터가 없어요. 첫 캐릭터를 추가해 보세요."}
          </p>
        ) : (
          <ul className={styles.cards} aria-label="캐릭터 목록">
            {items.map((character) => (
              <CharacterCard key={character.slug} {...character} />
            ))}
          </ul>
        )}
        {truncated ? (
          <p className={styles.empty}>
            캐릭터가 많아서 {CHARACTER_LIST_LIMIT}명까지만 보여 줘요. 검색이나 작품으로 좁혀 보세요.
          </p>
        ) : null}
      </div>
    </PageFrame>
  );
}
