"use client";

import { useActionState, useEffect, useRef, useState, useTransition } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  Bell, ChevronDown, Compass, FileDown, FileText, Flame, Gamepad2, Heart, Home, ImagePlus,
  LogIn, Menu, MessageCircle, MoreHorizontal, Paperclip, Plus, Search, Send, Sparkles, User, X
} from "lucide-react";
import { toast } from "sonner";
import { signIn, signUp } from "@/app/actions/auth";
import { createClient as createBrowserClient } from "@/lib/supabase/client";
import type { FeedPost, Game, PostComment, ViewerProfile } from "@/lib/types";
import { validateAttachments, validateImages } from "@/lib/validation";

type Props = { initialPosts: FeedPost[]; initialPopularPosts: FeedPost[]; initialCursor: string | null; games: Game[]; viewer: ViewerProfile | null; demo: boolean };
type AuthView = "login" | "signup";

function rankPopularPosts(posts: FeedPost[]) {
  return [...new Map(posts.map((post) => [post.id, post])).values()]
    .sort((a, b) =>
      b.likeCount - a.likeCount
      || b.commentCount - a.commentCount
      || new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    )
    .slice(0, 4);
}

function timeAgo(date: string) {
  const mins = Math.floor((Date.now() - new Date(date).getTime()) / 60000);
  if (mins < 1) return "방금";
  if (mins < 60) return `${mins}분`;
  if (mins < 1440) return `${Math.floor(mins / 60)}시간`;
  return `${Math.floor(mins / 1440)}일`;
}

function formatFileSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.ceil(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function Avatar({ name, url, size = 42 }: { name: string; url?: string | null; size?: number }) {
  return url ? (
    <Image className="avatar" src={url} alt={`${name} 프로필`} width={size} height={size} />
  ) : (
    <span className="avatar avatar-fallback" style={{ width: size, height: size }} aria-label={`${name} 프로필`}>
      {name.slice(0, 1)}
    </span>
  );
}

export function CommunityApp({ initialPosts, initialPopularPosts, initialCursor, games, viewer, demo }: Props) {
  const [posts, setPosts] = useState(initialPosts);
  const [popularPosts, setPopularPosts] = useState(initialPopularPosts);
  const [activeGame, setActiveGame] = useState("all");
  const [sort, setSort] = useState<"latest" | "popular">("latest");
  const [authOpen, setAuthOpen] = useState(false);
  const [composerOpen, setComposerOpen] = useState(false);
  const [nextCursor, setNextCursor] = useState(initialCursor);
  const [loading, startTransition] = useTransition();
  const loadMoreRef = useRef<HTMLDivElement>(null);

  function refreshFeed(game = activeGame, nextSort = sort) {
    startTransition(async () => {
      try {
        const response = await fetch(`/api/feed?game=${game}&sort=${nextSort}`);
        const data = await response.json();
        setPosts(data.posts || []);
        if (nextSort === "popular") setPopularPosts(rankPopularPosts(data.posts || []));
        setNextCursor(data.nextCursor || null);
      } catch {
        toast.error("피드를 불러오지 못했어요.");
      }
    });
  }

  useEffect(() => {
    const target = loadMoreRef.current;
    if (!target || !nextCursor || loading || sort !== "latest") return;
    const observer = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting) return;
      startTransition(async () => {
        try {
          const response = await fetch(`/api/feed?game=${activeGame}&sort=latest&cursor=${encodeURIComponent(nextCursor)}`);
          const data = await response.json();
          setPosts((current) => {
            const known = new Set(current.map((post) => post.id));
            return [...current, ...(data.posts || []).filter((post: FeedPost) => !known.has(post.id))];
          });
          setNextCursor(data.nextCursor || null);
        } catch {
          toast.error("다음 게시물을 불러오지 못했어요.");
        }
      });
    }, { rootMargin: "300px" });
    observer.observe(target);
    return () => observer.disconnect();
  }, [activeGame, loading, nextCursor, sort]);

  function selectGame(id: string) {
    setActiveGame(id);
    refreshFeed(id, sort);
  }

  function selectSort(value: "latest" | "popular") {
    setSort(value);
    refreshFeed(activeGame, value);
  }

  function toggleLike(id: string) {
    const selected = posts.find((post) => post.id === id);
    const updatedSelected = selected
      ? { ...selected, liked: !selected.liked, likeCount: selected.likeCount + (selected.liked ? -1 : 1) }
      : null;
    setPosts((items) => items.map((post) => post.id === id
      ? { ...post, liked: !post.liked, likeCount: post.likeCount + (post.liked ? -1 : 1) }
      : post));
    if (updatedSelected) {
      setPopularPosts((items) => rankPopularPosts([...items.filter((post) => post.id !== id), updatedSelected]));
    }
    if (demo) toast.success("데모 모드에서 좋아요를 반영했어요.");
    else fetch(`/api/posts/${id}/like`, { method: "POST" }).then(async (res) => {
      if (res.status === 401) { setAuthOpen(true); throw new Error("로그인이 필요합니다."); }
      if (!res.ok) throw new Error("좋아요 처리에 실패했습니다.");
    }).catch((error) => toast.error(error.message));
  }

  async function deletePost(id: string) {
    if (!window.confirm("이 게시물을 삭제할까요? 사진과 댓글도 함께 삭제됩니다.")) return;
    const response = await fetch(`/api/posts/${id}`, { method: "DELETE" });
    if (response.status === 401) {
      setAuthOpen(true);
      return;
    }
    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      toast.error(data.error || "게시물을 삭제하지 못했습니다.");
      return;
    }
    setPosts((items) => items.filter((post) => post.id !== id));
    setPopularPosts((items) => items.filter((post) => post.id !== id));
    toast.success("게시물을 삭제했습니다.");
  }

  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="topbar-inner">
          <button className="mobile-only icon-button" aria-label="메뉴"><Menu size={21} /></button>
          <Link href="/" className="brand"><span><Gamepad2 size={20} /></span> co01102 Club</Link>
          <div className="search-box">
            <Search size={17} />
            <input aria-label="검색" placeholder="게임, 게시물, 유저 검색" />
            <kbd>⌘ K</kbd>
          </div>
          <div className="header-actions">
            {demo && <span className="demo-badge">DEMO</span>}
            <button className="icon-button desktop-only" aria-label="알림"><Bell size={19} /></button>
            {viewer ? (
              <Link href="/profile" className="button ghost desktop-only"><User size={17} /> {viewer.username}</Link>
            ) : (
              <button className="button ghost desktop-only" onClick={() => setAuthOpen(true)}><LogIn size={17} /> 로그인</button>
            )}
            <button className="button primary" onClick={() => setComposerOpen(true)}><Plus size={18} /> <span className="desktop-only">새 게시물</span></button>
          </div>
        </div>
      </header>

      <div className="page-grid">
        <aside className="sidebar left-sidebar">
          <nav className="main-nav" aria-label="주 메뉴">
            <a className="active" href="#"><Home size={20} /> 홈</a>
            <a href="#games"><Compass size={20} /> 게임 탐색</a>
            <a href="#popular"><Flame size={20} /> 인기 게시물</a>
            <Link href="/profile"><User size={20} /> 내 프로필</Link>
          </nav>
          <div className="side-divider" />
          <div className="side-heading"><span>게임 채널</span><button aria-label="게임 더보기"><Plus size={15} /></button></div>
          <div className="game-list">
            {games.slice(1, 7).map((game) => (
              <button key={game.id} className={activeGame === game.id ? "active" : ""} onClick={() => selectGame(game.id)}>
                <span className="game-icon" style={{ "--game": game.color } as React.CSSProperties}>{game.icon}</span>
                <span>{game.name}</span>
              </button>
            ))}
          </div>
          {viewer ? (
            <Link href="/profile" className="user-card" aria-label={`${viewer.username} 프로필 보기`}>
              <Avatar name={viewer.username} url={viewer.avatarUrl} size={38} />
              <div><strong>{viewer.username}</strong><span>내 프로필 보기</span></div>
              <MoreHorizontal size={18} />
            </Link>
          ) : (
            <button type="button" className="user-card" onClick={() => setAuthOpen(true)}>
              <Avatar name="게이머" size={38} />
              <div><strong>게스트 게이머</strong><span>로그인하고 참여하세요</span></div>
              <LogIn size={18} />
            </button>
          )}
        </aside>

        <main className="feed">
          <section className="welcome">
            <div>
              <span className="eyebrow"><Sparkles size={14} /> 오늘도 GG!</span>
              <h1>게이머들의 순간이<br /><em>모이는 곳</em></h1>
              <p>플레이의 짜릿한 순간부터 꿀팁까지,<br className="desktop-only" /> 좋아하는 게임 이야기를 나눠보세요.</p>
              <button className="button primary big" onClick={() => setComposerOpen(true)}>첫 이야기 남기기 <Send size={17} /></button>
            </div>
            <div className="hero-art" aria-hidden="true">
              <div className="orb orb-one" /><div className="orb orb-two" />
              <Gamepad2 size={92} />
              <span className="float-chip chip-one">+ 240 XP</span>
              <span className="float-chip chip-two">LEVEL UP!</span>
            </div>
          </section>

          <section className="game-filter" id="games">
            <div className="section-title"><h2>게임 둘러보기</h2><button>전체 보기 <ChevronDown size={15} /></button></div>
            <div className="game-chips">
              {games.map((game) => (
                <button key={game.id} className={activeGame === game.id ? "active" : ""} onClick={() => selectGame(game.id)}>
                  <span className="game-icon" style={{ "--game": game.color } as React.CSSProperties}>{game.icon}</span>
                  {game.name}
                </button>
              ))}
            </div>
          </section>

          <section id="popular">
            <div className="feed-tabs">
              <div>
                <button className={sort === "latest" ? "active" : ""} onClick={() => selectSort("latest")}>최신 피드</button>
                <button className={sort === "popular" ? "active" : ""} onClick={() => selectSort("popular")}><Flame size={15} /> 인기</button>
              </div>
              <span>{posts.length}개의 이야기</span>
            </div>

            {loading ? <FeedSkeleton /> : posts.length ? (
              <div className="post-list">
                {posts.map((post) => <PostCard key={post.id} post={post} onLike={() => toggleLike(post.id)} onDelete={() => deletePost(post.id)} demo={demo} onLogin={() => setAuthOpen(true)} />)}
                <div ref={loadMoreRef} className="feed-sentinel" aria-hidden="true" />
                {loading && nextCursor && <div className="loading-more">다음 이야기를 불러오는 중...</div>}
              </div>
            ) : (
              <div className="empty-state"><Gamepad2 size={42} /><h3>아직 게시물이 없어요</h3><p>이 게임의 첫 이야기를 남겨보세요.</p><button className="button primary" onClick={() => setComposerOpen(true)}>게시물 작성</button></div>
            )}
          </section>
        </main>

        <aside className="sidebar right-sidebar">
          <section className="side-panel">
            <div className="panel-title"><h3><Flame size={17} /> 인기 게시물</h3><span>최근 7일</span></div>
            {popularPosts.length > 0 ? popularPosts.map((post, index) => (
              <a className="trend" href="#popular" key={post.id} onClick={() => selectSort("popular")}>
                <b>{String(index + 1).padStart(2, "0")}</b>
                <span>
                  <strong>{post.body}</strong>
                  <small>좋아요 {post.likeCount} · 댓글 {post.commentCount}</small>
                </span>
              </a>
            )) : <p className="trend-empty">아직 인기 게시물이 없어요.</p>}
          </section>
          <section className="side-panel compact">
            <div className="panel-title"><h3>추천 게이머</h3><button>더보기</button></div>
            {["캐리머신", "힐러의품격", "겜잘알"].map((name, i) => (
              <div className="suggested" key={name}><Avatar name={name} size={36} /><span><strong>{name}</strong><small>Lv.{35 - i * 6}</small></span><button>팔로우</button></div>
            ))}
          </section>
          <p className="legal">이용약관 · 개인정보처리방침 · 커뮤니티 가이드<br />© 2026 co01102 Club</p>
        </aside>
      </div>

      <nav className="mobile-nav">
        <a className="active" href="#"><Home size={21} /><span>홈</span></a>
        <a href="#games"><Compass size={21} /><span>탐색</span></a>
        <button className="mobile-create" onClick={() => setComposerOpen(true)}><Plus size={25} /></button>
        <a href="#popular"><Flame size={21} /><span>인기</span></a>
        <Link href="/profile"><User size={21} /><span>프로필</span></Link>
      </nav>
      {authOpen && <AuthModal onClose={() => setAuthOpen(false)} />}
      {composerOpen && <ComposerModal games={games.slice(1)} demo={demo} onClose={() => setComposerOpen(false)} onCreated={() => refreshFeed()} />}
    </div>
  );
}

