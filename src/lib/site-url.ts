import "server-only";
import { headers } from "next/headers";

/*
 * 이 사이트의 주소. 메일 링크가 여기로 돌아오므로 고정 설정(SITE_URL)을 우선한다.
 * 요청 주소(0.0.0.0 같은 접속용 주소)를 쓰면 메일 링크가 엉뚱한 곳으로 간다.
 */
export async function siteUrl(path: string): Promise<string> {
  const configured = process.env.SITE_URL;
  if (configured) return new URL(path, configured).toString();
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  const proto = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  return `${proto}://${host}${path}`;
}
