console.log("Initializing Spotify Audio Engine...");

// Global Audio Engine and Session States
let currentsong = new Audio();
let songs = [];
let currfolder = "";
let currentfolder = ""; // active folder or playlist context
let songData = null;    // fallback static songs catalog

// Local persistent features
let likedSongs = JSON.parse(localStorage.getItem("likedSongs")) || [];
let customPlaylists = JSON.parse(localStorage.getItem("customPlaylists")) || [];
let lastVolume = 0.8;

// Time formatting helper: seconds to MM:SS
function formatSecondsToMinutes(seconds) {
    if (isNaN(seconds) || seconds < 0) {
        return "00:00";
    }
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);

    const formattedMins = String(mins).padStart(2, '0');
    const formattedSecs = String(secs).padStart(2, '0');

    return `${formattedMins}:${formattedSecs}`;
}

// Loads static JSON catalog for robust folder/track resolution
async function loadSongData() {
    try {
        let response = await fetch('./songs.json');
        songData = await response.json();
        console.log("Static song catalog database loaded successfully.");
    } catch (error) {
        console.error("Failed to fetch songs.json catalog, dynamic fallback active:", error);
    }
}

// Scans individual folder tracks with local songs.json fallback compatibility
async function getsongs(folder) {
    let normalizedFolder = folder.replace(/\\/g, "/");
    let folderKey = normalizedFolder.replace("songs/", "").replace("/songs/", "").replace("/", "").trim();
    currfolder = normalizedFolder; 
    currentfolder = folderKey;
    
    try {
        let a = await fetch(`./${normalizedFolder}/`);
        if (!a.ok) throw new Error("Folder fetch error status code: " + a.status);
        let response = await a.text();
        
        let div = document.createElement('div');
        div.innerHTML = response;
        let as = div.getElementsByTagName('a');
        let dynamicSongs = [];
        
        for (let i = 0; i < as.length; i++) {
            const element = as[i];
            let href = element.getAttribute("href");
            if (href && href.endsWith(".mp3")) {
                let normalizedHref = href.replace(/\\/g, "/");
                let filename = normalizedHref.split("/").slice(-1)[0];
                let decoded = decodeURIComponent(filename);
                if (decoded && decoded !== "undefined" && decoded !== "null" && decoded.trim() !== "") {
                    dynamicSongs.push(decoded);
                }
            }
        }
        
        if (dynamicSongs.length > 0) {
            songs = dynamicSongs.filter(s => s && s !== "undefined" && s !== "null" && s.trim() !== "");
            return songs;
        }
        throw new Error("Empty dynamic tracks found");
    } catch (e) {
        console.log(`Dynamic scanning failed for ${folderKey}. Falling back to static songs.json...`);
        if (songData && songData[folderKey]) {
            songs = songData[folderKey].songs.filter(s => s && s !== "undefined" && s !== "null" && s.trim() !== "");
            return songs;
        } else {
            console.error(`Folder "${folderKey}" not located in songs.json catalog database.`);
            songs = [];
            return songs;
        }
    }
}

// Starts playback of designated track
const playMusic = (track, pause = false) => {
    if (!track || track === "undefined" || track === "null" || String(track).trim() === "") {
        console.warn("playMusic called with empty or invalid track:", track);
        document.getElementById("songinfo").innerHTML = "No track loaded";
        document.getElementById("songtime").innerHTML = "00:00 / 00:00";
        document.getElementById("likeBtn").classList.remove("liked");
        document.getElementById("play").src = "play.png";
        let equalizer = document.getElementById("equalizer");
        if (equalizer) equalizer.classList.remove("playing");
        return;
    }

    // Bulletproof extraction of standalone filename to prevent double prefixing
    let normalizedTrack = String(track).replace(/\\/g, "/");
    let filename = normalizedTrack.split("/").slice(-1)[0];

    currentsong.src = `${currfolder}/` + filename;
    
    if (!pause) {
        currentsong.play().catch(e => console.log("User interaction required for autoplay:", e));
        document.getElementById("play").src = "pause-button.png";
    } else {
        document.getElementById("play").src = "play.png";
    }
    
    // Update player panel metadata labels
    let decodedTrackName = decodeURIComponent(filename.replace(/Copy\.mp3|Copy|\.mp3/gi, '').trim());
    if (!decodedTrackName || decodedTrackName === "undefined" || decodedTrackName === "null" || decodedTrackName.trim() === "") {
        decodedTrackName = "Unknown Song";
    }
    document.getElementById("songinfo").innerHTML = decodedTrackName;
    document.getElementById("songtime").innerHTML = "00:00 / 00:00";
    
    // Adjust heart liked status icon
    let likeBtn = document.getElementById("likeBtn");
    if (isLiked(filename)) {
        likeBtn.classList.add("liked");
    } else {
        likeBtn.classList.remove("liked");
    }
    
    highlightActiveSong();
};

