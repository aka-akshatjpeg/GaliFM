/**
 * Gali FM — player-page.js  v2
 *
 * Shared logic for all 7 individual station listening pages.
 * Requires:
 *   - window.STATION_ID  (integer 0–6, set inline by each HTML page)
 *   - stations-data.js   (provides STATIONS array)
 *
 * Features:
 *   - Play / Pause / Mute
 *   - Previous / Next track within the station's own playlist
 *   - Volume slider + mute toggle
 *   - Seek bar with current time and total duration
 *   - Track counter  (e.g. "2 / 5")
 *   - Shuffle (Fisher-Yates randomised order, persisted for session)
 *   - Repeat (none → repeat-all → repeat-one cycle)
 *   - Auto-advance to next track when current ends (respects shuffle/repeat)
 *   - Web Audio AnalyserNode visualizer (CSS fallback when no tracks)
 *   - Pointer-tracking amber glow (desktop, respects reduced-motion)
 *   - Vinyl CSS rotation + tonearm CSS transition
 *   - Graceful "No audio source configured" state when tracks[] is empty
 *   - Loading / error states with clear UI feedback
 *   - Keyboard: Space=play/pause, M=mute, ←/→=prev/next track,
 *               Shift+←/→=prev/next station, [/]=volume down/up
 */

