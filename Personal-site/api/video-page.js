// /api/video-page.js
//
// Serverless function that server-renders pages/video.html so crawlers see real
// video titles/descriptions/thumbnails instead of an empty JS-only shell. Routed
// to /pages/video.html via vercel.json rewrites. js/video.js reads
// window.__PRELOADED_VIDEOS__ to skip its own fetch when this data is present,
// and falls back to /api/videos if it's missing (e.g. this render failed).

import { getVideos } from '../lib/videos.js';
import { renderPage, escapeHtml } from '../lib/layout.js';

function renderVideoItem(v) {
  return `
        <div class="video-item"
             data-video-id="${escapeHtml(v.videoId)}"
             data-title="${escapeHtml(v.title)}"
             data-description="${escapeHtml(v.description)}">
          <video class="video-preview" autoplay muted loop playsinline>
            <source src="${v.previewUrl}" type="video/${v.previewExt === 'mov' ? 'mp4' : v.previewExt}" />
          </video>
          <div class="video-item-overlay"></div>
        </div>`;
}

export default async function handler(req, res) {
  let preloaded = null;
  let videos = [];

  try {
    const data = await getVideos();
    videos = data.videos;
    preloaded = data;
  } catch (err) {
    // Fall through with an empty list; client JS will retry via /api/videos.
    preloaded = null;
  }

  const bodyHtml = `
  <main class="page-wrap">
    <div class="video-list" id="video-list">${videos.map(renderVideoItem).join('')}
    </div>
    <p class="placeholder-label" id="video-status" style="text-align:center; padding: 40px 0; display:${videos.length ? 'none' : 'block'};">${preloaded ? 'No videos yet.' : 'Loading videos…'}</p>
  </main>

  <!-- Video Lightbox -->
  <div class="video-lightbox" id="video-lightbox" role="dialog" aria-modal="true" aria-label="Video viewer">
    <button class="video-lightbox-close" id="vlb-close" aria-label="Close">&times;</button>
    <div class="video-lightbox-inner">
      <iframe id="vlb-iframe" src="" allow="accelerometer; gyroscope; autoplay; encrypted-media; picture-in-picture;" allowfullscreen></iframe>
      <div class="vlb-meta">
        <div class="vlb-text">
          <p class="video-lightbox-title" id="vlb-title"></p>
          <p class="video-lightbox-description" id="vlb-description"></p>
        </div>
      </div>
    </div>
  </div>`;

  const bootstrapScript = `<script>window.__PRELOADED_VIDEOS__ = ${preloaded ? JSON.stringify(preloaded) : 'null'};</script>
  <script src="../js/video.js"></script>`;

  const html = renderPage({
    title: 'Video — Xavi Flores',
    description: 'Watch films and video work by Xavi Flores — Brooklyn-based filmmaker & photographer.',
    canonical: 'https://www.xaviflores.com/pages/video.html',
    activePage: 'video',
    bodyHtml,
    bootstrapScript,
  });

  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate=600');
  return res.status(200).send(html);
}
