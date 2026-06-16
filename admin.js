const adminGate = document.querySelector("[data-admin-gate]");
const adminDashboard = document.querySelector("[data-admin-dashboard]");
const adminAccessForm = document.querySelector("[data-admin-access-form]");
const adminLock = document.querySelector("[data-admin-lock]");
const responseList = document.querySelector("[data-response-list]");
const responseDetail = document.querySelector("[data-response-detail]");
const searchInput = document.querySelector("[data-admin-search]");
const statusFilter = document.querySelector("[data-status-filter]");
const rushFilter = document.querySelector("[data-rush-filter]");
const importInput = document.querySelector("[data-response-import]");
const resetButton = document.querySelector("[data-admin-reset]");

const statTotal = document.querySelector("[data-stat-total]");
const statNew = document.querySelector("[data-stat-new]");
const statRush = document.querySelector("[data-stat-rush]");
const statWeek = document.querySelector("[data-stat-week]");

const storageKey = "collectivelyDelanieAdminResponses";
const accessKey = "collectivelyDelanieAdminUnlocked";

const sampleResponses = [
  {
    id: "sample-001",
    submittedAt: "2026-06-15",
    status: "New",
    fullName: "Sample Customer",
    email: "sample@example.com",
    phone: "(555) 123-4567",
    preferredContact: "Email",
    projectDescription: "Personalized hand-burned hat with floral details and warm neutral tones.",
    preferredFont: "Font #15 - Wild Cake",
    requestedDate: "2026-06-28",
    rushOrder: "No",
    inspirationLinks: "Pinterest board or shared album link",
    acknowledgements: "Quote first, design fees may apply, 5 revisions, production after payment.",
    notes: "Replace this sample with imported FormSubmit, Google Sheet, Airtable, or backend responses."
  },
  {
    id: "sample-002",
    submittedAt: "2026-06-15",
    status: "Needs Quote",
    fullName: "Example Bride",
    email: "bride@example.com",
    phone: "(555) 987-6543",
    preferredContact: "Text",
    projectDescription: "Baby in Bloom backdrop with paper flowers, signage, and blush/sage palette.",
    preferredFont: "Delanie recommends",
    requestedDate: "2026-06-22",
    rushOrder: "Yes - additional fees may apply",
    inspirationLinks: "Shared Google Drive folder",
    acknowledgements: "Quote first, design fees may apply, 5 revisions, production after payment.",
    notes: "Follow up with event size, delivery needs, and install details."
  }
];

let responses = loadResponses();
let selectedId = responses[0]?.id || null;

function normalizeResponse(raw, index) {
  const getValue = (...keys) => {
    const key = keys.find((name) => raw[name] !== undefined && raw[name] !== "");
    return key ? raw[key] : "";
  };

  return {
    id: getValue("id", "ID") || `response-${Date.now()}-${index}`,
    submittedAt: getValue("submittedAt", "Submitted At", "Date", "Timestamp") || new Date().toISOString().split("T")[0],
    status: getValue("status", "Status") || "New",
    fullName: getValue("fullName", "Full Name", "Name"),
    email: getValue("email", "Email Address", "Email"),
    phone: getValue("phone", "Phone Number", "Phone"),
    preferredContact: getValue("preferredContact", "Preferred Contact Method", "Preferred Contact Method[]"),
    projectDescription: getValue("projectDescription", "Project Description", "Describe Your Project"),
    preferredFont: getValue("preferredFont", "Preferred Font Name or Number"),
    requestedDate: getValue("requestedDate", "Requested Completion Date"),
    rushOrder: getValue("rushOrder", "Rush Order"),
    inspirationLinks: getValue("inspirationLinks", "Inspiration Links", "Optional Inspiration Links"),
    acknowledgements: getValue("acknowledgements", "Acknowledgement", "Acknowledgement[]"),
    notes: getValue("notes", "Notes")
  };
}

function loadResponses() {
  const saved = localStorage.getItem(storageKey);

  if (!saved) {
    return sampleResponses;
  }

  try {
    return JSON.parse(saved).map(normalizeResponse);
  } catch {
    return sampleResponses;
  }
}

