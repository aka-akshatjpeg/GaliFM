/**
 * Gali FM — app.js  v4 (Landing page only)
 *
 * Handles navigation, copyright year, and the compact station
 * strip on the landing page overview section.
 *
 * Full player logic lives in stations-app.js (loaded only on stations.html).
 * Station data lives in stations-data.js (loaded on both pages).
 */

/* ═══════════════════ 1. Dark Mode lock ══════════════════════════ */
// Palette is baked into :root in style.css — no switching.
localStorage.removeItem('gfm-theme');

/* ═══════════════════ 2. DOM Refs ════════════════════════════════ */
const siteNav      = document.getElementById('siteNav');
const navHamburger = document.getElementById('navHamburger');
const mobileMenu   = document.getElementById('mobileMenu');
const stationStrip = document.getElementById('stationStrip');

/* ═══════════════════ 3. Navigation ══════════════════════════════ */
// Scrolled state — transparent over hero → solid on scroll
window.addEventListener('scroll', () => {
  siteNav?.classList.toggle('scrolled', window.scrollY > 20);
}, { passive: true });

// Mobile hamburger
navHamburger?.addEventListener('click', () => {
  const open = mobileMenu?.hidden === false;
  mobileMenu.hidden = open;
  navHamburger.setAttribute('aria-expanded', open ? 'false' : 'true');
});

document.querySelectorAll('[data-close-menu]').forEach(link => {
  link.addEventListener('click', () => {
    if (mobileMenu) mobileMenu.hidden = true;
    navHamburger?.setAttribute('aria-expanded', 'false');
  });
});

// Initial scroll check (page may load mid-scroll)
siteNav?.classList.toggle('scrolled', window.scrollY > 20);

/* ═══════════════════ 4. Copyright Year ═════════════════════════ */
const yearEl = document.getElementById('copyrightYear');
if (yearEl) yearEl.textContent = new Date().getFullYear();

/* ═══════════════════ 5. Compact Station Strip ═══════════════════ */
// Renders a minimal row of station badges from the shared STATIONS array.
// Each badge links to stations.html — no duplicate player or full card.
function buildStationStrip() {
  if (!stationStrip || typeof STATIONS === 'undefined') return;

  stationStrip.innerHTML = '';

  STATIONS.forEach((station, idx) => {
    const item = document.createElement('a');
    item.href      = 'stations.html';
    item.className = 'strip-item';
    item.setAttribute('role', 'listitem');
    item.setAttribute('aria-label', `${station.name} — ${station.mood}`);
    item.innerHTML = `
      <span class="strip-icon" aria-hidden="true">${station.icon}</span>
      <span class="strip-name">${station.name}</span>
    `;
    stationStrip.appendChild(item);
  });
}

buildStationStrip();
