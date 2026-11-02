/**
 * Gali FM — stations-app.js  v3 (Seven-Column Background & Interaction Layout)
 *
 * Requires stations-data.js loaded first (provides STATIONS array).
 *
 * Each station's expanded content is defined in STATION_EXTRA below.
 * Audio engine, player controls, and selectStation() are fully preserved.
 */

/* ═══════════════════ 0. Expanded Station Copy ═══════════════════ */
// Keyed by station id (matches STATIONS[n].id)
const STATION_EXTRA = {
  0: {
    atmosphere: 'A nostalgic corner for first love, rainy evenings, late-night conversations, and unforgettable Bollywood melodies from 2010–2015.',
    perfectFor:  'Romantic evenings, quiet nights, and remembering old memories.',
  },
  1: {
    atmosphere: 'Night highways, roadside dhabas, chai stops, and music accompanying long journeys.',
    perfectFor:  'Late-night journeys and travel.',
  },
  2: {
    atmosphere: 'Vibrant Bhojpuri energy, DJ remixes, festive rhythms, and joyful Bihari character.',
    perfectFor:  'Celebrations and high-energy moments.',
  },
  3: {
    atmosphere: 'Warm water, kitchen rituals, soft lamplight, and familiar old songs.',
    perfectFor:  'Everyday chores and unwinding at home.',
  },
  4: {
    atmosphere: 'Sunlit dust, worksite breaks, and the nostalgic spirit of classic 1990s Bollywood.',
    perfectFor:  'Grounded, nostalgic listening.',
  },
  5: {
    atmosphere: 'Flirty Bollywood favourites, seductive melodies, and late-night songs with a little extra spice.',
    perfectFor:  'Late-night listening, playful vibes, and private moods.',
  },
  6: {
    atmosphere: 'Gaam ki vibe, tractor ki ride, desi beats, and high-energy Haryanvi tracks that hit different.',
    perfectFor:  'High-energy workouts, road trips, and celebratory moods.',
  },
};

/* ═══════════════════ 1. Player State ═══════════════════════════ */
const state = {
  stationIndex:     0,
  trackIndex:       0,
  isPlaying:        false,
  isLoading:        false,
  isMuted:          false,
  volume:           0.8,
  draggingProgress: false,
};

/* ═══════════════════ 2. DOM Refs ════════════════════════════════ */
const html    = document.documentElement;
const audioEl = document.getElementById('audioEl');

const hpPlay         = document.getElementById('hpPlay');
const hpPrev         = document.getElementById('hpPrev');
const hpNext         = document.getElementById('hpNext');
const hpMute         = document.getElementById('hpMute');
const hpStation      = document.getElementById('hpStation');
const hpTrack        = document.getElementById('hpTrack');
const hpStatus       = document.getElementById('hpStatus');
const hpProgress     = document.getElementById('hpProgress');
const hpStream       = document.getElementById('hpStream');
const hpBarFill      = document.getElementById('hpBarFill');
const hpProgressBar  = document.getElementById('hpProgressBar');
const hpTimeCurrent  = document.getElementById('hpTimeCurrent');
const hpTimeDuration = document.getElementById('hpTimeDuration');
const hpVinyl        = document.getElementById('hpVinyl');
const hpVinylLabel   = document.getElementById('hpVinylLabel');
const pThumb         = hpProgressBar?.querySelector('.p-thumb');

const stationColumns = document.getElementById('stationColumns');
const navHamburger   = document.getElementById('navHamburger');
const mobileMenu     = document.getElementById('mobileMenu');

/* ═══════════════════ 3. Dark Mode lock ══════════════════════════ */
localStorage.removeItem('gfm-theme');

/* ═══════════════════ 4. Navigation ══════════════════════════════ */
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

/* ═══════════════════ 5. Copyright Year ═════════════════════════ */
const yearEl = document.getElementById('copyrightYear');
if (yearEl) yearEl.textContent = new Date().getFullYear();

/* ═══════════════════ 6. CSS slug helper ════════════════════════ */
const slug = name => name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');

/* ═══════════════════ 6a. Station page slugs ════════════════════ */
const STATION_SLUGS = [
  'ishq-wali-gali',
  'bus-wale-bhaiya',
  'bhojpuri-bawaal',
  'bartan-ka-samay',
  'chandan-mistri',
  'chatpate-gaane',
  'haryanvi-bangers',
];

