import { getNavigation, getAllLocales, flattenNavigation } from "@/lib/docs";
import ezdocConfig from "@config";
import { DocsLayoutShell } from "@/components/layout/docs-layout-shell";

export function generateStaticParams() {
  return getAllLocales().map((locale) => ({ locale }));
}

export default async function LocaleDocsLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const navigation = getNavigation(locale);
  const siteTitle = ezdocConfig.site.title;
  const githubUrl = ezdocConfig.site.socials?.github;
  const locales = ezdocConfig.i18n?.locales ?? [{ code: "zh", label: "中文" }];

  // Build a map of locale -> { slugs, firstPage } for safe language switching
  const localeSlugs: Record<string, { slugs: string[]; firstPage: string }> = {};
  for (const l of locales) {
    const nav = l.code === locale ? navigation : getNavigation(l.code);
    const flat = flattenNavigation(nav);
    const allSlugs = flat.map((p) => p.path);
    const firstPage = allSlugs[0] ?? "";
    localeSlugs[l.code] = { slugs: allSlugs, firstPage };
  }

  return (
    <DocsLayoutShell
      siteTitle={siteTitle}
      githubUrl={githubUrl}
      navigation={navigation}
      locale={locale}
      locales={locales}
      localeSlugs={localeSlugs}
    >
      {children}
    </DocsLayoutShell>
  );
}
