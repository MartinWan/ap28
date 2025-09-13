// Bollywood Dance Game v8 — dual music, dual photo sets, file:// friendly
const $ = sel => document.querySelector(sel);
const $$ = sel => document.querySelectorAll(sel);

const KEYS_P1 = ['a','s','d','f'];
const KEYS_P2 = ['j','k','l',';'];

const state = {
  ctx: null, src: null, trackBuf: null, isPlaying: false, startTime: 0, pauseTime: 0,
  bpm: 120, notes: [], mode: '1p', scores: [0,0], lastSpawn: 0, spawnInt: 500,
  hitWindow: { perfect: 100, good: 180 },
  // Media-element playback support for file://
  useMedia: false, mediaEl: null,
};

// Elements
const enterBtn = $('#enterBtn');
const splash = $('#splash');
const game = $('#game');
const bpmSlider = $('#bpm');
const bpmVal = $('#bpmVal');
const photoAstha = $('#photoAstha');
const photoMartin = $('#photoMartin');
const charAstha = $('#charAstha');
const charMartin = $('#charMartin');
const playPause = $('#playPause');
const restartBtn = $('#restart');
const dropTest = $('#dropTest');
const bgSelect = $('#bgSelect');
const bgImg = $('#bg');
const modeSelect = $('#modeSelect');
const score1 = $('#score1');
const score2 = $('#score2');
const popup = $('#popup');
const splashMusicFile = $('#splashMusicFile');
const gameMusicFile = $('#gameMusicFile');
const bgPhotosInput = $('#bgPhotosInput');
const polaroidPhotosInput = $('#polaroidPhotosInput');

// Results overlay
const resultsOverlay = $('#resultsOverlay');
const resultsGallery = $('#resultsGallery');
const resultsClose = $('#resultsClose');

// Splash music
let splashAudio = null;
let splashAudioUrl = null;
function TrueBool(){ return true; }

window.addEventListener('load', () => {
  if (resultsOverlay) resultsOverlay.classList.add('hidden');
  initSplashMusic();
  showPopup('Load music or press Enter to start!', 'good');
  tryLoadManifest().then(ok => { if (ok) startSlideshowIfReady(); });
});

function showAutoplayNotice(){ const n = $('#autoplayNotice'); if(n) n.classList.remove('hidden'); }
function hideAutoplayNotice(){ const n = $('#autoplayNotice'); if(n) n.classList.add('hidden'); }

async function initSplashMusic() {
  splashAudio = new Audio();
  splashAudio.loop = TrueBool();
  if (splashAudioUrl) splashAudio.src = splashAudioUrl;
  else if (window.location.protocol === 'file:') splashAudio.src = 'assets/splash_theme.mp3';
  else {
    try { const res = await fetch('assets/splash_theme.mp3', {cache:'no-store'});
      if (res.ok) { const blob = await res.blob(); splashAudioUrl = URL.createObjectURL(blob); splashAudio.src = splashAudioUrl; }
    } catch {}
  }
  try { await splashAudio.play(); hideAutoplayNotice(); }
  catch { showAutoplayNotice();
    const unlock = async () => { hideAutoplayNotice(); try{ await splashAudio.play(); }catch{}; window.removeEventListener('pointerdown', unlock); window.removeEventListener('keydown', unlock); };
    window.addEventListener('pointerdown', unlock, { once: true });
    window.addEventListener('keydown', unlock, { once: true });
  }
}

splashMusicFile?.addEventListener('change', () => {
  const f = splashMusicFile.files?.[0]; if (!f) return;
  if (splashAudioUrl) URL.revokeObjectURL(splashAudioUrl);
  splashAudioUrl = URL.createObjectURL(f);
  try { splashAudio.pause(); } catch {}
  initSplashMusic();
});

// Game music
let gameAudioBlob = null;
async function initGameMusic() {
  if (window.location.protocol === 'file:') state.useMedia = true;
  if (state.useMedia) {
    if (!state.mediaEl) state.mediaEl = new Audio();
    if (gameAudioBlob) {
      state.mediaEl.src = URL.createObjectURL(gameAudioBlob);
    } else if (window.location.protocol === 'file:') {
      state.mediaEl.src = 'assets/game_song.mp3';
    } else {
      try { const res = await fetch('assets/game_song.mp3', {cache:'no-store'});
        if (res.ok) state.mediaEl.src = URL.createObjectURL(await res.blob());
      } catch {}
    }
    state.mediaEl.preload = 'auto';
    return;
  }
  if (!state.ctx) state.ctx = new (window.AudioContext || window.webkitAudioContext)();
  if (gameAudioBlob) {
    const arr = await gameAudioBlob.arrayBuffer();
    state.trackBuf = await state.ctx.decodeAudioData(arr);
  } else {
    try { const res = await fetch('assets/game_song.mp3', {cache:'no-store'});
      if (res.ok) { const arr = await res.arrayBuffer(); state.trackBuf = await state.ctx.decodeAudioData(arr); }
    } catch {}
    if (!state.trackBuf) state.trackBuf = buildBirthdayBeat(90, 120);
  }
}
gameMusicFile?.addEventListener('change', async () => {
  const f = gameMusicFile.files?.[0]; if (!f) return;
  gameAudioBlob = f; state.useMedia = true; await initGameMusic();
  if (state.isPlaying) { if (state.useMedia && state.mediaEl) { try { state.mediaEl.pause(); } catch{} } else { try { state.src.stop(); } catch{} } state.pauseTime = 0; play(); bindSongEndEvents(); }
});