/* ═══════════════════ 7. Build Seven-Column Layout ══════════════ */
function buildColumns() {
  if (!stationColumns) return;
  stationColumns.innerHTML = '';

  STATIONS.forEach((station, idx) => {
    const extra = STATION_EXTRA[station.id] ?? {};
    const bgVar = `--station-bg-${slug(station.name)}`;
    const imagePath = station.image || '';
    const bgPos = station.bgPosition || 'center';

    // Root column element
    const col = document.createElement('div');
    col.className = 'sc-col';
    col.dataset.idx = idx;
    col.dataset.station = slug(station.name);
    col.setAttribute('role', 'tab');
    col.setAttribute('aria-selected', idx === state.stationIndex ? 'true' : 'false');
    col.setAttribute('tabindex', idx === state.stationIndex ? '0' : '-1');
    col.setAttribute('aria-label', station.name);
    if (idx === state.stationIndex) {
      col.classList.add('sc-col--selected');
    }

    col.innerHTML = `
      <!-- Background image layer with subtle zoom transition -->
      <div class="sc-bg" aria-hidden="true"
           style="background-image: var(${bgVar}, url('${imagePath}')); background-position: ${bgPos};">
      </div>

      <!-- Subtle translucent dark overlay (maintains photo details) -->
      <div class="sc-bg-overlay" aria-hidden="true"></div>

      <!-- Contrast gradient for bottom text legibility -->
      <div class="sc-bg-gradient" aria-hidden="true"></div>

      <!-- Collapsed view (always visible, completely horizontal) -->
      <div class="sc-collapsed" aria-hidden="false">
        <span class="sc-icon" aria-hidden="true">${station.icon}</span>
        <div class="sc-name-wrap">
          <span class="sc-name">${station.name}</span>
          <span class="sc-deva">${station.nameHindi}</span>
        </div>
        <span class="sc-mood">${station.mood}</span>
        <span class="sc-active-indicator" aria-hidden="true">Tuned</span>
      </div>

      <!-- Expanded view (revealed on hover / focus / tap) -->
      <div class="sc-expanded" aria-hidden="true">
        <span class="sc-exp-icon" aria-hidden="true">${station.icon}</span>
        <div class="sc-exp-title-wrap">
          <h2 class="sc-exp-name">${station.name}</h2>
          <p class="sc-exp-deva">${station.nameHindi}</p>
        </div>
        <p class="sc-exp-atmo">${extra.atmosphere ?? station.mood}</p>
        <div class="sc-exp-perfect-wrap">
          <span class="sc-exp-perfect-label">Perfect for</span>
          <p class="sc-exp-perfect">${extra.perfectFor ?? ''}</p>
        </div>
        <button class="sc-tune-btn" data-idx="${idx}" aria-label="Tune in to ${station.name}">
          Tune In
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
               stroke="currentColor" stroke-width="2.5" stroke-linecap="round"
               aria-hidden="true">
            <line x1="5" y1="12" x2="19" y2="12"/>
            <polyline points="12 5 19 12 12 19"/>
          </svg>
        </button>
      </div>

      <!-- Selected indicator bar -->
      <div class="sc-active-bar" aria-hidden="true"></div>
    `;

    // ── Interaction: hover (desktop) ──────────────────────────────
    col.addEventListener('mouseenter', () => hoverColumn(idx));

    // ── Interaction: keyboard focus ───────────────────────────────
    col.addEventListener('focus', () => hoverColumn(idx));
    col.addEventListener('blur', () => {
      setTimeout(() => {
        if (!stationColumns.contains(document.activeElement)) {
          unhoverColumn();
        }
      }, 20);
    });

    // ── Interaction: arrow-key navigation ────────────────────────
    col.addEventListener('keydown', e => {
      if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
        e.preventDefault();
        const n = (idx + 1) % STATIONS.length;
        focusColumn(n);
      }
      if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
        e.preventDefault();
        const n = (idx - 1 + STATIONS.length) % STATIONS.length;
        focusColumn(n);
      }
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        window.location.href = (STATION_SLUGS[idx] || slug(station.name)) + '.html';
      }
    });

    // ── Interaction: click / tap (mobile & desktop) ──────────────
    col.addEventListener('click', e => {
      // "Tune In" button → navigate to station's dedicated listening page
      if (e.target.closest('.sc-tune-btn')) {
        window.location.href = (STATION_SLUGS[idx] || slug(station.name)) + '.html';
        return;
      }
      // Mobile: tap on collapsed column expands it
      if (window.matchMedia('(hover: none)').matches) {
        const alreadyExpanded = col.classList.contains('sc-col--open');
        closeAllMobile();
        if (!alreadyExpanded) {
          col.classList.add('sc-col--open');
          stationColumns.dataset.openIdx = idx;
        }
      } else {
        // Desktop: clicking column selects it without forcing scroll
        selectStation(idx);
      }
    });

    stationColumns.appendChild(col);
  });

  // Smooth unhover when cursor leaves the entire column gallery
  stationColumns.addEventListener('mouseleave', () => unhoverColumn());
}

