const SHEET_NAME = "Custom Orders";
const ADMIN_KEY_PROPERTY = "ADMIN_KEY";

const HEADERS = [
  "id",
  "submittedAt",
  "status",
  "Full Name",
  "Email Address",
  "Phone Number",
  "Preferred Contact Method",
  "Project Description",
  "Preferred Font Name or Number",
  "Requested Completion Date",
  "Rush Order",
  "Inspiration Links",
  "Acknowledgement",
  "Notes"
];

function doPost(event) {
  const sheet = getSheet();
  const payload = parsePayload(event);
  const id = payload.id || Utilities.getUuid();
  const submittedAt = payload.submittedAt || new Date().toISOString();

  sheet.appendRow(HEADERS.map((header) => {
    if (header === "id") return id;
    if (header === "submittedAt") return submittedAt;
    if (header === "status") return payload.status || "New";
    if (header === "Notes") return payload.notes || "";
    return payload[header] || "";
  }));

  return jsonResponse({ ok: true, id });
}

function doGet(event) {
  const params = event.parameter || {};
  const callback = params.callback;

  if (params.action !== "list") {
    return jsonResponse({ ok: false, error: "Unknown action" }, callback);
  }

  if (!isAuthorized(params.key)) {
    return jsonResponse({ ok: false, error: "Unauthorized" }, callback);
  }

  const sheet = getSheet();
  const values = sheet.getDataRange().getValues();
  const headers = values.shift() || [];
  const rows = values
    .filter((row) => row.some((value) => value !== ""))
    .map((row) => headers.reduce((entry, header, index) => {
      entry[header] = row[index] instanceof Date ? row[index].toISOString() : row[index];
      return entry;
    }, {}))
    .reverse();

  return jsonResponse({ ok: true, responses: rows }, callback);
}

function getSheet() {
  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = spreadsheet.getSheetByName(SHEET_NAME);

  if (!sheet) {
    sheet = spreadsheet.insertSheet(SHEET_NAME);
  }

  const firstRow = sheet.getRange(1, 1, 1, HEADERS.length).getValues()[0];
  const needsHeaders = firstRow.every((cell) => cell === "");

  if (needsHeaders) {
    sheet.getRange(1, 1, 1, HEADERS.length).setValues([HEADERS]);
    sheet.setFrozenRows(1);
  }

  return sheet;
}

function parsePayload(event) {
  if (!event || !event.postData || !event.postData.contents) {
    return {};
  }

  try {
    return JSON.parse(event.postData.contents);
  } catch (error) {
    return event.parameter || {};
  }
}

function isAuthorized(key) {
  const storedKey = PropertiesService.getScriptProperties().getProperty(ADMIN_KEY_PROPERTY);
  return Boolean(storedKey && key && key === storedKey);
}

function jsonResponse(data, callback) {
  const output = callback
    ? `${callback}(${JSON.stringify(data)});`
    : JSON.stringify(data);

  return ContentService
    .createTextOutput(output)
    .setMimeType(callback ? ContentService.MimeType.JAVASCRIPT : ContentService.MimeType.JSON);
}
