// combined.js: SPA logic, UI logic, and player logic for combined.html
// Imports logic from script.js and player.js, adapted for SPA

// --- SPA Navigation Logic ---
const navUIBtn = document.getElementById('nav-ui');
const navPlayerBtn = document.getElementById('nav-player');
const uiSection = document.getElementById('spa-ui-section');
const playerSection = document.getElementById('spa-player-section');

navUIBtn.addEventListener('click', () => {
  navUIBtn.classList.add('active');
  navPlayerBtn.classList.remove('active');
  uiSection.style.display = '';
  playerSection.style.display = 'none';
});
navPlayerBtn.addEventListener('click', () => {
  navPlayerBtn.classList.add('active');
  navUIBtn.classList.remove('active');
  uiSection.style.display = 'none';
  playerSection.style.display = '';
});

// --- Global Variables & Constants (shared) ---
const OBIE_FAVOURITES_GENRE = "OBIE FAVOURITES";
const COMMAND_STORAGE_KEY = 'jukeboxCommand';
const STATUS_STORAGE_KEY = 'jukeboxStatus';
const SCROLL_AMOUNT = 200;
const FADE_DURATION_MS = 5000;
const PLAYER_READY_TIMEOUT_MS = 15000;
const FADE_INTERVAL_MS = 50;

// --- State Variables ---
let allVideos = [];
let playlistQueue = [];
let currentFilterLetter = null;
let currentGenreFilter = null;
let currentlyPlayingVideoId = null;
let currentlyPlayingVideoTitle = "---";
let currentlyPlayingVideoArtist = "---";
let pendingVideoToAdd = null;
let pendingSkipVideo = null;
let isDataLoaded = false;
let isAwaitingFadeComplete = false;
let currentlyPlayingIsFromQueue = false;

// --- Player State ---
let player; // YT.Player
let isPlayerReady = false;
let apiReadyCheckTimeoutId = null;
let currentPlayerVideoId = null;
let fadeIntervalId = null;
let isFadingOut = false;
let fadeOverlay = null;

// --- DOM Elements (will be set on DOMContentLoaded) ---
let videoGrid, statusMessage, letterFilterContainer, letterCol1, letterCol2,
    genreButtonsContainer, scrollLeftBtn, scrollRightBtn,
    confirmationPopupOverlay, confirmationPopup, popupThumbnail, popupArtist,
    popupTitle, popupNoBtn, popupYesBtn, nowPlayingEl, comingUpTickerEl,
    skipButtonEl;

// --- SPA Navigation Logic ---
// (Declarations are above; only attach event listeners here)
navUIBtn.addEventListener('click', () => {
  navUIBtn.classList.add('active');
  navPlayerBtn.classList.remove('active');
  uiSection.style.display = '';
  playerSection.style.display = 'none';
  window.scrollTo(0, 0);
});
navPlayerBtn.addEventListener('click', () => {
  navPlayerBtn.classList.add('active');
  navUIBtn.classList.remove('active');
  uiSection.style.display = 'none';
  playerSection.style.display = '';
  window.scrollTo(0, 0);
});

// --- Main UI Logic (adapted from script.js) ---
function sendCommandToPlayer(commandData) {
    commandData.timestamp = Date.now();
    localStorage.setItem(COMMAND_STORAGE_KEY, JSON.stringify(commandData));
}

function startInitialPlayback() {
    if (!isDataLoaded || !allVideos || allVideos.length === 0) {
        if(skipButtonEl) skipButtonEl.disabled = true;
        return;
    }
    if(skipButtonEl) skipButtonEl.disabled = false;
    playNextInQueueOrRandom();
}

