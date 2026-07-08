// /api/videos.js
//
// Vercel Serverless Function — JSON endpoint wrapping lib/videos.js. Used as a
// fallback by js/video.js when the server-rendered page (api/video-page.js)
// couldn't preload data.

import { getVideos } from '../lib/videos.js';

export default async function handler(req, res) {
  try {
    const { videos, libraryId } = await getVideos();
    res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate=600');
    return res.status(200).json({ videos, libraryId });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to load videos', detail: err.message });
  }
}
