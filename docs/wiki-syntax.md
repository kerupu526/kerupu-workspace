# 위키 문법 설계 (1차)

상태: **초안 (승인 대기)**
범위: 캐릭터 문서(`/dictionary/[slug]`)를 비롯한 위키 문서의 작성 문법과 CSS 허용 규칙.
관련 코드: `src/components/WikiDocument.tsx`, `WikiToc.tsx`, `WikiInfobox.tsx`, `FootnoteRef.tsx`.

## 1. 원칙

1. **마크다운 기반.** 표준 마크다운(CommonMark + GFM 표)을 따르고, 우리에게 필요한 확장만 더한다.
2. **나무마크 호환은 하지 않는다.** 나무위키 문법을 그대로 따르지 않는다. 익숙한 기호(`**`, `[[ ]]` 등)는 쓰지 않는다.
3. **HTML 금지.** 마크다운 안의 HTML 태그는 모두 글자로 보여 준다(이스케이프). `<script>`, `<iframe>`, `<style>` 등은 아예 출력하지 않는다.
4. **스타일은 CSS 허용 목록으로만.** 문서 작성자가 쓸 수 있는 CSS는 아래 3장 목록에 있는 속성뿐이다.
5. **문서 권한:** 문서는 누구나 만들 수 있다. 편집·삭제는 문서 작성자와 운영자만 한다. 따라서 CSS와 문법 검사는 편집 권한과 상관없이 항상 적용한다.

## 2. 문법

### 2.1 문단(제목)

- `## 개요`부터 쓴다. `#`(1단계)는 문서 제목 자리라서 본문에서 쓰지 않는다.
- `##`는 번호 1단계, `###`는 2단계, `####`는 3단계, `#####`는 4단계, `######`는 5단계다. 마크다운에 `#`은 6개까지만 있으므로 **최대 5단계**다.
- 실제로는 3단계까지 권장한다. 4단계 이상은 번호가 `2.1.3.1`처럼 길어져서 읽기 어렵다.
- 번호는 자동으로 붙는다(`1.`, `2.1.`). 목차(`[toc]`)에도 같이 나온다.
- 문단 제목은 한 줄, 끝에 `#`을 붙이는 닫기 표기는 쓰지 않는다.

```markdown
## 개요
본문 문단.

### 외모
하위 문단.
```

### 2.2 목차

- 문서 어디에든 `[toc]`를 한 줄로 쓰면 그 자리에 목차가 나온다.
- 목차가 없으면 자동으로 만들지 않는다(작성자가 위치를 정한다).

### 2.3 텍스트 서식

| 문법 | 결과 |
|---|---|
| `**굵게**` | **굵게** |
| `*기울임*` | *기울임* |
| `~~취소선~~` | ~~취소선~~ |
| `` `코드` `` | 고정폭 글자 |

- 밑줄, 위첨자(`^^`), 아래첨자(`,,`), 글자 색(`{{{#색}}}`), 글자 크기(`{{{+1}}}`)는 **1차에서 쓰지 않는다**. 색과 크기는 2장 CSS 블록으로 대신한다.

### 2.4 링크

- 문서 내부 링크: `[글자](/dictionary/character-1)`. 경로는 `/`로 시작해야 한다.
- 같은 문서 안의 문단: `[글자](#개요)`. 문단 번호 대신 문단 제목에서 만든 앵커를 쓴다.
- 외부 링크: `[글자](https://...)`. 항상 `target="_blank"`와 `rel="noopener noreferrer"`를 붙인다.
- 허용하지 않는 주소: `javascript:`, `data:`, `vbscript:`, 그 밖의 프로토콜. 링크 자체를 글자로만 보여 준다.
- 존재하지 않는 문서로 가는 링크는 별도 색으로 구분한다(구현 단계에서 정함).

### 2.5 각주

- Pandoc 인라인 각주 문법을 쓴다: `본문^[내용]`. 내용이 제자리에 있어서 따로 적을 필요가 없다.
- 번호는 등장 순서대로 1, 2, 3으로 자동으로 붙는다.
- 본문 번호는 `FootnoteRef`(팝오버)로 보여 주고, 문서 맨 아래 각주 목록도 그대로 둔다.
- 각주 안에 각주는 쓰지 않는다. 파서가 막는다.
- 각주 내용 안에서도 굵게 같은 기본 서식은 쓸 수 있다. 링크는 허용한다.

```markdown
캐릭터의 출생지는 명확하지 않다.^[원작 3권 15장 참고.]
```

