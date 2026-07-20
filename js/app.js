if ("scrollRestoration" in history) history.scrollRestoration = "manual";
const WEDDING_DATE = new Date("2026-11-22T17:00:00+01:00");
const els = {
  days: document.getElementById("days"),
  hours: document.getElementById("hours"),
  minutes: document.getElementById("minutes"),
  seconds: document.getElementById("seconds"),
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
      `${SUPABASE_URL}/rest/v1/rpc/guardar_confirmacion_v24`,
      {
        method: "POST",
        headers: {
          "apikey": SUPABASE_PUBLISHABLE_KEY,
          "Authorization": `Bearer ${SUPABASE_PUBLISHABLE_KEY}`,
          "Content-Type": "application/json",
          "Prefer": "return=representation"
        },
        body: JSON.stringify({ datos: getRsvpPayload() })
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      let detail = errorText;
      try {
        const parsed = JSON.parse(errorText);
        detail = parsed.message || parsed.details || parsed.hint || errorText;
      } catch {}
      throw new Error(detail || `Error ${response.status}`);
    }

    rsvpForm.reset();
    formStatus.textContent =
      "¡Muchas gracias! Hemos recibido tu confirmación. " +
      "Estamos deseando celebrar este día contigo.";
    formStatus.className = "form-status is-success";
  } catch (error) {
    console.error("Error al enviar la confirmación:", error);
    const configurationProblem = /column|policy|permission|row-level|schema|relation|function|rpc/i.test(error.message);
    formStatus.textContent = configurationProblem
      ? "La confirmación todavía no está activada. Ejecuta INSTALACION-UNICA-SUPABASE.sql en Supabase."
      : `No hemos podido guardar la confirmación: ${error.message}`;
    formStatus.className = "form-status is-error";
  } finally {
    submitButton.disabled = false;
    submitButton.textContent = originalButtonText;
  }
});

const musicControl=document.getElementById("musicControl");
const backgroundMusic=document.getElementById("backgroundMusic");
const scrollProgress=document.getElementById("scrollProgress");




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

let accessStarted = false;

function startWeddingIntro() {
  if (accessStarted) return;
  accessStarted = true;

  accessGate.classList.add("is-leaving");

  // La interacción del código permite iniciar la música sin bloqueo del navegador.
  if (backgroundMusic) {
    backgroundMusic.volume = 0;
    backgroundMusic.play().then(() => {
      musicControl?.classList.add("is-playing");
      musicControl?.setAttribute("aria-pressed", "true");

      const fadeDuration = 1800;
      const targetVolume = 0.24;
      const startedAt = performance.now();

      function fadeIn(now) {
        const progress = Math.min(1, (now - startedAt) / fadeDuration);
        backgroundMusic.volume = targetVolume * progress;
        if (progress < 1) requestAnimationFrame(fadeIn);
      }

      requestAnimationFrame(fadeIn);
    }).catch(() => {});
  }

  window.setTimeout(() => {
    accessGate.hidden = true;

    window.scrollTo(0, 0);
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;

        window.scrollTo(0, 0);
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;

    document.body.classList.remove("is-locked");
    document.body.classList.add("access-granted");

    window.setTimeout(() => {
      document.body.classList.remove("access-granted");
    }, 1000);
  }, 700);
}

function grantAccess({ remember = true } = {}) {
  if (remember) {
    sessionStorage.setItem("wedding_access_granted", "true");
  }

  startWeddingIntro();
}

if (
  sessionStorage.getItem("wedding_access_granted") === "true" &&
  !new URLSearchParams(window.location.search).get("i")
) {
  window.setTimeout(() => grantAccess({ remember: false }), 100);
}

let currentPersonalizedInvitation = null;

function applyPersonalizedInvitation(invitation, code) {
  if (!invitation?.nombre_mostrado) return false;

  currentPersonalizedInvitation = invitation;
  document.documentElement.dataset.personalizedInvitation = "true";
  document.documentElement.dataset.invitationCode = code;

  const welcome = document.getElementById("personalizedWelcome");
  const guestName = document.getElementById("personalizedGuestName");
  const guestNameInput = document.getElementById("guestName");

  if (welcome && guestName) {
    guestName.textContent = invitation.nombre_mostrado;
    welcome.hidden = false;
  }

  if (guestNameInput) {
    guestNameInput.value = invitation.nombre_mostrado;
    guestNameInput.readOnly = true;
  }

  sessionStorage.setItem(
    "wedding_personalized_invitation",
    JSON.stringify({
      codigo: code,
      nombre_mostrado: invitation.nombre_mostrado,
      max_personas: invitation.max_personas || 1
    })
  );

  return true;
}

