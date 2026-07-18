const SUPABASE_URL = "https://impauxkdtcwngvlknysa.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_TN0nnQZ_g6l1RNTuE4f9qg_iaI_USWV";
const ADMIN_EMAIL = "davidn6783@gmail.com";

const db = supabase.createClient(
  SUPABASE_URL,
  SUPABASE_PUBLISHABLE_KEY
);

const login = document.getElementById("login");
const dashboard = document.getElementById("dash");
const loginForm = document.getElementById("loginForm");
const codeInput = document.getElementById("code");
const loginMessage = document.getElementById("loginMsg");
const dashboardMessage = document.getElementById("msg");
const tableBody = document.getElementById("tbody");
const cards = document.getElementById("cards");
const searchInput = document.getElementById("search");
const attendanceFilter = document.getElementById("filter");

const totalStat = document.getElementById("sTotal");
const yesStat = document.getElementById("sYes");
const noStat = document.getElementById("sNo");
const peopleStat = document.getElementById("sPeople");
const allergiesStat = document.getElementById("sAllergies");

const logoutButton = document.getElementById("logout");
const refreshButton = document.getElementById("refresh");
const exportButton = document.getElementById("export");

let guests = [];

function normalize(value) {
  return String(value || "").trim().toLowerCase();
}

function isYes(value) {
  const text = normalize(value);
  return ["sí", "si", "yes"].includes(text) || text.includes("allí estaré");
}

function isNo(value) {
  const text = normalize(value);
  return text === "no" || text.includes("no podré");
}

function formatDate(value) {
  if (!value) return "—";

  return new Intl.DateTimeFormat("es-ES", {
    dateStyle: "short",
    timeStyle: "short"
  }).format(new Date(value));
}

function filteredGuests() {
  const query = normalize(searchInput.value);
  const filter = attendanceFilter.value;

  return guests.filter(guest => {
    const searchableText = normalize([
      guest.nombre,
      guest.telefono,
      guest.asistencia,
      guest.acompanante,
      guest.alergias,
      guest.comentarios
    ].join(" "));

    const matchesSearch = !query || searchableText.includes(query);
    const matchesFilter =
      !filter ||
      (filter === "si" && isYes(guest.asistencia)) ||
      (filter === "no" && isNo(guest.asistencia));

    return matchesSearch && matchesFilter;
  });
}

function updateStats() {
  const attending = guests.filter(guest => isYes(guest.asistencia));
  const notAttending = guests.filter(guest => isNo(guest.asistencia));

  totalStat.textContent = guests.length;
  yesStat.textContent = attending.length;
  noStat.textContent = notAttending.length;
  peopleStat.textContent = attending.reduce(
    (total, guest) => total + 1 + (guest.acompanante ? 1 : 0),
    0
  );
  allergiesStat.textContent = guests.filter(
    guest => normalize(guest.alergias)
  ).length;
}

function renderGuests() {
  const rows = filteredGuests();

  tableBody.innerHTML = rows.map(guest => `
    <tr>
      <td>${formatDate(guest.created_at)}</td>
      <td>${guest.nombre || "—"}</td>
      <td>${guest.telefono || "—"}</td>
      <td>${guest.asistencia || "—"}</td>
      <td>${guest.acompanante || "—"}</td>
      <td>${guest.alergias || "—"}</td>
      <td>${guest.comentarios || "—"}</td>
    </tr>
  `).join("");

  cards.innerHTML = rows.map(guest => `
    <article class="guest">
      <h2>${guest.nombre || "Sin nombre"}</h2>
      <p>${guest.asistencia || "—"}</p>
      <p><b>Teléfono:</b> ${guest.telefono || "—"}</p>
      <p><b>Acompañante:</b> ${guest.acompanante || "—"}</p>
      <p><b>Alergias:</b> ${guest.alergias || "—"}</p>
      <p><b>Comentarios:</b> ${guest.comentarios || "—"}</p>
    </article>
  `).join("");

  dashboardMessage.textContent =
    `${rows.length} respuesta${rows.length === 1 ? "" : "s"} mostrada${rows.length === 1 ? "" : "s"}.`;
}

async function loadGuests() {
  dashboardMessage.textContent = "Cargando respuestas…";

  const { data, error } = await db
    .from("invitados")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error al cargar invitados:", error);
    dashboardMessage.textContent =
      "No se pudieron cargar las respuestas. Revisa la política RLS.";
    return;
  }

  guests = data || [];
  updateStats();
  renderGuests();
}

function showDashboard() {
  login.hidden = true;
  dashboard.hidden = false;
  loadGuests();
}

function showLogin() {
  dashboard.hidden = true;
  login.hidden = false;
}

loginForm.addEventListener("submit", async event => {
  event.preventDefault();

  if (!codeInput.value) {
    loginMessage.textContent = "Escribe vuestro código.";
    return;
  }

  loginMessage.textContent = "Comprobando acceso…";

  const { error } = await db.auth.signInWithPassword({
    email: ADMIN_EMAIL,
    password: codeInput.value
  });

  if (error) {
    console.error("Error de acceso:", error);
    loginMessage.textContent =
      error.message === "Email not confirmed"
        ? "El usuario todavía no está confirmado en Supabase."
        : "Código incorrecto.";
    codeInput.select();
    return;
  }

  loginMessage.textContent = "";
  codeInput.value = "";
  showDashboard();
});

logoutButton.addEventListener("click", async () => {
  await db.auth.signOut();
  showLogin();
});

refreshButton.addEventListener("click", loadGuests);
searchInput.addEventListener("input", renderGuests);
attendanceFilter.addEventListener("change", renderGuests);

exportButton.addEventListener("click", () => {
  const rows = filteredGuests().map(guest => [
    formatDate(guest.created_at),
    guest.nombre || "",
    guest.telefono || "",
    guest.asistencia || "",
    guest.acompanante || "",
    guest.alergias || "",
    guest.comentarios || ""
  ]);

  const csv = [
    ["Fecha", "Nombre", "Teléfono", "Asistencia", "Acompañante", "Alergias", "Comentarios"],
    ...rows
  ]
    .map(row =>
      row.map(value =>
        `"${String(value).replaceAll('"', '""')}"`
      ).join(";")
    )
    .join("\n");

  const blob = new Blob(
    ["\ufeff" + csv],
    { type: "text/csv;charset=utf-8" }
  );

  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "confirmaciones.csv";
  link.click();
  URL.revokeObjectURL(url);
});

db.auth.getSession().then(({ data }) => {
  if (data.session) {
    showDashboard();
  } else {
    showLogin();
  }
}).catch(error => {
  console.error("Error al comprobar la sesión:", error);
  loginMessage.textContent = "No se pudo iniciar el panel.";
});
