import type { Session } from "@supabase/supabase-js";
import {
  ChatCircleIcon,
  ClockIcon,
  EyeIcon,
  FireIcon,
  FolderOpenIcon,
  GraphIcon,
  HeartIcon,
  MagnifyingGlassIcon,
  MoonIcon,
  PlusIcon,
  SignInIcon,
  SunIcon,
  TrashIcon,
  TrendUpIcon,
  UploadSimpleIcon,
  UserIcon,
  UserPlusIcon,
} from "./ui-kit/icons/PinewoodIcons";
import {
  type ChangeEvent,
  type CSSProperties,
  type FormEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  DetectiveBoard,
  type BoardPublishPayload,
  type PublicBoardPreview,
} from "./DetectiveBoard";
import {
  addBoardComment,
  type BoardComment,
  type BoardViewer,
  type CommunityBoard,
  type CommunityProfile,
  deleteOwnBoard,
  deleteOwnBoardByClientId,
  getProfile,
  getPublicBoard,
  listBoardComments,
  listRecentBoardIds,
  listPublicBoards,
  publishBoard,
  toggleBoardLike,
  uploadProfileAvatar,
} from "./communityApi";
import { CASE_GENRES as PUBLISHABLE_CASE_GENRES } from "./caseGenres";
import { BoardThumbnail } from "./components/BoardThumbnail";
import { DarkVeil } from "./components/DarkVeil";
import { OptionWheel } from "./components/OptionWheel";
import { supabase } from "./supabaseClient";

type RouteId = "workshop" | "board";
type CommunityTheme = "light" | "dark";
type AuthMode = "signin" | "signup";

const COMMUNITY_THEME_KEY = "pinewood-case-board-theme";
const COMMUNITY_TERMS_VERSION = "2026-07-24-v1";
const CASE_GENRES = ["全部案件", ...PUBLISHABLE_CASE_GENRES];

if ("scrollRestoration" in window.history) {
  window.history.scrollRestoration = "manual";
}

