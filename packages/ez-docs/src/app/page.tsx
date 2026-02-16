import type { Metadata } from "next";
import { loadConfig } from "@/lib/config-loader";
import { getNavigation } from "@/lib/docs";
import type { NavGroup } from "@/lib/docs";
import { HomeContent } from "@/components/home-content";

export async function generateMetadata(): Promise<Metadata> {
  const config = await loadConfig();
  const siteUrl = config.site.url ?? "";

  return {
    title: config.site.title,
    description: config.site.description ?? "Documentation powered by ezdoc",
    openGraph: {
      type: "website",
      title: config.site.title,
      description: config.site.description ?? "Documentation powered by ezdoc",
      url: siteUrl || undefined,
    },
  };
}

export default async function Home() {
  const config = await loadConfig();
  const title = config.site.title;
  const description = config.site.description ?? "Documentation powered by ezdoc";
  const defaultLocale = config.i18n.defaultLocale;
  const locales = config.i18n.locales;

  // Pre-compute navigation for every locale
  const allNavigations: Record<string, NavGroup[]> = {};
  for (const l of locales) {
    allNavigations[l.code] = await getNavigation(l.code);
  }

  return (
    <HomeContent
      title={title}
      description={description}
      defaultLocale={defaultLocale}
      locales={locales}
      allNavigations={allNavigations}
    />
  );
}
