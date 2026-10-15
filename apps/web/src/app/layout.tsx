/**
 * Kořenový layout: písmo Work Sans, globální styly, relace a horní lišta.
 */
import type { Metadata } from 'next';
import { Work_Sans } from 'next/font/google';
import type { ReactNode } from 'react';
import { TopBar } from '@/components/TopBar';
import { SessionProvider } from '@/hooks/session';
import './globals.css';

const workSans = Work_Sans({ subsets: ['latin', 'latin-ext'], variable: '--font-work-sans', display: 'swap' });

export const metadata: Metadata = {
  title: 'VALXON Academy · Dodavatelská učebnice',
  description: 'Sedmidílné výukové prezentace dodavatelů VALXON z doložených podkladů.',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="cs" className={workSans.variable}>
      <body className="min-h-screen font-sans antialiased">
        <SessionProvider>
          <TopBar />
          {children}
        </SessionProvider>
      </body>
    </html>
  );
}