// Generates album card grid onto dashboard
async function displayAlbums() {
    let cardcontainer = document.getElementById("cardContainer");
    cardcontainer.innerHTML = "";
    
    try {
        let a = await fetch(`./songs/`);
        if (!a.ok) throw new Error("Albums directory fetch failed");
        let response = await a.text();
        let div = document.createElement('div');
        div.innerHTML = response;
        let anchors = div.getElementsByTagName("a");
        let array = Array.from(anchors);
        
        let foundFolders = [];
        for (let index = 0; index < array.length; index++) {
            const e = array[index];
            if (e.href.includes("/songs/")) {
                let folder = e.href.split("/").slice(-2)[0];
                if (folder && folder !== "songs" && !foundFolders.includes(folder)) {
                    foundFolders.push(folder);
                }
            }
        }
        
        if (foundFolders.length === 0) throw new Error("Empty folders in dynamic directory listing");
        
        for (const folder of foundFolders) {
            try {
                let a = await fetch(`./songs/${folder}/info.json`);
                let response = await a.json();
                createCard(folder, response.title, response.description);
            } catch (err) {
                if (songData && songData[folder]) {
                    createCard(folder, songData[folder].title, songData[folder].description);
                } else {
                    createCard(folder, folder.toUpperCase(), "Immersive track rhythms");
                }
            }
        }
    } catch (e) {
        console.log("Directory listing unavailable. Compiling albums using offline songs.json catalog...");
        if (songData) {
            for (const folder in songData) {
                createCard(folder, songData[folder].title, songData[folder].description);
            }
        }
    }
    
    setupCardListeners();
}

// Card builders
function createCard(folder, title, description) {
    let cardcontainer = document.getElementById("cardContainer");
    cardcontainer.innerHTML += `<div data-folder="${folder}" class="card fade-in">
        <div class="play">
            <img src="play.png" alt="Play">
        </div>
        <img src="songs/${folder}/cover.jpeg" alt="${title} Album Cover" onerror="this.src='logo.svg'">
        <h2>${title}</h2>
        <p>${description}</p>
    </div>`;
}

// Setup listeners for album cards
function setupCardListeners() {
    Array.from(document.getElementsByClassName("card")).forEach(card => {
        card.addEventListener("click", async () => {
            let folder = card.dataset.folder;
            await loadAlbum(folder);
        });
    });
}

// Loads whole album context into sidebar library panel
async function loadAlbum(folderName) {
    // Styling states
    document.getElementById("likedSongsShortcut").classList.remove("active-playlist");
    document.querySelectorAll(".playlist-sidebar-item").forEach(el => el.classList.remove("active-playlist"));
    
    songs = await getsongs(`songs/${folderName}`);
    let folderInfo = songData && songData[folderName] ? songData[folderName] : { title: folderName.toUpperCase() };
    
    document.getElementById("activePlaylistTitle").innerHTML = folderInfo.title;
    
    let songul = document.querySelector(".songslist ul");
    songul.innerHTML = "";
    
    if (songs.length === 0) {
        songul.innerHTML = `<li style="border:none; background:transparent; justify-content:center; color:var(--text-subtle);">No songs in folder.</li>`;
        return;
    }
    
    songs.forEach(song => {
        let cleanName = decodeURIComponent(song.replace(/Copy\.mp3|Copy|\.mp3/gi, '').trim());
        songul.innerHTML += `<li> 
            <img class="invert music-note" src="quaver.png" alt="">
            <div class="info">
                <div>${song}</div>
                <div style="font-size:11px; opacity:0.65; max-width:180px; overflow:hidden; text-overflow:ellipsis;">${cleanName}</div>
            </div>
            <div class="playnow">
                <span>Play Now</span>
                <img class="invert" src="playsong.png" alt="">
            </div>
        </li>`;
    });

    // Sidebar individual track buttons click trigger
    Array.from(songul.getElementsByTagName("li")).forEach(li => {
        li.addEventListener("click", () => {
            playMusic(li.querySelector(".info div").innerHTML.trim());
        }); 
    });
    
    // Highlight and trigger autoplay
    highlightActiveSong();
    if (songs.length > 0) {
        playMusic(songs[0]);
    }
}

