const DESIGN_SHEET_NAME = "Custom Orders";
const COMPLETED_DESIGN_SHEET_NAME = "Completed Custom Orders";
const PEPTIDE_SHEET_NAME = "Peptide Orders";
const ADMIN_KEY_PROPERTY = "ADMIN_KEY";
const COMPLETE_STATUSES = ["complete", "completed"];

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

function onEdit(event) {
  moveCompletedCustomOrder(event);
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

function moveCompletedCustomOrder(event) {
  if (!event || !event.range) {
    return;
  }

  const sheet = event.range.getSheet();

  if (sheet.getName() !== DESIGN_SHEET_NAME || event.range.getRow() === 1) {
    return;
  }

  const statusColumn = getHeaderColumn(sheet, "status");

  if (event.range.getColumn() !== statusColumn) {
    return;
  }

  const status = String(event.value || event.range.getValue() || "").trim().toLowerCase();

  if (COMPLETE_STATUSES.indexOf(status) === -1) {
    return;
  }

  const completedSheet = getSheet(COMPLETED_DESIGN_SHEET_NAME, DESIGN_HEADERS);
  const row = event.range.getRow();
  const rowValues = sheet.getRange(row, 1, 1, DESIGN_HEADERS.length).getValues()[0];

  completedSheet.appendRow(rowValues);
  completedSheet.getRange(completedSheet.getLastRow(), 1, 1, DESIGN_HEADERS.length).setVerticalAlignment("top");
  sheet.deleteRow(row);
}

function getHeaderColumn(sheet, headerName) {
  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  const index = headers.indexOf(headerName);

  if (index === -1) {
    throw new Error(`The "${headerName}" column could not be found on the ${sheet.getName()} sheet.`);
  }

  return index + 1;
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
