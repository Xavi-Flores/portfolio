// ─── About Page: photo carousel ────────────────────────────────────────────

(function () {
  const photos = Array.from(document.querySelectorAll('#about-carousel .carousel-photo'));
  if (!photos.length) return;

  // order = [centerIdx, leftIdx, rightIdx]
  let order = photos.map((_, i) => i);

  function render() {
    photos.forEach(el => el.classList.remove('is-center', 'is-left', 'is-right'));
    photos[order[0]].classList.add('is-center');
    photos[order[1]].classList.add('is-left');
    photos[order[2]].classList.add('is-right');
  }

  photos.forEach(el => {
    el.addEventListener('click', () => {
      if (el.classList.contains('is-left')) {
        order = [order[1], order[2], order[0]];
        render();
      } else if (el.classList.contains('is-right')) {
        order = [order[2], order[0], order[1]];
        render();
      }
    });
  });

  render();
})();
