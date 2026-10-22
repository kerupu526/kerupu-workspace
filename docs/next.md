# 다음 작업 메모

마지막 정리: 2026-10-22

## dev 브랜치 (캐릭터 사전 DB 연동)
- [ ] `supabase/migrations/20261022120000_characters.sql` 을 **dev용 Supabase에 먼저** 적용 (운영 DB에는 dev를 확인한 뒤)
- [ ] 적용 뒤 `supabase/tests/create_character.sql` 실행 → matched 열이 모두 true
- [ ] 로그인 상태로 `/dictionary/new` 에서 캐릭터 추가 → 문서 화면 → 편집 → 저장 → 목록에 반영되는지
- [ ] 편집 화면에서 정보의 `작품` 을 바꿔 저장하면 목록의 작품이 따라 바뀌는지
- [ ] 한 줄 설명은 만들 때만 정한다 (고치는 화면은 아직 없음)
- [ ] 이미 있는 문서(작품, 한 줄 설명 열이 비어 있음)는 목록에 "작품 미정"으로 나온다. 편집 화면에서 한 번 저장하면 작품이 채워진다.
- [ ] dev 서버 준비: Cloudflare Public Hostname + Nginx + 별도 컨테이너 + 별도 Supabase

## 문구와 자산
- [ ] 소개 일본어·영어 문단 검수 (`src/content/about.ts`) — 영어는 Kelp 로 고침
- [ ] 소개 링크 아이콘 색 확인 (GitHub, X, YouTube)

## 기능
- [ ] 운영자 관리 화면 (지금은 DB에서 직접 추가·삭제)
- [ ] 헤더가 매 요청마다 로그인 상태를 확인해서 페이지가 동적으로 만들어짐 — 느려지면 손보기
- [ ] 이메일 발송 한도(개발용 기본값) — 실제 가입을 받으려면 SMTP 연결
- [ ] 언어 선택 (처음 접속 때 한국어, 일본어, 영어 고르기). 소개 말고 사이트 전체 문구를 번역한다 → 화면 문구를 언어별 파일로 모으는 작업이 먼저다

## 서버
- 집 서버 디스크는 루트가 좁음 (`/data/kerupu` 사용 중). 자세한 건 `docs/deploy.md`.
- 배포: 서버에서 `git pull` 후 `docker compose up -d --build`.
