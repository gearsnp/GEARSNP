import type { Metadata } from "next";
import localFont from "next/font/local";
import { Geist_Mono } from "next/font/google";
import { Toaster } from "@/components/ui/sonner";
import { supabaseServer } from "@/lib/supabase/server";
import { Analytics } from "@vercel/analytics/next"
import "./globals.css";

const formula1 = localFont({
  src: [
    {
      path: "../public/fonts/formula1-display.ttf",
      weight: "400",
      style: "normal",
    },
    {
      path: "../public/fonts/formula1-bold.ttf",
      weight: "700",
      style: "normal",
    },
  ],
  variable: "--font-formula1",
  display: "swap",
  fallback: ['system-ui', 'sans-serif'],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export async function generateMetadata(): Promise<Metadata> {
  const supabase = await supabaseServer();
  const { data: settings } = await supabase
    .from("settings")
    .select("site_name, favicon_url, og_image_url")
    .eq("id", 1)
    .single();

  const siteUrl = process.env.NEXT_PUBLIC_APP_URL || "https://gearsnp.com";
  const ogImage = settings?.og_image_url || `${siteUrl}/og-image.jpg`;

  return {
    title: `${settings?.site_name || "GearsNP"} - Premium F1 Gear`,
    description: "Shop premium F1 merchandise and team gear",
    icons: {
      icon: settings?.favicon_url || "/favicon.ico",
    },
    openGraph: {
      title: `${settings?.site_name || "GearsNP"} - Premium F1 Gear`,
      description: "Shop premium F1 merchandise and team gear",
      url: siteUrl,
      siteName: settings?.site_name || "GearsNP",
      images: [
        {
          url: ogImage,
          width: 1200,
          height: 630,
          alt: `${settings?.site_name || "GearsNP"} - Premium F1 Gear`,
        },
      ],
      locale: "en_US",
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title: `${settings?.site_name || "GearsNP"} - Premium F1 Gear`,
      description: "Shop premium F1 merchandise and team gear",
      images: [ogImage],
    },
    metadataBase: new URL(siteUrl),
  };
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const supabase = await supabaseServer();
  const { data: settings } = await supabase
    .from("settings")
    .select("primary_color, secondary_color")
    .eq("id", 1)
    .single();

  const primaryColor = settings?.primary_color || "#dc2626";
  const secondaryColor = settings?.secondary_color || "#3b82f6";

  return (
    <html lang="en" className="dark">
      <head>
        <style>{`
          :root {
            --primary: ${primaryColor};
            --secondary: ${secondaryColor};
          }
        `}</style>
      </head>
      <body
        className={`${formula1.variable} ${geistMono.variable} font-sans antialiased`}
      >
        {children}
        <Toaster position="top-right" />
        <Analytics />
      </body>
    </html>
  );
}
