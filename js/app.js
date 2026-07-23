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
const rsvpResult = document.getElementById("rsvpResult");
const adultsSelect = document.getElementById("adults");
const childrenSelect = document.getElementById("children");
const childrenField = document.getElementById("childrenField");

function clearRsvpErrors() {
  document.querySelectorAll(".field-error").forEach(element => {
    element.textContent = "";
  });
  formStatus.textContent = "";
  formStatus.className = "form-status";
  if (rsvpResult) {
    rsvpResult.hidden = true;
    rsvpResult.innerHTML = "";
    rsvpResult.className = "rsvp-result";
  }
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

  const adults = Number(document.getElementById("adults")?.value);
  const children = Number(document.getElementById("children")?.value);
  const adultsMax = Number(document.documentElement.dataset.adultsMax || 20);
  const childrenMax = Number(document.documentElement.dataset.childrenMax || 20);

  if (!Number.isInteger(adults) || adults < 0 || adults > adultsMax) {
    document.querySelector('[data-error-for="adults"]').textContent =
      `Indica un número de adultos entre 0 y ${adultsMax}.`;
    valid = false;
  }

  if (!Number.isInteger(children) || children < 0 || children > childrenMax) {
    document.querySelector('[data-error-for="children"]').textContent =
      `Indica un número de niños entre 0 y ${childrenMax}.`;
    valid = false;
  }

  if (attendance?.value === "Sí" && adults + children < 1) {
    document.querySelector('[data-error-for="adults"]').textContent =
      "Si vais a asistir, indica al menos una persona.";
    valid = false;
  }

  return valid;
}

function collectDietaryRequirements() {
  return Array.from(document.querySelectorAll(".dietary-row"))
    .map(row => {
      const type = row.querySelector(".dietary-type")?.value || "";
      const other = row.querySelector(".dietary-other")?.value.trim() || "";
      return {
        nombre: row.querySelector(".dietary-person")?.value || "",
        detalle: type === "Otra" ? other : type
      };
    })
    .filter(item => item.nombre || item.detalle);
}

function getRsvpPayload() {
  const formData = new FormData(rsvpForm);
  return {
    nombre: String(formData.get("nombre") || "").trim(),
    telefono: String(formData.get("telefono") || "").trim(),
    asistencia: String(formData.get("asistencia") || "").trim(),
    codigo_invitacion: document.documentElement.dataset.invitationCode || null,
    adultos: Number(formData.get("adultos") || 0),
    ninos: Number(formData.get("ninos") || 0),
    alergias: collectDietaryRequirements(),
    comentarios: String(formData.get("comentarios") || "").trim()
  };
}

const dietaryList = document.getElementById("dietaryList");
const addDietaryRowButton = document.getElementById("addDietaryRow");
const hasSpecialMenu = document.getElementById("hasSpecialMenu");

function attendeeNamesForDietary() {
  const mainName = document.getElementById("guestName")?.value.trim();
  const count = Number(adultsSelect?.value || 0) + Number(childrenSelect?.value || 0);
  return Array.from({ length: Math.max(1, count) }, (_, index) => ({
    value: index === 0 && mainName ? mainName : `Asistente ${index + 1}`,
    label: index === 0 && mainName ? mainName : `Asistente ${index + 1}`
  }));
}

function refreshDietaryPersonOptions() {
  const names = attendeeNamesForDietary();
  document.querySelectorAll(".dietary-person").forEach(select => {
    const current = select.value;
    select.innerHTML = names.map(item =>
      `<option value="${item.value}">${item.label}</option>`
    ).join("");
    if ([...select.options].some(option => option.value === current)) {
      select.value = current;
    }
  });
}

function updateDietaryRemoveButtons() {
  const rows = dietaryList?.querySelectorAll(".dietary-row") || [];
  rows.forEach((row, index) => {
    const button = row.querySelector(".dietary-remove");
    if (button) button.hidden = rows.length === 1 && index === 0;
  });
}

function dietaryTypeOptions() {
  return [
    "Sin gluten (celiaquía)",
    "Sin lactosa",
    "Vegetariano",
    "Vegano",
    "Alergia a frutos secos",
    "Alergia al marisco",
    "Alergia al pescado",
    "Alergia al huevo",
    "Embarazada",
    "Otra"
  ].map(value => `<option value="${value}">${value}</option>`).join("");
}

