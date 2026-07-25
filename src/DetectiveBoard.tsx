import {
  ArrowsClockwiseIcon,
  ArrowsOutIcon,
  BroadcastIcon,
  CheckCircleIcon,
  ClockIcon,
  CursorClickIcon,
  DownloadSimpleIcon,
  EyeIcon,
  FileTextIcon,
  FloppyDiskIcon,
  GraphIcon,
  HandIcon,
  ImageIcon,
  LinkBreakIcon,
  LinkSimpleIcon,
  MinusIcon,
  NoteIcon,
  PlusIcon,
  PresentationIcon,
  PushPinIcon,
  ShareNetworkIcon,
  StackIcon,
  TagIcon,
  TrashIcon,
  UploadSimpleIcon,
  UserIcon,
  XIcon,
  type Icon,
} from "./ui-kit/icons/PinewoodIcons";
import {
  CASE_GENRES,
  normalizeCaseGenre,
  type CaseGenre,
} from "./caseGenres";
import {
  type ChangeEvent,
  type DragEvent as ReactDragEvent,
  type MouseEvent as ReactMouseEvent,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

type CardType = "person" | "scene" | "evidence" | "document" | "sticky" | "map" | "asset";
type Tool = "select" | "connect" | "pan";
type ViewMode = "board" | "timeline" | "graph";
type LayerAction = "front" | "forward" | "backward" | "back";
type InspectorMode = "card" | "library";

export type EvidenceCard = {
  id: string;
  type: CardType;
  title: string;
  subtitle: string;
  x: number;
  y: number;
  w: number;
  h: number;
  image?: string;
  content?: string;
  date: string;
  category: string;
  rotation: number;
  credibility: number;
  notes: string;
};

export type EvidenceLink = {
  id: string;
  from: string;
  to: string;
  status: "confirmed" | "unconfirmed";
};

export type BoardMeta = {
  caseTitle: string;
  caseCode: string;
  genre: CaseGenre | "";
};

type BoardSnapshot = {
  cards: EvidenceCard[];
  links: EvidenceLink[];
  meta?: BoardMeta;
  savedAt: string;
};

type BoardDocument = {
  id: string;
  publicBoardId?: string;
  meta: BoardMeta;
  cards: EvidenceCard[];
  links: EvidenceLink[];
  createdAt: string;
  updatedAt: string;
};

type MaterialAsset = {
  id: string;
  name: string;
  image: string;
  aspectRatio: number;
  createdAt: string;
};

type MaterialDragPreview = {
  assetId: string;
  x: number;
  y: number;
};

type WorkspaceSnapshot = {
  version: 2;
  boards: BoardDocument[];
  activeBoardId: string;
  assets?: MaterialAsset[];
  savedAt: string;
};

type CardContextMenu = {
  cardId: string;
  x: number;
  y: number;
};

export type PublicBoardPreview = {
  meta: BoardMeta;
  cards: EvidenceCard[];
  links: EvidenceLink[];
};

export type BoardPublishPayload = PublicBoardPreview & {
  clientId: string;
};

const BOARD_W = 1240;
const BOARD_H = 760;
const MIN_SCALE = 0.05;
const MAX_SCALE = 8;
const MAX_IMAGE_BYTES = 2 * 1024 * 1024;
const MAX_IMAGE_LABEL = "2MB";
const clampScale = (value: number) => Math.max(MIN_SCALE, Math.min(MAX_SCALE, value));
const WORKSPACE_STORAGE_KEY = "pinewood-case-lab-community-workspace-v4";
const blankMeta: BoardMeta = { caseTitle: "未命名线索板", caseCode: "BOARD-001", genre: "" };
const blankCards: EvidenceCard[] = [];
const blankLinks: EvidenceLink[] = [];

const toolItems: Array<{ id: Tool | "graph" | "photo" | "person" | "evidence" | "sticky"; label: string; icon: Icon; shortcut?: string }> = [
  { id: "select", label: "选择", icon: CursorClickIcon, shortcut: "V" },
  { id: "graph", label: "关系图谱", icon: GraphIcon },
  { id: "photo", label: "照片", icon: ImageIcon },
  { id: "person", label: "人物", icon: UserIcon },
  { id: "evidence", label: "物证", icon: TagIcon },
  { id: "sticky", label: "便签", icon: NoteIcon },
];

function makeId(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

function createBoardDocument(
  meta: BoardMeta,
  cards: EvidenceCard[] = [],
  links: EvidenceLink[] = [],
  id = makeId("board"),
): BoardDocument {
  const now = new Date().toISOString();
  return {
    id,
    meta: { ...meta, genre: normalizeCaseGenre(meta.genre) },
    cards: [...cards],
    links: [...links],
    createdAt: now,
    updatedAt: now,
  };
}

const INITIAL_BOARD = createBoardDocument(blankMeta, blankCards, blankLinks, "board-001");

function resolveUpdate<T>(update: T | ((current: T) => T), current: T): T {
  return typeof update === "function" ? (update as (value: T) => T)(current) : update;
}

function encodeSnapshot(snapshot: BoardSnapshot) {
  const shareable = {
    ...snapshot,
    cards: snapshot.cards.map((card) => ({
      ...card,
      image: card.image?.startsWith("data:") ? undefined : card.image,
    })),
  };
  return btoa(unescape(encodeURIComponent(JSON.stringify(shareable))));
}

function decodeSnapshot(value: string): BoardSnapshot | null {
  try {
    return JSON.parse(decodeURIComponent(escape(atob(value)))) as BoardSnapshot;
  } catch {
    return null;
  }
}

export function DetectiveBoard({
  publicPreview,
  canPublish = false,
  onPublish,
  onDeletePublished,
  onRequireSignIn,
  headerAddon,
  headerStatusAddon,
  inspectorHeaderAddon,
}: {
  publicPreview?: PublicBoardPreview;
  canPublish?: boolean;
  onPublish?: (payload: BoardPublishPayload) => Promise<string>;
  onDeletePublished?: (clientId: string) => Promise<void>;
  onRequireSignIn?: () => void;
  headerAddon?: ReactNode;
  headerStatusAddon?: ReactNode;
  inspectorHeaderAddon?: ReactNode;
} = {}) {
  const [boards, setBoards] = useState<BoardDocument[]>([INITIAL_BOARD]);
  const [activeBoardId, setActiveBoardId] = useState(INITIAL_BOARD.id);
  const [selectedId, setSelectedId] = useState("");
  const [activeTool, setActiveTool] = useState<Tool>("select");
  const [connectionStart, setConnectionStart] = useState<string | null>(null);
  const [contextMenu, setContextMenu] = useState<CardContextMenu | null>(null);
  const [inspectorMode, setInspectorMode] = useState<InspectorMode>("card");
  const [mobileInspectorOpen, setMobileInspectorOpen] = useState(false);
  const [assets, setAssets] = useState<MaterialAsset[]>([]);
  const [materialDragPreview, setMaterialDragPreview] = useState<MaterialDragPreview | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>("board");
  const [scale, setScale] = useState(0.82);
  const [pan, setPan] = useState({ x: 12, y: 8 });
  const [toast, setToast] = useState("");
  const [presentation, setPresentation] = useState(false);
  const [sharedView, setSharedView] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [deletingCurrentBoard, setDeletingCurrentBoard] = useState(false);
  const [saveState, setSaveState] = useState<"saved" | "saving">("saved");
  const [mounted, setMounted] = useState(false);
  const [portraitHintOpen, setPortraitHintOpen] = useState(
    () => window.sessionStorage.getItem("pinewood-mobile-landscape-hint") !== "dismissed",
  );

  const fileInputRef = useRef<HTMLInputElement>(null);
  const replaceInputRef = useRef<HTMLInputElement>(null);
  const importInputRef = useRef<HTMLInputElement>(null);
  const materialInputRef = useRef<HTMLInputElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{
    id: string;
    pointerX: number;
    pointerY: number;
    cardX: number;
    cardY: number;
    moved: boolean;
  } | null>(null);
  const panRef = useRef<{ pointerX: number; pointerY: number; panX: number; panY: number } | null>(null);
  const materialPointerDragRef = useRef<{ assetId: string; startX: number; startY: number } | null>(null);
  const publicPreviewRef = useRef(publicPreview);

  const activeBoard = useMemo(
    () => boards.find((board) => board.id === activeBoardId) ?? boards[0] ?? INITIAL_BOARD,
    [activeBoardId, boards],
  );
  const { cards, links, meta } = activeBoard;
  const activeBoardIndex = Math.max(0, boards.findIndex((board) => board.id === activeBoard.id));

  const updateActiveBoard = useCallback(
    (updater: (board: BoardDocument) => BoardDocument) => {
      setBoards((current) =>
        current.map((board) =>
          board.id === activeBoardId
            ? { ...updater(board), updatedAt: new Date().toISOString() }
            : board,
        ),
      );
    },
    [activeBoardId],
  );

  const setCards = useCallback(
    (update: EvidenceCard[] | ((current: EvidenceCard[]) => EvidenceCard[])) => {
      updateActiveBoard((board) => ({ ...board, cards: resolveUpdate(update, board.cards) }));
    },
    [updateActiveBoard],
  );

  const setLinks = useCallback(
    (update: EvidenceLink[] | ((current: EvidenceLink[]) => EvidenceLink[])) => {
      updateActiveBoard((board) => ({ ...board, links: resolveUpdate(update, board.links) }));
    },
    [updateActiveBoard],
  );

  const setMeta = useCallback(
    (update: BoardMeta | ((current: BoardMeta) => BoardMeta)) => {
      updateActiveBoard((board) => ({ ...board, meta: resolveUpdate(update, board.meta) }));
    },
    [updateActiveBoard],
  );

  const selected = cards.find((card) => card.id === selectedId) ?? null;
  const draggingMaterial = materialDragPreview
    ? assets.find((asset) => asset.id === materialDragPreview.assetId) ?? null
    : null;
  const linkedCards = useMemo(() => {
    if (!selected) return [];
    const ids = links.flatMap((link) => {
      if (link.from === selected.id) return [link.to];
      if (link.to === selected.id) return [link.from];
      return [];
    });
    return cards.filter((card) => ids.includes(card.id));
  }, [cards, links, selected]);
  const contextCard = contextMenu
    ? cards.find((card) => card.id === contextMenu.cardId) ?? null
    : null;
  const contextLinkedCards = useMemo(() => {
    if (!contextCard) return [];
    const ids = links.flatMap((link) => {
      if (link.from === contextCard.id) return [link.to];
      if (link.to === contextCard.id) return [link.from];
      return [];
    });
    return cards.filter((card) => ids.includes(card.id));
  }, [cards, contextCard, links]);
  const chronologyCards = useMemo(
    () => [...cards].sort((a, b) => a.date.localeCompare(b.date)).slice(0, 5),
    [cards],
  );

  const showToast = useCallback((message: string) => {
    setToast(message);
    window.setTimeout(() => setToast(""), 2400);
  }, []);

  useEffect(() => {
    const initialization = window.setTimeout(() => {
      const preview = publicPreviewRef.current;
      const hash = window.location.hash;
      if (preview) {
        const sharedBoard = createBoardDocument(
          preview.meta,
          preview.cards,
          preview.links,
          "public-board",
        );
        setBoards([sharedBoard]);
        setActiveBoardId(sharedBoard.id);
        setSelectedId(preview.cards[0]?.id ?? "");
        setSharedView(true);
        setPresentation(false);
      } else if (hash.startsWith("#share=")) {
        const parsed = decodeSnapshot(hash.slice(7));
        if (parsed && Array.isArray(parsed.cards)) {
          const sharedBoard = createBoardDocument(
            parsed.meta ?? blankMeta,
            parsed.cards,
            parsed.links ?? [],
            "shared-board",
          );
          setBoards([sharedBoard]);
          setActiveBoardId(sharedBoard.id);
          setSelectedId(parsed.cards[0]?.id ?? "");
          setSharedView(true);
          setPresentation(true);
        }
      } else {
        const workspace = window.localStorage.getItem(WORKSPACE_STORAGE_KEY);
        if (workspace) {
          try {
            const parsed = JSON.parse(workspace) as WorkspaceSnapshot;
            if (parsed.version === 2 && Array.isArray(parsed.boards) && parsed.boards.length > 0) {
              setBoards(parsed.boards.map((board) => ({
                ...board,
                meta: {
                  ...board.meta,
                  genre: normalizeCaseGenre(board.meta?.genre),
                },
              })));
              setAssets(Array.isArray(parsed.assets) ? parsed.assets : []);
              setActiveBoardId(
                parsed.boards.some((board) => board.id === parsed.activeBoardId)
                  ? parsed.activeBoardId
                  : parsed.boards[0].id,
              );
            }
          } catch {
            window.localStorage.removeItem(WORKSPACE_STORAGE_KEY);
          }
        }
      }
      setMounted(true);
    }, 0);
    return () => window.clearTimeout(initialization);
  }, []);

  useEffect(() => {
    if (!mounted || sharedView) return;
    const statusTimeout = window.setTimeout(() => setSaveState("saving"), 0);
    const timeout = window.setTimeout(() => {
      try {
        const workspace: WorkspaceSnapshot = {
          version: 2,
          boards,
          activeBoardId,
          assets,
          savedAt: new Date().toISOString(),
        };
        window.localStorage.setItem(WORKSPACE_STORAGE_KEY, JSON.stringify(workspace));
        setSaveState("saved");
      } catch {
        setSaveState("saved");
      }
    }, 420);
    return () => {
      window.clearTimeout(statusTimeout);
      window.clearTimeout(timeout);
    };
  }, [activeBoardId, assets, boards, mounted, sharedView]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if ((event.target as HTMLElement)?.matches("input, textarea")) return;
      if (event.key.toLowerCase() === "v") setActiveTool("select");
      if (event.key.toLowerCase() === "c") setActiveTool("connect");
      if (event.key === "Escape") {
        setConnectionStart(null);
        setContextMenu(null);
        setPresentation(false);
      }
      if ((event.key === "Delete" || event.key === "Backspace") && selectedId && !sharedView) {
        removeSelected();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  useEffect(() => {
    if (!contextMenu) return;
    const closeMenu = () => setContextMenu(null);
    window.addEventListener("pointerdown", closeMenu);
    return () => window.removeEventListener("pointerdown", closeMenu);
  }, [contextMenu]);

  const updateCard = (id: string, patch: Partial<EvidenceCard>) => {
    if (sharedView) return;
    setCards((current) => current.map((card) => (card.id === id ? { ...card, ...patch } : card)));
  };

  const onCardPointerDown = (event: ReactPointerEvent<HTMLElement>, card: EvidenceCard) => {
    if (event.button !== 0) return;
    event.stopPropagation();
    setContextMenu(null);
    setSelectedId(card.id);
    setInspectorMode("card");
    if (sharedView) {
      (event.currentTarget as HTMLElement).setPointerCapture(event.pointerId);
      dragRef.current = {
        id: card.id,
        pointerX: event.clientX,
        pointerY: event.clientY,
        cardX: card.x,
        cardY: card.y,
        moved: false,
      };
      return;
    }
    if (activeTool === "connect") {
      if (!connectionStart) {
        setConnectionStart(card.id);
        showToast(`已选择起点：${card.title}`);
      } else if (connectionStart !== card.id) {
        const exists = links.some(
          (link) =>
            (link.from === connectionStart && link.to === card.id) ||
            (link.to === connectionStart && link.from === card.id),
        );
        if (!exists) {
          setLinks((current) => [
            ...current,
            { id: makeId("link"), from: connectionStart, to: card.id, status: "confirmed" },
          ]);
          showToast("线索已经用红线连接");
        } else {
          showToast("这两条线索已经连接");
        }
        setConnectionStart(null);
        setActiveTool("select");
      }
      return;
    }
    if (activeTool !== "select") return;
    (event.currentTarget as HTMLElement).setPointerCapture(event.pointerId);
    dragRef.current = {
      id: card.id,
      pointerX: event.clientX,
      pointerY: event.clientY,
      cardX: card.x,
      cardY: card.y,
      moved: false,
    };
  };

  const onCardPointerMove = (event: ReactPointerEvent<HTMLElement>) => {
    const drag = dragRef.current;
    if (!drag) return;
    if (Math.hypot(event.clientX - drag.pointerX, event.clientY - drag.pointerY) > 5) {
      drag.moved = true;
    }
    const nextX = drag.cardX + (event.clientX - drag.pointerX) / scale;
    const nextY = drag.cardY + (event.clientY - drag.pointerY) / scale;
    setCards((current) => current.map((card) => (
      card.id === drag.id ? { ...card, x: nextX, y: nextY } : card
    )));
  };

  const onCardPointerUp = () => {
    const drag = dragRef.current;
    if (
      drag
      && !drag.moved
      && window.matchMedia("(max-width: 880px)").matches
    ) {
      setSelectedId(drag.id);
      setInspectorMode("card");
      setMobileInspectorOpen(true);
    }
    dragRef.current = null;
  };

  const onCardContextMenu = (event: ReactMouseEvent<HTMLElement>, card: EvidenceCard) => {
    event.preventDefault();
    event.stopPropagation();
    setSelectedId(card.id);
    setInspectorMode("card");
    setContextMenu({
      cardId: card.id,
      x: Math.max(12, Math.min(window.innerWidth - 250, event.clientX)),
      y: Math.max(72, Math.min(window.innerHeight - 390, event.clientY)),
    });
  };

  const moveCardLayer = (cardId: string, action: LayerAction) => {
    if (sharedView) return;
    setCards((current) => {
      const fromIndex = current.findIndex((card) => card.id === cardId);
      if (fromIndex < 0) return current;
      const next = [...current];
      const [card] = next.splice(fromIndex, 1);
      if (action === "front") next.push(card);
      if (action === "back") next.unshift(card);
      if (action === "forward") next.splice(Math.min(fromIndex + 1, next.length), 0, card);
      if (action === "backward") next.splice(Math.max(fromIndex - 1, 0), 0, card);
      return next;
    });
    setContextMenu(null);
    showToast("卡片图层顺序已调整");
  };

  const beginConnection = (cardId: string) => {
    if (sharedView) return;
    const card = cards.find((item) => item.id === cardId);
    if (!card) return;
    setSelectedId(cardId);
    setConnectionStart(cardId);
    setActiveTool("connect");
    setViewMode("board");
    setContextMenu(null);
    showToast(`连线起点：${card.title}，再点另一张卡片`);
  };

  const removeLinkBetween = (firstId: string, secondId: string) => {
    if (sharedView) return;
    setLinks((current) =>
      current.filter(
        (link) =>
          !(
            (link.from === firstId && link.to === secondId) ||
            (link.from === secondId && link.to === firstId)
          ),
      ),
    );
    setContextMenu(null);
    showToast("两条线索的连线已取消");
  };

  const removeAllLinksForCard = (cardId: string) => {
    if (sharedView) return;
    const count = links.filter((link) => link.from === cardId || link.to === cardId).length;
    if (!count) return;
    setLinks((current) => current.filter((link) => link.from !== cardId && link.to !== cardId));
    setContextMenu(null);
    showToast(`已取消这张卡片的 ${count} 条连线`);
  };

  const onStagePointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (activeTool === "pan" || event.button === 1 || event.pointerType === "touch") {
      setContextMenu(null);
      event.currentTarget.setPointerCapture(event.pointerId);
      panRef.current = { pointerX: event.clientX, pointerY: event.clientY, panX: pan.x, panY: pan.y };
      return;
    }
    if (event.target !== event.currentTarget && !(event.target as HTMLElement).classList.contains("board-world")) return;
    setContextMenu(null);
    setSelectedId("");
    setConnectionStart(null);
  };

  const onStagePointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    const start = panRef.current;
    if (!start) return;
    setPan({ x: start.panX + event.clientX - start.pointerX, y: start.panY + event.clientY - start.pointerY });
  };

  const onStagePointerUp = () => {
    panRef.current = null;
  };

  const fitInitialView = useCallback(() => {
    const stage = stageRef.current;
    if (!stage) return;
    const nextScale = Math.min((stage.clientWidth - 36) / BOARD_W, (stage.clientHeight - 36) / BOARD_H, 1);
    setScale(Number(nextScale.toFixed(2)));
    setPan({ x: 18, y: 18 });
  }, []);

  useEffect(() => {
    if (!mounted) return;
    fitInitialView();
    window.addEventListener("resize", fitInitialView);
    return () => window.removeEventListener("resize", fitInitialView);
  }, [fitInitialView, mounted, presentation]);

  const getCanvasViewportCenter = () => {
    const stage = stageRef.current;
    if (!stage) return { x: BOARD_W / 2, y: BOARD_H / 2 };
    return {
      x: (stage.clientWidth / 2 - pan.x) / scale,
      y: (stage.clientHeight / 2 - pan.y) / scale,
    };
  };

  const zoomCanvasAt = (nextScaleValue: number, clientX: number, clientY: number) => {
    const stage = stageRef.current;
    if (!stage) return;
    const nextScale = clampScale(nextScaleValue);
    const rect = stage.getBoundingClientRect();
    const pointerX = clientX - rect.left;
    const pointerY = clientY - rect.top;
    const worldX = (pointerX - pan.x) / scale;
    const worldY = (pointerY - pan.y) / scale;
    setScale(Number(nextScale.toFixed(3)));
    setPan({
      x: pointerX - worldX * nextScale,
      y: pointerY - worldY * nextScale,
    });
  };

  const zoomCanvasFromCenter = (factor: number) => {
    const stage = stageRef.current;
    if (!stage) return;
    const rect = stage.getBoundingClientRect();
    zoomCanvasAt(scale * factor, rect.left + rect.width / 2, rect.top + rect.height / 2);
  };

  const fitBoard = () => {
    const stage = stageRef.current;
    if (!stage) return;
    if (!cards.length) {
      fitInitialView();
      return;
    }
    const minX = Math.min(...cards.map((card) => card.x));
    const minY = Math.min(...cards.map((card) => card.y));
    const maxX = Math.max(...cards.map((card) => card.x + card.w));
    const maxY = Math.max(...cards.map((card) => card.y + card.h));
    const contentWidth = Math.max(120, maxX - minX);
    const contentHeight = Math.max(120, maxY - minY);
    const nextScale = clampScale(Math.min(
      (stage.clientWidth - 120) / contentWidth,
      (stage.clientHeight - 120) / contentHeight,
      1.4,
    ));
    setScale(Number(nextScale.toFixed(3)));
    setPan({
      x: (stage.clientWidth - contentWidth * nextScale) / 2 - minX * nextScale,
      y: (stage.clientHeight - contentHeight * nextScale) / 2 - minY * nextScale,
    });
  };

  const addCard = (type: CardType, image?: string) => {
    if (sharedView) return;
    if (type === "asset") return;
    const presets: Record<Exclude<CardType, "asset">, Pick<EvidenceCard, "title" | "subtitle" | "w" | "h" | "category" | "content">> = {
      person: { title: "未命名人物", subtitle: "身份待确认", w: 158, h: 215, category: "人物", content: undefined },
      scene: { title: "新现场照片", subtitle: "拍摄时间待确认", w: 235, h: 180, category: "现场", content: undefined },
      evidence: { title: "新物证", subtitle: "来源待确认", w: 210, h: 164, category: "物证", content: undefined },
      document: { title: "新文件", subtitle: "待归档", w: 190, h: 210, category: "文件", content: "双击右侧档案抽屉开始补充内容。" },
      sticky: { title: "新线索？", subtitle: "待验证", w: 166, h: 112, category: "便签", content: "把你的推测写在这里。" },
      map: { title: "新地点", subtitle: "位置待确认", w: 235, h: 150, category: "地点", content: undefined },
    };
    const preset = presets[type];
    const id = makeId(type);
    const placementIndex = cards.length;
    const center = getCanvasViewportCenter();
    const card: EvidenceCard = {
      id,
      type,
      title: preset.title,
      subtitle: preset.subtitle,
      x: center.x - preset.w / 2 + (placementIndex * 37) % 80,
      y: center.y - preset.h / 2 + (placementIndex * 29) % 70,
      w: preset.w,
      h: preset.h,
      image,
      content: preset.content,
      date: new Date().toISOString().slice(0, 10),
      category: preset.category,
      rotation: (placementIndex % 5) - 2,
      credibility: 50,
      notes: "补充这条线索的来源、疑点和下一步。",
    };
    setCards((current) => [...current, card]);
    setSelectedId(id);
    setInspectorMode("card");
    setMobileInspectorOpen(true);
    setActiveTool("select");
    setViewMode("board");
    showToast(`${preset.title}已放到线索板中央`);
  };

  const openMaterialLibrary = () => {
    if (sharedView) return;
    setInspectorMode("library");
    setMobileInspectorOpen(true);
    setSelectedId("");
    setConnectionStart(null);
    setContextMenu(null);
    setActiveTool("select");
    setViewMode("board");
  };

  const addMaterialToBoard = (asset: MaterialAsset, point?: { x: number; y: number }) => {
    if (sharedView) return;
    const maxSide = 210;
    const ratio = Math.max(0.2, Math.min(5, asset.aspectRatio || 1));
    let width = ratio >= 1 ? maxSide : maxSide * ratio;
    let height = ratio >= 1 ? maxSide / ratio : maxSide;
    width = Math.max(72, Math.round(width));
    height = Math.max(72, Math.round(height));
    const center = point ?? getCanvasViewportCenter();
    const id = makeId("asset");
    const card: EvidenceCard = {
      id,
      type: "asset",
      title: asset.name,
      subtitle: "素材库图层",
      x: center.x - width / 2,
      y: center.y - height / 2,
      w: width,
      h: height,
      image: asset.image,
      date: new Date().toISOString().slice(0, 10),
      category: "素材",
      rotation: 0,
      credibility: 100,
      notes: "从素材库添加的透明图层。",
    };
    setCards((current) => [...current, card]);
    setSelectedId(id);
    setActiveTool("select");
    setViewMode("board");
    showToast(`素材“${asset.name}”已添加到当前档案板`);
  };

  const handleMaterialUpload = (event: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? []);
    if (!files.length || sharedView) return;
    const acceptedFiles = files.filter((file) => file.size <= MAX_IMAGE_BYTES);
    const rejectedCount = files.length - acceptedFiles.length;
    if (rejectedCount > 0) {
      showToast(`${rejectedCount} 张图片超过 ${MAX_IMAGE_LABEL}，已阻止上传`);
    }
    if (!acceptedFiles.length) {
      event.target.value = "";
      return;
    }
    let completed = 0;
    acceptedFiles.forEach((file) => {
      const reader = new FileReader();
      reader.onload = () => {
        const image = new Image();
        image.onload = () => {
          const asset: MaterialAsset = {
            id: makeId("material"),
            name: file.name.replace(/\.[^.]+$/, "") || "未命名素材",
            image: String(reader.result),
            aspectRatio: image.naturalWidth > 0 && image.naturalHeight > 0
              ? image.naturalWidth / image.naturalHeight
              : 1,
            createdAt: new Date().toISOString(),
          };
          setAssets((current) => [...current, asset]);
          completed += 1;
          if (completed === acceptedFiles.length && rejectedCount === 0) {
            showToast(`${acceptedFiles.length} 个素材已加入素材库`);
          }
        };
        image.src = String(reader.result);
      };
      reader.readAsDataURL(file);
    });
    event.target.value = "";
  };

  const removeMaterial = (asset: MaterialAsset) => {
    if (!window.confirm(`从素材库删除“${asset.name}”？已放到档案板上的图层不会受影响。`)) return;
    setAssets((current) => current.filter((item) => item.id !== asset.id));
    showToast("素材已从素材库删除");
  };

  const onMaterialPointerDown = (event: ReactPointerEvent<HTMLElement>, asset: MaterialAsset) => {
    if (event.button !== 0 || (event.target as HTMLElement).closest("button")) return;
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    materialPointerDragRef.current = {
      assetId: asset.id,
      startX: event.clientX,
      startY: event.clientY,
    };
    setMaterialDragPreview({ assetId: asset.id, x: event.clientX, y: event.clientY });
  };

  const onMaterialPointerMove = (event: ReactPointerEvent<HTMLElement>) => {
    const drag = materialPointerDragRef.current;
    if (!drag) return;
    setMaterialDragPreview({ assetId: drag.assetId, x: event.clientX, y: event.clientY });
  };

  const finishMaterialPointerDrag = (event: ReactPointerEvent<HTMLElement>) => {
    const drag = materialPointerDragRef.current;
    materialPointerDragRef.current = null;
    setMaterialDragPreview(null);
    if (!drag) return;
    const moved = Math.hypot(event.clientX - drag.startX, event.clientY - drag.startY);
    const asset = assets.find((item) => item.id === drag.assetId);
    const stage = stageRef.current;
    if (moved < 6 || !asset || !stage) return;
    const rect = stage.getBoundingClientRect();
    if (
      event.clientX < rect.left ||
      event.clientX > rect.right ||
      event.clientY < rect.top ||
      event.clientY > rect.bottom
    ) return;
    addMaterialToBoard(asset, {
      x: (event.clientX - rect.left - pan.x) / scale,
      y: (event.clientY - rect.top - pan.y) / scale,
    });
  };

  const cancelMaterialPointerDrag = () => {
    materialPointerDragRef.current = null;
    setMaterialDragPreview(null);
  };

  const onBoardDrop = (event: ReactDragEvent<HTMLDivElement>) => {
    event.preventDefault();
    const assetId =
      event.dataTransfer.getData("application/x-pinewood-material") ||
      event.dataTransfer.getData("text/plain");
    const asset = assets.find((item) => item.id === assetId);
    const stage = stageRef.current;
    if (!asset || !stage) return;
    const rect = stage.getBoundingClientRect();
    addMaterialToBoard(asset, {
      x: (event.clientX - rect.left - pan.x) / scale,
      y: (event.clientY - rect.top - pan.y) / scale,
    });
  };

  const handleTool = (id: (typeof toolItems)[number]["id"]) => {
    if (id === "graph") {
      setViewMode("graph");
      setActiveTool("select");
      setConnectionStart(null);
      return;
    }
    if (id === "photo") {
      fileInputRef.current?.click();
      return;
    }
    if (id === "person") return addCard("person");
    if (id === "evidence") return addCard("evidence");
    if (id === "sticky") return addCard("sticky");
    if (id === "select") {
      setViewMode("board");
      setInspectorMode("card");
    }
    setActiveTool(id);
    setConnectionStart(null);
  };

  const handlePhoto = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (file.size > MAX_IMAGE_BYTES) {
      showToast(`图片不能超过 ${MAX_IMAGE_LABEL}`);
      event.target.value = "";
      return;
    }
    const reader = new FileReader();
    reader.onload = () => addCard("scene", String(reader.result));
    reader.readAsDataURL(file);
    event.target.value = "";
  };

  const handleReplaceImage = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !selected) return;
    if (file.size > MAX_IMAGE_BYTES) {
      showToast(`图片不能超过 ${MAX_IMAGE_LABEL}`);
      event.target.value = "";
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      updateCard(selected.id, { image: String(reader.result) });
      showToast("卡片图片已替换");
    };
    reader.readAsDataURL(file);
    event.target.value = "";
  };

  const manualSave = () => {
    if (sharedView) return;
    const workspace: WorkspaceSnapshot = {
      version: 2,
      boards,
      activeBoardId,
      assets,
      savedAt: new Date().toISOString(),
    };
    window.localStorage.setItem(WORKSPACE_STORAGE_KEY, JSON.stringify(workspace));
    setSaveState("saved");
    showToast(`${boards.length} 个档案板已保存在这台设备上`);
  };

  const shareBoard = async () => {
    if (!meta.genre) {
      showToast("请先选择案件类型，再发布到社区");
      return;
    }

    if (onPublish) {
      if (!canPublish) {
        showToast("登录后才能发布案件板");
        onRequireSignIn?.();
        return;
      }
      setPublishing(true);
      try {
        const publicBoardId = await onPublish({
          clientId: activeBoard.id,
          cards,
          links,
          meta,
        });
        updateActiveBoard((board) => ({ ...board, publicBoardId }));
        showToast("案件板已发布到社区");
        window.history.replaceState(null, "", `#/board?id=${encodeURIComponent(publicBoardId)}`);
      } catch (error) {
        showToast(error instanceof Error ? error.message : "发布失败，请稍后重试");
      } finally {
        setPublishing(false);
      }
      return;
    }

    const snapshot: BoardSnapshot = { cards, links, meta, savedAt: new Date().toISOString() };
    const url = `${window.location.origin}${window.location.pathname}#share=${encodeSnapshot(snapshot)}`;
    try {
      await navigator.clipboard.writeText(url);
    } catch {
      const textarea = document.createElement("textarea");
      textarea.value = url;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand("copy");
      textarea.remove();
    }
    showToast("只读链接已复制");
  };

  const exportBoard = () => {
    const snapshot: BoardSnapshot = { cards, links, meta, savedAt: new Date().toISOString() };
    const blob = new Blob([JSON.stringify(snapshot, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    const safeTitle = (meta.caseTitle || "未命名线索板")
      .replace(/[<>:"/\\|?*]/g, "-")
      .slice(0, 48);
    anchor.download = `${safeTitle}-${meta.caseCode || "BOARD"}.mystery.json`;
    anchor.click();
    URL.revokeObjectURL(url);
    showToast("线索板档案已导出");
  };

  const importBoard = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const snapshot = JSON.parse(String(reader.result)) as BoardSnapshot;
        if (!Array.isArray(snapshot.cards)) throw new Error("invalid");
        const imported = createBoardDocument(
          snapshot.meta ?? {
            caseTitle: `导入档案板 ${boards.length + 1}`,
            caseCode: `BOARD-${String(boards.length + 1).padStart(3, "0")}`,
            genre: "",
          },
          snapshot.cards,
          snapshot.links ?? [],
        );
        setBoards((current) => [...current, imported]);
        setActiveBoardId(imported.id);
        setSelectedId(snapshot.cards[0]?.id ?? "");
        setConnectionStart(null);
        setContextMenu(null);
        setViewMode("board");
        showToast("案件档案已作为新档案板导入");
      } catch {
        showToast("无法识别这个案件档案");
      }
    };
    reader.readAsText(file, "utf-8");
    event.target.value = "";
  };

  function removeCard(cardId: string) {
    if (sharedView) return;
    const target = cards.find((card) => card.id === cardId);
    if (!target) return;
    if (!window.confirm(`确认删除线索“${target.title}”？与它相关的连线也会一并删除，此操作无法撤销。`)) return;

    setCards((current) => current.filter((card) => card.id !== cardId));
    setLinks((current) => current.filter((link) => link.from !== cardId && link.to !== cardId));
    setSelectedId((current) => current === cardId ? "" : current);
    setContextMenu(null);
    showToast("线索已从案件板删除");
  }

  function removeSelected() {
    if (!selectedId) return;
    removeCard(selectedId);
  }

  const togglePresentation = async () => {
    setPresentation((current) => !current);
    if (!presentation && document.documentElement.requestFullscreen) {
      try {
        await document.documentElement.requestFullscreen();
      } catch {
        // Full-screen permissions vary; presentation layout still activates.
      }
    } else if (document.fullscreenElement) {
      await document.exitFullscreen();
    }
  };

  const startBlankBoard = () => {
    if (sharedView) return;
    const number = boards.length + 1;
    const board = createBoardDocument({
      caseTitle: `未命名线索板 ${number}`,
      caseCode: `BOARD-${String(number).padStart(3, "0")}`,
      genre: "",
    });
    setBoards((current) => [...current, board]);
    setActiveBoardId(board.id);
    setSelectedId("");
    setConnectionStart(null);
    setContextMenu(null);
    setActiveTool("select");
    setViewMode("board");
    setPan({ x: 18, y: 18 });
    setScale(0.82);
    showToast(`已新建档案板 ${number}，原来的档案板仍然保留`);
  };

  const switchBoard = (boardId: string) => {
    if (boardId === activeBoardId || !boards.some((board) => board.id === boardId)) return;
    setActiveBoardId(boardId);
    setSelectedId("");
    setConnectionStart(null);
    setContextMenu(null);
    setActiveTool("select");
    setViewMode("board");
    setPan({ x: 18, y: 18 });
    setScale(0.82);
  };

  const deleteCurrentBoard = async () => {
    if (sharedView || deletingCurrentBoard) return;
    if (activeBoard.publicBoardId && !canPublish) {
      showToast("请先登录，再删除已经公开的案件板");
      onRequireSignIn?.();
      return;
    }

    const warning = activeBoard.publicBoardId
      ? `永久删除“${meta.caseTitle}”？公共档案界中的版本也会同步消失，此操作无法撤销。`
      : `删除档案板“${meta.caseTitle}”？如果它已经发布，公共版本也会同步删除。此操作无法撤销。`;
    if (!window.confirm(warning)) return;

    setDeletingCurrentBoard(true);
    try {
      if (canPublish && onDeletePublished) {
        await onDeletePublished(activeBoard.id);
      }

      const remainingBoards = boards.filter((board) => board.id !== activeBoardId);
      const nextBoards = remainingBoards.length > 0
        ? remainingBoards
        : [createBoardDocument(blankMeta)];
      const nextBoard = nextBoards[Math.min(activeBoardIndex, nextBoards.length - 1)];
      setBoards(nextBoards);
      setActiveBoardId(nextBoard.id);
      setSelectedId("");
      setConnectionStart(null);
      setContextMenu(null);
      setViewMode("board");
      showToast(activeBoard.publicBoardId
        ? "本地档案和公共版本已一并删除"
        : "当前档案板已删除");
    } catch (error) {
      showToast(error instanceof Error ? error.message : "案件没有删除，请稍后重试");
    } finally {
      setDeletingCurrentBoard(false);
    }
  };

  const renderCard = (card: EvidenceCard, layerIndex: number) => {
    const isSelected = card.id === selectedId;
    const isConnectionStart = card.id === connectionStart;
    return (
      <article
        key={card.id}
        data-card-id={card.id}
        className={`evidence-card type-${card.type} ${isSelected ? "is-selected" : ""} ${isConnectionStart ? "is-connecting" : ""}`}
        style={{
          left: card.x,
          top: card.y,
          width: card.w,
          height: card.h,
          transform: `rotate(${card.rotation}deg)`,
          zIndex: 10 + layerIndex,
        }}
        onPointerDown={(event) => onCardPointerDown(event, card)}
        onContextMenu={(event) => onCardContextMenu(event, card)}
        title={activeTool === "connect" ? "点击与另一条线索连接" : card.type === "asset" ? "拖动素材图层；右键调整层级" : "拖动线索；点击查看档案"}
      >
        {card.type !== "asset" && <span className="card-pin" aria-hidden="true"><PushPinIcon size={19} weight="fill" /></span>}
        {card.type === "asset" ? (
          <div className="material-layer-image">
            <img src={card.image} alt={card.title} draggable={false} />
          </div>
        ) : card.image ? (
          <div className="photo-frame">
            <img src={card.image} alt={card.title} draggable={false} />
          </div>
        ) : (
          <div className="paper-copy">
            <span className="paper-kicker">PINEWOOD COUNTY ARCHIVE</span>
            <h3>{card.title}</h3>
            <p>{card.content}</p>
            <span className="paper-stamp">PW · {card.date.slice(5).replace("-", "/")}</span>
          </div>
        )}
        {card.type !== "asset" && card.image && (
          <div className="card-caption">
            <strong>{card.title}</strong>
            <span>{card.subtitle}</span>
          </div>
        )}
        {card.type === "sticky" && <span className="sticky-label">{card.subtitle}</span>}
      </article>
    );
  };

  return (
    <main
      className={`case-app ${presentation ? "is-presentation" : ""} ${sharedView ? "is-shared" : ""}`}
      onPointerMoveCapture={(event) => {
        onMaterialPointerMove(event);
        onCardPointerMove(event);
      }}
      onPointerUpCapture={(event) => {
        finishMaterialPointerDrag(event);
        onCardPointerUp();
      }}
      onPointerCancelCapture={() => {
        cancelMaterialPointerDrag();
        onCardPointerUp();
      }}
    >
      <header className="topbar">
        <div className="brand-block">
          <div className="brand-mark"><BroadcastIcon size={22} weight="duotone" /></div>
          <div>
            <div className="brand-line"><strong>Pinewood Detective Lab</strong></div>
            <div className="case-line">
              <span>CASE ID</span>
              <input className="case-code-input" aria-label="案件编号" value={meta.caseCode} onChange={(event) => setMeta((current) => ({ ...current, caseCode: event.target.value }))} readOnly={sharedView} />
            </div>
          </div>
        </div>
        {headerAddon && <div className="board-header-addon">{headerAddon}</div>}
        <div className="board-switcher" aria-label="当前档案板">
          <span>当前案件板</span>
          <select
            className="board-index-select"
            value={activeBoard.id}
            onChange={(event) => switchBoard(event.target.value)}
            disabled={sharedView}
            aria-label="切换档案板"
          >
            {boards.map((board, index) => (
              <option key={board.id} value={board.id}>
                {String(index + 1).padStart(2, "0")}
              </option>
            ))}
          </select>
          <input
            className="board-title-input"
            aria-label="案件名称"
            value={meta.caseTitle}
            onChange={(event) => setMeta((current) => ({ ...current, caseTitle: event.target.value }))}
            placeholder="输入案件名称"
            readOnly={sharedView}
          />
          <select
            className="board-genre-select"
            aria-label="案件类型"
            value={meta.genre}
            onChange={(event) => setMeta((current) => ({ ...current, genre: event.target.value as CaseGenre | "" }))}
            disabled={sharedView}
            required
          >
            <option value="">选择类型</option>
            {CASE_GENRES.map((genre) => <option key={genre} value={genre}>{genre}</option>)}
          </select>
          {!sharedView && (
            <button onClick={startBlankBoard} title="新建空白档案板" aria-label="新建空白档案板">
              <PlusIcon size={16} weight="bold" />
            </button>
          )}
        </div>
        <div className="top-actions">
          {headerStatusAddon}
          {sharedView ? (
            <span className="readonly-badge"><EyeIcon size={15} />只读调查 · 可拖动线索</span>
          ) : (
            <button className="save-status" onClick={manualSave} title="保存到当前浏览器的 Workshop 草稿">
              {saveState === "saved" ? <CheckCircleIcon size={16} weight="fill" /> : <ArrowsClockwiseIcon size={16} className="spin" />}
              {saveState === "saved" ? "已保存" : "保存中"}
            </button>
          )}
          {!sharedView && <span className="local-creation-badge"><FloppyDiskIcon size={15} />本地草稿</span>}
          <button
            className="presentation-button"
            onClick={togglePresentation}
            aria-label={presentation ? "退出展示模式" : "展示线索板"}
            title={presentation ? "退出展示模式" : "展示线索板"}
          >
            <PresentationIcon size={17} weight="bold" /><span>展示线索板</span>
          </button>
          {!sharedView && (
            <button
              className="presentation-button"
              onClick={shareBoard}
              title="发布到公共案件板"
              aria-label={publishing ? "正在发布到社区" : "发布到社区"}
              disabled={publishing}
            >
              <ShareNetworkIcon size={18} />
              <span>{publishing ? "发布中…" : "发布到社区"}</span>
            </button>
          )}
        </div>
      </header>

      {portraitHintOpen && (
        <aside className="mobile-orientation-hint" role="status">
          <span className="mobile-orientation-icon" aria-hidden="true">
            <ArrowsClockwiseIcon size={22} />
          </span>
          <span>
            <strong>建议横屏 · 优先电脑端</strong>
            <small>为获得完整体验，请优先使用电脑端查看。手机端目前仅作为前期测试版，竖屏可从底部打开“档案抽屉”。</small>
          </span>
          <button
            onClick={() => {
              window.sessionStorage.setItem("pinewood-mobile-landscape-hint", "dismissed");
              setPortraitHintOpen(false);
            }}
          >
            知道了
          </button>
        </aside>
      )}

      {!presentation && (
        <aside className="tool-rail" aria-label="线索工具">
          {toolItems.map((tool) => {
            const ToolIcon = tool.icon;
            const active =
              (tool.id === "select" && activeTool === "select" && viewMode !== "graph") ||
              (tool.id === "graph" && viewMode === "graph");
            return (
              <button key={tool.id} className={active ? "active" : ""} onClick={() => handleTool(tool.id)} title={tool.shortcut ? `${tool.label} (${tool.shortcut})` : tool.label} disabled={sharedView && !["select", "graph"].includes(tool.id)}>
                <ToolIcon size={21} weight={active ? "fill" : "regular"} />
                <span>{tool.label}</span>
              </button>
            );
          })}
          <div className="rail-divider" />
          <button className={inspectorMode === "library" ? "active" : ""} onClick={openMaterialLibrary} title="打开素材库">
            <StackIcon size={21} weight={inspectorMode === "library" ? "fill" : "regular"} /><span>素材库</span>
          </button>
          <button
            className="mobile-inspector-button"
            onClick={() => setMobileInspectorOpen(true)}
            title="打开档案抽屉"
          >
            <FileTextIcon size={21} /><span>档案</span>
          </button>
          <input ref={fileInputRef} className="visually-hidden" type="file" accept="image/*" onChange={handlePhoto} />
        </aside>
      )}

      <section
        ref={stageRef}
        className={`board-stage tool-${activeTool}`}
        onPointerDown={onStagePointerDown}
        onPointerMove={onStagePointerMove}
        onPointerUp={onStagePointerUp}
        onPointerCancel={onStagePointerUp}
        onWheel={(event) => {
          event.preventDefault();
          const factor = event.deltaY > 0 ? 0.88 : 1.14;
          zoomCanvasAt(scale * factor, event.clientX, event.clientY);
        }}
        onDragOver={(event) => {
          event.preventDefault();
          event.dataTransfer.dropEffect = "copy";
        }}
        onDrop={onBoardDrop}
      >
        <div
          className="board-world"
          style={{ width: BOARD_W, height: BOARD_H, transform: `translate(${pan.x}px, ${pan.y}px) scale(${scale})` }}
        >
          {viewMode === "board" && (
            <>
              <svg className="thread-layer" viewBox={`0 0 ${BOARD_W} ${BOARD_H}`} aria-label="线索连线层">
                {links.map((link) => {
                  const from = cards.find((card) => card.id === link.from);
                  const to = cards.find((card) => card.id === link.to);
                  if (!from || !to) return null;
                  return (
                    <g key={link.id} className="thread-link">
                      {!sharedView && (
                        <line
                          x1={from.x + from.w / 2}
                          y1={from.y + 14}
                          x2={to.x + to.w / 2}
                          y2={to.y + 14}
                          className="thread-hit-target"
                          role="button"
                          tabIndex={0}
                          aria-label={`取消“${from.title}”与“${to.title}”的连线`}
                          onClick={(event) => {
                            event.stopPropagation();
                            removeLinkBetween(link.from, link.to);
                          }}
                          onKeyDown={(event) => {
                            if (event.key === "Enter" || event.key === " ") {
                              event.preventDefault();
                              removeLinkBetween(link.from, link.to);
                            }
                          }}
                        >
                          <title>点击取消“{from.title}”与“{to.title}”的连线</title>
                        </line>
                      )}
                      <line
                        x1={from.x + from.w / 2}
                        y1={from.y + 14}
                        x2={to.x + to.w / 2}
                        y2={to.y + 14}
                        className={`thread-visible ${link.status}`}
                      />
                    </g>
                  );
                })}
              </svg>
              {cards.map(renderCard)}
              {cards.length === 0 && !sharedView && (
                <div className="blank-board-welcome">
                  <div className="blank-board-mark"><PushPinIcon size={30} weight="duotone" /></div>
                  <span>EMPTY EVIDENCE BOARD</span>
                  <h2>从第一条线索开始</h2>
                  <p>上传照片，或添加人物、物证和便签。单张图片不得超过 2MB，所有内容都可以在右侧档案抽屉继续编辑。</p>
                  <div className="blank-board-actions">
                    <button onClick={() => handleTool("photo")}><ImageIcon size={18} />上传照片</button>
                    <button onClick={() => addCard("person")}><UserIcon size={18} />添加人物</button>
                    <button onClick={() => addCard("evidence")}><TagIcon size={18} />添加物证</button>
                    <button onClick={() => addCard("sticky")}><NoteIcon size={18} />添加便签</button>
                  </div>
                  <small>也可以从右下角“导入”已有的 .mystery.json 线索板文件</small>
                </div>
              )}
            </>
          )}

          {viewMode === "timeline" && (
            <div className="timeline-view">
              <div className="view-heading"><ClockIcon size={24} /><div><span>CASE CHRONOLOGY</span><h2>案件时间线</h2></div></div>
              <div className="timeline-spine">
                {[...cards].sort((a, b) => a.date.localeCompare(b.date)).map((card, index) => (
                  <button
                    key={card.id}
                    className={`timeline-event ${selectedId === card.id ? "active" : ""}`}
                    onClick={() => {
                      setSelectedId(card.id);
                      setInspectorMode("card");
                      setMobileInspectorOpen(true);
                    }}
                    style={{ left: 75 + index * 125 }}
                  >
                    <span className="timeline-dot" />
                    <time>{card.date.slice(5).replace("-", ".")}</time>
                    <strong>{card.title}</strong>
                    <small>{card.category}</small>
                  </button>
                ))}
              </div>
              {cards.length === 0 && <div className="view-empty-message">还没有可排列的线索。先回到证据墙添加内容。</div>}
            </div>
          )}

          {viewMode === "graph" && (
            <div className="graph-view">
              <div className="view-heading"><GraphIcon size={24} /><div><span>RELATIONSHIP MAP</span><h2>关系图谱</h2></div></div>
              <svg className="graph-lines" viewBox={`0 0 ${BOARD_W} ${BOARD_H}`} aria-hidden="true">
                {links.map((link) => {
                  const fromIndex = cards.findIndex((card) => card.id === link.from);
                  const toIndex = cards.findIndex((card) => card.id === link.to);
                  if (fromIndex < 0 || toIndex < 0) return null;
                  const fromX = 620 + Math.cos((fromIndex / cards.length) * Math.PI * 2) * 360;
                  const fromY = 390 + Math.sin((fromIndex / cards.length) * Math.PI * 2) * 245;
                  const toX = 620 + Math.cos((toIndex / cards.length) * Math.PI * 2) * 360;
                  const toY = 390 + Math.sin((toIndex / cards.length) * Math.PI * 2) * 245;
                  return <line key={link.id} x1={fromX} y1={fromY} x2={toX} y2={toY} className={link.status} />;
                })}
              </svg>
              {cards.map((card, index) => {
                const x = 620 + Math.cos((index / cards.length) * Math.PI * 2) * 360;
                const y = 390 + Math.sin((index / cards.length) * Math.PI * 2) * 245;
                return (
                  <button
                    key={card.id}
                    className={`graph-node ${card.id === selectedId ? "active" : ""}`}
                    style={{ left: x, top: y }}
                    onClick={() => {
                      setSelectedId(card.id);
                      setInspectorMode("card");
                      setMobileInspectorOpen(true);
                    }}
                  >
                    <span>{card.category}</span><strong>{card.title}</strong>
                  </button>
                );
              })}
              {cards.length === 0 && <div className="view-empty-message">还没有关系节点。添加两条内容后，右键卡片即可开始连线。</div>}
            </div>
          )}
        </div>

        {viewMode !== "board" && (
          <div className={`mobile-view-heading ${portraitHintOpen ? "is-below-orientation-hint" : ""}`} aria-live="polite">
            {viewMode === "timeline" ? <ClockIcon size={18} weight="bold" /> : <GraphIcon size={18} weight="bold" />}
            <span>
              <small>{viewMode === "timeline" ? "CASE CHRONOLOGY" : "RELATIONSHIP MAP"}</small>
              <strong>{viewMode === "timeline" ? "案件时间线" : "关系图谱"}</strong>
            </span>
          </div>
        )}
        {connectionStart && <div className="connection-hint"><LinkSimpleIcon size={16} weight="bold" />再点一张卡片完成连线</div>}
        {viewMode === "board" && <div className="canvas-mode-badge"><ArrowsOutIcon size={13} />无限画布 · 抓手或鼠标中键平移</div>}
        <div className="zoom-control">
          <button onClick={() => setActiveTool("pan")} className={activeTool === "pan" ? "active" : ""} title="抓手移动"><HandIcon size={17} /></button>
          <button onClick={() => zoomCanvasFromCenter(0.8)} title="缩小"><MinusIcon size={16} /></button>
          <span>{Math.round(scale * 100)}%</span>
          <button onClick={() => zoomCanvasFromCenter(1.25)} title="放大"><PlusIcon size={16} /></button>
          <button onClick={fitBoard} title="显示全部内容"><ArrowsOutIcon size={16} /></button>
        </div>
      </section>

      {contextMenu && contextCard && !sharedView && (
        <div
          className="card-context-menu"
          style={{ left: contextMenu.x, top: contextMenu.y }}
          onPointerDown={(event) => event.stopPropagation()}
          role="menu"
          aria-label={`${contextCard.title}操作菜单`}
        >
          <div className="context-menu-heading">
            <div><span>CARD LAYER</span><strong>{contextCard.title}</strong></div>
            <b>第 {cards.findIndex((card) => card.id === contextCard.id) + 1} / {cards.length} 层</b>
          </div>
          <div className="context-menu-section">
            <span className="context-menu-label"><StackIcon size={14} />图层排列</span>
            <div className="layer-action-grid">
              <button onClick={() => moveCardLayer(contextCard.id, "front")}>置于顶层</button>
              <button onClick={() => moveCardLayer(contextCard.id, "forward")}>上移一层</button>
              <button onClick={() => moveCardLayer(contextCard.id, "backward")}>下移一层</button>
              <button onClick={() => moveCardLayer(contextCard.id, "back")}>置于底层</button>
            </div>
          </div>
          <button className="context-primary-action" onClick={() => beginConnection(contextCard.id)}>
            <LinkSimpleIcon size={15} />从此卡片开始连线
          </button>
          {contextLinkedCards.length > 0 && (
            <div className="context-menu-section unlink-list">
              <span className="context-menu-label"><LinkBreakIcon size={14} />取消连线 · {contextLinkedCards.length} 条</span>
              {contextLinkedCards.map((card) => (
                <button key={card.id} onClick={() => removeLinkBetween(contextCard.id, card.id)}>
                  <LinkBreakIcon size={13} /><span>取消与</span><strong>“{card.title}”</strong>
                </button>
              ))}
              {contextLinkedCards.length > 1 && (
                <button className="unlink-all-button" onClick={() => removeAllLinksForCard(contextCard.id)}>
                  全部取消（{contextLinkedCards.length} 条）
                </button>
              )}
            </div>
          )}
          <button className="context-delete-action" onClick={() => removeCard(contextCard.id)}>
            <TrashIcon size={15} />删除该线索
          </button>
        </div>
      )}

      {!presentation && mobileInspectorOpen && (
        <button
          className="mobile-inspector-backdrop"
          onClick={() => setMobileInspectorOpen(false)}
          aria-label="关闭档案抽屉"
        />
      )}

      {!presentation && (
        <aside className={`inspector ${mobileInspectorOpen ? "is-mobile-open" : ""}`}>
          <div className="inspector-header">
            <div>
              <span>{inspectorMode === "library" ? "ASSET LIBRARY" : "CASE DRAWER"}</span>
              <strong>{inspectorMode === "library" ? "素材库" : "档案抽屉"}</strong>
            </div>
            <div className="inspector-header-actions">
              {inspectorMode === "card" && inspectorHeaderAddon}
              {inspectorMode === "library" ? (
                <button
                  onClick={() => {
                    setInspectorMode("card");
                    setMobileInspectorOpen(false);
                  }}
                  aria-label="关闭素材库"
                >
                  <XIcon size={17} />
                </button>
              ) : selected ? (
                <button
                  onClick={() => {
                    setSelectedId("");
                    setMobileInspectorOpen(false);
                  }}
                  aria-label="关闭档案"
                >
                  <XIcon size={17} />
                </button>
              ) : (
                <button
                  className="mobile-inspector-close"
                  onClick={() => setMobileInspectorOpen(false)}
                  aria-label="关闭档案抽屉"
                >
                  <XIcon size={17} />
                </button>
              )}
            </div>
          </div>
          <section className="current-board-panel">
            <div className="current-board-kicker">
              <span>CURRENT BOARD</span>
              <b>{activeBoardIndex + 1} / {boards.length}</b>
            </div>
            <strong>{meta.caseTitle}</strong>
            <div className="current-board-stats">
              <span>{meta.caseCode}</span>
              <span>{meta.genre || "未选择类型"}</span>
              <span>{cards.length} 张卡片</span>
              <span>{links.length} 条连线</span>
            </div>
            {!sharedView && (
              <div className="current-board-actions">
                <button onClick={startBlankBoard}><PlusIcon size={14} />新建档案板</button>
                <button
                  className="danger"
                  disabled={deletingCurrentBoard}
                  onClick={() => void deleteCurrentBoard()}
                >
                  <TrashIcon size={14} />
                  {deletingCurrentBoard ? "删除中…" : "删除当前板"}
                </button>
              </div>
            )}
          </section>
          {inspectorMode === "library" ? (
            <div className="material-library-body">
              <div className="material-library-intro">
                <div className="material-library-mark"><StackIcon size={28} weight="duotone" /></div>
                <strong>自定义素材库</strong>
                <p>上传透明 PNG、印章、胶带、划痕或其他档案素材，再拖到左侧画板上。单张图片不得超过 2MB。</p>
              </div>
              <button className="material-upload-button" onClick={() => materialInputRef.current?.click()}>
                <UploadSimpleIcon size={16} />添加图片素材
              </button>
              <input
                ref={materialInputRef}
                className="visually-hidden"
                type="file"
                accept="image/*"
                multiple
                onChange={handleMaterialUpload}
              />
              {assets.length === 0 ? (
                <div className="material-library-empty">
                  <ImageIcon size={34} />
                  <strong>素材库暂时是空的</strong>
                  <p>这里会保存你上传的图片。以后预置的透明档案图层也会放在这里。</p>
                </div>
              ) : (
                <div className="material-library-grid">
                  {assets.map((asset) => (
                    <article
                      key={asset.id}
                      className="material-library-item"
                      onPointerDown={(event) => onMaterialPointerDown(event, asset)}
                      title="拖到左侧画板添加"
                    >
                      <div className="material-thumbnail"><img src={asset.image} alt={asset.name} draggable={false} /></div>
                      <div className="material-item-copy"><strong>{asset.name}</strong><span>拖到画板</span></div>
                      <div className="material-item-actions">
                        <button onClick={() => addMaterialToBoard(asset)} title="添加到画板" aria-label={`添加“${asset.name}”到画板`}><PlusIcon size={14} /></button>
                        <button onClick={() => removeMaterial(asset)} title="删除素材" aria-label={`删除素材“${asset.name}”`}><TrashIcon size={14} /></button>
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </div>
          ) : selected ? (
            <div className="inspector-body">
              <div className="selected-preview">
                {selected.image ? <img src={selected.image} alt="" /> : <FileTextIcon size={34} />}
                <span>{selected.category}</span>
                {!sharedView && <button className="replace-image-button" onClick={() => replaceInputRef.current?.click()}><ImageIcon size={14} />{selected.image ? "更换图片" : "上传图片"}</button>}
              </div>
              <label className="field-label">档案名称</label>
              <input className="title-input" value={selected.title} onChange={(event) => updateCard(selected.id, { title: event.target.value })} readOnly={sharedView} />
              <label className="field-label">卡片副标题</label>
              <input className="text-input" value={selected.subtitle} onChange={(event) => updateCard(selected.id, { subtitle: event.target.value })} readOnly={sharedView} />

              <div className="meta-grid">
                <label><span>记录日期</span><input type="date" value={selected.date} onChange={(event) => updateCard(selected.id, { date: event.target.value })} readOnly={sharedView} /></label>
                <label><span>分类</span><input value={selected.category} onChange={(event) => updateCard(selected.id, { category: event.target.value })} readOnly={sharedView} /></label>
              </div>

              <label className="field-label" htmlFor="card-content">卡片正文</label>
              <textarea id="card-content" className="compact-textarea" value={selected.content ?? ""} onChange={(event) => updateCard(selected.id, { content: event.target.value })} placeholder="可以写证词、文档内容、推测或现场描述" readOnly={sharedView} />

              <section className="linked-section">
                <div className="section-title"><span>关联线索</span><b>{linkedCards.length}</b></div>
                {linkedCards.slice(0, 4).map((card) => (
                  <div className="linked-row" key={card.id}>
                    <button className="linked-target" onClick={() => setSelectedId(card.id)}>
                      <span className={`relation-dot type-${card.type}`} />
                      <div><strong>{card.title}</strong><small>{card.category}</small></div>
                    </button>
                    {!sharedView && (
                      <button
                        className="unlink-button"
                        onClick={() => removeLinkBetween(selected.id, card.id)}
                        title={`取消与“${card.title}”的连线`}
                        aria-label={`取消与“${card.title}”的连线`}
                      >
                        <LinkBreakIcon size={15} />
                        <span>取消连线</span>
                      </button>
                    )}
                  </div>
                ))}
                {!linkedCards.length && <p className="empty-copy">还没有关联线索。可从下方或右键菜单开始连线。</p>}
                {linkedCards.length > 0 && !sharedView && (
                  <p className="unlink-tip">也可以直接点击画板上的红线取消连接。</p>
                )}
                {!sharedView && (
                  <button className="connect-from-button" onClick={() => beginConnection(selected.id)}>
                    <LinkSimpleIcon size={15} />从这张卡片开始连线
                  </button>
                )}
                {!sharedView && linkedCards.length > 1 && (
                  <button className="unlink-all-inspector" onClick={() => removeAllLinksForCard(selected.id)}>
                    <LinkBreakIcon size={15} />取消这张卡片的全部连线（{linkedCards.length}）
                  </button>
                )}
              </section>

              <section className="credibility-section">
                <div className="section-title"><span>可信度</span><b>{selected.credibility}%</b></div>
                <input type="range" min="0" max="100" value={selected.credibility} onChange={(event) => updateCard(selected.id, { credibility: Number(event.target.value) })} disabled={sharedView} />
                <div className="range-labels"><span>推测</span><span>已核验</span></div>
              </section>

              <label className="field-label" htmlFor="case-note">侦探笔记</label>
              <textarea id="case-note" value={selected.notes} onChange={(event) => updateCard(selected.id, { notes: event.target.value })} readOnly={sharedView} />

              <input ref={replaceInputRef} className="visually-hidden" type="file" accept="image/*" onChange={handleReplaceImage} />

              {!sharedView && (
                <button className="delete-button" onClick={removeSelected}><TrashIcon size={16} />移出线索板</button>
              )}
            </div>
          ) : (
            <div className="empty-inspector"><CursorClickIcon size={38} /><strong>等待第一条内容</strong><p>从左侧添加照片、人物、物证或便签，再在这里编辑全部信息。</p></div>
          )}
          {!sharedView && (
            <div className="file-actions">
              <button onClick={manualSave}><FloppyDiskIcon size={16} />保存</button>
              <button onClick={() => importInputRef.current?.click()}><UploadSimpleIcon size={16} />导入</button>
              <button onClick={exportBoard}><DownloadSimpleIcon size={16} />导出</button>
              <input ref={importInputRef} className="visually-hidden" type="file" accept="application/json" onChange={importBoard} />
            </div>
          )}
        </aside>
      )}

      {draggingMaterial && materialDragPreview && (
        <div
          className="material-drag-preview"
          style={{ left: materialDragPreview.x + 14, top: materialDragPreview.y + 14 }}
          aria-hidden="true"
        >
          <img src={draggingMaterial.image} alt="" />
          <span>拖到画板</span>
        </div>
      )}

      <footer className="view-switcher">
        <button className={viewMode === "board" ? "active" : ""} onClick={() => setViewMode("board")}><PushPinIcon size={17} weight="fill" /><span>证据墙</span></button>
        <button className={viewMode === "timeline" ? "active" : ""} onClick={() => setViewMode("timeline")}><ClockIcon size={17} /><span>案件时间线</span></button>
        <button
          className={`mobile-footer-inspector-button ${mobileInspectorOpen ? "active" : ""}`}
          onClick={() => setMobileInspectorOpen(true)}
          aria-label="打开档案抽屉"
        >
          <FileTextIcon size={17} weight={mobileInspectorOpen ? "fill" : "regular"} />
          <span>档案抽屉</span>
        </button>
        <div className={`footer-timeline ${cards.length === 0 ? "is-empty" : ""} ${chronologyCards.length < 2 ? "is-sparse" : ""}`} aria-label="案件时间线摘要">
          {chronologyCards.map((card) => (
            <button key={card.id} className={card.id === selectedId ? "active" : ""} onClick={() => setSelectedId(card.id)} title={`${card.date} · ${card.title}`}>
              <span className="footer-time-dot" />
              <time>{card.date.slice(5).replace("-", ".")}</time>
              <small>{card.title}</small>
            </button>
          ))}
          {cards.length === 0 && <span className="footer-empty-copy">尚未添加内容</span>}
        </div>
        {!presentation && !sharedView && <button className="reset-button new-board-button" onClick={startBlankBoard}>新建空白板</button>}
      </footer>

      {toast && <div className="toast" role="status"><CheckCircleIcon size={18} weight="fill" />{toast}</div>}
    </main>
  );
}
