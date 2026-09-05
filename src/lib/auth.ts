import { type AuthOptions, type DefaultSession, getServerSession } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import type { UserRole } from "@prisma/client";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: UserRole;
      organizationId: string;
      organizationName: string;
      organizationSlug: string;
      isPlatformAdmin: boolean;
    } & DefaultSession["user"];
  }
}

/**
 * Platform (super-admin) access — deliberately NOT a database column. It's
 * just an allowlist of emails in PLATFORM_ADMIN_EMAILS (comma-separated),
 * checked at login time. This lets the platform owner see the cross-tenant
 * /admin panel (all organizations/customers) without any schema migration,
 * and without a way for a regular signup to ever grant themselves access.
 */
function isPlatformAdminEmail(email: string): boolean {
  const allowlist = (process.env.PLATFORM_ADMIN_EMAILS ?? "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
  return allowlist.includes(email.toLowerCase());
}

export const authOptions: AuthOptions = {
  session: { strategy: "jwt" },
  pages: {
    signIn: "/login",
  },
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;

        const user = await prisma.user.findUnique({
          where: { email: credentials.email.toLowerCase().trim() },
          include: { organization: true },
        });
        if (!user || !user.isActive) return null;

        const valid = await bcrypt.compare(credentials.password, user.passwordHash);
        if (!valid) return null;

        return {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          organizationId: user.organizationId,
          organizationName: user.organization.name,
          organizationSlug: user.organization.slug,
          isPlatformAdmin: isPlatformAdminEmail(user.email),
        } as any;
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        const u = user as any;
        token.id = u.id;
        token.role = u.role;
        token.organizationId = u.organizationId;
        token.organizationName = u.organizationName;
        token.organizationSlug = u.organizationSlug;
        token.isPlatformAdmin = u.isPlatformAdmin;
      }
      return token;
    },
    async session({ session, token }) {
      session.user.id = token.id as string;
      session.user.role = token.role as UserRole;
      session.user.organizationId = token.organizationId as string;
      session.user.organizationName = token.organizationName as string;
      session.user.organizationSlug = token.organizationSlug as string;
      session.user.isPlatformAdmin = Boolean(token.isPlatformAdmin);
      return session;
    },
  },
};

/** Server-side helper: get the current session or throw. Use in Server Components / route handlers. */
export async function requireSession() {
  const session = await getServerSession(authOptions);
  if (!session) throw new Error("UNAUTHORIZED");
  return session;
}

export async function getSession() {
  return getServerSession(authOptions);
}
