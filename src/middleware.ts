import { withAuth } from "next-auth/middleware";

// Protects everything under /dashboard/* etc — redirects to /login when
// unauthenticated. /admin/* additionally requires isPlatformAdmin (the
// cross-tenant super-admin panel) — anyone logged in but not on the
// PLATFORM_ADMIN_EMAILS allowlist gets redirected away, not just bounced to
// login (they ARE logged in, just not authorized for this section).
// Marketing pages, /login, /register, and all /api/* routes (which do their
// own auth) are left untouched.
export default withAuth(
  function middleware() {
    return undefined;
  },
  {
    pages: { signIn: "/login" },
    callbacks: {
      authorized: ({ req, token }) => {
        if (!token) return false;
        if (req.nextUrl.pathname.startsWith("/admin")) {
          return Boolean(token.isPlatformAdmin);
        }
        return true;
      },
    },
  }
);

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/leads/:path*",
    "/pipeline/:path*",
    "/contacts/:path*",
    "/deals/:path*",
    "/whatsapp/:path*",
    "/integrations/:path*",
    "/reports/:path*",
    "/settings/:path*",
    "/admin/:path*",
  ],
};
