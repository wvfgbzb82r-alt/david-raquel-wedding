const SHEET_NAME = "Hoja 1";

function doPost(e) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAME);

  if (!sheet) {
    return ContentService
      .createTextOutput(JSON.stringify({ ok: false, error: "No se encontró la hoja" }))
      .setMimeType(ContentService.MimeType.JSON);
  }

  const data = e.parameter;

  sheet.appendRow([
    new Date(),
    data.nombre || "",
    data.asistencia || "",
    data.acompanante || "",
    data.alergias || "",
    data.comentarios || "",
    data.fecha_envio || ""
  ]);

  return ContentService
    .createTextOutput(JSON.stringify({ ok: true }))
    .setMimeType(ContentService.MimeType.JSON);
}
