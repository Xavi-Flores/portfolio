// /api/videos.js
//
// Vercel Serverless Function — fetches videos.json from Bunny Storage for
// ordering/preview info, then enriches each entry with title and description
// pulled live from the Bunny Stream API.
//
// Required environment variables:
//   BUNNY_VIDEO_PULL_ZONE_URL   e.g. "https://xf-video-pull.b-cdn.net"
//   BUNNY_STREAM_LIBRARY_ID     e.g. "596543"
//   BUNNY_STREAM_API_KEY        Stream library API key

export default async function handler(req, res) {
  const videoPullZone = process.env.BUNNY_VIDEO_PULL_ZONE_URL;
  const libraryId     = process.env.BUNNY_STREAM_LIBRARY_ID;
  const apiKey        = process.env.BUNNY_STREAM_API_KEY;

  if (!videoPullZone || !libraryId || !apiKey) {
    return res.status(500).json({ error: 'Missing required environment variables.' });
  }

  try {
    // Fetch videos.json and Stream metadata in parallel
    const [metaRes, streamRes] = await Promise.all([
      fetch(`${videoPullZone}/videos.json?v=${Date.now()}`, { cache: 'no-store' }),
      fetch(`https://video.bunnycdn.com/library/${libraryId}/videos?page=1&itemsPerPage=100&orderBy=date`, {
        method: 'GET',
        headers: { AccessKey: apiKey, Accept: 'application/json' }
      })
    ]);

    if (!metaRes.ok) {
      return res.status(metaRes.status).json({ error: 'Could not fetch videos.json' });
    }

    const entries     = await metaRes.json();
    const streamData  = streamRes.ok ? await streamRes.json() : { items: [] };

    // Build a lookup of Stream video metadata by GUID
    const streamById = new Map();
    (streamData.items || []).forEach(v => {
      streamById.set(v.guid, {
        description: extractDescription(v),
      });
    });

    const videos = entries
      .map(v => {
        const stream = streamById.get(v.videoId) || {};
        return {
          title:       v.title || '',
          description: stream.description || '',
          videoId:     v.videoId || '',
          previewUrl:  `${videoPullZone}/shorts/${encodeURIComponent(v.preview)}`,
          previewExt:  v.preview.split('.').pop().toLowerCase(),
          order:       v.order != null ? v.order : 9999,
        };
      })
      .sort((a, b) => b.order - a.order);

    res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate=600');
    return res.status(200).json({ videos, libraryId });

  } catch (err) {
    return res.status(500).json({ error: 'Failed to load videos', detail: err.message });
  }
}

function extractDescription(video) {
  if (video.description) return video.description;
  if (video.longDescription) return video.longDescription;
  if (Array.isArray(video.metaTags)) {
    const tag = video.metaTags.find(t => (t.property || '').toLowerCase() === 'description');
    if (tag) return tag.value;
  }
  return '';
}
