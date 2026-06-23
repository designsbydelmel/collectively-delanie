const DESIGN_SHEET_NAME = "Custom Orders";
const PEPTIDE_SHEET_NAME = "Peptide Orders";
const ADMIN_KEY_PROPERTY = "ADMIN_KEY";

const DESIGN_HEADERS = [
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

const PEPTIDE_HEADERS = [
  "id",
  "submittedAt",
  "status",
  "Order Type",
  "Full Name",
  "Phone Number",
  "Preferred Contact Method",
  "Peptides",
  "Goals or Questions",
  "Notes"
];

function doPost(event) {
  const payload = parsePayload(event);
  const orderConfig = getOrderConfig(payload);
  const sheet = getSheet(orderConfig.sheetName, orderConfig.headers);
  const id = payload.id || Utilities.getUuid();
  const submittedAt = payload.submittedAt || new Date().toISOString();

  sheet.appendRow(orderConfig.headers.map((header) => {
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

  const orderConfig = params.type === "peptide"
    ? { sheetName: PEPTIDE_SHEET_NAME, headers: PEPTIDE_HEADERS }
    : { sheetName: DESIGN_SHEET_NAME, headers: DESIGN_HEADERS };
  const sheet = getSheet(orderConfig.sheetName, orderConfig.headers);
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

function getSheet(sheetName, headers) {
  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = spreadsheet.getSheetByName(sheetName);

  if (!sheet) {
    sheet = spreadsheet.insertSheet(sheetName);
  }

  const firstRow = sheet.getRange(1, 1, 1, headers.length).getValues()[0];
  const needsHeaders = firstRow.every((cell) => cell === "");

  if (needsHeaders) {
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    sheet.setFrozenRows(1);
  }

  return sheet;
}

function getOrderConfig(payload) {
  if (payload["Order Type"] === "Peptide Order") {
    return {
      sheetName: PEPTIDE_SHEET_NAME,
      headers: PEPTIDE_HEADERS
    };
  }

  return {
    sheetName: DESIGN_SHEET_NAME,
    headers: DESIGN_HEADERS
  };
}

function parsePayload(event) {
  if (!event || !event.postData || !event.postData.contents) {
    return normalizeParameters(event && event.parameters ? event.parameters : {});
  }

  try {
    return JSON.parse(event.postData.contents);
  } catch (error) {
    return normalizeParameters(event.parameters || event.parameter || {});
  }
}

function normalizeParameters(parameters) {
  return Object.keys(parameters).reduce((payload, key) => {
    const normalizedKey = key.replace(/\[\]$/, "");
    const value = parameters[key];

    payload[normalizedKey] = Array.isArray(value) ? value.join(", ") : value;
    return payload;
  }, {});
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
