import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  if (!supabase) return NextResponse.json({ error: "Supabase가 연결되지 않았습니다." }, { status: 503 });

  const { data: attachment, error } = await supabase
    .from("post_attachments")
    .select("storage_path, file_name, posts!inner(is_published)")
    .eq("id", id)
    .eq("posts.is_published", true)
    .maybeSingle();

  if (error || !attachment) {
    return NextResponse.json({ error: "첨부파일을 찾을 수 없습니다." }, { status: 404 });
  }

  const { data, error: signedUrlError } = await supabase.storage
    .from("post-files")
    .createSignedUrl(attachment.storage_path, 60, { download: attachment.file_name });

  if (signedUrlError || !data?.signedUrl) {
    return NextResponse.json({ error: "다운로드 주소를 만들지 못했습니다." }, { status: 500 });
  }

  return NextResponse.redirect(data.signedUrl);
}
