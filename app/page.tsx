import { CommunityApp } from "@/components/community-app";
import { getInitialFeed } from "@/lib/feed";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const initial = await getInitialFeed();
  return <CommunityApp initialPosts={initial.posts} initialCursor={initial.nextCursor} games={initial.games} demo={initial.demo} />;
}
