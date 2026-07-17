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


// Confirmación de asistencia
const RSVP_ENDPOINT = "PEGA_AQUI_LA_URL_DE_TU_WEB_APP";

const rsvpForm = document.getElementById("rsvpForm");
const formStatus = document.getElementById("formStatus");
const submissionDate = document.getElementById("submissionDate");

function clearRsvpErrors() {
  document.querySelectorAll(".field-error").forEach(el => el.textContent = "");
  formStatus.textContent = "";
  formStatus.className = "form-status";
}

function validateRsvpForm() {
  clearRsvpErrors();
  let valid = true;

  const guestName = document.getElementById("guestName");
  const attendance = rsvpForm.querySelector('input[name="asistencia"]:checked');

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

rsvpForm.addEventListener("submit", async event => {
  event.preventDefault();

  if (!validateRsvpForm()) return;

  if (RSVP_ENDPOINT.includes("PEGA_AQUI")) {
    formStatus.textContent =
      "El formulario está preparado, pero todavía falta conectar la URL de Google Apps Script.";
    formStatus.classList.add("is-error");
    return;
  }

  const submitButton = rsvpForm.querySelector('button[type="submit"]');
  submitButton.disabled = true;
  submissionDate.value = new Date().toISOString();
  formStatus.textContent = "Enviando confirmación…";

  try {
    const response = await fetch(RSVP_ENDPOINT, {
      method: "POST",
      body: new FormData(rsvpForm)
    });

    if (!response.ok) {
      throw new Error("No se pudo enviar la confirmación.");
    }

    formStatus.textContent =
      "¡Muchas gracias! Hemos recibido tu confirmación.";
    formStatus.classList.add("is-success");
    rsvpForm.reset();
  } catch (error) {
    formStatus.textContent =
      "No hemos podido enviar la confirmación. Inténtalo de nuevo en unos minutos.";
    formStatus.classList.add("is-error");
  } finally {
    submitButton.disabled = false;
  }
});
