import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // dev 서버가 AGENTS.md를 자동 생성하지 않게 한다 (이번 단계 범위 밖).
  agentRules: false,
};

export default nextConfig;
