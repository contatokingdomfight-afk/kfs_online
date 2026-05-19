"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useRouter, useSearchParams } from "next/navigation";
import { getTranslations } from "@/lib/i18n";
import type { Locale } from "@/lib/i18n";
import type { TribeFeedPost } from "@/lib/tribe/feed";
import {
  addTribeCommentAction,
  createTribePostAction,
  deleteOwnTribePostAction,
  listTribeCommentsAction,
  toggleTribeLikeAction,
} from "@/app/dashboard/tribo/actions";
import type { TribeVisibility } from "@/app/dashboard/tribo/actions";
import { TRIBE_IMAGE_MIMES, TRIBE_MAX_MEDIA_BYTES, TRIBE_MAX_MEDIA_FILES } from "@/lib/tribe/constants";

type CommentRow = {
  id: string;
  authorUserId: string;
  body: string;
  createdAt: string;
  authorName: string | null;
  isMine: boolean;
};

function CommentBubbleIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden style={{ flexShrink: 0 }} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 8.5-8.5z" />
    </svg>
  );
}

function ShareNodesIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden style={{ flexShrink: 0 }} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="18" cy="5" r="3" />
      <circle cx="6" cy="12" r="3" />
      <circle cx="18" cy="19" r="3" />
      <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
      <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
    </svg>
  );
}

function TrashIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden style={{ flexShrink: 0 }} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="3 6 5 6 21 6" />
      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
      <line x1="10" y1="11" x2="10" y2="17" />
      <line x1="14" y1="11" x2="14" y2="17" />
    </svg>
  );
}

function BoxingGloveIcon({ active }: { active: boolean }) {
  const c = active ? "var(--primary)" : "var(--text-secondary)";
  return (
    <svg width="26" height="26" viewBox="0 0 24 24" fill="none" aria-hidden style={{ flexShrink: 0 }}>
      <path
        d="M7.5 10.5 5 14c-1.2 1.8-.5 4 1.5 5l2.5 1.5M16 8l2.5-1.5c2-1 2.7-3.2 1.5-5L18 3.5M9 12l-1.5 6M15 9l1.5 7"
        stroke={c}
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M8.5 11c-1.5 2-1 4.5 1 6l4 2.5c2.5 1.5 5.5.5 7-2l2-3.5c1.2-2 .5-4.5-1.5-5.5L13.5 6c-2-1.2-4.5-.5-5.5 1.5L8.5 11Z"
        stroke={c}
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function TribeModal({
  open,
  variant,
  message,
  onClose,
  t,
}: {
  open: boolean;
  variant: "loading" | "saving" | "success" | "error";
  message?: string;
  onClose: () => void;
  t: ReturnType<typeof getTranslations>;
}) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!open || !mounted) return null;
  const title =
    variant === "loading"
      ? t("tribeModalLoadingTitle")
      : variant === "saving"
        ? t("tribeModalSavingTitle")
        : variant === "success"
          ? t("tribePublishSuccess")
          : t("error");
  return createPortal(
    <div className="tribe-modal-backdrop" role="presentation" onClick={variant === "loading" || variant === "saving" ? undefined : onClose}>
      <div
        className="tribe-modal-panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby="tribe-modal-title"
        onClick={(e) => e.stopPropagation()}
      >
        {(variant === "loading" || variant === "saving") && <div className="tribe-spinner" aria-hidden />}
        <h2 id="tribe-modal-title" className="text-base font-semibold mb-2" style={{ color: "var(--text-primary)" }}>
          {title}
        </h2>
        {message ? (
          <p className="text-sm mb-4" style={{ color: "var(--text-secondary)" }}>
            {message}
          </p>
        ) : null}
        {variant !== "loading" && variant !== "saving" ? (
          <button type="button" className="btn btn-primary w-full" onClick={onClose}>
            {t("tribeClose")}
          </button>
        ) : null}
      </div>
    </div>,
    document.body
  );
}