function routeFromHash(hash: string): RouteId {
  if (hash.startsWith("#share=")) return "board";
  return hash.replace(/^#\/?/, "").split("?")[0] === "board" ? "board" : "workshop";
}

function boardIdFromHash(hash: string): string {
  const queryIndex = hash.indexOf("?");
  if (queryIndex < 0) return "";
  return new URLSearchParams(hash.slice(queryIndex + 1)).get("id") ?? "";
}

function navigate(route: RouteId, boardId = "") {
  window.location.hash = boardId
    ? `#/${route}?id=${encodeURIComponent(boardId)}`
    : `#/${route}`;
}

function authErrorMessage(message: string): string {
  const normalized = message.toLowerCase();
  if (normalized.includes("invalid login credentials")) return "邮箱或密码不正确。";
  if (normalized.includes("user already registered")) return "这个邮箱已经注册，请直接登录。";
  if (normalized.includes("email address not authorized")) {
    return "当前邮件服务无法向这个邮箱发送验证邮件，请稍后再试。";
  }
  if (
    normalized.includes("rate limit")
    || normalized.includes("too many requests")
    || normalized.includes("over_request_rate_limit")
  ) {
    return "注册请求过多，请稍后再试。";
  }
  if (normalized.includes("signup is disabled")) return "注册功能暂时关闭，请稍后再试。";
  if (normalized.includes("password")) return "密码至少需要 6 位字符。";
  if (
    normalized.includes("invalid email")
    || normalized.includes("email address is invalid")
    || normalized.includes("unable to validate email")
  ) {
    return "请填写有效的邮箱地址。";
  }
  return "操作没有完成，请稍后重试。";
}

function ProfileAvatar({
  url,
  name,
  size = 34,
}: {
  url?: string;
  name: string;
  size?: number;
}) {
  return (
    <span
      className={`online-avatar ${url ? "has-image" : ""}`}
      style={{ "--avatar-size": `${size}px` } as CSSProperties}
      title={name}
      aria-label={name}
    >
      {url
        ? <img src={url} alt={name} />
        : <UserIcon size={Math.max(14, Math.round(size * 0.52))} />}
    </span>
  );
}

function AuthDialog({
  mode,
  onClose,
}: {
  mode: AuthMode;
  onClose: () => void;
}) {
  const [activeMode, setActiveMode] = useState(mode);
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [confirmPasswordVisible, setConfirmPasswordVisible] = useState(false);
  const [ageConfirmed, setAgeConfirmed] = useState(false);
  const [rulesAccepted, setRulesAccepted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState("");
  const [isError, setIsError] = useState(false);
  const isSignup = activeMode === "signup";
  const passwordsMatch = password.length >= 6 && password === confirmPassword;
  const registrationReady = ageConfirmed && rulesAccepted && passwordsMatch;

  const switchMode = (nextMode: AuthMode) => {
    setActiveMode(nextMode);
    setConfirmPassword("");
    setPasswordVisible(false);
    setConfirmPasswordVisible(false);
    setMessage("");
    setIsError(false);
  };

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setMessage("");
    setIsError(false);
    setSubmitting(true);

    try {
      if (isSignup) {
        if (password !== confirmPassword) {
          setMessage("两次输入的密码不一致，请重新确认。");
          setIsError(true);
          return;
        }

        if (!registrationReady) {
          setMessage("请确认两次密码一致、年龄符合要求，并接受社区规则。");
          setIsError(true);
          return;
        }

        const { data, error } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: {
            emailRedirectTo: `${window.location.origin}${window.location.pathname}#/workshop`,
            data: {
              display_name: displayName.trim(),
              age_16_confirmed: true,
              terms_version: COMMUNITY_TERMS_VERSION,
              terms_accepted_at: new Date().toISOString(),
            },
          },
        });
        if (error) throw error;

        if (data.session) {
          onClose();
        } else {
          setMessage("注册成功，请打开邮箱完成验证。");
        }
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });
        if (error) throw error;
        onClose();
      }
    } catch (error) {
      setMessage(authErrorMessage(error instanceof Error ? error.message : ""));
      setIsError(true);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="community-modal-backdrop" role="presentation" onMouseDown={onClose}>
      <section
        className="community-auth-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="community-auth-title"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <button className="community-modal-close" onClick={onClose} aria-label="关闭登录窗口">×</button>
        <span className="community-auth-mark"><UserIcon size={28} /></span>
        <p>CASE BOARD COMMUNITY</p>
        <h2 id="community-auth-title">{isSignup ? "注册新的侦探身份" : "登录侦探档案"}</h2>
        <div className="community-auth-tabs">
          <button type="button" className={!isSignup ? "is-active" : ""} onClick={() => switchMode("signin")}>登录</button>
          <button type="button" className={isSignup ? "is-active" : ""} onClick={() => switchMode("signup")}>注册</button>
        </div>
        <form onSubmit={submit}>
          {isSignup && (
            <label>
              <span>显示名称</span>
              <input
                required
                minLength={2}
                maxLength={32}
                value={displayName}
                onChange={(event) => setDisplayName(event.target.value)}
                placeholder="你的侦探名"
                autoComplete="nickname"
              />
            </label>
          )}
          <label>
            <span>邮箱</span>
            <input
              required
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="detective@example.com"
              autoComplete="email"
            />
          </label>
          <label>
            <span>密码</span>
            <div className="community-password-field">
              <input
                required
                type={passwordVisible ? "text" : "password"}
                minLength={6}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="至少 6 位字符"
                autoComplete={isSignup ? "new-password" : "current-password"}
              />
              <button
                type="button"
                className="community-password-toggle"
                aria-label={passwordVisible ? "隐藏密码" : "显示密码"}
                aria-pressed={passwordVisible}
                onClick={() => setPasswordVisible((visible) => !visible)}
              >
                <EyeIcon size={14} />
                {passwordVisible ? "隐藏" : "显示"}
              </button>
            </div>
          </label>
          {isSignup && (
            <label>
              <span>再次输入密码</span>
              <div className="community-password-field">
                <input
                  required
                  type={confirmPasswordVisible ? "text" : "password"}
                  minLength={6}
                  value={confirmPassword}
                  onChange={(event) => setConfirmPassword(event.target.value)}
                  placeholder="请再次输入密码"
                  autoComplete="new-password"
                  aria-describedby={confirmPassword ? "community-password-match" : undefined}
                />
                <button
                  type="button"
                  className="community-password-toggle"
                  aria-label={confirmPasswordVisible ? "隐藏确认密码" : "显示确认密码"}
                  aria-pressed={confirmPasswordVisible}
                  onClick={() => setConfirmPasswordVisible((visible) => !visible)}
                >
                  <EyeIcon size={14} />
                  {confirmPasswordVisible ? "隐藏" : "显示"}
                </button>
              </div>
              {confirmPassword && (
                <small
                  id="community-password-match"
                  className={`community-password-match ${passwordsMatch ? "is-match" : "is-mismatch"}`}
                  role="status"
                >
                  {passwordsMatch ? "两次密码一致" : "两次密码不一致"}
                </small>
              )}
            </label>
          )}
          {isSignup && (
            <div className="community-registration-gates">
              <label className="community-consent-row">
                <input
                  type="checkbox"
                  checked={ageConfirmed}
                  onChange={(event) => setAgeConfirmed(event.target.checked)}
                />
                <span>我确认自己已满 16 周岁</span>
              </label>
              <label className="community-consent-row">
                <input
                  type="checkbox"
                  checked={rulesAccepted}
                  onChange={(event) => setRulesAccepted(event.target.checked)}
                />
                <span>我已阅读并接受下方《社区规则与免责声明》</span>
              </label>
              <details className="community-disclaimer">
                <summary>查看社区规则与免责声明</summary>
                <div>
                  <p>本社区用于发布虚构案件、悬疑创作和互动调查板，内容可能包含恐怖、超自然或令人不适的主题。</p>
                  <p>不得发布违法内容、真实个人指控、人肉搜索、隐私或敏感个人信息、威胁，以及无权使用的受版权保护内容。发布者须对自己的内容与素材权利负责。</p>
                  <p>公开案件板可被其他用户浏览、评论与传播。平台可移除违规内容或暂停相关账号；本服务不是执法、报警或紧急求助渠道，也不应被用于现实中的调查或指控。</p>
                  <p>服务与数据不保证永久可用，请自行导出并保留重要内容。</p>
                  <small>条款版本：{COMMUNITY_TERMS_VERSION}</small>
                </div>
              </details>
              {!ageConfirmed || !rulesAccepted ? (
                <p className="community-registration-hint">确认年龄并接受规则后，才能完成注册。</p>
              ) : !passwordsMatch ? (
                <p className="community-registration-hint">请确认两次输入的密码一致。</p>
              ) : null}
            </div>
          )}
          {message && (
            <p className={`community-auth-message ${isError ? "is-error" : "is-success"}`} role="status">
              {message}
            </p>
          )}
          <button
            className="community-auth-submit"
            type="submit"
            disabled={submitting || (isSignup && !registrationReady)}
          >
            {isSignup
              ? <><UserPlusIcon size={17} />{submitting ? "注册中…" : "完成注册"}</>
              : <><SignInIcon size={17} />{submitting ? "登录中…" : "登录"}</>}
          </button>
        </form>
      </section>
    </div>
  );
}

