import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "katex/dist/katex.min.css";
import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";
import ezdocConfig from "@config";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const siteUrl = ezdocConfig.site.url ?? "";

export const metadata: Metadata = {
  title: {
    default: ezdocConfig.site.title,
    template: `%s | ${ezdocConfig.site.title}`,
  },
  description: ezdocConfig.site.description ?? "Documentation powered by ezdoc",
  metadataBase: siteUrl ? new URL(siteUrl) : undefined,
  openGraph: {
    type: "website",
    siteName: ezdocConfig.site.title,
    locale: ezdocConfig.i18n?.defaultLocale === "zh" ? "zh_CN" : "en_US",
    title: ezdocConfig.site.title,
    description: ezdocConfig.site.description ?? "Documentation powered by ezdoc",
    url: siteUrl || undefined,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const defaultTheme = ezdocConfig.theme?.defaultMode ?? "system";
  const locale = ezdocConfig.i18n?.defaultLocale ?? "zh";
  const basePath =
    process.env.EZDOC_BASE_PATH ?? ezdocConfig.deploy?.basePath ?? "";

  return (
    <html lang={locale} suppressHydrationWarning>
      <head>
        {basePath && <meta name="pagefind-base" content={basePath} />}
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
