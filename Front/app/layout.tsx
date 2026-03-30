import type { Metadata } from 'next'
import { Geist, Geist_Mono } from 'next/font/google'
import { Analytics } from '@vercel/analytics/next'
import { ThemeProvider } from '@/components/theme-provider'
import './globals.css'

const _geist = Geist({ subsets: ["latin"] });
const _geistMono = Geist_Mono({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: 'Nuclear Outage Monitor | Admin Dashboard',
  description: 'Professional admin panel for monitoring nuclear facility outages and energy capacity',
  generator: '',
  
  icons: {
    icon: [
      {
        url: '/icon-wh.png',
        media: '(prefers-color-scheme: light)',
      },
      {
        url: '/icon-bk.png' ,
        media: '(prefers-color-scheme: dark)',
      },
      {
        url: '/file.svg',
        type: 'image/svg+xml',
      },
    ],
    apple: '/negro.png',
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="font-sans antialiased" suppressHydrationWarning>
        <ThemeProvider
          attribute="class"
          defaultTheme="dark"
          enableSystem
          disableTransitionOnChange
        >
          {children}
        </ThemeProvider>
        <Analytics />
      </body>
    </html>
  )
}
