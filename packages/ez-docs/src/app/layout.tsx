import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "katex/dist/katex.min.css";
import "@/styles/globals.css";
import { ThemeProvider } from "@/components/theme-provider";
import { loadConfig } from "@/lib/config-loader";
import { generateThemeCSS } from "@/lib/theme";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export async function generateMetadata(): Promise<Metadata> {
  const config = await loadConfig();
  const siteUrl = config.site.url ?? "";

  return {
    title: {
      default: config.site.title,
      template: `%s | ${config.site.title}`,
    },
    description: config.site.description ?? "Documentation powered by ezdoc",
    metadataBase: siteUrl ? new URL(siteUrl) : undefined,
    openGraph: {
      type: "website",
      siteName: config.site.title,
      locale: config.i18n.defaultLocale === "zh" ? "zh_CN" : "en_US",
      title: config.site.title,
      description: config.site.description ?? "Documentation powered by ezdoc",
      url: siteUrl || undefined,
    },
  };
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const config = await loadConfig();
  const defaultTheme = config.theme.defaultMode;
  const locale = config.i18n.defaultLocale;
  const basePath =
    process.env.EZDOC_BASE_PATH ?? config.deploy.basePath;
  const themeCSS = generateThemeCSS(config);

  return (
    <html lang={locale} suppressHydrationWarning>
      <head>
        {basePath && <meta name="pagefind-base" content={basePath} />}
        {themeCSS && <style dangerouslySetInnerHTML={{ __html: themeCSS }} />}
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <ThemeProvider defaultTheme={defaultTheme}>
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
