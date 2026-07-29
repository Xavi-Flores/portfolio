// /api/photo-page.js
//
// Serverless function that server-renders pages/photo.html so crawlers see real
// photo titles/descriptions/alt text instead of an empty JS-only shell. Routed
// to /pages/photo.html via vercel.json rewrites. js/photo.js reads
// window.__PRELOADED_PHOTOS__ to skip its own fetch when this data is present,
// and falls back to /api/photos if it's missing (e.g. this render failed).

import { getPhotos } from '../lib/photos.js';
import { renderPage, escapeHtml } from '../lib/layout.js';

const CATEGORY_ORDER = ['People', 'Places', 'Cars', 'Other'];

function humanize(name) {
  return (name || '').replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' ');
}

function renderPhotoItem(p, i) {
  const alt = escapeHtml(p.title || humanize(p.filename));
  return `
        <div class="photo-grid-item" data-index="${i}"><img src="${p.url}" alt="${alt}" loading="lazy" /></div>`;
}

function buildCategories(photos) {
  const available = new Set(photos.map(p => p.category).filter(c => c && c.trim() !== ''));
  const categories = CATEGORY_ORDER.filter(c => available.has(c));
  [...available].forEach(c => { if (!categories.includes(c)) categories.push(c); });
  return categories;
}

export default async function handler(req, res) {
  let preloaded = null;
  let photos = [];

  try {
    const data = await getPhotos();
    photos = data.photos;
    preloaded = data;
  } catch (err) {
    // Fall through with an empty list; client JS will retry via /api/photos.
    preloaded = null;
  }

  const categories = buildCategories(photos);
  const filterBarHtml = categories.length
    ? `
  <div class="photo-filter-bar" id="photo-filters" style="display:flex;">
    <button class="filter-btn active" data-filter="all">All</button>${categories.map(c => `
    <button class="filter-btn" data-filter="${escapeHtml(c)}">${escapeHtml(c)}</button>`).join('')}
  </div>`
    : `
  <div class="photo-filter-bar" id="photo-filters" style="display:none;"></div>`;

  const bodyHtml = `${filterBarHtml}

  <main class="page-wrap${categories.length ? ' has-filters' : ''}">
    <div class="photo-grid" id="photo-grid">${photos.map(renderPhotoItem).join('')}
    </div>
    <p class="placeholder-label" id="photo-status" style="text-align:center; padding: 40px 0; display:${photos.length ? 'none' : 'block'};">${preloaded ? 'No photos yet.' : 'Loading photos…'}</p>
  </main>

  <!-- Lightbox -->
  <div class="lightbox" id="lightbox" role="dialog" aria-modal="true" aria-label="Photo viewer">
    <button class="lightbox-close" id="lb-close" aria-label="Close">&times;</button>
    <button class="lightbox-arrow prev" id="lb-prev" aria-label="Previous">&#8592;</button>
    <div class="lightbox-img-wrap">
      <img id="lb-img" src="" alt="" />
    </div>
    <button class="lightbox-arrow next" id="lb-next" aria-label="Next">&#8594;</button>
    <div class="lightbox-meta">
      <p class="lightbox-counter" id="lb-counter"></p>
      <p class="lightbox-photo-title" id="lb-title" style="display:none;"></p>
      <p class="lightbox-photo-desc" id="lb-description" style="display:none;"></p>
    </div>
  </div>`;

  const bootstrapScript = `<script>window.__PRELOADED_PHOTOS__ = ${preloaded ? JSON.stringify(preloaded) : 'null'};</script>
  <script src="../js/photo.js"></script>`;

  const html = renderPage({
    title: 'Photo — Xavi Flores',
    description: 'Browse photography by Xavi Flores — portraits, landscapes, cars, and more.',
    canonical: 'https://www.xaviflores.com/pages/photo.html',
    activePage: 'photo',
    bodyHtml,
    bootstrapScript,
  });

  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate=600');
  return res.status(200).send(html);
}
