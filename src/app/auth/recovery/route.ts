import type { EmailOtpType } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { RECOVERY_COOKIE, RECOVERY_COOKIE_PATH, RECOVERY_MAX_AGE_SECONDS } from "@/lib/recovery";

/*
 * 비밀번호 재설정 메일의 링크가 도착하는 곳 (/auth/callback 과 같은 방식으로 링크를 확인한다).
 * 확인이 끝나면 세션을 만들고 "재설정 표식" 쿠키를 남긴 뒤 새 비밀번호를 정하는 화면으로 보낸다.
 * 링크가 맞지 않으면 재설정 요청 화면에 안내를 남긴다.
 * 대시보드의 Redirect URLs 에 이 주소(/auth/recovery)가 허용되어 있어야 한다.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const code = searchParams.get("code");
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;

  const supabase = await createClient();
  let ok = false;

  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    ok = !error;
  } else if (tokenHash && type === "recovery") {
    const { error } = await supabase.auth.verifyOtp({ type, token_hash: tokenHash });
    ok = !error;
  }

  // 이동 주소도 고정 설정(SITE_URL)을 기준으로 한다 (요청 주소가 0.0.0.0 같은 접속용 주소일 수 있다)
  const base = process.env.SITE_URL ?? origin;

  if (!ok) return NextResponse.redirect(new URL("/login/reset?error=link", base));

  const cookieStore = await cookies();
  cookieStore.set(RECOVERY_COOKIE, "1", {
    httpOnly: true,
    sameSite: "lax",
    secure: new URL(base).protocol === "https:",
    // 새 비밀번호 화면과 그 저장 요청에서만 쓴다
    path: RECOVERY_COOKIE_PATH,
    maxAge: RECOVERY_MAX_AGE_SECONDS,
  });
  return NextResponse.redirect(new URL("/account/reset-password", base));
}
