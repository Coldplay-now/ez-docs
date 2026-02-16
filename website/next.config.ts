import type { NextConfig } from "next";
import path from "path";
import ezdocConfig from "./ezdoc.config";
import { buildResolveAlias } from "./src/lib/component-registry";

const basePath = process.env.EZDOC_BASE_PATH ?? ezdocConfig.deploy.basePath;

// 构建组件覆盖的 Turbopack alias
const overridesDir = path.join(process.cwd(), ezdocConfig.overrides?.dir ?? "overrides");
const resolveAlias = buildResolveAlias(overridesDir);

const hasOverrides = Object.keys(resolveAlias).length > 0;
if (hasOverrides) {
  console.log(`[ezdoc] 检测到组件覆盖: ${Object.keys(resolveAlias).join(", ")}`);
}

const nextConfig: NextConfig = {
  output: "export",
  basePath: basePath || undefined,
  trailingSlash: true,
  images: {
    unoptimized: true,
  },
  env: {
    NEXT_PUBLIC_BASE_PATH: basePath || "",
  },
  ...(hasOverrides && {
    turbopack: {
      resolveAlias,
    },
  }),
};

export default nextConfig;
