import { Analytics } from '@vercel/analytics/next'
import type { Metadata, Viewport } from 'next'
import { SessionProvider } from '@/lib/sessionContext'
import './globals.css'

export const metadata: Metadata = {
  title: 'AI for ALL | Learn, create, explore',
  description: 'A welcoming place to explore how artificial intelligence can help everyone.',
  generator: 'AI for ALL',
  icons: {
    icon: [
      {
        url: '/icon-light-32x32.png',
        media: '(prefers-color-scheme: light)',
      },
      {
        url: '/icon-dark-32x32.png',
        media: '(prefers-color-scheme: dark)',
      },
      {
        url: '/icon.svg',
        type: 'image/svg+xml',
      },
    ],
    apple: '/apple-icon.png',
  },
}

export const viewport: Viewport = {
  colorScheme: 'light dark',
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: 'white' },
    { media: '(prefers-color-scheme: dark)', color: 'black' },
  ],
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    // Removed the hardcoded bg-[#e8eaff] class here — it was painting a lavender
    // background on <html> that peeked through as a white/light border around
    // full-bleed pages. Each page (Landing, Get Started, auth, Home) already
    // covers 100dvh with its own background, so <html> doesn't need one.
    <html lang="en">
      <body>
        <SessionProvider>
          {children}
        </SessionProvider>
        {process.env.NODE_ENV === 'production' && <Analytics />}
      </body>
    </html>
  )
}