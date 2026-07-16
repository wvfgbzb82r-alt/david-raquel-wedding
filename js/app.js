const WEDDING_DATE=new Date("2026-11-22T17:00:00+01:00");
const daysEl=document.getElementById("days"),hoursEl=document.getElementById("hours"),minutesEl=document.getElementById("minutes"),secondsEl=document.getElementById("seconds");
function pad(v,l=2){return String(v).padStart(l,"0")}
function updateCountdown(){let d=WEDDING_DATE.getTime()-Date.now();if(d<0)d=0;daysEl.textContent=pad(Math.floor(d/86400000),3);hoursEl.textContent=pad(Math.floor((d%86400000)/3600000));minutesEl.textContent=pad(Math.floor((d%3600000)/60000));secondsEl.textContent=pad(Math.floor((d%60000)/1000))}
document.getElementById("openInvitation").addEventListener("click",()=>document.getElementById("cuenta-atras").scrollIntoView({behavior:"smooth",block:"start"}));
updateCountdown();setInterval(updateCountdown,1000);
