# 운영 서버용 이미지. 사용법은 docs/deploy.md 참고.
#   docker build -t kerupu-workspace .
#   docker run -d --name kerupu -p 3000:3000 kerupu-workspace
#
# 세 단계로 나눠서 최종 이미지에는 실행에 필요한 것만 남긴다 (소스, 개발 도구, 캐시 제외).

ARG NODE_VERSION=24

# 1단계: 의존성 설치 (package*.json 이 바뀔 때만 다시 실행되어 빌드가 빠르다)
FROM node:${NODE_VERSION}-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

# 2단계: 빌드 (output: "standalone" 이라 .next/standalone 에 실행 파일이 모인다)
FROM node:${NODE_VERSION}-alpine AS build
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1
# NEXT_PUBLIC_ 값은 빌드할 때 코드에 박힌다. .env 는 이미지에 넣지 않으므로 빌드 인자로 받는다.
# 브라우저로 나가도 되는 공개 값만 여기에 둔다. 비밀값(secret 키, DB 비밀번호)은 절대 인자로 넘기지 않는다
# (이미지 기록에 남는다). 비밀값은 실행할 때 env_file 로만 넘긴다.
ARG NEXT_PUBLIC_SUPABASE_URL
ARG NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
ENV NEXT_PUBLIC_SUPABASE_URL=$NEXT_PUBLIC_SUPABASE_URL \
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=$NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

# 3단계: 실행 이미지
FROM node:${NODE_VERSION}-alpine AS run
WORKDIR /app
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=3000 \
    HOSTNAME=0.0.0.0

# 루트가 아닌 사용자로 실행한다
RUN addgroup -S app && adduser -S app -G app

# standalone 결과물에는 public 과 정적 파일이 들어 있지 않아서 따로 복사한다
COPY --from=build --chown=app:app /app/.next/standalone ./
COPY --from=build --chown=app:app /app/.next/static ./.next/static
COPY --from=build --chown=app:app /app/public ./public

USER app
EXPOSE 3000

# 서버가 응답하는지 주기적으로 확인한다 (alpine 에 들어 있는 wget 사용)
HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD wget -q -O /dev/null http://127.0.0.1:3000/ || exit 1

CMD ["node", "server.js"]
