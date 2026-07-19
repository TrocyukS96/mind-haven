import { AccessProvider } from '@/features/access';
import { AuthSessionProvider } from '@/features/auth';
import { DisplayModeProvider } from '@/features/display-modes';
import { ItemTypeProvider } from '@/features/item-types';
import { routing } from '@/i18n/routing';
import type { Metadata } from 'next';
import { Geist } from 'next/font/google';
import { hasLocale, NextIntlClientProvider } from 'next-intl';
import { getMessages, setRequestLocale } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { ModalProvider } from '@/shared/providers/ModalProvider';
import ToastProvider from '@/shared/providers/ToastProvider';
import { getSessionProfile } from '@/shared/lib/auth/get-session-profile';
import { getFeatureFlags } from '@/shared/lib/features/feature-service';
import { getDisplayModeSettings } from '@/shared/lib/display-modes/display-mode-service';
import { getItemTypes } from '@/shared/lib/item-types/item-type-service';
import { LayoutShell } from '@/widgets/layout-shell';
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
  const [profile, globalFeatureFlags, displayModeSettings, itemTypes] = await Promise.all([
    getSessionProfile(),
    getFeatureFlags(),
    getDisplayModeSettings(),
    getItemTypes(),
  ]);

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
          <AuthSessionProvider>
            <AccessProvider profile={profile} globalFeatureFlags={globalFeatureFlags}>
              <DisplayModeProvider settings={displayModeSettings}>
                <ItemTypeProvider catalog={itemTypes}>
                  <LayoutShell>{children}</LayoutShell>
                  <ModalProvider />
                  <ToastProvider />
                </ItemTypeProvider>
              </DisplayModeProvider>
            </AccessProvider>
          </AuthSessionProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
