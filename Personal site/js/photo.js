// ─── Photo Grid: dynamic loading from Bunny Storage + Lightbox ──────────────

(function () {
  const grid       = document.getElementById('photo-grid');
  const statusEl   = document.getElementById('photo-status');
  const lightbox   = document.getElementById('lightbox');
  const lbImg      = document.getElementById('lb-img');
  const lbCounter  = document.getElementById('lb-counter');
  const lbClose    = document.getElementById('lb-close');
  const lbPrev     = document.getElementById('lb-prev');
  const lbNext     = document.getElementById('lb-next');

  let srcs  = [];
  let alts  = [];
  let total = 0;
  let current = 0;

  // ── Fetch photo list from the serverless API and build the grid ─────────
  async function loadPhotos() {
    statusEl.style.display = 'block';
    statusEl.textContent = 'Loading photos…';

    try {
      const res = await fetch('/api/photos');
      if (!res.ok) throw new Error('Request failed: ' + res.status);

      const data = await res.json();
      const photos = data.photos || [];

      if (photos.length === 0) {
        statusEl.textContent = 'No photos yet.';
        return;
      }

      statusEl.style.display = 'none';

      srcs  = photos.map(p => p.url);
      alts  = photos.map(p => humanizeFilename(p.name));
      total = srcs.length;

      grid.innerHTML = photos.map((p, i) => `
        <div class="photo-grid-item" data-index="${i}">
          <img src="${p.url}" alt="${humanizeFilename(p.name)}" loading="lazy" />
        </div>
      `).join('');

      // Wire up click handlers now that items exist
      grid.querySelectorAll('.photo-grid-item').forEach((item, i) => {
        item.addEventListener('click', () => open(i));
      });

    } catch (err) {
      statusEl.textContent = 'Could not load photos. Please try again later.';
      console.error('Photo load error:', err);
    }
  }

  function humanizeFilename(name) {
    return name.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' ');
  }

  // ── Lightbox ──────────────────────────────────────────────────────────────

  function open(index) {
    current = index;
    lbImg.src = srcs[current];
    lbImg.alt = alts[current];
    lbCounter.textContent = (current + 1) + ' / ' + total;
    lightbox.classList.add('open');
    document.body.style.overflow = 'hidden';
  }

  function close() {
    lightbox.classList.remove('open');
    lbImg.src = '';
    document.body.style.overflow = '';
  }

  function prev() {
    current = (current - 1 + total) % total;
    lbImg.src = srcs[current];
    lbImg.alt = alts[current];
    lbCounter.textContent = (current + 1) + ' / ' + total;
  }

  function next() {
    current = (current + 1) % total;
    lbImg.src = srcs[current];
    lbImg.alt = alts[current];
    lbCounter.textContent = (current + 1) + ' / ' + total;
  }

  lbClose.addEventListener('click', close);
  lbPrev.addEventListener('click', prev);
  lbNext.addEventListener('click', next);

  lightbox.addEventListener('click', e => {
    if (e.target === lightbox) close();
  });

  document.addEventListener('keydown', e => {
    if (!lightbox.classList.contains('open')) return;
    if (e.key === 'Escape')     close();
    if (e.key === 'ArrowLeft')  prev();
    if (e.key === 'ArrowRight') next();
  });

  // ── Init ──────────────────────────────────────────────────────────────────
  loadPhotos();
})();
