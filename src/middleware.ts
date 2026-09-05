import { withAuth } from "next-auth/middleware";

// Protects everything under /dashboard/* — redirects to /login when unauthenticated.
// Marketing pages, /login, /register, and all /api/* routes (which do their own
// auth) are left untouched.
export default withAuth({
  pages: { signIn: "/login" },
});

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
  ],
};
