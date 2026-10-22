import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Button, ButtonLink } from "@/components/Button";
import Card from "@/components/Card";
import PageFrame from "@/components/PageFrame";
import formStyles from "@/components/CharacterForm.module.css";
import styles from "@/components/DeletePage.module.css";
import { canDelete, deleteBlockedNote, deletePermission, deletionErrorMessage } from "@/lib/deletion";
import { findImageUsage, getImage } from "@/lib/wiki/images";
import { getViewer } from "@/lib/wiki/viewer";
import { deleteImage } from "./actions";

export const metadata: Metadata = { title: "이미지 삭제", robots: { index: false, follow: false } };

const ID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

/*
 * 이미지 삭제 확인 화면. Storage 의 파일과 기록이 영구히 지워진다.
 * 운영자는 언제든, 올린 사람은 올린 지 30분이 지나고 30일이 지나기 전에만 지울 수 있다 (DB 가 한 번 더 검사한다).
 * 이 이미지를 쓰고 있는 문서가 있으면 어떤 문서인지 알려 준다 (지우면 그 문서의 그림이 깨진다).
 */
export default async function DeleteImagePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { id } = await params;
  const { error } = await searchParams;
  if (!ID.test(id)) notFound();

  const viewer = await getViewer();
  if (!viewer) redirect("/login");

  const image = await getImage(id);
  if (!image) notFound();

  const usage = await findImageUsage(id);
  const permission = deletePermission({
    isOperator: viewer.isOperator,
    isAuthor: image.ownerId === viewer.id,
    createdAt: image.createdAt,
  });
  const blocked = deleteBlockedNote(permission);
  const message = error ? deletionErrorMessage(error) : null;

  return (
    <PageFrame>
      <h1 className="visually-hidden">이미지 삭제</h1>
      <div className={styles.center}>
        <Card as="section" className={formStyles.card} aria-labelledby="image-delete-title">
          <h2 className={formStyles.title} id="image-delete-title">
            이미지 삭제
          </h2>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={image.url} alt={image.originalName ?? "삭제할 이미지"} className={styles.thumb} />
          <p className={styles.what}>{image.originalName ?? "이름 없는 이미지"}</p>

          {canDelete(permission) ? (
            <>
              <p className={styles.warning}>삭제하면 되돌릴 수 없어요.</p>
              <ul className={styles.list}>
                <li>이미지 파일이 영구히 지워져요. 브라우저나 CDN 에 남은 사본은 최대 하루쯤 더 보일 수 있어요.</li>
                {usage.length > 0 ? (
                  <li>
                    지금 이 이미지를 쓰는 문서가 있어요. 지우면 그 문서에서 그림이 깨져 보여요:{" "}
                    {usage.map((doc, i) => (
                      <span key={doc.slug}>
                        {i > 0 ? ", " : ""}
                        <Link href={`/dictionary/${doc.slug}`} className={styles.link}>
                          {doc.title}
                        </Link>
                      </span>
                    ))}
                  </li>
                ) : (
                  <li>이 이미지를 쓰는 문서는 찾지 못했어요.</li>
                )}
                {permission.kind === "author" ? (
                  <li>올린 사람은 올린 지 30일이 지나기 전까지만 직접 지울 수 있어요 (약 {permission.daysLeft}일 남았어요).</li>
                ) : (
                  <li>운영자라서 언제든 바로 지울 수 있어요.</li>
                )}
              </ul>
              <form className={formStyles.form} action={deleteImage}>
                <input type="hidden" name="id" value={image.id} />
                <p className={styles.error} role="status">
                  {message ?? ""}
                </p>
                <div className={formStyles.actions}>
                  <ButtonLink href="/images" variant="secondary">
                    그만두기
                  </ButtonLink>
                  <Button type="submit">영구 삭제</Button>
                </div>
              </form>
            </>
          ) : (
            <>
              <p className={styles.what}>{blocked ?? "이 이미지는 올린 사람이나 운영자만 삭제할 수 있어요."}</p>
              {message ? <p className={styles.error}>{message}</p> : null}
              <div className={formStyles.actions}>
                <ButtonLink href="/images" variant="secondary">
                  이미지 관리로
                </ButtonLink>
              </div>
            </>
          )}
        </Card>
      </div>
    </PageFrame>
  );
}
