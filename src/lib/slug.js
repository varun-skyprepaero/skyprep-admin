/** URL-safe slug from a display name (e.g. "Air Navigation" → "air-navigation"). */
export function slugifyFromName(name) {
  return String(name ?? '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}
