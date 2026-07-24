"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { authSchema, signupSchema } from "@/lib/validation";

export type ActionState = { error?: string; success?: string };

export async function signIn(_: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = authSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: "이메일과 비밀번호를 확인해 주세요." };
  const supabase = await createClient();
  if (!supabase) return { error: "Supabase 환경 변수를 먼저 연결해 주세요." };
  const { error } = await supabase.auth.signInWithPassword(parsed.data);
  if (error) return { error: "이메일 또는 비밀번호가 올바르지 않습니다." };
  redirect("/");
}

export async function signUp(_: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = signupSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message };
  const supabase = await createClient();
  if (!supabase) return { error: "Supabase 환경 변수를 먼저 연결해 주세요." };
  const { email, password, username } = parsed.data;
  const { error } = await supabase.auth.signUp({
    email, password,
    options: { data: { username }, emailRedirectTo: `${process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"}/auth/callback` }
  });
  if (error) return { error: error.message };
  return { success: "인증 메일을 보냈어요. 받은 편지함을 확인해 주세요." };
}

export async function signInWithGoogle() {
  const supabase = await createClient();
  if (!supabase) redirect("/?auth=config");
  const { data } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: { redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"}/auth/callback` }
  });
  if (data.url) redirect(data.url);
}

export async function signOut() {
  const supabase = await createClient();
  if (supabase) await supabase.auth.signOut();
  redirect("/");
}

export async function resetPassword(_: ActionState, formData: FormData): Promise<ActionState> {
  const email = String(formData.get("email") || "");
  const supabase = await createClient();
  if (!supabase) return { error: "Supabase 환경 변수를 먼저 연결해 주세요." };
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"}/auth/callback?next=/profile`
  });
  return error ? { error: error.message } : { success: "비밀번호 재설정 메일을 보냈어요." };
}
