// ============================================================
// js/slider.js — Card Image Slider (แก้ bug ทุก card)
// ============================================================

// ── CORE SLIDE FUNCTION ──────────────────────────────────────
// pid  = ค่าจาก data-card attribute หรือ id prefix ของ slides element
// dir  = +1 (next) หรือ -1 (prev)
function _doCardSlide(pid, dir) {
  const slides = document.getElementById(pid + '-slides');
  if (!slides) return;
  const total = slides.children.length;
  if (!total) return;

  // อ่าน index ปัจจุบัน จาก dataset (เก็บบน slides element)
  let cur = parseInt(slides.dataset.cur || '0', 10);
  cur = (cur + dir + total) % total;
  slides.dataset.cur = cur;

  // ── Bug fix: ใช้ flex + translateX(-N*100%) ──
  // ทุก child ของ .card-slides ต้องมี flex:0 0 100% (กำหนดใน CSS แล้ว)
  slides.style.transform = `translateX(-${cur * 100}%)`;

  // อัปเดต dot บนรูปแบบ data-card
  document.querySelectorAll(`.card-dot[data-card="${pid}"]`)
    .forEach((d, i) => d.classList.toggle('active', i === cur));

  // อัปเดต dot รูปแบบ id-dots (blog / port / agent)
  const dotsEl = document.getElementById(pid + '-dots');
  if (dotsEl) dotsEl.querySelectorAll('.card-dot')
    .forEach((d, i) => d.classList.toggle('active', i === cur));
}

// ── PUBLIC API ───────────────────────────────────────────────
// รองรับ 2 signatures:
//   cardSlide(event, pid, dir)   ← prop-card arrow buttons
//   cardSlide(uid,   dir)        ← blog / port / agent buttons
function cardSlide(a, b, c) {
  if (typeof a === 'object' && a !== null) {
    if (a.stopPropagation) a.stopPropagation();
    _doCardSlide(b, c);
  } else {
    _doCardSlide(a, b);
  }
}

// ── GO TO SPECIFIC SLIDE (dot click) ────────────────────────
function cardGoSlide(e, pid, idx) {
  if (e && e.stopPropagation) e.stopPropagation();
  const slides = document.getElementById(pid + '-slides');
  if (!slides) return;
  slides.dataset.cur = idx;
  slides.style.transform = `translateX(-${idx * 100}%)`;

  document.querySelectorAll(`.card-dot[data-card="${pid}"]`)
    .forEach((d, i) => d.classList.toggle('active', i === idx));

  const dotsEl = document.getElementById(pid + '-dots');
  if (dotsEl) dotsEl.querySelectorAll('.card-dot')
    .forEach((d, i) => d.classList.toggle('active', i === idx));
}

// ── TOUCH + MOUSE DRAG (สำหรับทุก card type) ────────────────
function initCardSwipeOn(containerEl) {
  if (!containerEl || containerEl._swipeInit) return;

  // หา slides element ใน container นี้
  const slidesEl = containerEl.querySelector('.card-slides');
  if (!slidesEl) return;
  containerEl._swipeInit = true;

  // ── หา pid ──────────────────────────────────────────────
  // prop-card: data-card อยู่บน .card-slider-wrap
  // blog/port/agent: id ของ slides element = "${pid}-slides"
  const sliderWrap = containerEl.querySelector('.card-slider-wrap');
  const pid =
    (sliderWrap && sliderWrap.dataset.card) ||
    (slidesEl.id ? slidesEl.id.replace(/-slides$/, '') : null);
  if (!pid) return;

  // ── หา surface ที่มี overflow:hidden ──────────────────────
  // ลำดับสำคัญ: prop → agent → blog → gallery → parent
  const surface =
    sliderWrap ||
    containerEl.querySelector('.agent-photo-wrap') ||
    containerEl.querySelector('.blog-thumb') ||
    containerEl.querySelector('.gal-img') ||
    slidesEl.parentElement;
  if (!surface) return;

  let startX = 0, startY = 0, moved = 0;
  let active = false, didDrag = false;
  const THRESHOLD = 40;

  // ── Touch ────────────────────────────────────────────────
  surface.addEventListener('touchstart', e => {
    startX = e.touches[0].clientX;
    startY = e.touches[0].clientY;
    moved = 0; active = true; didDrag = false;
  }, { passive: true });

  surface.addEventListener('touchmove', e => {
    if (!active) return;
    const dx = e.touches[0].clientX - startX;
    const dy = e.touches[0].clientY - startY;
    // เริ่ม drag เมื่อ horizontal ชัดกว่า vertical
    if (!didDrag && Math.abs(dx) > Math.abs(dy) + 4 && Math.abs(dx) > 8) didDrag = true;
    if (didDrag) moved = dx;
  }, { passive: true });

  surface.addEventListener('touchend', () => {
    if (!active) return;
    active = false;
    if (didDrag && Math.abs(moved) > THRESHOLD) {
      _doCardSlide(pid, moved < 0 ? 1 : -1);
    }
    moved = 0; didDrag = false;
  });

  // ── Mouse drag ───────────────────────────────────────────
  surface.addEventListener('mousedown', e => {
    // ข้ามถ้า click บน button/arrow
    if (e.target.closest('.card-sarr, button, a')) return;
    startX = e.clientX;
    moved = 0; active = true; didDrag = false;
    surface.classList.add('dragging');
  });

  // ใช้ document level เพื่อรับ event นอก surface
  document.addEventListener('mousemove', e => {
    if (!active) return;
    const dx = e.clientX - startX;
    if (!didDrag && Math.abs(dx) > 8) didDrag = true;
    if (didDrag) moved = dx;
  });

  document.addEventListener('mouseup', () => {
    if (!active) return;
    active = false;
    surface.classList.remove('dragging');
    if (didDrag && Math.abs(moved) > THRESHOLD) {
      _doCardSlide(pid, moved < 0 ? 1 : -1);
      // suppress click หลัง drag เพื่อไม่ให้ modal เปิด
      const kill = ev => {
        ev.stopPropagation();
        containerEl.removeEventListener('click', kill, true);
      };
      containerEl.addEventListener('click', kill, true);
    }
    moved = 0; didDrag = false;
  });
}

// ── INIT ALL CARDS ───────────────────────────────────────────
function initAllCardSwipes() {
  document.querySelectorAll('.prop-card, .blog-card, .gal-card, .agent-card')
    .forEach(initCardSwipeOn);
}

function initCardSwipe(cardEl) { initCardSwipeOn(cardEl); }

// ── MUTATION OBSERVER — auto-init เมื่อ render card ใหม่ ────
const _cardObserver = new MutationObserver(initAllCardSwipes);
[
  'all-grid', 'rec-grid', 'new-grid', 'new-track',
  'fav-page-grid', 'blog-track', 'blog-grid',
  'port-grid', 'agent-grid', 'osrv-track', 'gc-track'
].forEach(gid => {
  const el = document.getElementById(gid);
  if (el) _cardObserver.observe(el, { childList: true, subtree: true });
});
