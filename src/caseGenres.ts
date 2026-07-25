export const CASE_GENRES = [
  "超自然事件",
  "科幻",
  "民俗怪谈",
  "失踪调查",
  "ARG模拟恐怖",
  "都市传说",
  "广播剧",
  "心理恐怖",
  "后室",
  "新怪谈",
  "未解事件",
  "网络谜案",
  "身份谜案",
] as const;

export type CaseGenre = (typeof CASE_GENRES)[number];

const CASE_GENRE_SET = new Set<string>(CASE_GENRES);

const LEGACY_CASE_GENRE_MAP: Record<string, CaseGenre> = {
  灵异: "超自然事件",
  超自然: "超自然事件",
  科幻: "科幻",
  民俗: "民俗怪谈",
  失踪: "失踪调查",
  ARG: "ARG模拟恐怖",
  模拟恐怖: "ARG模拟恐怖",
  都市传说: "都市传说",
  档案异常: "未解事件",
};

export function normalizeCaseGenre(value: unknown): CaseGenre | "" {
  if (typeof value !== "string") return "";
  const genre = value.trim();
  if (CASE_GENRE_SET.has(genre)) return genre as CaseGenre;
  return LEGACY_CASE_GENRE_MAP[genre] ?? "";
}