// Highlight the currently active playing track in library list
function highlightActiveSong() {
    let activeTrackName = decodeURIComponent(currentsong.src.split("/").slice(-1)[0]);
    let listItems = document.querySelectorAll(".songslist ul li");
    
    listItems.forEach(li => {
        let trackNameDiv = li.querySelector(".info div");
        if (trackNameDiv) {
            let trackName = trackNameDiv.innerHTML.trim();
            if (decodeURIComponent(trackName) === activeTrackName) {
                li.classList.add("active-song");
            } else {
                li.classList.remove("active-song");
            }
        }
    });
    
    // Equalizer wave toggle class based on audio paused status
    let equalizer = document.getElementById("equalizer");
    if (!currentsong.paused && currentsong.src) {
        equalizer.classList.add("playing");
    } else {
        equalizer.classList.remove("playing");
    }
}

// Sequential playback navigation: plays next track
function playNextSong() {
    if (!songs || songs.length === 0) return;
    let currentTrackName = decodeURIComponent(currentsong.src.split("/").slice(-1)[0]);
    let index = songs.indexOf(currentTrackName);
    
    if (index === -1) {
        // Retry match with decoded items
        index = songs.findIndex(s => decodeURIComponent(s) === currentTrackName);
    }
    
    if (index !== -1 && index + 1 < songs.length) {
        playMusic(songs[index + 1]);
    } else {
        playMusic(songs[0]); // Loop back to start
    }
}

// Sequential playback navigation: plays previous track
function playPrevSong() {
    if (!songs || songs.length === 0) return;
    let currentTrackName = decodeURIComponent(currentsong.src.split("/").slice(-1)[0]);
    let index = songs.indexOf(currentTrackName);
    
    if (index === -1) {
        index = songs.findIndex(s => decodeURIComponent(s) === currentTrackName);
    }
    
    if (index !== -1 && index - 1 >= 0) {
        playMusic(songs[index - 1]);
    } else {
        playMusic(songs[songs.length - 1]); // Loop back to last
    }
}

// Liked Songs Management Functions
function updateLikedSongsCount() {
    document.getElementById("likedSongsCount").innerHTML = likedSongs.length;
}

function isLiked(track) {
    let normalizedTrack = decodeURIComponent(track);
    return likedSongs.some(item => decodeURIComponent(item.track) === normalizedTrack);
}

function toggleLikeCurrentSong() {
    if (!currentsong.src) return;
    let parts = currentsong.src.split("/");
    let track = parts.slice(-1)[0];
    let folder = parts.slice(-3, -1).join("/"); // e.g. songs/ncs
    
    let normalizedTrack = decodeURIComponent(track);
    let index = likedSongs.findIndex(item => decodeURIComponent(item.track) === normalizedTrack);
    let likeBtn = document.getElementById("likeBtn");
    
    if (index !== -1) {
        // Dislike track
        likedSongs.splice(index, 1);
        likeBtn.classList.remove("liked");
    } else {
        // Like track
        likedSongs.push({ folder: folder, track: decodeURIComponent(track) });
        likeBtn.classList.add("liked");
    }
    
    localStorage.setItem("likedSongs", JSON.stringify(likedSongs));
    updateLikedSongsCount();
    
    if (currentfolder === "liked_playlist") {
        loadLikedSongsPlaylist();
    }
}

