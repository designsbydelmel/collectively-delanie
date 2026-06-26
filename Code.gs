const DESIGN_SHEET_NAME = "Custom Orders";
const COMPLETED_DESIGN_SHEET_NAME = "Completed Custom Orders";
const PEPTIDE_SHEET_NAME = "Peptide Orders";
const NOTIFICATION_EMAIL = "collectivelydelanie@gmail.com";
const SPREADSHEET_ID = "1-WfsYXSF2_dHFQo8fxnWhNPxtEQNECKC4tmK66BUSh8";
const INSPIRATION_PHOTO_FOLDER_ID = "1g28tfoPda3M8o-2rxsNOhGdBjNYZhshQ";
const REQUESTED_DATE_COLUMN = 9;
const ORDER_STATUS_HEADER = "Status";
const COMPLETE_STATUSES = ["complete", "completed"];

const DESIGN_HEADERS = [
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
  "Quote",
  "Payment Status",
  "Notes"
];

const DESIGN_HEADER_RENAMES = {
  "Date Submitted": "Date",
  "Order Status": "Status",
  "Full Name": "Name",
  "Email Address": "Email",
  "Preferred Contact Method": "Method",
  "Project Description": "Description",
  "Preferred Font Name or Number": "Font",
  "Requested Completion Date": "Due By",
  "Rush Order": "Rush",
  "Inspiration Photos": "Photos",
  "Inspiration Links": "Links",
  "Quote Amount": "Quote",
  "Internal Notes": "Notes"
};

const PEPTIDE_HEADERS = [
  "Date Submitted",
  "Order Status",
  "Full Name",
  "Email Address",
  "Phone Number",
  "Preferred Contact Method",
  "Peptides",
  "Goals or Questions",
  "Internal Notes"
];

function doPost(e) {
  const lock = LockService.getScriptLock();
  lock.waitLock(30000);

  try {
    const data = normalizeSubmission_(e);
    const orderConfig = getOrderConfig_(data);

    if (orderConfig.label === "Custom Order") {
      data["Inspiration Photos"] = saveUploadedPhotosSafely_(data["Inspiration Photos"], data["Full Name"]);
    }

    const sheet = getOrderSheet_(orderConfig);

    sheet.appendRow(orderConfig.toRow(data));
    formatLatestRow_(sheet, orderConfig);

    if (orderConfig.sortByRequestedDate) {
      sortOrdersByRequestedDate_(sheet, orderConfig);
    }

    sendNotification_(data, orderConfig);

    return HtmlService.createHtmlOutput(
      '<script>window.top.location.href="' + orderConfig.thankYouUrl + '";</script>'
    );
  } catch (error) {
    MailApp.sendEmail({
      to: NOTIFICATION_EMAIL,
      subject: "Collectively Delanie Order Tracker Error",
      body: "An order submission could not be saved.\n\nError:\n" + error
    });

    return HtmlService.createHtmlOutput(
      "There was an issue submitting the form. Please email collectivelydelanie@gmail.com."
    );
  } finally {
    lock.releaseLock();
  }
}

function setupOrderSheet() {
  setupSheetIfMissing_(DESIGN_SHEET_NAME, DESIGN_HEADERS);
  setupSheetIfMissing_(COMPLETED_DESIGN_SHEET_NAME, DESIGN_HEADERS);
  setupSheetIfMissing_(PEPTIDE_SHEET_NAME, PEPTIDE_HEADERS);
}

function authorizeDriveAccess() {
  const folder = DriveApp.getFolderById(INSPIRATION_PHOTO_FOLDER_ID);
  const file = folder.createFile(
    "collectively-delanie-drive-authorization-test.txt",
    "This temporary file confirms Apps Script can save custom order photos."
  );

  file.setTrashed(true);
}

function onEdit(e) {
  moveCompletedCustomOrder_(e);
}

function setupCompletedCustomOrdersSheet_() {
  return setupSheetIfMissing_(COMPLETED_DESIGN_SHEET_NAME, DESIGN_HEADERS);
}

