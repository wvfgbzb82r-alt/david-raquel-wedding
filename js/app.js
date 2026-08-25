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

  if (!validateDietaryRequirements(adults, children)) {
    valid = false;
  }

  return valid;
}

function collectDietaryRequirements() {
  return Array.from(document.querySelectorAll(".dietary-row"))
    .map(row => {
      const requirementType =
        row.querySelector(".dietary-type")?.value || "";
      const other =
        row.querySelector(".dietary-other input")?.value.trim() || "";

      return {
        nombre:
          row.querySelector(".dietary-person")?.value.trim() || "",
        tipo_persona:
          row.querySelector(".dietary-attendee-type")?.value || "adulto",
        detalle:
          requirementType === "Otra" ? other : requirementType
      };
    })
    .filter(item => item.nombre || item.detalle);
}

function validateDietaryRequirements(adults, children) {
  if (hasSpecialMenu?.value !== "yes") return true;

  const rows = Array.from(
    dietaryList?.querySelectorAll(".dietary-row") || []
  );

  if (!rows.length) return true;

  let valid = true;
  let adultRows = 0;
  let childRows = 0;

  rows.forEach(row => {
    const nameInput = row.querySelector(".dietary-person");
    const attendeeType =
      row.querySelector(".dietary-attendee-type")?.value || "adulto";
    const requirementType =
      row.querySelector(".dietary-type")?.value || "";
    const otherInput = row.querySelector(".dietary-other input");
    const error = row.querySelector(".dietary-row-error");

    if (error) error.textContent = "";

    if (attendeeType === "nino") childRows += 1;
    else adultRows += 1;

    if (!nameInput?.value.trim()) {
      if (error) {
        error.textContent =
          "Escribe el nombre de la persona que necesita este menú.";
      }
      nameInput?.focus();
      valid = false;
      return;
    }

    if (
      requirementType === "Otra" &&
      !otherInput?.value.trim()
    ) {
      if (error) {
        error.textContent =
          "Especifica la necesidad alimentaria.";
      }
      valid = false;
    }
  });

  if (adultRows > adults) {
    const error = rows.at(-1)?.querySelector(".dietary-row-error");
    if (error) {
      error.textContent =
        `Has indicado ${adultRows} adultos con menú especial, ` +
        `pero has confirmado ${adults} adultos.`;
    }
    valid = false;
  }

  if (childRows > children) {
    const error = rows.at(-1)?.querySelector(".dietary-row-error");
    if (error) {
      error.textContent =
        `Has indicado ${childRows} niños con menú especial, ` +
        `pero has confirmado ${children} niños.`;
    }
    valid = false;
  }

  return valid;
}

const dietaryList = document.getElementById("dietaryList");
const addDietaryRowButton = document.getElementById("addDietaryRow");
const hasSpecialMenu = document.getElementById("hasSpecialMenu");

function attendeeTypeOptions() {
  const adults = Number(adultsSelect?.value || 0);
  const children = Number(childrenSelect?.value || 0);
  const options = [];

  if (adults > 0) {
    options.push('<option value="adulto">Adulto</option>');
  }
  if (children > 0) {
    options.push('<option value="nino">Niño</option>');
  }

  if (!options.length) {
    options.push('<option value="adulto">Adulto</option>');
  }

  return options.join("");
}

