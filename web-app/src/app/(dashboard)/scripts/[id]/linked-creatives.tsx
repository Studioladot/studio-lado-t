import Link from 'next/link'
import { CREATIVE_STATUS_LABEL, CREATIVE_STATUS_BADGE_CLASS, type LibraryCreative } from '@/lib/meta/library'

export function LinkedCreatives({ creatives }: { creatives: LibraryCreative[] }) {
  if (creatives.length === 0) return null

  return (
    <div className="mt-4 rounded-card border border-border bg-surface p-5">
      <p className="mb-3 text-[10px] font-bold uppercase tracking-wide text-text-3">Creativos vinculados</p>
      <ul className="flex flex-col gap-2">
        {creatives.map((c) => (
          <li key={c.id} className="flex items-center gap-3 rounded-control border border-border bg-surface-2/60 px-3 py-2">
            <div className="h-10 w-10 shrink-0 overflow-hidden rounded-control bg-surface-2">
              {c.assetType === 'video' ? (
                <video src={c.fileUrl} className="h-full w-full object-cover" muted />
              ) : (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={c.fileUrl} alt="" className="h-full w-full object-cover" />
              )}
            </div>
            <p className="min-w-0 flex-1 truncate text-xs font-medium text-text" title={c.name}>
              {c.name}
            </p>
            <span className={`shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-medium ${CREATIVE_STATUS_BADGE_CLASS[c.status]}`}>
              {CREATIVE_STATUS_LABEL[c.status]}
            </span>
            <Link
              href="/meta-ads/library"
              className="shrink-0 text-[11px] font-medium text-accent transition-colors duration-200 ease-out hover:text-accent/80"
            >
              Ver en Biblioteca
            </Link>
          </li>
        ))}
      </ul>
    </div>
  )
}
