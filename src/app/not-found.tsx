import type { Metadata } from "next";

export const metadata: Metadata = { title: "페이지를 찾을 수 없음" };

export default function NotFound() {
  return <h1>페이지를 찾을 수 없습니다</h1>;
}
