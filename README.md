# Gali FM

Gali FM is a browser-based radio experience built around seven themed stations inspired by everyday Indian life. It uses HTML, CSS, and JavaScript, with a small Python server for local development.

## Run locally

Python 3 is the only local prerequisite; the server uses the Python standard library.

```bash
python server.py
```

Open [http://localhost:8080](http://localhost:8080). To use another port, pass it as an argument, for example `python server.py 9000`.

## Project files

- `index.html` and `stations.html` — landing page and station browser
- `music-library.json` — station and track metadata
- `assets/stations/` — station artwork
- `music/` — local audio files used during development

## Audio files

The original project contains MP3s that are not included in this public repository because redistribution rights have not been established. The player needs audio files you have permission to use in the corresponding `music/` folders. Without those files, the interface loads but tracks cannot play.

## License

No license is included. Ask the author before reusing or redistributing this project.

