/* Waveform music player */
(function () {
  const $ = (id) => document.getElementById(id);
  const audio = $('audio');
  const el = {
    player: document.querySelector('.player'), bg: $('bg'), cover: $('cover'), title: $('title'), artist: $('artist'),
    album: $('album'), seek: $('seek'), cur: $('current'), dur: $('duration'), play: $('play'), prev: $('prev'),
    next: $('next'), shuffle: $('shuffle'), repeat: $('repeat'), fav: $('fav'), mute: $('mute'), vol: $('volume'),
    autoplay: $('autoplay'), list: $('list'), empty: $('empty'), file: $('file-input')
  };

  const store = {
    get(k, d) { try { const v = localStorage.getItem(k); return v === null ? d : JSON.parse(v); } catch (e) { return d; } },
    set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} }
  };

  // State
  const tracks = TRACKS.map((t, i) => ({ ...t, id: 'd' + i, duration: null }));
  let index = 0, view = 'all', shuffle = false, repeat = 'off'; // off | all | one
  let favs = new Set(store.get('favs', []));
  let lastVolume = store.get('volume', 0.8);
  let history = [];

  const fmt = (s) => {
    if (!isFinite(s)) return '0:00';
    const m = Math.floor(s / 60), sec = Math.floor(s % 60);
    return m + ':' + String(sec).padStart(2, '0');
  };
  const setFill = (input) => {
    const pct = ((input.value - input.min) / (input.max - input.min)) * 100;
    input.style.setProperty('--fill', pct + '%');
  };
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const FALLBACK = "data:image/svg+xml;utf8," + encodeURIComponent(
    "<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><defs><linearGradient id='g' x1='0' y1='0' x2='1' y2='1'><stop offset='0' stop-color='#5b86ff'/><stop offset='1' stop-color='#b36bff'/></linearGradient></defs><rect width='100' height='100' fill='url(#g)'/><text x='50' y='64' font-size='46' text-anchor='middle' fill='white'>♪</text></svg>");

  /* ---------- Rendering ---------- */
  function visibleTracks() {
    return view === 'fav' ? tracks.filter((t) => favs.has(t.id)) : tracks;
  }

  function renderList() {
    const list = visibleTracks();
    el.empty.hidden = list.length > 0;
    el.list.innerHTML = list.map((t) => {
      const i = tracks.indexOf(t);
      return `<li class="track${i === index ? ' active' : ''}${i === index && !audio.paused ? ' playing' : ''}" data-i="${i}" tabindex="0">
        <img src="${esc(t.cover)}" alt="" onerror="this.src='${FALLBACK}'">
        <div class="meta"><div class="t">${esc(t.title)}</div><div class="a">${esc(t.artist)}</div></div>
        <span class="eq"><i></i><i></i><i></i></span>
        <span class="d">${t.duration ? fmt(t.duration) : ''}</span>
        <button class="heart${favs.has(t.id) ? ' on' : ''}" data-fav="${i}" aria-label="Toggle favorite">${favs.has(t.id) ? '♥' : '♡'}</button>
      </li>`;
    }).join('');
  }

  function renderNowPlaying() {
    const t = tracks[index];
    el.title.textContent = t.title;
    el.artist.textContent = t.artist;
    el.album.textContent = t.album || '';
    el.cover.onerror = () => { el.cover.src = FALLBACK; };
    el.cover.src = t.cover;
    el.bg.style.backgroundImage = `url("${t.cover}")`;
    document.title = t.title + ' – ' + t.artist;
    const isFav = favs.has(t.id);
    el.fav.classList.toggle('on', isFav);
    el.fav.textContent = isFav ? '♥' : '♡';
    el.fav.setAttribute('aria-pressed', isFav);
    el.dur.textContent = t.duration ? fmt(t.duration) : '0:00';
    el.cur.textContent = '0:00';
    el.seek.value = 0; setFill(el.seek);
    renderList();
    updateMediaSession();
  }

  function updatePlayState() {
    const playing = !audio.paused;
    el.play.textContent = playing ? '⏸' : '▶';
    el.play.setAttribute('aria-label', playing ? 'Pause' : 'Play');
    el.player.classList.toggle('playing', playing);
    const active = el.list.querySelector('.track.active');
    if (active) active.classList.toggle('playing', playing);
  }

  /* ---------- Playback ---------- */
  function load(i, autoStart) {
    index = (i + tracks.length) % tracks.length;
    audio.src = tracks[index].src;
    renderNowPlaying();
    if (autoStart) play();
  }

  function play() {
    const p = audio.play();
    if (p && p.catch) p.catch(() => updatePlayState());
  }
  const toggle = () => (audio.paused ? play() : audio.pause());

  function nextIndex() {
    if (shuffle && tracks.length > 1) {
      let n; do { n = Math.floor(Math.random() * tracks.length); } while (n === index);
      return n;
    }
    return index + 1;
  }

  function next() { history.push(index); load(nextIndex(), true); }
  function prev() {
    if (audio.currentTime > 3) { audio.currentTime = 0; return; }
    if (shuffle && history.length) load(history.pop(), true);
    else load(index - 1, true);
  }

  function onEnded() {
    if (repeat === 'one') { audio.currentTime = 0; play(); return; }
    const atEnd = !shuffle && index === tracks.length - 1;
    if (atEnd && repeat === 'off') { audio.pause(); audio.currentTime = 0; updatePlayState(); return; }
    if (el.autoplay.checked) next(); else { updatePlayState(); }
  }

  /* ---------- Events ---------- */
  el.play.addEventListener('click', toggle);
  el.next.addEventListener('click', next);
  el.prev.addEventListener('click', prev);

  audio.addEventListener('play', () => { updatePlayState(); });
  audio.addEventListener('pause', updatePlayState);
  audio.addEventListener('ended', onEnded);
  audio.addEventListener('loadedmetadata', () => {
    tracks[index].duration = audio.duration;
    el.dur.textContent = fmt(audio.duration);
    el.seek.max = audio.duration; setFill(el.seek);
    const d = el.list.querySelector(`.track[data-i="${index}"] .d`);
    if (d) d.textContent = fmt(audio.duration);
  });
  audio.addEventListener('timeupdate', () => {
    if (seeking) return;
    el.seek.value = audio.currentTime;
    el.cur.textContent = fmt(audio.currentTime);
    setFill(el.seek);
  });

  // Seeking
  let seeking = false;
  el.seek.addEventListener('input', () => {
    seeking = true;
    el.cur.textContent = fmt(el.seek.value);
    setFill(el.seek);
  });
  el.seek.addEventListener('change', () => {
    audio.currentTime = parseFloat(el.seek.value);
    seeking = false;
  });

  // Volume & mute
  function applyVolume() {
    audio.volume = parseFloat(el.vol.value);
    setFill(el.vol);
    el.mute.textContent = audio.muted || audio.volume === 0 ? '🔇' : audio.volume < 0.5 ? '🔉' : '🔊';
    el.mute.setAttribute('aria-label', audio.muted ? 'Unmute' : 'Mute');
  }
  el.vol.addEventListener('input', () => {
    audio.muted = false;
    applyVolume();
    store.set('volume', audio.volume);
  });
  el.mute.addEventListener('click', () => {
    if (audio.volume === 0) { el.vol.value = lastVolume || 0.5; audio.muted = false; }
    else audio.muted = !audio.muted;
    applyVolume();
  });
  el.vol.value = lastVolume; applyVolume();

  // Shuffle / repeat
  el.shuffle.addEventListener('click', () => {
    shuffle = !shuffle;
    el.shuffle.classList.toggle('on', shuffle);
    el.shuffle.setAttribute('aria-pressed', shuffle);
  });
  el.repeat.addEventListener('click', () => {
    repeat = repeat === 'off' ? 'all' : repeat === 'all' ? 'one' : 'off';
    el.repeat.textContent = repeat === 'one' ? '🔂' : '🔁';
    el.repeat.classList.toggle('on', repeat !== 'off');
    el.repeat.setAttribute('aria-label', 'Repeat: ' + repeat);
    el.repeat.title = 'Repeat: ' + repeat;
  });

  // Favorites
  function toggleFav(i) {
    const id = tracks[i].id;
    favs.has(id) ? favs.delete(id) : favs.add(id);
    store.set('favs', [...favs]);
    renderNowPlaying();
  }
  el.fav.addEventListener('click', () => toggleFav(index));

  // Playlist interactions
  el.list.addEventListener('click', (e) => {
    const heart = e.target.closest('[data-fav]');
    if (heart) { e.stopPropagation(); toggleFav(+heart.dataset.fav); return; }
    const row = e.target.closest('.track');
    if (!row) return;
    const i = +row.dataset.i;
    if (i === index) toggle(); else { history.push(index); load(i, true); }
  });
  el.list.addEventListener('keydown', (e) => {
    if ((e.key === 'Enter' || e.key === ' ') && e.target.classList.contains('track')) {
      e.preventDefault(); e.target.click();
    }
  });
  document.querySelectorAll('.tab').forEach((tab) => tab.addEventListener('click', () => {
    view = tab.dataset.view;
    document.querySelectorAll('.tab').forEach((t) => t.classList.toggle('active', t === tab));
    renderList();
  }));

  // Add local files
  el.file.addEventListener('change', () => {
    [...el.file.files].forEach((f, n) => {
      tracks.push({
        id: 'u' + Date.now() + n, title: f.name.replace(/\.[^.]+$/, ''), artist: 'Local file', album: 'My uploads',
        src: URL.createObjectURL(f), cover: FALLBACK, duration: null
      });
    });
    el.file.value = '';
    renderList();
  });

  // Keyboard shortcuts
  document.addEventListener('keydown', (e) => {
    if (/INPUT|TEXTAREA/.test(e.target.tagName) && e.target.type !== 'range') return;
    if (e.target.classList && e.target.classList.contains('track')) return;
    if (e.code === 'Space' && e.target.tagName !== 'BUTTON') { e.preventDefault(); toggle(); }
    else if (e.code === 'ArrowRight' && e.target.type !== 'range') audio.currentTime = Math.min(audio.duration || 0, audio.currentTime + 5);
    else if (e.code === 'ArrowLeft' && e.target.type !== 'range') audio.currentTime = Math.max(0, audio.currentTime - 5);
    else if (e.key.toLowerCase() === 'n') next();
    else if (e.key.toLowerCase() === 'p') prev();
    else if (e.key.toLowerCase() === 'm') el.mute.click();
  });

  // Media keys / lock-screen controls
  function updateMediaSession() {
    if (!('mediaSession' in navigator)) return;
    const t = tracks[index];
    navigator.mediaSession.metadata = new MediaMetadata({ title: t.title, artist: t.artist, album: t.album || '', artwork: [{ src: t.cover }] });
    navigator.mediaSession.setActionHandler('play', play);
    navigator.mediaSession.setActionHandler('pause', () => audio.pause());
    navigator.mediaSession.setActionHandler('previoustrack', prev);
    navigator.mediaSession.setActionHandler('nexttrack', next);
  }

  load(0, false);
})();