function PostCard({ post, onLike, onDelete, demo, onLogin }: { post: FeedPost; onLike: () => void; onDelete: () => Promise<void>; demo: boolean; onLogin: () => void }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [commentsOpen, setCommentsOpen] = useState(false);
  const [comments, setComments] = useState<PostComment[]>([]);
  const [commentsLoaded, setCommentsLoaded] = useState(false);
  const [commentsLoading, setCommentsLoading] = useState(false);
  const [commentCount, setCommentCount] = useState(post.commentCount);
  const [comment, setComment] = useState("");

  async function loadComments() {
    setCommentsLoading(true);
    try {
      const response = await fetch(`/api/posts/${post.id}/comments`);
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "댓글을 불러오지 못했습니다.");
      const nextComments = (data.comments || []) as PostComment[];
      setComments(nextComments);
      setCommentCount(nextComments.length);
      setCommentsLoaded(true);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "댓글을 불러오지 못했습니다.");
    } finally {
      setCommentsLoading(false);
    }
  }

  function toggleComments() {
    const nextOpen = !commentsOpen;
    setCommentsOpen(nextOpen);
    if (nextOpen && !commentsLoaded) void loadComments();
  }

  async function submitComment(event: React.FormEvent) {
    event.preventDefault();
    if (!comment.trim()) return;
    if (demo) { toast.success("데모 댓글이 등록됐어요."); setComment(""); return; }
    const response = await fetch(`/api/posts/${post.id}/comments`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ body: comment }) });
    if (response.status === 401) { onLogin(); return; }
    if (!response.ok) return toast.error("댓글을 등록하지 못했어요.");
    toast.success("댓글을 등록했어요.");
    setComment("");
    await loadComments();
  }
  return (
    <article className="post-card">
      <div className="post-head">
        <Avatar name={post.author.username} url={post.author.avatarUrl} />
        <div className="post-author"><strong>{post.author.username} {post.author.level && <small>LV.{post.author.level}</small>}</strong><span>{timeAgo(post.createdAt)} 전 · <i className="game-dot" style={{ background: post.game.color }} /> {post.game.name}</span></div>
        {post.isOwner && (
          <div className="post-menu">
            <button className="icon-button" aria-label="게시물 메뉴" aria-expanded={menuOpen} onClick={() => setMenuOpen((open) => !open)}><MoreHorizontal size={20} /></button>
            {menuOpen && (
              <div className="post-menu-popover" role="menu">
                <button role="menuitem" onClick={() => { setMenuOpen(false); void onDelete(); }}>삭제하기</button>
              </div>
            )}
          </div>
        )}
      </div>
      <p className="post-body">{post.body}</p>
      {post.images.length > 0 && (
        <div className={`post-images count-${Math.min(post.images.length, 4)}`}>
          {post.images.slice(0, 4).map((src, index) => <Image key={src} src={src} alt={`게시물 사진 ${index + 1}`} width={760} height={480} sizes="(max-width: 700px) 100vw, 620px" />)}
        </div>
      )}
      {post.attachments.length > 0 && (
        <div className="post-attachments" aria-label="첨부파일">
          {post.attachments.map((attachment) => (
            <a key={attachment.id} href={`/api/attachments/${attachment.id}/download`}>
              <FileText size={20} />
              <span><strong>{attachment.fileName}</strong><small>{formatFileSize(attachment.sizeBytes)}</small></span>
              <FileDown size={18} aria-label="다운로드" />
            </a>
          ))}
        </div>
      )}
      <div className="post-actions">
        <button className={post.liked ? "liked" : ""} onClick={onLike}><Heart size={20} fill={post.liked ? "currentColor" : "none"} /><span>{post.likeCount}</span></button>
        <button onClick={toggleComments} aria-expanded={commentsOpen} aria-label={`댓글 ${commentCount}개 보기`}><MessageCircle size={20} /><span>{commentCount}</span></button>
        <button><Send size={18} /></button>
        <button className="post-game-tag"><span style={{ background: post.game.color }}>{post.game.icon}</span>{post.game.name}</button>
      </div>
      {commentsOpen && (
        <section className="comments-panel" aria-label="댓글">
          {commentsLoading && !commentsLoaded ? (
            <p className="comments-status">댓글을 불러오는 중...</p>
          ) : comments.length > 0 ? (
            <div className="comment-list">
              {comments.map((item) => (
                <article className="comment-item" key={item.id}>
                  <Avatar name={item.author.username} url={item.author.avatarUrl} size={32} />
                  <div>
                    <header><strong>{item.author.username}</strong><span>{timeAgo(item.createdAt)} 전</span></header>
                    <p>{item.body}</p>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <p className="comments-status">아직 댓글이 없어요. 첫 댓글을 남겨보세요.</p>
          )}
          <form className="comment-form" onSubmit={submitComment}>
            <Avatar name="게이머" size={32} />
            <input value={comment} onChange={(e) => setComment(e.target.value)} placeholder="따뜻한 댓글을 남겨보세요" maxLength={1000} />
            <button aria-label="댓글 등록"><Send size={16} /></button>
          </form>
        </section>
      )}
    </article>
  );
}

function AuthModal({ onClose }: { onClose: () => void }) {
  const [view, setView] = useState<AuthView>("login");
  const action = view === "login" ? signIn : signUp;
  const [state, formAction, pending] = useActionState(action, {});
  const title = view === "login" ? "다시 만나 반가워요!" : "co01102 Club에 합류하세요";
  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal auth-modal" role="dialog" aria-modal="true" aria-label="로그인">
        <button className="modal-close" onClick={onClose} aria-label="닫기"><X size={20} /></button>
        <div className="modal-logo"><Gamepad2 size={29} /></div>
        <h2>{title}</h2>
        <p>{view === "login" ? "아이디와 비밀번호로 로그인해 게이머들과 이야기를 나눠보세요." : "이메일 없이 아이디와 비밀번호만으로 바로 시작할 수 있어요."}</p>
        <form action={formAction} className="auth-form">
          <label>아이디<input name="username" required minLength={2} maxLength={20} autoComplete="username" placeholder="한글, 영문, 숫자, 밑줄 사용" /></label>
          <label>비밀번호<input name="password" type="password" required minLength={8} autoComplete={view === "signup" ? "new-password" : "current-password"} placeholder="8자 이상 입력" /></label>
          {view === "signup" && <p className="privacy-note">실명, 이메일, 전화번호, 결제정보는 입력하지 마세요. 이메일을 받지 않으므로 비밀번호 분실 시 계정을 복구할 수 없습니다.</p>}
          {state.error && <p className="form-error">{state.error}</p>}
          {state.success && <p className="form-success">{state.success}</p>}
          <button className="button primary full" disabled={pending}>{pending ? "처리 중..." : view === "login" ? "로그인" : "계정 만들기"}</button>
        </form>
        <button className="auth-switch" onClick={() => setView(view === "login" ? "signup" : "login")}>{view === "login" ? "아직 계정이 없나요? 가입하기" : "로그인으로 돌아가기"}</button>
      </div>
    </div>
  );
}

function ComposerModal({ games, demo, onClose, onCreated }: { games: Game[]; demo: boolean; onClose: () => void; onCreated: () => void }) {
  const [pending, setPending] = useState(false);
  const [formError, setFormError] = useState("");
  const [previews, setPreviews] = useState<string[]>([]);
  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [attachmentFiles, setAttachmentFiles] = useState<File[]>([]);
  const fileRef = useRef<HTMLInputElement>(null);
  const attachmentRef = useRef<HTMLInputElement>(null);

  function chooseImages(files: FileList | null) {
    const nextFiles = Array.from(files || []);
    const error = validateImages(nextFiles);
    if (error) { setFormError(error); return; }
    previews.forEach(URL.revokeObjectURL);
    setImageFiles(nextFiles);
    setPreviews(nextFiles.map(URL.createObjectURL));
    setFormError("");
  }

  function chooseAttachments(files: FileList | null) {
    const nextFiles = Array.from(files || []);
    const error = validateAttachments(nextFiles);
    if (error) { setFormError(error); return; }
    setAttachmentFiles(nextFiles);
    setFormError("");
  }

  async function submitPost(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (demo) {
      toast.success("데모 게시물이 준비됐어요. Supabase 연결 후 실제 저장됩니다.");
      onClose();
      return;
    }

    const formData = new FormData(event.currentTarget);
    const body = String(formData.get("body") || "").trim();
    const gameId = String(formData.get("gameId") || "");
    const imageError = validateImages(imageFiles);
    const attachmentError = validateAttachments(attachmentFiles);
    if (imageError || attachmentError) { setFormError(imageError || attachmentError || "파일을 확인해 주세요."); return; }

    setPending(true);
    setFormError("");
    let postId = "";
    const uploadedImages: string[] = [];
    const uploadedAttachments: string[] = [];
    const supabase = createBrowserClient();

    try {
      if (!supabase) throw new Error("Supabase가 연결되지 않았습니다.");
      const response = await fetch("/api/posts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body, gameId })
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "게시물을 만들지 못했습니다.");
      postId = result.postId;
      const userId = result.userId;

      for (const [position, image] of imageFiles.entries()) {
        const extension = image.name.split(".").pop()?.toLowerCase().replace(/[^a-z0-9]/g, "") || "webp";
        const storagePath = `${userId}/${postId}/${crypto.randomUUID()}.${extension}`;
        const { error: uploadError } = await supabase.storage.from("post-images").upload(storagePath, image, {
          contentType: image.type
        });
        if (uploadError) throw uploadError;
        uploadedImages.push(storagePath);
        const { data: publicUrl } = supabase.storage.from("post-images").getPublicUrl(storagePath);
        const { error: recordError } = await supabase.from("post_images").insert({
          post_id: postId,
          storage_path: storagePath,
          public_url: publicUrl.publicUrl,
          position
        });
        if (recordError) throw recordError;
      }

      for (const [position, file] of attachmentFiles.entries()) {
        const rawExtension = file.name.includes(".") ? file.name.split(".").pop() || "" : "";
        const extension = rawExtension.toLowerCase().replace(/[^a-z0-9]/g, "");
        const storagePath = `${userId}/${postId}/${crypto.randomUUID()}${extension ? `.${extension}` : ""}`;
        const contentType = file.type || "application/octet-stream";
        const { error: uploadError } = await supabase.storage.from("post-files").upload(storagePath, file, { contentType });
        if (uploadError) throw uploadError;
        uploadedAttachments.push(storagePath);
        const { error: recordError } = await supabase.from("post_attachments").insert({
          post_id: postId,
          storage_path: storagePath,
          file_name: file.name,
          content_type: contentType,
          size_bytes: file.size,
          position
        });
        if (recordError) throw recordError;
      }

      toast.success("게시물을 올렸어요!");
      onCreated();
      onClose();
    } catch (error) {
      if (supabase && uploadedImages.length) await supabase.storage.from("post-images").remove(uploadedImages);
      if (supabase && uploadedAttachments.length) await supabase.storage.from("post-files").remove(uploadedAttachments);
      if (postId) await fetch(`/api/posts/${postId}`, { method: "DELETE" });
      setFormError(error instanceof Error ? error.message : "파일 업로드에 실패했습니다. 다시 시도해 주세요.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="modal-backdrop" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal composer" role="dialog" aria-modal="true" aria-label="새 게시물">
        <div className="composer-head"><h2>새 이야기</h2><button className="icon-button" onClick={onClose}><X size={20} /></button></div>
        <form onSubmit={submitPost}>
          <div className="composer-user"><Avatar name="게이머" /><div><strong>나의 이야기</strong><select name="gameId" required defaultValue=""><option value="" disabled>게임 선택</option>{games.map((game) => <option key={game.id} value={game.id}>{game.name}</option>)}</select></div></div>
          <textarea name="body" maxLength={2000} required placeholder="어떤 게임 이야기를 나누고 싶나요?" />
          <p className="privacy-note">게시물, 사진과 첨부파일은 공개됩니다. 실명, 연락처, 주소, 결제·카드정보를 올리지 마세요.</p>
          {previews.length > 0 && <div className="preview-grid">{previews.map((src, i) => <Image key={src} src={src} alt={`미리보기 ${i + 1}`} width={220} height={160} unoptimized />)}</div>}
          {attachmentFiles.length > 0 && (
            <div className="selected-files">
              {attachmentFiles.map((file, index) => (
                <div key={`${file.name}-${file.size}`}><FileText size={17} /><span><strong>{file.name}</strong><small>{formatFileSize(file.size)}</small></span><button type="button" aria-label={`${file.name} 제거`} onClick={() => setAttachmentFiles((items) => items.filter((_, itemIndex) => itemIndex !== index))}><X size={15} /></button></div>
              ))}
            </div>
          )}
          <input ref={fileRef} hidden type="file" multiple accept="image/jpeg,image/png,image/webp" onChange={(e) => chooseImages(e.target.files)} />
          <input ref={attachmentRef} hidden type="file" multiple onChange={(e) => chooseAttachments(e.target.files)} />
          {formError && <p className="form-error">{formError}</p>}
          <div className="composer-footer"><div className="composer-tools"><button type="button" className="add-photo" onClick={() => fileRef.current?.click()}><ImagePlus size={18} /> 사진 <small>{previews.length}/4</small></button><button type="button" className="add-file" onClick={() => attachmentRef.current?.click()}><Paperclip size={18} /> 파일 <small>{attachmentFiles.length}/3</small></button></div><button className="button primary" disabled={pending}>{pending ? "업로드 중..." : "게시하기"}</button></div>
        </form>
      </div>
    </div>
  );
}

function FeedSkeleton() {
  return <div className="post-list">{[1, 2].map((item) => <div className="post-card skeleton" key={item}><div className="sk-head"><i /><span /></div><b /><b /><div className="sk-image" /></div>)}</div>;
}
