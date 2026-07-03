// /api/photos.js
//
// Vercel Serverless Function — lists photos from Bunny Storage, merges with
// metadata from photos.json (also stored in Bunny), and returns enriched
// photo objects with category, title, and description.
//
// Required environment variables:
//   BUNNY_STORAGE_ZONE      e.g. "xf-photos"
//   BUNNY_STORAGE_REGION    e.g. "ny"
//   BUNNY_STORAGE_PASSWORD  Storage Zone password / AccessKey
//   BUNNY_PULL_ZONE_URL     e.g. "https://xf-photos-pull.b-cdn.net"

export default async function handler(req, res) {
  const zone     = process.env.BUNNY_STORAGE_ZONE;
  const region   = process.env.BUNNY_STORAGE_REGION || 'storage';
  const password = process.env.BUNNY_STORAGE_PASSWORD;
  const pullZone = process.env.BUNNY_PULL_ZONE_URL;

  if (!zone || !password || !pullZone) {
    return res.status(500).json({ error: 'Missing required environment variables.' });
  }

  const host    = region === 'storage' ? 'storage.bunnycdn.com' : `${region}.storage.bunnycdn.com`;
  const listUrl = `https://${host}/${zone}/`;
  const headers = { AccessKey: password, Accept: 'application/json' };

  try {
    // Fetch file list and metadata in parallel
    const [bunnyRes, metaRes] = await Promise.all([
      fetch(listUrl, { method: 'GET', headers }),
      fetch(`${pullZone}/photos.json`, { cache: 'no-store' })
        .then(r => r.ok ? r.json() : [])
        .catch(() => [])
    ]);

    if (!bunnyRes.ok) {
      const text = await bunnyRes.text();
      return res.status(bunnyRes.status).json({ error: 'Bunny Storage error', detail: text });
    }

    const files = await bunnyRes.json();

    // Build a lookup map from filename -> metadata
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

    res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate=600');
    return res.status(200).json({ photos });

  } catch (err) {
    return res.status(500).json({ error: 'Failed to fetch from Bunny Storage', detail: err.message });
  }
}
