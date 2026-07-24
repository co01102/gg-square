"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { profileSchema, validateImages } from "@/lib/validation";

export async function updateProfile(
  _: { error?: string; success?: string },
  formData: FormData
): Promise<{ error?: string; success?: string }> {
  const parsed = profileSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message };
  const avatar = formData.get("avatar");
  const avatarFile = avatar instanceof File && avatar.size > 0 ? avatar : null;
  const imageError = validateImages(avatarFile ? [avatarFile] : [], 1);
  if (imageError) return { error: imageError };
  const supabase = await createClient();
  if (!supabase) return { error: "Supabase 환경 변수를 먼저 연결해 주세요." };
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "로그인이 필요합니다." };
  let avatarUrl: string | undefined;
  if (avatarFile) {
    const ext = avatarFile.name.split(".").pop() || "webp";
    const path = `${user.id}/avatar-${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from("avatars").upload(path, avatarFile, { upsert: true, contentType: avatarFile.type });
    if (error) return { error: "프로필 사진 업로드에 실패했습니다." };
    avatarUrl = supabase.storage.from("avatars").getPublicUrl(path).data.publicUrl;
  }
  const values = { username: parsed.data.username, bio: parsed.data.bio, ...(avatarUrl ? { avatar_url: avatarUrl } : {}) };
  const { error } = await supabase.from("profiles").update(values).eq("id", user.id);
  if (error) return { error: error.code === "23505" ? "이미 사용 중인 닉네임입니다." : error.message };
  revalidatePath("/profile");
  return { success: "프로필을 저장했어요." };
}
