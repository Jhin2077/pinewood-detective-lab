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
  TrendUpIcon,
  UserIcon,
  UserPlusIcon,
} from "./ui-kit/icons/PinewoodIcons";
import { type FormEvent, useEffect, useMemo, useState } from "react";
import { DetectiveBoard } from "./DetectiveBoard";
import { CASE_GENRES as PUBLISHABLE_CASE_GENRES } from "./caseGenres";
import { DarkVeil } from "./components/DarkVeil";
import { OptionWheel } from "./components/OptionWheel";

type RouteId = "workshop" | "board";
type CommunityTheme = "light" | "dark";

type CommunityBoard = {
  id: string;
  title: string;
  author: string;
  handle: string;
  description: string;
  tags: string[];
  genres: string[];
  likes: number;
  comments: number;
  views: number;
  time: string;
  image: string;
};

const COMMUNITY_THEME_KEY = "pinewood-case-board-theme";
const COMMUNITY_TERMS_VERSION = "2026-07-24-v1";
const CLOUD_AUTH_READY = false;

const CASE_GENRES = [
  "全部案件",
  ...PUBLISHABLE_CASE_GENRES,
];

// The public community deliberately starts empty. Supabase will become the
// source of truth for accounts and published boards.
const communityBoards: CommunityBoard[] = [];

if ("scrollRestoration" in window.history) {
  window.history.scrollRestoration = "manual";
}

function routeFromHash(hash: string): RouteId {
  if (hash.startsWith("#share=")) return "board";
  return hash.replace(/^#\/?/, "").split("?")[0] === "board" ? "board" : "workshop";
}

function navigate(route: RouteId) {
  window.location.hash = `#/${route}`;
}

function AuthDialog({
  mode,
  onClose,
}: {
  mode: "signin" | "signup";
  onClose: () => void;
}) {
  const [activeMode, setActiveMode] = useState(mode);
  const [ageConfirmed, setAgeConfirmed] = useState(false);
  const [rulesAccepted, setRulesAccepted] = useState(false);
  const isSignup = activeMode === "signup";
  const registrationReady = ageConfirmed && rulesAccepted;

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
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
        <h2 id="community-auth-title">{activeMode === "signin" ? "登录侦探档案" : "注册新的侦探身份"}</h2>
        <div className="community-auth-tabs">
          <button className={activeMode === "signin" ? "is-active" : ""} onClick={() => setActiveMode("signin")}>登录</button>
          <button className={activeMode === "signup" ? "is-active" : ""} onClick={() => setActiveMode("signup")}>注册</button>
        </div>
        <form onSubmit={submit}>
          {isSignup && (
            <label>
              <span>显示名称</span>
              <input required placeholder="你的侦探名" disabled />
            </label>
          )}
          <label>
            <span>邮箱</span>
            <input required type="email" placeholder="detective@example.com" disabled />
          </label>
          <label>
            <span>密码</span>
            <input required type="password" minLength={6} placeholder="至少 6 位字符" disabled />
          </label>
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
                  <p>服务与数据不保证永久可用，请自行导出并保留重要内容。正式公测前还会补充举报与联系渠道。</p>
                  <small>条款版本：{COMMUNITY_TERMS_VERSION}</small>
                </div>
              </details>
              {!registrationReady && (
                <p className="community-registration-hint">确认年龄并接受规则后，才能完成注册。</p>
              )}
            </div>
          )}
          <button
            className="community-auth-submit"
            type="submit"
            disabled={!CLOUD_AUTH_READY || (isSignup && !registrationReady)}
          >
            {activeMode === "signin"
              ? <><SignInIcon size={17} />云端登录即将开放</>
              : <><UserPlusIcon size={17} />云端注册即将开放</>}
          </button>
        </form>
        <small>
          空白发布版不会创建假账号。接入 Supabase 后，这里才会真正注册和登录；
          注册时仅保存年龄确认、接受时间与条款版本，不收集出生日期。
        </small>
      </section>
    </div>
  );
}

