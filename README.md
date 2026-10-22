# kerupu_workspace

켈프(kerupu526)의 개인 웹사이트. 도메인은 kerupu.tech (아직 배포 전).

- React + Next.js (App Router) + TypeScript
- 스타일: CSS 변수 + CSS Modules (UI 라이브러리, Tailwind 없음)
- 패키지 매니저: npm

현재 단계: **프론트엔드 작업** (화면은 모두 만들었다). 와이어프레임의 9개 화면과 글쓰기·게시글 보기 모달을
자리표시 내용으로 구현했다. 백엔드·인증·실제 기능(폼 제출, 검색, 필터, 재생, 위키 편집 등)은 아직 없다.
캐릭터 문서(`/dictionary/[slug]`)는 와이어프레임과 다르게 the seed 계열 위키(나무위키 등)의 화면 구성
(현재 위치, 문서 메뉴, 수정 시각, 분류, 목차, 번호 붙은 문단, 정보 상자, 각주)을 따르고, 문서가 중심이 되도록
서비스 탭은 두지 않는다. 본문 속 각주 번호는 누르거나 올리면 내용이 팝오버로 뜬다 (`FootnoteRef`).
위키 편집·역사 화면은 아직 정의되지 않았다.

화면 크기: 1920px 와이어프레임을 `--design-width`(기본 2400px)에서 1:1로 그리고, 그보다 좁은 화면에서는
`--px` 단위로 전체를 비율 축소한다 (`src/styles/tokens.css`). 모바일 설계 전까지 쓰는 임시 방식이다.

## 실행 방법

```bash
npm install
npm run dev     # 개발 서버 http://localhost:3000
npm run lint    # ESLint
npm run build   # 프로덕션 빌드
npm start       # 빌드 결과 실행
```

## 폴더 구조

```
design/            디자인 참고 자료 (수정하지 않는다)
scripts/           build-font-subset.mjs (작은 글꼴 만들기)
public/
  fonts/           kerupu-pixel-*.woff2 (작은 수정본), Mona12*.woff2 (원본), README.md
  licenses/        글꼴 라이선스 문서 (글꼴 옆에 함께 둔다)
src/
  app/             라우트
    layout.tsx       Header · <main> · Footer
    page.tsx         /
    about/           /about
    login/           /login
    dictionary/      /dictionary, /dictionary/new, /dictionary/[slug]
    not-found.tsx    404
  components/      Header, HeaderNav, Footer, PixelIcon          공통 틀
                   Card, Button, Chip, CircleFrame, PageFrame    기본 부품
                   Field, NoopForm, SearchField                  폼 (제출 동작 없음)
                   Modal, WriteDialog, PostList                  모달 (<dialog> 사용)
                   ProfileCard, AuthForms, CharacterForm,        화면별 부품
                   PostCard, NoticeCard, TrackRow, PlayerCard,
                   CharacterCard, ToggleChip
                   WikiDocument, WikiToc, WikiInfobox,           위키 문서
                   FootnoteRef
                   (모두 CSS Modules)
  styles/
    tokens.css       디자인 토큰 (CSS 변수)
    fonts.css        Mona12 @font-face
    globals.css      전역 스타일
```

## 글꼴 불러오기

Mona12 원본이 각각 약 1.2MB 라서 첫 방문에서 시스템 글꼴로 먼저 보였다가 바뀌며 깨져 보이는 문제를 줄이는 장치들이다.

- **작은 글꼴(가장 큰 효과):** 자주 쓰는 글자(영문, 숫자, 기호, 한글 2,350자, 자모)만 담은 수정본
  `kerupu-pixel-*.woff2` 가 각 약 43KB 이다. 이모지, 가나, 한자 등은 원본이 맡고 그런 글자가 나올 때만 내려받는다.
  파일은 `scripts/build-font-subset.mjs` 로 만들고, `src/styles/fonts-subset.css` 는 자동 생성 파일이다.
  라이선스 처리와 수정 내용은 `public/fonts/README.md` 에 있다.
- **미리 받기:** `layout.tsx` 가 작은 글꼴 두 개를 `preload` 한다 (Next.js 는 자동으로 해 주지 않는다).
- **준비된 뒤에 나타내기:** `layout.tsx` 의 작은 스크립트가 `<html>` 에 `fonts-loading` 을 붙여 본문을 숨겼다가,
  작은 글꼴이 준비되면(최대 2초) 떼고 부드럽게(0.6초) 나타낸다. 스크립트가 안 도는 환경에서는 그대로 보인다.
- **폴백 맞추기:** `fonts.css` 의 `Mona12 Fallback` 이 시스템 글꼴(맑은 고딕, Consolas 등)의 폭과 줄 높이를
  Mona12 에 맞춘다. Windows 에서 쟀을 때 대부분 ±3% 이내이다. 다른 환경은 한글만 비슷하게 맞춰진다.
- **캐시:** `next.config.ts` 가 `/fonts/*` 를 1년 캐시(`immutable`)한다. 글꼴 파일을 바꿀 때는 파일 이름도 바꿔야 한다.
- **알려진 한계:** KS X 1001 에 없는 희귀 한글 음절은 작은 글꼴에도 원본 담당 범위에도 없어서 시스템 글꼴로 보인다.

작은 글꼴을 다시 만들려면 (도구는 프로젝트 의존성에 넣지 않는다):

```bash
npm install --no-save subset-font wawoff2
node scripts/build-font-subset.mjs
```

## 글꼴 라이선스

Mona12는 SIL Open Font License 1.1 (Reserved Font Name "Mona")이다.
원본 파일은 수정하지 않고 그대로 두며, 글꼴 파일을 단독으로 판매하지 않는다.
글자를 일부만 남긴 작은 글꼴은 수정본이라서 이름을 "Kerupu Pixel" 로 바꿨다 (`public/fonts/README.md`).
라이선스 문서는 `public/licenses/`에 있다.
