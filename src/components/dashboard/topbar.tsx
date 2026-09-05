"use client";

import { signOut } from "next-auth/react";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { initials } from "@/lib/utils";
import { LogOut, User } from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";

export function Topbar({ orgName, userName, userEmail }: { orgName: string; userName: string; userEmail: string }) {
  return (
    <header className="flex h-16 items-center justify-between border-b border-border px-6">
      <div>
        <p className="text-sm font-semibold">{orgName}</p>
        <p className="text-xs text-muted-foreground">Workspace</p>
      </div>
      <div className="flex items-center gap-2">
        <ThemeToggle />
        <DropdownMenu>
          <DropdownMenuTrigger className="flex items-center gap-3 rounded-full outline-none">
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
              {initials(userName)}
            </span>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>
              <p className="font-medium">{userName}</p>
              <p className="font-normal text-muted-foreground">{userEmail}</p>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => (window.location.href = "/settings/organization")}>
              <User className="mr-2 h-4 w-4" /> Account settings
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => signOut({ callbackUrl: "/" })}>
              <LogOut className="mr-2 h-4 w-4" /> Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
