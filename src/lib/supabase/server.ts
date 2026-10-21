import "server-only";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

/*
 * 서버 쪽 Supabase 클라이언트. 로그인한 사용자의 세션을 쿠키로 읽고 쓴다.
 * 여기서는 publishable 키만 쓴다. secret 키(SUPABASE_SECRET_KEY)는 이 파일에서 쓰지 않는다 (RLS 를 건너뛰므로).
 * NEXT_PUBLIC_ 값은 빌드할 때 코드에 박히므로, 값이 없으면 빌드 단계에서 알 수 있도록 여기서 확인한다.
 */
export async function createClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) {
    throw new Error("Supabase 주소나 publishable 키가 설정되지 않았습니다 (.env 확인).");
  }

  const cookieStore = await cookies();
  return createServerClient(url, key, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          for (const { name, value, options } of cookiesToSet) {
            cookieStore.set(name, value, options);
          }
        } catch {
          // 화면을 그리는 중에는 쿠키를 쓸 수 없다. 로그인, 로그아웃 동작(Server Action)에서 쓰면 된다.
        }
      },
    },
  });
}