// Image loaders
function readImage(input, targetImg) { const f = input.files?.[0]; if (!f) return; targetImg.src = URL.createObjectURL(f); }
photoAstha.addEventListener('change', () => readImage(photoAstha, charAstha));
photoMartin.addEventListener('change', () => readImage(photoMartin, charMartin));

// Header controls
bpmSlider.addEventListener('input', () => { state.bpm = +bpmSlider.value; bpmVal.textContent = state.bpm; state.spawnInt = (60/state.bpm)*1000; });
bgSelect.addEventListener('change', () => { bgImg.src = bgSelect.value === 'sf' ? 'assets/placeholders/bg_sf.svg' : 'assets/placeholders/bg_fremont.svg'; });
modeSelect.addEventListener('change', () => { state.mode = modeSelect.value; $$('.lane.p2').forEach(el => el.style.display = state.mode==='2p' ? '' : 'none'); $('.score.two').style.display = state.mode==='2p' ? '' : 'none'; });
modeSelect.dispatchEvent(new Event('change'));

// --- Photo system: separate sets ---
let bgPhotoURLs = [];      // slideshow
let polaroidPhotoURLs = []; // polaroids
const slideshowIntervalMs = 4000;

async function tryLoadManifest() {
  const bg = Array.isArray(window.BACKGROUND_MANIFEST) ? window.BACKGROUND_MANIFEST : [];
  const pol = Array.isArray(window.POLAROID_MANIFEST) ? window.POLAROID_MANIFEST : [];
  if (bg.length || pol.length) {
    bgPhotoURLs = bg.map(n => n.startsWith('http') || n.startsWith('blob:') ? n : ('assets/photos/' + n));
    polaroidPhotoURLs = pol.map(n => n.startsWith('http') || n.startsWith('blob:') ? n : ('assets/photos/' + n));
    return true;
  }
  if (Array.isArray(window.PHOTO_MANIFEST) && window.PHOTO_MANIFEST.length) {
    const arr = window.PHOTO_MANIFEST.map(n => n.startsWith('http') || n.startsWith('blob:') ? n : ('assets/photos/' + n));
    bgPhotoURLs = arr.slice(); polaroidPhotoURLs = arr.slice(); return true;
  }
  // Optional http(s) JSON fallback
  if (location.protocol==='http:' || location.protocol==='https:') {
    try { const res = await fetch('assets/photos/manifest.json', {cache:'no-store'});
      if (res.ok) { const data = await res.json();
        if (Array.isArray(data?.background)) bgPhotoURLs = data.background.map(n=>'assets/photos/'+n);
        if (Array.isArray(data?.polaroids)) polaroidPhotoURLs = data.polaroids.map(n=>'assets/photos/'+n);
        if (!bgPhotoURLs.length && Array.isArray(data?.photos)) bgPhotoURLs = data.photos.map(n=>'assets/photos/'+n);
        if (!polaroidPhotoURLs.length && Array.isArray(data?.photos)) polaroidPhotoURLs = data.photos.map(n=>'assets/photos/'+n);
        return (bgPhotoURLs.length || polaroidPhotoURLs.length);
      }
    } catch {}
  }
  return false;
}

let slideTimer = null;
function startSlideshowIfReady() {
  if (!bgPhotoURLs.length) return;
  let i = 0;
  const setSlide = () => { $('#bg').src = bgPhotoURLs[i % bgPhotoURLs.length]; i++; };
  setSlide();
  if (slideTimer) clearInterval(slideTimer);
  slideTimer = setInterval(setSlide, slideshowIntervalMs);
}

