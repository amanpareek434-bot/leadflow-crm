import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { ThemeToggle } from "@/components/theme-toggle";
import { AdminNav } from "./admin-nav";
import { ShieldAlert, ArrowLeft } from "lucide-react";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();

  // Defense-in-depth: middleware already gates /admin/:path*, but every admin
  // page/layout independently re-checks isPlatformAdmin server-side since this
  // is cross-tenant data that must never leak to a regular customer session.
  if (!session || !session.user.isPlatformAdmin) {
    redirect("/dashboard");
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-slate-800 bg-slate-900 text-white">
        <div className="flex h-16 items-center justify-between px-6">
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2 font-bold">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/10">
                <ShieldAlert className="h-4 w-4" />
              </span>
              <span>
                LeadFlow <span className="text-slate-400">Admin</span>
              </span>
            </div>
            <AdminNav />
          </div>
          <div className="flex items-center gap-3">
            <ThemeToggle />
            <Link
              href="/dashboard"
              className="flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium text-slate-300 transition-colors hover:bg-white/10 hover:text-white"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to my dashboard
            </Link>
          </div>
        </div>
      </header>
      <main className="p-6">{children}</main>
    </div>
  );
}
