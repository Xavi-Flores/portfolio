// ─── Photo Grid Lightbox ──────────────────────────────────────────────────────

(function () {
  const grid      = document.getElementById('photo-grid');
  const lightbox  = document.getElementById('lightbox');
  const lbImg     = document.getElementById('lb-img');
  const lbCounter = document.getElementById('lb-counter');
  const lbClose   = document.getElementById('lb-close');
  const lbPrev    = document.getElementById('lb-prev');
  const lbNext    = document.getElementById('lb-next');

  // Collect all images in order
  const items = Array.from(grid.querySelectorAll('.photo-grid-item'));
  const srcs  = items.map(el => el.querySelector('img').src);
  const alts  = items.map(el => el.querySelector('img').alt);
  const total = srcs.length;

  let current = 0;

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

  // Open on grid item click
  items.forEach((item, i) => {
    item.addEventListener('click', () => open(i));
  });

  // Controls
  lbClose.addEventListener('click', close);
  lbPrev.addEventListener('click', prev);
  lbNext.addEventListener('click', next);

  // Close on backdrop click
  lightbox.addEventListener('click', e => {
    if (e.target === lightbox) close();
  });

  // Keyboard navigation
  document.addEventListener('keydown', e => {
    if (!lightbox.classList.contains('open')) return;
    if (e.key === 'Escape')      close();
    if (e.key === 'ArrowLeft')   prev();
    if (e.key === 'ArrowRight')  next();
  });
})();
