import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Docker 이미지에 필요한 파일만 모아서 작게 만든다 (.next/standalone/server.js 로 실행).
  output: "standalone",

  // dev 서버가 AGENTS.md를 자동 생성하지 않게 한다 (이번 단계 범위 밖).
  agentRules: false,
  // localhost 가 아닌 주소(Tailscale)로 개발 서버에 접속할 때, 막히지 않고 스크립트가 불러와지게 한다.
  // 막히면 화면은 보이는데 버튼·모달이 동작하지 않는다.
  allowedDevOrigins: ["100.115.172.37"],

  // 글꼴 파일은 1년 동안 다시 확인하지 않고 캐시한다 (Next 기본은 매번 다시 확인).
  // 파일 이름이 같은 채로 내용을 바꾸면 방문자 캐시에 옛 글꼴이 남으므로, 바꿀 때는 파일 이름도 바꾼다.
  async headers() {
    return [
      {
        source: "/fonts/:path*",
        headers: [{ key: "Cache-Control", value: "public, max-age=31536000, immutable" }],
      },
    ];
  },
};

export default nextConfig;
