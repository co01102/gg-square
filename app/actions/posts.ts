"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { postSchema, validateImages } from "@/lib/validation";

export async function createPost(
  _: { error?: string; success?: string },
  formData: FormData
): Promise<{ error?: string; success?: string }> {
  const parsed = postSchema.safeParse({
    body: formData.get("body"),
    gameId: formData.get("gameId")
  });
  const images = formData.getAll("images").filter((item): item is File => item instanceof File && item.size > 0);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message };
  const imageError = validateImages(images);
  if (imageError) return { error: imageError };
  const supabase = await createClient();
  if (!supabase) return { error: "Supabase 환경 변수를 먼저 연결해 주세요." };
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "로그인이 필요합니다." };

  const { data: post, error } = await supabase.from("posts").insert({
    body: parsed.data.body, game_id: parsed.data.gameId, author_id: user.id
  }).select("id").single();
  if (error) return { error: error.message };

  const uploaded: string[] = [];
  for (const [index, image] of images.entries()) {
    const extension = image.name.split(".").pop()?.toLowerCase() || "webp";
    const path = `${user.id}/${post.id}/${crypto.randomUUID()}.${extension}`;
    const { error: uploadError } = await supabase.storage.from("post-images").upload(path, image, { contentType: image.type });
    if (uploadError) {
      await supabase.storage.from("post-images").remove(uploaded);
      await supabase.from("posts").delete().eq("id", post.id);
      return { error: "이미지 업로드에 실패했습니다. 다시 시도해 주세요." };
    }
    uploaded.push(path);
    const { data: publicUrl } = supabase.storage.from("post-images").getPublicUrl(path);
    const { error: imageRecordError } = await supabase.from("post_images").insert({
      post_id: post.id,
      storage_path: path,
      public_url: publicUrl.publicUrl,
      position: index
    });
    if (imageRecordError) {
      await supabase.storage.from("post-images").remove(uploaded);
      await supabase.from("posts").delete().eq("id", post.id);
      return { error: "사진 정보를 저장하지 못했습니다. 다시 시도해 주세요." };
    }
  }
  revalidatePath("/");
  return { success: "게시물을 올렸어요!" };
}
