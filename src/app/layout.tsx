
import type {Metadata} from 'next';
import './globals.css';
import { Toaster } from '@/components/ui/toaster';
import { LayoutShell } from '@/components/layout/layout-shell';
import { FirebaseClientProvider } from '@/firebase/client-provider';
import { ThemeProvider } from '@/components/theme-provider';
import { GlobalChatbot } from '@/components/layout/global-chatbot';
import { Suspense } from 'react';
import { Loader2 } from 'lucide-react';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Biztrix AI | Intelligent Business OS',
  description: 'Enterprise Grade Business Management, Automation & AI Advisor',
  openGraph: {
    title: 'Biztrix AI | Intelligent Business OS',
    description: 'Enterprise Grade Business Management, Automation & AI Advisor',
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
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;900&family=Mukta:wght@400;700;800&display=swap" rel="stylesheet" />
      </head>
      <body 
        className="font-body antialiased bg-background text-foreground overflow-x-hidden transition-colors duration-300"
        suppressHydrationWarning
      >
        <ThemeProvider
          attribute="class"
          defaultTheme="light"
          forcedTheme="light"
          enableSystem={false}
          disableTransitionOnChange
        >
          <FirebaseClientProvider>
            <Suspense fallback={<div className="min-h-screen flex items-center justify-center bg-slate-50"><Loader2 className="h-10 w-10 animate-spin text-primary opacity-20" /></div>}>
              <LayoutShell>
                {children}
              </LayoutShell>
              <GlobalChatbot />
              <Toaster />
            </Suspense>
          </FirebaseClientProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
