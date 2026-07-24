import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  if (!supabase) return NextResponse.json({ error: "Supabase가 연결되지 않았습니다." }, { status: 503 });
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  const { data: existing } = await supabase.from("likes").select("post_id").eq("post_id", id).eq("user_id", user.id).maybeSingle();
  if (existing) {
    await supabase.from("likes").delete().eq("post_id", id).eq("user_id", user.id);
    return NextResponse.json({ liked: false });
  }
  const { error } = await supabase.from("likes").insert({ post_id: id, user_id: user.id });
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ liked: true });
}
