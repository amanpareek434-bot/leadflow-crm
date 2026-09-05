import Link from "next/link";

export function SiteFooter() {
  return (
    <footer className="border-t border-border/60 py-10">
      <div className="container flex flex-col items-center justify-between gap-4 text-sm text-muted-foreground md:flex-row">
        <p>© {new Date().getFullYear()} LeadFlow CRM. All rights reserved.</p>
        <div className="flex flex-wrap items-center justify-center gap-6">
          <Link href="/pricing" className="hover:text-foreground">Pricing</Link>
          <a href="https://claude.ai/code/artifact/55636bd2-5082-440f-93a0-c6e16b20bed6" target="_blank" rel="noopener noreferrer" className="hover:text-foreground">
            Docs
          </a>
          <Link href="/privacy" className="hover:text-foreground">Privacy</Link>
          <Link href="/terms" className="hover:text-foreground">Terms</Link>
          <Link href="/data-deletion" className="hover:text-foreground">Data Deletion</Link>
          <Link href="/login" className="hover:text-foreground">Log in</Link>
          <Link href="/register" className="hover:text-foreground">Sign up</Link>
        </div>
      </div>
    </footer>
  );
}
