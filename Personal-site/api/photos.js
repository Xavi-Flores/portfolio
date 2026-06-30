// /api/photos.js
//
// Vercel Serverless Function — lists files from Bunny Storage and returns
// public CDN URLs for each. Keeps the Storage API password server-side only.
//
// Required environment variables (set in Vercel dashboard → Settings → Environment Variables):
//   BUNNY_STORAGE_ZONE      e.g. "xf-photos"
//   BUNNY_STORAGE_REGION    e.g. "ny" (matches your storage endpoint, e.g. ny.storage.bunnycdn.com)
//   BUNNY_STORAGE_PASSWORD  the Storage Zone "Password" / AccessKey, found in
//                           Bunny dashboard → Storage → xf-photos → FTP & API Access
//   BUNNY_PULL_ZONE_URL     e.g. "https://xf-photos-pull.b-cdn.net"

export default async function handler(req, res) {
  const zone     = process.env.BUNNY_STORAGE_ZONE;
  const region   = process.env.BUNNY_STORAGE_REGION || 'storage'; // 'storage' = default/global endpoint
  const password = process.env.BUNNY_STORAGE_PASSWORD;
  const pullZone = process.env.BUNNY_PULL_ZONE_URL;

  if (!zone || !password || !pullZone) {
    return res.status(500).json({ error: 'Missing required environment variables.' });
  }

  // region "storage" -> storage.bunnycdn.com ; otherwise {region}.storage.bunnycdn.com
  const host = region === 'storage'
    ? 'storage.bunnycdn.com'
    : `${region}.storage.bunnycdn.com`;

  const listUrl = `https://${host}/${zone}/`;

  try {
    const bunnyRes = await fetch(listUrl, {
      method: 'GET',
      headers: {
        AccessKey: password,
        Accept: 'application/json',
      },
    });

    if (!bunnyRes.ok) {
      const text = await bunnyRes.text();
      return res.status(bunnyRes.status).json({ error: 'Bunny Storage error', detail: text });
    }

    const files = await bunnyRes.json();

    // Only keep actual image files, ignore directories and non-image types
    const imageExtensions = ['.webp', '.jpg', '.jpeg', '.png', '.gif', '.avif'];

    const photos = files
      .filter(f => !f.IsDirectory)
      .filter(f => imageExtensions.some(ext => f.ObjectName.toLowerCase().endsWith(ext)))
      .map(f => ({
        name: f.ObjectName,
        url: `${pullZone}/${f.ObjectName}`,
        lastChanged: f.LastChanged,
      }))
      // Newest uploads first — flip to .reverse() if you'd rather have oldest first
      .sort((a, b) => new Date(b.lastChanged) - new Date(a.lastChanged));

    // Cache at the edge for 5 minutes so repeat visits are fast,
    // but new uploads still show up quickly.
    res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate=600');
    return res.status(200).json({ photos });

  } catch (err) {
    return res.status(500).json({ error: 'Failed to fetch from Bunny Storage', detail: err.message });
  }
}
