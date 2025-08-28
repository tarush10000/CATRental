import { Inter } from 'next/font/google'
import Providers from '@/components/Providers'
import './globals.css'

const inter = Inter({ subsets: ['latin'] })

export const metadata = {
  title: 'CatRental - Caterpillar Equipment Rental Management',
  description: 'Streamline your Caterpillar equipment rentals with real-time tracking, intelligent scheduling, and powerful fleet management analytics',
  keywords: 'caterpillar, equipment rental, fleet management, construction equipment, heavy machinery',
  authors: [{ name: 'CatRental Team' }],
  robots: 'index, follow',
  openGraph: {
    title: 'CatRental - Caterpillar Equipment Rental Management',
    description: 'Professional fleet management for Caterpillar equipment rentals',
    type: 'website',
    locale: 'en_US',
  },
}

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#FFCD11',
}

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <link rel="icon" href="/favicon.ico" />
        <link rel="apple-touch-icon" href="/caterpillar-logo.png" />
      </head>
      <body className={inter.className}>
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  )
}