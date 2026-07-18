"use strict";

const CONFIG = Object.freeze({
  url: "https://impauxkdtcwngvlknysa.supabase.co",
  key: "sb_publishable_TN0nnQZ_g6l1RNTuE4f9qg_iaI_USWV",
  bucket: "wedding-media-v24",
  maxFileBytes: 100 * 1024 * 1024,
  maxFiles: 50
});

const byId = id => document.getElementById(id);
const form = byId("uploadForm");
const input = byId("mediaFiles");
const dropZone = byId("dropZone");
const selection = byId("selection");
const summary = byId("selectionSummary");
const fileList = byId("fileList");
const clearButton = byId("clearButton");
const uploadButton = byId("uploadButton");
const message = byId("uploadMessage");
const progressWrap = byId("progressWrap");
const progressBar = byId("progressBar");
const progressText = byId("progressText");
const uploaderName = byId("uploaderName");

let files = [];

function humanSize(bytes) {
  const units = ["B", "KB", "MB", "GB"];
  let value = bytes;
  let index = 0;
  while (value >= 1024 && index < units.length - 1) {
    value /= 1024;
    index += 1;
  }
  return `${value.toFixed(index ? 1 : 0)} ${units[index]}`;
}

function safeName(name) {
  return name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9._-]+/g, "-")
    .replace(/-+/g, "-")
    .slice(-120);
}

function accepted(file) {
  return file.type.startsWith("image/") ||
    file.type === "video/mp4" ||
    file.type === "video/quicktime";
}

function setMessage(text, error = false) {
  message.textContent = text;
  message.classList.toggle("is-error", error);
}

function setFiles(nextFiles) {
  const candidates = Array.from(nextFiles).slice(0, CONFIG.maxFiles);
  const invalid = candidates.filter(
    file => !accepted(file) || file.size > CONFIG.maxFileBytes
  );

  files = candidates.filter(
    file => accepted(file) && file.size <= CONFIG.maxFileBytes
  );

  selection.hidden = files.length === 0;
  uploadButton.disabled = files.length === 0;
  summary.textContent = files.length
    ? `${files.length} archivo${files.length === 1 ? "" : "s"} · ${humanSize(files.reduce((total, file) => total + file.size, 0))}`
    : "";
  fileList.innerHTML = files
    .map(file => `<li>${file.name} · ${humanSize(file.size)}</li>`)
    .join("");

  if (invalid.length) {
    setMessage(
      `${invalid.length} archivo${invalid.length === 1 ? "" : "s"} no se añadieron por formato o tamaño.`,
      true
    );
  } else {
    setMessage("");
  }
}

input.addEventListener("change", () => setFiles(input.files));
clearButton.addEventListener("click", () => {
  input.value = "";
  setFiles([]);
});

["dragenter", "dragover"].forEach(type => {
  dropZone.addEventListener(type, event => {
    event.preventDefault();
    dropZone.classList.add("is-dragging");
  });
});

["dragleave", "drop"].forEach(type => {
  dropZone.addEventListener(type, event => {
    event.preventDefault();
    dropZone.classList.remove("is-dragging");
  });
});

dropZone.addEventListener("drop", event => setFiles(event.dataTransfer.files));

async function uploadFile(file, path) {
  const response = await fetch(
    `${CONFIG.url}/storage/v1/object/${CONFIG.bucket}/${path}`,
    {
      method: "POST",
      headers: {
        apikey: CONFIG.key,
        Authorization: `Bearer ${CONFIG.key}`,
        "Content-Type": file.type || "application/octet-stream",
        "x-upsert": "false"
      },
      body: file
    }
  );

  let data = null;
  try { data = await response.json(); } catch { data = null; }

  if (!response.ok) {
    throw new Error(data?.message || data?.error || `Error ${response.status}`);
  }

  return data;
}

async function saveMetadata(file, path) {
  const response = await fetch(`${CONFIG.url}/rest/v1/media_uploads_v24`, {
    method: "POST",
    headers: {
      apikey: CONFIG.key,
      Authorization: `Bearer ${CONFIG.key}`,
      "Content-Type": "application/json",
      Prefer: "return=minimal"
    },
    body: JSON.stringify({
      object_path: path,
      uploader_name: uploaderName.value.trim() || null,
      original_name: file.name,
      mime_type: file.type || null,
      size_bytes: file.size
    })
  });

  if (!response.ok) {
    console.warn("El archivo se subió, pero no se pudo guardar su ficha.", await response.text());
  }
}

form.addEventListener("submit", async event => {
  event.preventDefault();
  if (!files.length) return;

  const selectedFiles = [...files];
  uploadButton.disabled = true;
  input.disabled = true;
  progressWrap.hidden = false;
  progressBar.style.width = "0%";
  setMessage("");

  let completed = 0;

  try {
    for (const file of selectedFiles) {
      progressText.textContent =
        `Subiendo ${completed + 1} de ${selectedFiles.length}: ${file.name}`;

      const day = new Date().toISOString().slice(0, 10);
      const id = crypto.randomUUID
        ? crypto.randomUUID()
        : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
      const path =
        `uploads/${day}/${Date.now()}-${id}-${safeName(file.name)}`;

      await uploadFile(file, path);
      await saveMetadata(file, path);

      completed += 1;
      progressBar.style.width =
        `${Math.round((completed / selectedFiles.length) * 100)}%`;
    }

    setMessage("¡Muchas gracias! Hemos recibido vuestros recuerdos. ❤️");
    progressText.textContent = "Subida completada";
    input.value = "";
    files = [];
    selection.hidden = true;
  } catch (error) {
    console.error(error);
    const missingBucket = /bucket not found/i.test(error.message);
    setMessage(
      missingBucket
        ? "El álbum todavía no está activado. Ejecuta INSTALACION-UNICA-SUPABASE.sql en Supabase."
        : `No se pudo completar la subida: ${error.message}`,
      true
    );
    progressText.textContent =
      `Se subieron ${completed} de ${selectedFiles.length} archivos.`;
  } finally {
    input.disabled = false;
    uploadButton.disabled = files.length === 0;
  }
});
