// /api/videos.js
//
// Vercel Serverless Function — lists videos from a specific Bunny Stream
// collection and returns title + description + embed info for each. Keeps
// the Stream API key server-side only (never exposed to the browser).
//
// Required environment variables (set in Vercel dashboard → Settings → Environment Variables):
//   BUNNY_STREAM_LIBRARY_ID     e.g. "596543"
//   BUNNY_STREAM_API_KEY        the Stream Library API key, found in
//                               Bunny dashboard → Stream → your library → API
//   BUNNY_STREAM_COLLECTION_ID  the GUID of the collection your website videos
//                               live in, found in Bunny dashboard → Stream →
//                               your library → Collections → click the
//                               collection → GUID shown in the URL/details panel

export default async function handler(req, res) {
  const libraryId    = process.env.BUNNY_STREAM_LIBRARY_ID;
  const apiKey        = process.env.BUNNY_STREAM_API_KEY;
  const collectionId = process.env.BUNNY_STREAM_COLLECTION_ID;

  if (!libraryId || !apiKey || !collectionId) {
    return res.status(500).json({ error: 'Missing required environment variables.' });
  }

  // orderBy=date, desc -> newest uploads first. itemsPerPage capped generously;
  // raise if your collection grows past 100 videos.
  // collection=<guid> -> scopes results to only this collection, not the whole library.
  const listUrl = `https://video.bunnycdn.com/library/${libraryId}/videos?page=1&itemsPerPage=100&orderBy=date&collection=${collectionId}`;

  try {
    const bunnyRes = await fetch(listUrl, {
      method: 'GET',
      headers: {
        AccessKey: apiKey,
        Accept: 'application/json',
      },
    });

    if (!bunnyRes.ok) {
      const text = await bunnyRes.text();
      return res.status(bunnyRes.status).json({ error: 'Bunny Stream error', detail: text });
    }

    const data = await bunnyRes.json();
    const items = data.items || [];

    // Only include videos that finished encoding (status 4 = "Finished" in Bunny Stream)
    // so half-processed uploads don't show up broken on the site.
    const videos = items
      .filter(v => v.status === 4)
      .map(v => ({
        id: v.guid,
        title: v.title || 'Untitled',
        // Bunny Stream stores a free-text description under metaTags as
        // {property: "description", value: "..."} when set via the dashboard,
        // but also exposes a plain top-level "description" style field
        // depending on account version — check both for compatibility.
        description: extractDescription(v),
        dateUploaded: v.dateUploaded,
      }))
      // Already ordered by Bunny via orderBy=date, but sort defensively
      // in case the API ever returns a different order.
      .sort((a, b) => new Date(b.dateUploaded) - new Date(a.dateUploaded));

    res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate=600');
    return res.status(200).json({ videos, libraryId });

  } catch (err) {
    return res.status(500).json({ error: 'Failed to fetch from Bunny Stream', detail: err.message });
  }
}

function extractDescription(video) {
  // Newer Bunny accounts: a direct "description" or "longDescription" field.
  if (video.description) return video.description;
  if (video.longDescription) return video.longDescription;

  // Older / metaTags-based accounts: look for a tag named "description".
  if (Array.isArray(video.metaTags)) {
    const tag = video.metaTags.find(
      t => (t.property || '').toLowerCase() === 'description'
    );
    if (tag) return tag.value;
  }

  return '';
}
