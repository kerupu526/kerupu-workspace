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

포트와 열 주소는 서버의 `.env`로 바꾼다 (`docker-compose.yml`이 읽는다). 다른 서비스가 3000번을 쓰고 있거나 Tailscale 안으로만 열고 싶을 때:

```bash
# .env
BIND_ADDRESS=100.x.y.z   # 이 서버의 Tailscale 주소 (tailscale ip -4)
HOST_PORT=3100
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

도메인(kerupu.tech)과 HTTPS는 Caddy나 nginx 같은 리버스 프록시가 맡는다. 기본 설정이 이미 `127.0.0.1:3000`(이 컴퓨터 안에서만)이라서 서버 밖에서 바로 들어올 수 없다.

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

## 도메인 연결 (kerupu.tech)

집 서버는 Cloudflare 터널(cloudflared)로 바깥과 이어져 있다. 요청이 오는 길은 이렇다.

```
브라우저 → Cloudflare → cloudflared 터널 → 서버의 Nginx(80번) → 컨테이너(Tailscale 주소 3100번)
```

- 터널은 토큰 방식이라 "kerupu.tech 을 어디로 보낼지"는 서버 파일이 아니라 **Cloudflare 대시보드**(Zero Trust > Networks > Tunnels > 이 터널 > Public Hostname)에 있다. 서비스는 `HTTP`, `localhost:80`으로 둔다.
- Nginx의 `default_server`가 "공사 중" 페이지를 내놓고 있었고, `deploy/nginx/kerupu.tech.conf`가 `Host: kerupu.tech` 요청만 우리 컨테이너로 넘긴다. 다른 요청은 기존 그대로다.
- 설정 파일의 `upstream` 주소(`100.74.143.1:3100`)는 서버 `.env`의 `BIND_ADDRESS`, `HOST_PORT`와 같아야 한다.

설치 (서버에서, `sudo` 필요):

```bash
cd ~/Projects/kerupu-workspace && git pull
sudo cp deploy/nginx/kerupu.tech.conf /etc/nginx/sites-available/kerupu.tech
sudo ln -s /etc/nginx/sites-available/kerupu.tech /etc/nginx/sites-enabled/kerupu.tech
sudo nginx -t                      # 문법 검사. "successful" 이 나와야 다음으로 간다
sudo systemctl reload nginx        # 끊김 없이 새 설정 적용 (restart 아님)
```

확인:

```bash
curl -s -H "Host: kerupu.tech" http://127.0.0.1/ | grep -o "<title>[^<]*"   # 서버 안에서
curl -sI https://kerupu.tech/                                                # 어디서든
```

되돌리기 (이전처럼 "공사 중" 페이지로):

```bash
sudo rm /etc/nginx/sites-enabled/kerupu.tech && sudo nginx -t && sudo systemctl reload nginx
```

알아 둘 것:

- `www.kerupu.tech`는 지금 Cloudflare에 연결되어 있지 않아 404가 난다. 쓰려면 대시보드에 Public Hostname을 추가하고 설정 파일의 `server_name`에 넣는다 (또는 `www`를 `kerupu.tech`로 보내는 리다이렉트를 둔다).
- 컨테이너를 내리면 `kerupu.tech`는 502가 난다. 점검 때는 위의 "되돌리기"로 공사 중 페이지로 바꿔 두면 깔끔하다.
- 방문자의 실제 주소는 `CF-Connecting-IP` 헤더에 있다 (Nginx가 보는 접속 주소는 터널이다). 이 헤더는 Cloudflare를 거치지 않은 직접 접속에서는 조작할 수 있으므로, 속도 제한 같은 곳에 쓸 때는 Nginx가 Cloudflare 주소에서 온 요청만 믿도록 `real_ip` 설정을 추가한다.

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
| `SUPABASE_DB_PASSWORD` | **비밀** | 마이그레이션, 백업 같은 관리 작업에만. 웹 앱은 쓰지 않는다. **`.env`가 아니라 `~/.config/kerupu/admin.env`에 둔다** (아래) |

`.env`는 컨테이너 환경에 통째로 들어가므로, 웹 앱이 쓰지 않는 관리용 비밀(DB 비밀번호)은 컨테이너가 읽지 않는 별도 파일에 둔다.

- 위치: 서버의 `~/.config/kerupu/admin.env` (폴더 700, 파일 600, 저장소 밖)
- 내용: `SUPABASE_DB_PASSWORD=...` 한 줄
- 쓰는 법: 관리 작업을 하는 셸에서만 읽는다. 예: `set -a; . ~/.config/kerupu/admin.env; set +a`
- 확인: `docker exec kerupu printenv | grep -c SUPABASE_DB_PASSWORD` 가 `0`이면 컨테이너에 새지 않은 것이다.
- DB 비밀번호는 쉽게 짐작되는 값을 쓰지 않는다. Supabase의 DB 주소는 인터넷에서 접속할 수 있으므로, 대시보드(Project Settings > Database)에서 무작위로 만든 긴 값으로 재설정한 뒤 이 파일을 고친다.

지켜야 할 것:

- **`.env`는 어디에도 올리지 않는다.** `.gitignore`와 `.dockerignore`로 막혀 있다 (견본 `.env.example`만 올라간다). 올라갔는지 의심되면 `git ls-files | grep env`로 확인한다.
- **비밀값을 채팅, 이슈, 커밋 메시지, 로그에 붙여 넣지 않는다.** 이 저장소를 다루는 AI 도구에게도 값을 알려 주지 않는다 (키 이름과 어디에 두는지만 말하면 충분하다).
- **`NEXT_PUBLIC_`은 브라우저에 공개된다는 뜻이다.** 비밀값에는 절대 붙이지 않는다. 공개 값(anon 키)은 노출돼도 되도록 모든 테이블에 RLS를 켜 둔다.
- **공개 값을 바꾸면 이미지를 다시 빌드한다** (`docker compose up -d --build`). 비밀값만 바꾸면 `docker compose up -d`로 컨테이너만 다시 만들면 된다.
- 비밀값은 빌드 인자로 넘기지 않는다. 이미지 기록에 남기 때문이다. `docker-compose.yml`은 공개 값 두 개만 빌드 인자로, 나머지는 실행할 때 `env_file`로 넘긴다.
- 키가 노출됐다고 의심되면 Supabase 대시보드에서 바로 재발급(rotate)하고 `.env`를 고친 뒤 다시 올린다.
- 개발 컴퓨터에서는 `.env.example`을 `.env.local`로 복사해 쓴다 (`npm run dev`가 읽는다).

더 안전하게 하려면(나중에): Docker secrets나 서버의 비밀값 관리 도구로 옮길 수 있다. 지금 규모에서는 권한을 `600`으로 한 `.env`로 충분하다.

## 서버의 저장 위치 (`/data/kerupu`)

집 서버는 루트(`/`)가 작고(28GB), 별도 파티션 `/data`(78GB)가 넓다. Docker의 이미지와 빌드 캐시는 기본 위치(`/var/lib/docker`, 루트 쪽)에 쌓이므로 **루트 여유를 가끔 확인한다** (`df -h /`).

우리 프로젝트의 영구 파일은 `/data/kerupu` 아래에 둔다 (컨테이너를 지우거나 다시 만들어도 남는다).

| 폴더 | 용도 | 권한 |
|---|---|---|
| `/data/kerupu/backups` | DB 백업(`pg_dump`, `supabase db dump`) 같은 복구용 파일 | 본인만 (750) |
| `/data/kerupu/uploads` | 이미지 업로드를 서버에 저장하기로 하면 쓸 자리 (아직 쓰지 않음. Supabase Storage를 쓰면 필요 없다) | 755 |

- 백업에는 비밀값이 섞일 수 있으니 `backups`는 본인만 읽게 두고, `.env` 파일 자체를 복사해 두지 않는다 (비밀값을 여러 곳에 퍼뜨리지 않는다).
- 컨테이너는 지금 읽기 전용이다. 파일을 저장해야 하면 `docker-compose.yml`에 이 폴더를 볼륨으로 붙인다 (컨테이너 사용자가 쓸 수 있는 권한도 함께 맞춘다).
- **Docker 자체의 저장 위치를 `/data`로 옮기면** 루트가 좁은 문제가 근본적으로 풀리지만, 서버의 모든 컨테이너를 잠깐 멈추고 `sudo`가 필요하다. 다른 서비스와 함께 정할 일이라 지금은 하지 않았다.
- 디스크가 모자라면 안 쓰는 것부터 정리한다: `docker builder prune`(빌드 캐시), `docker image prune`(이름 없는 이미지). 다른 프로젝트 이미지가 섞여 있으니 `docker system prune -a`는 쓰지 않는다.

## 알아 둘 것

- **개발 서버 주소:** `next.config.ts`의 `allowedDevOrigins`(Tailscale 주소)는 개발 서버용이라 운영 컨테이너에는 영향이 없다.
- **파일 시스템:** 컨테이너는 읽기 전용이다. Next가 임시로 쓰는 `/tmp`와 `.next/cache`만 메모리(tmpfs)로 열어 두었다. 나중에 파일을 저장해야 하면(이미지 업로드 등) 볼륨을 따로 붙인다.
- **편집 화면(`/dictionary/*/edit`)**은 `noindex`로 검색에 나오지 않게 해 두었다. 아직 저장 기능이 없어서 고친 글은 새로고침하면 사라진다.
- **로컬에서 확인한 것:** 이 저장소에서 `next build` 결과(`.next/standalone`)를 이미지와 같은 배치로 놓고 실행해 모든 화면과 정적 파일이 응답하는 것까지 확인했다. Docker 이미지 빌드 자체는 서버에서 처음 확인한다.
