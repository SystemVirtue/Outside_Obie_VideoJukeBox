// --- Global Variables & Constants ---
const OBIE_FAVOURITES_GENRE = "OBIE FAVOURITES"; // !! Ensure this matches your XML EXACTLY !!
const COMMAND_STORAGE_KEY = 'jukeboxCommand'; // Key for sending commands TO player
const STATUS_STORAGE_KEY = 'jukeboxStatus';   // Key for receiving status FROM player
const SCROLL_AMOUNT = 200; // For genre scrolling
const FADE_DURATION_MS = 5000; // Duration info for player command

// --- State Variables ---
let allVideos = [];
let playlistQueue = []; // Stores {id, title, artist}
let currentFilterLetter = null;
let currentGenreFilter = null;
let currentlyPlayingVideoId = null; // Store ID of what we *told* player to play
let currentlyPlayingVideoTitle = "---";
let currentlyPlayingVideoArtist = "---";
let pendingVideoToAdd = null; // Stores {id, title, artist, thumbnail} for popup
let pendingSkipVideo = null; // Store video data for next track after skip fade
let isDataLoaded = false; // Track if XML data is loaded
let isAwaitingFadeComplete = false; // Track if we are waiting for fade to finish
let currentlyPlayingIsFromQueue = false; // NEW: Track origin of current song

// DOM Element References (cached in DOMContentLoaded)
let videoGrid, statusMessage, letterFilterContainer, letterCol1, letterCol2,
    genreButtonsContainer, scrollLeftBtn, scrollRightBtn,
    confirmationPopupOverlay, confirmationPopup, popupThumbnail, popupArtist,
    popupTitle, popupNoBtn, popupYesBtn, nowPlayingEl, comingUpTickerEl,
    skipButtonEl; // Skip Button Element


// --- Send Command to Player Window ---
function sendCommandToPlayer(commandData) {
    console.log("DEBUG: [Jukebox] Sending command:", commandData);
    try {
        commandData.timestamp = Date.now(); // Ensure storage event fires
        localStorage.setItem(COMMAND_STORAGE_KEY, JSON.stringify(commandData));
    } catch (e) {
        console.error("DEBUG: [Jukebox] Error writing to localStorage:", e);
        if (statusMessage) statusMessage.textContent = "Error communicating with player window.";
    }
}

// --- Core "Playback" Logic (Sends Commands) ---

// Decides the very first command to send after data loads
function startInitialPlayback() {
    console.log("DEBUG: [Jukebox] startInitialPlayback called (will send first command).");
    if (!isDataLoaded || !allVideos || allVideos.length === 0) {
        console.warn("DEBUG: [Jukebox] Cannot start playback, data not ready or empty.");
        if(skipButtonEl) {
             console.log("DEBUG: [Jukebox] Disabling skip button - no initial video.");
             skipButtonEl.disabled = true;
        }
        return;
    }
    // --- Enable Button Here ---
    if(skipButtonEl) {
        console.log("DEBUG: [Jukebox] Enabling skip button - initial playback starting.");
        skipButtonEl.disabled = false;
    }
    // --- End Enable ---

    if (playlistQueue.length > 0) {
        console.log("DEBUG: [Jukebox] Initial playback: Starting queue.");
        playNextInQueueOrRandom(); // Sends the first command from queue
    } else {
        console.log("DEBUG: [Jukebox] Initial playback: Starting random favourites.");
        playNextInQueueOrRandom(); // Let playNext handle getting random if queue empty
    }
}