function setupPeptideOrderSheet() {
  const orderConfig = getPeptideOrderConfig_();
  const sheet = getOrderSheet_(orderConfig);
  sheet.getRange(1, 1, 1, PEPTIDE_HEADERS.length).setValues([PEPTIDE_HEADERS]);
  sheet.setFrozenRows(1);
  sheet.getRange(1, 1, 1, PEPTIDE_HEADERS.length)
    .setFontWeight("bold")
    .setBackground("#f7f2ed")
    .setFontColor("#332c2f");
  sheet.autoResizeColumns(1, PEPTIDE_HEADERS.length);
  sheet.getRange("B:B").setDataValidation(
    SpreadsheetApp.newDataValidation()
      .requireValueInList(["New", "Contacted", "Reviewed", "Followed Up", "Complete", "Cancelled"], true)
      .build()
  );
}

function setupSheetIfMissing_(sheetName, headers) {
  const spreadsheet = getSpreadsheet_();
  let sheet = spreadsheet.getSheetByName(sheetName);

  if (sheet) {
    ensureHeaders_(sheet, headers);
    return sheet;
  }

  sheet = spreadsheet.insertSheet(sheetName);
  sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
  sheet.setFrozenRows(1);
  sheet.getRange(1, 1, 1, headers.length)
    .setFontWeight("bold")
    .setBackground("#f7f2ed")
    .setFontColor("#332c2f");
  sheet.autoResizeColumns(1, headers.length);

  return sheet;
}

function sortExistingOrdersByRequestedDate() {
  sortOrdersByRequestedDate_(getOrderSheet_(getDesignOrderConfig_()), getDesignOrderConfig_());
}

function getOrderSheet_(orderConfig) {
  const spreadsheet = getSpreadsheet_();
  let sheet = spreadsheet.getSheetByName(orderConfig.sheetName);

  if (!sheet) {
    sheet = spreadsheet.insertSheet(orderConfig.sheetName);
  }

  if (sheet.getLastRow() === 0) {
    sheet.appendRow(orderConfig.headers);
    sheet.setFrozenRows(1);
  } else {
    ensureHeaders_(sheet, orderConfig.headers);
  }

  return sheet;
}

function ensureHeaders_(sheet, headers) {
  if (headers === DESIGN_HEADERS) {
    renameHeaders_(sheet);
  }

  const existingHeaders = sheet.getRange(1, 1, 1, Math.max(sheet.getLastColumn(), 1)).getValues()[0];
  const missingHeaders = headers.filter(function(header) {
    return existingHeaders.indexOf(header) === -1;
  });

  if (missingHeaders.length) {
    sheet.getRange(1, existingHeaders.length + 1, 1, missingHeaders.length).setValues([missingHeaders]);
    sheet.autoResizeColumns(1, existingHeaders.length + missingHeaders.length);
  }
}

