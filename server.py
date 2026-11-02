"""
Gali FM — Local Development HTTP Server with Byte-Range Support (HTTP 206)
and No-Cache Headers for Immediate Live Updates

Standard library `python -m http.server` does not support HTTP Range requests,
which causes HTML5 audio elements to restart from 0:00 whenever seeking.
This server adds full support for `Range: bytes=start-end` and `Accept-Ranges: bytes`.
It also disables browser caching on dev files so edits reflect immediately upon refresh.

Usage:
    python server.py [port]
    Default port is 8080.
"""

import sys
import os
import re
from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler


class RangeFileWrapper:
    """Wraps a file object to read only a specific range of bytes."""
    def __init__(self, file_obj, length):
        self.file = file_obj
        self.remaining = length

    def read(self, size=-1):
        if self.remaining <= 0:
            return b''
        if size < 0 or size > self.remaining:
            size = self.remaining
        chunk = self.file.read(size)
        self.remaining -= len(chunk)
        return chunk

    def close(self):
        self.file.close()


class RangeHTTPRequestHandler(SimpleHTTPRequestHandler):
    """SimpleHTTPRequestHandler with HTTP 206 Partial Content and No-Cache support."""

    def end_headers(self):
        self.send_header('Accept-Ranges', 'bytes')
        # Prevent browser from caching dev files (HTML, JS, CSS, JSON)
        path_clean = self.path.lower().split('?')[0]
        if any(path_clean.endswith(ext) for ext in ('.html', '.js', '.css', '.json', '.jpg', '.webp', '.png')):
            self.send_header('Cache-Control', 'no-cache, no-store, must-revalidate')
            self.send_header('Pragma', 'no-cache')
            self.send_header('Expires', '0')
        super().end_headers()

    def send_head(self):
        # Bypass 304 Not Modified for code/asset files so browser always gets latest version
        path_clean = self.path.lower().split('?')[0]
        if any(path_clean.endswith(ext) for ext in ('.html', '.js', '.css', '.json')):
            if 'If-Modified-Since' in self.headers:
                del self.headers['If-Modified-Since']
            if 'If-None-Match' in self.headers:
                del self.headers['If-None-Match']

        # If no Range header requested, use default behavior
        if 'Range' not in self.headers:
            return super().send_head()

        path = self.translate_path(self.path)
        if not os.path.isfile(path):
            return super().send_head()

        range_header = self.headers.get('Range', '').strip()
        m = re.match(r'bytes=(\d+)-(\d*)', range_header)
        if not m:
            return super().send_head()

        try:
            file_size = os.path.getsize(path)
            start = int(m.group(1))
            end = int(m.group(2)) if m.group(2) else file_size - 1

            if start >= file_size or end >= file_size or start > end:
                self.send_error(416, 'Requested Range Not Satisfiable')
                self.send_header('Content-Range', f'bytes */{file_size}')
                self.end_headers()
                return None

            self.send_response(206)
            ctype = self.guess_type(path)
            self.send_header('Content-Type', ctype)
            self.send_header('Content-Range', f'bytes {start}-{end}/{file_size}')
            self.send_header('Content-Length', str(end - start + 1))
            self.send_header('Last-Modified', self.date_time_string(os.path.getmtime(path)))
            self.end_headers()

            f = open(path, 'rb')
            f.seek(start)
            return RangeFileWrapper(f, end - start + 1)
        except Exception:
            return super().send_head()


def run(port=8080):
    server_address = ('', port)
    httpd = ThreadingHTTPServer(server_address, RangeHTTPRequestHandler)
    print(f'[Gali FM] Server with audio seeking (HTTP 206) running on http://localhost:{port}/')
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        print('\n[Gali FM] Server stopped.')
        httpd.server_close()


if __name__ == '__main__':
    port = int(sys.argv[1]) if len(sys.argv) > 1 else 8080
    run(port)