// Sends command for the next track (either queue or random)
// Takes an optional parameter `isSkipRequest`
function playNextInQueueOrRandom(isSkipRequest = false) {
    console.log(`DEBUG: [Jukebox] playNextInQueueOrRandom called. isSkipRequest: ${isSkipRequest}`);
    let nextVideo = null;

    // --- Determine the next video source AND SET FLAG---
    if (playlistQueue.length > 0) {
        // Playing from queue
        currentlyPlayingIsFromQueue = true; // <<< SET FLAG
        if (isSkipRequest) { nextVideo = playlistQueue[0]; }
        else { nextVideo = playlistQueue.shift(); }
        console.log(`DEBUG: [Jukebox] Next video source: QUEUE (${isSkipRequest ? 'Peek' : 'Shift'}) - Title:`, nextVideo?.title);
        updateComingUpTicker();
    } else {
        // Queue empty, play random
        currentlyPlayingIsFromQueue = false; // <<< SET FLAG
        console.log("DEBUG: [Jukebox] Queue empty, getting random favourite.");
        nextVideo = getRandomVideoDetails();
        console.log("DEBUG: [Jukebox] Random video selected:", nextVideo?.title);
        updateComingUpTicker(); // Clear ticker
    }
    // --- End Determine next video source ---


    // --- Check if a valid next video was found ---
    if (!nextVideo || !nextVideo.id) {
        console.warn("DEBUG: [Jukebox] No valid next video found (Queue Empty or Random Failed).");
         if(skipButtonEl) {
             console.log("DEBUG: [Jukebox] Disabling skip button - no valid next video found.");
             skipButtonEl.disabled = true; // Disable if nothing found to play
         }
         // Optional: Send stop command if nothing is playing?
         if (!currentlyPlayingVideoId) {
             sendCommandToPlayer({ action: 'stop' });
             updateNowPlaying("---","---");
         }
        return; // Stop execution here
    }
    // --- End Check ---


    // --- Handle Skip Request vs Normal Playback ---
    if (isSkipRequest && currentlyPlayingVideoId) {
        // User clicked SKIP and something was playing
        console.log("DEBUG: [Jukebox] Skip requested. Storing next video and sending fadeOut command.");
        pendingSkipVideo = nextVideo; // Store details of the track to play *after* fade
        sendCommandToPlayer({
            action: 'fadeOutAndBlack',
            fadeDuration: FADE_DURATION_MS
        });
        isAwaitingFadeComplete = true; // Set flag to wait for player
        if(skipButtonEl) skipButtonEl.disabled = true; // Disable skip during fade
    } else {
        // Normal playback: End of track, initial load, or skip when nothing playing
        console.log("DEBUG: [Jukebox] Normal play/end of track. Sending PLAY command for:", nextVideo.artist, "-", nextVideo.title);
        // --- Enable button on normal play ---
        if(skipButtonEl) skipButtonEl.disabled = false;
        // --- End Enable ---

        // If this wasn't a skip but came from the queue, ensure it's removed (it should have been shifted already)
        if (!isSkipRequest && playlistQueue.length >= 0) { // Need to handle peeking case for skip
            // Check if the video we are about to play is STILL at the front (meaning it was peeked during skip)
            if (playlistQueue[0]?.id === nextVideo.id) {
                console.log("DEBUG: [Jukebox] Removing peeked item from queue before playing.");
                playlistQueue.shift();
                updateComingUpTicker();
            }
        }

        // Send PLAY command
        sendCommandToPlayer({
            action: 'play',
            videoId: nextVideo.id,
            title: nextVideo.title,
            artist: nextVideo.artist
        });
        // Update local state immediately
        currentlyPlayingVideoId = nextVideo.id;
        currentlyPlayingVideoArtist = nextVideo.artist;
        currentlyPlayingVideoTitle = nextVideo.title;
        updateNowPlaying(currentlyPlayingVideoArtist, currentlyPlayingVideoTitle);
        // Ticker already updated when item was shifted/peeked
    }
}


