// Touch UI Video Jukebox - State & DOM Logic
// ------------------------------------------

// 1. Placeholder video data
const videoData = [
  { id: 1, artist: "Artist A", title: "Track One", genre: "Rock", thumbnailUrl: "img/thumb1.jpg" },
  { id: 2, artist: "Artist B", title: "Song Two", genre: "Pop", thumbnailUrl: "img/thumb2.jpg" },
  { id: 3, artist: "Artist A", title: "Hit Three", genre: "Rock", thumbnailUrl: "img/thumb3.jpg" },
  { id: 4, artist: "Artist C", title: "Ballad Four", genre: "Jazz", thumbnailUrl: "img/thumb4.jpg" },
  { id: 5, artist: "Artist D", title: "Dance Five", genre: "Dance", thumbnailUrl: "img/thumb5.jpg" },
];

// 2. State
let currentMode = "MODE"; // One of: MODE, GENRE, ARTIST, AZ, TEXT
let currentFilter = null; // e.g., "Rock", "A", "Artist A", or search string
let playlistQueue = [videoData[1], videoData[3], videoData[0]]; // Placeholder queue
let nowPlaying = videoData[2];

// 3. DOM references
const navButtonsContainer = document.getElementById('nav-buttons-container');
const videoGrid = document.getElementById('video-grid');
const navScrollLeft = document.getElementById('nav-scroll-left');
const navScrollRight = document.getElementById('nav-scroll-right');
const keyboardOverlay = document.getElementById('keyboard-overlay');
const searchInput = document.getElementById('search-input');
const keyboardKeys = document.getElementById('keyboard-keys');
const closeKeyboardBtn = document.getElementById('close-keyboard');

// 4. Main navigation modes
const MAIN_MODES = [
  { label: "TEXT SEARCH", id: "TEXT" },
  { label: "GENRE", id: "GENRE" },
  { label: "ARTIST", id: "ARTIST" },
  { label: "A-Z", id: "AZ" },
];

function renderNavButtons(mode = "MODE", filterList = []) {
  navButtonsContainer.innerHTML = "";
  if (mode === "MODE") {
    MAIN_MODES.forEach(({ label, id }) => {
      const btn = document.createElement('button');
      btn.className = 'nav-button' + (currentMode === id ? ' active' : '');
      btn.textContent = label;
      btn.onclick = () => switchMode(id);
      navButtonsContainer.appendChild(btn);
    });
  } else if (["GENRE", "ARTIST", "AZ"].includes(mode)) {
    // BACK button
    const backBtn = document.createElement('button');
    backBtn.className = 'nav-button';
    backBtn.textContent = 'BACK';
    backBtn.onclick = () => switchMode("MODE");
    navButtonsContainer.appendChild(backBtn);
    // Filter buttons
    filterList.forEach((filter) => {
      const btn = document.createElement('button');
      btn.className = 'nav-button' + (currentFilter === filter ? ' active' : '');
      btn.textContent = filter;
      btn.onclick = () => applyFilter(filter);
      navButtonsContainer.appendChild(btn);
    });
  } else if (mode === "TEXT") {
    // Show search input in overlay, handled elsewhere
  }
  updateNavArrows();
}

function switchMode(mode) {
  currentMode = mode;
  currentFilter = null;
  if (mode === "MODE") {
    renderNavButtons("MODE");
    renderVideoGrid(videoData);
  } else if (mode === "GENRE") {
    const genres = [...new Set(videoData.map(v => v.genre))].sort();
    renderNavButtons("GENRE", genres);
    renderVideoGrid(videoData);
  } else if (mode === "ARTIST") {
    const artists = [...new Set(videoData.map(v => v.artist))].sort();
    renderNavButtons("ARTIST", artists);
    renderVideoGrid(videoData);
  } else if (mode === "AZ") {
    const letters = [...new Set(videoData.map(v => v.artist[0].toUpperCase()))].sort();
    renderNavButtons("AZ", letters);
    renderVideoGrid(videoData);
  } else if (mode === "TEXT") {
    showKeyboardOverlay();
  }
}

function applyFilter(filter) {
  currentFilter = filter;
  let filtered = videoData;
  if (currentMode === "GENRE") {
    filtered = videoData.filter(v => v.genre === filter);
  } else if (currentMode === "ARTIST") {
    filtered = videoData.filter(v => v.artist === filter);
  } else if (currentMode === "AZ") {
    filtered = videoData.filter(v => v.artist[0].toUpperCase() === filter);
  }
  renderVideoGrid(filtered);
}

