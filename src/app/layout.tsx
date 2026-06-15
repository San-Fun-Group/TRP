import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'TRP Hospital Hotel',
  description: 'IPD Hotel Reservation System — Staff Access Only',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="th" className="h-full antialiased">
      <body className="min-h-full">{children}</body>
    </html>
  )
}
