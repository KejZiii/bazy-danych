import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import React from 'react'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'System zarządzania restauracją',
  description: 'System do zarządzania zamówieniami w restauracji',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="pl">
      <body className={`${inter.className} text-black`}>
        <main className="min-h-screen bg-white">
          {children}
        </main>
      </body>
    </html>
  )
}
