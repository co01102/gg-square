import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import type { PostComment } from "@/lib/types";

const schema = z.object({ body: z.string().trim().min(1).max(1000) });

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  if (!supabase) return NextResponse.json({ error: "Supabase가 연결되지 않았습니다." }, { status: 503 });

  const [{ data: { user } }, { data, error }] = await Promise.all([
    supabase.auth.getUser(),
    supabase
      .from("comments")
      .select("id, body, created_at, user_id, profiles!comments_user_id_fkey(username, avatar_url)")
      .eq("post_id", id)
      .order("created_at", { ascending: true })
  ]);

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  const comments: PostComment[] = (data || []).map((row) => {
    const profile = row.profiles as unknown as { username?: string; avatar_url?: string | null } | null;
    return {
      id: row.id,
      body: row.body,
      createdAt: row.created_at,
      isOwn: row.user_id === user?.id,
      author: {
        username: profile?.username || "게이머",
        avatarUrl: profile?.avatar_url || null
      }
    };
  });

  return NextResponse.json({ comments });
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const parsed = schema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: "댓글을 입력해 주세요." }, { status: 400 });
  const supabase = await createClient();
  if (!supabase) return NextResponse.json({ error: "Supabase가 연결되지 않았습니다." }, { status: 503 });
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  const { data, error } = await supabase.from("comments").insert({ post_id: id, user_id: user.id, body: parsed.data.body }).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json(data, { status: 201 });
}
