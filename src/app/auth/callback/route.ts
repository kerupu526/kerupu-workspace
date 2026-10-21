import type { EmailOtpType } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

/*
 * 이메일 확인 링크가 도착하는 곳. 확인이 끝나면 세션을 만들고 로그인 페이지로 보낸다.
 *   - code: PKCE 방식 링크 (signUp 할 때 같은 브라우저에 남긴 값으로 교환한다)
 *   - token_hash + type: 메일 템플릿을 TokenHash 로 바꾼 경우
 * 어느 쪽도 맞지 않으면 실패로 보고 로그인 페이지에 안내를 남긴다.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const code = searchParams.get("code");
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;

  // 다른 사이트로 보내지 않도록 이동 주소는 이 사이트 안의 경로만 허용한다
  const nextParam = searchParams.get("next") ?? "/login";
  const next = nextParam.startsWith("/") && !nextParam.startsWith("//") ? nextParam : "/login";

  const supabase = await createClient();
  let ok = false;

  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    ok = !error;
  } else if (tokenHash && type) {
    const { error } = await supabase.auth.verifyOtp({ type, token_hash: tokenHash });
    ok = !error;
  }

  // 이동 주소도 고정 설정(SITE_URL)을 기준으로 한다 (요청 주소가 0.0.0.0 같은 접속용 주소일 수 있다)
  const base = process.env.SITE_URL ?? origin;
  const target = new URL(ok ? next : "/login?error=confirm", base);
  return NextResponse.redirect(target);
}
