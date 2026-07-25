import type {
  BoardMeta,
  BoardPublishPayload,
  EvidenceCard,
  PublicBoardPreview,
} from "./DetectiveBoard";
import { normalizeCaseGenre } from "./caseGenres";
import { supabase } from "./supabaseClient";

const CASE_ASSETS_BUCKET = "case-assets";
const PROFILE_AVATARS_BUCKET = "profile-avatars";
const MAX_IMAGE_BYTES = 2 * 1024 * 1024;

type ProfileJoin = {
  display_name?: string;
  handle?: string | null;
  avatar_url?: string | null;
};

type CountJoin = Array<{ count?: number }>;

type PublicBoardRow = {
  id: string;
  owner_id: string;
  client_id: string;
  title: string;
  description: string;
  genre: string;
  tags: string[] | null;
  view_count: number | null;
  published_at: string | null;
  snapshot: PublicBoardPreview & { savedAt?: string };
  profiles: ProfileJoin | ProfileJoin[] | null;
  comments: CountJoin | null;
  reactions: CountJoin | null;
};

export type CommunityBoard = {
  id: string;
  ownerId: string;
  clientId: string;
  title: string;
  author: string;
  handle: string;
  authorAvatar: string;
  description: string;
  tags: string[];
  genres: string[];
  likes: number;
  comments: number;
  views: number;
  publishedAt: string;
  time: string;
  preview: PublicBoardPreview;
};

export type CommunityProfile = {
  displayName: string;
  handle: string;
  avatarUrl: string;
};

export type BoardComment = {
  id: string;
  authorId: string;
  parentId: string | null;
  body: string;
  author: string;
  handle: string;
  avatarUrl: string;
  createdAt: string;
  time: string;
};

export type BoardViewer = {
  id: string;
  displayName: string;
  handle: string;
  avatarUrl: string;
  lastViewedAt: string;
};

export type PublicBoardRecord = {
  preview: PublicBoardPreview;
  ownerId: string;
  title: string;
  viewCount: number;
  commentCount: number;
  viewers: BoardViewer[];
};

function joinOne(value: ProfileJoin | ProfileJoin[] | null): ProfileJoin {
  if (Array.isArray(value)) return value[0] ?? {};
  return value ?? {};
}

function countJoin(value: CountJoin | null): number {
  return Number(value?.[0]?.count ?? 0);
}

