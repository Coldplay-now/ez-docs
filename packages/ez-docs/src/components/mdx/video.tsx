import { cn } from "@/lib/utils";

/* ------------------------------------------------------------------ */
/*  URL parsers                                                        */
/* ------------------------------------------------------------------ */

function getYouTubeId(src: string): string | null {
  const m =
    src.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([\w-]+)/) ??
    null;
  return m ? m[1] : null;
}

function getBilibiliId(src: string): string | null {
  const m = src.match(/bilibili\.com\/video\/(BV[\w]+)/) ?? null;
  return m ? m[1] : null;
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

interface VideoProps {
  src: string;
  title?: string;
}

export function Video({ src, title }: VideoProps) {
  const youtubeId = getYouTubeId(src);
  const bilibiliId = getBilibiliId(src);

  const wrapperClasses = cn(
    "my-6 overflow-hidden rounded-lg border border-border"
  );

  // YouTube embed
  if (youtubeId) {
    return (
      <div className={wrapperClasses}>
        <div className="relative w-full" style={{ paddingBottom: "56.25%" }}>
          <iframe
            className="absolute inset-0 size-full"
            src={`https://www.youtube.com/embed/${youtubeId}`}
            title={title ?? "YouTube video"}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        </div>
        {title && (
          <div className="border-t border-border bg-muted/40 px-4 py-2 text-xs text-muted-foreground">
            {title}
          </div>
        )}
      </div>
    );
  }

  // Bilibili embed
  if (bilibiliId) {
    return (
      <div className={wrapperClasses}>
        <div className="relative w-full" style={{ paddingBottom: "56.25%" }}>
          <iframe
            className="absolute inset-0 size-full"
            src={`https://player.bilibili.com/player.html?bvid=${bilibiliId}&autoplay=0`}
            title={title ?? "Bilibili video"}
            allowFullScreen
            sandbox="allow-same-origin allow-scripts allow-popups"
          />
        </div>
        {title && (
          <div className="border-t border-border bg-muted/40 px-4 py-2 text-xs text-muted-foreground">
            {title}
          </div>
        )}
      </div>
    );
  }

  // Local / direct video
  return (
    <div className={wrapperClasses}>
      <video
        className="w-full"
        src={src}
        controls
        preload="metadata"
        title={title}
      >
        <track kind="captions" />
      </video>
      {title && (
        <div className="border-t border-border bg-muted/40 px-4 py-2 text-xs text-muted-foreground">
          {title}
        </div>
      )}
    </div>
  );
}
