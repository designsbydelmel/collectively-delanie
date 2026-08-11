const fonts = [
  "Admirable Valentines",
  "Brittany Signature",
  "Camila Bryan",
  "Cherrybelle",
  "Christmas",
  "Daily Calm",
  "Family",
  "Handmade",
  "Holly Wings",
  "Honeymoon",
  "Ladybug",
  "Montage",
  "Point Beach",
  "Simple Tumbler",
  "Wild Cake",
  "Kinder Bubble",
  "Funky Hearts"
];

const input = document.getElementById("nameInput");
const previewArea = document.getElementById("previewArea");
const selectedSection = document.getElementById("selectedSection");
const selectedPreview = document.getElementById("selectedPreview");

let selectedFont = null;
let selectedNumber = null;

function escapeHtml(value) {
  return value.replace(/[&<>"]/g, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;"
  })[character]);
}

function updatePreviews() {
  previewArea.innerHTML = "";
  const text = input.value.trim() || "Your Name";
  const safeText = escapeHtml(text);

  fonts.forEach((font, index) => {
    const number = index + 1;
    const isSelected = selectedFont === font;

    const card = document.createElement("div");
    card.className = `font-preview ${isSelected ? "selected" : ""}`;

    card.innerHTML = `
      <div class="checkmark">✓</div>
      <div class="font-number">Font #${number}</div>
      <div class="preview-text" style="font-family:'${font}'">${safeText}</div>
      <div class="divider"></div>
      <div class="font-name">Font Name: <strong>${font}</strong></div>
      <button class="copy-button" onclick="selectFont('${font}', ${number}, this)">
        ${isSelected ? "✓ Selected" : "Select This Font"}
      </button>
      <div class="helper-text">Use Font #${number} or “${font}” on your order form.</div>
    `;

    previewArea.appendChild(card);
  });

  updateSelectedPreview();
}

function selectFont(fontName, number, button) {
  selectedFont = fontName;
  selectedNumber = number;

  navigator.clipboard.writeText(`Font #${number} - ${fontName}`);

  updatePreviews();
}

function updateSelectedPreview() {
  const text = input.value.trim() || "Your Name";
  const safeText = escapeHtml(text);

  if (!selectedFont) {
    selectedSection.classList.add("hidden");
    return;
  }

  selectedSection.classList.remove("hidden");

  selectedPreview.innerHTML = `
    <div class="font-preview selected">
      <div class="checkmark">✓</div>
      <div class="font-number">Font #${selectedNumber}</div>
      <div class="preview-text" style="font-family:'${selectedFont}'">${safeText}</div>
      <div class="divider"></div>
      <div class="font-name">Font Name: <strong>${selectedFont}</strong></div>
      <div class="helper-text">Copied: Font #${selectedNumber} - ${selectedFont}</div>
    </div>
  `;
}

input.addEventListener("input", updatePreviews);
updatePreviews();