/* ═══════════════════ 8. Column hover state (desktop) ═══════════ */
function hoverColumn(idx) {
  // Set attribute on container (used by flex-sizing selectors)
  stationColumns?.setAttribute('data-hovered', idx);
  // Add class to the specific column (used by content + colour selectors)
  document.querySelectorAll('.sc-col').forEach((col, i) => {
    col.classList.toggle('sc-col--hovered', i === idx);
  });
}

function unhoverColumn() {
  stationColumns?.removeAttribute('data-hovered');
  document.querySelectorAll('.sc-col--hovered').forEach(col => {
    col.classList.remove('sc-col--hovered');
  });
}

function focusColumn(n) {
  const cols = document.querySelectorAll('.sc-col');
  cols[n]?.focus();
}

/* ═══════════════════ 9. Mobile expand / collapse ════════════════ */
function closeAllMobile() {
  document.querySelectorAll('.sc-col--open').forEach(c => c.classList.remove('sc-col--open'));
  delete stationColumns?.dataset.openIdx;
}

/* ═══════════════════ 10. Select Station ════════════════════════ */
function selectStation(idx) {
  const prev = state.stationIndex;
  state.stationIndex = idx;
  const tCount = STATIONS[idx]?.tracks?.length || 0;
  state.trackIndex   = tCount > 0 ? Math.floor(Math.random() * tCount) : 0;

  html.dataset.station = idx;

  document.querySelectorAll('.sc-col').forEach((col, i) => {
    const selected = i === idx;
    col.setAttribute('aria-selected', selected ? 'true' : 'false');
    col.setAttribute('tabindex', selected ? '0' : '-1');
    col.classList.toggle('sc-col--selected', selected);
  });

  const st = STATIONS[idx];
  if (hpStation) hpStation.textContent = st.name;
  if (hpVinylLabel) hpVinylLabel.style.background = '';

  if (idx !== prev) stopAudio();
  updateTrackDisplay();
  updateNavButtons();
  setStatus('idle');
  syncTuneButtons();
}

