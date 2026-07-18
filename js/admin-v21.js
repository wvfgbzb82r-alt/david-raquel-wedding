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
  const headers = { apikey: CONFIG.key, "Content-Type": "application/json", ...(options.headers || {}) };
  if (session?.access_token) headers.Authorization = `Bearer ${session.access_token}`;
  let response;
  try { response = await fetch(`${CONFIG.url}${path}`, { ...options, headers }); }
  catch { throw new Error("No se pudo conectar con Supabase. Comprueba la conexión a Internet."); }
  let data = null;
  try { data = await response.json(); } catch { data = null; }
  if (!response.ok) throw new Error(data?.error_description || data?.msg || data?.message || `Error ${response.status}`);
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

function filteredGuests() {
  const query = normalize(searchInput.value);
  const filter = attendanceFilter.value;
  return guests.filter(guest => {
    const searchable = normalize([guest.nombre, guest.telefono, guest.asistencia, guest.acompanante, guest.alergias, guest.comentarios].join(" "));
    return (!query || searchable.includes(query)) && (!filter || attendanceCategory(guest.asistencia) === filter);
  });
}

function updateStats() {
  const attending = guests.filter(g => attendanceCategory(g.asistencia) === "yes");
  byId("statTotal").textContent = guests.length;
  byId("statYes").textContent = attending.length;
  byId("statNo").textContent = guests.filter(g => attendanceCategory(g.asistencia) === "no").length;
  byId("statPeople").textContent = attending.reduce((sum, guest) => sum + 1 + (normalize(guest.acompanante) ? 1 : 0), 0);
  byId("statAllergies").textContent = guests.filter(g => normalize(g.alergias)).length;
}

function statusPill(value) {
  const category = attendanceCategory(value);
  return `<span class="status ${category}">${escapeHtml(value || "Sin indicar")}</span>`;
}

function renderGuests() {
  const rows = filteredGuests();
  tableBody.innerHTML = rows.map(g => `<tr><td>${formatDate(g.created_at)}</td><td>${escapeHtml(g.nombre || "—")}</td><td>${escapeHtml(g.telefono || "—")}</td><td>${statusPill(g.asistencia)}</td><td>${escapeHtml(g.acompanante || "—")}</td><td>${escapeHtml(g.alergias || "—")}</td><td>${escapeHtml(g.comentarios || "—")}</td></tr>`).join("");
  cards.innerHTML = rows.map(g => `<article class="guest-card"><h2>${escapeHtml(g.nombre || "Sin nombre")}</h2>${statusPill(g.asistencia)}<dl><dt>Fecha</dt><dd>${formatDate(g.created_at)}</dd><dt>Teléfono</dt><dd>${escapeHtml(g.telefono || "—")}</dd><dt>Acompañante</dt><dd>${escapeHtml(g.acompanante || "—")}</dd><dt>Alergias</dt><dd>${escapeHtml(g.alergias || "—")}</dd><dt>Comentarios</dt><dd>${escapeHtml(g.comentarios || "—")}</dd></dl></article>`).join("");
  dashboardMessage.textContent = rows.length ? `${rows.length} respuesta${rows.length === 1 ? "" : "s"} mostrada${rows.length === 1 ? "" : "s"}.` : "No hay resultados.";
}

async function loadGuests(allowRetry = true) {
  dashboardMessage.textContent = "Cargando respuestas…";
  try {
    guests = await api("/rest/v1/invitados?select=*&order=created_at.desc");
    updateStats();
    renderGuests();
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
  const headers = ["Fecha", "Nombre", "Teléfono", "Asistencia", "Acompañante", "Alergias", "Comentarios"];
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

// V22 · Álbum privado
const MEDIA_BUCKET = "wedding-media";
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
    mediaItems = await api("/rest/v1/media_uploads?select=*&order=created_at.desc&limit=200");
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
      cardsHtml.push(`<article class="media-card"><div class="media-preview">${preview}</div><div class="media-card__body"><h3 title="${escapeHtml(item.original_name)}">${escapeHtml(item.original_name)}</h3><p>${escapeHtml(item.uploader_name || "Remitente sin indicar")}</p><p>${formatDate(item.created_at)} · ${humanMediaSize(item.size_bytes)}</p>${url ? `<a href="${url}" download target="_blank" rel="noopener">Abrir / descargar</a>` : ""}</div></article>`);
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