function CommentsDialog({
  board,
  session,
  onClose,
  onOpenAuth,
  onCommentAdded,
}: {
  board: CommunityBoard;
  session: Session | null;
  onClose: () => void;
  onOpenAuth: (mode: AuthMode) => void;
  onCommentAdded: () => void;
}) {
  const [comments, setComments] = useState<BoardComment[]>([]);
  const [body, setBody] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const loadComments = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      setComments(await listBoardComments(board.id));
    } catch {
      setError("评论暂时无法读取。");
    } finally {
      setLoading(false);
    }
  }, [board.id]);

  useEffect(() => {
    const timeout = window.setTimeout(() => void loadComments(), 0);
    return () => window.clearTimeout(timeout);
  }, [loadComments]);

  const submitComment = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!session?.user.id || !body.trim()) return;
    setSubmitting(true);
    setError("");
    try {
      await addBoardComment(board.id, session.user.id, body);
      setBody("");
      await loadComments();
      onCommentAdded();
    } catch {
      setError("评论没有发送成功，请稍后再试。");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="community-modal-backdrop" role="presentation" onMouseDown={onClose}>
      <section
        className="community-comments-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="community-comments-title"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <button className="community-modal-close" onClick={onClose} aria-label="关闭评论">×</button>
        <p>CASE DISCUSSION</p>
        <h2 id="community-comments-title">{board.title}</h2>
        <div className="community-comment-list">
          {loading ? (
            <span>正在读取讨论…</span>
          ) : comments.length === 0 ? (
            <span>还没有评论，留下第一条调查意见。</span>
          ) : comments.map((comment) => (
            <article key={comment.id}>
              <ProfileAvatar url={comment.avatarUrl} name={comment.author} size={32} />
              <div>
                <header><strong>{comment.author}</strong><i>{comment.handle} · {comment.time}</i></header>
                <p>{comment.body}</p>
              </div>
            </article>
          ))}
        </div>
        {error && <p className="community-comment-error">{error}</p>}
        {session ? (
          <form onSubmit={submitComment}>
            <textarea
              required
              maxLength={1000}
              value={body}
              onChange={(event) => setBody(event.target.value)}
              placeholder="写下你的调查意见…"
            />
            <button type="submit" disabled={submitting || !body.trim()}>
              {submitting ? "发送中…" : "发送评论"}
            </button>
          </form>
        ) : (
          <button
            className="community-comment-login"
            onClick={() => {
              onClose();
              onOpenAuth("signin");
            }}
          >
            登录后参与讨论
          </button>
        )}
      </section>
    </div>
  );
}

function BoardCommentsPanel({
  boardId,
  boardTitle,
  session,
  onClose,
  onOpenAuth,
  onCountChange,
}: {
  boardId: string;
  boardTitle: string;
  session: Session | null;
  onClose: () => void;
  onOpenAuth: (mode: AuthMode) => void;
  onCountChange: (count: number) => void;
}) {
  const [comments, setComments] = useState<BoardComment[]>([]);
  const [body, setBody] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const loadComments = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const nextComments = await listBoardComments(boardId);
      setComments(nextComments);
      onCountChange(nextComments.length);
    } catch {
      setError("协助留言暂时无法读取。");
    } finally {
      setLoading(false);
    }
  }, [boardId, onCountChange]);

  useEffect(() => {
    const timeout = window.setTimeout(() => void loadComments(), 0);
    return () => window.clearTimeout(timeout);
  }, [loadComments]);

  const submitComment = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!session?.user.id || !body.trim()) return;
    setSubmitting(true);
    setError("");
    try {
      await addBoardComment(boardId, session.user.id, body);
      setBody("");
      await loadComments();
    } catch {
      setError("留言没有发送成功，请稍后再试。");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <aside className="online-case-comments-panel" aria-label="协助探案的留言">
      <header>
        <div>
          <small>CASE DISCUSSION</small>
          <strong>协助探案的留言</strong>
        </div>
        <button onClick={onClose} aria-label="关闭协助留言">×</button>
      </header>
      <div className="online-case-comments-title">
        <span>当前案件</span>
        <strong>{boardTitle}</strong>
        <small>{comments.length} 条公开留言</small>
      </div>
      <div className="online-case-comments-list">
        {loading ? (
          <span>正在读取协助留言…</span>
        ) : comments.length === 0 ? (
          <span>还没有留言。你可以留下第一条调查意见。</span>
        ) : comments.map((comment) => (
          <article key={comment.id}>
            <ProfileAvatar url={comment.avatarUrl} name={comment.author} size={30} />
            <div>
              <strong>{comment.author}<small>{comment.time}</small></strong>
              <span>{comment.handle}</span>
              <p>{comment.body}</p>
            </div>
          </article>
        ))}
      </div>
      {error && <p className="online-case-comments-error">{error}</p>}
      {session ? (
        <form className="online-case-comment-form" onSubmit={submitComment}>
          <textarea
            required
            maxLength={1000}
            value={body}
            onChange={(event) => setBody(event.target.value)}
            placeholder="写下线索、推测或需要创作者补充的内容…"
          />
          <button type="submit" disabled={submitting || !body.trim()}>
            <ChatCircleIcon size={15} />
            {submitting ? "发送中…" : "发布协助留言"}
          </button>
        </form>
      ) : (
        <button
          className="online-case-comment-login"
          onClick={() => onOpenAuth("signin")}
        >
          <SignInIcon size={15} />登录后参与调查
        </button>
      )}
    </aside>
  );
}