// Folder pickers
bgPhotosInput?.addEventListener('change', () => {
  const files = [...(bgPhotosInput.files || [])].filter(f => f.type.startsWith('image/'));
  if (!files.length) return;
  for (const u of bgPhotoURLs) { if (typeof u==='string' && u.startsWith('blob:')) { try{ URL.revokeObjectURL(u) }catch{} } }
  bgPhotoURLs = files.map(f => URL.createObjectURL(f));
  startSlideshowIfReady();
});
polaroidPhotosInput?.addEventListener('change', () => {
  const files = [...(polaroidPhotosInput.files || [])].filter(f => f.type.startsWith('image/'));
  if (!files.length) return;
  for (const u of polaroidPhotoURLs) { if (typeof u==='string' && u.startsWith('blob:')) { try{ URL.revokeObjectURL(u) }catch{} } }
  polaroidPhotoURLs = files.map(f => URL.createObjectURL(f));
});

// Polaroids
function spawnPolaroid() {
  const pool = polaroidPhotoURLs.length ? polaroidPhotoURLs : bgPhotoURLs;
  if (!pool.length) return;
  const url = pool[Math.floor(Math.random()*pool.length)];
  const stage = $('#stage');
  const pol = document.createElement('div');
  pol.className = 'polaroid';
  pol.style.left = Math.floor(10 + Math.random()*80) + '%';
  pol.style.setProperty('--rot', (Math.random()*8-4)+'deg');
  const img = document.createElement('img'); img.src = url; pol.appendChild(img);
  stage.appendChild(pol);
  setTimeout(()=>pol.remove(), 2800);
}

// Results
function showResults() {
  if (!resultsOverlay) return;
  resultsGallery.innerHTML = '';
  const sample = (bgPhotoURLs.length || polaroidPhotoURLs.length) ? [...bgPhotoURLs, ...polaroidPhotoURLs] : [$('#charAstha').src, $('#charMartin').src];
  for (const u of sample) { const im = document.createElement('img'); im.src = u; resultsGallery.appendChild(im); }
  resultsOverlay.classList.remove('hidden');
}
resultsClose?.addEventListener('click', () => { resultsOverlay.classList.add('hidden'); restart(); });

function bindSongEndEvents() {
  if (state.useMedia && state.mediaEl) state.mediaEl.onended = () => { state.isPlaying=false; showResults(); };
  else if (state.src) state.src.onended = () => { state.isPlaying=false; showResults(); };
}

// Keys & game loop
document.addEventListener('keydown', (e) => {
  if (e.code === 'Space') { e.preventDefault(); if (state.isPlaying) pause(); else play(); }
  else if (e.key.toLowerCase() === 'r') { restart(); }
  else { handleKey(e.key.toLowerCase()); }
});

function play() {
  if (state.useMedia) {
    if (!state.mediaEl) return;
    const offset = state.pauseTime || 0; try { state.mediaEl.currentTime = offset; } catch{}
    state.mediaEl.play().catch(()=>{}); state.isPlaying = true; playPause.textContent = 'Pause'; bindSongEndEvents(); return;
  }
  if (!state.ctx) state.ctx = new (window.AudioContext || window.webkitAudioContext)();
  if (!state.trackBuf) { genClickTrack(); return; }
  if (state.isPlaying) return;
  state.src = state.ctx.createBufferSource();
  state.src.buffer = state.trackBuf;
  state.src.connect(state.ctx.destination);
  const offset = state.pauseTime || 0;
  state.startTime = state.ctx.currentTime - offset;
  state.src.start(0, offset);
  state.isPlaying = true;
  playPause.textContent = 'Pause';
  bindSongEndEvents();
}

function pause() {
  if (!state.isPlaying) return;
  if (state.useMedia && state.mediaEl) { state.mediaEl.pause(); state.pauseTime = state.mediaEl.currentTime; }
  else { state.src.stop(); state.pauseTime = state.ctx.currentTime - state.startTime; }
  state.isPlaying = false; playPause.textContent = 'Play';
}

function restart() {
  if (state.isPlaying) { if (state.useMedia && state.mediaEl) { try{ state.mediaEl.pause(); }catch{} } else { try{ state.src.stop(); }catch{} } }
  state.pauseTime = 0; state.isPlaying = false;
  state.notes.forEach(n => n.el.remove()); state.notes = []; state.lastSpawn = 0;
  play();
}
playPause.addEventListener('click', () => { if (state.isPlaying) pause(); else play(); });
restartBtn.addEventListener('click', restart);

// Enter button
enterBtn.addEventListener('click', (e) => {
  e.preventDefault();
  splash.classList.add('hidden'); splash.style.display='none'; game.classList.remove('hidden');
  window.scrollTo({top:0, behavior:'auto'}); try { splashAudio && splashAudio.pause(); } catch{}
  initGameMusic().then(() => { if (state.isPlaying) { try { state.src.stop(); } catch{} } state.pauseTime=0; play(); bindSongEndEvents(); });
});

