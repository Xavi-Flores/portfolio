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
      openPhotoFromUrl();

    } catch (err) {
      statusEl.textContent = 'Could not load photos. Please try again later.';
      console.error('Photo load error:', err);
    }
  }

  // ── Sub-filter hierarchy ──────────────────────────────────────────────────
  // Parent category -> child categories shown in its dropdown. A photo tagged
  // with a child (e.g. "F1") counts for the parent ("Sports") too, so photos
  // don't need both tags. Child names must be unique across parents.
  const SUBCATEGORIES = {
    Sports: ['F1', 'U.S. Open 2026', 'Baseball'],
    Places: ['New York', 'Japan', 'South Korea'],
  };
  const PARENT_OF = {};
  Object.keys(SUBCATEGORIES).forEach(p => SUBCATEGORIES[p].forEach(c => { PARENT_OF[c] = p; }));

  function matchesFilter(p, filter) {
    const cats = p.categories || [];
    return cats.includes(filter) || cats.some(c => PARENT_OF[c] === filter);
  }

  // ── Build filter pills from unique categories ─────────────────────────────
  function buildFilters() {
    const categoryOrder = ['People', 'Places', 'Architecture', 'Sports', 'Cars', 'Other'];
    const available = new Set();
    allPhotos.forEach(p => (p.categories || []).forEach(c => {
      available.add(c);
      if (PARENT_OF[c]) available.add(PARENT_OF[c]);
    }));

    // Top-level pills: predefined order first, then unlisted categories that
    // aren't someone's child (children only appear inside their dropdown)
    const categories = categoryOrder.filter(c => available.has(c));
    [...available].forEach(c => { if (!categoryOrder.includes(c) && !PARENT_OF[c]) categories.push(c); });

    if (categories.length === 0) {
      filterBar.style.display = 'none';
      return;
    }

    filterBar.style.display = 'flex';
    document.querySelector('.page-wrap').classList.add('has-filters');
    filterBar.innerHTML = ['all', ...categories].map(cat => {
      const children = (SUBCATEGORIES[cat] || []).filter(c => available.has(c));
      const btn = `
      <button class="filter-btn ${cat === 'all' ? 'active' : ''}"
              data-filter="${cat}">
        ${cat === 'all' ? 'All' : cat}${children.length ? ' <span class="filter-caret">&#9662;</span>' : ''}
      </button>`;
      if (!children.length) return btn;
      return `
      <div class="filter-group">${btn}
        <div class="filter-menu"><div class="filter-menu-inner">${children.map(c => `
          <button class="filter-btn" data-filter="${c}">${c}</button>`).join('')}
        </div></div>
      </div>`;
    }).join('');

    filterBar.querySelectorAll('.filter-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        setFilter(btn.dataset.filter, true);
        // A parent pill also toggles its dropdown (matters on touch devices,
        // where there is no hover)
        if (btn.nextElementSibling && btn.nextElementSibling.classList.contains('filter-menu')) {
          btn.closest('.filter-group').classList.toggle('open');
        }
      });
    });
  }

  // ── Apply a filter: update pills, grid, and the shareable URL ────────────
  function setFilter(filter, updateUrl) {
    activeFilter = filter;
    filterBar.querySelectorAll('.filter-btn').forEach(b => {
      const f = b.dataset.filter;
      const childActive = (SUBCATEGORIES[f] || []).includes(filter);
      b.classList.toggle('active', f === filter || childActive);
      // Marks a parent whose subcategory is the active filter (green caret)
      b.classList.toggle('sub-active', childActive);
    });
    // Keep a dropdown open only while its parent or one of its children is
    // active; opening a child directly (e.g. from a ?filter= link) reveals it
    filterBar.querySelectorAll('.filter-group').forEach(g => {
      const parent = g.querySelector('.filter-btn').dataset.filter;
      const related = parent === filter || (SUBCATEGORIES[parent] || []).includes(filter);
      if (!related) g.classList.remove('open');
      else if (PARENT_OF[filter] === parent) g.classList.add('open');
    });
    renderGrid(filter);
    if (updateUrl) {
      const url = new URL(window.location);
      if (filter === 'all') url.searchParams.delete('filter');
      else url.searchParams.set('filter', filter);
      history.replaceState(null, '', url);
    }
  }

  // Keep ?photo= in the URL in sync with the lightbox so the current view
  // is always shareable; pass null to remove it.
  function setPhotoParam(filename) {
    const url = new URL(window.location);
    if (filename) url.searchParams.set('photo', filename);
    else url.searchParams.delete('photo');
    history.replaceState(null, '', url);
  }

  // Open the photo named by ?photo= (shared lightbox links). If the photo
  // isn't in the active filter, fall back to "all" so it can still open.
  function openPhotoFromUrl() {
    const param = new URLSearchParams(window.location.search).get('photo');
    if (!param) return;
    const match = p => p.filename.toLowerCase() === param.toLowerCase();
    let idx = filtered.findIndex(match);
    if (idx === -1 && allPhotos.some(match)) {
      setFilter('all', true);
      idx = filtered.findIndex(match);
    }
    if (idx !== -1) open(idx);
    else setPhotoParam(null); // stale link — drop the bad param
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
      : allPhotos.filter(p => matchesFilter(p, filter));

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
    setPhotoParam(photo.filename);
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
    setPhotoParam(null);
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
