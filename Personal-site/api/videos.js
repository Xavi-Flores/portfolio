// /api/videos.js
//
// Vercel Serverless Function — lists videos from two Bunny Stream collections
// (a WebM "fast" collection and an MP4 "quality" collection) and matches them
// up by title so the front-end can toggle between formats. Keeps the Stream
// API key server-side only (never exposed to the browser).
//
// Required environment variables (set in Vercel dashboard → Settings → Environment Variables):
//   BUNNY_STREAM_LIBRARY_ID         e.g. "596543"
//   BUNNY_STREAM_API_KEY            the Stream Library API key, found in
//                                   Bunny dashboard → Stream → your library → API
//   BUNNY_STREAM_COLLECTION_ID      GUID of the WebM (default/fast) collection
//   BUNNY_STREAM_COLLECTION_ID_MP4  GUID of the MP4 (quality) collection
//
// Matching: a video in the WebM collection is paired with its MP4 counterpart
// by exact title match (case-insensitive, trimmed). If no match is found,
// the MP4 toggle simply falls back to the WebM version for that video.

export default async function handler(req, res) {
  const libraryId        = process.env.BUNNY_STREAM_LIBRARY_ID;
  const apiKey            = process.env.BUNNY_STREAM_API_KEY;
  const webmCollectionId = process.env.BUNNY_STREAM_COLLECTION_ID;
  const mp4CollectionId  = process.env.BUNNY_STREAM_COLLECTION_ID_MP4;

  if (!libraryId || !apiKey || !webmCollectionId) {
    return res.status(500).json({ error: 'Missing required environment variables.' });
  }

  try {
    // Always fetch the WebM (default) collection.
    const webmVideos = await fetchCollection(libraryId, apiKey, webmCollectionId);

    // Only fetch the MP4 collection if it's configured — keeps the feature
    // optional/backwards-compatible if that env var hasn't been added yet.
    const mp4Videos = mp4CollectionId
      ? await fetchCollection(libraryId, apiKey, mp4CollectionId)
      : [];

    // Build a lookup of MP4 videos by normalized title for fast matching.
    const mp4ByTitle = new Map();
    mp4Videos.forEach(v => {
      mp4ByTitle.set(normalizeTitle(v.title), v);
    });

    const videos = webmVideos
      .map(v => {
        const match = mp4ByTitle.get(normalizeTitle(v.title));
        return {
          id: v.id,           // WebM video ID (default playback)
          mp4Id: match ? match.id : null, // MP4 counterpart, if found
          title: v.title,
          description: v.description,
          dateUploaded: v.dateUploaded,
        };
      })
      .sort((a, b) => new Date(b.dateUploaded) - new Date(a.dateUploaded));

    res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate=600');
    return res.status(200).json({ videos, libraryId });

  } catch (err) {
    return res.status(500).json({ error: 'Failed to fetch from Bunny Stream', detail: err.message });
  }
}

async function fetchCollection(libraryId, apiKey, collectionId) {
  const listUrl = `https://video.bunnycdn.com/library/${libraryId}/videos?page=1&itemsPerPage=100&orderBy=date&collection=${collectionId}`;

  const bunnyRes = await fetch(listUrl, {
    method: 'GET',
    headers: {
      AccessKey: apiKey,
      Accept: 'application/json',
    },
  });

  if (!bunnyRes.ok) {
    const text = await bunnyRes.text();
    throw new Error(`Bunny Stream error (${bunnyRes.status}): ${text}`);
  }

  const data = await bunnyRes.json();
  const items = data.items || [];

  // Only include videos that finished encoding (status 4 = "Finished").
  return items
    .filter(v => v.status === 4)
    .map(v => ({
      id: v.guid,
      title: v.title || 'Untitled',
      description: extractDescription(v),
      dateUploaded: v.dateUploaded,
    }));
}

function normalizeTitle(title) {
  return (title || '').trim().toLowerCase();
}

function extractDescription(video) {
  if (video.description) return video.description;
  if (video.longDescription) return video.longDescription;

  if (Array.isArray(video.metaTags)) {
    const tag = video.metaTags.find(
      t => (t.property || '').toLowerCase() === 'description'
    );
    if (tag) return tag.value;
  }

  return '';
}
