import { IMAGE_BUCKET, MEDIA_TYPES, mediaObjectPath } from "@/lib/wiki/image-url";

/*
 * 올린 이미지를 우리 사이트 주소(/media/<사용자 ID>/<파일 ID>.<확장자>)로 내려 준다.
 * Storage 의 images 버킷(공개)에서 받아서 그대로 흘려 보내고, 헤더는 여기서 정한다:
 *   - 파일 이름이 무작위 ID 라서 내용은 바뀌지 않지만, 삭제된 이미지가 오래 남지 않도록 하루만 캐시한다 (Cloudflare 와 브라우저가 이 캐시를 쓴다).
 *   - 형식(Content-Type)은 Storage 가 준 값이 아니라 확장자로 정한다.
 *   - SVG 를 주소로 직접 열어도 스크립트가 돌지 않도록 CSP(sandbox, default-src 'none')를 붙이고 nosniff 를 켠다.
 *     (그림으로 <img> 에 넣을 때는 이 헤더와 상관없이 스크립트가 돌지 않는다)
 * 두 조각이 UUID 모양이 아니거나 허용하지 않는 확장자면 Storage 에 묻지도 않고 404 이다 (다른 버킷이나 경로를 열 수 없다).
 */
const SAFE_HEADERS = {
  "x-content-type-options": "nosniff",
  "content-security-policy": "default-src 'none'; style-src 'unsafe-inline'; sandbox",
} as const;

export async function GET(_request: Request, { params }: { params: Promise<{ uid: string; file: string }> }) {
  const { uid, file } = await params;
  const target = mediaObjectPath(uid, file);
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!target || !base) return new Response("Not Found", { status: 404, headers: SAFE_HEADERS });

  let upstream: Response;
  try {
    upstream = await fetch(`${base.replace(/\/+$/, "")}/storage/v1/object/public/${IMAGE_BUCKET}/${target.path}`);
  } catch {
    return new Response("Bad Gateway", { status: 502, headers: SAFE_HEADERS });
  }
  if (upstream.status === 404 || upstream.status === 400) {
    // 없는 파일은 잠깐만 기억한다 (곧 올릴 수도 있다)
    return new Response("Not Found", { status: 404, headers: { ...SAFE_HEADERS, "cache-control": "public, max-age=60" } });
  }
  if (!upstream.ok || !upstream.body) return new Response("Bad Gateway", { status: 502, headers: SAFE_HEADERS });

  const headers: Record<string, string> = {
    ...SAFE_HEADERS,
    "content-type": MEDIA_TYPES[target.ext],
    "cache-control": "public, max-age=86400",
    "content-disposition": "inline",
  };
  const length = upstream.headers.get("content-length");
  if (length) headers["content-length"] = length;
  return new Response(upstream.body, { status: 200, headers });
}
