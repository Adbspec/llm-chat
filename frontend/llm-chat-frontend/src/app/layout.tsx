// src/app/layout.tsx
import './globals.css'
import type { Metadata } from 'next'
import { FC, ReactNode } from 'react'

export const metadata: Metadata = {
  title: 'Mini ChatGPT',
  description: 'Self-hosted ChatGPT-style interface',
}

const RootLayout: FC<{ children: ReactNode }> = ({ children }) => (
  <html lang="en">
    <body className="antialiased bg-gray-900 text-gray-100">
      {children}
    </body>
  </html>
)

export default RootLayout
