import { createClient, getCurrentUser } from "@/lib/supabase/server";
import { ChatInterface } from "@/components/chat/ChatInterface";
import { ChatContextPanel } from "@/components/chat/ChatContextPanel";

export default async function ChatPage() {
  const supabase = createClient();
  const user = await getCurrentUser();

  if (!user) {
    return null;
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("name")
    .eq("id", user.id)
    .single();

  return (
    <div className="mx-auto max-w-3xl">
      <ChatInterface
        userId={user.id}
        userName={profile?.name ?? "Usuario"}
        header={<ChatContextPanel />}
      />
    </div>
  );
}
