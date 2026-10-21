# kerupu_workspace

켈프(kerupu526)의 개인 웹사이트. 도메인은 kerupu.tech (아직 배포 전).

- React + Next.js (App Router) + TypeScript
- 스타일: CSS 변수 + CSS Modules (UI 라이브러리, Tailwind 없음)
- 패키지 매니저: npm

현재 단계: **프론트엔드 작업**. `/`, `/about`, `/login` 세 화면은 자리표시 내용으로 화면을 만들었다.
나머지 라우트는 `h1`만 있는 뼈대이고, 백엔드·인증·실제 기능은 아직 없다.

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
public/
  fonts/           Mona12.woff2, Mona12-Bold.woff2
  licenses/        글꼴 라이선스 문서 (글꼴 옆에 함께 둔다)
src/
  app/             라우트
    layout.tsx       Header · <main> · Footer
    page.tsx         /
    about/           /about
    login/           /login
    board/           /board
    my-board/        /my-board
    playlist/        /playlist
    dictionary/      /dictionary, /dictionary/[slug]
    not-found.tsx    404
  components/      Header, HeaderNav, Footer, PixelIcon,
                   Card, Button, ProfileCard, PageFrame, AuthForms (+ CSS Modules)
  styles/
    tokens.css       디자인 토큰 (CSS 변수)
    fonts.css        Mona12 @font-face
    globals.css      전역 스타일
```

## 글꼴 라이선스

Mona12는 SIL Open Font License 1.1 (Reserved Font Name "Mona")이다.
글꼴 파일을 단독으로 판매하지 않고, 서브셋·수정 없이 그대로 쓴다.
라이선스 문서는 `public/licenses/`에 있다.
