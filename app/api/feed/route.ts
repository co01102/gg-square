import { NextRequest, NextResponse } from "next/server";
import { getFeedPage } from "@/lib/feed";

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const result = await getFeedPage({
    cursor: params.get("cursor"),
    game: params.get("game") || "all",
    sort: params.get("sort") === "popular" ? "popular" : "latest"
  });
  return NextResponse.json(result);
}