function CommunityHome({
  session,
  profile,
  onOpenAuth,
  onLogout,
  onProfileChange,
}: {
  session: Session | null;
  profile: CommunityProfile | null;
  onOpenAuth: (mode: AuthMode) => void;
  onLogout: () => void;
  onProfileChange: (profile: CommunityProfile) => void;
}) {
  const [search, setSearch] = useState("");
  const [sortMode, setSortMode] = useState<"hot" | "new" | "top">("hot");
  const [activeTag, setActiveTag] = useState("");
  const [activeGenre, setActiveGenre] = useState("");
  const [genreWheelVersion, setGenreWheelVersion] = useState(0);
  const [boards, setBoards] = useState<CommunityBoard[]>([]);
  const [loadingBoards, setLoadingBoards] = useState(true);
  const [boardError, setBoardError] = useState("");
  const [likedBoardIds, setLikedBoardIds] = useState<Set<string>>(() => new Set());
  const [commentBoard, setCommentBoard] = useState<CommunityBoard | null>(null);
  const [deletingBoardId, setDeletingBoardId] = useState("");
  const [recentBoardIds, setRecentBoardIds] = useState<string[]>([]);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [avatarMessage, setAvatarMessage] = useState("");
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const [theme, setTheme] = useState<CommunityTheme>(() => {
    const storedTheme = window.localStorage.getItem(COMMUNITY_THEME_KEY);
    return storedTheme === "dark" || storedTheme === "light" ? storedTheme : "light";
  });

  const loadBoards = useCallback(async () => {
    setLoadingBoards(true);
    setBoardError("");
    try {
      setBoards(await listPublicBoards());
    } catch {
      setBoardError("案件列表暂时无法读取，请稍后再试。");
    } finally {
      setLoadingBoards(false);
    }
  }, []);

  useEffect(() => {
    window.localStorage.setItem(COMMUNITY_THEME_KEY, theme);
  }, [theme]);

  useEffect(() => {
    const timeout = window.setTimeout(() => void loadBoards(), 0);
    return () => window.clearTimeout(timeout);
  }, [loadBoards]);

  useEffect(() => {
    if (!session?.user.id) {
      const timeout = window.setTimeout(() => setRecentBoardIds([]), 0);
      return () => window.clearTimeout(timeout);
    }
    const timeout = window.setTimeout(() => {
      void listRecentBoardIds(session.user.id)
        .then(setRecentBoardIds)
        .catch(() => setRecentBoardIds([]));
    }, 0);
    return () => window.clearTimeout(timeout);
  }, [session?.user.id]);

  const visibleBoards = useMemo(() => {
    const query = search.trim().toLowerCase();
    const filtered = boards.filter((board) => {
      const searchable = [
        board.title,
        board.author,
        board.description,
        ...board.tags,
        ...board.genres,
      ].join(" ").toLowerCase();
      const matchesSearch = !query || searchable.includes(query);
      const matchesTag = !activeTag || board.tags.includes(activeTag);
      const matchesGenre = !activeGenre || board.genres.includes(activeGenre);
      return matchesSearch && matchesTag && matchesGenre;
    });

    return [...filtered].sort((a, b) => {
      if (sortMode === "new") return b.publishedAt.localeCompare(a.publishedAt);
      if (sortMode === "top") return b.likes - a.likes;
      return b.views + b.comments * 4 - (a.views + a.comments * 4);
    });
  }, [activeGenre, activeTag, boards, search, sortMode]);

  const recentBoards = useMemo(() => {
    const byId = new Map(boards.map((board) => [board.id, board]));
    return recentBoardIds
      .map((boardId) => byId.get(boardId))
      .filter((board): board is CommunityBoard => Boolean(board));
  }, [boards, recentBoardIds]);

  const startCreating = () => {
    if (session) navigate("board");
    else onOpenAuth("signup");
  };

  const likeBoard = async (boardId: string) => {
    if (!session?.user.id) {
      onOpenAuth("signin");
      return;
    }
    try {
      const liked = await toggleBoardLike(boardId, session.user.id);
      setLikedBoardIds((current) => {
        const next = new Set(current);
        if (liked) next.add(boardId);
        else next.delete(boardId);
        return next;
      });
      setBoards((current) => current.map((board) => (
        board.id === boardId
          ? { ...board, likes: Math.max(0, board.likes + (liked ? 1 : -1)) }
          : board
      )));
    } catch {
      setBoardError("点赞没有完成，请稍后再试。");
    }
  };

  const deleteBoard = async (board: CommunityBoard) => {
    if (!session?.user.id || board.ownerId !== session.user.id) return;
    if (!window.confirm(`永久删除“${board.title}”？评论、点赞和案件图片也会一并删除，此操作无法撤销。`)) return;

    setDeletingBoardId(board.id);
    setBoardError("");
    try {
      await deleteOwnBoard(board.id, session.user.id);
      setBoards((current) => current.filter((item) => item.id !== board.id));
      setCommentBoard((current) => current?.id === board.id ? null : current);
    } catch {
      setBoardError("案件没有删除，请稍后重试。");
    } finally {
      setDeletingBoardId("");
    }
  };

  const changeAvatar = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file || !session?.user.id) return;

    setUploadingAvatar(true);
    setAvatarMessage("");
    try {
      const avatarUrl = await uploadProfileAvatar(session.user.id, file);
      onProfileChange({
        displayName: profile?.displayName || "社区侦探",
        handle: profile?.handle || "",
        avatarUrl,
      });
      setAvatarMessage("头像已更新");
    } catch (error) {
      setAvatarMessage(error instanceof Error ? error.message : "头像上传失败");
    } finally {
      setUploadingAvatar(false);
    }
  };

  return (
    <div className={`community-page theme-${theme}`} data-community-theme={theme}>
      <div className="community-dark-veil" aria-hidden="true">
        <DarkVeil
          speed={2.5}
          hueShift={22}
          noiseIntensity={0.04}
          scanlineFrequency={2}
          scanlineIntensity={0}
          warpAmount={1.4}
        />
      </div>

      <header className="community-header">
        <button className="community-logo" onClick={() => navigate("workshop")}>
          <span>
            <strong className="community-co-brand">
              <span className="community-brand-detective">Detective Lab</span>
              <i aria-hidden="true">×</i>
              <span className="community-brand-pinewood">Pinewood</span>
            </strong>
            <small>松木镇公共案件社区访问系统</small>
          </span>
        </button>

        <label className="community-search">
          <MagnifyingGlassIcon size={19} />
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="搜索案件板、作者或分类…"
          />
          {search && <button onClick={() => setSearch("")} aria-label="清空搜索">×</button>}
        </label>

        <div className="community-header-actions">
          <button onClick={startCreating}><PlusIcon size={17} />创建案件板</button>
          {session ? (
            <button className="community-plain-login community-header-avatar" onClick={onLogout}>
              <ProfileAvatar
                url={profile?.avatarUrl}
                name={profile?.displayName || "我的档案"}
                size={28}
              />
              <b>{profile?.displayName || "我的档案"} · 退出</b>
            </button>
          ) : (
            <button className="community-plain-login" onClick={() => onOpenAuth("signin")}><SignInIcon size={17} />登录</button>
          )}
          <button
            className="community-theme-toggle"
            onClick={() => setTheme((current) => current === "light" ? "dark" : "light")}
            aria-label={theme === "light" ? "切换到夜间模式" : "切换到日间模式"}
            title={theme === "light" ? "切换到夜间模式" : "切换到日间模式"}
          >
            {theme === "light" ? <MoonIcon size={18} /> : <SunIcon size={18} />}
          </button>
        </div>
      </header>

      <div className="community-layout">
        <aside className="community-left-rail">
          <section className="community-side-panel community-genre-panel">
            <header>
              <h2><GraphIcon size={20} weight="duotone" />案件类型</h2>
              <span>滚轮 / 拖拽</span>
            </header>
            <div className="community-genre-wheel">
              <OptionWheel
                key={genreWheelVersion}
                items={CASE_GENRES}
                defaultSelected={0}
                onChange={(_, item) => setActiveGenre(item === "全部案件" ? "" : item)}
                textColor="var(--community-muted)"
                activeColor="var(--community-red)"
                side="left"
                fontSize={1.5}
                spacing={1.55}
                curve={1}
                tilt={6}
                blur={2}
                fade={0.25}
                smoothing={200}
                inset={42}
                loop={false}
                draggable
                soundUrl={`${import.meta.env.BASE_URL}assets/sounds/click-soft.mp3`}
                soundVolume={0.5}
              />
            </div>
            <footer>
              <span>当前分类</span>
              <strong>{activeGenre || "全部案件"}</strong>
              <small>滚动鼠标滚轮切换</small>
            </footer>
          </section>
        </aside>

        <main className="community-feed">
          <div className="community-feed-header">
            <div>
              <p>PUBLIC INVESTIGATION BOARDS</p>
              <h1>公共案件板</h1>
            </div>
            <div className="community-sort" role="group" aria-label="案件板排序">
              <button className={sortMode === "hot" ? "is-active" : ""} onClick={() => setSortMode("hot")}>
                <FireIcon size={16} weight={sortMode === "hot" ? "fill" : "regular"} />热门
              </button>
              <button className={sortMode === "new" ? "is-active" : ""} onClick={() => setSortMode("new")}>
                <ClockIcon size={16} />最新
              </button>
              <button className={sortMode === "top" ? "is-active" : ""} onClick={() => setSortMode("top")}>
                <TrendUpIcon size={16} />排行
              </button>
            </div>
          </div>

          {(activeTag || activeGenre) && (
            <div className="community-filter-notice">
              正在查看分类：<strong>{[activeGenre, activeTag].filter(Boolean).join(" · ")}</strong>
              <button onClick={() => {
                setActiveTag("");
                setActiveGenre("");
                setGenreWheelVersion((version) => version + 1);
              }}>清除筛选</button>
            </div>
          )}

          <div className="community-board-list">
            {visibleBoards.map((board) => (
              <article
                className="community-board-card"
                key={board.id}
                onClick={() => navigate("board", board.id)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") navigate("board", board.id);
                }}
                role="button"
                tabIndex={0}
              >
                <span className="community-board-copy">
                  <span className="community-tags">
                    {board.tags.map((tag, index) => (
                      <span
                        key={tag}
                        className={index === 0 ? "is-primary" : ""}
                        onClick={(event) => {
                          event.stopPropagation();
                          setActiveTag(tag);
                        }}
                      >
                        {tag}
                      </span>
                    ))}
                  </span>
                  <strong className="community-board-title">{board.title}</strong>
                  <span className="community-board-author">by <b>{board.author}</b> <i>{board.handle}</i> · {board.time}</span>
                  <span className="community-board-description">{board.description}</span>
                  <span className="community-board-stats">
                    <button
                      className={likedBoardIds.has(board.id) ? "is-active" : ""}
                      onClick={(event) => {
                        event.stopPropagation();
                        void likeBoard(board.id);
                      }}
                      aria-label={`点赞 ${board.title}`}
                    >
                      <HeartIcon size={15} weight={likedBoardIds.has(board.id) ? "fill" : "regular"} />{board.likes}
                    </button>
                    <button
                      onClick={(event) => {
                        event.stopPropagation();
                        setCommentBoard(board);
                      }}
                      aria-label={`评论 ${board.title}`}
                    >
                      <ChatCircleIcon size={15} />{board.comments}
                    </button>
                    <i><EyeIcon size={15} />{board.views}</i>
                    {session?.user.id === board.ownerId && (
                      <button
                        className="community-board-delete"
                        disabled={deletingBoardId === board.id}
                        onClick={(event) => {
                          event.stopPropagation();
                          void deleteBoard(board);
                        }}
                        onKeyDown={(event) => event.stopPropagation()}
                        aria-label={`删除 ${board.title}`}
                      >
                        <TrashIcon size={14} />
                        {deletingBoardId === board.id ? "删除中…" : "删除案件"}
                      </button>
                    )}
                  </span>
                </span>
                <BoardThumbnail preview={board.preview} title={board.title} />
              </article>
            ))}

            {loadingBoards ? (
              <div className="community-empty">
                <FolderOpenIcon size={32} />
                <strong>正在读取公共案件板</strong>
              </div>
            ) : boardError ? (
              <div className="community-empty">
                <strong>{boardError}</strong>
                <button onClick={() => void loadBoards()}>重新加载</button>
              </div>
            ) : boards.length === 0 ? (
              <div className="community-empty community-empty-first">
                <FolderOpenIcon size={34} />
                <strong>社区里还没有公开案件板</strong>
                <span>发布第一份案件，邀请其他侦探开始调查。</span>
                <button onClick={startCreating}><UserPlusIcon size={17} />创建第一份档案</button>
              </div>
            ) : visibleBoards.length === 0 && (
              <div className="community-empty">
                <MagnifyingGlassIcon size={32} />
                <strong>没有找到匹配的案件板</strong>
                <span>换一个关键词或案件类型再试。</span>
              </div>
            )}
          </div>
        </main>

        <aside className="community-right-rail">
          <section className="community-account-panel">
            <span className="community-account-icon">
              {session
                ? <ProfileAvatar url={profile?.avatarUrl} name={profile?.displayName || "我的档案"} size={48} />
                : <UserIcon size={34} />}
            </span>
            <strong>{session ? `欢迎回来，${profile?.displayName || "侦探"}` : "建立你的侦探档案"}</strong>
            <p>{session ? "继续创作、保存并公开你的案件板。" : "登录后创建自己的案件板，并发布到公共社区。"}</p>
            {session ? (
              <>
                <button
                  className="community-avatar-upload"
                  onClick={() => avatarInputRef.current?.click()}
                  disabled={uploadingAvatar}
                >
                  <UploadSimpleIcon size={16} />
                  {uploadingAvatar ? "上传中…" : "上传头像"}
                </button>
                <input
                  ref={avatarInputRef}
                  className="visually-hidden"
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/gif"
                  onChange={(event) => void changeAvatar(event)}
                />
                {avatarMessage && <span className="community-avatar-message">{avatarMessage}</span>}
                <button className="community-account-primary" onClick={() => navigate("board")}><PlusIcon size={17} />进入案件板</button>
                <button className="community-account-secondary" onClick={onLogout}>退出登录</button>
              </>
            ) : (
              <>
                <button className="community-account-primary" onClick={() => onOpenAuth("signin")}><SignInIcon size={17} />登录</button>
                <button className="community-account-secondary" onClick={() => onOpenAuth("signup")}><UserPlusIcon size={17} />注册</button>
              </>
            )}
          </section>

          <section className="community-side-panel community-guide">
            <h2>社区如何运作</h2>
            <ol>
              <li><b>01</b><span>注册自己的侦探身份</span></li>
              <li><b>02</b><span>从空白画布创建案件板</span></li>
              <li><b>03</b><span>选择类型并发布到社区</span></li>
            </ol>
            <button onClick={startCreating}>{session ? "开始创作" : "注册后开始创作"}</button>
          </section>

          <section className="community-side-panel community-recent">
            <h2><FolderOpenIcon size={19} />最近浏览</h2>
            {!session ? (
              <>
                <p>登录后，这里会记录你最近打开的公开案件。</p>
                <button className="community-side-login" onClick={() => onOpenAuth("signin")}><SignInIcon size={16} />登录</button>
              </>
            ) : recentBoards.length > 0 ? (
              <div className="community-recent-list">
                {recentBoards.map((board, index) => (
                  <button key={board.id} onClick={() => navigate("board", board.id)}>
                    <b>{String(index + 1).padStart(2, "0")}</b>
                    <span><strong>{board.title}</strong><small>{board.author} · {board.time}</small></span>
                    <EyeIcon size={14} />
                  </button>
                ))}
              </div>
            ) : (
              <p>打开过的公开案件会出现在这里，方便继续调查。</p>
            )}
          </section>
        </aside>
      </div>
      {commentBoard && (
        <CommentsDialog
          board={commentBoard}
          session={session}
          onClose={() => setCommentBoard(null)}
          onOpenAuth={onOpenAuth}
          onCommentAdded={() => {
            setBoards((current) => current.map((board) => (
              board.id === commentBoard.id
                ? { ...board, comments: board.comments + 1 }
                : board
            )));
          }}
        />
      )}
    </div>
  );
}

