import { redirect } from "next/navigation";
import { getDefaultLocale, getNavigation, flattenNavigation } from "@/lib/docs";

/**
 * /docs → redirect to /docs/{defaultLocale}/{firstPage}
 */
export default async function DocsIndexPage() {
  const locale = await getDefaultLocale();
  const navigation = await getNavigation(locale);
  const flat = flattenNavigation(navigation);
  const firstDocPath = flat[0]?.path ?? "getting-started";

  redirect(`/docs/${locale}/${firstDocPath}`);
}
