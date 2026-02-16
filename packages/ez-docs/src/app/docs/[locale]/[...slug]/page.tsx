import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getDocBySlug, getAllSlugs } from "@/lib/mdx";
import { getNavigation, getAllLocales, extractToc, getPrevNext, getBreadcrumbs, getLastModified } from "@/lib/docs";
import { components } from "@/components/mdx/mdx-components";
import { TableOfContents } from "@/components/layout/toc";
import { DocPagination } from "@/components/layout/doc-pagination";
import { Breadcrumb } from "@/components/layout/breadcrumb";
import ezdocConfig from "@config";

// ---------------------------------------------------------------------------
// Static params generation for static export
// ---------------------------------------------------------------------------
export function generateStaticParams() {
  const locales = getAllLocales();
  const params: { locale: string; slug: string[] }[] = [];

  for (const locale of locales) {
    const slugs = getAllSlugs(locale);
    for (const slug of slugs) {
      params.push({ locale, slug: slug.split("/") });
    }
  }

  return params;
}

// ---------------------------------------------------------------------------
// Metadata
// ---------------------------------------------------------------------------
export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; slug: string[] }>;
}): Promise<Metadata> {
  const { locale, slug: slugParts } = await params;
  const slug = slugParts.join("/");
  const siteUrl = ezdocConfig.site.url ?? "";

  try {
    const doc = await getDocBySlug(slug, locale, {
      components: components as Record<string, React.ComponentType<unknown>>,
    });

    const title = doc.frontmatter.title ?? slug;
    const description = doc.frontmatter.description;
    const pageUrl = siteUrl ? `${siteUrl}/docs/${locale}/${slug}` : undefined;

    return {
      title,
      description,
      openGraph: {
        type: "article",
        title,
        description: description ?? undefined,
        url: pageUrl,
      },
    };
  } catch {
    return { title: "Not Found" };
  }
}

// ---------------------------------------------------------------------------
// Page component
// ---------------------------------------------------------------------------
export default async function DocPage({
  params,
}: {
  params: Promise<{ locale: string; slug: string[] }>;
}) {
  const { locale, slug: slugParts } = await params;
  const slug = slugParts.join("/");

  let doc;
  try {
    doc = await getDocBySlug(slug, locale, {
      components: components as Record<string, React.ComponentType<unknown>>,
    });
  } catch {
    notFound();
  }

  const navigation = getNavigation(locale);
  const toc = extractToc(doc.raw);
  const { prev, next } = getPrevNext(slug, navigation);
  const breadcrumbs = getBreadcrumbs(slug, navigation, locale);
  const lastModified = getLastModified(slug, locale);

  return (
    <>
      {/* Main content area */}
      <main id="main-content" data-pagefind-body className="min-w-0 flex-1 px-6 py-8 lg:px-10 lg:py-10">
        <div className="max-w-3xl">
          {/* Breadcrumb */}
          <Breadcrumb items={breadcrumbs} />

          {/* Article header */}
          {doc.frontmatter.title && (
            <div className="mb-8">
              <h1 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
                {doc.frontmatter.title}
              </h1>
              {doc.frontmatter.description && (
                <p className="mt-2 text-lg text-muted-foreground">
                  {doc.frontmatter.description}
                </p>
              )}
            </div>
          )}

          {/* MDX content */}
          <article className="prose prose-neutral dark:prose-invert max-w-none">
            {doc.content}
          </article>

          {/* Last modified */}
          {lastModified && (
            <div className="mt-8 border-t border-border pt-4 text-sm text-muted-foreground">
              最后更新于{" "}
              {new Date(lastModified).toLocaleDateString(
                locale === "zh" ? "zh-CN" : "en-US",
                { year: "numeric", month: "long", day: "numeric" },
              )}
            </div>
          )}

          {/* Prev / Next navigation */}
          <DocPagination prev={prev} next={next} locale={locale} />
        </div>
      </main>

      {/* Right TOC */}
      <TableOfContents toc={toc} />
    </>
  );
}
