console.log("lets write java script")
//i have not remove conspole.log() to fix bug if come
let currentsong = new Audio();
let songs;
let currentfolder;
function formatSecondsToMinutes(seconds) {
    if (isNaN(seconds) || seconds < 0) {
        return "invalid input";
    }
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;

    const formattedMins = String(mins).padStart(2, '0');
    const formattedSecs = String(secs).padStart(2, '0');

    return `${formattedMins}:${formattedSecs}`;
}

// Example usage:
// console.log(formatSecondsToMinutes(12));   // Output: "00:12"
// console.log(formatSecondsToMinutes(125));  // Output: "02:05"

async function getsongs(folder) {
    currfolder = folder;
    let a = await fetch(`http://127.0.0.1:3000/${folder}/`)
    let response = await a.text();
    let div = document.createElement('div')
    div.innerHTML = response;
    let as = div.getElementsByTagName('a')
    songs = []
    for (let i = 0; i < as.length; i++) {
        const element = as[i];
        if (element.href.endsWith(".mp3")) {
            songs.push(element.href.split(`/${folder}/`)[1])
        }

    }
    return songs



}


const playMusic = (track, pause = false) => {
    // let adio = new Audio("/songs/" + track)   // it will find a music in songs folder 
    currentsong.src = `${currfolder}/` + track;
    currentsong.play()
    if (!pause) {
        currentsong.play()
        play.src = "pause-button.png"
    }
    document.querySelector(".songinfo").innerHTML = decodeURI(track)
    document.querySelector(".songtime").innerHTML = "00:00/00:00"

}


