# 운영 서버 배포 (Docker)

집 서버에 Docker로 올리는 방법입니다. 이미지는 서버에서 직접 빌드합니다(레지스트리 없음).

## 파일

| 파일 | 하는 일 |
|---|---|
| `Dockerfile` | 의존성 설치 → 빌드 → 실행 이미지, 세 단계. 최종 이미지에는 실행에 필요한 것만 남는다 (Node 24, 루트가 아닌 사용자) |
| `docker-compose.yml` | 컨테이너 한 개(`web`). 재시작 정책, 포트, 읽기 전용 파일 시스템 |
| `.dockerignore` | 이미지에 넣지 않는 것 (`node_modules`, `.git`, `.env*`, `docs`, `design`, 테스트) |
| `next.config.ts` | `output: "standalone"` — `.next/standalone/server.js` 하나로 실행 |

## 처음 올리기

서버에 Docker와 Compose 플러그인이 있어야 한다 (`docker compose version`으로 확인).

```bash
git clone https://github.com/kerupu526/kerupu-workspace.git
cd kerupu-workspace
docker compose up -d --build
```

확인:

```bash
docker compose ps          # STATUS 가 healthy 가 되면 정상
curl -I http://localhost:3000/
docker compose logs -f web # 로그 보기
```

## 새 버전 올리기

```bash
cd kerupu-workspace
git pull
docker compose up -d --build
docker image prune -f      # 안 쓰는 옛 이미지 정리
```

## 되돌리기

문제가 생기면 이전 커밋으로 돌아가 다시 빌드한다.

```bash
git log --oneline -5       # 돌아갈 커밋 확인
git checkout <커밋>
docker compose up -d --build
```

(다시 최신으로 가려면 `git checkout main && git pull`.)

## 앞에 리버스 프록시를 둘 때

도메인(kerupu.tech)과 HTTPS는 Caddy나 nginx 같은 리버스 프록시가 맡는다. 그럴 때는 `docker-compose.yml`의 포트를 `"127.0.0.1:3000:3000"`으로 바꿔서 서버 밖에서 3000번으로 바로 들어오지 못하게 한다.

Caddy 예시 (HTTPS 인증서는 자동):

```
kerupu.tech {
    reverse_proxy 127.0.0.1:3000
}
```

nginx 예시:

```nginx
server {
    server_name kerupu.tech;
    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

## 환경 변수와 비밀값 (Supabase)

값 없는 견본이 `.env.example`에 있다. **실제 값은 서버의 `.env` 파일에만 둔다.**

```bash
cd kerupu-workspace
cp .env.example .env
chmod 600 .env     # 다른 사용자가 못 읽게
nano .env          # 값을 채운다 (Supabase 대시보드 > Project Settings 에서 복사)
docker compose up -d --build
```

| 변수 | 공개 여부 | 쓰이는 때 |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | 공개 (브라우저로 나감) | **빌드할 때** 코드에 박힘 + 실행 |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | 공개 (브라우저로 나감) | **빌드할 때** 코드에 박힘 + 실행 |
| `SUPABASE_SERVICE_ROLE_KEY` | **비밀** (RLS 우회) | 실행할 때만. 서버 코드에서만 가져온다 |
| `SUPABASE_DB_PASSWORD` | **비밀** | 마이그레이션, 백업 같은 관리 작업에만. 웹 앱은 쓰지 않는다 |

지켜야 할 것:

- **`.env`는 어디에도 올리지 않는다.** `.gitignore`와 `.dockerignore`로 막혀 있다 (견본 `.env.example`만 올라간다). 올라갔는지 의심되면 `git ls-files | grep env`로 확인한다.
- **비밀값을 채팅, 이슈, 커밋 메시지, 로그에 붙여 넣지 않는다.** 이 저장소를 다루는 AI 도구에게도 값을 알려 주지 않는다 (키 이름과 어디에 두는지만 말하면 충분하다).
- **`NEXT_PUBLIC_`은 브라우저에 공개된다는 뜻이다.** 비밀값에는 절대 붙이지 않는다. 공개 값(anon 키)은 노출돼도 되도록 모든 테이블에 RLS를 켜 둔다.
- **공개 값을 바꾸면 이미지를 다시 빌드한다** (`docker compose up -d --build`). 비밀값만 바꾸면 `docker compose up -d`로 컨테이너만 다시 만들면 된다.
- 비밀값은 빌드 인자로 넘기지 않는다. 이미지 기록에 남기 때문이다. `docker-compose.yml`은 공개 값 두 개만 빌드 인자로, 나머지는 실행할 때 `env_file`로 넘긴다.
- 키가 노출됐다고 의심되면 Supabase 대시보드에서 바로 재발급(rotate)하고 `.env`를 고친 뒤 다시 올린다.
- 개발 컴퓨터에서는 `.env.example`을 `.env.local`로 복사해 쓴다 (`npm run dev`가 읽는다).

더 안전하게 하려면(나중에): Docker secrets나 서버의 비밀값 관리 도구로 옮길 수 있다. 지금 규모에서는 권한을 `600`으로 한 `.env`로 충분하다.

## 알아 둘 것

- **개발 서버 주소:** `next.config.ts`의 `allowedDevOrigins`(Tailscale 주소)는 개발 서버용이라 운영 컨테이너에는 영향이 없다.
- **파일 시스템:** 컨테이너는 읽기 전용이다. Next가 임시로 쓰는 `/tmp`와 `.next/cache`만 메모리(tmpfs)로 열어 두었다. 나중에 파일을 저장해야 하면(이미지 업로드 등) 볼륨을 따로 붙인다.
- **편집 화면(`/dictionary/*/edit`)**은 `noindex`로 검색에 나오지 않게 해 두었다. 아직 저장 기능이 없어서 고친 글은 새로고침하면 사라진다.
- **로컬에서 확인한 것:** 이 저장소에서 `next build` 결과(`.next/standalone`)를 이미지와 같은 배치로 놓고 실행해 모든 화면과 정적 파일이 응답하는 것까지 확인했다. Docker 이미지 빌드 자체는 서버에서 처음 확인한다.
