import Link from "next/link";
import { getDefaultLocale } from "@/lib/docs";

export default function NotFound() {
  const defaultLocale = getDefaultLocale();
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center px-4 text-center">
      <h1 className="text-6xl font-bold text-foreground">404</h1>
      <p className="mt-4 text-lg text-muted-foreground">
        页面未找到
      </p>
      <div className="mt-8 flex gap-4">
        <Link
          href="/"
          className="rounded-lg bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
        >
          返回首页
        </Link>
        <Link
          href={`/docs/${defaultLocale}/getting-started`}
          className="rounded-lg border border-border px-5 py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-muted"
        >
          查看文档
        </Link>
      </div>
    </div>
  );
}