function renderVideoGrid(videos) {
  videoGrid.innerHTML = "";
  videos.forEach(video => {
    const item = document.createElement('div');
    item.className = 'grid-item';
    item.onclick = () => addToPlaylist(video.id);
    item.innerHTML = `
      <p class="artist-name">${video.artist}</p>
      <img src="${video.thumbnailUrl}" alt="${video.title}">
      <p class="track-title">${video.title}</p>
    `;
    videoGrid.appendChild(item);
  });
}

function addToPlaylist(videoId) {
  // Placeholder: log the videoId
  console.log('Add to playlist:', videoId);
}

// Ticker and Now Playing
function updateTicker(playlistArr) {
  const ticker = document.getElementById('ticker-scroll-text');
  if (!ticker) return;
  if (!playlistArr.length) {
    ticker.textContent = 'Coming Up: ---';
    return;
  }
  ticker.textContent = 'Coming Up: ' + playlistArr.map(v => `${v.artist} - ${v.title}`).join('  ||  ');
}
function updateNowPlaying(track) {
  const np = document.getElementById('now-playing-text');
  if (!np) return;
  if (!track) {
    np.textContent = 'Now Playing: ---';
    return;
  }
  np.textContent = `Now Playing: ${track.artist} - ${track.title}`;
}

// Keyboard Overlay for Text Search
function showKeyboardOverlay() {
  keyboardOverlay.style.display = '';
  renderKeyboard();
  searchInput.value = '';
  renderVideoGrid(videoData);
  searchInput.focus();
}
function hideKeyboardOverlay() {
  keyboardOverlay.style.display = 'none';
  switchMode('MODE');
}
function renderKeyboard() {
  // Simple QWERTY layout
  const keys = [
    ...'QWERTYUIOP',
    ...'ASDFGHJKL',
    ...'ZXCVBNM',
    'SPACE', 'DEL'
  ];
  keyboardKeys.innerHTML = '';
  keys.forEach(key => {
    const btn = document.createElement('button');
    btn.textContent = key === 'SPACE' ? '␣' : (key === 'DEL' ? '⌫' : key);
    btn.onclick = () => handleKeyPress(key);
    keyboardKeys.appendChild(btn);
  });
}
function handleKeyPress(key) {
  if (key === 'SPACE') {
    searchInput.value += ' ';
  } else if (key === 'DEL') {
    searchInput.value = searchInput.value.slice(0, -1);
  } else {
    searchInput.value += key;
  }
  handleSearchInput();
}
function handleSearchInput() {
  const q = searchInput.value.trim().toLowerCase();
  if (!q) {
    renderVideoGrid(videoData);
    return;
  }
  const filtered = videoData.filter(v =>
    v.artist.toLowerCase().includes(q) ||
    v.title.toLowerCase().includes(q)
  );
  renderVideoGrid(filtered);
}
searchInput && searchInput.addEventListener('input', handleSearchInput);
closeKeyboardBtn && closeKeyboardBtn.addEventListener('click', hideKeyboardOverlay);

// Navigation Arrow Scrolling
function updateNavArrows() {
  setTimeout(() => {
    if (!navButtonsContainer) return;
    const { scrollWidth, clientWidth, scrollLeft } = navButtonsContainer;
    navScrollLeft.style.display = scrollLeft > 0 ? '' : 'none';
    navScrollRight.style.display = (scrollLeft + clientWidth < scrollWidth - 2) ? '' : 'none';
  }, 50);
}
navScrollLeft && navScrollLeft.addEventListener('click', () => {
  navButtonsContainer.scrollBy({ left: -120, behavior: 'smooth' });
});
navScrollRight && navScrollRight.addEventListener('click', () => {
  navButtonsContainer.scrollBy({ left: 120, behavior: 'smooth' });
});
navButtonsContainer && navButtonsContainer.addEventListener('scroll', updateNavArrows);

// Initial Render
window.addEventListener('DOMContentLoaded', () => {
  renderNavButtons('MODE');
  renderVideoGrid(videoData);
  updateTicker(playlistQueue);
  updateNowPlaying(nowPlaying);
});
