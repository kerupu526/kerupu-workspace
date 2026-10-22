import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { ButtonLink } from "@/components/Button";
import Card from "@/components/Card";
import Chip from "@/components/Chip";
import PageFrame from "@/components/PageFrame";
import { canDelete, deleteBlockedNote, deletePermission } from "@/lib/deletion";
import { formatKst } from "@/lib/wiki/dashboard";
import { IMAGE_LIST_LIMIT, listImages, type StoredImage } from "@/lib/wiki/images";
import { getViewer } from "@/lib/wiki/viewer";
import styles from "./page.module.css";

export const metadata: Metadata = { title: "이미지 관리", robots: { index: false, follow: false } };

function sizeLabel(bytes: number | null): string {
  if (bytes === null) return "";
  return bytes >= 1024 * 1024 ? `${(bytes / 1024 / 1024).toFixed(1)}MB` : `${Math.max(1, Math.round(bytes / 1024))}KB`;
}

function ImageItem({ image, viewerId, isOperator }: { image: StoredImage; viewerId: string; isOperator: boolean }) {
  const mine = image.ownerId === viewerId;
  const permission = deletePermission({ isOperator, isAuthor: mine, createdAt: image.createdAt });
  const blocked = deleteBlockedNote(permission);
  return (
    <Card as="li" className={styles.item}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={image.url} alt={image.originalName ?? "올린 이미지"} className={styles.thumb} loading="lazy" />
      <p className={styles.name}>{image.originalName ?? "이름 없는 이미지"}</p>
      <p className={styles.meta}>
        {[sizeLabel(image.bytes), formatKst(image.createdAt)].filter(Boolean).join(" · ")}
      </p>
      {isOperator && !mine ? <Chip>다른 사람이 올림</Chip> : null}
      {blocked ? <p className={styles.meta}>{blocked}</p> : null}
      <div className={styles.itemActions}>
        <ButtonLink href={image.url} variant="secondary" size="compact" target="_blank" rel="noopener">
          원본 보기
        </ButtonLink>
        {canDelete(permission) ? (
          <ButtonLink href={`/images/${image.id}/delete`} variant="secondary" size="compact">
            삭제
          </ButtonLink>
        ) : null}
      </div>
    </Card>
  );
}

/*
 * 이미지 관리 화면. 내가 올린 이미지를 보고 지운다 (운영자는 모든 이미지).
 * 삭제는 영구 삭제이고, 운영자는 언제든, 올린 사람은 올린 지 30분이 지나고 30일이 지나기 전에만 지울 수 있다.
 */
export default async function ImagesPage({ searchParams }: { searchParams: Promise<{ deleted?: string }> }) {
  const { deleted } = await searchParams;
  const viewer = await getViewer();
  if (!viewer) redirect("/login");

  const { items, truncated } = await listImages();

  return (
    <PageFrame>
      <div className={styles.layout}>
        <div className={styles.head}>
          <h1 className={styles.title}>{viewer.isOperator ? "이미지 관리 (모든 이미지)" : "내 이미지"}</h1>
          <div className={styles.actions}>
            <ButtonLink href="/dictionary" variant="secondary" size="compact">
              캐릭터 사전으로
            </ButtonLink>
            <ButtonLink href="/images/new" size="compact">
              새 이미지 업로드
            </ButtonLink>
          </div>
        </div>

        {deleted ? (
          <p className={styles.notice} role="status">
            이미지를 삭제했어요.
          </p>
        ) : null}
        <p className={styles.note}>
          삭제는 되돌릴 수 없어요. 올린 사람은 올린 지 30분이 지나고 30일이 지나기 전에만 직접 지울 수 있고, 운영자는 언제든 지울 수 있어요.
        </p>

        {items.length === 0 ? (
          <p className={styles.empty}>아직 올린 이미지가 없어요.</p>
        ) : (
          <ul className={styles.grid} aria-label="이미지 목록">
            {items.map((image) => (
              <ImageItem key={image.id} image={image} viewerId={viewer.id} isOperator={viewer.isOperator} />
            ))}
          </ul>
        )}
        {truncated ? <p className={styles.note}>이미지가 많아서 최근 {IMAGE_LIST_LIMIT}장까지만 보여 줘요.</p> : null}
      </div>
    </PageFrame>
  );
}
