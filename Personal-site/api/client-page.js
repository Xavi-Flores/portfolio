// /api/client-page.js
//
// Serverless function that server-renders pages/clients.html so crawlers see
// real client photo titles/alt text instead of an empty JS-only shell. Routed
// to /pages/clients.html via vercel.json rewrites. js/clients.js reads
// window.__PRELOADED_CLIENTS__ to skip its own fetch when this data is
// present, and falls back to /api/clients if it's missing (e.g. this render
// failed). Filter pills are built from each photo's "project" field instead
// of the fixed category order used on the main photo page.

import { getClientPhotos } from '../lib/clients.js';
import { renderPage, escapeHtml } from '../lib/layout.js';

function humanize(name) {
  return (name || '').replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' ');
}

function renderPhotoItem(p, i) {
  const alt = escapeHtml(p.title || humanize(p.filename));
  return `
        <div class="photo-grid-item" data-index="${i}"><img src="${p.url}" alt="${alt}" loading="lazy" /></div>`;
}

function buildProjects(photos) {
  const seen = new Set();
  const projects = [];
  photos.forEach(p => {
    if (p.project && p.project.trim() !== '' && !seen.has(p.project)) {
      seen.add(p.project);
      projects.push(p.project);
    }
  });
  return projects;
}

export default async function handler(req, res) {
  let preloaded = null;
  let photos = [];

  try {
    const data = await getClientPhotos();
    photos = data.photos;
    preloaded = data;
  } catch (err) {
    // Fall through with an empty list; client JS will retry via /api/clients.
    preloaded = null;
  }

  const projects = buildProjects(photos);
  const activeProject = projects[0] || '';
  const filterBarHtml = projects.length
    ? `
  <div class="photo-filter-bar" id="photo-filters" style="display:flex;">${projects.map(p => `
    <button class="filter-btn${p === activeProject ? ' active' : ''}" data-filter="${escapeHtml(p)}">${escapeHtml(p)}</button>`).join('')}
  </div>`
    : `
  <div class="photo-filter-bar" id="photo-filters" style="display:none;"></div>`;

  const initialPhotos = activeProject ? photos.filter(p => p.project === activeProject) : photos;

  const bodyHtml = `${filterBarHtml}

  <main class="page-wrap${projects.length ? ' has-filters' : ''}">
    <div class="photo-grid" id="photo-grid">${initialPhotos.map(renderPhotoItem).join('')}
    </div>
    <p class="placeholder-label" id="photo-status" style="text-align:center; padding: 40px 0; display:${photos.length ? 'none' : 'block'};">${preloaded ? 'No client work yet.' : 'Loading…'}</p>
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

  const bootstrapScript = `<script>window.__PRELOADED_CLIENTS__ = ${preloaded ? JSON.stringify(preloaded) : 'null'};</script>
  <script src="../js/clients.js"></script>`;

  const html = renderPage({
    title: 'Client Work — Xavi Flores',
    description: 'Photography and video work Xavi Flores has created for clients and brands.',
    canonical: 'https://www.xaviflores.com/pages/clients.html',
    activePage: 'clients',
    bodyHtml,
    bootstrapScript,
  });

  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate=600');
  return res.status(200).send(html);
}
