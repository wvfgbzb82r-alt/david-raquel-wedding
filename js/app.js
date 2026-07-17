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