// Finds random video details (DOES NOT send command directly anymore)
function getRandomVideoDetails() {
    if (!allVideos || allVideos.length === 0) return null;
    const favourites = allVideos.filter(v => v.genre === OBIE_FAVOURITES_GENRE && v.id);
    if (favourites.length > 0) {
        const randomIndex = Math.floor(Math.random() * favourites.length);
        return favourites[randomIndex]; // Return {id, title, artist...}
    }
    console.warn(`DEBUG: [Jukebox] getRandomVideoDetails - No videos found in genre: "${OBIE_FAVOURITES_GENRE}"`);
    return null;
}

// Calls playNextInQueueOrRandom which handles sending the command if queue empty
function startRandomPlayback() {
    console.log("DEBUG: [Jukebox] startRandomPlayback called (will defer to playNext).");
    playNextInQueueOrRandom();
}

// --- Queue Management (Refined Fade Condition AGAIN) ---

function addToQueue(videoData) {
    console.log("DEBUG: [Jukebox] addToQueue called with:", videoData);
    if (!videoData || !videoData.id) { console.error("DEBUG: [Jukebox] Invalid video data."); return; }

    const videoInfo = { id: videoData.id, title: videoData.title || "Unknown Title", artist: videoData.artist || "Unknown Artist" };
    console.log(`DEBUG: [Jukebox] Adding to queue: ${videoInfo.artist} - ${videoInfo.title} (${videoInfo.id})`);

    const wasQueueEmpty = playlistQueue.length === 0;
    const isCurrentlyPlaying = currentlyPlayingVideoId !== null;

    // --- REVISED Condition using Flag ---
    // Fade ONLY if: Queue WAS empty AND something IS playing AND that playing item was NOT from the queue (i.e., it was random)
    const shouldFadeRandomTrack = wasQueueEmpty && isCurrentlyPlaying && !currentlyPlayingIsFromQueue;
    console.log(`DEBUG: [Jukebox] addToQueue check: wasQueueEmpty=${wasQueueEmpty}, isCurrentlyPlaying=${isCurrentlyPlaying}, currentlyPlayingIsFromQueue=${currentlyPlayingIsFromQueue}, shouldFade=${shouldFadeRandomTrack}`);

    if (shouldFadeRandomTrack) {
        // Scenario: Queue was empty, random WAS playing -> Fade & Prepend
        console.log("DEBUG: [Jukebox] Condition met: First item added while random playing. Sending fadeOutAndBlack command.");
        playlistQueue.unshift(videoInfo); // Add to FRONT
        updateComingUpTicker();
        sendCommandToPlayer({ action: 'fadeOutAndBlack', fadeDuration: FADE_DURATION_MS });
        isAwaitingFadeComplete = true;
        if(skipButtonEl) skipButtonEl.disabled = true;
    } else {
        // Scenario:
        // 1. Queue already has items (add to end)
        // 2. Queue was empty AND nothing was playing (add to end, start play)
        // 3. Queue was empty BUT the currently playing item *was* from the queue (just finished fade?) -> (add to end) - This case shouldn't happen often due to state flow, but covered.
        playlistQueue.push(videoInfo); // Add to END
        updateComingUpTicker();

        // If queue WAS empty AND nothing was playing before this add, start the queue now.
        if (wasQueueEmpty && !isCurrentlyPlaying) {
            console.log("DEBUG: [Jukebox] Queue was empty and nothing playing, sending play command for first item.");
            playNextInQueueOrRandom(); // This will play the item just added
        } else {
             console.log("DEBUG: [Jukebox] Added item to non-empty queue or while queue item was playing. Sequence continues.");
        }
    }
}

// --- UI Update Functions ---
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
    void comingUpTickerEl.offsetWidth; // Trigger reflow
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

