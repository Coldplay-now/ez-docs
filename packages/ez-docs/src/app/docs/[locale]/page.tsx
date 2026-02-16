import { redirect } from "next/navigation";
import { getNavigation, getAllLocales, flattenNavigation } from "@/lib/docs";

export function generateStaticParams() {
  return getAllLocales().map((locale) => ({ locale }));
}

/**
 * /docs/{locale} → redirect to /docs/{locale}/{firstPage}
 */
export default async function LocaleDocsIndexPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const navigation = getNavigation(locale);
  const flat = flattenNavigation(navigation);
  const firstDocPath = flat[0]?.path ?? "getting-started";

  redirect(`/docs/${locale}/${firstDocPath}`);
}
