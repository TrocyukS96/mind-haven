import { routing } from '@/i18n/routing';
import type { Metadata } from 'next';
import { Geist } from 'next/font/google';
import { hasLocale, NextIntlClientProvider } from 'next-intl';
import { getMessages, setRequestLocale } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { ModalProvider } from '@/shared/providers/ModalProvider';
import ToastProvider from '@/shared/providers/ToastProvider';
import { Sidebar } from '@/widgets/sidebar/ui/sidebar';
import '../globals.css';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: 'MindHaven',
  description:
    'Mind Haven is a platform for creating and sharing your own mind maps.',
  icons: {
    icon: '/favicon.ico',
  },
  openGraph: {
    title: 'Mind Haven',
    description:
      'Mind Haven is a platform for creating and sharing your own mind maps.',
    url: 'https://mindhaven.com',
    siteName: 'Mind Haven',
    images: ['/favicon.ico'],
  },
};

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export default async function LocaleLayout({
  children,
  params,
}: Readonly<{
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}>) {
  const { locale } = await params;

  if (!hasLocale(routing.locales, locale)) {
    notFound();
  }

  setRequestLocale(locale);
  const messages = await getMessages();

  return (
    <html lang={locale} suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
(function () {
  try {
    const theme = localStorage.getItem('theme');
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const resolvedTheme = theme ?? (prefersDark ? 'dark' : 'light');

    if (resolvedTheme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }

    document.documentElement.setAttribute('data-theme', resolvedTheme);
    localStorage.setItem('theme', resolvedTheme);
  } catch (e) {}
})();
            `,
          }}
        />
      </head>
      <body className={geistSans.className}>
        <NextIntlClientProvider messages={messages}>
          <div className="min-h-screen flex">
            <Sidebar />
            <main className="flex-1 p-6 lg:p-8 overflow-auto">
              <div className="max-w-7xl mx-auto">{children}</div>
            </main>
          </div>
          <ModalProvider />
          <ToastProvider />
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
