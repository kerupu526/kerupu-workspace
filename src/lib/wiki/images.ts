import "server-only";
import { createClient } from "@/lib/supabase/server";
import { mediaPath } from "@/lib/wiki/image-url";

/* 이미지 관리 화면에 보여 줄 올린 이미지. 읽기는 로그인한 본인의 세션으로 한다 (RLS: 올린 사람과 운영자만 본다). */
export interface StoredImage {
  id: string;
  ownerId: string;
  /** 글에 쓰는 사이트 안 경로 (/media/...) */
  url: string;
  originalName: string | null;
  mime: string | null;
  bytes: number | null;
  /** 올린 시각 (ISO 문자열) */
  createdAt: string;
}

/* 한 번에 보여 줄 이미지 수의 상한 */
export const IMAGE_LIST_LIMIT = 60;

interface ImageRow {
  id: string;
  owner_id: string;
  path: string;
  original_name: string | null;
  mime: string | null;
  bytes: number | string | null;
  created_at: string;
}

function toStoredImage(row: ImageRow): StoredImage {
  return {
    id: row.id,
    ownerId: row.owner_id,
    url: mediaPath(row.path),
    originalName: row.original_name,
    mime: row.mime,
    bytes: row.bytes === null ? null : Number(row.bytes),
    createdAt: row.created_at,
  };
}

/* 내가 올린 이미지 (운영자는 모든 이미지). 최근에 올린 순. */
export async function listImages(): Promise<{ items: StoredImage[]; truncated: boolean }> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("images")
    .select("id, owner_id, path, original_name, mime, bytes, created_at")
    .order("created_at", { ascending: false })
    .limit(IMAGE_LIST_LIMIT + 1);
  if (error || !data) return { items: [], truncated: false };
  return { items: data.slice(0, IMAGE_LIST_LIMIT).map(toStoredImage), truncated: data.length > IMAGE_LIST_LIMIT };
}

export async function getImage(id: string): Promise<StoredImage | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("images")
    .select("id, owner_id, path, original_name, mime, bytes, created_at")
    .eq("id", id)
    .maybeSingle();
  return data ? toStoredImage(data) : null;
}

export interface ImageUsage {
  slug: string;
  title: string;
}

/*
 * 이 이미지를 지금 쓰고 있는 문서 (현재 판의 본문, 또는 목록 카드의 대표 이미지).
 * 파일 ID(무작위 UUID)가 글에 들어 있는지로 찾는다. 이전 판에만 있는 것은 세지 않는다.
 */
export async function findImageUsage(imageId: string): Promise<ImageUsage[]> {
  const supabase = await createClient();
  const found = new Map<string, string>();

  const { data: byCard } = await supabase.from("documents").select("slug, title").ilike("image", `%${imageId}%`).limit(50);
  for (const doc of byCard ?? []) found.set(doc.slug, doc.title);

  const { data: revisions } = await supabase
    .from("document_revisions")
    .select("id")
    .ilike("markdown", `%${imageId}%`)
    .limit(200);
  const ids = (revisions ?? []).map((row) => row.id);
  if (ids.length > 0) {
    const { data: docs } = await supabase.from("documents").select("slug, title").in("current_revision_id", ids).limit(50);
    for (const doc of docs ?? []) found.set(doc.slug, doc.title);
  }

  return [...found].map(([slug, title]) => ({ slug, title }));
}