// --- Filtering and Display Logic ---
function getFilteredAndSortedVideos() {
    let videosToDisplay = [...allVideos];
    if (currentFilterLetter) videosToDisplay = videosToDisplay.filter(v => v.artist && v.artist.toLowerCase().startsWith(currentFilterLetter.toLowerCase()));
    if (currentGenreFilter) videosToDisplay = videosToDisplay.filter(v => v.genre && v.genre === currentGenreFilter);
    videosToDisplay.sort((a, b) => a.artist.localeCompare(b.artist));
    return videosToDisplay;
}
function displayVideos(videosToDisplay) {
    if (!videoGrid) { console.error("DEBUG: [Jukebox] displayVideos - videoGrid element not found!"); return; }
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
            else console.warn("DEBUG: [Jukebox] Tile missing video ID on click:", tile.dataset);
        });
        videoGrid.appendChild(tile);
    });
    let statusText = `Displaying ${videosToDisplay.length} video${videosToDisplay.length !== 1 ? 's' : ''}.`; let filters = []; if (currentFilterLetter) filters.push(`Letter: '${currentFilterLetter}'`); if (currentGenreFilter) filters.push(`Genre: '${currentGenreFilter}'`); if (filters.length > 0) statusText += ` (Filtered by ${filters.join(', ')})`; if(statusMessage) statusMessage.textContent = statusText;
}
function updateDisplay() {
    console.log("DEBUG: [Jukebox] updateDisplay called. Filters:", { letter: currentFilterLetter, genre: currentGenreFilter });
    if(statusMessage) statusMessage.textContent = `Processing...`;
    const videosToDisplay = getFilteredAndSortedVideos();
    displayVideos(videosToDisplay);
}

// --- Utility Functions ---
function createLetterButtons() { if(!letterCol1 || !letterCol2) return; const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ"; for (let i = 0; i < alphabet.length; i++) { const letter = alphabet[i]; const button = document.createElement('button'); button.classList.add('letter-button'); button.textContent = letter; button.dataset.letter = letter; if (i < 13) letterCol1.appendChild(button); else letterCol2.appendChild(button); } }
function createGenreButtons(genres) { if (!genreButtonsContainer) return; genreButtonsContainer.innerHTML = ''; const filterSection = document.getElementById('genre-filter-section'); if (!genres || genres.length === 0) { if(filterSection) filterSection.style.display = 'none'; return; } if(filterSection) filterSection.style.display = 'flex'; genres.forEach(genre => { const button = document.createElement('button'); button.classList.add('genre-button'); button.textContent = genre; button.dataset.genre = genre; genreButtonsContainer.appendChild(button); }); updateGenreScrollButtonsVisibility(); }
function updateGenreScrollButtonsVisibility() { if(!genreButtonsContainer || !scrollLeftBtn || !scrollRightBtn) return; const container = genreButtonsContainer; const scrollWidth = container.scrollWidth; const clientWidth = container.clientWidth; const scrollLeft = container.scrollLeft; const tolerance = 5; scrollLeftBtn.disabled = scrollLeft <= tolerance; scrollRightBtn.disabled = scrollLeft + clientWidth >= scrollWidth - tolerance; const needsScrolling = scrollWidth > clientWidth + tolerance; scrollLeftBtn.style.visibility = needsScrolling ? 'visible' : 'hidden'; scrollRightBtn.style.visibility = needsScrolling ? 'visible' : 'hidden'; }

// --- Load Playlist Data ---
async function loadPlaylistData() {
    const xmlFilePath = 'MASTER PLAYLIST.xml';
    console.log("DEBUG: [Jukebox] Starting loadPlaylistData...");
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
        })).filter(v => v.id); // Ensure ID exists

        console.log("DEBUG: [Jukebox] Parsed allVideos count (with ID):", allVideos.length);
        if (allVideos.length === 0) console.warn("DEBUG: [Jukebox] No valid video entries found.");

        const uniqueGenres = [...new Set(allVideos.map(v => v.genre).filter(g => g && g !== 'Unknown Genre'))].sort((a, b) => a.localeCompare(b));
        createGenreButtons(uniqueGenres);

        isDataLoaded = true;
        console.log("DEBUG: [Jukebox] Data loading complete.");
        updateDisplay(); // Update display now that data is loaded
        startInitialPlayback(); // Trigger the *first command* to be sent

    } catch (error) {
        console.error('DEBUG: [Jukebox] Error in loadPlaylistData:', error);
        if (statusMessage) statusMessage.textContent = `Error loading playlist: ${error.message}`;
        if (videoGrid) videoGrid.innerHTML = `<p style="color: #ffaaaa; text-align: center;">Could not load data.</p>`;
        isDataLoaded = false;
    }
}

