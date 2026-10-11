import type { Metadata } from 'next';
import './globals.css';
import { LanguageProvider } from '../i18n/LanguageContext';

export const metadata: Metadata = {
  title: 'Live 2030 — Master Administration & Agency Console',
  description: 'Enterprise Management Portal for Live 2030 Streaming Platform',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className="bg-[#0B0F19] text-gray-100 antialiased min-h-screen">
        <LanguageProvider>
          {children}
        </LanguageProvider>
      </body>
    </html>
  );
}
