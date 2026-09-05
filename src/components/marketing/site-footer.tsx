import Link from "next/link";

export function SiteFooter() {
  return (
    <footer className="border-t border-border/60 py-10">
      <div className="container flex flex-col items-center justify-between gap-4 text-sm text-muted-foreground md:flex-row">
        <p>© {new Date().getFullYear()} LeadFlow CRM. All rights reserved.</p>
        <div className="flex gap-6">
          <Link href="/pricing" className="hover:text-foreground">Pricing</Link>
          <Link href="/login" className="hover:text-foreground">Log in</Link>
          <Link href="/register" className="hover:text-foreground">Sign up</Link>
        </div>
      </div>
    </footer>
  );
}
