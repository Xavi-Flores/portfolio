// /api/photos.js
//
// Vercel Serverless Function — JSON endpoint wrapping lib/photos.js. Used as a
// fallback by js/photo.js when the server-rendered page (api/photo-page.js)
// couldn't preload data.

import { getPhotos } from '../lib/photos.js';

export default async function handler(req, res) {
  try {
    const { photos } = await getPhotos();
    res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate=600');
    return res.status(200).json({ photos });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to fetch from Bunny Storage', detail: err.message });
  }
}