// Loads Liked Songs virtual album into library sidebar
function loadLikedSongsPlaylist() {
    currentfolder = "liked_playlist";
    
    // Active highlights
    document.getElementById("likedSongsShortcut").classList.add("active-playlist");
    document.querySelectorAll(".playlist-sidebar-item").forEach(el => el.classList.remove("active-playlist"));
    
    document.getElementById("activePlaylistTitle").innerHTML = "Liked Songs";
    
    let songul = document.querySelector(".songslist ul");
    songul.innerHTML = "";
    
    if (likedSongs.length === 0) {
        songul.innerHTML = `<li class="no-songs-msg" style="border:none; background:transparent; justify-content:center; cursor:default; padding:20px 0; color:var(--text-subtle);">
            No liked songs yet. Heart some tracks!
        </li>`;
        songs = [];
        return;
    }
    
    songs = likedSongs.map(item => item.track);
    
    likedSongs.forEach(item => {
        let cleanName = decodeURIComponent(item.track.replace(/Copy\.mp3|Copy|\.mp3/gi, '').trim());
        songul.innerHTML += `<li> 
            <img class="invert music-note" src="quaver.png" alt="">
            <div class="info">
                <div>${item.track}</div>
                <div style="font-size:11px; opacity:0.65; max-width:180px; overflow:hidden; text-overflow:ellipsis;">${cleanName}</div>
            </div>
            <div class="playnow">
                <span>Play Now</span>
                <img class="invert" src="playsong.png" alt="">
            </div>
        </li>`;
    });
    
    // Playlist items click bindings
    Array.from(songul.getElementsByTagName("li")).forEach((li, idx) => {
        if (li.classList.contains("no-songs-msg")) return;
        li.addEventListener("click", () => {
            let songObj = likedSongs[idx];
            currfolder = songObj.folder;
            playMusic(songObj.track);
        }); 
    });
    
    highlightActiveSong();
}

// Search filtration function
function filterGridAndSongs(query) {
    // 1. Filter Album Dashboard Cards
    let cards = document.querySelectorAll(".card");
    cards.forEach(card => {
        let title = card.querySelector("h2").innerText.toLowerCase();
        let desc = card.querySelector("p").innerText.toLowerCase();
        if (title.includes(query) || desc.includes(query)) {
            card.style.display = "block";
        } else {
            card.style.display = "none";
        }
    });
    
    // 2. Filter Active Library Song Items
    let songItems = document.querySelectorAll(".songslist ul li");
    songItems.forEach(li => {
        if (li.classList.contains("no-songs-msg")) return;
        let trackName = li.querySelector(".info div").innerText.toLowerCase();
        if (trackName.includes(query)) {
            li.style.display = "flex";
        } else {
            li.style.display = "none";
        }
    });
}

// Custom Playlist generators
function createCustomPlaylist(name) {
    let id = "playlist_" + Date.now();
    customPlaylists.push({ id: id, name: name, songs: [] });
    localStorage.setItem("customPlaylists", JSON.stringify(customPlaylists));
    renderCustomPlaylists();
}

function renderCustomPlaylists() {
    let container = document.getElementById("customPlaylistsContainer");
    container.innerHTML = "";
    
    customPlaylists.forEach(pl => {
        container.innerHTML += `<div class="playlist-sidebar-item fade-in" data-id="${pl.id}">
            <div class="playlist-icon">P</div>
            <div class="playlist-name">${pl.name}</div>
        </div>`;
    });
    
    document.querySelectorAll(".playlist-sidebar-item").forEach(item => {
        item.addEventListener("click", () => {
            loadCustomPlaylist(item.dataset.id);
        });
    });
}

