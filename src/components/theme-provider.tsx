"use client";

import { ThemeProvider as NextThemesProvider, type ThemeProviderProps } from "next-themes";

// Wraps next-themes: attribute="data-theme" matches the [data-theme="dark"]
// selectors in globals.css (kept distinct from Tailwind's own `dark:` class
// strategy so both can coexist without fighting each other).
export function ThemeProvider({ children, ...props }: ThemeProviderProps) {
  return <NextThemesProvider {...props}>{children}</NextThemesProvider>;
}