export function OnlineWorkshopApp() {
  const [activeRoute, setActiveRoute] = useState<RouteId>(() => routeFromHash(window.location.hash));
  const [activeBoardId, setActiveBoardId] = useState(() => boardIdFromHash(window.location.hash));
  const [authMode, setAuthMode] = useState<AuthMode | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<CommunityProfile | null>(null);
  const [publicPreview, setPublicPreview] = useState<PublicBoardPreview | null>(null);
  const [publicBoardOwnerId, setPublicBoardOwnerId] = useState("");
  const [publicBoardTitle, setPublicBoardTitle] = useState("");
  const [publicViewCount, setPublicViewCount] = useState(0);
  const [publicViewers, setPublicViewers] = useState<BoardViewer[]>([]);
  const [publicCommentCount, setPublicCommentCount] = useState(0);
  const [commentsPanelOpen, setCommentsPanelOpen] = useState(false);
  const [boardLoading, setBoardLoading] = useState(false);
  const [boardError, setBoardError] = useState("");
  const [deletingActiveBoard, setDeletingActiveBoard] = useState(false);
  const recordedViewRef = useRef("");

  useEffect(() => {
    void supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      if (nextSession) setAuthMode(null);
      else setProfile(null);
    });
    return () => data.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!session?.user.id) return;
    const timeout = window.setTimeout(() => {
      void getProfile(session.user.id)
        .then(setProfile)
        .catch(() => setProfile(null));
    }, 0);
    return () => window.clearTimeout(timeout);
  }, [session?.user.id]);

  useEffect(() => {
    if (activeRoute !== "board") {
      recordedViewRef.current = "";
      const timeout = window.setTimeout(() => setCommentsPanelOpen(false), 0);
      return () => window.clearTimeout(timeout);
    }
  }, [activeRoute]);

  useEffect(() => {
    if (!window.location.hash || window.location.hash.startsWith("#/facilitator")) {
      window.history.replaceState(null, "", "#/workshop");
    }

    const handleHashChange = () => {
      if (!window.location.hash || window.location.hash.startsWith("#/facilitator")) {
        window.history.replaceState(null, "", "#/workshop");
      }
      setActiveRoute(routeFromHash(window.location.hash));
      setActiveBoardId(boardIdFromHash(window.location.hash));
    };

    window.addEventListener("hashchange", handleHashChange);
    return () => window.removeEventListener("hashchange", handleHashChange);
  }, []);

  useEffect(() => {
    if (activeRoute !== "board" || !activeBoardId) return;

    let cancelled = false;
    const shouldRecordView = recordedViewRef.current !== activeBoardId;
    if (shouldRecordView) recordedViewRef.current = activeBoardId;
    const timeout = window.setTimeout(() => {
      setBoardLoading(true);
      setBoardError("");
      setPublicPreview(null);
      setPublicBoardOwnerId("");
      setPublicBoardTitle("");
      setPublicViewers([]);
      setPublicCommentCount(0);
      setCommentsPanelOpen(false);
      void getPublicBoard(activeBoardId, shouldRecordView)
        .then((record) => {
          if (!cancelled) {
            setPublicPreview(record.preview);
            setPublicBoardOwnerId(record.ownerId);
            setPublicBoardTitle(record.title);
            setPublicViewCount(record.viewCount);
            setPublicViewers(record.viewers);
            setPublicCommentCount(record.commentCount);
          }
        })
        .catch(() => {
          if (!cancelled) setBoardError("这个案件板不存在，或尚未公开。");
        })
        .finally(() => {
          if (!cancelled) setBoardLoading(false);
        });
    }, 0);

    return () => {
      cancelled = true;
      window.clearTimeout(timeout);
    };
  }, [activeBoardId, activeRoute]);

  const handlePublish = useCallback(async (payload: BoardPublishPayload) => {
    if (!session?.user.id) throw new Error("请先登录，再发布案件板");
    return publishBoard(payload, session.user.id);
  }, [session]);

  const handleDeletePublished = useCallback(async (clientId: string) => {
    if (!session?.user.id) throw new Error("请先登录，再删除公开案件板");
    await deleteOwnBoardByClientId(clientId, session.user.id);
  }, [session]);

  const logout = () => {
    setProfile(null);
    void supabase.auth.signOut();
  };

  const updatePublicCommentCount = useCallback((count: number) => {
    setPublicCommentCount(count);
  }, []);

  const deleteActiveBoard = async () => {
    if (!session?.user.id || !activeBoardId || publicBoardOwnerId !== session.user.id) return;
    const title = publicPreview?.meta.caseTitle || "这个案件板";
    if (!window.confirm(`永久删除“${title}”？评论、点赞和案件图片也会一并删除，此操作无法撤销。`)) return;

    setDeletingActiveBoard(true);
    try {
      await deleteOwnBoard(activeBoardId, session.user.id);
      setPublicPreview(null);
      setPublicBoardOwnerId("");
      setPublicBoardTitle("");
      setPublicViewers([]);
      setCommentsPanelOpen(false);
      navigate("workshop");
    } catch {
      setBoardError("案件没有删除，请稍后重试。");
    } finally {
      setDeletingActiveBoard(false);
    }
  };

  let page;
  if (activeRoute === "board") {
    if (activeBoardId && boardLoading) {
      page = <div className="online-board-status"><FolderOpenIcon size={34} /><strong>正在打开案件板…</strong></div>;
    } else if (activeBoardId && boardError) {
      page = (
        <div className="online-board-status">
          <strong>{boardError}</strong>
          <button onClick={() => navigate("workshop")}>返回公共案件板</button>
        </div>
      );
    } else {
      page = (
        <div className="online-board-stage">
          <DetectiveBoard
            key={activeBoardId || "local-editor"}
            publicPreview={activeBoardId ? publicPreview ?? undefined : undefined}
            canPublish={Boolean(session)}
            onPublish={handlePublish}
            onDeletePublished={handleDeletePublished}
            onRequireSignIn={() => setAuthMode("signin")}
            headerStatusAddon={activeBoardId ? (
              <div className="online-viewer-presence" aria-label={`浏览 ${publicViewCount} 次`}>
                <span className="online-viewer-count"><EyeIcon size={14} />{publicViewCount}</span>
                {publicViewers.length > 0 ? (
                  <span className="online-viewer-stack" aria-label="最近查看过这个案件的社区用户">
                    {publicViewers.slice(0, 5).map((viewer) => (
                      <ProfileAvatar
                        key={viewer.id}
                        url={viewer.avatarUrl}
                        name={`${viewer.displayName}${viewer.handle ? ` ${viewer.handle}` : ""}`}
                        size={27}
                      />
                    ))}
                    {publicViewers.length > 5 && <b>+{publicViewers.length - 5}</b>}
                  </span>
                ) : (
                  <small>暂无登录访客</small>
                )}
              </div>
            ) : undefined}
            inspectorHeaderAddon={activeBoardId ? (
              <button
                className="online-inspector-comments-button"
                onClick={() => setCommentsPanelOpen(true)}
                title="查看协助探案的留言"
              >
                <ChatCircleIcon size={14} />
                <span>协助留言</span>
                <b>{publicCommentCount}</b>
              </button>
            ) : undefined}
            headerAddon={(
              <div className="online-preview-ribbon" aria-label="社区案件操作">
                <span>COMMUNITY</span>
                {activeBoardId && session?.user.id === publicBoardOwnerId && (
                  <button
                    className="online-delete-published"
                    disabled={deletingActiveBoard}
                    onClick={() => void deleteActiveBoard()}
                    title="删除我的公开案件"
                  >
                    <TrashIcon size={14} />
                    <span>{deletingActiveBoard ? "删除中…" : "删除案件"}</span>
                  </button>
                )}
                <button onClick={() => navigate("workshop")} title="返回公共案件板">
                  <FolderOpenIcon size={14} />
                  <span>返回社区</span>
                </button>
              </div>
            )}
          />
          {activeBoardId && commentsPanelOpen && (
            <BoardCommentsPanel
              boardId={activeBoardId}
              boardTitle={publicBoardTitle || publicPreview?.meta.caseTitle || "公开案件板"}
              session={session}
              onClose={() => setCommentsPanelOpen(false)}
              onOpenAuth={setAuthMode}
              onCountChange={updatePublicCommentCount}
            />
          )}
        </div>
      );
    }
  } else {
    page = (
      <CommunityHome
        session={session}
        profile={profile}
        onOpenAuth={setAuthMode}
        onLogout={logout}
        onProfileChange={setProfile}
      />
    );
  }

  return (
    <>
      {page}
      {authMode && <AuthDialog mode={authMode} onClose={() => setAuthMode(null)} />}
    </>
  );
}
