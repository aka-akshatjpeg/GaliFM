#!/usr/bin/env python3
"""
Gali FM — scan-music.py
=======================
Scans every station's music folder and writes music-library.json.

Usage:
    python scan-music.py

Workflow:
    1. Drop MP3/OGG/WAV/M4A/FLAC files into  music/<station-slug>/
    2. Run:  python scan-music.py
    3. Refresh the browser — tracks appear automatically.

The player (player-page.js) fetches music-library.json at startup and
merges the tracks with whatever is already in stations-data.js.
If music-library.json does not exist the player falls back gracefully
to stations-data.js only.

Notes:
    - Deduplication key: the 'url' field (relative path, forward slashes).
    - Sort order: alphabetical by filename within each station.
    - Optional ID3 metadata via mutagen (pip install mutagen).
      If mutagen is absent the script falls back to filename-derived titles.
    - This script NEVER modifies stations-data.js.
"""

import json
import os
import sys
import re
from datetime import datetime, timezone

# ── Configuration ──────────────────────────────────────────────────────────────

STATION_SLUGS = [
    'deluxe-saloon',
    'bus-driver',
    'bhojpuri-bangers',
    'bartan-time',
    'raju-mistri',
    'papa-ke-gaane',
    'corporate-majdoor',
]

SLUG_ALIASES = {
    'deluxe-saloon': 'ishq-wali-gali',
    'bus-driver': 'bus-wale-bhaiya',
    'bhojpuri-bangers': 'bhojpuri-bawaal',
    'bartan-time': 'bartan-ka-samay',
    'raju-mistri': 'chandan-mistri',
    'papa-ke-gaane': 'chatpate-gaane',
    'corporate-majdoor': 'haryanvi-bangers',
}

AUDIO_EXTENSIONS = {'.mp3', '.ogg', '.wav', '.m4a', '.flac', '.aac'}

MUSIC_ROOT   = 'music'          # relative to project root
OUTPUT_FILE  = 'music-library.json'

# ── Helpers ────────────────────────────────────────────────────────────────────

def filename_to_title(name: str) -> str:
    """Convert a filename (without extension) to a display title."""
    # Replace hyphens/underscores with spaces, then title-case
    title = re.sub(r'[-_]+', ' ', name).strip()
    # Remove leading track numbers like "01 " or "01. "
    title = re.sub(r'^\d+[\.\s]+', '', title)
    # Title-case the result
    return title.title()


def read_metadata(filepath: str) -> dict:
    """
    Try to read ID3/Vorbis/MP4 metadata via mutagen.
    Falls back to filename-derived values if mutagen is not installed
    or the file has no embedded tags.
    """
    name_no_ext = os.path.splitext(os.path.basename(filepath))[0]
    fallback = {
        'title':  filename_to_title(name_no_ext),
        'artist': '',
    }

    try:
        from mutagen import File as MutaFile
        audio = MutaFile(filepath, easy=True)
        if audio is None:
            return fallback
        tags = audio.tags or {}

        title  = (tags.get('title')  or [''])[0].strip()
        artist = (tags.get('artist') or [''])[0].strip()

        return {
            'title':  title  if title  else fallback['title'],
            'artist': artist if artist else '',
        }
    except ImportError:
        pass  # mutagen not installed — use filename fallback
    except Exception:
        pass  # corrupt/unsupported file — use filename fallback

    return fallback


def scan_station(slug: str, project_root: str) -> list:
    """
    Scan the music/<slug>/ folder and return a list of track dicts
    sorted alphabetically by filename.
    """
    folder = os.path.join(project_root, MUSIC_ROOT, slug)
    if not os.path.isdir(folder):
        return []

    tracks = []
    for filename in sorted(os.listdir(folder), key=lambda f: f.lower()):
        ext = os.path.splitext(filename)[1].lower()
        if ext not in AUDIO_EXTENSIONS:
            continue

        filepath = os.path.join(folder, filename)
        meta     = read_metadata(filepath)

        # URL: relative path with forward slashes (works in any browser)
        url = '/'.join([MUSIC_ROOT, slug, filename])

        tracks.append({
            'title':  meta['title'],
            'artist': meta['artist'],
            'url':    url,
        })

    return tracks


