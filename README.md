# Waveform – Web Music Player

A stylish, responsive music player in plain HTML, CSS and JavaScript (no build step, no dependencies).

## Run it
Open `index.html` in a modern browser, or serve the folder:

```bash
python3 -m http.server 8000
# visit http://localhost:8000
```

## Features
- Play / Pause, Next, Previous
- Title, artist, album artwork and duration
- Progress bar with seeking and live current time
- Volume slider and mute (remembered between visits)
- Responsive layout for desktop and mobile
- Bonus: playlist, shuffle, repeat (off / all / one), autoplay, favorites (saved in localStorage), add your own local audio files
- Keyboard shortcuts: Space play/pause, ← / → seek 5s, N next, P previous, M mute
- Media-key / lock-screen support via the Media Session API

## Use your own songs
Edit `js/tracks.js` and point `src` and `cover` to your files, e.g.:

```js
{ title: "My Song", artist: "Me", album: "Demo", src: "audio/my-song.mp3", cover: "img/cover.jpg" }
```

The sample tracks stream from soundhelix.com and artwork from picsum.photos, so an internet connection is needed for the demo content.
