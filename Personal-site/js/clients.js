// ─── Client Grid: dynamic loading + project filtering + lightbox ─────────────

(function () {
  const grid       = document.getElementById('photo-grid');
  const statusEl   = document.getElementById('photo-status');
  const filterBar  = document.getElementById('photo-filters');
  const lightbox   = document.getElementById('lightbox');
  const lbImg      = document.getElementById('lb-img');
  const lbTitle    = document.getElementById('lb-title');
  const lbDesc     = document.getElementById('lb-description');
  const lbCounter  = document.getElementById('lb-counter');
  const lbClose    = document.getElementById('lb-close');
  const lbPrev     = document.getElementById('lb-prev');
  const lbNext     = document.getElementById('lb-next');

  let allPhotos    = [];  // full list from API
  let filtered     = [];  // currently displayed subset
  let activeFilter = '';
  let current      = 0;

  // ── Fetch client photos and build grid ────────────────────────────────────
  async function loadPhotos() {
    statusEl.style.display = 'block';
    statusEl.textContent = 'Loading…';

    try {
      const data = window.__PRELOADED_CLIENTS__ || await (async () => {
        const res = await fetch('/api/clients');
        if (!res.ok) throw new Error('Request failed: ' + res.status);
        return res.json();
      })();

      allPhotos = data.photos || [];

      if (allPhotos.length === 0) {
        statusEl.textContent = 'No client work yet.';
        return;
      }

      statusEl.style.display = 'none';
      buildFilters();
      renderGrid(activeFilter);

    } catch (err) {
      statusEl.textContent = 'Could not load client work. Please try again later.';
      console.error('Client photo load error:', err);
    }
  }

  // ── Build filter pills from unique project names ──────────────────────────
  function buildFilters() {
    const seen = new Set();
    const projects = [];
    allPhotos.forEach(p => {
      if (p.project && p.project.trim() !== '' && !seen.has(p.project)) {
        seen.add(p.project);
        projects.push(p.project);
      }
    });

    if (projects.length === 0) {
      filterBar.style.display = 'none';
      return;
    }

    activeFilter = projects[0];

    filterBar.style.display = 'flex';
    document.querySelector('.page-wrap').classList.add('has-filters');
    filterBar.innerHTML = projects.map(p => `
      <button class="filter-btn ${p === activeFilter ? 'active' : ''}"
              data-filter="${p}">
        ${p}
      </button>
    `).join('');

    filterBar.querySelectorAll('.filter-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        filterBar.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        activeFilter = btn.dataset.filter;
        renderGrid(activeFilter);
      });
    });
  }

  // ── Render grid for a given filter ───────────────────────────────────────
  function renderGrid(filter) {
    filtered = filter
      ? allPhotos.filter(p => p.project === filter)
      : allPhotos;

    grid.innerHTML = filtered.map((p, i) => `
      <div class="photo-grid-item" data-index="${i}">
        <img src="${p.url}" alt="${p.title || humanize(p.filename)}" loading="lazy" />
      </div>
    `).join('');

    grid.querySelectorAll('.photo-grid-item').forEach(item => {
      item.addEventListener('click', () => open(parseInt(item.dataset.index)));
    });
  }

  function humanize(name) {
    return name.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' ');
  }

  // ── Lightbox ──────────────────────────────────────────────────────────────
  function open(index) {
    current = index;
    updateLightbox();
    lightbox.classList.add('open');
    document.body.style.overflow = 'hidden';
  }

  function updateLightbox() {
    const photo      = filtered[current];
    lbImg.src        = photo.url;
    lbImg.alt        = photo.title || humanize(photo.filename);
    lbCounter.textContent = (current + 1) + ' / ' + filtered.length;

    if (lbTitle) {
      lbTitle.textContent  = photo.title || '';
      lbTitle.style.display = photo.title ? 'block' : 'none';
    }
    if (lbDesc) {
      lbDesc.textContent  = photo.description || '';
      lbDesc.style.display = photo.description ? 'block' : 'none';
    }
  }

  function close() {
    lightbox.classList.remove('open');
    lbImg.src = '';
    document.body.style.overflow = '';
  }

  function prev() {
    current = (current - 1 + filtered.length) % filtered.length;
    updateLightbox();
  }

  function next() {
    current = (current + 1) % filtered.length;
    updateLightbox();
  }

  lbClose.addEventListener('click', close);
  lbPrev.addEventListener('click', prev);
  lbNext.addEventListener('click', next);
  lightbox.addEventListener('click', e => {
    if (!e.target.closest('#lb-img, .lightbox-close, .lightbox-arrow')) close();
  });
  document.addEventListener('keydown', e => {
    if (!lightbox.classList.contains('open')) return;
    if (e.key === 'Escape')     close();
    if (e.key === 'ArrowLeft')  prev();
    if (e.key === 'ArrowRight') next();
  });

  // ── Init ─────────────────────────────────────────────────────────────────
  loadPhotos();
})();
