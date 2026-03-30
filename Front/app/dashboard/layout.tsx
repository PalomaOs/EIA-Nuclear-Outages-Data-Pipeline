"use client"

import { AuthProvider } from "@/lib/auth-context"
import { Toaster } from "@/components/ui/sonner"

export default function DashboardRootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <AuthProvider>
      {children}
      <Toaster position="bottom-right" />
    </AuthProvider>
  )
}
