import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { Sidebar } from "@/components/dashboard/sidebar";
import { Topbar } from "@/components/dashboard/topbar";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  if (!session) redirect("/login");

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <div className="flex flex-1 flex-col">
        <Topbar
          orgName={session.user.organizationName}
          userName={session.user.name ?? "User"}
          userEmail={session.user.email ?? ""}
        />
        <main className="flex-1 overflow-y-auto bg-muted/10 p-6">{children}</main>
      </div>
    </div>
  );
}