// --- Storage Event Listener ---
function handlePlayerStatusUpdate(event) {
    // Only react to status updates from the correct key and source
    if (event.key === STATUS_STORAGE_KEY && event.newValue && event.storageArea === localStorage) {
        console.log("DEBUG: [Jukebox] Received status via storage event:", event.newValue);
        try {
            const statusData = JSON.parse(event.newValue);
            console.log("DEBUG: [Jukebox] Parsed status:", statusData);

            // --- Handle different statuses ---
            if (statusData.status === 'ended') {
                console.log("DEBUG: [Jukebox] Player reported video ended (ID:", statusData.id, "). Playing next.");
                 if (isAwaitingFadeComplete) {
                     console.warn("[Jukebox] Received 'ended' while awaiting fade complete. Ignoring, waiting for fade signal.");
                     return; // Don't play next if fade hasn't finished
                 }
                 if (currentlyPlayingVideoId && statusData.id && statusData.id !== currentlyPlayingVideoId) {
                     console.warn(`[Jukebox] Player ended video (${statusData.id}) but Jukebox thought (${currentlyPlayingVideoId}) was playing.`);
                 }
                currentlyPlayingVideoId = null; // Clear current video ID
                if(skipButtonEl) skipButtonEl.disabled = false; // Re-enable skip on normal end
                playNextInQueueOrRandom(); // Trigger next playback command

            } else if (statusData.status === 'fadeComplete') {
                 console.log("DEBUG: [Jukebox] Player reported fade complete. Playing next track.");
                 isAwaitingFadeComplete = false; // Clear wait flag
                 if(skipButtonEl) skipButtonEl.disabled = false; // Re-enable skip button

                 currentlyPlayingVideoId = null; // Clear ID of faded track

                 if (pendingSkipVideo) {
                     // --- Play the video that was stored during the skip request ---
                     console.log("[Jukebox] Fade complete was for a skip. Playing pending video:", pendingSkipVideo.title);
                     const videoToPlay = pendingSkipVideo;
                     pendingSkipVideo = null; // Clear pending skip

                     // Remove the item from queue *if* it was the one we skipped to AND it's still at the front
                     if (playlistQueue.length > 0 && playlistQueue[0]?.id === videoToPlay.id) {
                         console.log("[Jukebox] Removing skipped-to item from queue front.");
                         playlistQueue.shift();
                         updateComingUpTicker();
                     }

                     // Send PLAY command for the skipped-to video
                     sendCommandToPlayer({ action: 'play', videoId: videoToPlay.id, title: videoToPlay.title, artist: videoToPlay.artist });
                     currentlyPlayingVideoId = videoToPlay.id;
                     currentlyPlayingVideoArtist = videoToPlay.artist;
                     currentlyPlayingVideoTitle = videoToPlay.title;
                     updateNowPlaying(currentlyPlayingVideoArtist, currentlyPlayingVideoTitle);
                     if(skipButtonEl) skipButtonEl.disabled = false; // Ensure enabled after playing

                 } else {
                      // --- Fade complete was likely from adding first queue item ---
                      console.log("[Jukebox] Fade complete was likely for queue add. Playing next from queue.");
                      playNextInQueueOrRandom(); // This will play the first item (already unshifted)
                 }

            } else if (statusData.status === 'error') {
                 console.error(`DEBUG: [Jukebox] Player reported error Code: ${statusData.code}, Msg: ${statusData.message}, ID: ${statusData.id}`);
                 // Reset state and try next on error
                 isAwaitingFadeComplete = false;
                 pendingSkipVideo = null;
                 if(skipButtonEl) skipButtonEl.disabled = false; // Re-enable skip

                 if(currentlyPlayingVideoId && statusData.id === currentlyPlayingVideoId) {
                     console.log("[Jukebox] Error occurred on current track, attempting to play next.");
                     currentlyPlayingVideoId = null;
                     setTimeout(() => playNextInQueueOrRandom(), 1000); // Delay before trying next
                 } else {
                      console.log("[Jukebox] Player error unrelated to current track? Ignoring for playback sequence.");
                 }
            }
            // --- End Handle statuses ---

        } catch (e) { console.error("DEBUG: [Jukebox] Error parsing status from storage event:", e); }
    } else if (event.key === STATUS_STORAGE_KEY) {
        // This might happen if the value was removed or set to null by another tab
        console.warn("DEBUG: [Jukebox] Received status update but newValue is null or not from localStorage?");
   }
}


