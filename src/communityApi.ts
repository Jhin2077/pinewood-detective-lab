import type {
  BoardMeta,
  BoardPublishPayload,
  EvidenceCard,
  PublicBoardPreview,
} from "./DetectiveBoard";
import { supabase } from "./supabaseClient";

const CASE_ASSETS_BUCKET = "case-assets";
const MAX_IMAGE_BYTES = 2 * 1024 * 1024;

type ProfileJoin = {
  display_name?: string;
  handle?: string | null;
};

type CountJoin = Array<{ count?: number }>;

type PublicBoardRow = {
  id: string;
  title: string;
  description: string;
  genre: string;
  tags: string[] | null;
  view_count: number | null;
  published_at: string | null;
  cover_url: string | null;
  snapshot: PublicBoardPreview & { savedAt?: string };
  profiles: ProfileJoin | ProfileJoin[] | null;
  comments: CountJoin | null;
  reactions: CountJoin | null;
};

export type CommunityBoard = {
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
  publishedAt: string;
  time: string;
  image: string;
};

export type CommunityProfile = {
  displayName: string;
  handle: string;
};

export type BoardComment = {
  id: string;
  body: string;
  author: string;
  handle: string;
  createdAt: string;
  time: string;
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
      title,
      description,
      genre,
      tags,
      view_count,
      published_at,
      cover_url,
      snapshot,
      profiles!boards_owner_id_fkey(display_name, handle),
      comments(count),
      reactions(count)
    `)
    .eq("is_public", true)
    .order("published_at", { ascending: false });

  if (error) throw error;

  return ((data ?? []) as unknown as PublicBoardRow[]).map((row) => {
    const profile = joinOne(row.profiles);
    const publishedAt = row.published_at ?? new Date().toISOString();
    return {
      id: row.id,
      title: row.title,
      author: profile.display_name || "匿名侦探",
      handle: profile.handle ? `@${profile.handle}` : "",
      description: row.description || "一份等待调查的公开案件板。",
      tags: row.tags?.length ? row.tags : [row.genre],
      genres: [row.genre],
      likes: countJoin(row.reactions),
      comments: countJoin(row.comments),
      views: Number(row.view_count ?? 0),
      publishedAt,
      time: relativeTime(publishedAt),
      image: row.cover_url ?? "",
    };
  });
}

export async function getPublicBoard(boardId: string): Promise<PublicBoardPreview> {
  const { data, error } = await supabase
    .from("boards")
    .select("snapshot")
    .eq("id", boardId)
    .eq("is_public", true)
    .single();
  if (error) throw error;

  void supabase.rpc("increment_board_views", { target_board_id: boardId });
  return data.snapshot as PublicBoardPreview;
}

export async function getProfile(userId: string): Promise<CommunityProfile | null> {
  const { data, error } = await supabase
    .from("profiles")
    .select("display_name, handle")
    .eq("id", userId)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  return {
    displayName: data.display_name,
    handle: data.handle ? `@${data.handle}` : "",
  };
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
      body,
      created_at,
      profiles!comments_author_id_fkey(display_name, handle)
    `)
    .eq("board_id", boardId)
    .order("created_at", { ascending: true });
  if (error) throw error;

  return ((data ?? []) as unknown as Array<{
    id: string;
    body: string;
    created_at: string;
    profiles: ProfileJoin | ProfileJoin[] | null;
  }>).map((row) => {
    const profile = joinOne(row.profiles);
    return {
      id: row.id,
      body: row.body,
      author: profile.display_name || "匿名侦探",
      handle: profile.handle ? `@${profile.handle}` : "",
      createdAt: row.created_at,
      time: relativeTime(row.created_at),
    };
  });
}

export async function addBoardComment(
  boardId: string,
  userId: string,
  body: string,
): Promise<void> {
  const { error } = await supabase
    .from("comments")
    .insert({
      board_id: boardId,
      author_id: userId,
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
