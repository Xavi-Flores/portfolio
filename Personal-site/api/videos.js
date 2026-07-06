// /api/videos.js
//
// Vercel Serverless Function — fetches videos.json from Bunny Storage which
// maps preview clips to full Stream video IDs, titles, and descriptions.
//
// Required environment variables:
//   BUNNY_VIDEO_PULL_ZONE_URL       e.g. "https://xf-video-pull.b-cdn.net"
//   BUNNY_STREAM_LIBRARY_ID         e.g. "596543"

export default async function handler(req, res) {
  const videoPullZone = process.env.BUNNY_VIDEO_PULL_ZONE_URL;
  const libraryId     = process.env.BUNNY_STREAM_LIBRARY_ID;

  if (!videoPullZone || !libraryId) {
    return res.status(500).json({ error: 'Missing required environment variables.' });
  }

  try {
    const metaRes = await fetch(`${videoPullZone}/videos.json?v=${Date.now()}`, {
      cache: 'no-store'
    });

    if (!metaRes.ok) {
      return res.status(metaRes.status).json({ error: 'Could not fetch videos.json' });
    }

    const entries = await metaRes.json();

    const videos = entries
      .map(v => ({
        title:       v.title || '',
        description: v.description || '',
        videoId:     v.videoId || '',
        previewUrl:  `${videoPullZone}/shorts/${encodeURIComponent(v.preview)}`,
        previewExt:  v.preview.split('.').pop().toLowerCase(),
        order:       v.order != null ? v.order : 9999,
      }))
      .sort((a, b) => b.order - a.order);

    res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate=600');
    return res.status(200).json({ videos, libraryId });

  } catch (err) {
    return res.status(500).json({ error: 'Failed to load videos', detail: err.message });
  }
}
