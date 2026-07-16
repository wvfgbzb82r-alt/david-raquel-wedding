function go(){document.getElementById("bienvenida").scrollIntoView({behavior:"smooth"});}
const target=new Date("2026-11-22T17:00:00");
function tick(){let d=target-new Date();if(d<0)d=0;let days=Math.floor(d/86400000),h=Math.floor(d/3600000)%24,m=Math.floor(d/60000)%60,s=Math.floor(d/1000)%60;timer.textContent=`${days} días ${h} h ${m} min ${s} s`;}
setInterval(tick,1000);tick();