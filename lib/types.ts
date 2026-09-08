export type Game = {
  id: string;
  name: string;
  slug: string;
  icon: string;
  color: string;
};

export type ViewerProfile = {
  username: string;
  avatarUrl: string | null;
};

export type PostAttachment = {
  id: string;
  fileName: string;
  contentType: string;
  sizeBytes: number;
};

export type FeedPost = {
  id: string;
  body: string;
  createdAt: string;
  author: { username: string; avatarUrl: string | null; level?: number };
  game: Game;
  images: string[];
  attachments: PostAttachment[];
  likeCount: number;
  commentCount: number;
  liked: boolean;
  isOwner: boolean;
};

export type PostComment = {
  id: string;
  body: string;
  createdAt: string;
  isOwn: boolean;
  author: {
    username: string;
    avatarUrl: string | null;
  };
};
