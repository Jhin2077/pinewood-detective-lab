export type DetectiveRank = {
  title: string;
  minimumLikes: number;
};

export const DETECTIVE_RANKS: readonly DetectiveRank[] = [
  { title: "菜鸟侦探", minimumLikes: 0 },
  { title: "见习侦探", minimumLikes: 100 },
  { title: "资深侦探", minimumLikes: 300 },
  { title: "首席侦探", minimumLikes: 700 },
  { title: "TRUE DETECTIVE", minimumLikes: 1500 },
] as const;

export function detectiveRankForLikes(likesReceived: number): DetectiveRank {
  const likes = Math.max(0, Math.floor(likesReceived));
  return [...DETECTIVE_RANKS]
    .reverse()
    .find((rank) => likes >= rank.minimumLikes) ?? DETECTIVE_RANKS[0];
}
