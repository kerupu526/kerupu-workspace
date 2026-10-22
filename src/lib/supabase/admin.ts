import "server-only";
import { createClient } from "@supabase/supabase-js";

/*
 * 관리자 권한(secret 키) Supabase 클라이언트. RLS 를 건너뛰므로 꼭 필요한 서버 작업에만 쓴다.
 * 지금은 이미지 업로드에서만 쓴다: 파일을 우리 서버가 먼저 검사한 뒤에만 Storage 에 올리고,
 * 브라우저가 Storage 에 직접 올리지는 못하게 막아 두었다 (SVG 안의 스크립트 같은 것을 걸러내려고).
 * 이 클라이언트를 쓰는 코드는 로그인 여부를 직접 확인해야 한다. 키는 SUPABASE_SECRET_KEY 이고 브라우저로 보내지 않는다.
 */
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY;
  if (!url || !key) {
    throw new Error("Supabase 주소나 secret 키(SUPABASE_SECRET_KEY)가 설정되지 않았습니다 (.env 확인).");
  }
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}