async function displayAlbums() {
    let a = await fetch(`http://127.0.0.1:3000/songs/`)
    let response = await a.text();
    let div = document.createElement('div')
    div.innerHTML = response;
    let anchors = div.getElementsByTagName("a")
    let cardcontainer = document.querySelector(".cardcontainer")
    let array = Array.from(anchors)
    for (let index = 0; index < array.length; index++) {
        const e = array[index];


        if (e.href.includes("/songs")) {
            let folder = e.href.split("/").slice(-2)[0]  // getting different folders inside song folder
            console.log(folder)
            //[0] slice(-2) mai 2 array with 2 element de rha hai pehle mai name dusre mai '' so [0] ensuring a name 

            // now we get the metadats of the folder
            let a = await fetch(`http://127.0.0.1:3000/songs/${folder}/info.json`)
            let response = await a.json();
            console.log(response)
            cardcontainer.innerHTML = cardcontainer.innerHTML + `  <div 
            data-folder="${folder}" class="card ">

                        <div class="play invert">
                            <img src="play-button.png" alt="">
                        </div>
                        <img src="/songs/${folder}/cover.jpeg" alt="">
                        <h2>${response.title}</h2>
                        <p>${response.description}</p>
                    </div>`




        }
    }
    Array.from(document.getElementsByClassName("card")).forEach(e => {
        e.addEventListener("click", async item => {
            songs = await getsongs(`songs/${item.currentTarget.dataset.folder}`);

            // Update the playlist UI
            let songul = document.querySelector(".songslist").getElementsByTagName("ul")[0];
            songul.innerHTML = "";
            for (const song of songs) {
                songul.innerHTML += `<li> 
                <img class="invert" src="quaver.png" alt="">
                <div class="info">
                    <div>${song}</div>
                    <div>kunal</div>
                </div>
                <div class="playnow">
                    <span>Play Now</span>
                    <img class="invert" src="playsong.png" alt="">
                </div>
            </li>`;
            }

            // Attach event listeners to new song list
            Array.from(songul.getElementsByTagName("li")).forEach(li => {
                li.addEventListener("click", element => {
                    playMusic(li.querySelector(".info").firstElementChild.innerHTML.trim());
                });
            });

            // Play the first song in the new folder (optional)
            //if (songs.length > 0) {
            //    playMusic(songs[0]);
            //}
        });
    });



}
async function main() {



    // get the lists of all songs 
    await getsongs("/songs/ncs")
    console.log(songs)
    playMusic(songs[0], true)
    // display all the albums on the page 
    displayAlbums()

    // show all the songs in the playlist
    let songul = document.querySelector(".songslist").getElementsByTagName("ul")[0]
    songul.innerHTML = ""
    for (const song of songs) {
        songul.innerHTML = songul.innerHTML + `<li> 
                                <img class="invert" src="quaver.png" alt="">
                                <div class="info">
                                    <div>${song}</div>
                                    <div>kunal</div>
                                </div>
                            <div class="playnow">
                                <span>Play Now</span>
                                <img class="invert" src="playsong.png" alt="">
                            </div>
                             </li>`;

    }
    // attach an event listener to each song 
    Array.from(document.querySelector(".songslist").getElementsByTagName("li")).forEach(e => {
        e.addEventListener("click", element => {
            console.log(e.querySelector(".info").firstElementChild.innerHTML)
            playMusic(e.querySelector(".info").firstElementChild.innerHTML.trim())  // trim removing whitespaces from begining and ending 

        })
    })
    // attach an event listener to play next and previous 
    play.addEventListener("click", () => {   // play referd to id 
        if (currentsong.paused) {
            currentsong.play()
            play.src = "pause-button.png"
        }
        else {
            currentsong.pause()
            play.src = "play.png"
        }
    })

    // play the first song
    //var audio = new Audio(songs[0]);
    //audio.play();


    // audio.addEventListener("loadeddata" , () =>{
    //  let duration = audio.duration;
    //     console.log(audio.duration, audio.currentSrc, audio.currentTime)
    //     // the duration variable now holds the duration(in seconds) of the audio clip   
    //     // loaded data is an event that fires when the audio element has loade enough data to start playing
    // });


    // listen for timeupdate event
    currentsong.addEventListener("timeupdate", () => {
        console.log(currentsong.currentTime, currentsong.duration)
        document.querySelector(".songtime").innerHTML = `${formatSecondsToMinutes(currentsong.currentTime)}/ ${formatSecondsToMinutes(currentsong.duration)}`

        document.querySelector(".circle").style.left = (currentsong.currentTime / currentsong.duration) * 100 + "%"

    })

    // add an event listener to seekbar for circle control
    document.querySelector(".seekbar").addEventListener("click", e => {
        let circlemove = (e.offsetX / e.target.getBoundingClientRect().width) * 100   //gbcr function use to compare the viewwidth with width
        document.querySelector(".circle").style.left = circlemove + "%"

        currentsong.currentTime = ((currentsong.duration) * circlemove) / 100
    })


    // add event listener for hamburgur
    document.querySelector(".hamburgur").addEventListener("click", () => {
        document.querySelector(".left").style.left = "0"
    })



    // add an event listener for close button 
    document.querySelector(".close").addEventListener("click", () => {
        document.querySelector(".left").style.left = "-120%"
    })
    // add event listener to previous and next 
    previous.addEventListener("click", () => {
        console.log(" previous clicked")
        console.log(currentsong)
        let index = songs.indexOf(currentsong.src.split("/").slice(-1)[0])
        if (index - 1 >= 0) {

            playMusic(songs[index - 1])
        }

    })
    next.addEventListener("click", () => {
        console.log("next clicked")

        let index = songs.indexOf(currentsong.src.split("/").slice(-1)[0])
        if (index + 1 < songs.length) {

            playMusic(songs[index + 1])
        }
    })

    // add event listener to volume 
    document.querySelector(".range").getElementsByTagName("input")[0].addEventListener("change", (e) => {
        console.log("setting volume to", e.target.value, "/100")
        currentsong.volume = parseInt(e.target.value) / 100
    })

    // load the playlist when card was card clicked 
    // Array.from(document.getElementsByClassName("card")).forEach(e => {
    //     e.addEventListener("click", async item => {
    //         songs = await getsongs(`songs/${item.currentTarget.dataset.folder}`);

    //         // Update the playlist UI
    //         let songul = document.querySelector(".songslist").getElementsByTagName("ul")[0];
    //         songul.innerHTML = "";
    //         for (const song of songs) {
    //             songul.innerHTML += `<li> 
    //             <img class="invert" src="quaver.png" alt="">
    //             <div class="info">
    //                 <div>${song}</div>
    //                 <div>kunal</div>
    //             </div>
    //             <div class="playnow">
    //                 <span>Play Now</span>
    //                 <img class="invert" src="playsong.png" alt="">
    //             </div>
    //         </li>`;
    //         }

    //         // Attach event listeners to new song list
    //         Array.from(songul.getElementsByTagName("li")).forEach(li => {
    //             li.addEventListener("click", element => {
    //                 playMusic(li.querySelector(".info").firstElementChild.innerHTML.trim());
    //             });
    //         });

    //         // Play the first song in the new folder (optional)
    //         if (songs.length > 0) {
    //             playMusic(songs[0]);
    //         }
    //     });
    // });


    // add event listener to mute the track
    document.querySelector(".volume").addEventListener("click", e =>{
        console.log(e.target)
        if(e.target.src.includes("volume-up.png")){
            e.target.src = e.target.src.replace("volume-up.png" ,"mute.png" ) 
            currentsong.volume = 0;
            document.querySelector(".range").getElementsByTagName("input")[0].value = 0;

        }
        else{
            e.target.src = "volume-up.png"
            currentsong.volume = 0.10;
        }
   })


}




main()  