function playNextInQueueOrRandom(isSkipRequest = false) {
    let nextVideo = null;
    if (playlistQueue.length > 0) {
        currentlyPlayingIsFromQueue = true;
        if (isSkipRequest) { nextVideo = playlistQueue[0]; }
        else { nextVideo = playlistQueue.shift(); }
        updateComingUpTicker();
    } else {
        currentlyPlayingIsFromQueue = false;
        nextVideo = getRandomVideoDetails();
        updateComingUpTicker();
    }
    if (!nextVideo || !nextVideo.id) {
        if(skipButtonEl) skipButtonEl.disabled = true;
        if (!currentlyPlayingVideoId) {
            sendCommandToPlayer({ action: 'stop' });
            updateNowPlaying("---","---");
        }
        return;
    }
    if (isSkipRequest && currentlyPlayingVideoId) {
        pendingSkipVideo = nextVideo;
        sendCommandToPlayer({ action: 'fadeOutAndBlack', fadeDuration: FADE_DURATION_MS });
        isAwaitingFadeComplete = true;
        if(skipButtonEl) skipButtonEl.disabled = true;
    } else {
        if(skipButtonEl) skipButtonEl.disabled = false;
        if (!isSkipRequest && playlistQueue.length >= 0) {
            if (playlistQueue[0]?.id === nextVideo.id) {
                playlistQueue.shift();
                updateComingUpTicker();
            }
        }
        sendCommandToPlayer({
            action: 'play',
            videoId: nextVideo.id,
            title: nextVideo.title,
            artist: nextVideo.artist
        });
        currentlyPlayingVideoId = nextVideo.id;
        currentlyPlayingVideoArtist = nextVideo.artist;
        currentlyPlayingVideoTitle = nextVideo.title;
        updateNowPlaying(currentlyPlayingVideoArtist, currentlyPlayingVideoTitle);
    }
}

function getRandomVideoDetails() {
    if (!allVideos || allVideos.length === 0) return null;
    const favourites = allVideos.filter(v => v.genre === OBIE_FAVOURITES_GENRE && v.id);
    if (favourites.length > 0) {
        const randomIndex = Math.floor(Math.random() * favourites.length);
        return favourites[randomIndex];
    }
    return null;
}

function addToQueue(videoData) {
    if (!videoData || !videoData.id) return;
    const videoInfo = { id: videoData.id, title: videoData.title || "Unknown Title", artist: videoData.artist || "Unknown Artist" };
    const wasQueueEmpty = playlistQueue.length === 0;
    const isCurrentlyPlaying = currentlyPlayingVideoId !== null;
    const shouldFadeRandomTrack = wasQueueEmpty && isCurrentlyPlaying && !currentlyPlayingIsFromQueue;
    if (shouldFadeRandomTrack) {
        playlistQueue.unshift(videoInfo);
        updateComingUpTicker();
        sendCommandToPlayer({ action: 'fadeOutAndBlack', fadeDuration: FADE_DURATION_MS });
        isAwaitingFadeComplete = true;
        if(skipButtonEl) skipButtonEl.disabled = true;
    } else {
        playlistQueue.push(videoInfo);
        updateComingUpTicker();
        if (wasQueueEmpty && !isCurrentlyPlaying) {
            playNextInQueueOrRandom();
        }
    }
}