function renameHeaders_(sheet) {
  if (sheet.getLastRow() === 0) {
    return;
  }

  const lastColumn = Math.max(sheet.getLastColumn(), 1);
  const headerRange = sheet.getRange(1, 1, 1, lastColumn);
  const headers = headerRange.getValues()[0];
  let changed = false;

  const renamedHeaders = headers.map(function(header) {
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

function moveCompletedCustomOrder_(e) {
  if (!e || !e.range) {
    return;
  }

  const sheet = e.range.getSheet();

  if (sheet.getName() !== DESIGN_SHEET_NAME || e.range.getRow() === 1) {
    return;
  }

  const statusColumn = getHeaderColumn_(sheet, ORDER_STATUS_HEADER);

  if (e.range.getColumn() !== statusColumn) {
    return;
  }

  const status = String(e.value || e.range.getValue() || "").trim().toLowerCase();

  if (COMPLETE_STATUSES.indexOf(status) === -1) {
    return;
  }

  const completedSheet = setupCompletedCustomOrdersSheet_();
  const row = e.range.getRow();
  const rowValues = sheet.getRange(row, 1, 1, DESIGN_HEADERS.length).getValues()[0];

  completedSheet.appendRow(rowValues);
  completedSheet.getRange(completedSheet.getLastRow(), 1, 1, DESIGN_HEADERS.length).setVerticalAlignment("top");
  completedSheet.autoResizeColumns(1, DESIGN_HEADERS.length);
  sheet.deleteRow(row);
}

function getHeaderColumn_(sheet, headerName) {
  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  const index = headers.indexOf(headerName);

  if (index === -1) {
    throw new Error('The "' + headerName + '" column could not be found on the ' + sheet.getName() + " sheet.");
  }

  return index + 1;
}

function getSpreadsheet_() {
  if (SPREADSHEET_ID && SPREADSHEET_ID !== "PASTE_YOUR_GOOGLE_SHEET_ID_HERE") {
    return SpreadsheetApp.openById(SPREADSHEET_ID);
  }

  const activeSpreadsheet = SpreadsheetApp.getActiveSpreadsheet();

  if (!activeSpreadsheet) {
    throw new Error("No spreadsheet is attached. Paste your Google Sheet ID into SPREADSHEET_ID at the top of Code.gs.");
  }

  return activeSpreadsheet;
}

function normalizeSubmission_(e) {
  const jsonData = parseJsonSubmission_(e);

  if (jsonData) {
    return {
      "Order Type": jsonData["Order Type"] || "",
      "Full Name": jsonData["Full Name"] || "",
      "Email Address": jsonData["Email Address"] || "",
      "Phone Number": jsonData["Phone Number"] || "",
      "Preferred Contact Method": jsonData["Preferred Contact Method"] || "",
      "Project Description": jsonData["Project Description"] || "",
      "Preferred Font Name or Number": jsonData["Preferred Font Name or Number"] || "",
      "Requested Completion Date": jsonData["Requested Completion Date"] || "",
      "Rush Order": jsonData["Rush Order"] || "",
      "Inspiration Photos": jsonData["Inspiration Photos"] || [],
      "Inspiration Links": jsonData["Inspiration Links"] || "",
      "Peptides": jsonData["Peptides"] || "",
      "Goals or Questions": jsonData["Goals or Questions"] || ""
    };
  }

  const parameters = e && e.parameter ? e.parameter : {};
  const multiParameters = e && e.parameters ? e.parameters : {};

  return {
    "Order Type": value_(parameters, "Order Type"),
    "Full Name": value_(parameters, "Full Name"),
    "Email Address": value_(parameters, "Email Address"),
    "Phone Number": value_(parameters, "Phone Number"),
    "Preferred Contact Method": listValue_(multiParameters, parameters, "Preferred Contact Method[]") || value_(parameters, "Preferred Contact Method"),
    "Project Description": value_(parameters, "Project Description"),
    "Preferred Font Name or Number": value_(parameters, "Preferred Font Name or Number"),
    "Requested Completion Date": value_(parameters, "Requested Completion Date"),
    "Rush Order": value_(parameters, "Rush Order"),
    "Inspiration Photos": parseUploadedPhotos_(parameters),
    "Inspiration Links": value_(parameters, "Inspiration Links"),
    "Peptides": listValue_(multiParameters, parameters, "Peptides[]"),
    "Goals or Questions": value_(parameters, "Goals or Questions")
  };
}

function parseJsonSubmission_(e) {
  if (!e || !e.postData || !e.postData.contents) {
    return null;
  }

  try {
    return JSON.parse(e.postData.contents);
  } catch (error) {
    return null;
  }
}

function parseUploadedPhotos_(parameters) {
  const photos = parameters["Inspiration Photos"];

  if (!photos) {
    return [];
  }

  try {
    return typeof photos === "string" ? JSON.parse(photos) : photos;
  } catch (error) {
    return [];
  }
}

function value_(parameters, key) {
  return parameters[key] || "";
}

function listValue_(multiParameters, parameters, key) {
  if (multiParameters[key]) {
    return multiParameters[key].join(", ");
  }
  return parameters[key] || "";
}

function getOrderConfig_(data) {
  if (data["Order Type"] === "Peptide Order") {
    return getPeptideOrderConfig_();
  }

  return getDesignOrderConfig_();
}

function getDesignOrderConfig_() {
  return {
    label: "Custom Order",
    sheetName: DESIGN_SHEET_NAME,
    headers: DESIGN_HEADERS,
    sortByRequestedDate: true,
    thankYouUrl: "https://www.collectivelydelanie.com/order-thank-you.html",
    toRow: function(data) {
      return [
        new Date(),
        "New",
        data["Full Name"],
        data["Email Address"],
        data["Phone Number"],
        data["Preferred Contact Method"],
        data["Project Description"],
        data["Preferred Font Name or Number"],
        data["Requested Completion Date"],
        data["Rush Order"],
        data["Inspiration Photos"],
        data["Inspiration Links"],
        "",
        "Not Sent",
        ""
      ];
    }
  };
}

function saveUploadedPhotosSafely_(photos, customerName) {
  if (!photos || !photos.length) {
    return "";
  }

  try {
    return saveUploadedPhotos_(photos, customerName);
  } catch (error) {
    return "Photo upload failed. Run authorizeDriveAccess in Apps Script, then ask customer to resend photo. Error: " + error;
  }
}

function saveUploadedPhotos_(photos, customerName) {
  if (!photos || !photos.length) {
    return "";
  }

  const folder = DriveApp.getFolderById(INSPIRATION_PHOTO_FOLDER_ID);
  const safeName = String(customerName || "custom-order").replace(/[^a-z0-9]+/gi, "-").replace(/^-|-$/g, "") || "custom-order";
  const timestamp = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "yyyyMMdd-HHmmss");

  return photos
    .filter(function(photo) {
      return photo && photo.data;
    })
    .map(function(photo, index) {
      const extension = getFileExtension_(photo.name, photo.type);
      const fileName = safeName + "-" + timestamp + "-inspiration-" + (index + 1) + extension;
      const bytes = Utilities.base64Decode(photo.data);
      const blob = Utilities.newBlob(bytes, photo.type || "application/octet-stream", fileName);
      const file = folder.createFile(blob);

      file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
      return file.getUrl();
    })
    .join(", ");
}

function getFileExtension_(fileName, mimeType) {
  const match = String(fileName || "").match(/\.[a-z0-9]+$/i);

  if (match) {
    return match[0];
  }

  if (mimeType === "image/png") return ".png";
  if (mimeType === "image/webp") return ".webp";
  if (mimeType === "image/gif") return ".gif";
  return ".jpg";
}

function getPeptideOrderConfig_() {
  return {
    label: "Peptide Order",
    sheetName: PEPTIDE_SHEET_NAME,
    headers: PEPTIDE_HEADERS,
    sortByRequestedDate: false,
    thankYouUrl: "https://www.collectivelydelanie.com/peptide-thank-you.html",
    toRow: function(data) {
      return [
        new Date(),
        "New",
        data["Full Name"],
        data["Email Address"],
        data["Phone Number"],
        data["Preferred Contact Method"],
        data["Peptides"],
        data["Goals or Questions"],
        ""
      ];
    }
  };
}

function formatLatestRow_(sheet, orderConfig) {
  const lastRow = sheet.getLastRow();
  sheet.getRange(lastRow, 1, 1, orderConfig.headers.length).setVerticalAlignment("top");
  sheet.autoResizeColumns(1, orderConfig.headers.length);
}

function sortOrdersByRequestedDate_(sheet, orderConfig) {
  const lastRow = sheet.getLastRow();

  if (lastRow <= 2) {
    return;
  }

  try {
    sheet.getRange(2, 1, lastRow - 1, orderConfig.headers.length).sort([
      { column: REQUESTED_DATE_COLUMN, ascending: true },
      { column: 1, ascending: true }
    ]);
  } catch (error) {
    console.warn("Skipping requested-date sort because Google Sheets blocked it: " + error);
  }
}

function sendNotification_(data, orderConfig) {
  const subject = "New " + orderConfig.label + " Request - " + (data["Full Name"] || "Website");
  const bodyFields = orderConfig.headers
    .filter(function(header) {
      return [
        "Date",
        "Status",
        "Notes",
        "Quote",
        "Payment Status",
        "Date Submitted",
        "Order Status",
        "Internal Notes",
        "Quote Amount"
      ].indexOf(header) === -1;
    })
    .map(function(header) {
      return header + ": " + valueForNotification_(data, header);
    });

  const body = [
    "New " + orderConfig.label.toLowerCase() + " request submitted from Collectively Delanie.",
    "",
    bodyFields.join("\n"),
    "",
    "Open the " + orderConfig.sheetName + " tab in your Google Sheet to view this order."
  ].join("\n");

  const emailOptions = {
    to: NOTIFICATION_EMAIL,
    subject: subject,
    body: body
  };

  if (data["Email Address"]) {
    emailOptions.replyTo = data["Email Address"];
  }

  MailApp.sendEmail(emailOptions);
}

function valueForNotification_(data, header) {
  const sourceByHeader = {
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
  const source = sourceByHeader[header] || header;

  return data[source] || "";
}
