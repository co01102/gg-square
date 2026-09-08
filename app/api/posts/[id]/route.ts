import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

const updateSchema = z.object({
  body: z.string().trim().min(1).max(2000),
  gameId: z.string().uuid()
});

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const parsed = updateSchema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: "게시물 내용을 확인해 주세요." }, { status: 400 });
  const { id } = await params;
  const supabase = await createClient();
  if (!supabase) return NextResponse.json({ error: "Supabase가 연결되지 않았습니다." }, { status: 503 });
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  const { data, error } = await supabase.from("posts")
    .update({ body: parsed.data.body, game_id: parsed.data.gameId })
    .eq("id", id).eq("author_id", user.id).select().maybeSingle();
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  if (!data) return NextResponse.json({ error: "수정 권한이 없습니다." }, { status: 403 });
  return NextResponse.json(data);
}

export async function DELETE(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  if (!supabase) return NextResponse.json({ error: "Supabase가 연결되지 않았습니다." }, { status: 503 });
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  const { data: images } = await supabase.from("post_images").select("storage_path")
    .eq("post_id", id);
  const { data: attachments } = await supabase.from("post_attachments").select("storage_path")
    .eq("post_id", id);
  const { data, error } = await supabase.from("posts").delete()
    .eq("id", id).eq("author_id", user.id).select("id").maybeSingle();
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  if (!data) return NextResponse.json({ error: "삭제 권한이 없습니다." }, { status: 403 });
  const paths = (images || []).map((image) => image.storage_path);
  if (paths.length) await supabase.storage.from("post-images").remove(paths);
  const attachmentPaths = (attachments || []).map((attachment) => attachment.storage_path);
  if (attachmentPaths.length) await supabase.storage.from("post-files").remove(attachmentPaths);
  return new NextResponse(null, { status: 204 });
}