(function () {
  'use strict';

  /* ─── 0. Guards ────────────────────────────────────────────────── */
  if (typeof window.STATION_ID === 'undefined') {
    console.error('[Gali FM] player-page.js: window.STATION_ID not set.');
    return;
  }
  if (typeof STATIONS === 'undefined' || !Array.isArray(STATIONS)) {
    console.error('[Gali FM] player-page.js: STATIONS not found. Load stations-data.js first.');
    return;
  }

  /* ─── 1. Station data ──────────────────────────────────────────── */
  const STATION_SLUGS = [
    'ishq-wali-gali', 'bus-wale-bhaiya', 'bhojpuri-bawaal',
    'bartan-ka-samay', 'chandan-mistri', 'chatpate-gaane', 'haryanvi-bangers',
  ];

  const stationId = Math.max(0, Math.min(STATIONS.length - 1, window.STATION_ID));
  const station   = STATIONS[stationId];
  const tracks    = station.tracks || [];
  let   hasTracks = tracks.length > 0;  // re-evaluated after loadLibrary()

  /* ─── 2. Player state ──────────────────────────────────────────── */
  const state = {
    queue:         [],       // list of track indices representing the shuffled playback queue
    queueIndex:    0,        // current position inside state.queue
    playOrder:     [],       // alias for backward compatibility
    trackIndex:    0,        // alias for backward compatibility
    isPlaying:     false,
    isLoading:     false,
    isMuted:       false,
    volume:        0.8,
    repeat:        'none',   // 'none' | 'all' | 'one'
    isSeeking:     false,
    consecutiveErrors: 0,
  };

  /* ─── 3. DOM refs ──────────────────────────────────────────────── */
  const $  = id => document.getElementById(id);
  const playerArea     = $('playerArea');
  const playerBg       = $('playerBg');
  const playerGlow     = $('playerGlow');
  const vinylEl        = $('vinyl');
  const tonearmEl      = $('tonearm');
  const vinylIcon      = $('vinylIcon');
  const vinylName      = $('vinylName');
  const stationNameEl  = $('stationName');
  const stationDevaEl  = $('stationDeva');
  const stationCapEl   = $('stationCaption');
  const navIconEl      = $('navIcon');
  const navStationEl   = $('navStation');
  const nowPlayDot     = $('nowPlayDot');
  const nowPlayTrack   = $('nowPlayTrack');
  const nowPlayStatus  = $('nowPlayStatus');
  const trackCounter   = $('trackCounter');
  const btnPlay        = $('btnPlay');
  const btnPrevTrack   = $('btnPrevTrack');
  const btnNextTrack   = $('btnNextTrack');
  const btnMute        = $('btnMute');
  const btnRepeat      = $('btnRepeat');
  const btnPrevStation = $('btnPrevStation');
  const btnNextStation = $('btnNextStation');
  const seekBar        = $('seekBar');
  const seekCurrent    = $('seekCurrent');
  const seekDuration   = $('seekDuration');
  const volumeSlider   = $('volumeSlider');
  const noAudioMsg     = $('noAudioMsg');
  const vizContainer   = $('vizContainer');
  const audioEl        = $('audioEl');

  const reducedMotion  = window.matchMedia('(prefers-reduced-motion: reduce)');

  /* ─── 4. Fair Fisher-Yates Shuffled Queue ───────────────────────── */
  /**
   * Generates a fair Fisher-Yates permutation of track indices [0 ... n-1].
   * If excludeFirst is provided and tracks.length > 1, guarantees that
   * the first track of the new cycle does not immediately repeat excludeFirst.
   */
  function generateShuffledCycle(excludeFirst) {
    const indices = tracks.map((_, i) => i);
    if (indices.length <= 1) return indices;

    // Fisher-Yates algorithm
    for (let i = indices.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [indices[i], indices[j]] = [indices[j], indices[i]];
    }

    // Prevent immediate repeat at cycle boundary
    if (typeof excludeFirst !== 'undefined' && indices.length > 1 && indices[0] === excludeFirst) {
      const swapWith = 1 + Math.floor(Math.random() * (indices.length - 1));
      [indices[0], indices[swapWith]] = [indices[swapWith], indices[0]];
    }

    return indices;
  }

  function initQueue() {
    if (!hasTracks) {
      state.queue = [];
      state.queueIndex = 0;
      state.playOrder = state.queue;
      state.trackIndex = 0;
      return;
    }
    // Every station initializes with a freshly shuffled permutation of its tracks
    state.queue = generateShuffledCycle();
    state.queueIndex = 0;
    state.playOrder = state.queue;
    state.trackIndex = 0;
  }

  function currentTrackIndex() {
    if (!hasTracks || !state.queue.length) return 0;
    return state.queue[state.queueIndex] ?? 0;
  }

  function getTrack() {
    if (!hasTracks) return null;
    return tracks[currentTrackIndex()] ?? null;
  }

  /* ─── 5. Populate static DOM ───────────────────────────────────── */
  function populateDom() {
    document.title = station.name + ' — Gali FM';
    if (stationNameEl)  stationNameEl.textContent = station.name;
    if (stationDevaEl)  stationDevaEl.textContent = station.nameHindi;
    if (stationCapEl)   stationCapEl.textContent  = station.caption;
    if (navIconEl)      navIconEl.textContent      = station.icon;
    if (navStationEl)   navStationEl.textContent   = station.name;
    if (vinylIcon)      vinylIcon.textContent      = station.icon;
    if (vinylName)      vinylName.textContent      = station.name;

    if (playerBg && station.image) {
      playerBg.style.backgroundImage    = `url('${station.image}')`;
      playerBg.style.backgroundPosition = station.bgPosition || 'center';
    }

    // Station prev/next hrefs
    const prevIdx = (stationId - 1 + STATIONS.length) % STATIONS.length;
    const nextIdx = (stationId + 1) % STATIONS.length;
    if (btnPrevStation) {
      btnPrevStation.href  = STATION_SLUGS[prevIdx] + '.html';
      btnPrevStation.title = '← ' + STATIONS[prevIdx].name;
    }
    if (btnNextStation) {
      btnNextStation.href  = STATION_SLUGS[nextIdx] + '.html';
      btnNextStation.title = STATIONS[nextIdx].name + ' →';
    }

    // Volume slider initial value
    if (volumeSlider) {
      volumeSlider.value = state.volume * 100;
    }
  }

  /* ─── 6. Now-playing display ───────────────────────────────────── */
  function fmtTime(s) {
    if (!isFinite(s) || isNaN(s) || s < 0) return '--:--';
    const m = Math.floor(s / 60);
    const sec = String(Math.floor(s % 60)).padStart(2, '0');
    return `${m}:${sec}`;
  }

  function updateNowPlayingDisplay() {
    const track = getTrack();

    if (!hasTracks) {
      if (nowPlayTrack) nowPlayTrack.textContent  = 'No audio source configured';
      if (noAudioMsg)   noAudioMsg.classList.add('visible');
      if (btnPlay)      { btnPlay.disabled = true; btnPlay.setAttribute('aria-label', 'No audio available'); }
      if (btnPrevTrack) btnPrevTrack.disabled = true;
      if (btnNextTrack) btnNextTrack.disabled = true;
      if (seekBar)      seekBar.disabled = true;
      if (trackCounter) trackCounter.textContent = '— / —';
      return;
    }

    if (noAudioMsg)   noAudioMsg.classList.remove('visible');
    if (btnPlay)      { btnPlay.disabled = false; }

    const displayIndex = (state.queueIndex % tracks.length) + 1;
    if (trackCounter) trackCounter.textContent = `${displayIndex} / ${tracks.length}`;

    if (track) {
      const title = track.title || 'Unknown track';
      const by    = track.artist ? ` · ${track.artist}` : '';
      if (nowPlayTrack) nowPlayTrack.textContent = title + by;
    }

    // Prev / Next track button disabled state
    if (btnPrevTrack) {
      const canPrev = state.queueIndex > 0 || tracks.length > 1;
      btnPrevTrack.disabled = !canPrev && tracks.length <= 1;
      btnPrevTrack.style.opacity = (tracks.length <= 1 && state.queueIndex === 0) ? '0.35' : '';
    }
    if (btnNextTrack) {
      btnNextTrack.disabled = tracks.length <= 1;
      btnNextTrack.style.opacity = (tracks.length <= 1) ? '0.35' : '';
    }
  }

  /* ─── 7. Seek bar ──────────────────────────────────────────────── */
  function getEffectiveDuration() {
    const dur = audioEl.duration;
    if (dur && isFinite(dur) && dur > 0) return dur;
    const known = getTrack()?.duration;
    if (known && isFinite(known) && known > 0) return known;
    return 0;
  }

  function updateSeek() {
    if (!seekBar || state.isSeeking || audioEl.seeking) return;
    const cur = audioEl.currentTime || 0;
    const dur = getEffectiveDuration();
    if (dur > 0) {
      const pct = Math.max(0, Math.min(100, (cur / dur) * 100));
      seekBar.value = pct;
      seekBar.style.setProperty('--pct', pct.toFixed(2) + '%');
    }
    if (seekCurrent) seekCurrent.textContent = fmtTime(cur);
    if (seekDuration) {
      seekDuration.textContent = dur > 0 ? fmtTime(dur) : '--:--';
    }
  }

  function resetSeek() {
    if (seekBar) { seekBar.value = 0; seekBar.style.setProperty('--pct', '0%'); }
    if (seekCurrent)  seekCurrent.textContent  = '--:--';
    if (seekDuration) {
      const knownDur = getTrack()?.duration || 0;
      seekDuration.textContent = knownDur > 0 ? fmtTime(knownDur) : '--:--';
    }
  }

  function ensureTrackLoaded() {
    const track = getTrack();
    if (!track) return false;
    const resolvedUrl = new URL(track.url, window.location.href).href;
    if (!audioEl.src || audioEl.src !== resolvedUrl) {
      audioEl.src    = track.url;
      audioEl.volume = state.isMuted ? 0 : state.volume;
      audioEl.load();
    }
    return true;
  }

  function applySeek(pct) {
    const dur = getEffectiveDuration();
    if (!dur || dur <= 0) {
      state.isSeeking = false;
      return;
    }

    const clampedPct = Math.max(0, Math.min(1, pct));
    const targetTime = clampedPct * dur;

    // If seeking to within 0.2s of the very end, treat as track completed
    if (dur - targetTime <= 0.2) {
      state.isSeeking = false;
      nextTrack(true);
      return;
    }

    ensureTrackLoaded();

    // Assign currentTime directly to audio element
    try {
      if (audioEl.readyState >= 1) {
        audioEl.currentTime = targetTime;
      } else {
        const onLoaded = () => {
          audioEl.removeEventListener('loadedmetadata', onLoaded);
          try { audioEl.currentTime = targetTime; } catch (_) {}
        };
        audioEl.addEventListener('loadedmetadata', onLoaded);
      }
    } catch (e) {
      console.warn('[Gali FM] Seek failed:', e);
    }

    // Update UI labels immediately
    if (seekCurrent) seekCurrent.textContent = fmtTime(targetTime);
    if (seekBar) {
      seekBar.value = clampedPct * 100;
      seekBar.style.setProperty('--pct', (clampedPct * 100).toFixed(2) + '%');
    }

    // Safety fallback: ensure isSeeking unfreezes even if seeked event is delayed
    setTimeout(() => {
      if (state.isSeeking && !audioEl.seeking) {
        state.isSeeking = false;
        updateSeek();
      }
    }, 400);
  }

  // Freeze timeupdate while user interacts
  const onSeekStart = () => { state.isSeeking = true; };
  seekBar?.addEventListener('pointerdown', onSeekStart);
  seekBar?.addEventListener('mousedown',   onSeekStart);
  seekBar?.addEventListener('touchstart',  onSeekStart, { passive: true });

  // Continuous drag updates UI (time label + amber fill)
  seekBar?.addEventListener('input', () => {
    state.isSeeking = true;
    const pct = Math.max(0, Math.min(100, parseFloat(seekBar.value || 0))) / 100;
    seekBar.style.setProperty('--pct', (pct * 100).toFixed(2) + '%');
    const dur = getEffectiveDuration();
    if (seekCurrent && dur > 0) {
      seekCurrent.textContent = fmtTime(pct * dur);
    }
  });

  // User commits seek (release drag or click)
  seekBar?.addEventListener('change', () => {
    const pct = Math.max(0, Math.min(100, parseFloat(seekBar.value || 0))) / 100;
    applySeek(pct);
  });

  // Keyboard accessibility (arrows step by 2%)
  seekBar?.addEventListener('keydown', e => {
    const dur = getEffectiveDuration();
    if (!dur) return;
    const step = dur * 0.02;
    if (e.key === 'ArrowRight' || e.key === 'ArrowUp') {
      e.preventDefault();
      applySeek(((audioEl.currentTime || 0) + step) / dur);
    }
    if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') {
      e.preventDefault();
      applySeek(Math.max(0, (audioEl.currentTime || 0) - step) / dur);
    }
  });

  /* ─── 8. Volume slider ─────────────────────────────────────────── */
  volumeSlider?.addEventListener('input', () => {
    const v = volumeSlider.value / 100;
    state.volume = v;
    state.isMuted = (v === 0);
    audioEl.volume = v;
    volumeSlider.style.setProperty('--pct', volumeSlider.value + '%');
    syncMuteBtn();
  });

  function syncMuteBtn() {
    if (!btnMute) return;
    btnMute.classList.toggle('muted', state.isMuted || state.volume === 0);
    btnMute.setAttribute('aria-label', (state.isMuted || state.volume === 0) ? 'Unmute' : 'Mute');
  }

  /* ─── 9. Vinyl / Tonearm ───────────────────────────────────────── */
  function startSpinning() {
    if (reducedMotion.matches) return;
    vinylEl?.classList.add('spinning');
    tonearmEl?.classList.add('playing');
    vizContainer?.classList.add('active');
    if (nowPlayDot) { nowPlayDot.classList.remove('idle'); nowPlayDot.classList.add('playing'); }
  }
  function stopSpinning() {
    vinylEl?.classList.remove('spinning');
    tonearmEl?.classList.remove('playing');
    vizContainer?.classList.remove('active');
    if (nowPlayDot) { nowPlayDot.classList.remove('playing'); nowPlayDot.classList.add('idle'); }
  }

  /* ─── 10. Play button state ────────────────────────────────────── */
  function syncPlayBtn() {
    if (!btnPlay) return;
    if (state.isLoading) {
      btnPlay.dataset.state = 'loading';
      btnPlay.setAttribute('aria-label', 'Loading…');
      btnPlay.setAttribute('aria-pressed', 'false');
    } else if (state.isPlaying) {
      btnPlay.dataset.state = 'playing';
      btnPlay.setAttribute('aria-label', 'Pause');
      btnPlay.setAttribute('aria-pressed', 'true');
    } else {
      btnPlay.dataset.state = 'idle';
      btnPlay.setAttribute('aria-label', 'Play');
      btnPlay.setAttribute('aria-pressed', 'false');
    }
  }

  /* ─── 11. Status text ──────────────────────────────────────────── */
  const STATUS_MAP = { idle: 'Ready', loading: 'Loading…', playing: 'Playing', paused: 'Paused', error: 'Error' };
  function setStatus(s) {
    if (nowPlayStatus) nowPlayStatus.textContent = STATUS_MAP[s] ?? '';
  }

  /* ─── 12. Audio engine ─────────────────────────────────────────── */
  function loadAndPlay(shouldPlay = true) {
    const track = getTrack();
    if (!track) return;

    // If already on the same src and playable, just play
    const resolvedUrl = new URL(track.url, window.location.href).href;
    if (audioEl.src === resolvedUrl && audioEl.readyState > 0 && !audioEl.error) {
      if (shouldPlay) audioEl.play().then(onPlaySuccess).catch(onPlayError);
      return;
    }

    audioEl.src    = track.url;
    audioEl.volume = state.isMuted ? 0 : state.volume;
    audioEl.load();
    state.isLoading = true;
    syncPlayBtn();
    setStatus('loading');
    if (shouldPlay) {
      audioEl.play().then(onPlaySuccess).catch(onPlayError);
    }
    updateNowPlayingDisplay();
    resetSeek();
  }

  function onPlaySuccess() {
    state.isPlaying = true;
    state.isLoading = false;
    state.consecutiveErrors = 0;
    syncPlayBtn();
    setStatus('playing');
    startSpinning();
    startAnalyser();
  }

  function onPlayError(err) {
    console.warn('[Gali FM] Playback error:', err);
    state.isPlaying = false;
    state.isLoading = false;

    // Auto-skip unplayable/corrupt track with loop prevention
    state.consecutiveErrors = (state.consecutiveErrors || 0) + 1;
    const maxRetries = Math.min(tracks.length - 1, 5);
    if (state.consecutiveErrors <= maxRetries && tracks.length > 1) {
      console.log(`[Gali FM] Skipping unplayable track (attempt ${state.consecutiveErrors}/${maxRetries})...`);
      setTimeout(() => {
        nextTrack(true);
      }, 300);
      return;
    }
    state.consecutiveErrors = 0;

    // Give a meaningful diagnostic message instead of a generic one.
    let msg = 'Playback error.';
    const isFileProtocol = window.location.protocol === 'file:';

    if (isFileProtocol) {
      // Most common cause on file:// — browser blocks local audio for CORS/security
      msg = 'Open via local server: python -m http.server 8080';
    } else if (audioEl.error) {
      const code = audioEl.error.code;
      // MediaError codes: 1=ABORTED 2=NETWORK 3=DECODE 4=SRC_NOT_SUPPORTED
      if (code === 4) {
        msg = 'Audio format not supported by this browser.';
      } else if (code === 2) {
        msg = 'Network error — file not found or server unreachable.';
      } else if (code === 3) {
        msg = 'Decode error — file may be corrupt.';
      } else {
        msg = 'Could not load audio (error ' + code + ').';
      }
    } else if (err && err.name === 'NotAllowedError') {
      // Autoplay policy — should not happen since we require a user click
      msg = 'Playback blocked — click Play to start.';
    } else {
      const track = getTrack();
      msg = track ? 'Could not load: ' + track.url : 'Audio source missing.';
    }

    if (nowPlayTrack) nowPlayTrack.textContent = msg;
    stopSpinning();
    syncPlayBtn();
    setStatus('error');
  }

  function pauseAudio() {
    audioEl.pause();
    state.isPlaying = false;
    stopSpinning();
    syncPlayBtn();
    setStatus('paused');
  }

  function stopAudio() {
    audioEl.pause();
    audioEl.src = '';
    state.isPlaying = false;
    state.isLoading = false;
    stopSpinning();
    syncPlayBtn();
    resetSeek();
  }

  /* ─── 13. Prev / Next track ────────────────────────────────────── */
  function nextTrack(auto = false) {
    if (!hasTracks) return;

    // Repeat-one re-plays the same track when song ends naturally
    if (state.repeat === 'one' && auto) {
      audioEl.currentTime = 0;
      audioEl.play().then(onPlaySuccess).catch(onPlayError);
      return;
    }

    state.queueIndex++;
    state.trackIndex = state.queueIndex;

    // Refill queue with a new fair Fisher-Yates cycle when current cycle finishes
    if (state.queueIndex >= state.queue.length) {
      const lastTrack = state.queue[state.queue.length - 1];
      const nextCycle = generateShuffledCycle(lastTrack);
      state.queue.push(...nextCycle);
    }

    updateNowPlayingDisplay();
    resetSeek();
    loadAndPlay(state.isPlaying || auto);
  }

  function prevTrack() {
    if (!hasTracks) return;

    // If > 3 seconds in, restart current track
    if (audioEl.currentTime > 3) {
      audioEl.currentTime = 0;
      return;
    }

    // Step backward through playback history in the shuffled queue
    if (state.queueIndex > 0) {
      state.queueIndex--;
      state.trackIndex = state.queueIndex;
      updateNowPlayingDisplay();
      resetSeek();
      loadAndPlay(state.isPlaying);
    } else {
      audioEl.currentTime = 0;
    }
  }

  /* ─── 14. Control event listeners ─────────────────────────────── */
  // Play / Pause
  btnPlay?.addEventListener('click', () => {
    if (!hasTracks || state.isLoading) return;
    // ensureAudioCtx() MUST be called synchronously inside the click handler
    // (a direct user-gesture event), NOT inside a Promise .then() callback.
    // Chrome's autoplay policy only allows AudioContext.resume() from a
    // synchronous user-gesture stack. Calling it here guarantees the context
    // is running before play() hands audio off to the Web Audio graph.
    ensureAudioCtx();
    state.isPlaying ? pauseAudio() : loadAndPlay(true);
  });

  // Prev Track
  btnPrevTrack?.addEventListener('click', () => prevTrack());

  // Next Track
  btnNextTrack?.addEventListener('click', () => nextTrack(false));

  // Mute toggle
  btnMute?.addEventListener('click', () => {
    state.isMuted = !state.isMuted;
    audioEl.volume = state.isMuted ? 0 : state.volume;
    if (volumeSlider) {
      volumeSlider.value = state.isMuted ? 0 : state.volume * 100;
      volumeSlider.style.setProperty('--pct', (state.isMuted ? 0 : state.volume * 100) + '%');
    }
    syncMuteBtn();
  });

  // Repeat
  btnRepeat?.addEventListener('click', () => {
    const modes = ['none', 'all', 'one'];
    const next = modes[(modes.indexOf(state.repeat) + 1) % modes.length];
    state.repeat = next;
    syncRepeatBtn();
    updateNowPlayingDisplay();
  });

  function syncRepeatBtn() {
    if (!btnRepeat) return;
    btnRepeat.classList.remove('active', 'repeat-one');
    if (state.repeat === 'all') {
      btnRepeat.classList.add('active');
      btnRepeat.setAttribute('aria-label', 'Repeat all — click for repeat one');
      btnRepeat.setAttribute('aria-pressed', 'true');
    } else if (state.repeat === 'one') {
      btnRepeat.classList.add('active', 'repeat-one');
      btnRepeat.setAttribute('aria-label', 'Repeat one — click to disable');
      btnRepeat.setAttribute('aria-pressed', 'true');
    } else {
      btnRepeat.setAttribute('aria-label', 'Repeat off — click to repeat all');
      btnRepeat.setAttribute('aria-pressed', 'false');
    }
  }

  /* ─── 15. Audio events ─────────────────────────────────────────── */
  audioEl.addEventListener('timeupdate', () => {
    if (!state.isSeeking && !audioEl.seeking) updateSeek();
  });
  audioEl.addEventListener('durationchange', () => updateSeek());
  audioEl.addEventListener('loadedmetadata', () => updateSeek());
  audioEl.addEventListener('seeking', () => { state.isSeeking = true; });
  audioEl.addEventListener('seeked',  () => { state.isSeeking = false; updateSeek(); });
  audioEl.addEventListener('waiting',  () => { state.isLoading = true;  syncPlayBtn(); setStatus('loading'); });
  audioEl.addEventListener('canplay',  () => { if (state.isLoading) { state.isLoading = false; syncPlayBtn(); } });
  audioEl.addEventListener('playing',  () => {
    state.isPlaying = true;
    state.isLoading = false;
    syncPlayBtn();
    setStatus('playing');
    startSpinning();
  });
  audioEl.addEventListener('pause', () => {
    if (!state.isLoading) setStatus('paused');
  });
  audioEl.addEventListener('ended', () => nextTrack(true));
  audioEl.addEventListener('error', () => {
    // Only fire if we actually tried to load something
    if (audioEl.src && audioEl.src !== window.location.href) {
      onPlayError(audioEl.error);
    }
  });

  /* ─── 16. Web Audio Analyser ───────────────────────────────────── */
  let audioCtx   = null;
  let analyser   = null;
  let dataArray  = null;
  let rafId      = null;
  let bars       = [];

  /**
   * Create (or resume) the AudioContext.
   * MUST be called synchronously from a user-gesture handler so Chrome's
   * autoplay policy allows the context to leave "suspended" state.
   * Safe to call multiple times — only creates the context once.
   */
  function ensureAudioCtx() {
    if (!audioCtx) {
      try {
        audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      } catch (e) {
        console.warn('[Gali FM] AudioContext unavailable:', e);
        return;
      }
    }
    // Resume if suspended — this must happen inside the synchronous
    // click handler path, not inside a Promise .then() callback.
    if (audioCtx.state === 'suspended') {
      audioCtx.resume().catch(e => console.warn('[Gali FM] AudioContext resume failed:', e));
    }
  }

  function buildVisualizer() {
    if (!vizContainer) return;
    vizContainer.innerHTML = '';
    bars = [];
    for (let i = 0; i < 28; i++) {
      const b = document.createElement('div');
      b.className = 'viz-bar';
      vizContainer.appendChild(b);
      bars.push(b);
    }
  }

  function startAnalyser() {
    // Only wire up the Web Audio graph once.
    // If audioCtx already has a media-element source node attached,
    // creating another one throws InvalidStateError — guard with a flag.
    if (!hasTracks || !audioEl || !vizContainer) return;
    if (analyser) {
      // Graph already built; just make sure context is running.
      ensureAudioCtx();
      if (audioCtx && audioCtx.state === 'suspended') {
        audioCtx.resume().catch(() => {});
      }
      tickAnalyser();
      return;
    }
    if (!audioCtx) return; // ensureAudioCtx() must have been called first
    try {
      const src = audioCtx.createMediaElementSource(audioEl);
      analyser  = audioCtx.createAnalyser();
      analyser.fftSize = 64;
      dataArray = new Uint8Array(analyser.frequencyBinCount);
      // Route: audio element → analyser → speakers.
      // Connecting to destination is critical — without it the
      // Web Audio graph is built but sound never reaches the output.
      src.connect(analyser);
      analyser.connect(audioCtx.destination);
      tickAnalyser();
    } catch (e) {
      console.warn('[Gali FM] Web Audio graph setup failed:', e);
      // Tear down partial state so a retry is possible.
      analyser  = null;
      dataArray = null;
    }
  }

  function tickAnalyser() {
    if (!analyser) return;
    rafId = requestAnimationFrame(tickAnalyser);
    analyser.getByteFrequencyData(dataArray);
    if (reducedMotion.matches) return;
    const len = Math.min(bars.length, dataArray.length);
    for (let i = 0; i < len; i++) {
      const v = dataArray[i] / 255;
      bars[i].style.height  = Math.max(4, v * 46) + 'px';
      bars[i].style.opacity = String(0.4 + v * 0.6);
    }
  }

  /* ─── 17. Pointer glow ─────────────────────────────────────────── */
  function setupPointerGlow() {
    if (!playerGlow || !playerArea) return;
    if (reducedMotion.matches) return;
    if (window.matchMedia('(hover: none)').matches) return;
    playerArea.addEventListener('mousemove', e => {
      const r = playerArea.getBoundingClientRect();
      playerGlow.style.setProperty('--mx', ((e.clientX - r.left)  / r.width  * 100).toFixed(1) + '%');
      playerGlow.style.setProperty('--my', ((e.clientY - r.top) / r.height * 100).toFixed(1) + '%');
    });
  }

  /* ─── 18. Keyboard shortcuts ───────────────────────────────────── */
  document.addEventListener('keydown', e => {
    const tag = e.target.tagName;
    // Don't intercept when focus is on form elements (but allow range inputs for seek/vol)
    if (['INPUT', 'TEXTAREA', 'SELECT'].includes(tag) && e.target.type !== 'range') return;
    if (tag === 'BUTTON' || tag === 'A') return;

    switch (e.code) {
      case 'Space':
        e.preventDefault();
        btnPlay?.click();
        break;
      case 'ArrowLeft':
        if (e.shiftKey) { window.location.href = btnPrevStation?.href || '#'; }
        else { e.preventDefault(); prevTrack(); }
        break;
      case 'ArrowRight':
        if (e.shiftKey) { window.location.href = btnNextStation?.href || '#'; }
        else { e.preventDefault(); nextTrack(false); }
        break;
      case 'BracketLeft':  // [ = volume down
        e.preventDefault();
        adjustVolume(-0.05);
        break;
      case 'BracketRight': // ] = volume up
        e.preventDefault();
        adjustVolume(+0.05);
        break;
      case 'KeyM':
        e.preventDefault();
        btnMute?.click();
        break;
      case 'KeyR':
        e.preventDefault();
        if (hasTracks) btnRepeat?.click();
        break;
    }
  });

  function adjustVolume(delta) {
    const v = Math.max(0, Math.min(1, state.volume + delta));
    state.volume = v;
    state.isMuted = (v === 0);
    audioEl.volume = v;
    if (volumeSlider) {
      volumeSlider.value = v * 100;
      volumeSlider.style.setProperty('--pct', (v * 100) + '%');
    }
    syncMuteBtn();
  }

  /* ─── 19. Library loader ───────────────────────────────────────── */
  /**
   * Fetch music-library.json (generated by scan-music.py) and merge its
   * tracks into the station's existing tracks array in-place.
   *
   * Merge rules:
   *   - Library tracks take precedence (include freshly scanned files).
   *   - Deduplication by url — no duplicate entries.
   *   - Tracks only in stations-data.js (not in library) are appended.
   *   - If the fetch fails (file absent or server error) we fall back
   *     silently to whatever stations-data.js already provides.
   */
  async function loadLibrary() {
    try {
      const resp = await fetch('music-library.json?' + Date.now());
      if (!resp.ok) return;
      const lib = await resp.json();

      const slugKey = station.slug || 'ishq-wali-gali';
      const libTracks = lib?.stations?.[slugKey]?.tracks
        || (station.folder && lib?.stations?.[station.folder]?.tracks)
        || lib?.stations?.['deluxe-saloon']?.tracks
        || lib?.stations?.['ishq-wali-gali']?.tracks;
      if (!Array.isArray(libTracks) || libTracks.length === 0) return;

      // Keep hand-authored tracks from stations-data.js that aren't in library
      const libUrls = new Set(libTracks.map(t => t.url));
      const extra   = tracks.filter(t => !libUrls.has(t.url));

      // Mutate in-place (tracks is const but array contents can be changed)
      tracks.length = 0;
      libTracks.forEach(t => tracks.push(t));
      extra.forEach(t => tracks.push(t));
    } catch (_) {
      // Network / parse error — fall back silently to stations-data.js
    }
  }

  /* ─── 20. Init ─────────────────────────────────────────────────── */
  async function init() {
    // Fetch scanned library and merge tracks[] before building the player.
    await loadLibrary();

    // Update outer hasTracks so all guard checks see the correct value.
    hasTracks = tracks.length > 0;

    initQueue();
    populateDom();
    buildVisualizer();
    setupPointerGlow();
    updateNowPlayingDisplay();
    syncPlayBtn();
    syncRepeatBtn();
    setStatus('idle');
    stopSpinning();
    audioEl.volume = state.volume;
    resetSeek();

    // Set seek bar disabled state
    if (seekBar) seekBar.disabled = !hasTracks;

    // Subtle bg zoom-in
    if (playerBg && !reducedMotion.matches) {
      playerBg.style.transform = 'scale(1.04)';
      setTimeout(() => { playerBg.style.transform = 'scale(1)'; }, 100);
    }
  }

  init();

})();
