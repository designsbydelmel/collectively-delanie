const DESIGN_SHEET_NAME = "Custom Orders";
const COMPLETED_DESIGN_SHEET_NAME = "Completed Custom Orders";
const PEPTIDE_SHEET_NAME = "Peptide Orders";
const NOTIFICATION_EMAIL = "collectivelydelanie@gmail.com";
const SPREADSHEET_ID = "PASTE_YOUR_GOOGLE_SHEET_ID_HERE";
const REQUESTED_DATE_COLUMN = 9;
const ORDER_STATUS_HEADER = "Order Status";
const COMPLETE_STATUSES = ["complete", "completed"];

const DESIGN_HEADERS = [
  "Date Submitted",
  "Order Status",
  "Full Name",
  "Email Address",
  "Phone Number",
  "Preferred Contact Method",
  "Project Description",
  "Preferred Font Name or Number",
  "Requested Completion Date",
  "Rush Order",
  "Inspiration Links",
  "Quote Amount",
  "Payment Status",
  "Internal Notes"
];

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
  const sheet = getOrderSheet_(getDesignOrderConfig_());
  sheet.getRange(1, 1, 1, DESIGN_HEADERS.length).setValues([DESIGN_HEADERS]);
  sheet.setFrozenRows(1);
  sheet.getRange(1, 1, 1, DESIGN_HEADERS.length)
    .setFontWeight("bold")
    .setBackground("#f7f2ed")
    .setFontColor("#332c2f");
  sheet.autoResizeColumns(1, DESIGN_HEADERS.length);
  sheet.getRange("B:B").setDataValidation(
    SpreadsheetApp.newDataValidation()
      .requireValueInList(["New", "Contacted", "Quoted", "Approved", "In Progress", "Ready", "Complete", "Cancelled"], true)
      .build()
  );
  sheet.getRange("M:M").setDataValidation(
    SpreadsheetApp.newDataValidation()
      .requireValueInList(["Not Sent", "Invoice Sent", "Deposit Paid", "Paid in Full", "Refunded"], true)
      .build()
  );
  setupCompletedCustomOrdersSheet_();
  setupPeptideOrderSheet();
}

function onEdit(e) {
  moveCompletedCustomOrder_(e);
}

function setupCompletedCustomOrdersSheet_() {
  const sheet = getOrderSheet_({
    sheetName: COMPLETED_DESIGN_SHEET_NAME,
    headers: DESIGN_HEADERS
  });

  sheet.getRange(1, 1, 1, DESIGN_HEADERS.length).setValues([DESIGN_HEADERS]);
  sheet.setFrozenRows(1);
  sheet.getRange(1, 1, 1, DESIGN_HEADERS.length)
    .setFontWeight("bold")
    .setBackground("#f7f2ed")
    .setFontColor("#332c2f");
  sheet.autoResizeColumns(1, DESIGN_HEADERS.length);

  return sheet;
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
  }

  return sheet;
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
    "Inspiration Links": value_(parameters, "Inspiration Links"),
    "Peptides": listValue_(multiParameters, parameters, "Peptides[]"),
    "Goals or Questions": value_(parameters, "Goals or Questions")
  };
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
        data["Inspiration Links"],
        "",
        "Not Sent",
        ""
      ];
    }
  };
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
      return ["Date Submitted", "Order Status", "Internal Notes", "Quote Amount", "Payment Status"].indexOf(header) === -1;
    })
    .map(function(header) {
      return header + ": " + (data[header] || "");
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