function addDietaryRow() {
  if (!dietaryList) return;
  const row = document.createElement("div");
  row.className = "dietary-row";
  row.innerHTML = `
    <label>
      <span>Persona</span>
      <select class="dietary-person"></select>
    </label>
    <label>
      <span>Necesidad alimentaria</span>
      <select class="dietary-type">${dietaryTypeOptions()}</select>
    </label>
    <button type="button" class="dietary-remove" aria-label="Eliminar esta persona">×</button>
    <label class="dietary-other" hidden>
      <span>Especificar</span>
      <input type="text" placeholder="Indica la necesidad">
    </label>
  `;
  dietaryList.appendChild(row);
  refreshDietaryPersonOptions();
  updateDietaryRemoveButtons();
}

hasSpecialMenu?.addEventListener("change", () => {
  const enabled = hasSpecialMenu.value === "yes";
  dietaryList.hidden = !enabled;
  addDietaryRowButton.hidden = !enabled;
  if (enabled && !dietaryList.children.length) addDietaryRow();
  if (!enabled) dietaryList.innerHTML = "";
});

addDietaryRowButton?.addEventListener("click", addDietaryRow);
dietaryList?.addEventListener("click", event => {
  const button = event.target.closest(".dietary-remove");
  if (!button) return;
  button.closest(".dietary-row")?.remove();
  updateDietaryRemoveButtons();
});
dietaryList?.addEventListener("change", event => {
  if (!event.target.matches(".dietary-type")) return;
  const row = event.target.closest(".dietary-row");
  row.querySelector(".dietary-other").hidden = event.target.value !== "Otra";
});
adultsSelect?.addEventListener("change", refreshDietaryPersonOptions);
childrenSelect?.addEventListener("change", refreshDietaryPersonOptions);
document.getElementById("guestName")?.addEventListener("input", refreshDietaryPersonOptions);
refreshDietaryPersonOptions();


const WEDDING_CALENDAR = {
  title: "Boda de David & Raquel",
  start: "20261122T160000",
  end: "20261123T020000",
  location: "Iglesia Nuestra Señora de los Dolores y Espacio Capitana, Isla Cristina, Huelva",
  description: "Ceremonia a las 17:00 y celebración posterior. Estamos deseando compartir este día contigo."
};

function invitationUsesPlural(payload) {
  const confirmedTotal = Number(payload.adultos || 0) + Number(payload.ninos || 0);
  if (payload.asistencia === "Sí" && confirmedTotal > 0) {
    return confirmedTotal > 1;
  }

  const invitedTotal =
    Number(document.documentElement.dataset.adultsMax || 1) +
    Number(document.documentElement.dataset.childrenMax || 0);

  return invitedTotal > 1;
}

function googleCalendarUrl() {
  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: WEDDING_CALENDAR.title,
    dates: `${WEDDING_CALENDAR.start}/${WEDDING_CALENDAR.end}`,
    details: WEDDING_CALENDAR.description,
    location: WEDDING_CALENDAR.location
  });
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

