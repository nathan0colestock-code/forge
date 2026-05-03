import type { Metadata, Viewport } from 'next';
import { ClerkProvider } from '@clerk/nextjs';
import { ErrorBoundary } from '@/components/error-boundary';
import './globals.css';

const APP_NAME = process.env.NEXT_PUBLIC_APP_NAME ?? 'Forge App';
const SHORT_NAME = process.env.NEXT_PUBLIC_APP_SHORT_NAME ?? APP_NAME.split(' ')[0];

export const metadata: Metadata = {
  title: { default: APP_NAME, template: `%s · ${APP_NAME}` },
  description: 'Built with Forge.',
  applicationName: APP_NAME,
  manifest: '/manifest.webmanifest',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: SHORT_NAME,
  },
  icons: {
    icon: [
      { url: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
      { url: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
    ],
    apple: [{ url: '/apple-touch-icon.png', sizes: '180x180', type: 'image/png' }],
    shortcut: '/favicon-32.png',
  },
};

export const viewport: Viewport = {
  themeColor: process.env.NEXT_PUBLIC_THEME_COLOR ?? '#0a0a0a',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  viewportFit: 'cover',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <ClerkProvider>
      <html lang="en" className="h-full" suppressHydrationWarning>
        <body className="min-h-full bg-bg text-fg font-sans antialiased">
          <ErrorBoundary>{children}</ErrorBoundary>
        </body>
      </html>
    </ClerkProvider>
  );
}
