// lib/videos.js
//
// Shared helper for fetching + normalizing video data from Bunny Storage/Stream.
// Used by both /api/videos (JSON endpoint) and /api/video-page (server-rendered page).
//
// Required environment variables:
//   BUNNY_VIDEO_PULL_ZONE_URL   e.g. "https://xf-video-pull.b-cdn.net"
//   BUNNY_STREAM_LIBRARY_ID     e.g. "596543"
//   BUNNY_STREAM_API_KEY        Stream library API key

export async function getVideos() {
  const videoPullZone = process.env.BUNNY_VIDEO_PULL_ZONE_URL;
  const libraryId     = process.env.BUNNY_STREAM_LIBRARY_ID;
  const apiKey        = process.env.BUNNY_STREAM_API_KEY;

  if (!videoPullZone || !libraryId || !apiKey) {
    throw new Error('Missing required environment variables.');
  }

  const [metaRes, streamRes] = await Promise.all([
    fetch(`${videoPullZone}/videos.json?v=${Date.now()}`, { cache: 'no-store' }),
    fetch(`https://video.bunnycdn.com/library/${libraryId}/videos?page=1&itemsPerPage=100&orderBy=date`, {
      method: 'GET',
      headers: { AccessKey: apiKey, Accept: 'application/json' }
    })
  ]);

  if (!metaRes.ok) {
    throw new Error('Could not fetch videos.json');
  }

  const entries    = await metaRes.json();
  const streamData = streamRes.ok ? await streamRes.json() : { items: [] };

  const streamById = new Map();
  (streamData.items || []).forEach(v => {
    streamById.set(v.guid, { description: extractDescription(v) });
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

  return { videos, libraryId };
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
