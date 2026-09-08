import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { postSchema } from "@/lib/validation";

export async function POST(request: Request) {
  const parsed = postSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message || "게시물 내용을 확인해 주세요." }, { status: 400 });
  }

  const supabase = await createClient();
  if (!supabase) return NextResponse.json({ error: "Supabase가 연결되지 않았습니다." }, { status: 503 });
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });

  const { data: post, error } = await supabase.from("posts").insert({
    body: parsed.data.body,
    game_id: parsed.data.gameId,
    author_id: user.id
  }).select("id").single();

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ postId: post.id, userId: user.id }, { status: 201 });
}