function refreshDietaryAttendeeTypes() {
  document
    .querySelectorAll(".dietary-attendee-type")
    .forEach(select => {
      const current = select.value;
      select.innerHTML = attendeeTypeOptions();

      if (
        Array.from(select.options)
          .some(option => option.value === current)
      ) {
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
      <span>Nombre de la persona</span>
      <input
        class="dietary-person"
        type="text"
        autocomplete="name"
        placeholder="Ej.: Cristina"
      >
    </label>

    <label>
      <span>Es adulto o niño</span>
      <select class="dietary-attendee-type">
        ${attendeeTypeOptions()}
      </select>
    </label>

    <label>
      <span>Necesidad alimentaria</span>
      <select class="dietary-type">
        ${dietaryTypeOptions()}
      </select>
    </label>

    <button
      type="button"
      class="dietary-remove"
      aria-label="Eliminar esta persona"
    >×</button>

    <label class="dietary-other" hidden>
      <span>Especificar</span>
      <input
        type="text"
        placeholder="Indica la necesidad"
      >
    </label>

    <small
      class="dietary-row-error"
      aria-live="polite"
    ></small>
  `;

  dietaryList.appendChild(row);
  refreshDietaryAttendeeTypes();
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
adultsSelect?.addEventListener("change", refreshDietaryAttendeeTypes);
childrenSelect?.addEventListener("change", refreshDietaryAttendeeTypes);
refreshDietaryAttendeeTypes();


const WEDDING_CALENDAR = {
  title: "Boda de David & Raquel",
  start: "20261122T163000",
  end: "20261123T020000",
  location: "Iglesia Nuestra Señora de los Dolores y Espacio Capitana, Isla Cristina, Huelva",
  description: "Ceremonia a las 17:00 y celebración posterior. Estamos deseando compartir este día contigo."
};

function confirmationGrammar(payload) {
  const confirmedTotal =
    Number(payload.adultos || 0) + Number(payload.ninos || 0);
  const attends = payload.asistencia === "Sí";
  const treatment = normalizeInvitationTreatment(
    currentPersonalizedInvitation?.tratamiento,
    currentPersonalizedInvitation?.nombre_mostrado || ""
  );

  const plural = attends
    ? confirmedTotal > 1
    : treatment !== "singular";

  return {
    plural,
    pronoun: plural && treatment === "plural_femenino"
      ? "vosotras"
      : plural
        ? "vosotros"
        : "contigo"
  };
}

function googleCalendarUrl() {
  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: WEDDING_CALENDAR.title,
    dates: `${WEDDING_CALENDAR.start}/${WEDDING_CALENDAR.end}`,
    details: WEDDING_CALENDAR.description,
    location: WEDDING_CALENDAR.location,
    ctz: "Europe/Madrid"
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
  const grammar = confirmationGrammar(payload);
  const plural = grammar.plural;
  const groupPronoun = grammar.pronoun;

  if (attends) {
    const title = plural
      ? "¡Nos encanta que vengáis!"
      : "¡Nos encanta que vengas!";
    const intro = plural
      ? "Gracias por confirmar vuestra asistencia."
      : "Gracias por confirmar tu asistencia.";
    const sharing = plural
      ? `Será un día inolvidable y nos hace muy felices compartirlo con ${groupPronoun}.`
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
      ? `Os echaremos mucho de menos, pero os llevaremos en el corazón durante todo nuestro gran día.`
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

  const submitButton =
    rsvpForm.querySelector('button[type="submit"]');
  const originalButtonText = submitButton.textContent;

  submitButton.disabled = true;
  submitButton.textContent = "Enviando…";
  formStatus.textContent =
    "Estamos guardando tu confirmación…";
  formStatus.className = "form-status";

  const controller = new AbortController();
  const timeoutId = window.setTimeout(
    () => controller.abort(),
    18000
  );

  try {
    // Se construye dentro del try para que cualquier error del
    // formulario nunca deje el botón bloqueado en «Enviando…».
    const confirmationPayload = getRsvpPayload();

    const response = await fetch(
      `${SUPABASE_URL}/rest/v1/rpc/guardar_confirmacion_v24`,
      {
        method: "POST",
        headers: {
          "apikey": SUPABASE_PUBLISHABLE_KEY,
          "Authorization":
            `Bearer ${SUPABASE_PUBLISHABLE_KEY}`,
          "Content-Type": "application/json",
          "Prefer": "return=representation"
        },
        body: JSON.stringify({
          datos: confirmationPayload
        }),
        signal: controller.signal
      }
    );

    const responseText = await response.text();

    if (!response.ok) {
      let detail = responseText;

      try {
        const parsed = JSON.parse(responseText);
        detail =
          parsed.message ||
          parsed.details ||
          parsed.hint ||
          responseText;
      } catch {}

      throw new Error(
        detail || `Error ${response.status}`
      );
    }

    // Éxito: conservar el payload antes de limpiar el formulario.
    showSmartRsvpResult(confirmationPayload);

    rsvpForm.reset();

    if (hasSpecialMenu) {
      hasSpecialMenu.value = "no";
    }

    if (dietaryList) {
      dietaryList.innerHTML = "";
      dietaryList.hidden = true;
    }

    if (addDietaryRowButton) {
      addDietaryRowButton.hidden = true;
    }

    const currentAdultsMax = Number(
      document.documentElement.dataset.adultsMax || 20
    );

    buildNumberOptions(
      adultsSelect,
      currentAdultsMax,
      currentAdultsMax > 0 ? 1 : 0
    );

    buildNumberOptions(
      childrenSelect,
      Number(
        document.documentElement.dataset.childrenMax || 20
      ),
      0
    );

    // En invitaciones personalizadas restauramos el nombre
    // después del reset para que siga apareciendo correctamente.
    if (
      currentPersonalizedInvitation?.nombre_mostrado
    ) {
      const guestName =
        document.getElementById("guestName");

      if (guestName) {
        guestName.value =
          currentPersonalizedInvitation.nombre_mostrado;
        guestName.readOnly = true;
      }
    }

    formStatus.textContent =
      "Confirmación recibida correctamente.";
    formStatus.className =
      "form-status is-success form-status--compact";
  } catch (error) {
    console.error(
      "Error al enviar la confirmación:",
      error
    );

    if (error?.name === "AbortError") {
      formStatus.textContent =
        "La conexión está tardando demasiado. " +
        "Comprueba Internet y vuelve a pulsar Enviar. " +
        "No cierres la página hasta ver el mensaje de confirmación.";
    } else {
      const message =
        String(error?.message || "Error desconocido");

      const configurationProblem =
        /column|policy|permission|row-level|schema|relation|function|rpc/i
          .test(message);

      formStatus.textContent = configurationProblem
        ? "No se ha podido guardar la confirmación por un problema de configuración de Supabase."
        : `No hemos podido guardar la confirmación: ${message}`;
    }

    formStatus.className =
      "form-status is-error";
  } finally {
    window.clearTimeout(timeoutId);
    submitButton.disabled = false;
    submitButton.textContent =
      originalButtonText;
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

function personalizedNameLooksPlural(name) {
  const cleanName = String(name || "").trim();
  const normalizedName = cleanName
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();

  return (
    /\s(?:y|e|&|\+)\s/i.test(cleanName) ||
    cleanName.includes(",") ||
    /\b(familia|los|las|hermanos|hermanas|padres|amigos|primos|tios|tias)\b/i.test(normalizedName)
  );
}

function normalizeInvitationTreatment(value, name = "") {
  const treatment = String(value || "").trim().toLowerCase();

  if (treatment === "singular") return "singular";
  if (treatment === "plural_femenino") return "plural_femenino";
  if (treatment === "plural_mixto") return "plural_mixto";

  return personalizedNameLooksPlural(name)
    ? "plural_mixto"
    : "singular";
}

function invitationPronoun(treatment) {
  if (treatment === "plural_femenino") return "vosotras";
  if (treatment === "plural_mixto") return "vosotros";
  return "contigo";
}

function applyPersonalizedInvitation(invitation, code) {
  if (!invitation?.nombre_mostrado) return false;

  const adultsMax = Number(
    invitation.adultos_max ??
    invitation.max_personas ??
    1
  );
  const childrenMax = Number(invitation.ninos_max ?? 0);
  const treatment = normalizeInvitationTreatment(
    invitation.tratamiento,
    invitation.nombre_mostrado
  );

  currentPersonalizedInvitation = {
    ...invitation,
    adultos_max: adultsMax,
    ninos_max: childrenMax,
    tratamiento: treatment
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
    const pronoun = invitationPronoun(treatment);
    personalizedMessage.textContent =
      `Nos hace muchísima ilusión compartir este día ${pronoun === "contigo" ? "contigo" : `con ${pronoun}`}.`;
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
      ninos_max: childrenMax,
      tratamiento: treatment
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


// V53.2 · Hasta tres canciones para cena y baile
const musicSuggestionForm = document.getElementById("musicSuggestionForm");
const musicFormStatus = document.getElementById("musicFormStatus");

function fillMusicGuestName() {
  const target = document.getElementById("musicGuestName");
  const source = document.getElementById("guestName");
  if (target && source?.value && !target.value) target.value = source.value;
}

document.getElementById("guestName")
  ?.addEventListener("input", fillMusicGuestName);
fillMusicGuestName();

function musicValue(formData, name) {
  return String(formData.get(name) || "").trim();
}

musicSuggestionForm?.addEventListener("submit", async event => {
  event.preventDefault();

  const button = musicSuggestionForm.querySelector('button[type="submit"]');
  const formData = new FormData(musicSuggestionForm);
  const payload = {
    nombre: musicValue(formData, "nombre"),
    codigo_invitacion:
      document.documentElement.dataset.invitationCode || null,
    cancion_cena: musicValue(formData, "cancion_cena"),
    artista_cena: musicValue(formData, "artista_cena"),
    cancion_cena_2: musicValue(formData, "cancion_cena_2"),
    artista_cena_2: musicValue(formData, "artista_cena_2"),
    cancion_cena_3: musicValue(formData, "cancion_cena_3"),
    artista_cena_3: musicValue(formData, "artista_cena_3"),
    cancion_baile: musicValue(formData, "cancion_baile"),
    artista_baile: musicValue(formData, "artista_baile"),
    cancion_baile_2: musicValue(formData, "cancion_baile_2"),
    artista_baile_2: musicValue(formData, "artista_baile_2"),
    cancion_baile_3: musicValue(formData, "cancion_baile_3"),
    artista_baile_3: musicValue(formData, "artista_baile_3")
  };

  musicFormStatus.textContent = "";
  musicFormStatus.className = "form-status";

  if (!payload.nombre) {
    musicFormStatus.textContent = "Escribe tu nombre.";
    musicFormStatus.classList.add("is-error");
    return;
  }

  const songs = [
    payload.cancion_cena,
    payload.cancion_cena_2,
    payload.cancion_cena_3,
    payload.cancion_baile,
    payload.cancion_baile_2,
    payload.cancion_baile_3
  ];

  if (!songs.some(Boolean)) {
    musicFormStatus.textContent =
      "Escribe al menos una canción para la cena o para el baile.";
    musicFormStatus.classList.add("is-error");
    return;
  }

  button.disabled = true;
  const originalText = button.textContent;
  button.textContent = "Enviando…";

  try {
    const response = await fetch(
      `${SUPABASE_URL}/rest/v1/rpc/guardar_sugerencia_musical_v42`,
      {
        method: "POST",
        headers: {
          apikey: SUPABASE_PUBLISHABLE_KEY,
          Authorization: `Bearer ${SUPABASE_PUBLISHABLE_KEY}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ datos: payload })
      }
    );

    const data = await response.json().catch(() => null);
    if (!response.ok) {
      throw new Error(
        data?.message || "No se pudo guardar la sugerencia."
      );
    }

    musicFormStatus.textContent =
      "¡Muchas gracias! Tendremos en cuenta todas tus canciones " +
      "para preparar la banda sonora de nuestro gran día.";
    musicFormStatus.classList.add("is-success");

    const guestName = payload.nombre;
    musicSuggestionForm.reset();
    document.getElementById("musicGuestName").value = guestName;
  } catch (error) {
    musicFormStatus.textContent =
      `No hemos podido guardar las canciones: ${error.message}`;
    musicFormStatus.classList.add("is-error");
  } finally {
    button.disabled = false;
    button.textContent = originalText;
  }
});