function saveResponses() {
  localStorage.setItem(storageKey, JSON.stringify(responses));
}

function unlockDashboard() {
  sessionStorage.setItem(accessKey, "true");
  adminGate.hidden = true;
  adminDashboard.hidden = false;
  renderDashboard();
}

function lockDashboard() {
  sessionStorage.removeItem(accessKey);
  adminDashboard.hidden = true;
  adminGate.hidden = false;
}

function isRush(response) {
  return response.rushOrder.toLowerCase().includes("yes");
}

function isDueThisWeek(response) {
  if (!response.requestedDate) {
    return false;
  }

  const today = new Date();
  const dueDate = new Date(`${response.requestedDate}T12:00:00`);
  const sevenDays = 7 * 24 * 60 * 60 * 1000;

  return dueDate >= today && dueDate - today <= sevenDays;
}

function filteredResponses() {
  const query = searchInput.value.trim().toLowerCase();
  const selectedStatus = statusFilter.value;
  const selectedRush = rushFilter.value;

  return responses.filter((response) => {
    const searchable = Object.values(response).join(" ").toLowerCase();
    const matchesSearch = !query || searchable.includes(query);
    const matchesStatus = selectedStatus === "all" || response.status === selectedStatus;
    const matchesRush =
      selectedRush === "all" ||
      (selectedRush === "rush" && isRush(response)) ||
      (selectedRush === "standard" && !isRush(response));

    return matchesSearch && matchesStatus && matchesRush;
  });
}

function renderStats(items) {
  statTotal.textContent = responses.length;
  statNew.textContent = responses.filter((response) => response.status === "New").length;
  statRush.textContent = responses.filter(isRush).length;
  statWeek.textContent = responses.filter(isDueThisWeek).length;

  if (items.length && !items.some((response) => response.id === selectedId)) {
    selectedId = items[0].id;
  }
}

function renderList(items) {
  if (!items.length) {
    responseList.innerHTML = `
      <div class="admin-empty-state">
        <h3>No responses found.</h3>
        <p>Try clearing your filters or importing a CSV/JSON response export.</p>
      </div>
    `;
    return;
  }

  responseList.innerHTML = items.map((response) => `
    <button class="admin-response-card ${response.id === selectedId ? "active" : ""}" type="button" data-response-id="${escapeHtml(response.id)}">
      <span>${escapeHtml(response.status)}</span>
      <strong>${escapeHtml(response.fullName || "Unnamed response")}</strong>
      <small>${escapeHtml(response.projectDescription || "No project description yet.")}</small>
      <em>${escapeHtml(response.requestedDate || "No due date")} ${isRush(response) ? "· Rush" : ""}</em>
    </button>
  `).join("");
}

function detailRow(label, value) {
  return `
    <div class="admin-detail-row">
      <span>${escapeHtml(label)}</span>
      <p>${escapeHtml(value || "Not provided")}</p>
    </div>
  `;
}

function renderDetail() {
  const response = responses.find((item) => item.id === selectedId);

  if (!response) {
    responseDetail.innerHTML = `
      <div class="empty-detail">
        <p class="section-kicker">Select a response</p>
        <h2>Details will appear here.</h2>
        <p>Choose a submission from the inbox to review the full request.</p>
      </div>
    `;
    return;
  }

  responseDetail.innerHTML = `
    <div class="admin-detail-header">
      <p class="section-kicker">Response detail</p>
      <h2>${escapeHtml(response.fullName || "Unnamed response")}</h2>
      <div class="admin-detail-actions">
        <label>
          Status
          <select data-detail-status>
            ${["New", "Needs Quote", "Quoted", "In Progress", "Completed"].map((status) => `
              <option value="${status}" ${response.status === status ? "selected" : ""}>${status}</option>
            `).join("")}
          </select>
        </label>
        <a class="button button-primary" href="mailto:${escapeHtml(response.email)}?subject=Collectively%20Delanie%20Order%20Follow-Up">Email Customer</a>
      </div>
    </div>

    <div class="admin-detail-grid">
      ${detailRow("Submitted", response.submittedAt)}
      ${detailRow("Email", response.email)}
      ${detailRow("Phone", response.phone)}
      ${detailRow("Preferred Contact", response.preferredContact)}
      ${detailRow("Requested Completion", response.requestedDate)}
      ${detailRow("Rush Order", response.rushOrder)}
      ${detailRow("Preferred Font", response.preferredFont)}
      ${detailRow("Inspiration Links", response.inspirationLinks)}
      ${detailRow("Acknowledgements", response.acknowledgements)}
    </div>

    <div class="admin-project-notes">
      <h3>Project description</h3>
      <p>${escapeHtml(response.projectDescription || "Not provided")}</p>
      <label>
        Internal notes
        <textarea data-admin-notes rows="5">${escapeHtml(response.notes || "")}</textarea>
      </label>
    </div>
  `;
}