function relativeTime(value: string): string {
  const timestamp = new Date(value).getTime();
  const seconds = Math.max(0, Math.floor((Date.now() - timestamp) / 1000));
  if (seconds < 60) return "刚刚";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} 分钟前`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} 小时前`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days} 天前`;
  return new Intl.DateTimeFormat("zh-CN", { month: "short", day: "numeric" }).format(timestamp);
}

function safePathPart(value: string): string {
  return value.replace(/[^a-zA-Z0-9_-]/g, "-").slice(0, 80);
}

function dataUrlToBlob(dataUrl: string): Blob {
  const match = dataUrl.match(/^data:([^;,]+);base64,(.+)$/);
  if (!match) throw new Error("无法识别图片数据");
  const mimeType = match[1];
  const binary = atob(match[2]);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  return new Blob([bytes], { type: mimeType });
}

function extensionForMimeType(mimeType: string): string {
  if (mimeType === "image/jpeg") return "jpg";
  if (mimeType === "image/png") return "png";
  if (mimeType === "image/webp") return "webp";
  if (mimeType === "image/gif") return "gif";
  return "img";
}

async function uploadCardImages(
  cards: EvidenceCard[],
  userId: string,
  clientBoardId: string,
): Promise<EvidenceCard[]> {
  return Promise.all(cards.map(async (card) => {
    if (!card.image?.startsWith("data:image/")) return card;
    const blob = dataUrlToBlob(card.image);
    if (blob.size > MAX_IMAGE_BYTES) {
      throw new Error(`“${card.title || "未命名图片"}”超过 2MB`);
    }

    const extension = extensionForMimeType(blob.type);
    const path = [
      userId,
      safePathPart(clientBoardId),
      `${safePathPart(card.id)}.${extension}`,
    ].join("/");

    const { error } = await supabase.storage
      .from(CASE_ASSETS_BUCKET)
      .upload(path, blob, {
        cacheControl: "3600",
        contentType: blob.type,
        upsert: true,
      });
    if (error) throw error;

    const { data } = supabase.storage.from(CASE_ASSETS_BUCKET).getPublicUrl(path);
    return { ...card, image: data.publicUrl };
  }));
}

export async function listPublicBoards(): Promise<CommunityBoard[]> {
  const { data, error } = await supabase
    .from("boards")
    .select(`
      id,
      owner_id,
      client_id,
      title,
      description,
      genre,
      tags,
      view_count,
      published_at,
      snapshot,
      profiles!boards_owner_id_fkey(display_name, handle, avatar_url),
      comments(count),
      reactions(count)
    `)
    .eq("is_public", true)
    .order("published_at", { ascending: false });

  if (error) throw error;

  return ((data ?? []) as unknown as PublicBoardRow[]).map((row) => {
    const profile = joinOne(row.profiles);
    const publishedAt = row.published_at ?? new Date().toISOString();
    const genre = normalizeCaseGenre(row.genre) || "未解事件";
    const tags = [
      genre,
      ...(row.tags ?? [])
        .map((tag) => normalizeCaseGenre(tag) || tag)
        .filter((tag) => tag && tag !== genre),
    ];
    const preview: PublicBoardPreview = {
      ...row.snapshot,
      meta: {
        ...row.snapshot.meta,
        genre: normalizeCaseGenre(row.snapshot.meta?.genre) || genre,
      },
    };
    return {
      id: row.id,
      ownerId: row.owner_id,
      clientId: row.client_id,
      title: row.title,
      author: profile.display_name || "匿名侦探",
      handle: profile.handle ? `@${profile.handle}` : "",
      authorAvatar: profile.avatar_url || "",
      description: row.description || "一份等待调查的公开案件板。",
      tags,
      genres: [genre],
      likes: countJoin(row.reactions),
      comments: countJoin(row.comments),
      views: Number(row.view_count ?? 0),
      publishedAt,
      time: relativeTime(publishedAt),
      preview,
    };
  });
}

export async function getPublicBoard(
  boardId: string,
  recordView = true,
): Promise<PublicBoardRecord> {
  const { data, error } = await supabase
    .from("boards")
    .select("snapshot, owner_id, title, view_count, comments(count)")
    .eq("id", boardId)
    .eq("is_public", true)
    .single();
  if (error) throw error;

  let viewCount = Number(data.view_count ?? 0);
  if (recordView) {
    const { data: nextViewCount, error: viewError } = await supabase
      .rpc("record_board_view", { target_board_id: boardId });
    if (viewError) throw viewError;
    viewCount = Number(nextViewCount ?? viewCount + 1);
  }

  const sourcePreview = data.snapshot as PublicBoardPreview;
  const preview: PublicBoardPreview = {
    ...sourcePreview,
    meta: {
      ...sourcePreview.meta,
      genre: normalizeCaseGenre(sourcePreview.meta?.genre) || "未解事件",
    },
  };

  return {
    preview,
    ownerId: data.owner_id,
    title: data.title,
    viewCount,
    commentCount: countJoin(data.comments as CountJoin | null),
    viewers: await listBoardViewers(boardId),
  };
}

export async function listBoardViewers(boardId: string): Promise<BoardViewer[]> {
  const { data, error } = await supabase
    .rpc("get_board_viewers", { target_board_id: boardId });
  if (error) throw error;

  return ((data ?? []) as unknown as Array<{
    viewer_id: string;
    display_name: string;
    handle: string | null;
    avatar_url: string | null;
    last_viewed_at: string;
  }>).map((row) => ({
      id: row.viewer_id,
      displayName: row.display_name || "社区侦探",
      handle: row.handle ? `@${row.handle}` : "",
      avatarUrl: row.avatar_url || "",
      lastViewedAt: row.last_viewed_at,
  }));
}

export async function listRecentBoardIds(userId: string): Promise<string[]> {
  const { data, error } = await supabase
    .from("board_views")
    .select("board_id")
    .eq("viewer_id", userId)
    .order("last_viewed_at", { ascending: false })
    .limit(5);
  if (error) throw error;
  return (data ?? []).map((row) => row.board_id);
}

export async function deleteOwnBoard(
  boardId: string,
  userId: string,
): Promise<void> {
  const { data: board, error: findError } = await supabase
    .from("boards")
    .select("id, owner_id, client_id")
    .eq("id", boardId)
    .maybeSingle();
  if (findError) throw findError;
  if (!board) return;
  if (board.owner_id !== userId) {
    throw new Error("你只能删除自己创建的案件板");
  }

  await deleteOwnedBoardRecord(board, userId);
}

export async function deleteOwnBoardByClientId(
  clientId: string,
  userId: string,
): Promise<void> {
  const { data: board, error: findError } = await supabase
    .from("boards")
    .select("id, owner_id, client_id")
    .eq("owner_id", userId)
    .eq("client_id", clientId)
    .maybeSingle();
  if (findError) throw findError;
  if (!board) return;

  await deleteOwnedBoardRecord(board, userId);
}

async function deleteOwnedBoardRecord(
  board: { id: string; owner_id: string; client_id: string },
  userId: string,
): Promise<void> {
  const { data: deleted, error: deleteError } = await supabase
    .from("boards")
    .delete()
    .eq("id", board.id)
    .eq("owner_id", userId)
    .select("id")
    .maybeSingle();
  if (deleteError) throw deleteError;
  if (!deleted) throw new Error("案件板没有删除，请刷新后重试");

  const folder = `${userId}/${safePathPart(board.client_id)}`;
  const { data: assets, error: listError } = await supabase.storage
    .from(CASE_ASSETS_BUCKET)
    .list(folder, { limit: 1000 });

  if (!listError && assets?.length) {
    const paths = assets
      .filter((asset) => asset.name !== ".emptyFolderPlaceholder")
      .map((asset) => `${folder}/${asset.name}`);
    if (paths.length) {
      await supabase.storage.from(CASE_ASSETS_BUCKET).remove(paths);
    }
  }
}

export async function getProfile(userId: string): Promise<CommunityProfile | null> {
  const { data, error } = await supabase
    .from("profiles")
    .select("display_name, handle, avatar_url")
    .eq("id", userId)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  return {
    displayName: data.display_name,
    handle: data.handle ? `@${data.handle}` : "",
    avatarUrl: data.avatar_url || "",
  };
}

export async function uploadProfileAvatar(
  userId: string,
  file: File,
): Promise<string> {
  if (!file.type.startsWith("image/")) {
    throw new Error("请选择图片文件");
  }
  if (file.size > MAX_IMAGE_BYTES) {
    throw new Error("头像图片不能超过 2MB");
  }

  const extension = extensionForMimeType(file.type);
  if (extension === "img") {
    throw new Error("头像仅支持 JPG、PNG、WEBP 或 GIF");
  }

  const folder = userId;
  const { data: existing } = await supabase.storage
    .from(PROFILE_AVATARS_BUCKET)
    .list(folder, { limit: 20 });
  const oldPaths = (existing ?? [])
    .filter((asset) => asset.name !== ".emptyFolderPlaceholder")
    .map((asset) => `${folder}/${asset.name}`);

  const path = `${userId}/avatar-${Date.now()}.${extension}`;
  const { error: uploadError } = await supabase.storage
    .from(PROFILE_AVATARS_BUCKET)
    .upload(path, file, {
      cacheControl: "3600",
      contentType: file.type,
      upsert: false,
    });
  if (uploadError) throw uploadError;

  const { data: publicUrl } = supabase.storage
    .from(PROFILE_AVATARS_BUCKET)
    .getPublicUrl(path);
  const avatarUrl = publicUrl.publicUrl;

  const { error: profileError } = await supabase
    .from("profiles")
    .update({ avatar_url: avatarUrl })
    .eq("id", userId);
  if (profileError) throw profileError;

  if (oldPaths.length) {
    await supabase.storage.from(PROFILE_AVATARS_BUCKET).remove(oldPaths);
  }

  return avatarUrl;
}

export async function toggleBoardLike(
  boardId: string,
  userId: string,
): Promise<boolean> {
  const { data: existing, error: findError } = await supabase
    .from("reactions")
    .select("board_id")
    .eq("board_id", boardId)
    .eq("user_id", userId)
    .eq("kind", "like")
    .maybeSingle();
  if (findError) throw findError;

  if (existing) {
    const { error } = await supabase
      .from("reactions")
      .delete()
      .eq("board_id", boardId)
      .eq("user_id", userId)
      .eq("kind", "like");
    if (error) throw error;
    return false;
  }

  const { error } = await supabase
    .from("reactions")
    .insert({ board_id: boardId, user_id: userId, kind: "like" });
  if (error) throw error;
  return true;
}

export async function listBoardComments(boardId: string): Promise<BoardComment[]> {
  const { data, error } = await supabase
    .from("comments")
    .select(`
      id,
      author_id,
      parent_id,
      body,
      created_at,
      profiles!comments_author_id_fkey(display_name, handle, avatar_url)
    `)
    .eq("board_id", boardId)
    .order("created_at", { ascending: true });
  if (error) throw error;

  return ((data ?? []) as unknown as Array<{
    id: string;
    author_id: string;
    parent_id: string | null;
    body: string;
    created_at: string;
    profiles: ProfileJoin | ProfileJoin[] | null;
  }>).map((row) => {
    const profile = joinOne(row.profiles);
    return {
      id: row.id,
      authorId: row.author_id,
      parentId: row.parent_id,
      body: row.body,
      author: profile.display_name || "匿名侦探",
      handle: profile.handle ? `@${profile.handle}` : "",
      avatarUrl: profile.avatar_url || "",
      createdAt: row.created_at,
      time: relativeTime(row.created_at),
    };
  });
}

export async function addBoardComment(
  boardId: string,
  userId: string,
  body: string,
  parentCommentId: string | null = null,
): Promise<void> {
  const { error } = await supabase
    .from("comments")
    .insert({
      board_id: boardId,
      author_id: userId,
      parent_id: parentCommentId,
      body: body.trim(),
    });
  if (error) throw error;
}

function boardDescription(cards: EvidenceCard[]): string {
  const source = cards.find((card) => card.content?.trim() || card.notes?.trim());
  const value = source?.content?.trim() || source?.notes?.trim();
  return value ? value.slice(0, 180) : "一份等待调查的公开案件板。";
}

export async function publishBoard(
  payload: BoardPublishPayload,
  userId: string,
): Promise<string> {
  const uploadedCards = await uploadCardImages(payload.cards, userId, payload.clientId);
  const snapshot = {
    meta: payload.meta,
    cards: uploadedCards,
    links: payload.links,
    savedAt: new Date().toISOString(),
  };
  const coverUrl = uploadedCards.find((card) => card.image)?.image ?? null;

  const { data, error } = await supabase
    .from("boards")
    .upsert({
      owner_id: userId,
      client_id: payload.clientId,
      title: payload.meta.caseTitle.trim() || "未命名线索板",
      case_code: payload.meta.caseCode.trim() || "BOARD",
      genre: payload.meta.genre,
      description: boardDescription(uploadedCards),
      tags: [payload.meta.genre],
      cover_url: coverUrl,
      snapshot,
      is_public: true,
      published_at: new Date().toISOString(),
    }, {
      onConflict: "owner_id,client_id",
    })
    .select("id")
    .single();

  if (error) throw error;
  return data.id;
}

export function isPublishableMeta(meta: BoardMeta): boolean {
  return Boolean(meta.caseTitle.trim() && meta.genre);
}
