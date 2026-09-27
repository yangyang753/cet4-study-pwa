import { useEffect } from 'react';
import { legacyPathToHash } from '../lib/appHref';

export function LegacyPathRedirect() {
  useEffect(() => {
    const target = legacyPathToHash(window.location.pathname, window.location.search, import.meta.env.BASE_URL, window.location.hash);
    if (target) window.location.replace(target);
  }, []);
  return null;
}
