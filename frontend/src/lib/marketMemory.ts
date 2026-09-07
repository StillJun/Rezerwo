/* Local-only marketplace memory: last search, recently viewed salons, favourites.
   All per-browser, never sent anywhere. Every access is guarded — private mode
   and disabled storage must not break the page. */

export interface RecentSalon { slug: string; name: string; city: string }

const LAST_SEARCH = "rz_search";
const RECENT = "rz_recent";
const FAVS = "rz_favs";
const RECENT_MAX = 8;

function read<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch { return fallback; }
}
function write(key: string, value: unknown): void {
  try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* ignore */ }
}

/* ── last search ── */
export function loadLastSearch(): { city: string; category: string } {
  const v = read<{ city?: string; category?: string }>(LAST_SEARCH, {});
  return { city: typeof v.city === "string" ? v.city : "", category: typeof v.category === "string" ? v.category : "" };
}
export function saveLastSearch(city: string, category: string): void {
  write(LAST_SEARCH, { city, category });
}

/* ── recently viewed ── */
export function loadRecent(): RecentSalon[] {
  return read<RecentSalon[]>(RECENT, []).filter(r => r && r.slug);
}
export function pushRecent(s: RecentSalon): void {
  const list = loadRecent().filter(r => r.slug !== s.slug);
  list.unshift({ slug: s.slug, name: s.name, city: s.city });
  write(RECENT, list.slice(0, RECENT_MAX));
}

/* ── favourites ── */
export function loadFavs(): string[] {
  return read<string[]>(FAVS, []).filter(x => typeof x === "string");
}
export function isFav(slug: string): boolean {
  return loadFavs().includes(slug);
}
export function toggleFav(slug: string): boolean {
  const list = loadFavs();
  const i = list.indexOf(slug);
  if (i >= 0) list.splice(i, 1); else list.unshift(slug);
  write(FAVS, list);
  return i < 0; // true if now a favourite
}
