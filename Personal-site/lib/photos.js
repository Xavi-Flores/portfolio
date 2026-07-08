// lib/photos.js
//
// Shared helper for listing + normalizing photo data from Bunny Storage.
// Used by both /api/photos (JSON endpoint) and /api/photo-page (server-rendered page).
//
// Required environment variables:
//   BUNNY_STORAGE_ZONE      e.g. "xf-photos"
//   BUNNY_STORAGE_REGION    e.g. "ny"
//   BUNNY_STORAGE_PASSWORD  Storage Zone password / AccessKey
//   BUNNY_PULL_ZONE_URL     e.g. "https://xf-photos-pull.b-cdn.net"

export async function getPhotos() {
  const zone     = process.env.BUNNY_STORAGE_ZONE;
  const region   = process.env.BUNNY_STORAGE_REGION || 'storage';
  const password = process.env.BUNNY_STORAGE_PASSWORD;
  const pullZone = process.env.BUNNY_PULL_ZONE_URL;

  if (!zone || !password || !pullZone) {
    throw new Error('Missing required environment variables.');
  }

  const host    = region === 'storage' ? 'storage.bunnycdn.com' : `${region}.storage.bunnycdn.com`;
  const listUrl = `https://${host}/${zone}/`;
  const headers = { AccessKey: password, Accept: 'application/json' };

  const [bunnyRes, metaRes] = await Promise.all([
    fetch(listUrl, { method: 'GET', headers }),
    fetch(`${pullZone}/photos.json`, { cache: 'no-store' })
      .then(r => r.ok ? r.json() : [])
      .catch(() => [])
  ]);

  if (!bunnyRes.ok) {
    const text = await bunnyRes.text();
    throw new Error(`Bunny Storage error: ${text}`);
  }

  const files = await bunnyRes.json();

  const metaMap = new Map();
  (metaRes || []).forEach(entry => {
    if (entry.filename) metaMap.set(entry.filename, entry);
  });

  const imageExtensions = ['.webp', '.jpg', '.jpeg', '.png', '.gif', '.avif'];

  const photos = files
    .filter(f => !f.IsDirectory)
    .filter(f => f.ObjectName !== 'photos.json')
    .filter(f => imageExtensions.some(ext => f.ObjectName.toLowerCase().endsWith(ext)))
    .map(f => {
      const meta = metaMap.get(f.ObjectName) || {};
      return {
        filename:    f.ObjectName,
        url:         `${pullZone}/${f.ObjectName}`,
        title:       meta.title || '',
        description: meta.description || '',
        category:    meta.category || '',
        order:       meta.order != null ? meta.order : 9999,
        lastChanged: f.LastChanged,
      };
    })
    .sort((a, b) => {
      // Higher order number = appears first (newest additions at top)
      if (a.order !== 9999 || b.order !== 9999) return b.order - a.order;
      // Fall back to newest upload first for photos without an order
      return new Date(b.lastChanged) - new Date(a.lastChanged);
    });

  return { photos };
}
