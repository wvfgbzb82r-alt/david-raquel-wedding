const target = new Date("2026-11-22T17:00:00+01:00");
const daysEl=document.getElementById("days");
const hoursEl=document.getElementById("hours");
const minutesEl=document.getElementById("minutes");
const secondsEl=document.getElementById("seconds");

function pad(n,l=2){return String(n).padStart(l,"0")}
function updateCountdown(){
  let diff=target.getTime()-Date.now();
  if(diff<0) diff=0;
  const days=Math.floor(diff/86400000);
  const hours=Math.floor((diff%86400000)/3600000);
  const minutes=Math.floor((diff%3600000)/60000);
  const seconds=Math.floor((diff%60000)/1000);
  daysEl.textContent=pad(days,3);
  hoursEl.textContent=pad(hours);
  minutesEl.textContent=pad(minutes);
  secondsEl.textContent=pad(seconds);
}
document.getElementById("openInvitation").addEventListener("click",()=>{
  document.getElementById("cuenta-atras").scrollIntoView({behavior:"smooth"});
});
updateCountdown();
setInterval(updateCountdown,1000);