function scrollToPlayer() {
  const p = document.getElementById('listen');
  if (p) p.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

/* ═══════════════════ 11. Track Helpers ═════════════════════════ */
const getStation = () => STATIONS[state.stationIndex];
const getTrack   = () => getStation().tracks[state.trackIndex] ?? null;

function updateTrackDisplay() {
  const track = getTrack();
  if (!track) {
    if (hpTrack) hpTrack.textContent = 'No audio connected — add licensed tracks to stations-data.js';
    showProgress(false, false);
    return;
  }
  if (hpTrack) hpTrack.textContent = track.title + (track.artist ? ` · ${track.artist}` : '');
  showProgress(!track.isStream, track.isStream);
}

function showProgress(showBar, showStream) {
  if (hpProgress) hpProgress.hidden = !showBar;
  if (hpStream)   hpStream.hidden   = !showStream;
}

/* ═══════════════════ 12. Audio Engine ══════════════════════════ */
function stopAudio() {
  audioEl.pause();
  audioEl.src = '';
  state.isPlaying = false;
  state.isLoading = false;
  updateProgress(0, 0);
  hpVinyl?.classList.remove('spinning');
  syncPlayBtn();
}

function playCurrentTrack() {
  const track = getTrack();
  if (!track) return;
  if (audioEl.src === track.url && audioEl.readyState > 0 && !audioEl.error) {
    audioEl.play().then(onPlaySuccess).catch(onPlayError);
    return;
  }
  audioEl.src = track.url;
  audioEl.volume = state.isMuted ? 0 : state.volume;
  audioEl.load();
  setLoading(true);
  audioEl.play().then(onPlaySuccess).catch(onPlayError);
}

function onPlaySuccess() {
  state.isPlaying = true;
  state.isLoading = false;
  syncPlayBtn();
  setStatus('playing');
  hpVinyl?.classList.add('spinning');
}

function onPlayError(err) {
  console.warn('[Gali FM] Playback error:', err);
  state.isPlaying = false;
  state.isLoading = false;
  if (hpTrack) hpTrack.textContent = 'Could not load audio. Check the URL or your connection.';
  hpVinyl?.classList.remove('spinning');
  syncPlayBtn();
  setStatus('error');
}

function pauseAudio() {
  audioEl.pause();
  state.isPlaying = false;
  hpVinyl?.classList.remove('spinning');
  syncPlayBtn();
  setStatus('paused');
}

function setLoading(on) {
  state.isLoading = on;
  syncPlayBtn();
  if (on) setStatus('loading');
}

function syncTuneButtons() {
  document.querySelectorAll('.sc-tune-btn').forEach((btn, i) => {
    const isThisPlaying = (i === state.stationIndex && state.isPlaying);
    const isThisLoading = (i === state.stationIndex && state.isLoading);
    const stName = STATIONS[i]?.name || 'Station';
    if (isThisPlaying) {
      btn.innerHTML = `
        Playing
        <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
          <rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/>
        </svg>
      `;
      btn.setAttribute('aria-label', `Pause ${stName}`);
      btn.classList.add('sc-tune-btn--playing');
    } else if (isThisLoading) {
      btn.innerHTML = `
        Loading…
        <svg class="icon-spin" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" aria-hidden="true"><path d="M12 2a10 10 0 0 1 10 10"/></svg>
      `;
      btn.setAttribute('aria-label', `Loading ${stName}`);
      btn.classList.remove('sc-tune-btn--playing');
    } else {
      btn.innerHTML = `
        Tune In
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
             stroke="currentColor" stroke-width="2.5" stroke-linecap="round"
             aria-hidden="true">
          <line x1="5" y1="12" x2="19" y2="12"/>
          <polyline points="12 5 19 12 12 19"/>
        </svg>
      `;
      btn.setAttribute('aria-label', `Tune in to ${stName}`);
      btn.classList.remove('sc-tune-btn--playing');
    }
  });
}

function syncPlayBtn() {
  syncTuneButtons();
  if (!hpPlay) return;
  if (state.isLoading) {
    hpPlay.dataset.state = 'loading';
    hpPlay.setAttribute('aria-label', 'Loading…');
    hpPlay.setAttribute('aria-pressed', 'false');
  } else if (state.isPlaying) {
    hpPlay.dataset.state = 'playing';
    hpPlay.setAttribute('aria-label', 'Pause');
    hpPlay.setAttribute('aria-pressed', 'true');
  } else {
    hpPlay.dataset.state = 'idle';
    hpPlay.setAttribute('aria-label', 'Play');
    hpPlay.setAttribute('aria-pressed', 'false');
  }
}

/* ═══════════════════ 13. Play / Pause ══════════════════════════ */
hpPlay?.addEventListener('click', () => {
  if (state.isLoading) return;
  const track = getTrack();
  if (!track) {
    if (hpTrack) hpTrack.textContent = 'Add licensed audio URLs to stations-data.js to enable playback.';
    return;
  }
  state.isPlaying ? pauseAudio() : playCurrentTrack();
});

/* ═══════════════════ 14. Prev / Next ═══════════════════════════ */
function updateNavButtons() {
  const n = getStation().tracks.length;
  if (hpPrev) hpPrev.disabled = n < 2;
  if (hpNext) hpNext.disabled = n < 2;
}

hpPrev?.addEventListener('click', () => {
  const t = getStation().tracks;
  if (!t.length) return;
  state.trackIndex = (state.trackIndex - 1 + t.length) % t.length;
  stopAudio(); updateTrackDisplay();
  if (state.isPlaying) playCurrentTrack();
});

hpNext?.addEventListener('click', () => {
  const t = getStation().tracks;
  if (!t.length) return;
  state.trackIndex = (state.trackIndex + 1) % t.length;
  stopAudio(); updateTrackDisplay();
  if (state.isPlaying) playCurrentTrack();
});

/* ═══════════════════ 15. Volume / Mute ═════════════════════════ */
hpMute?.addEventListener('click', () => {
  state.isMuted = !state.isMuted;
  audioEl.volume = state.isMuted ? 0 : state.volume;
  hpMute.setAttribute('aria-label', state.isMuted ? 'Unmute' : 'Mute');
  hpMute.style.opacity = state.isMuted ? '.35' : '';
  const on  = hpMute.querySelector('.icon-vol-on');
  const off = hpMute.querySelector('.icon-vol-off');
  if (on)  on.style.display  = state.isMuted ? 'none' : '';
  if (off) off.style.display = state.isMuted ? ''     : 'none';
});

/* ═══════════════════ 16. Progress ══════════════════════════════ */
function fmt(s) {
  if (!isFinite(s) || isNaN(s) || s < 0) return '--:--';
  return `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
}

function updateProgress(cur, dur) {
  const pct = dur > 0 ? (cur / dur) * 100 : 0;
  if (hpBarFill) hpBarFill.style.width = `${pct}%`;
  if (pThumb)    pThumb.style.left     = `${pct}%`;
  if (hpTimeCurrent)  hpTimeCurrent.textContent  = fmt(cur);
  if (hpTimeDuration) hpTimeDuration.textContent = fmt(dur);
  if (hpProgressBar) {
    hpProgressBar.setAttribute('aria-valuenow', Math.round(pct));
    hpProgressBar.setAttribute('aria-valuetext', `${fmt(cur)} of ${fmt(dur)}`);
  }
}

hpProgressBar?.addEventListener('mousedown',  e => { state.draggingProgress = true; seek(e); });
hpProgressBar?.addEventListener('touchstart', e => { state.draggingProgress = true; seek(e.touches[0]); }, { passive: true });
document.addEventListener('mousemove',  e => { if (state.draggingProgress) seek(e); });
document.addEventListener('touchmove',  e => { if (state.draggingProgress) seek(e.touches[0]); }, { passive: true });
document.addEventListener('mouseup',  () => { state.draggingProgress = false; });
document.addEventListener('touchend', () => { state.draggingProgress = false; });

function seek(e) {
  if (!hpProgressBar) return;
  const track = hpProgressBar.querySelector('.p-track');
  if (!track) return;
  const rect = track.getBoundingClientRect();
  const pct = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
  if (audioEl.duration && isFinite(audioEl.duration)) audioEl.currentTime = pct * audioEl.duration;
}

hpProgressBar?.addEventListener('keydown', e => {
  if (hpProgress?.hidden) return;
  const step = audioEl.duration ? audioEl.duration * 0.05 : 5;
  if (e.key === 'ArrowRight' || e.key === 'ArrowUp') {
    e.preventDefault();
    audioEl.currentTime = Math.min((audioEl.currentTime || 0) + step, audioEl.duration || 0);
  }
  if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') {
    e.preventDefault();
    audioEl.currentTime = Math.max((audioEl.currentTime || 0) - step, 0);
  }
});

/* ═══════════════════ 17. Audio Events ══════════════════════════ */
audioEl.addEventListener('timeupdate', () => {
  if (!state.draggingProgress) updateProgress(audioEl.currentTime, audioEl.duration);
});
audioEl.addEventListener('durationchange', () => updateProgress(audioEl.currentTime, audioEl.duration));
audioEl.addEventListener('waiting',  () => setLoading(true));
audioEl.addEventListener('canplay',  () => { if (state.isLoading) setLoading(false); });
audioEl.addEventListener('playing',  () => {
  state.isPlaying = true;
  state.isLoading = false;
  syncPlayBtn();
  setStatus('playing');
  hpVinyl?.classList.add('spinning');
});
audioEl.addEventListener('pause', () => { if (!state.isLoading) setStatus('paused'); });
audioEl.addEventListener('ended', () => {
  const tracks = getStation().tracks;
  if (tracks.length > 1) {
    let nextIdx;
    do {
      nextIdx = Math.floor(Math.random() * tracks.length);
    } while (nextIdx === state.trackIndex);
    state.trackIndex = nextIdx;
    updateTrackDisplay();
    playCurrentTrack();
  } else if (tracks.length === 1) {
    audioEl.currentTime = 0;
    playCurrentTrack();
  } else {
    stopAudio();
    setStatus('idle');
  }
});
audioEl.addEventListener('error', () => onPlayError(audioEl.error));

/* ═══════════════════ 18. Status ════════════════════════════════ */
const STATUS_MAP = { idle: 'Ready', loading: 'Loading…', playing: 'Playing', paused: 'Paused', error: 'Error' };
function setStatus(s) {
  if (!hpStatus) return;
  hpStatus.dataset.status = s;
  hpStatus.textContent = STATUS_MAP[s] ?? '';
}

/* ═══════════════════ 19. Keyboard Shortcuts ════════════════════ */
document.addEventListener('keydown', e => {
  const tag = e.target.tagName;
  if (e.code === 'Space' && !['INPUT','TEXTAREA','BUTTON','SELECT'].includes(tag)) {
    e.preventDefault();
    if (hpPlay) {
      hpPlay.click();
    } else {
      state.isPlaying ? pauseAudio() : playCurrentTrack();
    }
  }
});

/* ═══════════════════ 20. Reduced Motion ════════════════════════ */
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
reducedMotion.addEventListener('change', () => {
  if (reducedMotion.matches) hpVinyl?.classList.remove('spinning');
});

/* ═══════════════════ 21. Init ══════════════════════════════════ */
function init() {
  buildColumns();
  selectStation(0);
  audioEl.volume = state.volume;
}

init();
