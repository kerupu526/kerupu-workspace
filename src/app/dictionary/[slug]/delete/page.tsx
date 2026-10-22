import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { notFound } from "next/navigation";
import { Button, ButtonLink } from "@/components/Button";
import Card from "@/components/Card";
import Field from "@/components/Field";
import PageFrame from "@/components/PageFrame";
import formStyles from "@/components/CharacterForm.module.css";
import styles from "@/components/DeletePage.module.css";
import { canDelete, deleteBlockedNote, deletePermission, deletionErrorMessage } from "@/lib/deletion";
import { getDocumentInfo } from "@/lib/wiki/store";
import { getViewer } from "@/lib/wiki/viewer";
import { deleteDocument } from "./actions";

export const metadata: Metadata = { title: "문서 삭제", robots: { index: false, follow: false } };

/*
 * 캐릭터 문서 삭제 확인 화면. 문서와 모든 판이 영구히 지워지고 되돌릴 수 없다.
 * 운영자는 언제든, 작성자는 만든 지 30분이 지나고 30일이 지나기 전에만 지울 수 있다 (DB 가 한 번 더 검사한다).
 * 문서 주소를 그대로 적어야 삭제 버튼이 눌린다 (실수 방지).
 */
export default async function DeleteDocumentPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { slug } = await params;
  const { error } = await searchParams;

  const viewer = await getViewer();
  if (!viewer) redirect("/login");

  const info = await getDocumentInfo(slug);
  if (!info) notFound();

  const permission = deletePermission({
    isOperator: viewer.isOperator,
    isAuthor: info.createdBy === viewer.id,
    createdAt: info.createdAt,
  });
  const blocked = deleteBlockedNote(permission);

  const message =
    error === "confirm" ? "문서 주소를 똑같이 적어 주세요." : error ? deletionErrorMessage(error) : null;

  return (
    <PageFrame>
      <h1 className="visually-hidden">문서 삭제</h1>
      <div className={styles.center}>
        <Card as="section" className={formStyles.card} aria-labelledby="doc-delete-title">
          <h2 className={formStyles.title} id="doc-delete-title">
            문서 삭제
          </h2>
          <p className={styles.what}>
            <strong>{info.title}</strong> (/dictionary/{info.slug})
          </p>

          {canDelete(permission) ? (
            <>
              <p className={styles.warning}>삭제하면 되돌릴 수 없어요.</p>
              <ul className={styles.list}>
                <li>문서와 지금까지 저장한 모든 판(기록)이 영구히 지워져요.</li>
                <li>같은 주소로 새 문서를 다시 만들 수는 있지만, 지운 내용은 돌아오지 않아요.</li>
                <li>이 문서에 쓴 이미지는 지워지지 않아요. 이미지는 따로 지워야 해요.</li>
                {permission.kind === "author" ? (
                  <li>만든 사람은 만든 지 30일이 지나기 전까지만 직접 지울 수 있어요 (약 {permission.daysLeft}일 남았어요).</li>
                ) : (
                  <li>운영자라서 언제든 바로 지울 수 있어요.</li>
                )}
              </ul>
              <form className={formStyles.form} action={deleteDocument} noValidate>
                <input type="hidden" name="slug" value={info.slug} />
                <Field
                  id="confirm"
                  label={`삭제하려면 문서 주소 “${info.slug}” 를 적어 주세요`}
                  required
                  autoComplete="off"
                  maxLength={80}
                />
                <p className={styles.error} role="status">
                  {message ?? ""}
                </p>
                <div className={formStyles.actions}>
                  <ButtonLink href={`/dictionary/${info.slug}`} variant="secondary">
                    그만두기
                  </ButtonLink>
                  <Button type="submit">영구 삭제</Button>
                </div>
              </form>
            </>
          ) : (
            <>
              <p className={styles.what}>
                {blocked ?? "이 문서는 만든 사람이나 운영자만 삭제할 수 있어요."}
              </p>
              {message ? <p className={styles.error}>{message}</p> : null}
              <div className={formStyles.actions}>
                <ButtonLink href={`/dictionary/${info.slug}`} variant="secondary">
                  문서로 돌아가기
                </ButtonLink>
              </div>
            </>
          )}
          <p className={formStyles.hint}>
            이미지는 <Link href="/images" className={styles.link}>
              이미지 관리
            </Link>에서 지울 수 있어요.
          </p>
        </Card>
      </div>
    </PageFrame>
  );
}
