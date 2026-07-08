// ─── Photo Grid: dynamic loading + category filtering + lightbox ─────────────

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
  let activeFilter = 'all';
  let current      = 0;

  // ── Fetch photos and build grid ───────────────────────────────────────────
  async function loadPhotos() {
    statusEl.style.display = 'block';
    statusEl.textContent = 'Loading photos…';

    try {
      const data = window.__PRELOADED_PHOTOS__ || await (async () => {
        const res = await fetch('/api/photos');
        if (!res.ok) throw new Error('Request failed: ' + res.status);
        return res.json();
      })();

      allPhotos  = data.photos || [];

      if (allPhotos.length === 0) {
        statusEl.textContent = 'No photos yet.';
        return;
      }

      statusEl.style.display = 'none';
      buildFilters();
      renderGrid('all');

    } catch (err) {
      statusEl.textContent = 'Could not load photos. Please try again later.';
      console.error('Photo load error:', err);
    }
  }

  // ── Build filter pills from unique categories ─────────────────────────────
  function buildFilters() {
    const categoryOrder = ['People', 'Places', 'Cars', 'Other'];
    const available = new Set(
      allPhotos.map(p => p.category).filter(c => c && c.trim() !== '')
    );

    // Sort by predefined order, then append any unlisted categories
    const categories = categoryOrder.filter(c => available.has(c));
    [...available].forEach(c => { if (!categoryOrder.includes(c)) categories.push(c); });

    if (categories.length === 0) {
      filterBar.style.display = 'none';
      return;
    }

    filterBar.style.display = 'flex';
    document.querySelector('.page-wrap').classList.add('has-filters');
    filterBar.innerHTML = ['all', ...categories].map(cat => `
      <button class="filter-btn ${cat === 'all' ? 'active' : ''}"
              data-filter="${cat}">
        ${cat === 'all' ? 'All' : cat}
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
    filtered = filter === 'all'
      ? allPhotos
      : allPhotos.filter(p => p.category === filter);

    grid.innerHTML = filtered.map((p, i) => `
      <div class="photo-grid-item" data-index="${i}">
        <img src="${p.url}" alt="${p.title || humanize(p.filename)}" loading="lazy" />
      </div>
    `).join('');

    grid.querySelectorAll('.photo-grid-item').forEach(item => {
      item.addEventListener('click', () => open(parseInt(item.dataset.index)));
    });
  }

  function capitalize(str) {
    return str.charAt(0).toUpperCase() + str.slice(1);
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
