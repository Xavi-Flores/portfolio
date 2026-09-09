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

      // Display order is randomized; the "order" field in photos.json is
      // intentionally ignored here. Preloaded photos arrive pre-shuffled by
      // the server — reshuffling those would visibly rearrange the
      // server-rendered grid, so only shuffle when fetched from the API.
      allPhotos  = data.photos || [];
      if (!window.__PRELOADED_PHOTOS__) shuffle(allPhotos);

      if (allPhotos.length === 0) {
        statusEl.textContent = 'No photos yet.';
        return;
      }

      statusEl.style.display = 'none';
      buildFilters();
      setFilter(initialFilter(), false);

    } catch (err) {
      statusEl.textContent = 'Could not load photos. Please try again later.';
      console.error('Photo load error:', err);
    }
  }

  // ── Build filter pills from unique categories ─────────────────────────────
  function buildFilters() {
    const categoryOrder = ['People', 'Places', 'Cars', 'Architecture', 'Other'];
    const available = new Set(
      allPhotos.flatMap(p => p.categories || [])
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
      btn.addEventListener('click', () => setFilter(btn.dataset.filter, true));
    });
  }

  // ── Apply a filter: update pills, grid, and the shareable URL ────────────
  function setFilter(filter, updateUrl) {
    activeFilter = filter;
    filterBar.querySelectorAll('.filter-btn').forEach(b =>
      b.classList.toggle('active', b.dataset.filter === filter)
    );
    renderGrid(filter);
    if (updateUrl) {
      const url = new URL(window.location);
      if (filter === 'all') url.searchParams.delete('filter');
      else url.searchParams.set('filter', filter);
      history.replaceState(null, '', url);
    }
  }

  // Resolve ?filter= from the URL against the pills that actually exist;
  // matches case-insensitively and falls back to "all" for unknown values.
  function initialFilter() {
    const param = new URLSearchParams(window.location.search).get('filter');
    if (!param) return 'all';
    const categories = [...filterBar.querySelectorAll('.filter-btn')].map(b => b.dataset.filter);
    return categories.find(c => c.toLowerCase() === param.toLowerCase()) || 'all';
  }

  // ── Render grid for a given filter ───────────────────────────────────────
  function renderGrid(filter) {
    filtered = filter === 'all'
      ? allPhotos
      : allPhotos.filter(p => (p.categories || []).includes(filter));

    grid.innerHTML = filtered.map((p, i) => `
      <div class="photo-grid-item" data-index="${i}">
        <img src="${p.url}" alt="${p.title || humanize(p.filename)}" loading="lazy" />
      </div>
    `).join('');

    grid.querySelectorAll('.photo-grid-item').forEach(item => {
      item.addEventListener('click', () => open(parseInt(item.dataset.index)));
    });
  }

  function shuffle(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
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
