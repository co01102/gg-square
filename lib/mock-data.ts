import type { FeedPost, Game } from "./types";

export const demoGames: Game[] = [
  { id: "all", name: "전체 게임", slug: "all", icon: "✦", color: "#8b5cf6" },
  { id: "lol", name: "리그 오브 레전드", slug: "league-of-legends", icon: "L", color: "#c8943a" },
  { id: "valo", name: "발로란트", slug: "valorant", icon: "V", color: "#ff4655" },
  { id: "ow", name: "오버워치 2", slug: "overwatch-2", icon: "O", color: "#f99e1a" },
  { id: "roblox", name: "로블록스", slug: "roblox", icon: "R", color: "#00a2ff" },
  { id: "maple", name: "메이플스토리", slug: "maplestory", icon: "M", color: "#ff8a3d" },
  { id: "pubg", name: "배틀그라운드", slug: "pubg", icon: "B", color: "#f2a900" },
  { id: "etc", name: "기타", slug: "etc", icon: "+", color: "#64748b" }
];

export const demoPosts: FeedPost[] = [
  {
    id: "demo-1",
    body: "드디어 다이아 찍었습니다! 🎉 막판 승급전에서 팀원들 합이 정말 좋았어요. 이번 시즌 목표 달성!",
    createdAt: new Date(Date.now() - 1000 * 60 * 12).toISOString(),
    author: { username: "미드장인", avatarUrl: null, level: 42 },
    game: demoGames[1],
    images: ["/demo/rank-up.svg"],
    attachments: [],
    likeCount: 128,
    commentCount: 23,
    liked: false,
    isOwner: false
  },
  {
    id: "demo-2",
    body: "새로 나온 요원 스킬 조합 연구 중. 연막 타이밍만 맞추면 사이트 진입이 훨씬 편해지네요. 같이 연구하실 분?",
    createdAt: new Date(Date.now() - 1000 * 60 * 47).toISOString(),
    author: { username: "에임은거들뿐", avatarUrl: null, level: 27 },
    game: demoGames[2],
    images: ["/demo/tactics.svg"],
    attachments: [],
    likeCount: 76,
    commentCount: 18,
    liked: true,
    isOwner: false
  },
  {
    id: "demo-3",
    body: "친구들이랑 로블록스에서 새 맵을 완성했어요! 같이 플레이하면서 개선할 점을 찾아보려 합니다 🎮",
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(),
    author: { username: "모코코원정대", avatarUrl: null, level: 58 },
    game: demoGames[4],
    images: [
      "/demo/raid.svg",
      "/demo/victory.svg"
    ],
    attachments: [],
    likeCount: 214,
    commentCount: 31,
    liked: false,
    isOwner: false
  }
];
