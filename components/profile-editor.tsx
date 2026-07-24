"use client";

import { useActionState, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Camera, Gamepad2, Lock, UserRound } from "lucide-react";
import { updateProfile } from "@/app/actions/profile";

type Profile = { username?: string; bio?: string; avatar_url?: string | null } | null;

export function ProfileEditor({ user, profile }: { user: { id: string; email: string } | null; profile: Profile }) {
  const [state, action, pending] = useActionState(updateProfile, {});
  const [preview, setPreview] = useState(profile?.avatar_url || "");
  const file = useRef<HTMLInputElement>(null);
  if (!user) return (
    <section className="profile-empty">
      <div className="profile-empty-icon"><Lock size={34} /></div>
      <h1>로그인이 필요해요</h1>
      <p>내 프로필을 꾸미고 게임 이야기를 모아보세요.</p>
      <Link href="/" className="button primary">홈에서 로그인하기</Link>
    </section>
  );
  return (
    <section className="profile-editor">
      <div className="profile-banner"><div className="orb orb-one" /><Gamepad2 size={90} /></div>
      <form action={action}>
        <div className="profile-top">
          <button type="button" className="avatar-editor" onClick={() => file.current?.click()}>
            {preview ? <Image src={preview} alt="프로필 미리보기" fill sizes="112px" /> : <UserRound size={42} />}
            <span><Camera size={16} /></span>
          </button>
          <input ref={file} hidden name="avatar" type="file" accept="image/jpeg,image/png,image/webp" onChange={(e) => {
            const selected = e.target.files?.[0]; if (selected) setPreview(URL.createObjectURL(selected));
          }} />
          <div><h1>{profile?.username || "새 게이머"}</h1><p>{user.email}</p></div>
        </div>
        <div className="profile-form">
          <h2>프로필 편집</h2>
          <label>닉네임<input name="username" defaultValue={profile?.username || ""} minLength={2} maxLength={20} required /></label>
          <label>자기소개<textarea name="bio" defaultValue={profile?.bio || ""} maxLength={160} placeholder="어떤 게임을 좋아하는지 알려주세요." /></label>
          {state.error && <p className="form-error">{state.error}</p>}
          {state.success && <p className="form-success">{state.success}</p>}
          <button className="button primary" disabled={pending}>{pending ? "저장 중..." : "변경사항 저장"}</button>
        </div>
      </form>
    </section>
  );
}
