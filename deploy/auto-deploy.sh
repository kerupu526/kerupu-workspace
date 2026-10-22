#!/usr/bin/env bash
# 서버가 직접 새 커밋을 확인해서 배포하는 스크립트. 사용법과 cron 설정은 docs/deploy.md 의 "자동 배포" 참고.
#
#   auto-deploy.sh <프로젝트 폴더> <브랜치> [--hold-on-migrations] [--force]
#
# 하는 일 (cron 이 1분마다 부른다. 새 커밋이 없으면 아무 말 없이 끝난다):
#   1. origin/<브랜치> 에 새 커밋이 있는지 본다
#   2. 있으면 fast-forward 로 받고 `"$docker" compose up -d --build` 로 올린다
#   3. 컨테이너가 healthy 가 될 때까지 기다린다
#   4. 빌드가 깨지거나 healthy 가 되지 않으면 이전 커밋으로 되돌리고, 그 커밋은 다시 시도하지 않는다
#
# 옵션
#   --hold-on-migrations  새 커밋에 supabase/migrations 변경이 있으면 올리지 않고 기다린다.
#                         DB 에 먼저 적용한 뒤 --force 로 한 번 직접 실행한다. (운영에 권장)
#   --force               보류나 "이미 실패한 커밋" 표시를 무시하고 지금 올린다 (새 커밋이 없어도 다시 빌드한다)
#
# DB 마이그레이션은 이 스크립트가 적용하지 않는다. 비밀값(DB 비밀번호)을 쓰지 않기 위해서다.
set -euo pipefail

# 배포 중에 git 이 이 파일을 새 버전으로 바꿔도 실행이 꼬이지 않도록, 복사본으로 다시 실행한다.
if [ -z "${KERUPU_DEPLOY_COPY:-}" ]; then
  copy=$(mktemp)
  cp "$0" "$copy"
  KERUPU_DEPLOY_COPY=$copy exec bash "$copy" "$@"
fi
trap 'rm -f "$KERUPU_DEPLOY_COPY"' EXIT

usage() {
  echo "사용법: auto-deploy.sh <프로젝트 폴더> <브랜치> [--hold-on-migrations] [--force]" >&2
  exit 2
}

[ $# -ge 2 ] || usage
dir=$1
branch=$2
shift 2
hold=0
force=0
for arg in "$@"; do
  case $arg in
    --hold-on-migrations) hold=1 ;;
    --force) force=1 ;;
    *) usage ;;
  esac
done

# 시험할 때만 바꾼다 (가짜 docker 로 흐름을 확인). 평소에는 건드리지 않는다.
docker=${KERUPU_DEPLOY_DOCKER:-docker}
health_tries=${KERUPU_DEPLOY_HEALTH_TRIES:-30}
health_wait=${KERUPU_DEPLOY_HEALTH_WAIT:-2}

log() { printf '%s %s\n' "$(date '+%F %T')" "$*"; }

name=$(basename "$dir")
state=${KERUPU_DEPLOY_STATE:-${XDG_STATE_HOME:-$HOME/.local/state}/kerupu-deploy}
mkdir -p "$state"

# 같은 폴더에서 두 번 동시에 돌지 않게 한다 (빌드가 1분보다 오래 걸릴 수 있다)
exec 9>"$state/$name.lock"
flock -n 9 || exit 0

cd "$dir"

if [ "$(git rev-parse --abbrev-ref HEAD)" != "$branch" ]; then
  log "[$name] 중단: 지금 브랜치가 $branch 가 아니다 ($(git rev-parse --abbrev-ref HEAD))"
  exit 1
fi
if [ -n "$(git status --porcelain --untracked-files=no)" ]; then
  log "[$name] 중단: 커밋하지 않은 변경이 있다. 정리한 뒤 다시 실행된다"
  exit 1
fi

git fetch --quiet origin "$branch"
old=$(git rev-parse HEAD)
new=$(git rev-parse "origin/$branch")

if [ "$old" = "$new" ] && [ "$force" -eq 0 ]; then
  exit 0
fi

failed_file="$state/$name.failed"
held_file="$state/$name.held"

if [ "$force" -eq 0 ] && [ "$(cat "$failed_file" 2>/dev/null || true)" = "$new" ]; then
  exit 0 # 이미 실패한 커밋이다. 새 커밋이 올라오면 다시 시도한다
fi

if [ "$old" != "$new" ] && ! git merge-base --is-ancestor "$old" "$new"; then
  echo "$new" >"$failed_file"
  log "[$name] 중단: ${new:0:7} 은 ${old:0:7} 에서 이어지지 않는다 (히스토리가 바뀜). 서버에서 직접 확인이 필요하다"
  exit 1
fi

if [ "$hold" -eq 1 ] && [ "$force" -eq 0 ] && ! git diff --quiet "$old" "$new" -- supabase/migrations; then
  if [ "$(cat "$held_file" 2>/dev/null || true)" != "$new" ]; then
    echo "$new" >"$held_file"
    log "[$name] 보류: ${new:0:7} 에 마이그레이션 변경이 있다. DB 에 적용한 뒤 --force 로 한 번 실행해 달라"
  fi
  exit 0
fi

log "[$name] 배포 시작: ${old:0:7} -> ${new:0:7}"

# 루트가 좁은 서버라서 여유가 3GB 아래면 빌드 캐시를 먼저 정리한다 (실행 중인 컨테이너에는 영향이 없다)
avail_kb=$(df --output=avail -k / | tail -n 1 | tr -d ' ')
if [ "$avail_kb" -lt 3145728 ]; then
  log "[$name] 루트 여유가 적어 빌드 캐시를 정리한다"
  "$docker" builder prune -f >/dev/null
fi

if [ "$old" != "$new" ]; then
  git merge --ff-only --quiet "origin/$branch"
fi

# 이전 커밋으로 되돌린다. rebuild=1 이면 이전 커밋으로 다시 빌드해서 올린다.
rollback() {
  local rebuild=$1
  echo "$new" >"$failed_file"
  git reset --hard --quiet "$old"
  if [ "$rebuild" -eq 1 ]; then
    log "[$name] 이전 커밋 ${old:0:7} 로 되돌려 다시 올린다"
    "$docker" compose up -d --build || log "[$name] 되돌린 빌드도 실패했다. 서버에서 직접 확인이 필요하다"
  else
    log "[$name] 실행 중이던 컨테이너는 그대로다. 이 커밋(${new:0:7})은 다시 시도하지 않는다"
  fi
}

# 빌드가 실패하면 compose 는 컨테이너를 바꾸지 않으므로 이전 버전이 계속 실행된다
if ! "$docker" compose up -d --build; then
  log "[$name] 실패: 빌드 또는 시작 오류"
  rollback 0
  exit 1
fi

cid=$("$docker" compose ps -q web)
status=unknown
for _ in $(seq 1 "$health_tries"); do
  status=$("$docker" inspect --format '{{if .State.Health}}{{.State.Health.Status}}{{else}}{{.State.Status}}{{end}}' "$cid" 2>/dev/null || echo unknown)
  case $status in healthy | running) break ;; esac
  sleep "$health_wait"
done
case $status in
  healthy | running) ;;
  *)
    log "[$name] 실패: 컨테이너가 정상이 되지 않았다 (상태: $status)"
    rollback 1
    exit 1
    ;;
esac

rm -f "$failed_file" "$held_file"
"$docker" image prune -f >/dev/null
log "[$name] 배포 완료: ${new:0:7} ($status)"
