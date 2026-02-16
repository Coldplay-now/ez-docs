import type { MetadataRoute } from "next";
import ezdocConfig from "@config";

export const dynamic = "force-static";

export default function robots(): MetadataRoute.Robots {
  const baseUrl = ezdocConfig.site.url ?? "https://coldplay-now.github.io/ezdoc";

  return {
    rules: {
      userAgent: "*",
      allow: "/",
    },
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
