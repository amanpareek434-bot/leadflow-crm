import type { UserRole } from "@prisma/client";

/**
 * Simple role-based access control. OWNER > ADMIN > AGENT.
 * Integrations, billing, and user management are OWNER/ADMIN only;
 * every role can work with leads/contacts/deals.
 */
const ROLE_RANK: Record<UserRole, number> = {
  OWNER: 3,
  ADMIN: 2,
  AGENT: 1,
};

export function hasRole(role: UserRole, minimum: UserRole): boolean {
  return ROLE_RANK[role] >= ROLE_RANK[minimum];
}

export function canManageBilling(role: UserRole) {
  return hasRole(role, "ADMIN");
}

export function canManageIntegrations(role: UserRole) {
  return hasRole(role, "ADMIN");
}

export function canManageUsers(role: UserRole) {
  return hasRole(role, "ADMIN");
}

export class ForbiddenError extends Error {
  constructor(message = "Forbidden") {
    super(message);
    this.name = "ForbiddenError";
  }
}

export function assertRole(role: UserRole, minimum: UserRole) {
  if (!hasRole(role, minimum)) throw new ForbiddenError(`Requires ${minimum} role or higher`);
}