function loadCustomPlaylist(id) {
    let pl = customPlaylists.find(p => p.id === id);
    if (!pl) return;
    
    currentfolder = id;
    
    // UI styling
    document.getElementById("likedSongsShortcut").classList.remove("active-playlist");
    document.querySelectorAll(".playlist-sidebar-item").forEach(el => {
        if (el.dataset.id === id) el.classList.add("active-playlist");
        else el.classList.remove("active-playlist");
    });
    
    document.getElementById("activePlaylistTitle").innerHTML = pl.name;
    
    let songul = document.querySelector(".songslist ul");
    songul.innerHTML = "";
    
    if (pl.songs.length === 0) {
        songul.innerHTML = `<li class="no-songs-msg" style="border:none; background:transparent; justify-content:center; cursor:default; padding:20px 0; color:var(--text-subtle); flex-direction:column; gap:10px; text-align:center; width:100%;">
            <span>This playlist is empty.</span>
            <button class="add-random-btn" style="background:var(--primary-color); border:none; padding:6px 14px; color:black; border-radius:50px; font-weight:700; cursor:pointer; font-size:12px; transition:0.2s;">Add a random song</button>
        </li>`;
        
        let addBtn = songul.querySelector(".add-random-btn");
        if (addBtn) {
            addBtn.addEventListener("click", () => {
                addRandomSongToPlaylist(id);
            });
        }
        songs = [];
        return;
    }
    
    songs = pl.songs.map(s => s.track);
    
    pl.songs.forEach(item => {
        let cleanName = decodeURIComponent(item.track.replace(/Copy\.mp3|Copy|\.mp3/gi, '').trim());
        songul.innerHTML += `<li> 
            <img class="invert music-note" src="quaver.png" alt="">
            <div class="info">
                <div>${item.track}</div>
                <div style="font-size:11px; opacity:0.65; max-width:180px; overflow:hidden; text-overflow:ellipsis;">${cleanName}</div>
            </div>
            <div class="playnow">
                <span>Play Now</span>
                <img class="invert" src="playsong.png" alt="">
            </div>
        </li>`;
    });
    
    // Bindings
    Array.from(songul.getElementsByTagName("li")).forEach((li, idx) => {
        if (li.classList.contains("no-songs-msg")) return;
        li.addEventListener("click", () => {
            let songObj = pl.songs[idx];
            currfolder = songObj.folder;
            playMusic(songObj.track);
        }); 
    });
    
    highlightActiveSong();
}

function addRandomSongToPlaylist(playlistId) {
    if (!songData) return;
    let folders = Object.keys(songData);
    let randomFolder = folders[Math.floor(Math.random() * folders.length)];
    let album = songData[randomFolder];
    let randomTrack = album.songs[Math.floor(Math.random() * album.songs.length)];
    
    let plIndex = customPlaylists.findIndex(p => p.id === playlistId);
    if (plIndex !== -1) {
        customPlaylists[plIndex].songs.push({ folder: `songs/${randomFolder}`, track: randomTrack });
        localStorage.setItem("customPlaylists", JSON.stringify(customPlaylists));
        loadCustomPlaylist(playlistId);
    }
}

// User Session Auth Helpers
function performLogin(username) {
    localStorage.setItem("spotifyUser", username);
    updateUserSession();
}

function updateUserSession() {
    let user = localStorage.getItem("spotifyUser");
    let signupBtn = document.getElementById("signupBtn");
    let loginBtn = document.getElementById("loginBtn");
    let profileDropdown = document.getElementById("profileDropdown");
    
    if (user) {
        signupBtn.style.display = "none";
        loginBtn.style.display = "none";
        profileDropdown.style.display = "block";
        
        document.getElementById("userName").innerHTML = user;
        document.getElementById("userAvatar").innerHTML = user.charAt(0).toUpperCase();
    } else {
        signupBtn.style.display = "block";
        loginBtn.style.display = "block";
        profileDropdown.style.display = "none";
    }
}