function downloadAppleCalendar() {
  const escapeIcs = value =>
    String(value)
      .replaceAll("\\", "\\\\")
      .replaceAll(",", "\\,")
      .replaceAll(";", "\\;")
      .replaceAll("\n", "\\n");

  const now = new Date()
    .toISOString()
    .replace(/[-:]/g, "")
    .replace(/\.\d{3}Z$/, "Z");

  const ics = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//David y Raquel//Invitación de boda//ES",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:boda-david-raquel-20261122@davidyraquel.es`,
    `DTSTAMP:${now}`,
    `DTSTART;TZID=Europe/Madrid:${WEDDING_CALENDAR.start}`,
    `DTEND;TZID=Europe/Madrid:${WEDDING_CALENDAR.end}`,
    `SUMMARY:${escapeIcs(WEDDING_CALENDAR.title)}`,
    `DESCRIPTION:${escapeIcs(WEDDING_CALENDAR.description)}`,
    `LOCATION:${escapeIcs(WEDDING_CALENDAR.location)}`,
    "END:VEVENT",
    "END:VCALENDAR"
  ].join("\r\n");

  const blob = new Blob([ics], { type: "text/calendar;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "boda-david-raquel.ics";
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function showSmartRsvpResult(payload) {
  if (!rsvpResult) return;

  const attends = payload.asistencia === "Sí";
  const plural = invitationUsesPlural(payload);

  if (attends) {
    const title = plural
      ? "¡Nos encanta que vengáis!"
      : "¡Nos encanta que vengas!";
    const intro = plural
      ? "Gracias por confirmar vuestra asistencia."
      : "Gracias por confirmar tu asistencia.";
    const sharing = plural
      ? "Será un día inolvidable y nos hace muy felices compartirlo con vosotros."
      : "Será un día inolvidable y nos hace muy felices compartirlo contigo.";
    const waiting = plural
      ? "¡Os esperamos con muchísima ilusión!"
      : "¡Te esperamos con muchísima ilusión!";

    rsvpResult.className = "rsvp-result rsvp-result--yes";
    rsvpResult.innerHTML = `
      <div class="rsvp-result__heart" aria-hidden="true">♡</div>
      <h3>${title}</h3>
      <p>${intro}</p>
      <p>${sharing}</p>
      <p class="rsvp-result__closing">${waiting}</p>
      <div class="calendar-actions">
        <a class="calendar-button calendar-button--google"
           href="${googleCalendarUrl()}"
           target="_blank"
           rel="noopener noreferrer">
          <span aria-hidden="true">G</span>
          Añadir a Google Calendar
        </a>
        <button class="calendar-button calendar-button--apple"
                id="appleCalendarButton"
                type="button">
          <span aria-hidden="true">◷</span>
          Añadir a Apple Calendar
        </button>
      </div>`;
    rsvpResult.querySelector("#appleCalendarButton")
      ?.addEventListener("click", downloadAppleCalendar);
  } else {
    const title = plural
      ? "Sentimos que no podáis venir"
      : "Sentimos que no puedas venir";
    const thanks = plural
      ? "Gracias por hacérnoslo saber."
      : "Gracias por hacérnoslo saber.";
    const farewell = plural
      ? "Os echaremos mucho de menos, pero os llevaremos en el corazón durante todo nuestro gran día."
      : "Te echaremos mucho de menos, pero te llevaremos en el corazón durante todo nuestro gran día.";

    rsvpResult.className = "rsvp-result rsvp-result--no";
    rsvpResult.innerHTML = `
      <div class="rsvp-result__heart rsvp-result__heart--soft" aria-hidden="true">♡</div>
      <h3>${title}</h3>
      <p>${thanks}</p>
      <p>${farewell}</p>`;
  }

  rsvpResult.hidden = false;
  rsvpResult.scrollIntoView({ behavior: "smooth", block: "center" });
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

  const confirmationPayload = getRsvpPayload();

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
        body: JSON.stringify({ datos: confirmationPayload })
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
    if (hasSpecialMenu) hasSpecialMenu.value = "no";
    if (dietaryList) {
      dietaryList.innerHTML = `
        <div class="dietary-row">
          <label><span>Nombre de la persona</span><input type="text" class="dietary-name" placeholder="Ej.: María Gómez"></label>
          <label><span>Alergia o preferencia</span><input type="text" class="dietary-detail" placeholder="Ej.: Celíaca"></label>
          <button type="button" class="dietary-remove" aria-label="Eliminar esta persona" hidden>×</button>
        </div>`;
      updateDietaryRemoveButtons();
    }
    const currentAdultsMax = Number(document.documentElement.dataset.adultsMax || 20);
    buildNumberOptions(adultsSelect, currentAdultsMax, currentAdultsMax > 0 ? 1 : 0);
    buildNumberOptions(
      childrenSelect,
      Number(document.documentElement.dataset.childrenMax || 20),
      0
    );
    formStatus.textContent = "Confirmación recibida correctamente.";
    formStatus.className = "form-status is-success form-status--compact";
    showSmartRsvpResult(confirmationPayload);
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



let accessMusicPrimed = false;
let accessMusicUnlockAttempted = false;

function markMusicAsPlaying() {
  accessMusicPrimed = true;
  musicControl?.classList.add("is-playing");
  musicControl?.setAttribute("aria-pressed", "true");
}

function primeBackgroundMusicFromGesture() {
  if (!backgroundMusic) return;

  accessMusicUnlockAttempted = true;
  backgroundMusic.muted = false;
  backgroundMusic.volume = 0.02;

  // En iPhone el play debe ejecutarse directamente dentro del gesto.
  const playAttempt = backgroundMusic.play();

  if (playAttempt && typeof playAttempt.then === "function") {
    playAttempt.then(markMusicAsPlaying).catch(() => {
      accessMusicPrimed = false;
    });
  } else if (!backgroundMusic.paused) {
    markMusicAsPlaying();
  }
}

function stopPrimedAccessMusic() {
  if (!backgroundMusic) return;

  backgroundMusic.pause();
  backgroundMusic.currentTime = 0;
  backgroundMusic.volume = 0.24;
  accessMusicPrimed = false;
  musicControl?.classList.remove("is-playing");
  musicControl?.setAttribute("aria-pressed", "false");
}

function fadeBackgroundMusicTo(targetVolume = 0.24, duration = 1500) {
  if (!backgroundMusic || backgroundMusic.paused) return;

  const initialVolume = Math.max(0, backgroundMusic.volume);
  const startedAt = performance.now();

  function step(now) {
    const progress = Math.min(1, (now - startedAt) / duration);
    backgroundMusic.volume =
      initialVolume + (targetVolume - initialVolume) * progress;

    if (progress < 1) requestAnimationFrame(step);
  }

  requestAnimationFrame(step);
}

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
const accessSubmitButton = accessForm?.querySelector('button[type="submit"]');

// Safari/iPhone: pointerdown ocurre antes que la validación asíncrona del código.
accessSubmitButton?.addEventListener("pointerdown", primeBackgroundMusicFromGesture);
accessSubmitButton?.addEventListener("touchstart", primeBackgroundMusicFromGesture, {
  passive: true
});

let accessStarted = false;

function startWeddingIntro() {
  if (accessStarted) return;
  accessStarted = true;

  // La apertura visual nunca depende de que el navegador permita reproducir audio.
  accessGate?.classList.add("is-leaving");

  window.setTimeout(() => {
    if (accessGate) {
      accessGate.hidden = true;
      accessGate.style.display = "none";
    }

    document.body.classList.remove("is-locked");
    document.body.classList.add("access-granted");

    window.scrollTo({ top: 0, left: 0, behavior: "instant" });
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;

    window.setTimeout(() => {
      document.body.classList.remove("access-granted");
    }, 900);
  }, 420);

  // La música se intenta iniciar por separado. Un fallo de audio no bloquea el acceso.
  try {
    if (backgroundMusic) {
      backgroundMusic.muted = false;
      backgroundMusic.volume = 0.02;

      const playAttempt = backgroundMusic.paused
        ? backgroundMusic.play()
        : Promise.resolve();

      Promise.resolve(playAttempt)
        .then(() => {
          markMusicAsPlaying();
          fadeBackgroundMusicTo(0.24, 1400);
        })
        .catch(() => {
          musicControl?.classList.remove("is-playing");
          musicControl?.setAttribute("aria-pressed", "false");
        });
    }
  } catch (_) {
    musicControl?.classList.remove("is-playing");
    musicControl?.setAttribute("aria-pressed", "false");
  }
}

function grantAccess({ remember = true } = {}) {
  if (remember) {
    sessionStorage.setItem("wedding_access_granted", "true");
  }

  if (accessSubmitButton) {
    accessSubmitButton.disabled = false;
    accessSubmitButton.textContent = "Continuar";
  }

  accessCode?.blur();
  startWeddingIntro();
}

if (
  sessionStorage.getItem("wedding_access_granted") === "true" &&
  !new URLSearchParams(window.location.search).get("i")
) {
  window.setTimeout(() => grantAccess({ remember: false }), 100);
}



function buildNumberOptions(select, maximum, preferredValue = 0) {
  if (!select) return;

  const safeMaximum = Math.max(0, Math.min(20, Number(maximum) || 0));
  const safePreferred = Math.max(0, Math.min(safeMaximum, Number(preferredValue) || 0));

  select.innerHTML = Array.from(
    { length: safeMaximum + 1 },
    (_, value) => `<option value="${value}">${value}</option>`
  ).join("");

  select.value = String(safePreferred);
}

function pluralizeLimit(value, singular, plural) {
  return `${value} ${value === 1 ? singular : plural}`;
}

function configureGuestLimits(adultsMax = 20, childrenMax = 20, personalized = false) {
  const safeAdults = Math.max(0, Math.min(20, Number(adultsMax) || 0));
  const safeChildren = Math.max(0, Math.min(20, Number(childrenMax) || 0));

  document.documentElement.dataset.adultsMax = String(safeAdults);
  document.documentElement.dataset.childrenMax = String(safeChildren);

  buildNumberOptions(adultsSelect, safeAdults, safeAdults > 0 ? 1 : 0);
  buildNumberOptions(childrenSelect, safeChildren, 0);

  if (childrenField) {
    childrenField.hidden = personalized && safeChildren === 0;
  }

}

configureGuestLimits(20, 20, false);

let currentPersonalizedInvitation = null;

function applyPersonalizedInvitation(invitation, code) {
  if (!invitation?.nombre_mostrado) return false;

  const adultsMax = Number(
    invitation.adultos_max ??
    invitation.max_personas ??
    1
  );
  const childrenMax = Number(invitation.ninos_max ?? 0);

  currentPersonalizedInvitation = {
    ...invitation,
    adultos_max: adultsMax,
    ninos_max: childrenMax
  };

  document.documentElement.dataset.personalizedInvitation = "true";
  document.documentElement.dataset.invitationCode = code;

  const welcome = document.getElementById("personalizedWelcome");
  const guestName = document.getElementById("personalizedGuestName");
  const personalizedMessage = document.getElementById("personalizedMessage");
  const guestNameInput = document.getElementById("guestName");
  const musicGuestName = document.getElementById("musicGuestName");

  if (welcome && guestName) {
    guestName.textContent = invitation.nombre_mostrado;
    welcome.hidden = false;
  }

  if (personalizedMessage) {
    const totalGuests = Math.max(1, adultsMax + childrenMax);

    personalizedMessage.textContent = totalGuests === 1
      ? "Nos hace muchísima ilusión compartir este día contigo."
      : "Nos hace muchísima ilusión compartir este día con vosotros.";
  }

  if (guestNameInput) {
    guestNameInput.value = invitation.nombre_mostrado;
    guestNameInput.readOnly = true;
  }

  if (musicGuestName) {
    musicGuestName.value = invitation.nombre_mostrado;
    musicGuestName.readOnly = true;
  }

  configureGuestLimits(adultsMax, childrenMax, true);

  sessionStorage.setItem(
    "wedding_personalized_invitation",
    JSON.stringify({
      codigo: code,
      nombre_mostrado: invitation.nombre_mostrado,
      adultos_max: adultsMax,
      ninos_max: childrenMax
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

accessForm?.addEventListener("submit", async event => {
  event.preventDefault();

  const submitButton = accessForm.querySelector('button[type="submit"]');
  const code = accessCode.value.trim().toUpperCase();

  if (!code) {
    accessMessage.textContent = "Introduce el código.";
    return;
  }

  accessMessage.textContent = "";

  // También cubre el envío mediante la tecla Intro.
  if (!accessMusicUnlockAttempted || backgroundMusic?.paused) {
    primeBackgroundMusicFromGesture();
  }

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
    stopPrimedAccessMusic();
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


// V42 · Sugerencias musicales
const musicSuggestionForm=document.getElementById("musicSuggestionForm");
const musicFormStatus=document.getElementById("musicFormStatus");
function fillMusicGuestName(){const t=document.getElementById("musicGuestName"),s=document.getElementById("guestName");if(t&&s?.value&&!t.value)t.value=s.value;}
document.getElementById("guestName")?.addEventListener("input",fillMusicGuestName);fillMusicGuestName();
musicSuggestionForm?.addEventListener("submit",async event=>{event.preventDefault();const b=musicSuggestionForm.querySelector('button[type="submit"]'),f=new FormData(musicSuggestionForm),p={nombre:String(f.get("nombre")||"").trim(),codigo_invitacion:document.documentElement.dataset.invitationCode||null,cancion_cena:String(f.get("cancion_cena")||"").trim(),artista_cena:String(f.get("artista_cena")||"").trim(),cancion_baile:String(f.get("cancion_baile")||"").trim(),artista_baile:String(f.get("artista_baile")||"").trim()};musicFormStatus.textContent="";musicFormStatus.className="form-status";if(!p.nombre){musicFormStatus.textContent="Escribe tu nombre.";musicFormStatus.classList.add("is-error");return;}if(!p.cancion_cena&&!p.cancion_baile){musicFormStatus.textContent="Escribe al menos una canción para la cena o para el baile.";musicFormStatus.classList.add("is-error");return;}b.disabled=true;const o=b.textContent;b.textContent="Enviando…";try{const r=await fetch(`${SUPABASE_URL}/rest/v1/rpc/guardar_sugerencia_musical_v42`,{method:"POST",headers:{apikey:SUPABASE_PUBLISHABLE_KEY,Authorization:`Bearer ${SUPABASE_PUBLISHABLE_KEY}`,"Content-Type":"application/json"},body:JSON.stringify({datos:p})});const d=await r.json().catch(()=>null);if(!r.ok)throw new Error(d?.message||"No se pudo guardar la sugerencia.");musicFormStatus.textContent="¡Muchas gracias! Tendremos en cuenta tus canciones para preparar la banda sonora de nuestro gran día.";musicFormStatus.classList.add("is-success");const n=p.nombre;musicSuggestionForm.reset();document.getElementById("musicGuestName").value=n;}catch(e){musicFormStatus.textContent=`No hemos podido guardar las canciones: ${e.message}`;musicFormStatus.classList.add("is-error");}finally{b.disabled=false;b.textContent=o;}});
