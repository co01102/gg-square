import { createClient, isSupabaseConfigured } from "./supabase/server";
import { demoGames, demoPosts } from "./mock-data";
import type { FeedPost, Game } from "./types";

type FeedOptions = { cursor?: string | null; game?: string; sort?: "latest" | "popular" };

function mapPost(row: Record<string, unknown>, currentUserId?: string): FeedPost {
  const profile = row.profiles as Record<string, unknown> | null;
  const game = row.games as Record<string, unknown>;
  const images = (row.post_images as Array<Record<string, unknown>> | null) || [];
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
    likeCount: likes.length,
    commentCount: comments.length,
    liked: Boolean(currentUserId && likes.some((like) => (like as { user_id?: string }).user_id === currentUserId))
  };
}

export async function getInitialFeed() {
  if (!isSupabaseConfigured()) return { posts: demoPosts, nextCursor: null, games: demoGames, demo: true };
  const supabase = await createClient();
  if (!supabase) return { posts: demoPosts, nextCursor: null, games: demoGames, demo: true };
  const [{ data: games }, feed] = await Promise.all([
    supabase.from("games").select("*").eq("is_active", true).order("name"),
    getFeedPage({ sort: "latest", game: "all" })
  ]);
  const allGame: Game = { id: "all", name: "전체 게임", slug: "all", icon: "✦", color: "#8b5cf6" };
  return { posts: feed.posts, nextCursor: feed.nextCursor, games: [allGame, ...((games || []) as Game[])], demo: false };
}

export async function getFeedPage(options: FeedOptions) {
  if (!isSupabaseConfigured()) {
    const filtered = options.game && options.game !== "all"
      ? demoPosts.filter((post) => post.game.id === options.game)
      : demoPosts;
    const sorted = options.sort === "popular" ? [...filtered].sort((a, b) => b.likeCount + b.commentCount * 2 - (a.likeCount + a.commentCount * 2)) : filtered;
    return { posts: sorted, nextCursor: null, demo: true };
  }
  const supabase = await createClient();
  if (!supabase) return { posts: [], nextCursor: null };
  const { data: { user } } = await supabase.auth.getUser();
  let query = supabase
    .from("posts")
    .select("*, profiles(username, avatar_url), games(*), post_images(*), likes(user_id), comments(id)")
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
  if (options.sort === "popular") posts = posts.sort((a, b) => b.likeCount + b.commentCount * 2 - (a.likeCount + a.commentCount * 2));
  return {
    posts: options.sort === "popular" ? posts.slice(0, 10) : posts,
    nextCursor: options.sort === "latest" && posts.length === 10 ? posts[posts.length - 1].createdAt : null,
    demo: false
  };
}