function PostCard({
  post,
  currentUserId,
  t,
  locale,
  onRefresh,
  highlightPostId,
}: {
  post: TribeFeedPost;
  currentUserId: string;
  t: ReturnType<typeof getTranslations>;
  locale: Locale;
  onRefresh: () => void;
  highlightPostId: string | null;
}) {
  const [punch, setPunch] = useState(false);
  const [commentsOpen, setCommentsOpen] = useState(false);
  const [comments, setComments] = useState<CommentRow[] | null>(null);
  const [commentText, setCommentText] = useState("");
  const [commentBusy, setCommentBusy] = useState(false);
  const [shareFlash, setShareFlash] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);

  const dateLabel = useMemo(() => {
    try {
      return new Date(post.createdAt).toLocaleString(locale === "en" ? "en-GB" : "pt-PT", {
        dateStyle: "medium",
        timeStyle: "short",
      });
    } catch {
      return "";
    }
  }, [post.createdAt, locale]);

  const hasMedia = post.media.length > 0;

  async function onToggleLike() {
    const prev = post.likedByMe;
    const res = await toggleTribeLikeAction(post.id);
    if (res.error) return;
    if (res.liked && !prev && hasMedia) {
      setPunch(true);
      window.setTimeout(() => setPunch(false), 650);
    }
    onRefresh();
  }

  async function loadComments() {
    const r = await listTribeCommentsAction(post.id);
    setComments(r.comments ?? []);
  }

  async function onToggleComments() {
    if (!commentsOpen) {
      setCommentsOpen(true);
      if (comments === null) await loadComments();
    } else {
      setCommentsOpen(false);
    }
  }

  async function onSendComment() {
    if (!commentText.trim()) return;
    setCommentBusy(true);
    const r = await addTribeCommentAction(post.id, commentText);
    setCommentBusy(false);
    if (!r.error) {
      setCommentText("");
      await loadComments();
      onRefresh();
    }
  }

  async function onShare() {
    const url = `${window.location.origin}/t/p/${post.id}`;
    try {
      if (navigator.share) {
        await navigator.share({ title: t("tribeTitle"), text: post.body.slice(0, 120), url });
      } else if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(url);
        setShareFlash(true);
        window.setTimeout(() => setShareFlash(false), 2000);
      }
    } catch {
      /* user cancelled share */
    }
  }

  async function onDelete() {
    if (!window.confirm(t("tribeDeleteConfirm"))) return;
    const r = await deleteOwnTribePostAction(post.id);
    if (!r.error) onRefresh();
  }

  useEffect(() => {
    if (highlightPostId === post.id && cardRef.current) {
      cardRef.current.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, [post.id, highlightPostId]);

  const isMine = post.authorUserId === currentUserId;

  return (
    <article
      ref={cardRef}
      className="tribe-card-enter rounded-2xl p-4 mb-4"
      style={{
        background: "var(--bg-secondary)",
        border: "1px solid rgba(255,255,255,0.06)",
        boxShadow: "0 8px 28px rgba(0,0,0,0.12)",
      }}
    >
      <header className="flex items-start gap-3 mb-3">
        <div
          className="rounded-full overflow-hidden flex-shrink-0 bg-bg-primary"
          style={{ width: 44, height: 44, border: "2px solid color-mix(in srgb, var(--primary) 40%, transparent)" }}
        >
          {post.author.avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element -- URLs dinâmicas Supabase Storage
            <img src={post.author.avatarUrl} alt="" width={44} height={44} className="object-cover w-full h-full" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-sm font-bold" style={{ color: "var(--primary)" }}>
              {(post.author.name ?? "?").slice(0, 1).toUpperCase()}
            </div>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-semibold truncate" style={{ color: "var(--text-primary)" }}>
              {post.author.name ?? "—"}
            </span>
            <span
              className="text-xs px-2 py-0.5 rounded-full"
              style={{
                background: post.visibility === "ALL_SCHOOLS" ? "color-mix(in srgb, var(--primary) 22%, transparent)" : "rgba(255,255,255,0.08)",
                color: "var(--text-secondary)",
              }}
            >
              {post.visibility === "ALL_SCHOOLS" ? t("tribeVisibilityAll") : t("tribeVisibilitySchool")}
            </span>
          </div>
          <time
            className="text-xs"
            style={{ color: "var(--text-secondary)" }}
            dateTime={post.createdAt}
            suppressHydrationWarning
          >
            {dateLabel}
          </time>
        </div>
      </header>

      <p className="text-sm whitespace-pre-wrap mb-3" style={{ color: "var(--text-primary)" }}>
        {post.body}
      </p>

      {hasMedia ? (
        <div className="relative rounded-xl overflow-hidden mb-3" style={{ minHeight: 120 }}>
          {punch ? (
            <div className="tribe-punch-overlay rounded-xl" aria-hidden>
              <span className="tribe-punch-glove">🥊</span>
            </div>
          ) : null}
          <div className="grid gap-2 grid-cols-1 sm:grid-cols-2">
            {post.media.map((m) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                key={m.id}
                src={m.publicUrl}
                alt=""
                className="w-full max-h-80 object-cover rounded-lg bg-black/20"
                loading="lazy"
              />
            ))}
          </div>
        </div>
      ) : null}

      <div className="flex flex-nowrap items-center justify-between gap-2 pt-1 w-full">
        <div className="flex flex-nowrap items-center gap-1.5 sm:gap-2 min-w-0">
          <button
            type="button"
            className="btn btn-secondary inline-flex items-center justify-center gap-1.5 min-h-[2.75rem] min-w-[2.75rem] px-2.5 py-2 rounded-xl shrink-0"
            onClick={onToggleLike}
            aria-pressed={post.likedByMe}
            aria-label={`${t("tribeLikes")} (${post.likeCount})`}
          >
            <BoxingGloveIcon active={post.likedByMe} />
            <span className="text-sm font-medium tabular-nums">{post.likeCount}</span>
          </button>
          <button
            type="button"
            className="btn btn-secondary inline-flex items-center justify-center gap-1.5 min-h-[2.75rem] min-w-[2.75rem] px-2.5 py-2 rounded-xl shrink-0"
            onClick={onToggleComments}
            aria-expanded={commentsOpen}
            aria-label={`${t("tribeComments")} (${post.commentCount})`}
          >
            <CommentBubbleIcon />
            <span className="text-sm font-medium tabular-nums">{post.commentCount}</span>
          </button>
          <button
            type="button"
            className="btn btn-secondary inline-flex items-center justify-center min-h-[2.75rem] min-w-[2.75rem] p-2 rounded-xl shrink-0"
            onClick={onShare}
            aria-label={shareFlash ? t("tribeShareCopied") : t("tribeShare")}
            title={shareFlash ? t("tribeShareCopied") : t("tribeShare")}
          >
            <ShareNodesIcon />
          </button>
        </div>
        {isMine ? (
          <button
            type="button"
            className="btn btn-secondary inline-flex items-center justify-center min-h-[2.75rem] min-w-[2.75rem] p-2 rounded-xl shrink-0"
            onClick={onDelete}
            aria-label={t("tribeDeletePost")}
          >
            <TrashIcon />
          </button>
        ) : null}
      </div>

      {commentsOpen ? (
        <div className="mt-4 pt-3 border-t border-white/10">
          <div className="space-y-2 mb-3 max-h-60 overflow-y-auto">
            {(comments ?? []).map((c) => (
              <div key={c.id} className="text-sm rounded-lg px-3 py-2" style={{ background: "var(--bg-primary)" }}>
                <span className="font-medium" style={{ color: "var(--primary)" }}>
                  {c.authorName ?? "—"}
                </span>
                <span className="text-xs ml-2" style={{ color: "var(--text-secondary)" }} suppressHydrationWarning>
                  {new Date(c.createdAt).toLocaleString(locale === "en" ? "en-GB" : "pt-PT", { dateStyle: "short", timeStyle: "short" })}
                </span>
                <p className="mt-1 whitespace-pre-wrap" style={{ color: "var(--text-primary)" }}>
                  {c.body}
                </p>
              </div>
            ))}
            {comments?.length === 0 ? (
              <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
                —
              </p>
            ) : null}
          </div>
          <div className="flex flex-col sm:flex-row gap-2">
            <textarea
              className="input flex-1 min-h-[3rem] resize-y"
              rows={2}
              placeholder={t("tribeCommentPlaceholder")}
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
            />
            <button type="button" className="btn btn-primary shrink-0" disabled={commentBusy} onClick={onSendComment}>
              {commentBusy ? t("tribeCommentSending") : t("tribeSendComment")}
            </button>
          </div>
        </div>
      ) : null}
    </article>
  );
}

export function TribeFeedClient({
  initialPosts,
  locale,
  currentUserId,
}: {
  initialPosts: TribeFeedPost[];
  locale: Locale;
  currentUserId: string;
}) {
  const t = useMemo(() => getTranslations(locale), [locale]);
  const router = useRouter();
  const searchParams = useSearchParams();
  const highlightPostId = searchParams.get("post");
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const [modal, setModal] = useState<{ open: boolean; variant: "loading" | "saving" | "success" | "error"; msg?: string }>({
    open: false,
    variant: "loading",
  });
  const [composerOpen, setComposerOpen] = useState(false);
  const [body, setBody] = useState("");
  const [visibility, setVisibility] = useState<TribeVisibility>("SCHOOL_ONLY");
  const [files, setFiles] = useState<File[]>([]);
  const [fileNotes, setFileNotes] = useState<string[]>([]);

  const refresh = useCallback(() => {
    router.refresh();
  }, [router]);

  async function onSubmitPost(e: React.FormEvent) {
    e.preventDefault();
    setModal({ open: true, variant: "saving" });
    const fd = new FormData();
    fd.set("body", body);
    fd.set("visibility", visibility);
    files.forEach((f) => fd.append("images", f));
    try {
      const res = await createTribePostAction(fd);
      if (res.error) {
        setModal({ open: true, variant: "error", msg: res.error });
        return;
      }
      setModal({ open: true, variant: "success" });
      setBody("");
      setFiles([]);
      setFileNotes([]);
      setVisibility("SCHOOL_ONLY");
      setComposerOpen(false);
      refresh();
    } catch {
      setModal({ open: true, variant: "error", msg: t("tribePublishNetworkError") });
    }
  }

  const posts = initialPosts;

  return (
    <div className="w-full max-w-lg mx-auto pb-24">
      <TribeModal
        open={modal.open}
        variant={modal.variant}
        message={modal.msg}
        onClose={() => setModal((m) => ({ ...m, open: false }))}
        t={t}
      />

      <div className="flex items-center justify-between gap-3 mb-6">
        <div>
          <h1 className="text-xl font-bold" style={{ color: "var(--text-primary)" }}>
            {t("tribeTitle")}
          </h1>
          <p className="text-sm mt-1" style={{ color: "var(--text-secondary)" }}>
            {t("tribeSubtitle")}
          </p>
        </div>
        <button
          type="button"
          className="btn btn-primary shrink-0 rounded-xl px-4 py-2"
          onClick={() => {
            setFileNotes([]);
            setComposerOpen(true);
          }}
        >
          {t("tribeNewPost")}
        </button>
      </div>

      {composerOpen && mounted
        ? createPortal(
            <div
              className="tribe-modal-backdrop"
              role="presentation"
              onClick={() => {
                setComposerOpen(false);
                setFileNotes([]);
              }}
            >
              <div
                className="tribe-modal-panel text-left max-h-[90vh] overflow-y-auto"
                style={{ width: "min(100%, 26rem)" }}
                role="dialog"
                aria-modal="true"
                aria-labelledby="tribe-composer-title"
                onClick={(e) => e.stopPropagation()}
              >
                <h2 id="tribe-composer-title" className="text-lg font-semibold mb-3" style={{ color: "var(--text-primary)" }}>
                  {t("tribeComposerTitle")}
                </h2>
                <form onSubmit={onSubmitPost} className="space-y-4">
                  <label className="block text-sm font-medium" style={{ color: "var(--text-secondary)" }}>
                    {t("tribeComposerBody")}
                    <textarea
                      className="input mt-1 w-full min-h-[6rem]"
                      required
                      maxLength={2500}
                      value={body}
                      onChange={(e) => setBody(e.target.value)}
                    />
                  </label>

                  <div>
                    <p className="text-sm font-medium mb-2" style={{ color: "var(--text-secondary)" }}>
                      {t("tribeComposerVisibility")}
                    </p>
                    <div className="grid gap-2">
                      <button
                        type="button"
                        className="tribe-visibility-card"
                        data-active={visibility === "SCHOOL_ONLY"}
                        onClick={() => setVisibility("SCHOOL_ONLY")}
                      >
                        <div className="font-semibold text-sm" style={{ color: "var(--text-primary)" }}>
                          {t("tribeVisibilitySchool")}
                        </div>
                        <div className="text-xs mt-1" style={{ color: "var(--text-secondary)" }}>
                          {t("tribeVisibilitySchoolHint")}
                        </div>
                      </button>
                      <button
                        type="button"
                        className="tribe-visibility-card"
                        data-active={visibility === "ALL_SCHOOLS"}
                        onClick={() => setVisibility("ALL_SCHOOLS")}
                      >
                        <div className="font-semibold text-sm" style={{ color: "var(--text-primary)" }}>
                          {t("tribeVisibilityAll")}
                        </div>
                        <div className="text-xs mt-1" style={{ color: "var(--text-secondary)" }}>
                          {t("tribeVisibilityAllHint")}
                        </div>
                      </button>
                    </div>
                  </div>

                  <label className="block text-sm font-medium" style={{ color: "var(--text-secondary)" }}>
                    {t("tribePickImages")}
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp,image/gif"
                      multiple
                      className="mt-2 block w-full text-sm"
                      onChange={(e) => {
                        const picked = Array.from(e.target.files ?? []);
                        const accepted: File[] = [];
                        const notes: string[] = [];
                        for (const f of picked) {
                          if (!TRIBE_IMAGE_MIMES.has(f.type)) {
                            notes.push(`${f.name} — ${t("tribeFileErrorType")}`);
                            continue;
                          }
                          if (f.size > TRIBE_MAX_MEDIA_BYTES) {
                            notes.push(`${f.name} — ${t("tribeFileErrorSize")}`);
                            continue;
                          }
                          if (accepted.length >= TRIBE_MAX_MEDIA_FILES) {
                            notes.push(`${f.name} — ${t("tribeFileErrorLimit")}`);
                            continue;
                          }
                          accepted.push(f);
                        }
                        setFiles(accepted);
                        setFileNotes(notes);
                        e.target.value = "";
                      }}
                    />
                  </label>
                  {fileNotes.length > 0 ? (
                    <ul
                      className="mt-2 text-sm space-y-1 rounded-lg px-3 py-2"
                      style={{ background: "color-mix(in srgb, var(--primary) 12%, transparent)", color: "var(--text-primary)" }}
                      aria-live="polite"
                    >
                      {fileNotes.map((line, i) => (
                        <li key={`${line}-${i}`}>{line}</li>
                      ))}
                    </ul>
                  ) : null}
                  {files.length > 0 && fileNotes.length === 0 ? (
                    <p className="mt-2 text-xs" style={{ color: "var(--text-secondary)" }}>
                      {t("tribeFilesAttached").replace(/\{\{count\}\}/g, String(files.length))}
                    </p>
                  ) : null}

                  <div className="flex gap-2 pt-2">
                    <button
                      type="button"
                      className="btn btn-secondary flex-1"
                      onClick={() => {
                        setComposerOpen(false);
                        setFileNotes([]);
                      }}
                    >
                      {t("cancel")}
                    </button>
                    <button type="submit" className="btn btn-primary flex-1">
                      {t("tribePublish")}
                    </button>
                  </div>
                </form>
              </div>
            </div>,
            document.body
          )
        : null}

      {posts.length === 0 ? (
        <p className="text-center text-sm py-12 rounded-2xl" style={{ color: "var(--text-secondary)", background: "var(--bg-secondary)" }}>
          {t("tribeEmpty")}
        </p>
      ) : (
        posts.map((p) => (
          <PostCard
            key={p.id}
            post={p}
            currentUserId={currentUserId}
            t={t}
            locale={locale}
            onRefresh={refresh}
            highlightPostId={highlightPostId}
          />
        ))
      )}
    </div>
  );
}
