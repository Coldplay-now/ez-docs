import type { MetadataRoute } from "next";
import { getAllSlugs } from "@/lib/mdx";
import { loadConfig } from "@/lib/config-loader";

export const dynamic = "force-static";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const config = await loadConfig();
  const baseUrl = config.site.url ?? "https://coldplay-now.github.io/ezdoc";
  const slugs = await getAllSlugs();

  return [
    {
      url: baseUrl,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 1.0,
    },
    ...slugs.map((slug) => ({
      url: `${baseUrl}/docs/${slug}`,
      lastModified: new Date(),
      changeFrequency: "weekly" as const,
      priority: 0.8,
    })),
  ];
}
