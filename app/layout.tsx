import { ModalProvider } from "@/shared/providers/ModalProvider";
import { Sidebar } from "@/widgets/sidebar/ui/sidebar";
import type { Metadata } from "next";
import { Geist } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "MindHaven",
  description: "Mind Haven is a platform for creating and sharing your own mind maps.",
  icons: {
    icon: "/favicon.ico",
  },
  openGraph: {
    title: "Mind Haven",
    description: "Mind Haven is a platform for creating and sharing your own mind maps.",
    url: "https://mindhaven.com",
    siteName: "Mind Haven",
    images: ["/favicon.ico"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ru">
      <body className={geistSans.className}>
          <div className="min-h-screen flex">
            <Sidebar />
            <main className="flex-1 p-6 lg:p-8 overflow-auto">
              <div className="max-w-7xl mx-auto">
                {children}
              </div>
            </main>
          </div>
          <ModalProvider />
      </body>
    </html>
  );
}