// --- DOMContentLoaded ---
document.addEventListener('DOMContentLoaded', () => {
    console.log("DEBUG: [Jukebox] DOMContentLoaded event fired.");
    // Cache DOM elements
    videoGrid = document.getElementById('video-grid'); statusMessage = document.getElementById('status-message'); letterFilterContainer = document.getElementById('letter-filter-container'); letterCol1 = document.getElementById('letter-col-1'); letterCol2 = document.getElementById('letter-col-2'); genreButtonsContainer = document.getElementById('genre-buttons-container'); scrollLeftBtn = document.getElementById('genre-scroll-left'); scrollRightBtn = document.getElementById('genre-scroll-right'); confirmationPopupOverlay = document.getElementById('confirmation-popup-overlay'); confirmationPopup = document.getElementById('confirmation-popup'); popupThumbnail = document.getElementById('popup-thumbnail'); popupArtist = document.getElementById('popup-artist'); popupTitle = document.getElementById('popup-title'); popupNoBtn = document.getElementById('popup-no'); popupYesBtn = document.getElementById('popup-yes'); nowPlayingEl = document.getElementById('now-playing'); comingUpTickerEl = document.getElementById('coming-up-ticker');
    skipButtonEl = document.getElementById('skip-button'); // Cache skip button

    // Check essential elements
    const essentialElements = { videoGrid, statusMessage, letterFilterContainer, genreButtonsContainer, confirmationPopupOverlay, nowPlayingEl, comingUpTickerEl, skipButtonEl}; let allElementsFound = true; for(const key in essentialElements) { if (!essentialElements[key]) { console.error(`DEBUG: [Jukebox] Essential element not found: ${key}`); allElementsFound = false; } } if (!allElementsFound) { if(statusMessage) statusMessage.textContent = "Init Error."; return; }

    // Setup Initial UI Elements
    createLetterButtons();
    if(skipButtonEl) skipButtonEl.disabled = true; // Start disabled

    // --- Event Listeners ---
    if(skipButtonEl) skipButtonEl.addEventListener('click', () => {
        console.log("DEBUG: [Jukebox] SKIP button clicked.");
        if (isAwaitingFadeComplete) { // Only check fade flag now
            console.log("DEBUG: [Jukebox] Skip ignored, waiting for fade complete.");
            return;
        }
        // Allow skip even if nothing is technically "playing" according to Jukebox state,
        // as long as we're not already mid-fade. Player handles empty state.
        playNextInQueueOrRandom(true); // Pass true for isSkipRequest
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

    // Add storage listener for player status
    window.addEventListener('storage', handlePlayerStatusUpdate);
    console.log("DEBUG: [Jukebox] Added storage event listener.");

    // Load initial data (will trigger first command)
    loadPlaylistData();

    console.log("DEBUG: [Jukebox] DOMContentLoaded handler finished.");
}); // End DOMContentLoaded