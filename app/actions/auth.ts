"use server";

import { createHash } from "node:crypto";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { authSchema, signupSchema } from "@/lib/validation";

export type ActionState = { error?: string; success?: string };

function credentialEmail(username: string) {
  const normalized = username.normalize("NFKC").toLocaleLowerCase("ko-KR");
  const accountId = createHash("sha256").update(normalized).digest("hex");
  return `${accountId}@accounts.gg-square.local`;
}

export async function signIn(_: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = authSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message };
  const supabase = await createClient();
  if (!supabase) return { error: "Supabase 환경 변수를 먼저 연결해 주세요." };
  const { username, password } = parsed.data;
  const { error } = await supabase.auth.signInWithPassword({
    email: credentialEmail(username),
    password
  });
  if (error) return { error: "아이디 또는 비밀번호가 올바르지 않습니다." };
  redirect("/");
}

export async function signUp(_: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = signupSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message };
  const supabase = await createClient();
  if (!supabase) return { error: "Supabase 환경 변수를 먼저 연결해 주세요." };
  const { password, username } = parsed.data;
  const { data, error } = await supabase.auth.signUp({
    email: credentialEmail(username),
    password,
    options: { data: { username } }
  });
  if (error) {
    if (error.message.toLowerCase().includes("already")) return { error: "이미 사용 중인 아이디입니다." };
    return { error: "계정을 만들지 못했어요. 잠시 후 다시 시도해 주세요." };
  }
  if (!data.session) return { error: "계정은 생성됐지만 자동 로그인되지 않았어요. 잠시 후 로그인해 주세요." };
  redirect("/");
}

export async function signOut() {
  const supabase = await createClient();
  if (supabase) await supabase.auth.signOut();
  redirect("/");
}