- 파서는 Pandoc 확장 기능을 쓴다(remark 계열의 인라인 각주 플러그인). 표준 GFM에는 이 문법이 없으므로 구현 단계에서 플러그인 지원 여부를 먼저 확인한다.

### 2.6 리스트

- 순서 없는 목록: `- 항목`, `* 항목`, `+ 항목` 셋 다 같은 목록이다(마크다운 표준). 기호 뒤에는 반드시 공백 한 칸을 둔다. 공백이 없으면 기울임(`*기울임*`)으로 읽힌다.
- 한 목록 안에서는 기호를 섞지 않는다. 기호를 바꾸면 새 목록으로 시작한다.
- 들여쓰기는 공백 2칸 단위로 한 단계씩 내려간다.
- 순서 있는 목록: `1. 항목`. 번호는 쓴 그대로 따르지 않고 1부터 순서대로 매긴다.
- 리스트 안의 줄 바꿈은 빈 줄이 없으면 같은 항목으로 이어진다.

### 2.7 인용문과 수평줄

- 인용문: `> 내용`. 중첩은 `>>`로 쓴다. 최대 3단계까지 허용한다.
- 수평줄: `---` 한 줄(앞뒤 빈 줄 필요).

### 2.8 표

- 표준 GFM 표를 쓴다.

```markdown
| 항목 | 내용 |
|:---|---:|
| 이름 | 값 |
```

- 정렬: `:---` 왼쪽, `---:` 오른쪽, `:---:` 가운데.
- 셀 병합은 지원하지 않는다.
- 표 안에 리스트나 표를 중첩하지 않는다.
- 표 가로 폭이 화면을 넘으면 표만 가로로 스크롤한다(페이지는 넘치지 않는다).

### 2.9 이미지

- `![설명](주소)`. 주소는 **우리 사이트에 업로드된 파일**(`/uploads/...`)만 허용한다. 외부 이미지 주소는 쓰지 않는다(개인정보와 저작권 문제, 그리고 깨진 이미지 방지).
- 업로드 기능은 아직 없다(기능 확장 단계). 그 전까지 이미지는 `public/` 안의 정적 파일만 쓴다.
- 이미지 크기와 정렬은 CSS 블록(2장)으로 지정한다.
- 이미지 설명(`alt`)은 필수다. 비워 두면 파일 이름을 대신 쓴다.

### 2.10 분류와 메타 정보

문서 맨 위에 메타 블록을 둔다. 본문 마크다운과 섞이지 않게 `---`로 감싼다.

```markdown
---
분류: 등장인물, 주인공
정보:
  제목: 캐릭터 이름
  작품: 작품명
  분류: 주인공
  첫 등장: 1화
  출처: 원작 1권
이미지: /uploads/character-1.png
---
```

- `분류`는 쉼표로 나눈다. 분류 페이지는 기능 단계에서 만든다.
- `정보`는 우리 `WikiInfobox`의 행 목록으로 바로 들어간다.
- 메타 블록 파서는 허용한 키(`분류`, `정보`, `이미지`)만 받고 나머지는 버린다.

### 2.11 주석

- 편집 화면에서만 보이는 주석: 줄 맨 앞에 `%%` (읽기 화면에는 나오지 않는다).

### 2.12 이스케이프