function renderDashboard() {
  const items = filteredResponses();
  renderStats(items);
  renderList(items);
  renderDetail();
}

function updateSelectedResponse(id) {
  selectedId = id;
  renderDashboard();
}

function updateStatus(status) {
  responses = responses.map((response) => (
    response.id === selectedId ? { ...response, status } : response
  ));
  saveResponses();
  renderDashboard();
}

function updateNotes(notes) {
  responses = responses.map((response) => (
    response.id === selectedId ? { ...response, notes } : response
  ));
  saveResponses();
}

function parseCsv(text) {
  const rows = [];
  let current = "";
  let row = [];
  let inQuotes = false;

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    const next = text[index + 1];

    if (char === "\"" && next === "\"") {
      current += "\"";
      index += 1;
    } else if (char === "\"") {
      inQuotes = !inQuotes;
    } else if (char === "," && !inQuotes) {
      row.push(current);
      current = "";
    } else if ((char === "\n" || char === "\r") && !inQuotes) {
      if (current || row.length) {
        row.push(current);
        rows.push(row);
        row = [];
        current = "";
      }
    } else {
      current += char;
    }
  }

  if (current || row.length) {
    row.push(current);
    rows.push(row);
  }

  const [headers, ...records] = rows;

  if (!headers) {
    return [];
  }

  return records.map((record) => headers.reduce((entry, header, index) => {
    entry[header.trim()] = (record[index] || "").trim();
    return entry;
  }, {}));
}

async function importResponses(file) {
  const text = await file.text();
  const imported = file.name.toLowerCase().endsWith(".json")
    ? JSON.parse(text)
    : parseCsv(text);

  responses = imported.map(normalizeResponse);
  selectedId = responses[0]?.id || null;
  saveResponses();
  renderDashboard();
}

function escapeHtml(value) {
  return String(value || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll("\"", "&quot;")
    .replaceAll("'", "&#039;");
}

adminAccessForm.addEventListener("submit", (event) => {
  event.preventDefault();
  unlockDashboard();
  adminAccessForm.reset();
});

adminLock.addEventListener("click", lockDashboard);
searchInput.addEventListener("input", renderDashboard);
statusFilter.addEventListener("change", renderDashboard);
rushFilter.addEventListener("change", renderDashboard);

responseList.addEventListener("click", (event) => {
  const card = event.target.closest("[data-response-id]");

  if (card) {
    updateSelectedResponse(card.dataset.responseId);
  }
});

responseDetail.addEventListener("change", (event) => {
  if (event.target.matches("[data-detail-status]")) {
    updateStatus(event.target.value);
  }
});

responseDetail.addEventListener("input", (event) => {
  if (event.target.matches("[data-admin-notes]")) {
    updateNotes(event.target.value);
  }
});

importInput.addEventListener("change", () => {
  const [file] = importInput.files;

  if (file) {
    importResponses(file);
  }
});

resetButton.addEventListener("click", () => {
  responses = sampleResponses;
  selectedId = responses[0].id;
  saveResponses();
  renderDashboard();
});

if (sessionStorage.getItem(accessKey) === "true") {
  unlockDashboard();
}
