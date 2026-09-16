import type { Metadata, Viewport } from 'next';
import './globals.css';
import { ThemeProvider } from '@/components/theme-provider';
import { AppShell } from '@/components/layout/app-shell';

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#f8f9fb' },
    { media: '(prefers-color-scheme: dark)', color: '#0b0d11' },
  ],
};

export const metadata: Metadata = {
  metadataBase: new URL('https://expense-tracker-pro.vercel.app'),
  title: 'Expense Tracker Pro | Modern Personal Finance & Intelligence',
  description:
    'A production-grade, Asian-Apple minimalist personal finance system with minor-unit accuracy, budget tracking, multi-member split, and vector PDF reports.',
  applicationName: 'Expense Tracker Pro',
  authors: [{ name: 'Deepak Polisetti' }],
  manifest: '/manifest.webmanifest',
  icons: {
    icon: [
      { url: '/favicon.ico', sizes: 'any' },
      { url: '/favicon-16x16.png', sizes: '16x16', type: 'image/png' },
      { url: '/favicon-32x32.png', sizes: '32x32', type: 'image/png' },
      { url: '/icon-192.png', sizes: '192x192', type: 'image/png' },
      { url: '/icon-512.png', sizes: '512x512', type: 'image/png' },
    ],
    shortcut: '/favicon.ico',
    apple: [
      { url: '/apple-touch-icon.png', sizes: '180x180', type: 'image/png' },
      { url: '/apple-touch-icon-precomposed.png', sizes: '180x180', type: 'image/png' },
    ],
  },
  appleWebApp: {
    capable: true,
    title: 'Expense Pro',
    statusBarStyle: 'black-translucent',
  },
  openGraph: {
    title: 'Expense Tracker Pro | Modern Personal Finance & Expense Intelligence',
    description:
      'Executive-grade personal finance, expense tracking, multi-account ledger, budget forecasting, and debt settlement platform.',
    url: 'https://expense-tracker-pro.vercel.app',
    siteName: 'Expense Tracker Pro',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'Expense Tracker Pro Preview',
      },
    ],
    locale: 'en_US',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Expense Tracker Pro | Modern Personal Finance',
    description:
      'Executive-grade personal finance, expense tracking, multi-account ledger, and debt settlement platform.',
    images: ['/og-image.png'],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="font-sans antialiased selection:bg-blue-100 selection:text-blue-900 dark:selection:bg-blue-900/40 dark:selection:text-blue-200">
        <ThemeProvider>
          <AppShell>{children}</AppShell>
        </ThemeProvider>
      </body>
    </html>
  );
}