// MAIN FUNCTION - Initializer Orchestrator
async function main() {
    // 1. Fetch catalog data mappings
    await loadSongData();
    
    // 2. Initialize dynamic items
    await getsongs("songs/ncs");
    playMusic(songs[0], true);
    
    // 3. Compile and render Albums Cards
    await displayAlbums();
    
    // 4. Update core sessions/shortcut counters
    updateLikedSongsCount();
    renderCustomPlaylists();
    updateUserSession();

    // 5. Initial populate default sidebar playlist
    let songul = document.querySelector(".songslist ul");
    songul.innerHTML = "";
    
    songs.forEach(song => {
        let cleanName = decodeURIComponent(song.replace(/Copy\.mp3|Copy|\.mp3/gi, '').trim());
        songul.innerHTML += `<li> 
            <img class="invert music-note" src="quaver.png" alt="">
            <div class="info">
                <div>${song}</div>
                <div style="font-size:11px; opacity:0.65; max-width:180px; overflow:hidden; text-overflow:ellipsis;">${cleanName}</div>
            </div>
            <div class="playnow">
                <span>Play Now</span>
                <img class="invert" src="playsong.png" alt="">
            </div>
        </li>`;
    });
    
    // Click events to original list tracks
    Array.from(document.querySelector(".songslist").getElementsByTagName("li")).forEach(e => {
        e.addEventListener("click", () => {
            playMusic(e.querySelector(".info div").innerHTML.trim());
        });
    });

    // 6. EVENT LISTENERS SETUP

    // Play/Pause Button Transport Click handler
    let playBtnCircle = document.getElementById("playBtnCircle");
    playBtnCircle.addEventListener("click", () => {
        if (currentsong.paused) {
            currentsong.play().catch(err => console.log(err));
            document.getElementById("play").src = "pause-button.png";
        } else {
            currentsong.pause();
            document.getElementById("play").src = "play.png";
        }
        highlightActiveSong();
    });

    // Track timings progress state listener
    currentsong.addEventListener("timeupdate", () => {
        if (!currentsong.duration) return;
        document.getElementById("songtime").innerHTML = `${formatSecondsToMinutes(currentsong.currentTime)} / ${formatSecondsToMinutes(currentsong.duration)}`;
        let percentageProgress = (currentsong.currentTime / currentsong.duration) * 100;
        document.querySelector(".circle").style.left = percentageProgress + "%";
    });

    // Track completion ended listener - triggers autoplay next
    currentsong.addEventListener("ended", () => {
        console.log("Track finished playing. Auto-advancing next...");
        playNextSong();
    });

    // Seek bar cursor click triggers
    document.querySelector(".seekbar").addEventListener("click", e => {
        let rect = e.currentTarget.getBoundingClientRect();
        let circlemove = ((e.clientX - rect.left) / rect.width) * 100;
        if (circlemove < 0) circlemove = 0;
        if (circlemove > 100) circlemove = 100;
        
        document.querySelector(".circle").style.left = circlemove + "%";
        if (currentsong.duration) {
            currentsong.currentTime = (currentsong.duration * circlemove) / 100;
        }
    });  

    // Volume level ranges adjust
    let volSlider = document.getElementById("volumeSlider");
    volSlider.addEventListener("input", (e) => {
        let val = parseInt(e.target.value);
        currentsong.volume = val / 100;
        
        let volIcon = document.getElementById("volumeIcon");
        if (val === 0) {
            volIcon.src = "mute.png";
        } else {
            volIcon.src = "volume-up.png";
        }
    });

    // Volume mute clicks
    document.getElementById("volumeIcon").addEventListener("click", e => {
        let slider = document.getElementById("volumeSlider");
        let icon = e.currentTarget;
        
        if (currentsong.volume > 0) {
            lastVolume = currentsong.volume;
            currentsong.volume = 0;
            slider.value = 0;
            icon.src = "mute.png";
        } else {
            currentsong.volume = lastVolume;
            slider.value = lastVolume * 100;
            icon.src = "volume-up.png";
        }
    });

    // Next/Prev track control button actions
    document.getElementById("previous").addEventListener("click", () => {
        playPrevSong();
    });
    
    document.getElementById("next").addEventListener("click", () => {
        playNextSong();
    });

    // Sidebar Liked Songs shortcut click
    document.getElementById("likedSongsShortcut").addEventListener("click", () => {
        loadLikedSongsPlaylist();
    });

    // Playbar heart liked toggle clicks
    document.getElementById("likeBtn").addEventListener("click", () => {
        toggleLikeCurrentSong();
    });

    // Search filtration query typing listener
    document.getElementById("searchInput").addEventListener("input", (e) => {
        let query = e.target.value.toLowerCase().trim();
        filterGridAndSongs(query);
    });

    // Sidebar navigation selectors
    document.getElementById("homeNavBtn").addEventListener("click", () => {
        document.getElementById("homeNavBtn").classList.add("active");
        document.getElementById("searchNavBtn").classList.remove("active");
        document.getElementById("searchInput").value = "";
        filterGridAndSongs("");
        
        // Load default folder again
        getsongs("songs/ncs").then(() => {
            let activeTitle = document.getElementById("activePlaylistTitle");
            activeTitle.innerHTML = "All Songs";
            
            let songul = document.querySelector(".songslist ul");
            songul.innerHTML = "";
            songs.forEach(song => {
                let cleanName = decodeURIComponent(song.replace(/Copy\.mp3|Copy|\.mp3/gi, '').trim());
                songul.innerHTML += `<li> 
                    <img class="invert music-note" src="quaver.png" alt="">
                    <div class="info">
                        <div>${song}</div>
                        <div style="font-size:11px; opacity:0.65; max-width:180px; overflow:hidden; text-overflow:ellipsis;">${cleanName}</div>
                    </div>
                    <div class="playnow">
                        <span>Play Now</span>
                        <img class="invert" src="playsong.png" alt="">
                    </div>
                </li>`;
            });
            
            Array.from(songul.getElementsByTagName("li")).forEach(li => {
                li.addEventListener("click", () => {
                    playMusic(li.querySelector(".info div").innerHTML.trim());
                });
            });
            highlightActiveSong();
        });
    });

    document.getElementById("searchNavBtn").addEventListener("click", () => {
        document.getElementById("searchNavBtn").classList.add("active");
        document.getElementById("homeNavBtn").classList.remove("active");
        document.getElementById("searchInput").focus();
    });

    // Mobile navigation drawers toggles
    document.querySelector(".hamburgur").addEventListener("click", () => {
        document.querySelector(".left").classList.add("show-sidebar");
    });

    document.querySelector(".close").addEventListener("click", () => {
        document.querySelector(".left").classList.remove("show-sidebar");
    });

    // Custom playlist creator button triggers
    document.getElementById("createPlaylistBtn").addEventListener("click", () => {
        let playlistName = prompt("Enter a name for your new playlist:");
        if (playlistName && playlistName.trim() !== "") {
            createCustomPlaylist(playlistName.trim());
        }
    });

    // Authentication popup modals toggles
    const signupModal = document.getElementById("signupModal");
    const loginModal = document.getElementById("loginModal");
    
    document.getElementById("signupBtn").addEventListener("click", () => signupModal.classList.add("show"));
    document.getElementById("loginBtn").addEventListener("click", () => loginModal.classList.add("show"));
    
    document.getElementById("closeSignup").addEventListener("click", () => signupModal.classList.remove("show"));
    document.getElementById("closeLogin").addEventListener("click", () => loginModal.classList.remove("show"));
    
    window.addEventListener("click", (e) => {
        if (e.target === signupModal) signupModal.classList.remove("show");
        if (e.target === loginModal) loginModal.classList.remove("show");
    });
    
    document.getElementById("switchToLogin").addEventListener("click", (e) => {
        e.preventDefault();
        signupModal.classList.remove("show");
        loginModal.classList.add("show");
    });
    
    document.getElementById("switchToSignup").addEventListener("click", (e) => {
        e.preventDefault();
        loginModal.classList.remove("show");
        signupModal.classList.add("show");
    });

    // Auth forms submit handlers
    document.getElementById("signupForm").addEventListener("submit", (e) => {
        e.preventDefault();
        let username = document.getElementById("signupUsername").value.trim();
        performLogin(username);
        signupModal.classList.remove("show");
    });
    
    document.getElementById("loginForm").addEventListener("submit", (e) => {
        e.preventDefault();
        let input = document.getElementById("loginEmail").value.trim();
        let username = input.includes("@") ? input.split("@")[0] : input;
        performLogin(username);
        loginModal.classList.remove("show");
    });

    // Profile menu toggle button clicks
    const profileBtn = document.getElementById("profileBtn");
    const dropdownMenu = document.getElementById("dropdownMenu");
    profileBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        dropdownMenu.classList.toggle("show");
    });
    
    window.addEventListener("click", () => {
        dropdownMenu.classList.remove("show");
    });
    
    document.getElementById("logoutBtn").addEventListener("click", (e) => {
        e.preventDefault();
        localStorage.removeItem("spotifyUser");
        updateUserSession();
    });
}

// Launching Main logic thread
main();