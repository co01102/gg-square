import { createClient, isSupabaseConfigured } from "./supabase/server";
import { demoGames, demoPosts } from "./mock-data";
import type { FeedPost, Game, ViewerProfile } from "./types";

type FeedOptions = { cursor?: string | null; game?: string; sort?: "latest" | "popular" };

function sortByPopularity(posts: FeedPost[]) {
  return [...posts].sort((a, b) =>
    b.likeCount - a.likeCount
    || b.commentCount - a.commentCount
    || new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
}

function mapPost(row: Record<string, unknown>, currentUserId?: string): FeedPost {
  const profile = row.profiles as Record<string, unknown> | null;
  const game = row.games as Record<string, unknown>;
  const images = (row.post_images as Array<Record<string, unknown>> | null) || [];
  const attachments = (row.post_attachments as Array<Record<string, unknown>> | null) || [];
  const likes = (row.likes as Array<unknown> | null) || [];
  const comments = (row.comments as Array<unknown> | null) || [];
  return {
    id: String(row.id),
    body: String(row.body),
    createdAt: String(row.created_at),
    author: { username: String(profile?.username || "게이머"), avatarUrl: profile?.avatar_url ? String(profile.avatar_url) : null },
    game: {
      id: String(game.id), name: String(game.name), slug: String(game.slug),
      icon: String(game.icon || "G"), color: String(game.color || "#8b5cf6")
    },
    images: images.sort((a, b) => Number(a.position) - Number(b.position)).map((image) => String(image.public_url)),
    attachments: attachments
      .sort((a, b) => Number(a.position) - Number(b.position))
      .map((attachment) => ({
        id: String(attachment.id),
        fileName: String(attachment.file_name),
        contentType: String(attachment.content_type),
        sizeBytes: Number(attachment.size_bytes)
      })),
    likeCount: likes.length,
    commentCount: comments.length,
    liked: Boolean(currentUserId && likes.some((like) => (like as { user_id?: string }).user_id === currentUserId)),
    isOwner: Boolean(currentUserId && row.author_id === currentUserId)
  };
}

export async function getInitialFeed() {
  if (!isSupabaseConfigured()) return {
    posts: demoPosts,
    popularPosts: sortByPopularity(demoPosts).slice(0, 4),
    nextCursor: null,
    games: demoGames,
    viewer: null,
    demo: true
  };
  const supabase = await createClient();
  if (!supabase) return {
    posts: demoPosts,
    popularPosts: sortByPopularity(demoPosts).slice(0, 4),
    nextCursor: null,
    games: demoGames,
    viewer: null,
    demo: true
  };
  const { data: { user } } = await supabase.auth.getUser();
  const [{ data: games }, feed, popularFeed, { data: profile }] = await Promise.all([
    supabase.from("games").select("*").eq("is_active", true).order("name"),
    getFeedPage({ sort: "latest", game: "all" }),
    getFeedPage({ sort: "popular", game: "all" }),
    user
      ? supabase.from("profiles").select("username, avatar_url").eq("id", user.id).maybeSingle()
      : Promise.resolve({ data: null })
  ]);
  const allGame: Game = { id: "all", name: "전체 게임", slug: "all", icon: "✦", color: "#8b5cf6" };
  const viewer: ViewerProfile | null = profile
    ? { username: profile.username, avatarUrl: profile.avatar_url }
    : null;
  return {
    posts: feed.posts,
    popularPosts: popularFeed.posts.slice(0, 4),
    nextCursor: feed.nextCursor,
    games: [allGame, ...((games || []) as Game[])],
    viewer,
    demo: false
  };
}

export async function getFeedPage(options: FeedOptions) {
  if (!isSupabaseConfigured()) {
    const filtered = options.game && options.game !== "all"
      ? demoPosts.filter((post) => post.game.id === options.game)
      : demoPosts;
    const sorted = options.sort === "popular" ? sortByPopularity(filtered) : filtered;
    return { posts: sorted, nextCursor: null, demo: true };
  }
  const supabase = await createClient();
  if (!supabase) return { posts: [], nextCursor: null };
  const { data: { user } } = await supabase.auth.getUser();
  let query = supabase
    .from("posts")
    .select(
      "*, profiles!posts_author_id_fkey(username, avatar_url), games!posts_game_id_fkey(*), post_images(*), post_attachments(*), likes(user_id), comments(id)"
    )
    .eq("is_published", true)
    .order("created_at", { ascending: false })
    .limit(options.sort === "popular" ? 50 : 10);
  if (options.cursor) query = query.lt("created_at", options.cursor);
  if (options.game && options.game !== "all") query = query.eq("game_id", options.game);
  if (options.sort === "popular") {
    query = query.gte("created_at", new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString());
  }
  const { data, error } = await query;
  if (error) return { posts: [], nextCursor: null, error: error.message };
  let posts = (data || []).map((row) => mapPost(row as unknown as Record<string, unknown>, user?.id));
  if (options.sort === "popular") posts = sortByPopularity(posts);
  return {
    posts: options.sort === "popular" ? posts.slice(0, 10) : posts,
    nextCursor: options.sort === "latest" && posts.length === 10 ? posts[posts.length - 1].createdAt : null,
    demo: false
  };
}
