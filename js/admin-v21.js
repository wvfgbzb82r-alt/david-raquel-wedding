"use strict";

const CONFIG = Object.freeze({
  url: "https://impauxkdtcwngvlknysa.supabase.co",
  key: "sb_publishable_TN0nnQZ_g6l1RNTuE4f9qg_iaI_USWV",
  email: "davidn6783@gmail.com",
  sessionKey: "dr_admin_session_v21"
});

const byId = id => document.getElementById(id);
const loginView = byId("loginView");
const dashboard = byId("dashboard");
const loginForm = byId("loginForm");
const codeInput = byId("adminCode");
const loginButton = byId("loginButton");
const loginMessage = byId("loginMessage");
const dashboardMessage = byId("dashboardMessage");
const tableBody = byId("guestTableBody");
const cards = byId("guestCards");
const searchInput = byId("searchInput");
const attendanceFilter = byId("attendanceFilter");

let session = null;
let guests = [];

function normalize(value) { return String(value ?? "").trim().toLowerCase(); }
function attendanceCategory(value) {
  const text = normalize(value);
  if (["sí", "si", "yes"].includes(text) || text.includes("allí estaré")) return "yes";
  if (text === "no" || text.includes("no podré")) return "no";
  return "other";
}
function formatDate(value) {
  if (!value) return "—";
  try { return new Intl.DateTimeFormat("es-ES", { dateStyle: "short", timeStyle: "short" }).format(new Date(value)); }
  catch { return String(value); }
}
function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, char => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[char]));
}

async function api(path, options = {}) {
  const headers = {
    apikey: CONFIG.key,
    ...(options.headers || {})
  };

  // Solo se envía Content-Type cuando la petición contiene realmente un cuerpo.
  // Safari y Supabase rechazan algunos DELETE vacíos si se incluye esta cabecera.
  if (options.body !== undefined && !headers["Content-Type"]) {
    headers["Content-Type"] = "application/json";
  }

  if (session?.access_token) {
    headers.Authorization = `Bearer ${session.access_token}`;
  }

  let response;
  try {
    response = await fetch(`${CONFIG.url}${path}`, {
      ...options,
      headers
    });
  } catch {
    throw new Error(
      "No se pudo conectar con Supabase. Comprueba la conexión a Internet."
    );
  }

  let data = null;
  const responseText = await response.text();

  if (responseText) {
    try {
      data = JSON.parse(responseText);
    } catch {
      data = responseText;
    }
  }

  if (!response.ok) {
    throw new Error(
      data?.error_description ||
      data?.msg ||
      data?.message ||
      (typeof data === "string" ? data : "") ||
      `Error ${response.status}`
    );
  }

  return data;
}

async function signIn(password) {
  session = await api("/auth/v1/token?grant_type=password", {
    method: "POST",
    body: JSON.stringify({ email: CONFIG.email, password })
  });
  sessionStorage.setItem(CONFIG.sessionKey, JSON.stringify(session));
}

async function refreshSession() {
  if (!session?.refresh_token) return false;
  try {
    session = await api("/auth/v1/token?grant_type=refresh_token", {
      method: "POST",
      body: JSON.stringify({ refresh_token: session.refresh_token })
    });
    sessionStorage.setItem(CONFIG.sessionKey, JSON.stringify(session));
    return true;
  } catch { return false; }
}


function dietaryItems(value) {
  if (!value) return [];
  if (Array.isArray(value)) return value;
  try {
    const parsed = JSON.parse(value);
    if (Array.isArray(parsed)) {
      return parsed.filter(item => item && (item.nombre || item.detalle));
    }
  } catch {}
  return [{ nombre: "", detalle: String(value) }];
}

function dietaryHtml(value) {
  const items = dietaryItems(value);
  if (!items.length) return "—";
  return `<ul class="dietary-admin-list">${items.map(item => {
    const personType =
      item.tipo_persona === "nino"
        ? "Niño"
        : item.tipo_persona === "adulto"
          ? "Adulto"
          : "";
    return `<li><strong>${escapeHtml(item.nombre || "Sin nombre")}</strong>` +
      `${personType ? ` <span>(${personType})</span>` : ""}: ` +
      `${escapeHtml(item.detalle || "Sin detalle")}</li>`;
  }).join("")}</ul>`;
}

function filteredGuests() {
  const query = normalize(searchInput.value);
  const filter = attendanceFilter.value;
  return guests.filter(guest => {
    const searchable = normalize([guest.nombre, guest.telefono, guest.asistencia, guest.adultos, guest.ninos, guest.alergias, guest.comentarios].join(" "));
    return (!query || searchable.includes(query)) && (!filter || attendanceCategory(guest.asistencia) === filter);
  });
}

function updateStats() {
  const attending = guests.filter(g => attendanceCategory(g.asistencia) === "yes");
  const adults = attending.reduce((sum, guest) => sum + Number(guest.adultos || 0), 0);
  const children = attending.reduce((sum, guest) => sum + Number(guest.ninos || 0), 0);
  const specialMenus = attending.reduce((sum, guest) => sum + dietaryItems(guest.alergias).length, 0);

  byId("statTotal").textContent = guests.length;
  byId("statYes").textContent = attending.length;
  byId("statNo").textContent = guests.filter(g => attendanceCategory(g.asistencia) === "no").length;
  byId("statAdults").textContent = adults;
  byId("statChildren").textContent = children;
  byId("statPeople").textContent = adults + children;
  byId("statAllergies").textContent = specialMenus;
}

function statusPill(value) {
  const category = attendanceCategory(value);
  return `<span class="status ${category}">${escapeHtml(value || "Sin indicar")}</span>`;
}

function confirmationActions(guest) {
  const hasComment = normalize(guest.comentarios);
  return `<div class="row-actions">
    ${hasComment ? `<button type="button" class="danger-link" data-clear-comment="${guest.id}">Borrar comentario</button>` : ""}
    <button type="button" class="danger-link" data-delete-response="${guest.id}">Eliminar respuesta</button>
  </div>`;
}

function renderGuests() {
  const rows = filteredGuests();
  tableBody.innerHTML = rows.map(g => {
    const adults = Number(g.adultos || 0);
    const children = Number(g.ninos || 0);
    return `<tr>
      <td>${formatDate(g.created_at)}</td>
      <td>${escapeHtml(g.nombre || "—")}</td>
      <td>${escapeHtml(g.telefono || "—")}</td>
      <td>${statusPill(g.asistencia)}</td>
      <td>${adults}</td>
      <td>${children}</td>
      <td><strong>${adults + children}</strong></td>
      <td>${dietaryHtml(g.alergias)}</td>
      <td>${escapeHtml(g.comentarios || "—")}</td>
      <td>${confirmationActions(g)}</td>
    </tr>`;
  }).join("");

  cards.innerHTML = rows.map(g => {
    const adults = Number(g.adultos || 0);
    const children = Number(g.ninos || 0);
    return `<article class="guest-card">
      <h2>${escapeHtml(g.nombre || "Sin nombre")}</h2>
      ${statusPill(g.asistencia)}
      <dl>
        <dt>Fecha</dt><dd>${formatDate(g.created_at)}</dd>
        <dt>Teléfono</dt><dd>${escapeHtml(g.telefono || "—")}</dd>
        <dt>Adultos</dt><dd>${adults}</dd>
        <dt>Niños</dt><dd>${children}</dd>
        <dt>Total</dt><dd>${adults + children}</dd>
        <dt>Alergias / preferencias</dt><dd>${dietaryHtml(g.alergias)}</dd>
        <dt>Comentarios</dt><dd>${escapeHtml(g.comentarios || "—")}</dd>
      </dl>
      ${confirmationActions(g)}
    </article>`;
  }).join("");

  updateCateringDashboard();

  dashboardMessage.textContent = rows.length
    ? `${rows.length} respuesta${rows.length === 1 ? "" : "s"} mostrada${rows.length === 1 ? "" : "s"}.`
    : "No hay resultados.";
}

async function clearComment(id) {
  if (!confirm("¿Quieres borrar únicamente el comentario de esta respuesta?")) return;
  dashboardMessage.textContent = "Borrando comentario…";
  try {
    await api(`/rest/v1/confirmaciones_v24?id=eq.${encodeURIComponent(id)}`, {
      method: "PATCH",
      headers: { Prefer: "return=minimal" },
      body: JSON.stringify({ comentarios: null })
    });
    await loadGuests();
    dashboardMessage.textContent = "Comentario borrado correctamente.";
  } catch (error) {
    dashboardMessage.textContent = `No se pudo borrar el comentario: ${error.message}`;
  }
}

async function deleteResponse(id) {
  if (!confirm("¿Seguro que quieres eliminar por completo esta respuesta? Esta acción no se puede deshacer.")) return;
  dashboardMessage.textContent = "Eliminando respuesta…";
  try {
    await api(`/rest/v1/confirmaciones_v24?id=eq.${encodeURIComponent(id)}`, {
      method: "DELETE",
      headers: { Prefer: "return=minimal" }
    });
    await loadGuests();
    dashboardMessage.textContent = "Respuesta eliminada correctamente.";
  } catch (error) {
    dashboardMessage.textContent = `No se pudo eliminar la respuesta: ${error.message}`;
  }
}

function handleGuestAction(event) {
  const clearButton = event.target.closest("[data-clear-comment]");
  if (clearButton) {
    clearComment(clearButton.dataset.clearComment);
    return;
  }
  const deleteButton = event.target.closest("[data-delete-response]");
  if (deleteButton) deleteResponse(deleteButton.dataset.deleteResponse);
}

tableBody.addEventListener("click", handleGuestAction);
cards.addEventListener("click", handleGuestAction);

async function loadGuests(allowRetry = true) {
  dashboardMessage.textContent = "Cargando respuestas…";
  try {
    guests = await api("/rest/v1/confirmaciones_v24?select=*&order=created_at.desc");
    updateStats();
    renderGuests();
    if (personalizedInvitations.length) renderInvitations();
    if (seatingTablesData.length || seatingAssignments.length) renderSeating();
    byId("lastUpdate").textContent = `Actualizado: ${new Date().toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" })}`;
  } catch (error) {
    if (allowRetry && /jwt|token|401/i.test(error.message) && await refreshSession()) return loadGuests(false);
    dashboardMessage.textContent = `No se pudieron cargar las respuestas: ${error.message}`;
  }
}

function showDashboard() { loginView.hidden = true; dashboard.hidden = false; loadGuests(); loadEconomy(); loadSeating(); loadGifts(); }
function showLogin() { dashboard.hidden = true; loginView.hidden = false; }

