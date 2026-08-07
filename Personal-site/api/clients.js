// /api/clients.js
//
// Vercel Serverless Function — JSON endpoint wrapping lib/clients.js. Used as a
// fallback by js/clients.js when the server-rendered page (api/client-page.js)
// couldn't preload data.

import { getClientPhotos } from '../lib/clients.js';

export default async function handler(req, res) {
  try {
    const { photos } = await getClientPhotos();
    res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate=600');
    return res.status(200).json({ photos });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to fetch client photos', detail: err.message });
  }
}
