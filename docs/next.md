# 다음 작업 메모

마지막 정리: 2026-10-21

## 바로 확인할 것
- [ ] Supabase 대시보드: Site URL = `https://kerupu.tech`, Redirect URLs에 `https://kerupu.tech/auth/callback` (개발용 `http://localhost:3000/auth/callback`)
- [ ] 실제 메일로 가입 → 확인 링크 → "환영합니다" 카드까지 되는지
- [ ] `kerupu.tech` 편집 화면에서 저장 → 문서 화면 반영 (로그인 상태로)
- [ ] 홈의 희귀 한자 이름(𰻝䨻𪚥𣡽P)이 깨지지 않는지 (SimSun-ExtB 적용)
- [ ] 소개 화면 아이콘 크기, 메뉴 아이콘 크기 (지금 48px)

## 문구와 자산
- [ ] 소개 일본어·영어 문단 검수 (`src/content/about.ts`)
- [ ] 소개 링크 아이콘은 지정한 로고 세 개 (GitHub, X, YouTube) — 색 확인
- [ ] 캐릭터 사전 목록(`/dictionary`)의 자리표시 문구 (`[작품 A]` 등) 정리
- [ ] 캐릭터 문서 화면은 지금 공사 중 — 열 때 `src/app/dictionary/[slug]/page.tsx` 되돌리기 (저장된 판을 보여 주는 코드는 `store.ts`에 있음)

## 기능
- [ ] 운영자 관리 화면 (지금은 DB에서 직접 추가·삭제)
- [ ] 헤더가 매 요청마다 로그인 상태를 확인해서 페이지가 동적으로 만들어짐 — 느려지면 손보기
- [ ] 이메일 발송 한도(개발용 기본값) — 실제 가입을 받으려면 SMTP 연결
- [ ] 언어 선택 (처음 접속 때 한국어, 일본어, 영어 고르기)

## 서버
- 집 서버 디스크는 루트가 좁음 (`/data/kerupu` 사용 중). 자세한 건 `docs/deploy.md`.
- 배포: 서버에서 `git pull` 후 `docker compose up -d --build`.
