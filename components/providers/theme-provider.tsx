"use client"

import * as React from "react"
import { ThemeProvider as NextThemesProvider } from "@teispace/next-themes"

/**
 * Wraps the app with `teispace/next-themes
` for light/dark/system theme switching.
 */
export function ThemeProvider({
  children,
  ...props
}: React.ComponentProps<typeof NextThemesProvider>) {
  return <NextThemesProvider {...props}>{children}</NextThemesProvider>
}