async function resolvePersonalizedCode(code) {
  const response = await fetch(
    `${SUPABASE_URL}/rest/v1/rpc/abrir_invitacion_personalizada`,
    {
      method: "POST",
      headers: {
        "apikey": SUPABASE_PUBLISHABLE_KEY,
        "Authorization": `Bearer ${SUPABASE_PUBLISHABLE_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ codigo_recibido: code })
    }
  );

  let data = null;
  try {
    data = await response.json();
  } catch {}

  if (!response.ok) {
    throw new Error(data?.message || "Código personal no válido");
  }

  const invitation = Array.isArray(data) ? data[0] : data;
  return invitation?.nombre_mostrado ? invitation : null;
}

accessForm.addEventListener("submit", async event => {
  event.preventDefault();

  const submitButton = accessForm.querySelector('button[type="submit"]');
  const code = accessCode.value.trim().toUpperCase();

  if (!code) {
    accessMessage.textContent = "Introduce el código.";
    return;
  }

  accessMessage.textContent = "";
  submitButton.disabled = true;
  submitButton.textContent = "Accediendo…";

  try {
    if (code === TEMPORARY_ACCESS_CODE) {
      grantAccess();
      return;
    }

    const invitation = await resolvePersonalizedCode(code);

    if (!invitation) {
      throw new Error("Código incorrecto.");
    }

    applyPersonalizedInvitation(invitation, code);
    grantAccess();
  } catch (error) {
    accessMessage.textContent =
      error.message === "Código personal no válido"
        ? "Código incorrecto."
        : error.message;
    accessCode.select();
    submitButton.disabled = false;
    submitButton.textContent = "Continuar";
  }
});


async function copyTextToClipboard(value) {
  // Método moderno: funciona normalmente en HTTPS.
  if (navigator.clipboard && window.isSecureContext) {
    await navigator.clipboard.writeText(value);
    return;
  }

  // Método alternativo para navegadores móviles o permisos restringidos.
  const temporaryInput = document.createElement("textarea");
  temporaryInput.value = value;
  temporaryInput.setAttribute("readonly", "");
  temporaryInput.style.position = "fixed";
  temporaryInput.style.left = "-9999px";
  temporaryInput.style.top = "0";
  document.body.appendChild(temporaryInput);

  temporaryInput.focus();
  temporaryInput.select();
  temporaryInput.setSelectionRange(0, temporaryInput.value.length);

  const copied = document.execCommand("copy");
  document.body.removeChild(temporaryInput);

  if (!copied) {
    throw new Error("El navegador no permitió copiar.");
  }
}

document.querySelectorAll("[data-copy]").forEach(button => {
  button.addEventListener("click", async () => {
    const copyStatus = document.getElementById("copyStatus");
    const originalText = button.textContent;
    const successMessage = button.dataset.success || "Copiado";

    button.disabled = true;
    button.textContent = "Copiando…";

    try {
      await copyTextToClipboard(button.dataset.copy);
      copyStatus.textContent = successMessage;
      button.textContent = "¡Copiado!";

      window.setTimeout(() => {
        button.textContent = originalText;
      }, 1600);
    } catch (error) {
      console.error("Error al copiar:", error);
      copyStatus.textContent =
        "No se ha podido copiar automáticamente. Mantén pulsado el número para copiarlo.";
      button.textContent = originalText;
    } finally {
      window.setTimeout(() => {
        button.disabled = false;
      }, 500);
    }
  });
});



// =========================================================
// V40 · Acceso personalizado por enlace ?i=CODIGO
// =========================================================

async function loadPersonalizedInvitation() {
  const params = new URLSearchParams(window.location.search);
  const queryCode = String(params.get("i") || "").trim().toUpperCase();

  if (queryCode) {
    try {
      const invitation = await resolvePersonalizedCode(queryCode);

      if (invitation) {
        applyPersonalizedInvitation(invitation, queryCode);
        grantAccess();
      }
    } catch (error) {
      console.warn("Invitación personalizada no válida:", error);
      accessMessage.textContent =
        "El enlace personalizado no es válido o ya no está activo.";
    }

    return;
  }

  // Restaurar la personalización si se recarga la misma pestaña.
  try {
    const saved = JSON.parse(
      sessionStorage.getItem("wedding_personalized_invitation") || "null"
    );

    if (saved?.nombre_mostrado && saved?.codigo) {
      applyPersonalizedInvitation(saved, saved.codigo);
    }
  } catch {}
}

loadPersonalizedInvitation();




if (backgroundMusic) {
  backgroundMusic.volume = 0.24;
}


function normalizeIbanDataDetectors() {
  const iban = document.querySelector(".account-number");
  if (!iban) return;

  const detectedLinks = iban.querySelectorAll("a");
  detectedLinks.forEach(link => {
    link.replaceWith(document.createTextNode(link.textContent || ""));
  });

  iban.style.color = "#8b6d38";
  iban.style.webkitTextFillColor = "#8b6d38";
  iban.style.textDecoration = "none";
}

normalizeIbanDataDetectors();

const ibanNode = document.querySelector(".account-number");
if (ibanNode && "MutationObserver" in window) {
  new MutationObserver(normalizeIbanDataDetectors).observe(ibanNode, {
    childList: true,
    subtree: true
  });
}
