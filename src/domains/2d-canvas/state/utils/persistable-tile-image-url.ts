export enum TileImageUrlQuery {
  CacheBust = 't',
}

/** Review queue appends `?t=` for display; persist the blob URL without that bust. */
export function persistableTileImageUrl(url: string): string {
  const queryStart = url.indexOf('?')
  if (queryStart === -1) return url
  const base = url.slice(0, queryStart)
  const params = new URLSearchParams(url.slice(queryStart + 1))
  params.delete(TileImageUrlQuery.CacheBust)
  const next = params.toString()
  return next.length > 0 ? `${base}?${next}` : base
}
