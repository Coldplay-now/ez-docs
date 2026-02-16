import type { MetadataRoute } from "next";
import { getAllSlugs } from "@/lib/mdx";
import ezdocConfig from "@config";

export const dynamic = "force-static";

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = ezdocConfig.site.url ?? "https://coldplay-now.github.io/ezdoc";
  const slugs = getAllSlugs();

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