- 문법 기호를 글자로 쓰려면 앞에 `\`를 붙인다: `\*`, `\[`, `\|`.

## 3. CSS 블록

### 3.1 문법

블록 단위로만 쓴다. 다음 형식의 컨테이너 안의 내용에 적용된다.

```markdown
:::style
color: #647260;
text-align: center;
:::
이 문단은 가운데 정렬되고 색이 바뀝니다.

:::
```

정확히는 다음과 같다.

```markdown
:::style
속성: 값;
속성: 값;
:::
(여기 안의 마크다운이 스타일을 받는다)
:::
```

- 여는 줄은 `:::style` 한 줄. 닫는 줄은 `:::` 한 줄.
- 스타일이 적용되는 범위는 두 `:::` 사이의 블록 전체다.
- 중첩은 허용하지 않는다. 한 블록 안에 또 `:::style`을 쓰면 무시하고 글자로 보여 준다.
- 블록 하나당 선언은 최대 20개.

### 3.2 허용 속성

아래 목록에 없는 속성은 모두 버린다. 값은 목록에 적힌 제한을 따른다.

**정렬·배치**
- `align-items`: `normal`, `stretch`, `center`, `start`, `end`, `flex-start`, `flex-end`, `self-start`, `self-end`, `baseline`, `first baseline`, `last baseline`
- `justify-content`: `center`, `start`, `end`, `flex-start`, `left`, `right`, `normal`, `space-between`, `space-around`, `space-evenly`, `stretch`
- `display`: `block`, `flex`, `inline`, `inline-block`, `inline-flex`, `inline-table`, `list-item`, `none`, `table`, `table-caption`, `table-cell`, `table-row`, `table-column`, `table-column-group`, `table-footer-group`, `table-header-group`, `table-row-group`
- `flex-direction`, `flex-grow`, `flex-shrink`, `flex-wrap`(`nowrap`, `wrap`, `wrap-reverse`만)
- `float`, `clear`, `gap`, `aspect-ratio`, `box-sizing`
- `grid-template-columns`, `grid-template-rows`, `grid-column`, `grid-row` (추가)
- `break-after`, `break-before`, `break-inside`

**크기·여백**
- `width`, `height`, `min-width`, `min-height`, `max-width`, `max-height`
- `margin`, `margin-top`, `margin-right`, `margin-bottom`, `margin-left`
- `padding`, `padding-top`, `padding-right`, `padding-bottom`, `padding-left`
- `overflow`, `overflow-x`, `overflow-y` (`visible`, `hidden`, `scroll`, `auto`, `overlay`만)

**글자**
- `color`, `font`, `font-family`(최대 8개, 시스템 글꼴 이름만), `font-size`, `font-size-adjust`, `font-stretch`, `font-style`, `font-synthesis`, `font-weight`, `font-kerning`, `font-feature-settings`, `font-language-override`
- `font-variant` 및 하위(`font-variant-alternates`, `-caps`, `-east-asian`, `-ligatures`, `-numeric`, `-position`)
- `line-height` (추가): 숫자만, 범위 1.2~2.2
- `letter-spacing`, `word-spacing`, `text-indent`
- `text-align`: `left`, `right`, `center`만. `text-align-last`, `text-combine-upright`
- `text-decoration`, `text-decoration-color`, `text-decoration-line`, `text-decoration-skip`, `text-decoration-style`
- `text-emphasis`, `text-emphasis-color`, `text-emphasis-position`, `text-emphasis-style`
- `text-overflow`, `text-shadow`, `text-transform`, `text-underline-position`, `text-wrap`
- `text-orientation`, `writing-mode`, `vertical-align`, `white-space`, `word-break`, `word-wrap`

**색·꾸밈**
- `background`, `background-attachment`, `background-clip`, `background-color`, `background-origin`, `background-position`, `background-repeat`, `background-size`
  - `background-image`는 **제외**한다. `url()`은 물론 그라데이션도 쓰지 않는다.
- `border`, `border-top`, `border-right`, `border-bottom`, `border-left`, 그리고 각각의 `-color`, `-style`, `-width`, `-radius`(방향별 모서리 포함)
- `border-collapse`, `border-color`, `border-radius`, `border-spacing`, `border-style`, `border-width`
  - `border-image` 계열은 **제외**한다.
- `box-decoration-break`, `box-shadow`
- `list-style`, `list-style-position`, `list-style-type` (`list-style-image`는 제외)
- `cursor` (유지): `auto`, `default`, `pointer`, `help`, `progress`, `wait`, `text`, `move`, `not-allowed`, `grab`, `zoom-in`, `zoom-out`만. 값이 `url(`로 시작하면 거부.

### 3.3 값 검사 규칙

- 속성 이름과 값을 **나눠서** 하나씩 검사한다. 문자열을 그대로 이어 붙이지 않는다.
- 다음이 들어 있으면 그 선언은 버린다: `url(`, `expression(`, `image-set(`, `element(`, `@import`, `;`, `}`, `{`, `\`(역슬래시), `/*`, `!important`.
- 길이 단위는 `px`, `em`, `rem`, `%`, `vh`, `vw`만 허용한다. 숫자 상한은 단위마다 정한다(예: `px` ≤ 2000).
- `var(`는 우리 디자인 토큰 이름(`--space-*`, `--main-logo` 등 `tokens.css`에 있는 것)만 허용한다.
- `font-family`는 8개 이하. 콤마로 나눠서 각각 검사한다.
- 같은 속성이 두 번 나오면 뒤의 것만 쓴다.

### 3.4 안전장치

- 허용 목록에 없는 속성이 들어 있어도 블록 전체를 버리지 않고 그 선언만 버린다. 그 사실을 편집 화면에 경고로 보여 준다(읽기 화면은 조용히 무시).
- 우리 사이트의 3px 포커스 링, 헤더·푸터 같은 공통 요소는 CSS 블록으로 바꿀 수 없다. 블록은 항상 `<main>` 안의 문서 본문에만 적용한다.

### 3.5 구현에서 정한 것 (5단계)

설계에 값이 없어서 `src/lib/wiki/css.ts`에서 정했다. 쓰면서 조정한다.

- **함수는 허용 목록으로.** `rgb()`, `rgba()`, `hsl()`, `hsla()`(숫자만)와 `var(--토큰)`(대체값 없음)만 쓴다. 그 밖의 모든 함수(`linear-gradient(`, `attr(`, `env(`, `calc(` 등)는 거부한다. 3.3절의 금지 목록만으로는 `background`로 그라데이션이 들어올 수 있기 때문이다.
- **`var()` 토큰:** 색, 간격, 모서리, 글자 크기·굵기 토큰만. `--px`, `--design-width`는 제외.
- **단위 상한:** `px` 2000, `em`·`rem` 100, `%` 500, `vh`·`vw` 100, `fr` 100, 단위 없는 숫자 1000. `fr`은 `grid-*` 속성에서만 쓴다.
- **음수:** `letter-spacing`, `word-spacing`, `text-indent`, `text-shadow`, `box-shadow`, `vertical-align`에서만 허용. `margin` 등에서 막는 것은 내용이 헤더를 덮지 않게 하려는 것이다(3.4절).
- **슬래시(`/`):** `aspect-ratio`, `grid-column`, `grid-row`, `font`, `border-radius`, `background`에서만. **따옴표:** `font-family`, `font-feature-settings`, `font-language-override`에서만.
- **`line-height`:** 1.2~2.2 사이의 단위 없는 숫자만.
- **선언 나누기:** `;`로 나눈다. 줄 끝의 `;`를 빼먹어 합쳐진 선언은 값에 `:`이 들어 있어서 버려진다.
- **짝이 안 맞는 블록:** 닫지 않은 `:::style`은 그냥 글자로 남는다. 블록 안의 `:::style`은 중첩으로 보지 않고 글자로 둔다(안쪽 `:::`가 바깥 블록을 닫는다).
- **블록 안의 제목(`##`):** 쓸 수 없다. 버리고 경고한다. 문단 구조는 블록 밖에서만 만든다.
- **경고:** 버린 선언은 `parseWiki()`의 `warnings`로 돌려준다. 읽기 화면에는 보이지 않고, 편집 화면이 생기면 거기서 보여 준다.
- **렌더링:** 통과한 선언만 `<div style>`로 준다. `<style>` 태그나 HTML 주입은 쓰지 않는다.
- **테스트:** `npm test` (Node 내장 테스트 러너, `src/**/*.test.ts`).

### 3.6 구현에서 정한 것 (메타 블록, 목차, 주석)

`src/lib/wiki/meta.ts`와 `parse.ts`에서 정했다.

- **처리 순서:** 주석 지우기 → 메타 블록 떼어 내기 → CSS 블록 떼어 내기 → 마크다운 파싱.
- **메타 블록 판정:** 문서 맨 앞(빈 줄만 앞설 수 있다)의 `---`로 시작하고, 닫는 `---`가 있고, 안쪽이 `이름: 값` 줄과 들여쓴 줄뿐일 때만 메타 블록이다. 아니면(수평줄 두 개 사이의 일반 글 등) 그대로 둔다.
- **메타 블록 제한:** 분류 20개(각 50자), 정보 30행(이름 30자, 값 200자). 같은 정보 이름은 뒤의 것을 쓴다. `정보`의 `제목`은 정보 상자의 제목이 되고 나머지는 행이 된다. 탭 들여쓰기는 버린다. 이미지는 `/uploads/` 파일만. 버린 항목은 `warnings`로 돌려준다.
- **목차:** 한 줄에 `[toc]`만 있는 맨 바깥 단계의 문단만 목차다(대소문자 무관). 문서에서 처음 나온 하나만 쓰고 나머지는 경고와 함께 버린다. `\[toc]`, 인용문·리스트·CSS 블록 안의 `[toc]`는 글자다. 첫 제목 전에 쓴 `[toc]`는 `ParsedWiki.lead`에 담긴다.
- **목차를 자동으로 만들지 않는다:** `WikiDocument`는 `[toc]`(toc 블록)가 있는 자리에만 목차를 그린다.
- **주석:** 줄 맨 앞의 `%%`는 그 줄 전체가, 줄 중간의 `%%메모%%` 한 쌍(같은 줄 안)은 그 부분이 주석이다. 주석만 있던 줄은 빈 줄을 남기지 않고 없앤다. 코드 블록, `코드`, `\%%` 안은 주석이 아니다. 주석 안의 각주와 CSS 블록은 없는 것으로 친다.
- **제목 단계 건너뛰기:** `##` 다음에 바로 `####`를 쓰면 가장 가까운 윗 문단 아래에 둔다.

## 4. 파서와 렌더링 흐름

```
마크다운 원문
  → 메타 블록 분리 (---)        → 분류, 정보, 이미지
  → 마크다운 파싱 (GFM)         → 문단 트리, 본문 조각
  → 확장 처리
      [toc], [^n], :::style, %% 주석
  → 검사
      HTML 제거, 링크 주소, 이미지 주소, CSS 허용 목록
  → 기존 부품으로 변환
      문단 트리   → WikiSection[]   (WikiDocument)
      [^n]        → FootnoteRef(text)
      메타 정보   → WikiInfoboxData (WikiInfobox)
      표          → 새 WikiTable 부품 (구현 필요)
```

- 마크다운 파서는 기존 생태계(unified / remark)를 쓰는 것을 권장한다. HTML 출력 기능은 끄고, 결과를 우리 부품 트리로 바꾼다. 직접 구현은 하지 않는다.
- 파서 결과는 캐시할 수 있다. 문서 저장 시점에 한 번 파싱하고 HTML이 아닌 트리를 저장하면 읽기 속도가 빨라진다(저장 방식은 기능 단계에서 정함).

## 5. 제한 값 (안)

| 항목 | 값 |
|---|---|
| 문서 본문 길이 | 최대 100,000자 |
| 문단 깊이 | 5단계 (`##`~`######`), 권장 3단계 |
| 각주 개수 | 200개 |
| 표 열 수 | 12열 |
| 표 행 수 | 300행 |
| 인용문 중첩 | 3단계 |
| 리스트 중첩 | 4단계 |
| CSS 블록 선언 수 | 20개 |
| 이미지 개수 | 50개 |

숫자는 실제 문서를 쓰면서 조정한다.

## 6. 우리 디자인과의 관계

- 마크다운 결과는 디자인 토큰을 통해서만 스타일을 받는다. 새로운 색이나 크기 값을 문법에서 만들지 않는다.
- 줄 간격(`line-height`)은 기본값을 그대로 두고, 문서 작성자가 바꿀 때만 허용 범위 안에서 바뀐다.
- 모서리 둥글기, 그림자, 테두리 색은 기본 토큰을 따른다. CSS 블록으로 바꿀 수는 있지만 권장하지 않는다.
- 3px 테두리와 포커스 링은 접근성 규칙이라 CSS 블록으로 줄이거나 없앨 수 없다.

## 7. 아직 정하지 않은 것

- **이미지 업로드:** 파일 저장 위치, 크기 제한, 허용 형식. 기능 확장 단계에서 정한다.
- **편집 화면:** 마크다운을 쓰는 입력창(미리보기 포함 여부). 편집 권한 로직과 함께 정한다.
- **내부 링크 색:** 존재하지 않는 문서 링크를 어떻게 구분할지.
- **분류 페이지:** 분류를 눌렀을 때 가는 목록 화면.
- **메타 블록 키 확장:** `정보`의 키를 고정할지, 문서 종류(캐릭터, 작품 등)별로 다르게 할지.
- **표 부품:** `WikiTable` 구현 시 모바일 처리(모바일 설계 전까지 가로 스크롤).

## 8. 구현 순서 (제안)

1. 마크다운 파서 연결과 문단, 목차, 텍스트 서식, 링크, 리스트, 인용문, 수평줄
2. 각주 `[^n]`을 기존 `FootnoteRef`에 연결
3. 메타 블록과 정보 상자 연결
4. 표(`WikiTable`)와 이미지
5. CSS 블록과 허용 목록 필터, 단위 테스트(속성별 허용·거부 케이스)
6. 제한 값과 오류 표시

각 단계는 `npm run lint`, `npm run build`가 통과한 뒤 커밋한다.
