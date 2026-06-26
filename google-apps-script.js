const DESIGN_SHEET_NAME = "Custom Orders";
const COMPLETED_DESIGN_SHEET_NAME = "Completed Custom Orders";
const PEPTIDE_SHEET_NAME = "Peptide Orders";
const INSPIRATION_PHOTO_FOLDER_ID = "1g28tfoPda3M8o-2rxsNOhGdBjNYZhshQ";
const ADMIN_KEY_PROPERTY = "ADMIN_KEY";
const COMPLETE_STATUSES = ["complete", "completed"];

const DESIGN_HEADERS = [
  "id",
  "Date",
  "Status",
  "Name",
  "Email",
  "Phone Number",
  "Method",
  "Description",
  "Font",
  "Due By",
  "Rush",
  "Photos",
  "Links",
  "Acknowledgement",
  "Notes"
];

const DESIGN_HEADER_RENAMES = {
  "submittedAt": "Date",
  "status": "Status",
  "Full Name": "Name",
  "Email Address": "Email",
  "Preferred Contact Method": "Method",
  "Project Description": "Description",
  "Preferred Font Name or Number": "Font",
  "Requested Completion Date": "Due By",
  "Rush Order": "Rush",
  "Inspiration Photos": "Photos",
  "Inspiration Links": "Links"
};

const DESIGN_HEADER_SOURCES = {
  "Name": "Full Name",
  "Email": "Email Address",
  "Method": "Preferred Contact Method",
  "Description": "Project Description",
  "Font": "Preferred Font Name or Number",
  "Due By": "Requested Completion Date",
  "Rush": "Rush Order",
  "Photos": "Inspiration Photos",
  "Links": "Inspiration Links"
};

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
  const photoLinks = saveUploadedPhotosSafely(payload["Inspiration Photos"], id);
  const enrichedPayload = Object.assign({}, payload, {
    "Inspiration Photos": photoLinks,
    "Photos": photoLinks
  });

  sheet.appendRow(orderConfig.headers.map((header) => {
    if (header === "id") return id;
    if (header === "Date") return submittedAt;
    if (header === "Status") return enrichedPayload.status || enrichedPayload.Status || "New";
    if (header === "Notes") return enrichedPayload.notes || "";
    return getPayloadValue(enrichedPayload, header);
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

function authorizeDriveAccess() {
  const folder = DriveApp.getFolderById(INSPIRATION_PHOTO_FOLDER_ID);
  const file = folder.createFile(
    "collectively-delanie-drive-authorization-test.txt",
    "This temporary file confirms Apps Script can save custom order photos."
  );

  file.setTrashed(true);
}

function onEdit(event) {
  moveCompletedCustomOrder(event);
}

function installCompletedOrderTrigger() {
  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  const triggers = ScriptApp.getProjectTriggers();

  triggers.forEach((trigger) => {
    if (trigger.getHandlerFunction() === "moveCompletedCustomOrder") {
      ScriptApp.deleteTrigger(trigger);
    }
  });

  ScriptApp.newTrigger("moveCompletedCustomOrder")
    .forSpreadsheet(spreadsheet)
    .onEdit()
    .create();
}

function moveCompletedOrdersNow() {
  const sheet = getSheet(DESIGN_SHEET_NAME, DESIGN_HEADERS);
  const statusColumn = getHeaderColumn(sheet, "Status");
  const lastRow = sheet.getLastRow();

  for (let row = lastRow; row >= 2; row--) {
    const status = String(sheet.getRange(row, statusColumn).getValue() || "").trim().toLowerCase();

    if (COMPLETE_STATUSES.indexOf(status) !== -1) {
      moveCompletedCustomOrderRow(sheet, row);
    }
  }
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
  } else {
    ensureHeaders(sheet, headers);
  }

  return sheet;
}

function ensureHeaders(sheet, headers) {
  if (headers === DESIGN_HEADERS) {
    renameHeaders(sheet);
  }

  const existingHeaders = sheet.getRange(1, 1, 1, Math.max(sheet.getLastColumn(), 1)).getValues()[0];
  const missingHeaders = headers.filter((header) => existingHeaders.indexOf(header) === -1);

  if (missingHeaders.length) {
    sheet.getRange(1, existingHeaders.length + 1, 1, missingHeaders.length).setValues([missingHeaders]);
  }
}

function renameHeaders(sheet) {
  if (sheet.getLastRow() === 0) {
    return;
  }

  const lastColumn = Math.max(sheet.getLastColumn(), 1);
  const headerRange = sheet.getRange(1, 1, 1, lastColumn);
  const headers = headerRange.getValues()[0];
  let changed = false;
  const renamedHeaders = headers.map((header) => {
    if (DESIGN_HEADER_RENAMES[header]) {
      changed = true;
      return DESIGN_HEADER_RENAMES[header];
    }

    return header;
  });

  if (changed) {
    headerRange.setValues([renamedHeaders]);
  }
}

function moveCompletedCustomOrder(event) {
  if (!event || !event.range) {
    return;
  }

  const sheet = event.range.getSheet();

  if (sheet.getName() !== DESIGN_SHEET_NAME || event.range.getRow() === 1) {
    return;
  }

  const statusColumn = getHeaderColumn(sheet, "Status");

  if (event.range.getColumn() !== statusColumn) {
    return;
  }

  const status = String(event.value || event.range.getValue() || "").trim().toLowerCase();

  if (COMPLETE_STATUSES.indexOf(status) === -1) {
    return;
  }

  moveCompletedCustomOrderRow(sheet, event.range.getRow());
}

function moveCompletedCustomOrderRow(sheet, row) {
  const completedSheet = getSheet(COMPLETED_DESIGN_SHEET_NAME, DESIGN_HEADERS);
  const rowValues = sheet.getRange(row, 1, 1, DESIGN_HEADERS.length).getValues()[0];

  completedSheet.appendRow(rowValues);
  completedSheet.getRange(completedSheet.getLastRow(), 1, 1, DESIGN_HEADERS.length).setVerticalAlignment("top");
  sheet.deleteRow(row);
}

function getPayloadValue(payload, header) {
  const source = DESIGN_HEADER_SOURCES[header] || header;

  return payload[header] || payload[source] || "";
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

function saveUploadedPhotosSafely(photos, orderId) {
  if (!photos) {
    return "";
  }

  try {
    return saveUploadedPhotos(photos, orderId);
  } catch (error) {
    return "Photo upload failed. Run authorizeDriveAccess in Apps Script, then ask customer to resend photo. Error: " + error;
  }
}

function saveUploadedPhotos(photos, orderId) {
  if (!photos) {
    return "";
  }

  const photoList = Array.isArray(photos) ? photos : [photos];
  const folder = DriveApp.getFolderById(INSPIRATION_PHOTO_FOLDER_ID);

  return photoList
    .filter((photo) => photo && photo.data)
    .map((photo, index) => {
      const extension = getExtension(photo.name, photo.type);
      const fileName = `${orderId}-inspiration-${index + 1}${extension}`;
      const bytes = Utilities.base64Decode(photo.data);
      const blob = Utilities.newBlob(bytes, photo.type || "application/octet-stream", fileName);
      const file = folder.createFile(blob);

      file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
      return file.getUrl();
    })
    .join(", ");
}

function getExtension(fileName, mimeType) {
  const match = String(fileName || "").match(/\.[a-z0-9]+$/i);

  if (match) {
    return match[0];
  }

  if (mimeType === "image/png") return ".png";
  if (mimeType === "image/webp") return ".webp";
  if (mimeType === "image/gif") return ".gif";
  return ".jpg";
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
