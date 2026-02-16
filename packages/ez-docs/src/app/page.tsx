import type { Metadata } from "next";
import ezdocConfig from "@config";
import { getNavigation, getDefaultLocale } from "@/lib/docs";
import type { NavGroup } from "@/lib/docs";
import { HomeContent } from "@/components/home-content";

const siteUrl = ezdocConfig.site.url ?? "";

export const metadata: Metadata = {
  title: ezdocConfig.site.title,
  description: ezdocConfig.site.description ?? "Documentation powered by ezdoc",
  openGraph: {
    type: "website",
    title: ezdocConfig.site.title,
    description: ezdocConfig.site.description ?? "Documentation powered by ezdoc",
    url: siteUrl || undefined,
  },
};

export default function Home() {
  const title = ezdocConfig.site.title;
  const description = ezdocConfig.site.description ?? "Documentation powered by ezdoc";
  const defaultLocale = getDefaultLocale();
  const locales = ezdocConfig.i18n?.locales ?? [{ code: "zh", label: "中文" }];

  // Pre-compute navigation for every locale
  const allNavigations: Record<string, NavGroup[]> = {};
  for (const l of locales) {
    allNavigations[l.code] = getNavigation(l.code);
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
