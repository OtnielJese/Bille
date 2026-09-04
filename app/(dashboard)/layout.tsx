import { redirect } from "next/navigation";
import { getCurrentUser, getProfile } from "@/lib/supabase/server";
import { Sidebar, SidebarProvider } from "@/components/shared/Sidebar";
import { Topbar } from "@/components/shared/Topbar";
import { RightSidebar } from "@/components/shared/RightSidebar";
import type { Profile } from "@/types";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  const profile = await getProfile(user.id);

  const profileData = (profile as Profile | null) ?? null;

  return (
    <SidebarProvider>
      <Sidebar />
      <div className="min-h-screen lg:pl-64">
        <Topbar user={profileData} />
        <div className="flex">
          <main className="min-w-0 flex-1 p-4 md:p-6 lg:p-8">
            <div className="mx-auto w-full max-w-6xl">{children}</div>
          </main>
          <RightSidebar user={profileData} />
        </div>
      </div>
    </SidebarProvider>
  );
}