// Notes / lanes
const laneEls = $$('.lane');
const fallDuration = 2500;
function spawnNote(laneIdx, targetTime) {
  const lane = laneEls[laneIdx]; const note = document.createElement('div'); note.className='note'; note.dataset.lane = laneIdx; lane.appendChild(note);
  note.style.animationDuration = fallDuration + 'ms';
  const obj = { el: note, laneIdx, targetTime, hit:false, removed:false }; state.notes.push(obj);
  setTimeout(() => { if (!obj.hit && !obj.removed) feedback('Miss','miss'); obj.removed = true; note.remove(); }, fallDuration + 1200);
}

function audioTimeMs() {
  if (state.useMedia && state.mediaEl) return ((state.mediaEl?.currentTime)||state.pauseTime||0)*1000;
  if (!state.ctx) return 0; if (!state.isPlaying) return state.pauseTime*1000;
  return (state.ctx.currentTime - state.startTime)*1000;
}

function handleKey(key) {
  const idx1 = KEYS_P1.indexOf(key), idx2 = KEYS_P2.indexOf(key);
  let laneIdx = -1; if (idx1!==-1) laneIdx=idx1; else if (idx2!==-1) laneIdx = idx2+4; if (laneIdx===-1) return;
  const notes = state.notes.filter(n => n.laneIdx===laneIdx && !n.hit && !n.removed);
  if (!notes.length) { feedback('Miss','miss'); return; }
  const now = audioTimeMs(); notes.sort((a,b)=>Math.abs(a.targetTime-now)-Math.abs(b.targetTime-now));
  const n = notes[0]; const dt = Math.abs(n.targetTime-now);
  if (dt <= state.hitWindow.perfect) { n.hit=true; n.el.remove(); n.removed=true; addScore(laneIdx<4?0:1,1000); kickDance(laneIdx<4?'A':'M'); feedback('Perfect!','perfect'); spawnPolaroid(); }
  else if (dt <= state.hitWindow.good) { n.hit=true; n.el.remove(); n.removed=true; addScore(laneIdx<4?0:1,500); kickDance(laneIdx<4?'A':'M'); feedback('Good','good'); }
  else feedback('Miss','miss');
}

function addScore(playerIdx, amt){ state.scores[playerIdx]+=amt; score1.textContent=state.scores[0]; score2.textContent=state.scores[1]; }
function kickDance(which){ const el = which==='A'?charAstha:charMartin; el.classList.remove('dance'); void el.offsetWidth; el.classList.add('dance'); }
function feedback(text, cls){ popup.className=''; popup.textContent=text; popup.classList.add('show',cls); clearTimeout(popup._t); popup._t=setTimeout(()=>popup.classList.remove('show',cls), 400); }

dropTest.addEventListener('click', () => {
  const now = audioTimeMs(); const l1=[0,1,2,3], l2=[4,5,6,7];
  for (let i=0;i<8;i++){ spawnNote(l1[Math.floor(Math.random()*4)], now+fallDuration+i*250); }
  if (state.mode==='2p') for (let i=0;i<8;i++){ spawnNote(l2[Math.floor(Math.random()*4)], now+fallDuration+i*250); }
});

// Clock/spawn loop
bpmVal.textContent = state.bpm; state.spawnInt = (60/state.bpm)*1000;
function tick(){ const now = performance.now(); if (state.isPlaying){ if (!state.lastSpawn) state.lastSpawn = now; if (now - state.lastSpawn >= state.spawnInt){ const lanes1=[0,1,2,3], lanes2=[4,5,6,7]; const picks=[lanes1[Math.floor(Math.random()*4)]]; if (state.mode==='2p') picks.push(lanes2[Math.floor(Math.random()*4)]); const t = audioTimeMs()+fallDuration; picks.forEach(l=>spawnNote(l,t)); state.lastSpawn = now; } } requestAnimationFrame(tick); }
requestAnimationFrame(tick);

// Fallback synthetic beat (if needed for WebAudio route)
function buildBirthdayBeat(durationSec=60, bpm=126) {
  if (!state.ctx) state.ctx = new (window.AudioContext || window.webkitAudioContext)();
  const sr = state.ctx.sampleRate; const len = Math.floor(durationSec*sr); const buf = state.ctx.createBuffer(1, len, sr); const data = buf.getChannelData(0); const beat=Math.floor((60/bpm)*sr);
  for (let i=0;i<len;i+=beat){ for (let j=0;j<Math.min(200,len-i); j++){ data[i+j]+= Math.exp(-j/70)*0.6; } }
  let m=0; for(let i=0;i<len;i++) m=Math.max(m, Math.abs(data[i])); if (m>0) for(let i=0;i<len;i++) data[i]*=0.9/m;
  return buf;
}
function genClickTrack(){ if (!state.ctx) state.ctx = new (window.AudioContext || window.webkitAudioContext)(); state.trackBuf = buildBirthdayBeat(90, state.bpm); play(); }

function showPopup(msg, level='good'){ feedback(msg, level); }
