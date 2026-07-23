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
  return `<ul class="dietary-admin-list">${items.map(item =>
    `<li><strong>${escapeHtml(item.nombre || "Sin nombre")}:</strong> ${escapeHtml(item.detalle || "Sin detalle")}</li>`
  ).join("")}</ul>`;
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
    byId("lastUpdate").textContent = `Actualizado: ${new Date().toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" })}`;
  } catch (error) {
    if (allowRetry && /jwt|token|401/i.test(error.message) && await refreshSession()) return loadGuests(false);
    dashboardMessage.textContent = `No se pudieron cargar las respuestas: ${error.message}`;
  }
}

function showDashboard() { loginView.hidden = true; dashboard.hidden = false; loadGuests(); }
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
    groups.get(row.requirement).push(row.person);
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
    ["Invitación", "Persona", "Alergia o preferencia alimentaria"],
    ...rows.map(row => [row.invitation, row.person, row.requirement])
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
const invitationAdults = byId("invitationAdults");
const invitationChildren = byId("invitationChildren");
const invitationList = byId("invitationList");
const invitationMessage = byId("invitationMessage");
const refreshInvitationsButton = byId("refreshInvitationsButton");

let personalizedInvitations = [];

function weddingInvitationUrl(code) {
  return `${window.location.origin}/?i=${encodeURIComponent(code)}`;
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

function invitationShareMessage(
  name,
  code,
  adultsMax = 1,
  childrenMax = 0
) {
  const guestName = String(name || "").trim();
  const greeting = guestName ? `Hola ${guestName},` : "Hola,";
  const link = weddingInvitationUrl(code);
  const plural = invitationNameLooksPlural(
    guestName,
    adultsMax,
    childrenMax
  );
  const isFamily = /\bfamilia\b/i.test(normalize(guestName));

  const inviteVerb = plural ? "invitaros" : "invitarte";
  const accessVerb = plural ? "Podéis acceder" : "Puedes acceder";
  const invitationPossessive = plural ? "vuestra invitación" : "tu invitación";
  const codePrompt = plural ? "se os pedirá" : "se te pedirá";
  const instruction = plural
    ? "Solo tenéis que introducir:"
    : "Solo tienes que introducir:";
  const closing = isFamily
    ? "¡Será un placer compartir este día con toda la familia!"
    : plural
      ? "¡Estamos deseando compartir este día con vosotros!"
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

function whatsappUrl(phone, name, code, adultsMax = 1, childrenMax = 0) {
  const cleanPhone = String(phone || "").replace(/\D/g, "");
  const text = invitationShareMessage(name, code, adultsMax, childrenMax);

  const base = cleanPhone
    ? `https://wa.me/34${cleanPhone}`
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
  childrenMax = 0
) {
  const message = invitationShareMessage(
    name,
    code,
    adultsMax,
    childrenMax
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

function renderInvitations() {
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
        <div>
          <h3>${escapeHtml(item.nombre_mostrado)}</h3>
          <p><span class="invitation-code">${escapeHtml(item.codigo)}</span></p>
          <div class="invitation-capacity">
            <span class="capacity-pill">👨 ${adultsMax} adultos máx.</span>
            <span class="capacity-pill">👧 ${childrenMax} niños máx.</span>
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
                  class="save-limits-button"
                  data-save-invitation-limits="${item.id}"
                  data-invitation-name="${escapeHtml(item.nombre_mostrado)}">
            Guardar límites
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
                  data-invitation-message-children="${childrenMax}">
            Copiar mensaje
          </button>

          <a href="${whatsappUrl(
            item.telefono,
            item.nombre_mostrado,
            item.codigo,
            adultsMax,
            childrenMax
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
    await loadInvitations();
    invitationMessage.textContent = "Invitación creada correctamente.";
  } catch (error) {
    invitationMessage.textContent =
      `No se pudo crear la invitación: ${error.message}`;
  }
}

async function saveInvitationLimits(button) {
  const id = button.dataset.saveInvitationLimits;
  const name = button.dataset.invitationName || "esta invitación";

  const adultsSelect = invitationList.querySelector(
    `[data-invitation-adults="${CSS.escape(id)}"]`
  );
  const childrenSelect = invitationList.querySelector(
    `[data-invitation-children="${CSS.escape(id)}"]`
  );

  const adults = Number(adultsSelect?.value ?? 0);
  const children = Number(childrenSelect?.value ?? 0);

  if (
    !Number.isInteger(adults) || adults < 0 || adults > 20 ||
    !Number.isInteger(children) || children < 0 || children > 20 ||
    adults + children < 1
  ) {
    invitationMessage.textContent =
      "Debes permitir al menos una persona entre adultos y niños.";
    return;
  }

  const originalText = button.textContent;
  button.disabled = true;
  button.textContent = "Guardando…";
  invitationMessage.textContent = `Actualizando límites de ${name}…`;

  try {
    await api(
      `/rest/v1/invitaciones_personalizadas?id=eq.${encodeURIComponent(id)}`,
      {
        method: "PATCH",
        headers: { Prefer: "return=minimal" },
        body: JSON.stringify({
          adultos_max: adults,
          ninos_max: children,
          max_personas: adults + children
        })
      }
    );

    await loadInvitations();
    invitationMessage.textContent =
      `Límites de ${name} actualizados: ${adults} adultos y ${children} niños.`;
  } catch (error) {
    invitationMessage.textContent =
      `No se pudieron actualizar los límites: ${error.message}`;
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

invitationList?.addEventListener("click", event => {
  const saveLimitsButton = event.target.closest("[data-save-invitation-limits]");
  if (saveLimitsButton) {
    saveInvitationLimits(saveLimitsButton);
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
      Number(copyMessageButton.dataset.invitationMessageChildren || 0)
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


// V42 · Gestión de música
let musicSuggestions=[];const refreshMusicButton=byId("refreshMusicButton"),exportMusicButton=byId("exportMusicButton"),musicTableBody=byId("musicTableBody"),musicCards=byId("musicCards"),musicAdminMessage=byId("musicAdminMessage"),musicRanking=byId("musicRanking");
function spotifySearchUrl(song,artist){const q=[song,artist].filter(Boolean).join(" ").trim();return q?`https://open.spotify.com/search/${encodeURIComponent(q)}`:"";}
function spotifyLinkHtml(song,artist,label="Abrir en Spotify"){const u=spotifySearchUrl(song,artist);return u?`<a class="spotify-link" href="${u}" target="_blank" rel="noopener noreferrer">🎧 ${label}</a>`:"—";}
function openSpotifySearches(moment){const seen=new Set(),searches=musicSuggestions.map(i=>moment==="dinner"?[i.cancion_cena,i.artista_cena]:[i.cancion_baile,i.artista_baile]).filter(([s])=>normalize(s)).filter(([s,a])=>{const k=normalizedSong(s,a);if(seen.has(k))return false;seen.add(k);return true;});if(!searches.length){musicAdminMessage.textContent=moment==="dinner"?"Todavía no hay canciones para la cena.":"Todavía no hay canciones para el baile.";return;}const urls=searches.map(([s,a])=>spotifySearchUrl(s,a));window.open(urls[0],"_blank","noopener");if(urls.length>1){navigator.clipboard?.writeText(urls.slice(1).join("\n")).then(()=>musicAdminMessage.textContent=`Se abrió la primera búsqueda y se copiaron ${urls.length-1} enlaces más al portapapeles.`).catch(()=>musicAdminMessage.textContent="Se abrió la primera búsqueda. Usa los botones de cada canción para abrir el resto.");}}
function artistRankingData(){const counts=new Map();musicSuggestions.forEach(i=>[i.artista_cena,i.artista_baile].forEach(a=>{const clean=String(a||"").trim();if(!clean)return;const k=normalize(clean),c=counts.get(k)||{artist:clean,count:0};c.count++;counts.set(k,c);}));return Array.from(counts.values()).sort((a,b)=>b.count-a.count||a.artist.localeCompare(b.artist));}
function renderArtistRanking(){const r=artistRankingData().slice(0,10);artistRanking.innerHTML=r.length?`<ol class="music-ranking-list">${r.map((i,x)=>`<li><div><strong>${x+1}. ${escapeHtml(i.artist)}</strong></div><span>${i.count} ${i.count===1?"petición":"peticiones"}</span></li>`).join("")}</ol>`:"<p>Todavía no hay artistas registrados.</p>";}
function normalizedSong(song,artist){return normalize(`${song||""} — ${artist||""}`)}
function musicRankingData(){const counts=new Map();musicSuggestions.forEach(i=>[[i.cancion_cena,i.artista_cena,"Cena"],[i.cancion_baile,i.artista_baile,"Baile"]].forEach(([s,a,m])=>{if(!normalize(s))return;const k=normalizedSong(s,a),c=counts.get(k)||{song:s,artist:a,count:0,moments:new Set()};c.count++;c.moments.add(m);counts.set(k,c);}));return Array.from(counts.values()).sort((a,b)=>b.count-a.count||String(a.song).localeCompare(String(b.song)));}
function updateMusicStats(){const d=musicSuggestions.filter(i=>normalize(i.cancion_cena)).length,b=musicSuggestions.filter(i=>normalize(i.cancion_baile)).length,r=musicRankingData();byId("musicTotal").textContent=musicSuggestions.length;byId("musicDinner").textContent=d;byId("musicDance").textContent=b;byId("musicTop").textContent=r[0]?`${r[0].song} (${r[0].count})`:"—";}
function renderMusicRanking(){const r=musicRankingData().slice(0,10);musicRanking.innerHTML=r.length?`<ol class="music-ranking-list">${r.map((i,x)=>`<li><div><strong>${x+1}. ${escapeHtml(i.song||"Sin título")}</strong>${i.artist?`<small> — ${escapeHtml(i.artist)}</small>`:""}</div><span>${i.count} ${i.count===1?"voto":"votos"}</span></li>`).join("")}</ol>`:"<p>Todavía no hay canciones sugeridas.</p>";}
function renderMusicSuggestions(){musicTableBody.innerHTML=musicSuggestions.map(i=>`<tr><td>${formatDate(i.created_at)}</td><td>${escapeHtml(i.nombre||"—")}</td><td>${escapeHtml(i.cancion_cena||"—")}</td><td>${escapeHtml(i.artista_cena||"—")}</td><td>${spotifyLinkHtml(i.cancion_cena,i.artista_cena,"Spotify cena")}</td><td>${escapeHtml(i.cancion_baile||"—")}</td><td>${escapeHtml(i.artista_baile||"—")}</td><td>${spotifyLinkHtml(i.cancion_baile,i.artista_baile,"Spotify baile")}</td><td><button type="button" class="danger-link" data-delete-music="${i.id}">Eliminar</button></td></tr>`).join("");musicCards.innerHTML=musicSuggestions.map(i=>`<article class="guest-card"><h2>${escapeHtml(i.nombre||"Sin nombre")}</h2><dl><dt>Fecha</dt><dd>${formatDate(i.created_at)}</dd><dt>Cena</dt><dd>${escapeHtml(i.cancion_cena||"—")}${i.artista_cena?` — ${escapeHtml(i.artista_cena)}`:""}</dd><dt>Baile</dt><dd>${escapeHtml(i.cancion_baile||"—")}${i.artista_baile?` — ${escapeHtml(i.artista_baile)}`:""}</dd></dl><div class="music-card-links">${i.cancion_cena?spotifyLinkHtml(i.cancion_cena,i.artista_cena,"Cena en Spotify"):""}${i.cancion_baile?spotifyLinkHtml(i.cancion_baile,i.artista_baile,"Baile en Spotify"):""}</div><button type="button" class="danger-link" data-delete-music="${i.id}">Eliminar sugerencia</button></article>`).join("");musicAdminMessage.textContent=musicSuggestions.length?`${musicSuggestions.length} sugerencia${musicSuggestions.length===1?"":"s"} musical${musicSuggestions.length===1?"":"es"}.`:"Todavía no hay sugerencias musicales.";updateMusicStats();renderMusicRanking();renderArtistRanking();}
async function loadMusicSuggestions(){musicAdminMessage.textContent="Cargando canciones…";try{musicSuggestions=await api("/rest/v1/sugerencias_musicales_v42?select=*&order=created_at.desc");renderMusicSuggestions();}catch(e){musicAdminMessage.textContent=`No se pudieron cargar las canciones: ${e.message}`;}}
async function deleteMusicSuggestion(id){if(!confirm("¿Quieres eliminar esta sugerencia musical?"))return;try{await api(`/rest/v1/sugerencias_musicales_v42?id=eq.${encodeURIComponent(id)}`,{method:"DELETE",headers:{Prefer:"return=minimal"}});await loadMusicSuggestions();}catch(e){musicAdminMessage.textContent=`No se pudo eliminar la sugerencia: ${e.message}`;}}
function handleMusicAction(e){const b=e.target.closest("[data-delete-music]");if(b)deleteMusicSuggestion(b.dataset.deleteMusic);}
function csvEscapeMusic(v){const t=String(v??"");return `"${t.replaceAll('"','""')}"`;}
function exportMusicCsv(){const h=["Fecha","Invitado","Canción cena","Artista cena","Spotify cena","Canción baile","Artista baile","Spotify baile"],lines=[h.map(csvEscapeMusic).join(","),...musicSuggestions.map(i=>[i.created_at,i.nombre,i.cancion_cena,i.artista_cena,spotifySearchUrl(i.cancion_cena,i.artista_cena),i.cancion_baile,i.artista_baile,spotifySearchUrl(i.cancion_baile,i.artista_baile)].map(csvEscapeMusic).join(","))],blob=new Blob(["\ufeff"+lines.join("\n")],{type:"text/csv;charset=utf-8"}),url=URL.createObjectURL(blob),a=document.createElement("a");a.href=url;a.download="banda-sonora-david-raquel-con-spotify.csv";a.click();URL.revokeObjectURL(url);}
refreshMusicButton?.addEventListener("click",loadMusicSuggestions);openDinnerSpotifyButton?.addEventListener("click",()=>openSpotifySearches("dinner"));openDanceSpotifyButton?.addEventListener("click",()=>openSpotifySearches("dance"));exportMusicButton?.addEventListener("click",exportMusicCsv);musicTableBody?.addEventListener("click",handleMusicAction);musicCards?.addEventListener("click",handleMusicAction);
window.addEventListener("load",()=>window.setTimeout(()=>{if(!byId("dashboard")?.hidden)loadMusicSuggestions();},900));
