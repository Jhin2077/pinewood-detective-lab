export const CASE_GENRES = [
  "灵异",
  "超自然",
  "科幻",
  "民俗",
  "失踪",
  "ARG",
  "模拟恐怖",
  "都市传说",
  "档案异常",
] as const;

export type CaseGenre = (typeof CASE_GENRES)[number];