loginForm.addEventListener("submit", async event => {
  event.preventDefault();
  const password = codeInput.value;
  if (!password) { loginMessage.textContent = "Introduce vuestro código."; return; }
  loginButton.disabled = true;
  loginButton.textContent = "Comprobando…";
  loginMessage.textContent = "";
  try {
    await signIn(password);
    codeInput.value = "";
    showDashboard();
  } catch (error) {
    const message = error.message.toLowerCase();
    if (message.includes("confirm")) loginMessage.textContent = "El usuario todavía no está confirmado en Supabase.";
    else if (message.includes("invalid login credentials")) loginMessage.textContent = "Código incorrecto.";
    else loginMessage.textContent = `No se pudo entrar: ${error.message}`;
  } finally {
    loginButton.disabled = false;
    loginButton.textContent = "Entrar al panel";
  }
});

byId("togglePassword").addEventListener("click", () => {
  codeInput.type = codeInput.type === "password" ? "text" : "password";
  byId("togglePassword").textContent = codeInput.type === "password" ? "Ver" : "Ocultar";
});
byId("logoutButton").addEventListener("click", () => { sessionStorage.removeItem(CONFIG.sessionKey); session = null; showLogin(); });
byId("refreshButton").addEventListener("click", () => loadGuests());
searchInput.addEventListener("input", renderGuests);
attendanceFilter.addEventListener("change", renderGuests);
byId("exportButton").addEventListener("click", () => {
  const headers = ["Fecha", "Nombre", "Teléfono", "Asistencia", "Adultos", "Niños", "Total", "Alergias", "Comentarios"];
  const rows = filteredGuests().map(g => [formatDate(g.created_at), g.nombre || "", g.telefono || "", g.asistencia || "", g.acompanante || "", g.alergias || "", g.comentarios || ""]);
  const csv = [headers, ...rows].map(row => row.map(value => `"${String(value).replaceAll('"', '""')}"`).join(";")).join("\n");
  const blob = new Blob(["\ufeff" + csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "confirmaciones-david-raquel.csv";
  link.click();
  URL.revokeObjectURL(url);
});

try { session = JSON.parse(sessionStorage.getItem(CONFIG.sessionKey) || "null"); } catch { session = null; }
if (session?.access_token) showDashboard(); else showLogin();

// V50.1 · Menús infantiles y necesidades especiales
const exportCateringButton = byId("exportCateringButton");
const specialMenuBreakdown = byId("specialMenuBreakdown");

function specialRequirementRows() {
  const rows = [];
  guests
    .filter(guest => attendanceCategory(guest.asistencia) === "yes")
    .forEach(guest => {
      dietaryItems(guest.alergias).forEach(item => {
        rows.push({
          invitation: guest.nombre || "",
          person: item.nombre || guest.nombre || "Sin nombre",
          personType:
            item.tipo_persona === "nino"
              ? "Niño"
              : item.tipo_persona === "adulto"
                ? "Adulto"
                : "Sin especificar",
          requirement: item.detalle || "Otra"
        });
      });
    });
  return rows;
}

function updateCateringDashboard() {
  const attending = guests.filter(
    guest => attendanceCategory(guest.asistencia) === "yes"
  );
  const children = attending.reduce(
    (sum, guest) => sum + Number(guest.ninos || 0),
    0
  );
  const specialRows = specialRequirementRows();

  byId("cateringChildren").textContent = children;
  byId("cateringSpecial").textContent = specialRows.length;

  const groups = new Map();
  specialRows.forEach(row => {
    if (!groups.has(row.requirement)) groups.set(row.requirement, []);
    groups.get(row.requirement).push(
      `${row.person} · ${row.personType}`
    );
  });

  specialMenuBreakdown.innerHTML = groups.size
    ? `<ul class="catering-list">${Array.from(groups.entries()).map(
        ([type, names]) =>
          `<li><strong>${escapeHtml(type)} (${names.length})</strong><br>${names
            .map(escapeHtml)
            .join(", ")}</li>`
      ).join("")}</ul>`
    : "<p>No hay alergias ni preferencias alimentarias registradas.</p>";
}

function exportCateringCsv() {
  const rows = specialRequirementRows();
  const data = [
    ["Invitación", "Persona", "Adulto / Niño", "Alergia o preferencia alimentaria"],
    ...rows.map(row => [
      row.invitation,
      row.person,
      row.personType,
      row.requirement
    ])
  ];

  const csv = data
    .map(row =>
      row
        .map(value => `"${String(value ?? "").replaceAll('"', '""')}"`)
        .join(";")
    )
    .join("\n");

  const blob = new Blob(["\ufeff" + csv], {
    type: "text/csv;charset=utf-8"
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "necesidades-alimentarias-david-raquel.csv";
  link.click();
  URL.revokeObjectURL(url);
}

exportCateringButton?.addEventListener("click", exportCateringCsv);

// V22 · Álbum privado
const MEDIA_BUCKET = "wedding-media-v24";
const mediaGrid = byId("mediaGrid");
const mediaMessage = byId("mediaMessage");
let mediaItems = [];

function humanMediaSize(bytes) {
  const units = ["B", "KB", "MB", "GB"];
  let value = Number(bytes || 0);
  let index = 0;
  while (value >= 1024 && index < units.length - 1) {
    value /= 1024;
    index += 1;
  }
  return `${value.toFixed(index ? 1 : 0)} ${units[index]}`;
}

function encodeStoragePath(path) {
  return String(path).split("/").map(encodeURIComponent).join("/");
}

async function signedMediaUrl(path) {
  const data = await api(
    `/storage/v1/object/sign/${MEDIA_BUCKET}/${encodeStoragePath(path)}`,
    { method: "POST", body: JSON.stringify({ expiresIn: 3600 }) }
  );
  const signed = data?.signedURL || data?.signedUrl;
  if (!signed) throw new Error("No se pudo crear el enlace privado.");
  return signed.startsWith("http") ? signed : `${CONFIG.url}/storage/v1${signed}`;
}

async function loadMedia() {
  if (!mediaGrid) return;
  mediaMessage.textContent = "Cargando fotos y vídeos…";
  try {
    mediaItems = await api("/rest/v1/media_uploads_v24?select=*&order=created_at.desc&limit=200");
    byId("mediaTotal").textContent = mediaItems.length;
    byId("mediaPhotos").textContent = mediaItems.filter(item => String(item.mime_type || "").startsWith("image/")).length;
    byId("mediaVideos").textContent = mediaItems.filter(item => String(item.mime_type || "").startsWith("video/")).length;
    byId("mediaSize").textContent = humanMediaSize(mediaItems.reduce((sum, item) => sum + Number(item.size_bytes || 0), 0));

    if (!mediaItems.length) {
      mediaGrid.innerHTML = "";
      mediaMessage.textContent = "Todavía no se ha subido ningún recuerdo.";
      return;
    }

    mediaMessage.textContent = "Preparando vistas privadas…";
    const cardsHtml = [];
    for (const item of mediaItems) {
      let url = "";
      try { url = await signedMediaUrl(item.object_path); } catch (error) { console.warn(error); }
      const isImage = String(item.mime_type || "").startsWith("image/");
      const isVideo = String(item.mime_type || "").startsWith("video/");
      const preview = url && isImage
        ? `<img src="${url}" alt="${escapeHtml(item.original_name)}" loading="lazy">`
        : url && isVideo
          ? `<video src="${url}" controls preload="metadata"></video>`
          : `<span>Archivo privado</span>`;
      cardsHtml.push(`<article class="media-card"><div class="media-preview">${preview}</div><div class="media-card__body"><h3 title="${escapeHtml(item.original_name)}">${escapeHtml(item.original_name)}</h3><p>${escapeHtml(item.uploader_name || "Remitente sin indicar")}</p><p>${formatDate(item.created_at)} · ${humanMediaSize(item.size_bytes)}</p><div class="media-actions">${url ? `<a href="${url}" download target="_blank" rel="noopener">Abrir / descargar</a>` : ""}<button type="button" class="danger-link" data-delete-media="${item.id}" data-object-path="${escapeHtml(item.object_path)}">Eliminar archivo</button></div></div></article>`);
    }
    mediaGrid.innerHTML = cardsHtml.join("");
    mediaMessage.textContent = `${mediaItems.length} archivo${mediaItems.length === 1 ? "" : "s"} recibido${mediaItems.length === 1 ? "" : "s"}.`;
  } catch (error) {
    mediaMessage.textContent = `No se pudieron cargar los archivos: ${error.message}`;
  }
}

byId("refreshMediaButton")?.addEventListener("click", loadMedia);
const originalShowDashboard = showDashboard;
showDashboard = function () {
  originalShowDashboard();
  loadMedia();
};


async function deleteMediaItem(id, objectPath) {
  if (!confirm("¿Seguro que quieres eliminar esta foto o vídeo? Esta acción no se puede deshacer.")) return;
  mediaMessage.textContent = "Eliminando archivo…";
  try {
    const encodedPath = encodeStoragePath(objectPath);
    await api(`/storage/v1/object/${MEDIA_BUCKET}/${encodedPath}`, { method: "DELETE" });
    await api(`/rest/v1/media_uploads_v24?id=eq.${encodeURIComponent(id)}`, {
      method: "DELETE",
      headers: { Prefer: "return=minimal" }
    });
    await loadMedia();
    mediaMessage.textContent = "Archivo eliminado correctamente.";
  } catch (error) {
    mediaMessage.textContent = `No se pudo eliminar el archivo: ${error.message}`;
  }
}

mediaGrid?.addEventListener("click", event => {
  const button = event.target.closest("[data-delete-media]");
  if (!button) return;
  deleteMediaItem(button.dataset.deleteMedia, button.dataset.objectPath);
});


// =========================================================
// V26 · Gestión de invitaciones personalizadas
// =========================================================

const invitationForm = byId("invitationForm");
const invitationName = byId("invitationName");
const invitationPhone = byId("invitationPhone");
const invitationTreatment = byId("invitationTreatment");
const invitationAdults = byId("invitationAdults");
const invitationChildren = byId("invitationChildren");
const invitationList = byId("invitationList");
const invitationMessage = byId("invitationMessage");
const refreshInvitationsButton = byId("refreshInvitationsButton");

let personalizedInvitations = [];

function weddingInvitationUrl() {
  return `${window.location.origin}/`;
}

function invitationNameLooksPlural(name, adultsMax = 1, childrenMax = 0) {
  const cleanName = String(name || "").trim();
  const normalizedName = normalize(cleanName);

  if (Number(adultsMax || 0) + Number(childrenMax || 0) > 1) {
    return true;
  }

  return (
    /\s(?:y|e|&|\+)\s/i.test(cleanName) ||
    cleanName.includes(",") ||
    /\b(familia|los|las|hermanos|hermanas|padres|amigos|primos|tíos|tias|tías)\b/i.test(normalizedName)
  );
}

function inferredInvitationTreatment(name) {
  return invitationNameLooksPlural(name, 1, 0)
    ? "plural_mixto"
    : "singular";
}

function normalizeAdminTreatment(value, name = "") {
  const treatment = String(value || "").trim().toLowerCase();

  if (treatment === "singular") return "singular";
  if (treatment === "plural_femenino") return "plural_femenino";
  if (treatment === "plural_mixto") return "plural_mixto";

  return inferredInvitationTreatment(name);
}

function invitationShareMessage(
  name,
  code,
  adultsMax = 1,
  childrenMax = 0,
  treatmentValue = ""
) {
  const guestName = String(name || "").trim();
  const greeting = guestName ? `Hola ${guestName},` : "Hola,";
  const link = weddingInvitationUrl(code);
  const treatment = normalizeAdminTreatment(treatmentValue, guestName);
  const plural = treatment !== "singular";
  const femininePlural = treatment === "plural_femenino";
  const isFamily = /\bfamilia\b/i.test(normalize(guestName));

  const inviteVerb = plural ? "invitaros" : "invitarte";
  const accessVerb = plural ? "Podéis acceder" : "Puedes acceder";
  const invitationPossessive = plural ? "vuestra invitación" : "tu invitación";
  const codePrompt = plural ? "se os pedirá" : "se te pedirá";
  const instruction = plural
    ? "Solo tenéis que introducir:"
    : "Solo tienes que introducir:";
  const pronoun = femininePlural ? "vosotras" : "vosotros";
  const closing = isFamily
    ? "¡Será un placer compartir este día con toda la familia!"
    : plural
      ? `¡Estamos deseando compartir este día con ${pronoun}!`
      : "¡Estamos deseando compartir este día contigo!";

  return [
    greeting,
    "",
    `Nos hace muchísima ilusión ${inviteVerb} a nuestra boda.`,
    "",
    `${accessVerb} a ${invitationPossessive} desde el siguiente enlace:`,
    link,
    "",
    `Al abrir el enlace, ${codePrompt} un código de acceso.`,
    instruction,
    String(code || "").trim().toUpperCase(),
    "",
    closing,
    "",
    "David & Raquel ❤️"
  ].join("\n");
}

function whatsappUrl(phone, name, code, adultsMax = 1, childrenMax = 0, treatment = "") {
  let cleanPhone = String(phone || "").replace(/\D/g, "");
  const text = invitationShareMessage(name, code, adultsMax, childrenMax, treatment);

  if (cleanPhone.startsWith("00")) {
    cleanPhone = cleanPhone.slice(2);
  }

  if (cleanPhone && !cleanPhone.startsWith("34")) {
    cleanPhone = `34${cleanPhone}`;
  }

  const base = cleanPhone
    ? `https://wa.me/${cleanPhone}`
    : "https://wa.me/";

  return `${base}?text=${encodeURIComponent(text)}`;
}

async function copyTextSafely(text, promptTitle) {
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {}

  window.prompt(promptTitle, text);
  return false;
}

async function copyInvitationLink(code) {
  const link = weddingInvitationUrl(code);
  const copied = await copyTextSafely(link, "Copia este enlace:");

  invitationMessage.textContent = copied
    ? "Enlace copiado correctamente."
    : "El enlace está listo para copiar.";
}

async function copyInvitationMessage(
  name,
  code,
  adultsMax = 1,
  childrenMax = 0,
  treatment = ""
) {
  const message = invitationShareMessage(
    name,
    code,
    adultsMax,
    childrenMax,
    treatment
  );
  const copied = await copyTextSafely(
    message,
    "Copia este mensaje para enviarlo al invitado:"
  );

  invitationMessage.textContent = copied
    ? "Mensaje completo copiado. Ya puedes pegarlo en WhatsApp o donde prefieras."
    : "El mensaje está listo para copiar.";
}


function latestConfirmationForInvitation(code) {
  return guests
    .filter(guest => normalize(guest.codigo_invitacion) === normalize(code))
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))[0] || null;
}

function invitationResponseState(item) {
  const response = latestConfirmationForInvitation(item.codigo);

  if (!response) {
    return {
      className: "pending",
      label: "Pendiente",
      adults: 0,
      children: 0,
      total: 0
    };
  }

  const adults = Number(response.adultos || 0);
  const children = Number(response.ninos || 0);
  const total = adults + children;
  const capacity =
    Number(item.adultos_max ?? item.max_personas ?? 1) +
    Number(item.ninos_max ?? 0);

  if (attendanceCategory(response.asistencia) === "no") {
    return {
      className: "complete",
      label: "No asistirán",
      adults: 0,
      children: 0,
      total: 0
    };
  }

  return {
    className: total >= capacity ? "complete" : "partial",
    label: total >= capacity ? "Completa" : "Parcial",
    adults,
    children,
    total
  };
}

function updateInvitationSummary() {
  const invitationsCreated = personalizedInvitations.length;
  const invitedAdults = personalizedInvitations.reduce(
    (sum, item) =>
      sum + Number(item.adultos_max ?? item.max_personas ?? 1),
    0
  );
  const invitedChildren = personalizedInvitations.reduce(
    (sum, item) => sum + Number(item.ninos_max ?? 0),
    0
  );

  byId("statInvitationsCreated").textContent = invitationsCreated;
  byId("statInvitedAdults").textContent = invitedAdults;
  byId("statInvitedChildren").textContent = invitedChildren;
  byId("statInvitedPeople").textContent =
    invitedAdults + invitedChildren;
}

function renderInvitations() {
  updateInvitationSummary();

  if (!personalizedInvitations.length) {
    invitationList.innerHTML = "";
    invitationMessage.textContent =
      "Todavía no habéis creado invitaciones personalizadas.";
    return;
  }

  invitationList.innerHTML = personalizedInvitations.map(item => {
    const opened = item.opened_at
      ? `Abierta: ${formatDate(item.opened_at)}`
      : "Todavía no abierta";

    const adultsMax = Number(item.adultos_max ?? item.max_personas ?? 1);
    const childrenMax = Number(item.ninos_max ?? 0);
    const state = invitationResponseState(item);

    return `
      <article class="invitation-item">
        <div class="invitation-edit-main">
          <label class="invitation-edit-field">
            <span>Nombre</span>
            <input type="text"
                   value="${escapeHtml(item.nombre_mostrado || "")}"
                   data-invitation-name-input="${item.id}">
          </label>

          <label class="invitation-edit-field">
            <span>Teléfono</span>
            <input type="tel"
                   value="${escapeHtml(item.telefono || "")}"
                   placeholder="Sin teléfono"
                   data-invitation-phone-input="${item.id}">
          </label>

          <label class="invitation-edit-field">
            <span>Tratamiento</span>
            <select data-invitation-treatment="${item.id}">
              <option value="singular"
                ${normalizeAdminTreatment(item.tratamiento, item.nombre_mostrado) === "singular" ? "selected" : ""}>
                Singular · contigo
              </option>
              <option value="plural_mixto"
                ${normalizeAdminTreatment(item.tratamiento, item.nombre_mostrado) === "plural_mixto" ? "selected" : ""}>
                Plural · vosotros
              </option>
              <option value="plural_femenino"
                ${normalizeAdminTreatment(item.tratamiento, item.nombre_mostrado) === "plural_femenino" ? "selected" : ""}>
                Plural femenino · vosotras
              </option>
            </select>
          </label>

          <p class="invitation-code-row">
            Código:
            <span class="invitation-code">${escapeHtml(item.codigo)}</span>
          </p>

          <div class="invitation-capacity">
            <span class="capacity-pill">👨 ${adultsMax} adultos máx.</span>
            <span class="capacity-pill">👧 ${childrenMax} niños máx.</span>
            <span class="capacity-pill capacity-pill--total">
              👥 ${adultsMax + childrenMax} invitados
            </span>
          </div>
        </div>

        <div>
          <p>${escapeHtml(item.telefono || "Sin teléfono")}</p>
          <p>
            Confirmados:
            <strong>${state.adults} adultos y ${state.children} niños</strong>
          </p>
        </div>

        <div class="invitation-state">
          <span class="invitation-status-pill ${state.className}">
            ${state.label}
          </span>
          <p>${opened}</p>
        </div>

        <div class="invitation-inline-editor">
          <label>
            <span>Adultos máximos</span>
            <select data-invitation-adults="${item.id}">
              ${Array.from({ length: 21 }, (_, value) =>
                `<option value="${value}" ${value === adultsMax ? "selected" : ""}>${value}</option>`
              ).join("")}
            </select>
          </label>

          <label>
            <span>Niños máximos</span>
            <select data-invitation-children="${item.id}">
              ${Array.from({ length: 21 }, (_, value) =>
                `<option value="${value}" ${value === childrenMax ? "selected" : ""}>${value}</option>`
              ).join("")}
            </select>
          </label>

          <button type="button"
                  class="save-limits-button save-invitation-button"
                  data-save-invitation="${item.id}">
            Guardar cambios
          </button>
        </div>

        <div class="invitation-actions">
          <button type="button"
                  data-copy-invitation="${escapeHtml(item.codigo)}">
            Copiar enlace
          </button>

          <button type="button"
                  class="copy-message-button"
                  data-copy-invitation-message="${escapeHtml(item.codigo)}"
                  data-invitation-message-name="${escapeHtml(item.nombre_mostrado)}"
                  data-invitation-message-adults="${adultsMax}"
                  data-invitation-message-children="${childrenMax}"
                  data-invitation-message-treatment="${escapeHtml(
                    normalizeAdminTreatment(item.tratamiento, item.nombre_mostrado)
                  )}">
            Copiar mensaje
          </button>

          <a href="${whatsappUrl(
            item.telefono,
            item.nombre_mostrado,
            item.codigo,
            adultsMax,
            childrenMax,
            normalizeAdminTreatment(item.tratamiento, item.nombre_mostrado)
          )}"
             target="_blank" rel="noopener">
            Enviar por WhatsApp
          </a>

          <button type="button" class="danger-link"
                  data-delete-invitation="${item.id}">
            Eliminar
          </button>
        </div>
      </article>
    `;
  }).join("");

  invitationMessage.textContent =
    `${personalizedInvitations.length} invitación` +
    `${personalizedInvitations.length === 1 ? "" : "es"} creada` +
    `${personalizedInvitations.length === 1 ? "" : "s"}.`;
}

async function loadInvitations() {
  if (!invitationList) return;

  invitationMessage.textContent = "Cargando invitaciones…";

  try {
    personalizedInvitations = await api(
      "/rest/v1/invitaciones_personalizadas" +
      "?select=*&order=created_at.desc"
    );
    renderInvitations();
  } catch (error) {
    invitationMessage.textContent =
      `No se pudieron cargar las invitaciones: ${error.message}`;
  }
}

async function createInvitation(event) {
  event.preventDefault();

  const name = invitationName.value.trim();
  if (!name) {
    invitationMessage.textContent = "Escribe el nombre del invitado.";
    return;
  }

  invitationMessage.textContent = "Creando invitación…";

  try {
    await api("/rest/v1/invitaciones_personalizadas", {
      method: "POST",
      headers: { Prefer: "return=minimal" },
      body: JSON.stringify({
        nombre_mostrado: name,
        telefono: invitationPhone.value.trim() || null,
        tratamiento: normalizeAdminTreatment(
          invitationTreatment.value,
          name
        ),
        adultos_max: Number(invitationAdults.value || 0),
        ninos_max: Number(invitationChildren.value || 0),
        max_personas:
          Number(invitationAdults.value || 0) +
          Number(invitationChildren.value || 0)
      })
    });

    invitationForm.reset();
    invitationAdults.value = "1";
    invitationChildren.value = "0";
    invitationTreatment.value = "automatico";
    await loadInvitations();
    invitationMessage.textContent = "Invitación creada correctamente.";
  } catch (error) {
    invitationMessage.textContent =
      `No se pudo crear la invitación: ${error.message}`;
  }
}

async function saveInvitation(button) {
  const id = button.dataset.saveInvitation;

  const nameInput = invitationList.querySelector(
    `[data-invitation-name-input="${CSS.escape(id)}"]`
  );
  const phoneInput = invitationList.querySelector(
    `[data-invitation-phone-input="${CSS.escape(id)}"]`
  );
  const adultsSelect = invitationList.querySelector(
    `[data-invitation-adults="${CSS.escape(id)}"]`
  );
  const childrenSelect = invitationList.querySelector(
    `[data-invitation-children="${CSS.escape(id)}"]`
  );
  const treatmentSelect = invitationList.querySelector(
    `[data-invitation-treatment="${CSS.escape(id)}"]`
  );

  const name = nameInput?.value.trim() || "";
  const phone = phoneInput?.value.trim() || null;
  const adults = Number(adultsSelect?.value || 0);
  const children = Number(childrenSelect?.value || 0);
  const treatment = normalizeAdminTreatment(
    treatmentSelect?.value,
    name
  );

  if (!name) {
    invitationMessage.textContent = "El nombre del invitado no puede estar vacío.";
    nameInput?.focus();
    return;
  }

  button.disabled = true;
  const originalText = button.textContent;
  button.textContent = "Guardando…";
  invitationMessage.textContent = "Guardando cambios…";

  try {
    await api(
      `/rest/v1/invitaciones_personalizadas?id=eq.${encodeURIComponent(id)}`,
      {
        method: "PATCH",
        headers: { Prefer: "return=minimal" },
        body: JSON.stringify({
          nombre_mostrado: name,
          telefono: phone,
          tratamiento: treatment,
          adultos_max: adults,
          ninos_max: children,
          max_personas: adults + children
        })
      }
    );

    await loadInvitations();
    invitationMessage.textContent = `Cambios guardados para ${name}.`;
  } catch (error) {
    invitationMessage.textContent =
      `No se pudieron guardar los cambios: ${error.message}`;
  } finally {
    button.disabled = false;
    button.textContent = originalText;
  }
}

async function deleteInvitation(id) {
  if (!confirm(
    "¿Seguro que quieres eliminar esta invitación personalizada?"
  )) return;

  invitationMessage.textContent = "Eliminando invitación…";

  try {
    await api(
      `/rest/v1/invitaciones_personalizadas?id=eq.${encodeURIComponent(id)}`,
      {
        method: "DELETE",
        headers: { Prefer: "return=minimal" }
      }
    );

    await loadInvitations();
    invitationMessage.textContent = "Invitación eliminada.";
  } catch (error) {
    invitationMessage.textContent =
      `No se pudo eliminar la invitación: ${error.message}`;
  }
}

invitationForm?.addEventListener("submit", createInvitation);
refreshInvitationsButton?.addEventListener("click", loadInvitations);


invitationList?.addEventListener("keydown", event => {
  if (event.key !== "Enter") return;

  const input = event.target.closest(
    "[data-invitation-name-input], [data-invitation-phone-input]"
  );
  if (!input) return;

  event.preventDefault();
  const item = input.closest(".invitation-item");
  const button = item?.querySelector("[data-save-invitation]");
  if (button) saveInvitation(button);
});

invitationList?.addEventListener("click", event => {
  const saveInvitationButton = event.target.closest("[data-save-invitation]");
  if (saveInvitationButton) {
    saveInvitation(saveInvitationButton);
    return;
  }

  const copyButton = event.target.closest("[data-copy-invitation]");
  if (copyButton) {
    copyInvitationLink(copyButton.dataset.copyInvitation);
    return;
  }

  const copyMessageButton = event.target.closest(
    "[data-copy-invitation-message]"
  );
  if (copyMessageButton) {
    copyInvitationMessage(
      copyMessageButton.dataset.invitationMessageName,
      copyMessageButton.dataset.copyInvitationMessage,
      Number(copyMessageButton.dataset.invitationMessageAdults || 1),
      Number(copyMessageButton.dataset.invitationMessageChildren || 0),
      copyMessageButton.dataset.invitationMessageTreatment || ""
    );
    return;
  }

  const deleteButton = event.target.closest("[data-delete-invitation]");
  if (deleteButton) {
    deleteInvitation(deleteButton.dataset.deleteInvitation);
  }
});

// Cargar también las invitaciones cuando el panel ya tiene sesión.
const originalShowDashboardV26 = showDashboard;
showDashboard = function () {
  originalShowDashboardV26();
  loadInvitations();
};



// V53.1 · Herramientas para limpiar datos de prueba
const resetOpeningsButton = byId("resetOpeningsButton");
const resetConfirmationsButton = byId("resetConfirmationsButton");
const adminResetMessage = byId("adminResetMessage");

async function resetInvitationOpenings() {
  const accepted = window.confirm(
    "¿Quieres marcar todas las invitaciones como pendientes de abrir? " +
    "No se borrarán confirmaciones ni invitados."
  );
  if (!accepted) return;

  resetOpeningsButton.disabled = true;
  resetOpeningsButton.textContent = "Reiniciando…";
  adminResetMessage.textContent = "Reiniciando aperturas…";

  try {
    await api(
      "/rest/v1/invitaciones_personalizadas?opened_at=not.is.null",
      {
        method: "PATCH",
        headers: { Prefer: "return=minimal" },
        body: JSON.stringify({ opened_at: null })
      }
    );

    await loadInvitations();
    adminResetMessage.textContent =
      "Todas las invitaciones vuelven a aparecer como pendientes de abrir.";
  } catch (error) {
    adminResetMessage.textContent =
      `No se pudieron reiniciar las aperturas: ${error.message}`;
  } finally {
    resetOpeningsButton.disabled = false;
    resetOpeningsButton.textContent = "Marcar todas como pendientes";
  }
}

async function resetTestConfirmations() {
  const firstConfirmation = window.confirm(
    "Esta acción borrará TODAS las confirmaciones actuales. " +
    "¿Seguro que son datos de prueba?"
  );
  if (!firstConfirmation) return;

  const confirmationText = window.prompt(
    'Escribe BORRAR para confirmar que deseas eliminar todas las confirmaciones:'
  );
  if (String(confirmationText || "").trim().toUpperCase() !== "BORRAR") {
    adminResetMessage.textContent =
      "No se borró ninguna confirmación.";
    return;
  }

  resetConfirmationsButton.disabled = true;
  resetConfirmationsButton.textContent = "Borrando…";
  adminResetMessage.textContent = "Eliminando confirmaciones de prueba…";

  try {
    await api("/rest/v1/confirmaciones_v24?id=not.is.null", {
      method: "DELETE",
      headers: { Prefer: "return=minimal" }
    });

    await loadGuests();
    await loadInvitations();
    adminResetMessage.textContent =
      "Confirmaciones eliminadas. El panel está listo para los datos reales.";
  } catch (error) {
    adminResetMessage.textContent =
      `No se pudieron borrar las confirmaciones: ${error.message}`;
  } finally {
    resetConfirmationsButton.disabled = false;
    resetConfirmationsButton.textContent =
      "Borrar confirmaciones de prueba";
  }
}

resetOpeningsButton?.addEventListener("click", resetInvitationOpenings);
resetConfirmationsButton?.addEventListener(
  "click",
  resetTestConfirmations
);



// =========================================================
// V54 · Seating y regalos privados
// =========================================================
let seatingTablesData = [];
let seatingAssignments = [];
let giftsData = [];

const euroFormatter = new Intl.NumberFormat("es-ES", {
  style: "currency",
  currency: "EUR"
});

function attendingGuestsForSeating() {
  return guests.filter(
    guest => attendanceCategory(guest.asistencia) === "yes"
  );
}

function seatingGroupCount(guest, groupType) {
  return groupType === "ninos"
    ? Number(guest.ninos || 0)
    : Number(guest.adultos || 0);
}

function tablesByType(type) {
  return seatingTablesData.filter(
    table => String(table.tipo || "adultos") === type
  );
}

function assignmentForGuest(guestId, groupType) {
  return seatingAssignments.find(
    item =>
      String(item.confirmacion_id) === String(guestId) &&
      String(item.tipo_grupo || "adultos") === groupType
  );
}

function tableAssignedPeople(table) {
  const tableType = String(table.tipo || "adultos");

  return seatingAssignments
    .filter(item => String(item.mesa_id) === String(table.id))
    .reduce((sum, item) => {
      const guest = attendingGuestsForSeating().find(
        person => String(person.id) === String(item.confirmacion_id)
      );
      if (!guest) return sum;
      return sum + seatingGroupCount(guest, tableType);
    }, 0);
}

function seatingTableCard(table, attending) {
  const tableType = String(table.tipo || "adultos");
  const occupied = tableAssignedPeople(table);
  const capacity = Number(table.capacidad || 0);
  const over = occupied > capacity;

  const members = seatingAssignments
    .filter(
      item =>
        String(item.mesa_id) === String(table.id) &&
        String(item.tipo_grupo || "adultos") === tableType
    )
    .map(item => {
      const guest = attending.find(
        person => String(person.id) === String(item.confirmacion_id)
      );
      return guest
        ? {
            guest,
            count: seatingGroupCount(guest, tableType)
          }
        : null;
    })
    .filter(Boolean);

  return `<article class="seating-table-card seating-table-card--${tableType} ${over ? "is-over-capacity" : ""}">
    <div class="seating-table-card__header">
      <div>
        <span>Mesa ${escapeHtml(table.numero)}</span>
        <h3>${escapeHtml(table.nombre)}</h3>
        <small class="seating-table-type">
          ${tableType === "ninos" ? "Mesa de niños" : "Mesa de adultos"}
        </small>
      </div>
      <strong>${occupied}/${capacity}</strong>
    </div>
    ${table.notas ? `<p>${escapeHtml(table.notas)}</p>` : ""}
    <ul>${
      members.length
        ? members.map(item =>
            `<li>
              <span>${escapeHtml(item.guest.nombre || "Sin nombre")}</span>
              <strong>${item.count}</strong>
            </li>`
          ).join("")
        : "<li>Sin invitados asignados</li>"
    }</ul>
    <div class="seating-table-card__actions">
      <button type="button" data-edit-table="${table.id}">Editar</button>
      <button type="button" class="danger-link" data-delete-table="${table.id}">
        Eliminar
      </button>
    </div>
  </article>`;
}

function renderSeating() {
  const attending = attendingGuestsForSeating();
  const adultTables = tablesByType("adultos");
  const childTables = tablesByType("ninos");

  const adultCapacity = adultTables.reduce(
    (sum, table) => sum + Number(table.capacidad || 0), 0
  );
  const childCapacity = childTables.reduce(
    (sum, table) => sum + Number(table.capacidad || 0), 0
  );

  const totalAdults = attending.reduce(
    (sum, guest) => sum + Number(guest.adultos || 0), 0
  );
  const totalChildren = attending.reduce(
    (sum, guest) => sum + Number(guest.ninos || 0), 0
  );

  const adultsAssigned = attending.reduce(
    (sum, guest) =>
      sum + (assignmentForGuest(guest.id, "adultos")
        ? Number(guest.adultos || 0)
        : 0),
    0
  );
  const childrenAssigned = attending.reduce(
    (sum, guest) =>
      sum + (assignmentForGuest(guest.id, "ninos")
        ? Number(guest.ninos || 0)
        : 0),
    0
  );

  byId("seatingAdultTables").textContent = adultTables.length;
  byId("seatingChildTables").textContent = childTables.length;
  byId("seatingAdultCapacity").textContent = adultCapacity;
  byId("seatingChildCapacity").textContent = childCapacity;
  byId("seatingAdultsAssigned").textContent = adultsAssigned;
  byId("seatingChildrenAssigned").textContent = childrenAssigned;
  byId("seatingAdultsUnassigned").textContent =
    Math.max(0, totalAdults - adultsAssigned);
  byId("seatingChildrenUnassigned").textContent =
    Math.max(0, totalChildren - childrenAssigned);

  const tableContainer = byId("seatingTables");
  tableContainer.innerHTML = `
    <section class="seating-table-group">
      <div class="seating-table-group__heading">
        <h3>Mesas de adultos</h3>
        <span>${adultTables.length} mesa${adultTables.length === 1 ? "" : "s"}</span>
      </div>
      <div class="seating-table-group__grid">
        ${
          adultTables.length
            ? adultTables.map(table =>
                seatingTableCard(table, attending)
              ).join("")
            : "<p>Todavía no hay mesas de adultos.</p>"
        }
      </div>
    </section>

    <section class="seating-table-group">
      <div class="seating-table-group__heading">
        <h3>Mesas de niños</h3>
        <span>${childTables.length} mesa${childTables.length === 1 ? "" : "s"}</span>
      </div>
      <div class="seating-table-group__grid">
        ${
          childTables.length
            ? childTables.map(table =>
                seatingTableCard(table, attending)
              ).join("")
            : "<p>Todavía no hay mesas de niños.</p>"
        }
      </div>
    </section>`;

  const guestContainer = byId("seatingGuests");
  guestContainer.innerHTML = attending.length
    ? attending.map(guest => {
        const adults = Number(guest.adultos || 0);
        const children = Number(guest.ninos || 0);
        const adultAssignment =
          assignmentForGuest(guest.id, "adultos");
        const childAssignment =
          assignmentForGuest(guest.id, "ninos");

        return `<article class="seating-guest-row seating-guest-row--split">
          <div class="seating-guest-row__identity">
            <strong>${escapeHtml(guest.nombre || "Sin nombre")}</strong>
            <span>${adults} adultos · ${children} niños</span>
            ${
              guest.alergias
                ? `<small>Necesidades: ${escapeHtml(guest.alergias)}</small>`
                : ""
            }
          </div>

          <div class="seating-split-selects">
            ${
              adults > 0
                ? `<label>
                    <span>Mesa adultos · ${adults}</span>
                    <select data-seat-guest="${guest.id}" data-seat-type="adultos">
                      <option value="">Sin mesa de adultos</option>
                      ${adultTables.map(table =>
                        `<option value="${table.id}"
                          ${
                            adultAssignment &&
                            String(adultAssignment.mesa_id) === String(table.id)
                              ? "selected"
                              : ""
                          }>
                          Mesa ${escapeHtml(table.numero)} · ${escapeHtml(table.nombre)}
                        </option>`
                      ).join("")}
                    </select>
                  </label>`
                : ""
            }

            ${
              children > 0
                ? `<label>
                    <span>Mesa niños · ${children}</span>
                    <select data-seat-guest="${guest.id}" data-seat-type="ninos">
                      <option value="">Sin mesa de niños</option>
                      ${childTables.map(table =>
                        `<option value="${table.id}"
                          ${
                            childAssignment &&
                            String(childAssignment.mesa_id) === String(table.id)
                              ? "selected"
                              : ""
                          }>
                          Mesa ${escapeHtml(table.numero)} · ${escapeHtml(table.nombre)}
                        </option>`
                      ).join("")}
                    </select>
                  </label>`
                : ""
            }
          </div>
        </article>`;
      }).join("")
    : "<p>Todavía no hay asistentes confirmados.</p>";
}

async function loadSeating() {
  const message = byId("seatingMessage");
  message.textContent = "Cargando seating…";

  try {
    [seatingTablesData, seatingAssignments] = await Promise.all([
      api("/rest/v1/mesas_v54?select=*&order=tipo.asc,numero.asc"),
      api("/rest/v1/asignaciones_mesas_v54?select=*")
    ]);
    renderSeating();
    message.textContent = "Seating actualizado.";
  } catch (error) {
    message.textContent =
      `No se pudo cargar el seating: ${error.message}`;
  }
}

byId("tableForm")?.addEventListener("submit", async event => {
  event.preventDefault();

  const message = byId("seatingMessage");
  const payload = {
    numero: Number(byId("tableNumber").value),
    nombre: byId("tableName").value.trim(),
    tipo: byId("tableType").value,
    capacidad: Number(byId("tableCapacity").value),
    notas: byId("tableNotes").value.trim() || null
  };

  try {
    await api("/rest/v1/mesas_v54", {
      method: "POST",
      headers: { Prefer: "return=minimal" },
      body: JSON.stringify(payload)
    });

    event.target.reset();
    byId("tableCapacity").value = "10";
    byId("tableType").value = "adultos";

    await loadSeating();
    message.textContent =
      payload.tipo === "ninos"
        ? "Mesa de niños creada."
        : "Mesa de adultos creada.";
  } catch (error) {
    message.textContent =
      `No se pudo crear la mesa: ${error.message}`;
  }
});

byId("seatingGuests")?.addEventListener("change", async event => {
  const select = event.target.closest("[data-seat-guest]");
  if (!select) return;

  const guestId = Number(select.dataset.seatGuest);
  const groupType = select.dataset.seatType || "adultos";
  const tableId = select.value ? Number(select.value) : null;
  const existing = assignmentForGuest(guestId, groupType);
  const message = byId("seatingMessage");

  try {
    const query =
      `/rest/v1/asignaciones_mesas_v54` +
      `?confirmacion_id=eq.${guestId}` +
      `&tipo_grupo=eq.${encodeURIComponent(groupType)}`;

    if (!tableId && existing) {
      await api(query, {
        method: "DELETE",
        headers: { Prefer: "return=minimal" }
      });
    } else if (tableId && existing) {
      await api(query, {
        method: "PATCH",
        headers: { Prefer: "return=minimal" },
        body: JSON.stringify({
          mesa_id: tableId,
          tipo_grupo: groupType
        })
      });
    } else if (tableId) {
      await api("/rest/v1/asignaciones_mesas_v54", {
        method: "POST",
        headers: { Prefer: "return=minimal" },
        body: JSON.stringify({
          confirmacion_id: guestId,
          mesa_id: tableId,
          tipo_grupo: groupType
        })
      });
    }

    await loadSeating();
    message.textContent =
      groupType === "ninos"
        ? "Mesa de niños guardada."
        : "Mesa de adultos guardada.";
  } catch (error) {
    message.textContent =
      `No se pudo guardar la asignación: ${error.message}`;
  }
});

byId("seatingTables")?.addEventListener("click", async event => {
  const edit = event.target.closest("[data-edit-table]");
  const remove = event.target.closest("[data-delete-table]");
  const message = byId("seatingMessage");

  if (edit) {
    const table = seatingTablesData.find(
      item => String(item.id) === edit.dataset.editTable
    );
    if (!table) return;

    const name = prompt("Nombre de la mesa:", table.nombre);
    if (name === null) return;

    const capacity = prompt("Capacidad:", table.capacidad);
    if (capacity === null) return;

    const notes = prompt("Notas privadas:", table.notas || "");

    try {
      await api(`/rest/v1/mesas_v54?id=eq.${table.id}`, {
        method: "PATCH",
        headers: { Prefer: "return=minimal" },
        body: JSON.stringify({
          nombre: name.trim(),
          capacidad: Number(capacity),
          notas: notes.trim() || null
        })
      });
      await loadSeating();
      message.textContent = "Mesa actualizada.";
    } catch (error) {
      message.textContent =
        `No se pudo editar la mesa: ${error.message}`;
    }
  }

  if (remove) {
    if (!confirm(
      "¿Eliminar esta mesa? Sus invitados quedarán sin mesa en ese grupo."
    )) return;

    try {
      await api(
        `/rest/v1/mesas_v54?id=eq.${remove.dataset.deleteTable}`,
        {
          method: "DELETE",
          headers: { Prefer: "return=minimal" }
        }
      );
      await loadSeating();
    } catch (error) {
      message.textContent =
        `No se pudo eliminar la mesa: ${error.message}`;
    }
  }
});

function exportSeatingCsv() {
  const attending = attendingGuestsForSeating();

  const headers = [
    "Invitación",
    "Adultos",
    "Mesa adultos",
    "Niños",
    "Mesa niños",
    "Necesidades"
  ];

  const rows = attending.map(guest => {
    const adultAssignment =
      assignmentForGuest(guest.id, "adultos");
    const childAssignment =
      assignmentForGuest(guest.id, "ninos");

    const adultTable = seatingTablesData.find(
      table =>
        adultAssignment &&
        String(table.id) === String(adultAssignment.mesa_id)
    );
    const childTable = seatingTablesData.find(
      table =>
        childAssignment &&
        String(table.id) === String(childAssignment.mesa_id)
    );

    return [
      guest.nombre || "",
      Number(guest.adultos || 0),
      adultTable
        ? `Mesa ${adultTable.numero} · ${adultTable.nombre}`
        : "Sin mesa",
      Number(guest.ninos || 0),
      childTable
        ? `Mesa ${childTable.numero} · ${childTable.nombre}`
        : "Sin mesa",
      guest.alergias || ""
    ];
  });

  downloadPlanningCsv(
    "seating-adultos-ninos-david-raquel.csv",
    headers,
    rows
  );
}

function giftStatusLabel(status) {
  return ({
    recibido: "Recibido",
    pendiente: "Pendiente de comprobar",
    agradecido: "Agradecimiento enviado"
  })[status] || status;
}

function renderGifts() {
  const total = giftsData
    .filter(gift => gift.estado !== "pendiente")
    .reduce((sum, gift) => sum + Number(gift.importe || 0), 0);

  byId("giftCount").textContent = giftsData.length;
  byId("giftTotal").textContent = euroFormatter.format(total);
  byId("giftPending").textContent =
    giftsData.filter(gift => gift.estado === "pendiente").length;
  byId("giftThanked").textContent =
    giftsData.filter(gift => gift.estado === "agradecido").length;

  byId("giftsTableBody").innerHTML = giftsData.map(gift => `<tr>
    <td>${escapeHtml(gift.fecha || "—")}</td>
    <td>${escapeHtml(gift.invitado)}</td>
    <td>${escapeHtml(gift.tipo)}</td>
    <td>${euroFormatter.format(Number(gift.importe || 0))}</td>
    <td>${escapeHtml(giftStatusLabel(gift.estado))}</td>
    <td>${escapeHtml(gift.notas || "—")}</td>
    <td>
      ${gift.estado !== "agradecido" ? `<button type="button" data-thank-gift="${gift.id}">Agradecido</button>` : ""}
      <button type="button" class="danger-link" data-delete-gift="${gift.id}">Eliminar</button>
    </td>
  </tr>`).join("");

  byId("giftCards").innerHTML = giftsData.map(gift => `<article class="guest-card">
    <h2>${escapeHtml(gift.invitado)}</h2>
    <dl>
      <dt>Fecha</dt><dd>${escapeHtml(gift.fecha || "—")}</dd>
      <dt>Tipo</dt><dd>${escapeHtml(gift.tipo)}</dd>
      <dt>Importe</dt><dd>${euroFormatter.format(Number(gift.importe || 0))}</dd>
      <dt>Estado</dt><dd>${escapeHtml(giftStatusLabel(gift.estado))}</dd>
      <dt>Notas</dt><dd>${escapeHtml(gift.notas || "—")}</dd>
    </dl>
    <div class="card-actions">
      ${gift.estado !== "agradecido" ? `<button type="button" data-thank-gift="${gift.id}">Marcar agradecido</button>` : ""}
      <button type="button" class="danger-link" data-delete-gift="${gift.id}">Eliminar</button>
    </div>
  </article>`).join("");
}

async function loadGifts() {
  const message = byId("giftsMessage");
  message.textContent = "Cargando regalos…";
  try {
    giftsData = await api("/rest/v1/regalos_v54?select=*&order=fecha.desc,created_at.desc");
    renderGifts();
    message.textContent = giftsData.length
      ? `${giftsData.length} regalo${giftsData.length === 1 ? "" : "s"} registrado${giftsData.length === 1 ? "" : "s"}.`
      : "Todavía no hay regalos registrados.";
  } catch (error) {
    message.textContent = `No se pudieron cargar los regalos: ${error.message}`;
  }
}

byId("giftForm")?.addEventListener("submit", async event => {
  event.preventDefault();
  const payload = {
    invitado: byId("giftGuest").value.trim(),
    tipo: byId("giftType").value,
    importe: Number(byId("giftAmount").value),
    fecha: byId("giftDate").value,
    estado: byId("giftStatus").value,
    notas: byId("giftNotes").value.trim() || null
  };
  try {
    await api("/rest/v1/regalos_v54", {
      method: "POST",
      headers: { Prefer: "return=minimal" },
      body: JSON.stringify(payload)
    });
    event.target.reset();
    byId("giftDate").value = new Date().toISOString().slice(0, 10);
    await loadGifts();
    byId("giftsMessage").textContent = "Regalo guardado.";
  } catch (error) {
    byId("giftsMessage").textContent = `No se pudo guardar el regalo: ${error.message}`;
  }
});

function handleGiftAction(event) {
  const thank = event.target.closest("[data-thank-gift]");
  const remove = event.target.closest("[data-delete-gift]");

  if (thank) {
    api(`/rest/v1/regalos_v54?id=eq.${thank.dataset.thankGift}`, {
      method: "PATCH",
      headers: { Prefer: "return=minimal" },
      body: JSON.stringify({ estado: "agradecido" })
    }).then(loadGifts).catch(error => {
      byId("giftsMessage").textContent = error.message;
    });
  }

  if (remove && confirm("¿Eliminar este registro de regalo?")) {
    api(`/rest/v1/regalos_v54?id=eq.${remove.dataset.deleteGift}`, {
      method: "DELETE",
      headers: { Prefer: "return=minimal" }
    }).then(loadGifts).catch(error => {
      byId("giftsMessage").textContent = error.message;
    });
  }
}

byId("giftsTableBody")?.addEventListener("click", handleGiftAction);
byId("giftCards")?.addEventListener("click", handleGiftAction);

function downloadPlanningCsv(filename, headers, rows) {
  const escape = value => `"${String(value ?? "").replaceAll('"', '""')}"`;
  const csv = [headers, ...rows]
    .map(row => row.map(escape).join(";"))
    .join("\n");
  const blob = new Blob(["\ufeff" + csv], {
    type: "text/csv;charset=utf-8"
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

function exportGiftsCsv() {
  downloadPlanningCsv(
    "regalos-david-raquel.csv",
    ["Fecha", "Invitado", "Tipo", "Importe EUR", "Estado", "Notas"],
    giftsData.map(gift => [
      gift.fecha,
      gift.invitado,
      gift.tipo,
      Number(gift.importe || 0).toFixed(2),
      giftStatusLabel(gift.estado),
      gift.notas || ""
    ])
  );
}

byId("refreshSeatingButton")?.addEventListener("click", loadSeating);
byId("exportSeatingButton")?.addEventListener("click", exportSeatingCsv);
byId("refreshGiftsButton")?.addEventListener("click", loadGifts);
byId("exportGiftsButton")?.addEventListener("click", exportGiftsCsv);

if (byId("giftDate")) {
  byId("giftDate").value = new Date().toISOString().slice(0, 10);
}


// V53.2 · Gestión de varias canciones por momento
let musicSuggestions = [];

const refreshMusicButton = byId("refreshMusicButton");
const exportMusicButton = byId("exportMusicButton");
const musicTableBody = byId("musicTableBody");
const musicCards = byId("musicCards");
const musicAdminMessage = byId("musicAdminMessage");
const musicRanking = byId("musicRanking");

function songsFor(item, moment) {
  const prefix = moment === "dinner" ? "cena" : "baile";
  return [1, 2, 3]
    .map(index => {
      const suffix = index === 1 ? "" : `_${index}`;
      return {
        song: String(item[`cancion_${prefix}${suffix}`] || "").trim(),
        artist: String(item[`artista_${prefix}${suffix}`] || "").trim()
      };
    })
    .filter(entry => entry.song);
}

function allMusicEntries() {
  return musicSuggestions.flatMap(item => [
    ...songsFor(item, "dinner").map(entry => ({
      ...entry,
      moment: "Cena",
      item
    })),
    ...songsFor(item, "dance").map(entry => ({
      ...entry,
      moment: "Baile",
      item
    }))
  ]);
}

function spotifySearchUrl(song, artist) {
  const query = [song, artist].filter(Boolean).join(" ").trim();
  return query
    ? `https://open.spotify.com/search/${encodeURIComponent(query)}`
    : "";
}

function spotifyLinkHtml(song, artist, label = "Abrir en Spotify") {
  const url = spotifySearchUrl(song, artist);
  return url
    ? `<a class="spotify-link" href="${url}" target="_blank" rel="noopener noreferrer">🎧 ${label}</a>`
    : "—";
}

function songListHtml(entries) {
  if (!entries.length) return "—";
  return `<ol class="admin-song-list">${entries.map(entry =>
    `<li><strong>${escapeHtml(entry.song)}</strong>` +
    `${entry.artist ? `<span> — ${escapeHtml(entry.artist)}</span>` : ""}` +
    `</li>`
  ).join("")}</ol>`;
}

function spotifyListHtml(entries, label) {
  if (!entries.length) return "—";
  return `<div class="admin-spotify-list">${entries.map((entry, index) =>
    spotifyLinkHtml(entry.song, entry.artist, `${label} ${index + 1}`)
  ).join("")}</div>`;
}

function openSpotifySearches(moment) {
  const entries = musicSuggestions.flatMap(item => songsFor(item, moment));
  const unique = [];
  const seen = new Set();

  entries.forEach(entry => {
    const key = normalizedSong(entry.song, entry.artist);
    if (!seen.has(key)) {
      seen.add(key);
      unique.push(entry);
    }
  });

  if (!unique.length) {
    musicAdminMessage.textContent = moment === "dinner"
      ? "Todavía no hay canciones para la cena."
      : "Todavía no hay canciones para el baile.";
    return;
  }

  window.open(
    spotifySearchUrl(unique[0].song, unique[0].artist),
    "_blank",
    "noopener"
  );

  if (unique.length > 1) {
    const remaining = unique.slice(1)
      .map(entry => spotifySearchUrl(entry.song, entry.artist))
      .join("\n");

    navigator.clipboard?.writeText(remaining)
      .then(() => {
        musicAdminMessage.textContent =
          `Se abrió la primera búsqueda y se copiaron ` +
          `${unique.length - 1} enlaces más.`;
      })
      .catch(() => {
        musicAdminMessage.textContent =
          "Se abrió la primera búsqueda. Usa los botones para abrir el resto.";
      });
  }
}

function normalizedSong(song, artist) {
  return normalize(`${song || ""} — ${artist || ""}`);
}

function artistRankingData() {
  const counts = new Map();

  allMusicEntries().forEach(entry => {
    if (!entry.artist) return;
    const key = normalize(entry.artist);
    const current = counts.get(key) || {
      artist: entry.artist,
      count: 0
    };
    current.count += 1;
    counts.set(key, current);
  });

  return Array.from(counts.values())
    .sort((a, b) =>
      b.count - a.count || a.artist.localeCompare(b.artist)
    );
}

function musicRankingData() {
  const counts = new Map();

  allMusicEntries().forEach(entry => {
    const key = normalizedSong(entry.song, entry.artist);
    const current = counts.get(key) || {
      song: entry.song,
      artist: entry.artist,
      count: 0,
      moments: new Set()
    };
    current.count += 1;
    current.moments.add(entry.moment);
    counts.set(key, current);
  });

  return Array.from(counts.values())
    .sort((a, b) =>
      b.count - a.count ||
      String(a.song).localeCompare(String(b.song))
    );
}

function renderArtistRanking() {
  const ranking = artistRankingData().slice(0, 10);
  artistRanking.innerHTML = ranking.length
    ? `<ol class="music-ranking-list">${ranking.map((item, index) =>
        `<li><div><strong>${index + 1}. ${escapeHtml(item.artist)}</strong></div>` +
        `<span>${item.count} ${item.count === 1 ? "petición" : "peticiones"}</span></li>`
      ).join("")}</ol>`
    : "<p>Todavía no hay artistas registrados.</p>";
}

function renderMusicRanking() {
  const ranking = musicRankingData().slice(0, 10);
  musicRanking.innerHTML = ranking.length
    ? `<ol class="music-ranking-list">${ranking.map((item, index) =>
        `<li><div><strong>${index + 1}. ${escapeHtml(item.song || "Sin título")}</strong>` +
        `${item.artist ? `<small> — ${escapeHtml(item.artist)}</small>` : ""}</div>` +
        `<span>${item.count} ${item.count === 1 ? "voto" : "votos"}</span></li>`
      ).join("")}</ol>`
    : "<p>Todavía no hay canciones sugeridas.</p>";
}

function updateMusicStats() {
  const dinnerCount = musicSuggestions
    .reduce((sum, item) => sum + songsFor(item, "dinner").length, 0);
  const danceCount = musicSuggestions
    .reduce((sum, item) => sum + songsFor(item, "dance").length, 0);
  const ranking = musicRankingData();

  byId("musicTotal").textContent = dinnerCount + danceCount;
  byId("musicDinner").textContent = dinnerCount;
  byId("musicDance").textContent = danceCount;
  byId("musicTop").textContent = ranking[0]
    ? `${ranking[0].song} (${ranking[0].count})`
    : "—";
}

function renderMusicSuggestions() {
  musicTableBody.innerHTML = musicSuggestions.map(item => {
    const dinner = songsFor(item, "dinner");
    const dance = songsFor(item, "dance");

    return `<tr>
      <td>${formatDate(item.created_at)}</td>
      <td>${escapeHtml(item.nombre || "—")}</td>
      <td>${songListHtml(dinner)}</td>
      <td>${spotifyListHtml(dinner, "Cena")}</td>
      <td>${songListHtml(dance)}</td>
      <td>${spotifyListHtml(dance, "Baile")}</td>
      <td><button type="button" class="danger-link" data-delete-music="${item.id}">Eliminar</button></td>
    </tr>`;
  }).join("");

  musicCards.innerHTML = musicSuggestions.map(item => {
    const dinner = songsFor(item, "dinner");
    const dance = songsFor(item, "dance");

    return `<article class="guest-card">
      <h2>${escapeHtml(item.nombre || "Sin nombre")}</h2>
      <dl>
        <dt>Fecha</dt><dd>${formatDate(item.created_at)}</dd>
        <dt>Cena</dt><dd>${songListHtml(dinner)}</dd>
        <dt>Baile</dt><dd>${songListHtml(dance)}</dd>
      </dl>
      <div class="music-card-links">
        ${spotifyListHtml(dinner, "Cena")}
        ${spotifyListHtml(dance, "Baile")}
      </div>
      <button type="button" class="danger-link" data-delete-music="${item.id}">
        Eliminar sugerencia
      </button>
    </article>`;
  }).join("");

  const totalSongs = allMusicEntries().length;
  musicAdminMessage.textContent = totalSongs
    ? `${totalSongs} canción${totalSongs === 1 ? "" : "es"} sugerida${totalSongs === 1 ? "" : "s"}.`
    : "Todavía no hay sugerencias musicales.";

  updateMusicStats();
  renderMusicRanking();
  renderArtistRanking();
}

async function loadMusicSuggestions() {
  musicAdminMessage.textContent = "Cargando canciones…";
  try {
    musicSuggestions = await api(
      "/rest/v1/sugerencias_musicales_v42?select=*&order=created_at.desc"
    );
    renderMusicSuggestions();
  } catch (error) {
    musicAdminMessage.textContent =
      `No se pudieron cargar las canciones: ${error.message}`;
  }
}

async function deleteMusicSuggestion(id) {
  if (!confirm("¿Quieres eliminar esta sugerencia musical?")) return;
  try {
    await api(
      `/rest/v1/sugerencias_musicales_v42?id=eq.${encodeURIComponent(id)}`,
      { method: "DELETE", headers: { Prefer: "return=minimal" } }
    );
    await loadMusicSuggestions();
  } catch (error) {
    musicAdminMessage.textContent =
      `No se pudo eliminar la sugerencia: ${error.message}`;
  }
}

function handleMusicAction(event) {
  const button = event.target.closest("[data-delete-music]");
  if (button) deleteMusicSuggestion(button.dataset.deleteMusic);
}

function csvEscapeMusic(value) {
  const text = String(value ?? "");
  return `"${text.replaceAll('"', '""')}"`;
}

function exportMusicCsv() {
  const headers = [
    "Fecha", "Invitado", "Momento", "Canción", "Artista", "Spotify"
  ];

  const rows = musicSuggestions.flatMap(item => [
    ...songsFor(item, "dinner").map(entry => [
      item.created_at, item.nombre, "Cena", entry.song, entry.artist,
      spotifySearchUrl(entry.song, entry.artist)
    ]),
    ...songsFor(item, "dance").map(entry => [
      item.created_at, item.nombre, "Baile", entry.song, entry.artist,
      spotifySearchUrl(entry.song, entry.artist)
    ])
  ]);

  const lines = [
    headers.map(csvEscapeMusic).join(","),
    ...rows.map(row => row.map(csvEscapeMusic).join(","))
  ];

  const blob = new Blob(
    ["\ufeff" + lines.join("\n")],
    { type: "text/csv;charset=utf-8" }
  );
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "banda-sonora-david-raquel.csv";
  link.click();
  URL.revokeObjectURL(url);
}

refreshMusicButton?.addEventListener("click", loadMusicSuggestions);
openDinnerSpotifyButton?.addEventListener(
  "click",
  () => openSpotifySearches("dinner")
);
openDanceSpotifyButton?.addEventListener(
  "click",
  () => openSpotifySearches("dance")
);
exportMusicButton?.addEventListener("click", exportMusicCsv);
musicTableBody?.addEventListener("click", handleMusicAction);
musicCards?.addEventListener("click", handleMusicAction);

window.addEventListener("load", () => {
  window.setTimeout(() => {
    if (!byId("dashboard")?.hidden) loadMusicSuggestions();
  }, 900);
});



// V54.2 · Accesos rápidos del panel
document.querySelectorAll(".dashboard-quick-nav a").forEach(link => {
  link.addEventListener("click", () => {
    if (link.hasAttribute("data-open-invitations")) {
      const invitations = document.getElementById("enlaces-unicos");
      if (invitations instanceof HTMLDetailsElement) {
        invitations.open = true;
      }
    }
  });
});


// V55 · Control económico
let expensesData = [];
let weddingBudget = 0;
let weddingLoan = 0;
const euroV55 = new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR" });
const expenseStatusLabels = { pagado: "Pagado", reserva: "Reserva", pendiente: "Pendiente", cancelado: "Cancelado" };

function expenseShares(expense) {
  const amount = Number(expense.importe || 0);
  if (expense.pagado_por === "David") return { david: amount, raquel: 0 };
  if (expense.pagado_por === "Raquel") return { david: 0, raquel: amount };
  if (expense.pagado_por === "Ambos") return { david: amount / 2, raquel: amount / 2 };
  if (expense.pagado_por === "Préstamo") return { david: 0, raquel: 0 };
  const davidPct = Number(expense.porcentaje_david ?? 50) / 100;
  return { david: amount * davidPct, raquel: amount * (1 - davidPct) };
}

function filteredExpenses() {
  const q = normalize(byId("expenseSearch")?.value);
  const category = byId("expenseCategoryFilter")?.value || "";
  const payer = byId("expensePayerFilter")?.value || "";
  const status = byId("expenseStatusFilter")?.value || "";
  return expensesData.filter(item => {
    const text = normalize([item.concepto,item.categoria,item.proveedor,item.referencia,item.forma_pago,item.observaciones].join(" "));
    return (!q || text.includes(q)) && (!category || item.categoria === category) && (!payer || item.pagado_por === payer) && (!status || item.estado === status);
  });
}

function renderEconomy() {
  const active = expensesData.filter(item => item.estado !== "cancelado");
  const spent = active.reduce((s,i) => s + Number(i.importe || 0), 0);
  const pending = active.filter(i => i.estado === "pendiente" || i.estado === "reserva").reduce((s,i)=>s+Number(i.importe||0),0);
  const paid = active.filter(i => i.estado === "pagado" || i.estado === "reserva");
  const totals = paid.reduce((acc,item)=>{ const x=expenseShares(item); acc.david+=x.david; acc.raquel+=x.raquel; return acc; }, {david:0,raquel:0});
  const loanSpent = expensesData
    .filter(item => item.estado !== "cancelado" && item.pagado_por === "Préstamo")
    .reduce((sum, item) => sum + Number(item.importe || 0), 0);
  byId("economyBudget").textContent = euroV55.format(weddingBudget);
  byId("economySpent").textContent = euroV55.format(spent);
  byId("economyRemaining").textContent = euroV55.format(weddingBudget - spent);
  byId("economyLoan").textContent = euroV55.format(weddingLoan);
  byId("economyLoanRemaining").textContent = euroV55.format(weddingLoan - loanSpent);
  byId("economyLoanSpent").textContent = euroV55.format(loanSpent);
  byId("economyDavid").textContent = euroV55.format(totals.david);
  byId("economyRaquel").textContent = euroV55.format(totals.raquel);
  byId("economyPending").textContent = euroV55.format(pending);
  const diff = Math.abs(totals.david - totals.raquel) / 2;
  const loanRemaining = weddingLoan - loanSpent;
  const contributionText = totals.david === totals.raquel
    ? "Las aportaciones están equilibradas."
    : `${totals.david < totals.raquel ? "David" : "Raquel"} debería aportar ${euroV55.format(diff)} para equilibrar al 50 %.`;
  const loanText = weddingLoan > 0
    ? (loanRemaining >= 0
      ? `Del préstamo quedan disponibles ${euroV55.format(loanRemaining)}.`
      : `Los gastos superan el préstamo en ${euroV55.format(Math.abs(loanRemaining))}.`)
    : "Todavía no se ha indicado el importe del préstamo.";
  byId("economyBalance").textContent = `${loanText} ${contributionText}`;
  const categories = [...new Set(expensesData.map(i=>i.categoria).filter(Boolean))].sort();
  const catFilter = byId("expenseCategoryFilter"); const current = catFilter.value;
  catFilter.innerHTML = '<option value="">Todas</option>' + categories.map(c=>`<option value="${escapeHtml(c)}">${escapeHtml(c)}</option>`).join(""); catFilter.value=current;
  const rows = filteredExpenses();
  byId("expensesTableBody").innerHTML = rows.map(item => `<tr><td>${escapeHtml(item.fecha||"—")}</td><td>${escapeHtml(item.concepto)}</td><td>${escapeHtml(item.categoria)}</td><td>${escapeHtml(item.proveedor||"—")}</td><td>${euroV55.format(Number(item.importe||0))}</td><td>${escapeHtml(item.pagado_por)}</td><td>${escapeHtml(item.forma_pago_otro||item.forma_pago||"—")}</td><td><span class="expense-status expense-status--${escapeHtml(item.estado)}">${escapeHtml(expenseStatusLabels[item.estado]||item.estado)}</span></td><td>${item.requiere_factura ? (item.factura_recibida ? "Recibida" : "Pendiente") : "No requerida"}</td><td><div class="row-actions"><button type="button" data-edit-expense="${item.id}">Editar</button>${item.documento_url ? `<a class="button-link" target="_blank" rel="noopener" href="${escapeHtml(item.documento_url)}">Documento</a>`:""}<button type="button" class="danger-link" data-delete-expense="${item.id}">Eliminar</button></div></td></tr>`).join("");
  byId("expenseCards").innerHTML = rows.map(item => `<article class="guest-card"><h2>${escapeHtml(item.concepto)}</h2><dl><dt>Fecha</dt><dd>${escapeHtml(item.fecha||"—")}</dd><dt>Categoría</dt><dd>${escapeHtml(item.categoria)}</dd><dt>Importe</dt><dd>${euroV55.format(Number(item.importe||0))}</dd><dt>Pagado por</dt><dd>${escapeHtml(item.pagado_por)}</dd><dt>Forma</dt><dd>${escapeHtml(item.forma_pago_otro||item.forma_pago||"—")}</dd><dt>Estado</dt><dd>${escapeHtml(expenseStatusLabels[item.estado]||item.estado)}</dd></dl><div class="row-actions"><button type="button" data-edit-expense="${item.id}">Editar</button><button type="button" class="danger-link" data-delete-expense="${item.id}">Eliminar</button></div></article>`).join("");
}

async function loadEconomy() {
  const message=byId("expensesMessage"); if (!message) return;
  message.textContent="Cargando control económico…";
  try {
    const [expenses, settings] = await Promise.all([api("/rest/v1/gastos_boda_v55?select=*&order=fecha.desc,created_at.desc"), api("/rest/v1/configuracion_economica_v55?select=*&id=eq.1")]);
    expensesData=expenses||[];
    weddingBudget=Number(settings?.[0]?.presupuesto_total||0);
    weddingLoan=Number(settings?.[0]?.prestamo_total||0);
    byId("budgetTotal").value=weddingBudget||"";
    byId("loanTotal").value=weddingLoan||"";
    renderEconomy();
    message.textContent=expensesData.length?`${expensesData.length} gasto${expensesData.length===1?"":"s"} registrado${expensesData.length===1?"":"s"}.`:"Todavía no hay gastos registrados.";
  } catch(error) { message.textContent=`No se pudo cargar el control económico: ${error.message}. Ejecuta SUPABASE-V55-CONTROL-ECONOMICO.sql.`; }
}

function resetExpenseForm(){ byId("expenseForm").reset(); byId("expenseId").value=""; byId("expenseDate").value=new Date().toISOString().slice(0,10); byId("expenseDavidShare").value=50; byId("saveExpenseButton").textContent="Guardar gasto"; byId("cancelExpenseEdit").hidden=true; byId("expenseDavidShareLabel").hidden=true; byId("expenseOtherPaymentLabel").hidden=true; }
function editExpense(id){ const item=expensesData.find(x=>String(x.id)===String(id)); if(!item)return; byId("expenseId").value=item.id; byId("expenseDate").value=item.fecha||""; byId("expenseConcept").value=item.concepto||""; byId("expenseCategory").value=item.categoria||""; byId("expenseSupplier").value=item.proveedor||""; byId("expenseAmount").value=item.importe||""; byId("expensePayer").value=item.pagado_por||"David"; byId("expenseDavidShare").value=item.porcentaje_david??50; byId("expensePaymentMethod").value=item.forma_pago||"Transferencia"; byId("expenseOtherPayment").value=item.forma_pago_otro||""; byId("expenseReference").value=item.referencia||""; byId("expenseStatus").value=item.estado||"pagado"; byId("expenseDueDate").value=item.fecha_vencimiento||""; byId("expenseRequiresInvoice").value=String(Boolean(item.requiere_factura)); byId("expenseInvoiceReceived").value=String(Boolean(item.factura_recibida)); byId("expenseDocumentUrl").value=item.documento_url||""; byId("expenseNotes").value=item.observaciones||""; byId("expenseDavidShareLabel").hidden=item.pagado_por!=="Personalizado"; byId("expenseOtherPaymentLabel").hidden=item.forma_pago!=="Otro"; byId("saveExpenseButton").textContent="Guardar cambios"; byId("cancelExpenseEdit").hidden=false; byId("expenseForm").scrollIntoView({behavior:"smooth",block:"center"}); }

byId("expensePayer")?.addEventListener("change",e=>byId("expenseDavidShareLabel").hidden=e.target.value!=="Personalizado");
byId("expensePaymentMethod")?.addEventListener("change",e=>byId("expenseOtherPaymentLabel").hidden=e.target.value!=="Otro");
byId("budgetForm")?.addEventListener("submit",async e=>{
  e.preventDefault();
  try{
    weddingBudget=Number(byId("budgetTotal").value||0);
    weddingLoan=Number(byId("loanTotal").value||0);
    await api("/rest/v1/configuracion_economica_v55?id=eq.1",{
      method:"PATCH",
      headers:{Prefer:"return=minimal"},
      body:JSON.stringify({
        presupuesto_total:weddingBudget,
        prestamo_total:weddingLoan,
        updated_at:new Date().toISOString()
      })
    });
    renderEconomy();
    byId("expensesMessage").textContent="Presupuesto y préstamo actualizados.";
  }catch(error){
    byId("expensesMessage").textContent=error.message;
  }
});
byId("expenseForm")?.addEventListener("submit",async e=>{e.preventDefault(); const id=byId("expenseId").value; const payer=byId("expensePayer").value; const payload={fecha:byId("expenseDate").value,concepto:byId("expenseConcept").value.trim(),categoria:byId("expenseCategory").value.trim(),proveedor:byId("expenseSupplier").value.trim()||null,importe:Number(byId("expenseAmount").value),pagado_por:payer,porcentaje_david:payer==="David"?100:payer==="Raquel"?0:payer==="Ambos"?50:payer==="Préstamo"?0:Number(byId("expenseDavidShare").value||50),forma_pago:byId("expensePaymentMethod").value,forma_pago_otro:byId("expensePaymentMethod").value==="Otro"?(byId("expenseOtherPayment").value.trim()||null):null,referencia:byId("expenseReference").value.trim()||null,estado:byId("expenseStatus").value,fecha_vencimiento:byId("expenseDueDate").value||null,requiere_factura:byId("expenseRequiresInvoice").value==="true",factura_recibida:byId("expenseInvoiceReceived").value==="true",documento_url:byId("expenseDocumentUrl").value.trim()||null,observaciones:byId("expenseNotes").value.trim()||null,updated_at:new Date().toISOString()}; try{await api(id?`/rest/v1/gastos_boda_v55?id=eq.${encodeURIComponent(id)}`:"/rest/v1/gastos_boda_v55",{method:id?"PATCH":"POST",headers:{Prefer:"return=minimal"},body:JSON.stringify(payload)}); resetExpenseForm(); await loadEconomy();}catch(error){byId("expensesMessage").textContent=`No se pudo guardar: ${error.message}`;}});
byId("cancelExpenseEdit")?.addEventListener("click",resetExpenseForm);
byId("expensesTableBody")?.addEventListener("click",handleExpenseAction); byId("expenseCards")?.addEventListener("click",handleExpenseAction);
function handleExpenseAction(e){const edit=e.target.closest("[data-edit-expense]");const del=e.target.closest("[data-delete-expense]");if(edit)editExpense(edit.dataset.editExpense);if(del&&confirm("¿Eliminar este gasto?"))api(`/rest/v1/gastos_boda_v55?id=eq.${encodeURIComponent(del.dataset.deleteExpense)}`,{method:"DELETE",headers:{Prefer:"return=minimal"}}).then(loadEconomy).catch(error=>byId("expensesMessage").textContent=error.message);}
["expenseSearch","expenseCategoryFilter","expensePayerFilter","expenseStatusFilter"].forEach(id=>byId(id)?.addEventListener(id==="expenseSearch"?"input":"change",renderEconomy));
byId("refreshExpensesButton")?.addEventListener("click",loadEconomy);
byId("exportExpensesButton")?.addEventListener("click",()=>{const headers=["Fecha","Concepto","Categoría","Proveedor","Importe","Pagado por","% David","Forma de pago","Referencia","Estado","Vencimiento","Requiere factura","Factura recibida","Documento","Observaciones"];const rows=filteredExpenses().map(i=>[i.fecha,i.concepto,i.categoria,i.proveedor,i.importe,i.pagado_por,i.porcentaje_david,i.forma_pago_otro||i.forma_pago,i.referencia,i.estado,i.fecha_vencimiento,i.requiere_factura?"Sí":"No",i.factura_recibida?"Sí":"No",i.documento_url,i.observaciones]);downloadPlanningCsv("gastos-boda-david-raquel.csv",headers,rows);});
window.addEventListener("load",()=>{if(byId("expenseDate"))resetExpenseForm();});
