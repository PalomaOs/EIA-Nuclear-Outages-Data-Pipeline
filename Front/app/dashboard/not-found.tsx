import Link from "next/link"

export default function NotFound() {
  return (
    <div className="flex h-screen flex-col items-center justify-center gap-4">
      <h1 className="text-6xl font-bold text-sidebar-foreground">404</h1>
      <p className="text-sidebar-foreground/60">Page not found.</p>
      <Link
        href="/dashboard/outages"
        className="rounded-lg bg-sidebar-primary px-4 py-2 text-sm font-medium text-white hover:opacity-90"
      >
        Go to dashboard
      </Link>
    </div>
  )
}