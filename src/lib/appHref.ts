function normalizedBase(base: string) {
  const withLeadingSlash = base.startsWith('/') ? base : `/${base}`;
  return withLeadingSlash.endsWith('/') ? withLeadingSlash : `${withLeadingSlash}/`;
}

function normalizedRoute(path: string) {
  const route = path.trim().replace(/^#?\/?/, '').replace(/^\/+/, '');
  return route || 'today';
}

export function appHref(path: string, search = '', base = import.meta.env.BASE_URL) {
  const query = search && !search.startsWith('?') ? `?${search}` : search;
  return `${normalizedBase(base)}#/${normalizedRoute(path)}${query}`;
}

export function legacyPathToHash(pathname: string, search: string, base: string, hash = ''): string | null {
  if (hash.startsWith('#/')) return null;
  const normalized = normalizedBase(base);
  if (!pathname.startsWith(normalized)) return null;
  const route = pathname.slice(normalized.length).replace(/^\/+|\/+$/g, '');
  if (!route) return null;
  return appHref(route, search, normalized);
}
