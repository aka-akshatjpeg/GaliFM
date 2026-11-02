# Gali FM — Local Music Library Guide

> This file explains how to add your own MP3 files to Gali FM and configure playlists for each station.

---

## Folder Structure

```
Gali FM/
├── music/
│   ├── deluxe-saloon/        ← Drop MP3s for Deluxe Saloon here
│   ├── bus-driver/           ← Drop MP3s for Bus Driver here
│   ├── bhojpuri-bangers/     ← Drop MP3s for Bhojpuri Bangers here
│   ├── bartan-time/          ← Drop MP3s for Bartan Time here
│   ├── raju-mistri/          ← Drop MP3s for Raju Mistri here
│   ├── papa-ke-gaane/        ← Drop MP3s for Papa Ke Gaane here
│   └── corporate-majdoor/    ← Drop MP3s for Corporate Majdoor here
├── stations-data.js          ← Edit this to configure playlists
├── player-page.js            ← Shared player logic (do not edit)
├── player.css                ← Shared player styles (do not edit)
└── ...
```

---

## Step-by-Step: Adding Tracks

### Step 1 — Place your audio files

Copy your licensed MP3 files into the correct station subfolder under `music/`.

**Example:**
```
music/
  deluxe-saloon/
    dum-maro-dum.mp3
    yeh-sham-mastani.mp3
    old-bollywood-mix.mp3
```

> **Tip:** Use lowercase filenames with hyphens and no spaces.  
> Supported formats: `.mp3` (recommended), `.ogg`, `.m4a`, `.flac`

---

### Step 2 — Edit `stations-data.js`

Open `stations-data.js` and find the station you want to configure.

Each station has a `tracks: []` array. Add an object for each file:

```js
tracks: [
  {
    title:    'Dum Maro Dum',
    artist:   'R.D. Burman',
    url:      'music/deluxe-saloon/dum-maro-dum.mp3',
    duration: 241,   // optional — seconds as integer
  },
  {
    title:    'Yeh Sham Mastani',
    artist:   'Kishore Kumar',
    url:      'music/deluxe-saloon/yeh-sham-mastani.mp3',
    duration: 189,
  },
],
```

> **Important:**
> - The `url` path is **relative to the project root** (i.e. the folder containing `index.html`).
> - Use forward slashes even on Windows.
> - `duration` is optional. If omitted, the player reads it from the audio file automatically.
> - **Never put tracks from one station inside another station's `tracks` array.** The player enforces station isolation automatically.

---

### Step 3 — Open the station in your browser

Open `ishq-wali-gali.html` (or the relevant station page) in your browser.

Press **Play**. The track should begin loading. The seek bar, track counter, and visualizer bars will all activate.

---

## Player Controls Reference

| Control | Button | Keyboard |
|---|---|---|
| Play / Pause | ▶ / ⏸ (amber circle) | `Space` |
| Previous track | ⏮ | `←` |
| Next track | ⏭ | `→` |
| Prev station | Prev station link | `Shift + ←` |
| Next station | Next station link | `Shift + →` |
| Mute / Unmute | 🔊 icon | `M` |
| Volume up/down | Volume slider | `]` / `[` |
| Shuffle on/off | 🔀 toggle | `S` |
| Repeat cycle | 🔁 toggle | `R` |

**Repeat modes** (click 🔁 to cycle):
- **Off** — plays playlist once, then stops.
- **Repeat all** — loops the full playlist.
- **Repeat one** — loops the current track (badge "1" appears on button).

---

## Adding a Live Stream

To configure a live internet radio stream instead of local files:

```js
tracks: [
  {
    title:    'Live Stream',
    artist:   'Gali FM',
    url:      'https://your-icecast-server.example.com/stream.mp3',
    isStream: true,
  },
],
```

> When `isStream: true`, the seek bar is hidden automatically since streams have no duration.

---

## Serving the Site (Required for Local Playback)

**Browsers block local audio loading when opening HTML files directly** (the `file://` protocol).

You must serve the project from a local HTTP server:

### Option A — Python (included server.py — supports audio seeking)
```bash
# Inside the Gali FM project folder:
python server.py 8080
# Then open: http://localhost:8080/stations.html
```
*(Supports HTTP 206 Byte Ranges so you can scrub/seek audio smoothly without restarting).*

### Option B — Node.js `serve`
```bash
npx serve .
# Then open the URL it prints
```

### Option C — VS Code Live Server extension
Install the **Live Server** extension, right-click `index.html` → **Open with Live Server**.

---

## Troubleshooting

| Problem | Fix |
|---|---|
| "Could not load audio" error | Check that the file path in `stations-data.js` exactly matches the file name (case-sensitive). |
| Seek bar stays at `--:--` | The file hasn't loaded yet, or the path is wrong. Check browser console for 404 errors. |
| No sound on Safari/iOS | Safari prefers `.m4a` (AAC) files. Convert MP3 to M4A or serve both. |
| Play button is disabled (grey) | The `tracks` array for this station is empty in `stations-data.js`. |
| Visualizer bars don't move | Web Audio API requires HTTPS or `localhost`. Use a local server. Also fires only when audio is actually playing. |
| Files load from wrong station | Each station HTML has a hardcoded `window.STATION_ID`. Do not edit that value. |

---

## File Manifest — What Was Created or Modified

| File | Status | Purpose |
|---|---|---|
| `music/deluxe-saloon/` | **Created** | Audio folder for Deluxe Saloon |
| `music/bus-driver/` | **Created** | Audio folder for Bus Driver |
| `music/bhojpuri-bangers/` | **Created** | Audio folder for Bhojpuri Bangers |
| `music/bartan-time/` | **Created** | Audio folder for Bartan Time |
| `music/raju-mistri/` | **Created** | Audio folder for Raju Mistri |
| `music/papa-ke-gaane/` | **Created** | Audio folder for Papa Ke Gaane |
| `music/corporate-majdoor/` | **Created** | Audio folder for Corporate Majdoor |
| `stations-data.js` | **Modified** | Added `slug` field, detailed `tracks` instructions, local path format |
| `player-page.js` | **Modified** | Full rewrite: prev/next track, shuffle, repeat, seek bar, volume slider, track counter |
| `player.css` | **Modified** | Added CSS for range inputs, seek bar, volume row, shuffle/repeat toggles, track counter |
| `ishq-wali-gali.html` | **Maintained** | Station listening page (Ishq Wali Gali) |
| `bus-wale-bhaiya.html` | **Maintained** | Station listening page (Bus Wale Bhaiya) |
| `bhojpuri-bawaal.html` | **Maintained** | Station listening page (Bhojpuri Bawaal) |
| `bartan-ka-samay.html` | **Maintained** | Station listening page (Bartan Ka Samay) |
| `chandan-mistri.html` | **Maintained** | Station listening page (Chandan Mistri) |
| `chatpate-gaane.html` | **Maintained** | Station listening page (Chatpate Gaane) |
| `haryanvi-bangers.html` | **Maintained** | Station listening page (Haryanvi Bangers) |
| `README-MUSIC.md` | **Created** | This guide |