function CommunityHome() {
  const [search, setSearch] = useState("");
  const [sortMode, setSortMode] = useState<"hot" | "new" | "top">("hot");
  const [activeTag, setActiveTag] = useState("");
  const [activeGenre, setActiveGenre] = useState("");
  const [genreWheelVersion, setGenreWheelVersion] = useState(0);
  const [authMode, setAuthMode] = useState<"signin" | "signup" | null>(null);
  const [theme, setTheme] = useState<CommunityTheme>(() => {
    const storedTheme = window.localStorage.getItem(COMMUNITY_THEME_KEY);
    return storedTheme === "dark" || storedTheme === "light" ? storedTheme : "light";
  });

  useEffect(() => {
    window.localStorage.setItem(COMMUNITY_THEME_KEY, theme);
  }, [theme]);

  const visibleBoards = useMemo(() => {
    const query = search.trim().toLowerCase();
    const filtered = communityBoards.filter((board) => {
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
      if (sortMode === "new") return communityBoards.indexOf(a) - communityBoards.indexOf(b);
      if (sortMode === "top") return b.likes - a.likes;
      return b.views + b.comments * 4 - (a.views + a.comments * 4);
    });
  }, [activeGenre, activeTag, search, sortMode]);

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
            <small>松木镇公共案件社区 · SEMIOTIC INDEX 01</small>
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
          <button onClick={() => setAuthMode("signup")}><PlusIcon size={17} />创建案件板</button>
          <button className="community-plain-login" onClick={() => setAuthMode("signin")}><SignInIcon size={17} />登录</button>
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
          <section className="community-side-panel community-recent">
            <h2><FolderOpenIcon size={19} />最近浏览</h2>
            <p>还没有浏览记录。接入云端后，登录用户可以从这里继续自己的调查。</p>
            <button className="community-side-login" onClick={() => setAuthMode("signin")}><SignInIcon size={16} />登录</button>
          </section>

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
              <button className="community-board-card" key={board.id}>
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
                    <i><HeartIcon size={15} />{board.likes}</i>
                    <i><ChatCircleIcon size={15} />{board.comments}</i>
                    <i><EyeIcon size={15} />{board.views}</i>
                  </span>
                </span>
                <img className="community-board-thumb" src={board.image} alt={`${board.title} 线索板预览`} />
              </button>
            ))}

            {communityBoards.length === 0 ? (
              <div className="community-empty community-empty-first">
                <FolderOpenIcon size={34} />
                <strong>社区里还没有公开案件板</strong>
                <span>这里不放置示例案件。第一份公开档案将由真实用户创建。</span>
                <button onClick={() => setAuthMode("signup")}><UserPlusIcon size={17} />注册并创建第一份档案</button>
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
            <span className="community-account-icon"><UserIcon size={34} /></span>
            <strong>建立你的侦探档案</strong>
            <p>接入 Supabase 后，登录用户可以创建、保存并公开自己的案件板。</p>
            <button className="community-account-primary" onClick={() => setAuthMode("signin")}><SignInIcon size={17} />登录</button>
            <button className="community-account-secondary" onClick={() => setAuthMode("signup")}><UserPlusIcon size={17} />注册</button>
          </section>

          <section className="community-side-panel community-guide">
            <h2>社区如何运作</h2>
            <ol>
              <li><b>01</b><span>注册自己的侦探身份</span></li>
              <li><b>02</b><span>从空白画布创建案件板</span></li>
              <li><b>03</b><span>选择是否公开到社区</span></li>
            </ol>
            <button onClick={() => setAuthMode("signup")}>注册后开始创作</button>
          </section>
        </aside>
      </div>

      {authMode && <AuthDialog mode={authMode} onClose={() => setAuthMode(null)} />}
    </div>
  );
}

export function OnlineWorkshopApp() {
  const [activeRoute, setActiveRoute] = useState<RouteId>(() => routeFromHash(window.location.hash));

  useEffect(() => {
    if (!window.location.hash || window.location.hash.startsWith("#/facilitator")) {
      window.history.replaceState(null, "", "#/workshop");
    }

    const handleHashChange = () => {
      if (!window.location.hash || window.location.hash.startsWith("#/facilitator")) {
        window.history.replaceState(null, "", "#/workshop");
      }
      setActiveRoute(routeFromHash(window.location.hash));
    };

    window.addEventListener("hashchange", handleHashChange);
    return () => window.removeEventListener("hashchange", handleHashChange);
  }, []);

  if (activeRoute === "board") {
    return (
      <div className="online-board-stage">
        <DetectiveBoard />
        <div className="online-preview-ribbon">
          <span>CASE BOARD · EMPTY WORKSPACE</span>
          <button onClick={() => navigate("workshop")}>← 返回公共案件板</button>
        </div>
      </div>
    );
  }

  return <CommunityHome />;
}