function updateNowPlaying(artist, title) {
    if(nowPlayingEl) {
        artist = artist || "---"; title = title || "---";
        nowPlayingEl.innerHTML = `NOW PLAYING: <span class="artist">${artist}</span><span class="separator">-</span><span class="title">${title}</span>`;
        nowPlayingEl.title = `NOW PLAYING: ${artist} - ${title}`;
    }
}
function updateComingUpTicker() {
    if(!comingUpTickerEl) return;
    if (playlistQueue.length === 0) { comingUpTickerEl.innerHTML = 'COMING UP: ---'; comingUpTickerEl.classList.add('empty'); return; }
    const upcomingItemsHTML = playlistQueue.slice(0, 5).map(v => `<span class="artist">${v.artist || 'N/A'}</span><span class="separator">-</span><span class="title">${v.title || 'N/A'}</span>`).join('<span class="upcoming-separator">...</span>');
    comingUpTickerEl.innerHTML = `COMING UP: ${upcomingItemsHTML}`;
    comingUpTickerEl.classList.remove('empty', 'animated');
    void comingUpTickerEl.offsetWidth;
    comingUpTickerEl.classList.add('animated');
    if (comingUpTickerEl.style.animationName !== 'none') { comingUpTickerEl.style.animation = 'none'; setTimeout(()=>{ comingUpTickerEl.style.animation = ''; }, 10); }
    else { comingUpTickerEl.classList.remove('empty'); }
}
function showConfirmationPopup(videoData) {
    if (!videoData || !confirmationPopupOverlay) return;
    pendingVideoToAdd = videoData;
    if(popupThumbnail) popupThumbnail.src = videoData.thumbnail || '';
    if(popupArtist) popupArtist.textContent = videoData.artist || 'Unknown Artist';
    if(popupTitle) popupTitle.textContent = videoData.title || 'Unknown Title';
    confirmationPopupOverlay.classList.remove('hidden');
    confirmationPopupOverlay.classList.add('visible');
}
function hideConfirmationPopup() {
    if(!confirmationPopupOverlay) return;
    confirmationPopupOverlay.classList.remove('visible');
    pendingVideoToAdd = null;
}
function getFilteredAndSortedVideos() {
    let videosToDisplay = [...allVideos];
    if (currentFilterLetter) videosToDisplay = videosToDisplay.filter(v => v.artist && v.artist.toLowerCase().startsWith(currentFilterLetter.toLowerCase()));
    if (currentGenreFilter) videosToDisplay = videosToDisplay.filter(v => v.genre && v.genre === currentGenreFilter);
    videosToDisplay.sort((a, b) => a.artist.localeCompare(b.artist));
    return videosToDisplay;
}
function displayVideos(videosToDisplay) {
    if (!videoGrid) return;
    videoGrid.innerHTML = '';
    if (!videosToDisplay || videosToDisplay.length === 0) { if(statusMessage) statusMessage.textContent="No videos match filters."; return; }
    videosToDisplay.forEach((video, index) => {
        const tile = document.createElement('div'); tile.classList.add('video-tile');
        tile.dataset.videoId = video.id || ''; tile.dataset.artist = video.artist || 'Unknown Artist';
        tile.dataset.title = video.title || 'Unknown Title'; tile.dataset.thumbnail = video.thumbnail || '';
        const artistP = document.createElement('p'); artistP.classList.add('artist-name'); artistP.textContent = video.artist; artistP.title = video.artist;
        const img = document.createElement('img'); img.src = video.thumbnail; img.alt = `${video.artist} - ${video.title}`; img.loading = 'lazy';
        const titleP = document.createElement('p'); titleP.classList.add('song-title'); titleP.textContent = video.title; titleP.title = video.title;
        tile.appendChild(artistP); tile.appendChild(img); tile.appendChild(titleP);
        tile.addEventListener('click', () => {
            const videoData = { id: tile.dataset.videoId, artist: tile.dataset.artist, title: tile.dataset.title, thumbnail: tile.dataset.thumbnail };
            if (videoData.id) showConfirmationPopup(videoData);
        });
        videoGrid.appendChild(tile);
    });
    let statusText = `Displaying ${videosToDisplay.length} video${videosToDisplay.length !== 1 ? 's' : ''}.`; let filters = []; if (currentFilterLetter) filters.push(`Letter: '${currentFilterLetter}'`); if (currentGenreFilter) filters.push(`Genre: '${currentGenreFilter}'`); if (filters.length > 0) statusText += ` (Filtered by ${filters.join(', ')})`; if(statusMessage) statusMessage.textContent = statusText;
}
function updateDisplay() {
    if(statusMessage) statusMessage.textContent = `Processing...`;
    const videosToDisplay = getFilteredAndSortedVideos();
    displayVideos(videosToDisplay);
}
function createLetterButtons() { if(!letterCol1 || !letterCol2) return; const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ"; for (let i = 0; i < alphabet.length; i++) { const letter = alphabet[i]; const button = document.createElement('button'); button.classList.add('letter-button'); button.textContent = letter; button.dataset.letter = letter; if (i < 13) letterCol1.appendChild(button); else letterCol2.appendChild(button); } }
function createGenreButtons(genres) { if (!genreButtonsContainer) return; genreButtonsContainer.innerHTML = ''; const filterSection = document.getElementById('genre-filter-section'); if (!genres || genres.length === 0) { if(filterSection) filterSection.style.display = 'none'; return; } if(filterSection) filterSection.style.display = 'flex'; genres.forEach(genre => { const button = document.createElement('button'); button.classList.add('genre-button'); button.textContent = genre; button.dataset.genre = genre; genreButtonsContainer.appendChild(button); }); updateGenreScrollButtonsVisibility(); }
function updateGenreScrollButtonsVisibility() { if(!genreButtonsContainer || !scrollLeftBtn || !scrollRightBtn) return; const container = genreButtonsContainer; const scrollWidth = container.scrollWidth; const clientWidth = container.clientWidth; const scrollLeft = container.scrollLeft; const tolerance = 5; scrollLeftBtn.disabled = scrollLeft <= tolerance; scrollRightBtn.disabled = scrollLeft + clientWidth >= scrollWidth - tolerance; const needsScrolling = scrollWidth > clientWidth + tolerance; scrollLeftBtn.style.visibility = needsScrolling ? 'visible' : 'hidden'; scrollRightBtn.style.visibility = needsScrolling ? 'visible' : 'hidden'; }

async function loadPlaylistData() {
    const xmlFilePath = 'MASTER PLAYLIST.xml';
    if (statusMessage) statusMessage.textContent = `Loading ${xmlFilePath}...`;
    isDataLoaded = false;
    try {
        const response = await fetch(xmlFilePath);
        if (!response.ok) throw new Error(`HTTP ${response.status} - Could not load ${xmlFilePath}`);
        const xmlString = await response.text();
        if (!xmlString) throw new Error("XML file is empty.");
        const parser = new DOMParser();
        const xmlDoc = parser.parseFromString(xmlString, "text/xml");
        const parserError = xmlDoc.querySelector('parsererror');
        if (parserError) throw new Error(`XML Parsing Error: ${parserError.textContent.substring(0, 100)}...`);
        const videoNodes = xmlDoc.querySelectorAll('PlaylistDatabase > Videos > Video');
        allVideos = Array.from(videoNodes).map(node => ({
            id: node.querySelector('VideoID')?.textContent || null,
            artist: node.querySelector('Artist')?.textContent || 'Unknown Artist',
            title: node.querySelector('SongTitle')?.textContent || 'Unknown Title',
            thumbnail: node.querySelector('ThumbnailURL')?.textContent || 'placeholder.png',
            genre: node.querySelector('Genre')?.textContent || 'Unknown Genre'
        })).filter(v => v.id);
        const uniqueGenres = [...new Set(allVideos.map(v => v.genre).filter(g => g && g !== 'Unknown Genre'))].sort((a, b) => a.localeCompare(b));
        createGenreButtons(uniqueGenres);
        isDataLoaded = true;
        updateDisplay();
        startInitialPlayback();
    } catch (error) {
        if (statusMessage) statusMessage.textContent = `Error loading playlist: ${error.message}`;
        if (videoGrid) videoGrid.innerHTML = `<p style="color: #ffaaaa; text-align: center;">Could not load data.</p>`;
        isDataLoaded = false;
    }
}

function handlePlayerStatusUpdate(event) {
    if (event.key === STATUS_STORAGE_KEY && event.newValue && event.storageArea === localStorage) {
        try {
            const statusData = JSON.parse(event.newValue);
            if (statusData.status === 'ended') {
                if (isAwaitingFadeComplete) return;
                currentlyPlayingVideoId = null;
                if(skipButtonEl) skipButtonEl.disabled = false;
                playNextInQueueOrRandom();
            } else if (statusData.status === 'fadeComplete') {
                isAwaitingFadeComplete = false;
                if(skipButtonEl) skipButtonEl.disabled = false;
                currentlyPlayingVideoId = null;
                if (pendingSkipVideo) {
                    const videoToPlay = pendingSkipVideo;
                    pendingSkipVideo = null;
                    if (playlistQueue.length > 0 && playlistQueue[0]?.id === videoToPlay.id) {
                        playlistQueue.shift();
                        updateComingUpTicker();
                    }
                    sendCommandToPlayer({ action: 'play', videoId: videoToPlay.id, title: videoToPlay.title, artist: videoToPlay.artist });
                    currentlyPlayingVideoId = videoToPlay.id;
                    currentlyPlayingVideoArtist = videoToPlay.artist;
                    currentlyPlayingVideoTitle = videoToPlay.title;
                    updateNowPlaying(currentlyPlayingVideoArtist, currentlyPlayingVideoTitle);
                    if(skipButtonEl) skipButtonEl.disabled = false;
                } else {
                    playNextInQueueOrRandom();
                }
            } else if (statusData.status === 'error') {
                isAwaitingFadeComplete = false;
                pendingSkipVideo = null;
                if(skipButtonEl) skipButtonEl.disabled = false;
            }
        } catch (e) { }
    }
}

// --- Player Logic (adapted from player.js) ---
window.onYouTubeIframeAPIReady = function() {
    if (apiReadyCheckTimeoutId) { clearTimeout(apiReadyCheckTimeoutId); }
    if (typeof YT === 'undefined' || typeof YT.Player === 'undefined') { return; }
    try {
        const targetElement = document.getElementById('youtube-fullscreen-player');
        if (!targetElement) { return; }
        function createPlayerWhenReady() {
            const rect = targetElement.getBoundingClientRect();
            const computedStyle = window.getComputedStyle(targetElement);
            if (rect.width > 0 && rect.height > 0 && computedStyle.display !== 'none') {
                try {
                    player = new YT.Player('youtube-fullscreen-player', {
                        height: '100%', width: '100%',
                        playerVars: { 'playsinline': 1, 'controls': 0, 'rel': 0 },
                        events: { 'onReady': onPlayerWindowReady, 'onStateChange': onPlayerWindowStateChange, 'onError': onPlayerWindowError }
                    });
                } catch(e) {}
            } else {
                setTimeout(createPlayerWhenReady, 100);
            }
        }
        createPlayerWhenReady();
    } catch (e) {}
};
function onPlayerWindowReady(event) {
    isPlayerReady = true;
    if(player && typeof player.getPlayerState === 'function') {}
    if (!fadeOverlay) fadeOverlay = document.getElementById('fade-overlay');
    processStoredCommand();
}
function onPlayerWindowStateChange(event) {
    if (event.data === YT.PlayerState.ENDED && !isFadingOut) {
        sendPlayerStatus('ended', { id: currentPlayerVideoId });
        currentPlayerVideoId = null;
    } else if (event.data === YT.PlayerState.PLAYING) {
        try { currentPlayerVideoId = event.target?.getVideoData?.()?.video_id || currentPlayerVideoId; } catch(e){}
        resetFadeOverlayVisuals();
    }
}
function onPlayerWindowError(event) {
    sendPlayerStatus('error', { code: event.data, message: 'Player Error', id: currentPlayerVideoId });
}
function startVisualAndAudioFade(durationMs) {
    if (!isPlayerReady || !player || typeof player.getVolume !== 'function' || isFadingOut || !fadeOverlay) {
        sendPlayerStatus('fadeComplete', { id: currentPlayerVideoId });
        return;
    }
    isFadingOut = true;
    let currentVolume = player.getVolume();
    const steps = durationMs / FADE_INTERVAL_MS;
    const volumeStep = steps > 0 ? (currentVolume / steps) : currentVolume;
    fadeOverlay.style.transitionDuration = `${durationMs / 1000}s, 0s`;
    fadeOverlay.style.transitionDelay = `0s, 0s`;
    fadeOverlay.classList.add('fading-out');
    if (fadeIntervalId) clearInterval(fadeIntervalId);
    fadeIntervalId = setInterval(() => {
        currentVolume -= volumeStep;
        if (currentVolume <= 0) {
            clearInterval(fadeIntervalId); fadeIntervalId = null;
            if (player && typeof player.setVolume === 'function') {
                player.setVolume(0);
                if (typeof player.stopVideo === 'function') { player.stopVideo(); }
                player.setVolume(100);
            }
            isFadingOut = false;
            sendPlayerStatus('fadeComplete', { id: currentPlayerVideoId });
            currentPlayerVideoId = null;
        } else {
            if (player && typeof player.setVolume === 'function') { player.setVolume(currentVolume); }
        }
    }, FADE_INTERVAL_MS);
}
function resetFadeOverlayVisuals() {
    if (fadeOverlay && fadeOverlay.classList.contains('fading-out')) {
        fadeOverlay.classList.remove('fading-out');
        fadeOverlay.style.transitionDuration = '';
        fadeOverlay.style.transitionDelay = '';
    }
}
function processStoredCommand() {
    try {
        const commandString = localStorage.getItem(COMMAND_STORAGE_KEY);
        if (commandString) {
            const commandData = JSON.parse(commandString);
            executePlayerCommand(commandData);
        }
    } catch (e) {}
}
function executePlayerCommand(commandData) {
    if (!commandData || !commandData.action) { return; }
    if (!isPlayerReady || !player) { return; }
    try {
        if (commandData.action !== 'fadeOutAndBlack') {
            resetFadeOverlayVisuals();
        }
        switch (commandData.action) {
            case 'play':
                if (commandData.videoId && typeof player.loadVideoById === 'function') {
                    currentPlayerVideoId = commandData.videoId;
                    player.loadVideoById(commandData.videoId);
                    document.title = `${commandData.artist || '?'} - ${commandData.title || '?'}`;
                }
                break;
            case 'stop':
                if (typeof player.stopVideo === 'function') {
                    resetFadeOverlayVisuals();
                    player.stopVideo();
                    document.title = "Jukebox Player";
                    currentPlayerVideoId = null;
                }
                break;
            case 'fadeOutAndBlack':
                 const fadeDuration = commandData.fadeDuration || 5000;
                 startVisualAndAudioFade(fadeDuration);
                 break;
        }
    } catch(e) {}
}
function sendPlayerStatus(statusType, data = {}) {
    try {
        const statusData = {
            status: statusType,
            id: currentPlayerVideoId,
            timestamp: Date.now(),
            ...data
        };
        localStorage.setItem(STATUS_STORAGE_KEY, JSON.stringify(statusData));
    } catch (e) {}
}
function displayPlayerError(message) {
    const container = document.getElementById('youtube-fullscreen-player');
    document.body.style.backgroundColor = '#300';
    if (container) {
        container.innerHTML = `<div style="position: absolute; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.8); display:flex; justify-content:center; align-items:center; z-index: 10;"><p style="color: red; font-size: 1.5em; text-align:center; padding: 20px; background: rgba(0,0,0,0.7); border-radius: 5px;">${message}</p></div>`;
    } else {
        document.body.innerHTML = `<p style="color:red; font-size:2em; padding: 30px;">${message}</p>`;
    }
}
window.addEventListener('storage', handlePlayerStatusUpdate);
window.addEventListener('storage', handleStorageChange);
function handleStorageChange(event) {
    if (event.key === COMMAND_STORAGE_KEY && event.newValue && event.storageArea === localStorage) {
        try {
            const commandData = JSON.parse(event.newValue);
            executePlayerCommand(commandData);
        } catch (e) {}
    }
}
document.addEventListener('DOMContentLoaded', () => {
    // Cache DOM elements
    videoGrid = document.getElementById('video-grid');
    statusMessage = document.getElementById('status-message');
    letterFilterContainer = document.getElementById('letter-filter-container');
    letterCol1 = document.getElementById('letter-col-1');
    letterCol2 = document.getElementById('letter-col-2');
    genreButtonsContainer = document.getElementById('genre-buttons-container');
    scrollLeftBtn = document.getElementById('genre-scroll-left');
    scrollRightBtn = document.getElementById('genre-scroll-right');
    confirmationPopupOverlay = document.getElementById('confirmation-popup-overlay');
    confirmationPopup = document.getElementById('confirmation-popup');
    popupThumbnail = document.getElementById('popup-thumbnail');
    popupArtist = document.getElementById('popup-artist');
    popupTitle = document.getElementById('popup-title');
    popupNoBtn = document.getElementById('popup-no');
    popupYesBtn = document.getElementById('popup-yes');
    nowPlayingEl = document.getElementById('now-playing');
    comingUpTickerEl = document.getElementById('coming-up-ticker');
    skipButtonEl = document.getElementById('skip-button');
    fadeOverlay = document.getElementById('fade-overlay');

    createLetterButtons();
    if(skipButtonEl) skipButtonEl.disabled = true;
    if(skipButtonEl) skipButtonEl.addEventListener('click', () => {
        if (isAwaitingFadeComplete) return;
        playNextInQueueOrRandom(true);
    });
    if(popupNoBtn) popupNoBtn.addEventListener('click', hideConfirmationPopup);
    if(popupYesBtn) popupYesBtn.addEventListener('click', () => { if (pendingVideoToAdd) addToQueue(pendingVideoToAdd); hideConfirmationPopup(); });
    if(confirmationPopupOverlay) confirmationPopupOverlay.addEventListener('click', (event) => { if (event.target === confirmationPopupOverlay) hideConfirmationPopup(); });
    if(letterFilterContainer) letterFilterContainer.addEventListener('click', (event) => { const targetButton = event.target.closest('.letter-button'); if (!targetButton) return; const letter = targetButton.dataset.letter; letterFilterContainer.querySelectorAll('.letter-button').forEach(btn => btn.classList.remove('selected')); if (currentFilterLetter === letter) { currentFilterLetter = null; } else { currentFilterLetter = letter; targetButton.classList.add('selected'); } updateDisplay(); });
    if(genreButtonsContainer) genreButtonsContainer.addEventListener('click', (event) => { const targetButton = event.target.closest('.genre-button'); if (!targetButton) return; const genre = targetButton.dataset.genre; genreButtonsContainer.querySelectorAll('.genre-button').forEach(btn => btn.classList.remove('selected')); if (currentGenreFilter === genre) { currentGenreFilter = null; } else { currentGenreFilter = genre; targetButton.classList.add('selected'); } updateDisplay(); });
    if(scrollLeftBtn) scrollLeftBtn.addEventListener('click', () => { if(genreButtonsContainer) genreButtonsContainer.scrollLeft -= SCROLL_AMOUNT; });
    if(scrollRightBtn) scrollRightBtn.addEventListener('click', () => { if(genreButtonsContainer) genreButtonsContainer.scrollLeft += SCROLL_AMOUNT; });
    if(genreButtonsContainer) genreButtonsContainer.addEventListener('scroll', updateGenreScrollButtonsVisibility);
    window.addEventListener('resize', updateGenreScrollButtonsVisibility);
    loadPlaylistData();
});

// --- Responsive Enhancements ---
window.addEventListener('DOMContentLoaded', () => {
  // Optionally, scroll to top on SPA section switch
  [navUIBtn, navPlayerBtn].forEach(btn => {
    btn.addEventListener('click', () => window.scrollTo(0, 0));
  });
});

// TODO: Integrate the full script.js and player.js logic here,
// ensuring shared state for queue, playback, and UI updates.