def load_existing_library(output_path: str) -> dict:
    """Load an existing music-library.json, or return a blank structure."""
    if os.path.isfile(output_path):
        try:
            with open(output_path, 'r', encoding='utf-8') as f:
                data = json.load(f)
            if isinstance(data, dict) and 'stations' in data:
                return data
        except Exception:
            pass
    return {'stations': {}}


def merge_tracks(existing: list, fresh: list) -> list:
    """
    Merge fresh (scanned) tracks into existing (previously saved) tracks.

    Rules:
        - Deduplication key: 'url' (normalised to forward slashes).
        - Fresh scan takes priority for metadata (title, artist).
        - Tracks that are in existing but no longer in the folder are REMOVED
          (they may have been deleted; keeping stale entries is confusing).
        - Final order: alphabetical by url.
    """
    # Build a set of URLs from the fresh scan
    fresh_urls = {t['url'] for t in fresh}

    # Existing tracks NOT in fresh scan are dropped (file was deleted)
    # existing_by_url gives us any manual metadata the user may have added
    existing_by_url = {t['url']: t for t in existing}

    merged = []
    for track in fresh:
        url = track['url']
        if url in existing_by_url:
            # Prefer existing metadata only if the fresh metadata is empty/generic
            old = existing_by_url[url]
            merged.append({
                'title':    track['title']  or old.get('title', ''),
                'artist':   track['artist'] or old.get('artist', ''),
                'url':      url,
                # Preserve manually set duration if present
                **({'duration': old['duration']} if 'duration' in old else {}),
            })
        else:
            merged.append(track)

    return sorted(merged, key=lambda t: t['url'].lower())


# ── Main ───────────────────────────────────────────────────────────────────────

def main():
    # Resolve the project root (the directory containing this script)
    project_root = os.path.dirname(os.path.abspath(__file__))
    output_path  = os.path.join(project_root, OUTPUT_FILE)

    print('\nGali FM — Music Library Scanner')
    print('=' * 40)

    # Check whether mutagen is available
    try:
        import mutagen  # noqa: F401
        print('mutagen found — reading ID3/tag metadata.')
    except ImportError:
        print('mutagen not installed — using filename-derived titles.')
        print('  (pip install mutagen for richer metadata)')
    print()

    existing_library = load_existing_library(output_path)
    new_library = {
        'stations':  {},
        'generated': datetime.now(timezone.utc).isoformat(timespec='seconds'),
    }

    total_tracks = 0

    for slug in STATION_SLUGS:
        existing_tracks = existing_library.get('stations', {}).get(slug, {}).get('tracks', [])
        fresh_tracks    = scan_station(slug, project_root)
        merged          = merge_tracks(existing_tracks, fresh_tracks)

        new_library['stations'][slug] = {'tracks': merged}
        alias = SLUG_ALIASES.get(slug)
        if alias:
            new_library['stations'][alias] = {'tracks': merged}

        added = len([t for t in merged if t['url'] not in {e['url'] for e in existing_tracks}])
        removed = len([t for t in existing_tracks if t['url'] not in {f['url'] for f in fresh_tracks}])
        total_tracks += len(merged)

        status_parts = [f'{len(merged)} track(s)']
        if added:
            status_parts.append(f'+{added} new')
        if removed:
            status_parts.append(f'-{removed} removed')

        print(f'  {slug:<22}  {", ".join(status_parts)}')

    # Write the output file
    with open(output_path, 'w', encoding='utf-8') as f:
        json.dump(new_library, f, ensure_ascii=False, indent=2)

    print()
    print(f'Wrote {output_path}')
    print(f'Total tracks across all stations: {total_tracks}')
    print()
    print('Now refresh the browser — all tracks will appear in the player.')
    print()


if __name__ == '__main__':
    main()
