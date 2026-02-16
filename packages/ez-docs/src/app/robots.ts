import type { MetadataRoute } from "next";
import { loadConfig } from "@/lib/config-loader";

export const dynamic = "force-static";

export default async function robots(): Promise<MetadataRoute.Robots> {
  const config = await loadConfig();
  const baseUrl = config.site.url ?? "https://coldplay-now.github.io/ezdoc";

  return {
    rules: {
      userAgent: "*",
      allow: "/",
    },
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
