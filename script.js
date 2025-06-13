console.log("lets write java script") 
let currentsong = new Audio();
let songs;
let currfolder;
function formatSecondsToMinutes(seconds) {
    if(isNaN(seconds) || seconds<0){
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

async function getsongs(folder){
    currfolder = folder ;
    let a = await fetch(`http://127.0.0.1:3000/${folder}/`)
    let response = await a.text();
    let div = document.createElement('div')   
    div.innerHTML = response;
    let as = div.getElementsByTagName('a')
     songs = []
    for (let i = 0; i < as.length; i++) {
        const element = as[i];
        if(element.href.endsWith(".mp3")){
            songs.push(element.href.split(`/${folder}/`)[1])
        }
        
    }
    return songs
  
   
  
}
 

const playMusic = (track ,pause=false) =>{
   // let adio = new Audio("/songs/" + track)   // it will find a music in songs folder 
   currentsong.src =  `${currfolder}/` + track ;    
    currentsong.play()
    if(!pause){
        currentsong.play()
        play.src = "pause-button.png"
    }
    document.querySelector(".songinfo").innerHTML = decodeURI(track)
    document.querySelector(".songtime").innerHTML ="00:00/00:00"

} 
  
 async function main(){


 
// get the lists of all songs 
   await getsongs("/songs/ncs")
console.log(songs)
playMusic(songs[0])
// show all the songs in the playlist
let songul = document.querySelector(".songslist").getElementsByTagName("ul")[0] 
songul.innerHTML =""
for (const song of songs    ) {
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
Array.from(document.querySelector(".songslist").getElementsByTagName("li")).forEach( e=>{
    e.addEventListener("click" , element =>{
        console.log(e.querySelector(".info").firstElementChild.innerHTML)
        playMusic(e.querySelector(".info").firstElementChild.innerHTML.trim())  // trim removing whitespaces from begining and ending 
  
    })
})
// attach an event listener to play next and previous 
play.addEventListener("click" , () => {   // play referd to id 
    if(currentsong.paused){
        currentsong.play()
        play.src = "pause-button.png"
    }
    else{
        currentsong.pause()
        play.src= "play.png"
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
currentsong.addEventListener("timeupdate" , () =>{
    console.log(currentsong.currentTime , currentsong.duration)
    document.querySelector(".songtime").innerHTML = `${formatSecondsToMinutes(currentsong.currentTime)}/ ${formatSecondsToMinutes(currentsong.duration)}`

    document.querySelector(".circle").style.left = (currentsong.currentTime/currentsong.duration)*100 +"%"

})

// add an event listener to seekbar for circle control
document.querySelector(".seekbar").addEventListener("click" , e=>{
    let circlemove = (e.offsetX/e.target.getBoundingClientRect().width)*100   //gbcr function use to compare the viewwidth with width
 document.querySelector(".circle").style.left = circlemove+ "%"
    
 currentsong.currentTime = ((currentsong.duration)*circlemove)/100
})


// add event listener for hamburgur
document.querySelector(".hamburgur").addEventListener("click" ,()=>{
    document.querySelector(".left").style.left = "0"
})


 
// add an event listener for close button 
document.querySelector(".close").addEventListener("click" , () =>{
    document.querySelector(".left").style.left = "-120%"
})
// add event listener to previous and next 
previous.addEventListener("click" , () =>{
    console.log(" previous clicked")
    console.log(currentsong)
     let index = songs.indexOf(currentsong.src.split("/").slice(-1) [0])
   if(index-1 >= 0){

       playMusic(songs[index-1])
   }

})
next.addEventListener("click" , () =>{
    console.log("next clicked")

    let index = songs.indexOf(currentsong.src.split("/").slice(-1) [0])
   if(index+1 < songs.length ){

       playMusic(songs[index+1])
   }
})

// add event listener to volume 
document.querySelector(".range").getElementsByTagName("input")[0].addEventListener("change",(e)=>{
    console.log("setting volume to",e.target.value,"/100")
    currentsong.volume = parseInt(e.target.value)/100
})

// load the playlist when card was card clicked 
 Array.from(document.getElementsByClassName("card")).forEach(e=>{   //for each work on collection so arrayfrom converting into aray 
     console.log(e)
     e.addEventListener("click",async item=>{
         console.log(item, item.currentTarget.dataset)
         songs = await getsongs(`songs/${item.currentTarget.dataset.folder}`)      
     })
 })

 }



main()  