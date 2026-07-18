const WEDDING_DATE = new Date("2026-11-22T17:00:00+01:00");
const els = {
  days: document.getElementById("days"),
  hours: document.getElementById("hours"),
  minutes: document.getElementById("minutes"),
  seconds: document.getElementById("seconds"),
  openButton: document.getElementById("openInvitation"),
  countdownSection: document.getElementById("cuenta-atras")
};

function pad(value, length = 2) {
  return String(value).padStart(length, "0");
}

function updateCountdown() {
  let difference = WEDDING_DATE.getTime() - Date.now();
  if (difference < 0) difference = 0;
  const days = Math.floor(difference / 86400000);
  const hours = Math.floor((difference % 86400000) / 3600000);
  const minutes = Math.floor((difference % 3600000) / 60000);
  const seconds = Math.floor((difference % 60000) / 1000);
  els.days.textContent = pad(days, 3);
  els.hours.textContent = pad(hours);
  els.minutes.textContent = pad(minutes);
  els.seconds.textContent = pad(seconds);
}

els.openButton.addEventListener("click", () => {
  els.countdownSection.scrollIntoView({ behavior: "smooth", block: "start" });
});

const observer = new IntersectionObserver(entries => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.classList.add("is-visible");
      observer.unobserve(entry.target);
    }
  });
}, { threshold: 0.16 });

document.querySelectorAll(".reveal").forEach(el => observer.observe(el));
updateCountdown();
setInterval(updateCountdown, 1000);

// Confirmación de asistencia conectada con Supabase
const SUPABASE_URL = "https://impauxkdtcwngvlknysa.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_TN0nnQZ_g6l1RNTuE4f9qg_iaI_USWV";

const rsvpForm = document.getElementById("rsvpForm");
const formStatus = document.getElementById("formStatus");

function clearRsvpErrors() {
  document.querySelectorAll(".field-error").forEach(element => {
    element.textContent = "";
  });
  formStatus.textContent = "";
  formStatus.className = "form-status";
}

function validateRsvpForm() {
  clearRsvpErrors();
  let valid = true;

  const guestName = document.getElementById("guestName");
  const attendance = rsvpForm.querySelector(
    'input[name="asistencia"]:checked'
  );

  if (!guestName.value.trim()) {
    document.querySelector('[data-error-for="guestName"]').textContent =
      "Escribe tu nombre y apellidos.";
    valid = false;
  }

  if (!attendance) {
    document.querySelector('[data-error-for="attendance"]').textContent =
      "Indica si podrás acompañarnos.";
    valid = false;
  }

  return valid;
}

function getRsvpPayload() {
  const formData = new FormData(rsvpForm);

  return {
    nombre: String(formData.get("nombre") || "").trim(),
    telefono: String(formData.get("telefono") || "").trim(),
    asistencia: String(formData.get("asistencia") || "").trim(),
    acompanante: String(formData.get("acompanante") || "").trim(),
    alergias: String(formData.get("alergias") || "").trim(),
    comentarios: String(formData.get("comentarios") || "").trim()
  };
}

rsvpForm.addEventListener("submit", async event => {
  event.preventDefault();

  if (!validateRsvpForm()) {
    return;
  }

  const submitButton = rsvpForm.querySelector('button[type="submit"]');
  const originalButtonText = submitButton.textContent;

  submitButton.disabled = true;
  submitButton.textContent = "Enviando…";
  formStatus.textContent = "Estamos guardando tu confirmación…";

  try {
    const response = await fetch(
      `${SUPABASE_URL}/rest/v1/invitados`,
      {
        method: "POST",
        headers: {
          "apikey": SUPABASE_PUBLISHABLE_KEY,
          "Authorization": `Bearer ${SUPABASE_PUBLISHABLE_KEY}`,
          "Content-Type": "application/json",
          "Prefer": "return=minimal"
        },
        body: JSON.stringify(getRsvpPayload())
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(errorText || "No se pudo guardar la confirmación.");
    }

    rsvpForm.reset();
    formStatus.textContent =
      "¡Muchas gracias! Hemos recibido tu confirmación. " +
      "Estamos deseando celebrar este día contigo.";
    formStatus.className = "form-status is-success";
  } catch (error) {
    console.error("Error al enviar la confirmación:", error);
    formStatus.textContent =
      "No hemos podido guardar la confirmación. " +
      "Comprueba la conexión e inténtalo de nuevo.";
    formStatus.className = "form-status is-error";
  } finally {
    submitButton.disabled = false;
    submitButton.textContent = originalButtonText;
  }
});

const welcomeScreen=document.getElementById("welcomeScreen");
const enterInvitation=document.getElementById("enterInvitation");
const musicControl=document.getElementById("musicControl");
const backgroundMusic=document.getElementById("backgroundMusic");
const scrollProgress=document.getElementById("scrollProgress");

enterInvitation.addEventListener("click",()=>{
  welcomeScreen.classList.add("is-hidden");
  document.body.classList.remove("is-locked");
  backgroundMusic.play().then(()=>{
    musicControl.classList.add("is-playing");
    musicControl.setAttribute("aria-pressed","true");
  }).catch(()=>{});
});

musicControl.addEventListener("click",async()=>{
  if(backgroundMusic.paused){
    try{
      await backgroundMusic.play();
      musicControl.classList.add("is-playing");
      musicControl.setAttribute("aria-pressed","true");
    }catch(error){}
  }else{
    backgroundMusic.pause();
    musicControl.classList.remove("is-playing");
    musicControl.setAttribute("aria-pressed","false");
  }
});

function updateScrollProgress(){
  const max=document.documentElement.scrollHeight-window.innerHeight;
  const value=max>0?(window.scrollY/max)*100:0;
  scrollProgress.style.width=`${Math.min(100,Math.max(0,value))}%`;
}
window.addEventListener("scroll",updateScrollProgress,{passive:true});
window.addEventListener("resize",updateScrollProgress);
updateScrollProgress();

const TEMPORARY_ACCESS_CODE="DR221126";
const accessGate=document.getElementById("accessGate");
const accessForm=document.getElementById("accessForm");
const accessCode=document.getElementById("accessCode");
const accessMessage=document.getElementById("accessMessage");

function grantAccess(){
  accessGate.classList.add("is-hidden");
  sessionStorage.setItem("wedding_access_granted","true");
}
if(sessionStorage.getItem("wedding_access_granted")==="true"){grantAccess();}
accessForm.addEventListener("submit",e=>{
  e.preventDefault();
  if(accessCode.value.trim().toUpperCase()===TEMPORARY_ACCESS_CODE){
    accessMessage.textContent="";
    grantAccess();
  }else{
    accessMessage.textContent="Código incorrecto.";
    accessCode.select();
  }
});

document.querySelectorAll("[data-copy]").forEach(btn=>{
  btn.addEventListener("click",async()=>{
    const message = btn.dataset.success || "Copiado";
    try{
      await navigator.clipboard.writeText(btn.dataset.copy);
      document.getElementById("copyStatus").textContent = message;
    }catch(e){
      document.getElementById("copyStatus").textContent =
        "No se pudo copiar automáticamente.";
    }
  });
});
