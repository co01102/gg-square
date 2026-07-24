import Link from "next/link";
import { ArrowLeft, Gamepad2 } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { ProfileEditor } from "@/components/profile-editor";

export const dynamic = "force-dynamic";

export default async function ProfilePage() {
  const supabase = await createClient();
  const user = supabase ? (await supabase.auth.getUser()).data.user : null;
  const profile = user && supabase
    ? (await supabase.from("profiles").select("*").eq("id", user.id).single()).data
    : null;
  return (
    <main className="profile-page">
      <header className="simple-header">
        <Link href="/" className="icon-button" aria-label="홈으로"><ArrowLeft size={20} /></Link>
        <Link href="/" className="brand"><span><Gamepad2 size={20} /></span> GG SQUARE</Link>
      </header>
      <ProfileEditor user={user ? { id: user.id } : null} profile={profile} />
    </main>
  );
}
