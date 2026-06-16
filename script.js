const menuButton = document.querySelector(".menu-button");
const siteNav = document.querySelector(".site-nav");
const navLinks = document.querySelectorAll(".site-nav a");
const year = document.getElementById("year");
const orderForm = document.querySelector(".custom-order-form");
const requestedDate = document.querySelector('input[name="Requested Completion Date"]');
const photoInput = document.querySelector('input[name="Inspiration Photos"]');
const fileStatus = document.querySelector(".file-status");
const galleryFilters = document.querySelectorAll(".gallery-filter");
const projectCards = document.querySelectorAll(".project-card");
const maxUploadBytes = 10 * 1024 * 1024;
const siteConfig = window.COLLECTIVELY_DELANIE_CONFIG || globalThis.COLLECTIVELY_DELANIE_CONFIG || {};

if (menuButton && siteNav) {
  menuButton.addEventListener("click", () => {
    const isOpen = siteNav.classList.toggle("open");
    menuButton.setAttribute("aria-expanded", String(isOpen));
  });
}

navLinks.forEach((link) => {
  link.addEventListener("click", () => {
    siteNav.classList.remove("open");
    if (menuButton) {
      menuButton.setAttribute("aria-expanded", "false");
    }
  });
});

if (year) {
  year.textContent = new Date().getFullYear();
}

if (orderForm) {
  orderForm.addEventListener("submit", (event) => {
    const contactMethods = orderForm.querySelectorAll('input[name="Preferred Contact Method[]"]:checked');

    if (contactMethods.length === 0) {
      event.preventDefault();
      alert("Please select at least one preferred contact method.");
      return;
    }

    mirrorOrderSubmission(orderForm);
  });
}

if (requestedDate) {
  requestedDate.min = new Date().toISOString().split("T")[0];
}

if (photoInput && fileStatus) {
  photoInput.addEventListener("change", () => {
    const files = Array.from(photoInput.files);
    const totalBytes = files.reduce((sum, file) => sum + file.size, 0);

    if (totalBytes > maxUploadBytes) {
      photoInput.value = "";
      fileStatus.textContent = "Photos exceed the 10MB combined limit. Please choose smaller files.";
      return;
    }

    fileStatus.textContent = files.length
      ? `${files.length} photo${files.length === 1 ? "" : "s"} selected`
      : "No photos selected";
  });
}

galleryFilters.forEach((button) => {
  button.addEventListener("click", () => {
    const filter = button.dataset.filter;

    galleryFilters.forEach((filterButton) => filterButton.classList.remove("active"));
    button.classList.add("active");

    projectCards.forEach((card) => {
      card.hidden = filter !== "all" && card.dataset.category !== filter;
    });
  });
});

function mirrorOrderSubmission(form) {
  if (!siteConfig.appsScriptUrl) {
    return;
  }

  const payload = formToResponsePayload(form);
  const body = JSON.stringify(payload);

  if (navigator.sendBeacon) {
    navigator.sendBeacon(siteConfig.appsScriptUrl, new Blob([body], { type: "text/plain" }));
    return;
  }

  fetch(siteConfig.appsScriptUrl, {
    method: "POST",
    mode: "no-cors",
    body
  }).catch(() => {
    // The FormSubmit email remains the source of truth if the dashboard mirror is unavailable.
  });
}

function formToResponsePayload(form) {
  const formData = new FormData(form);
  const payload = {
    id: `order-${Date.now()}`,
    submittedAt: new Date().toISOString(),
    status: "New"
  };

  formData.forEach((value, key) => {
    if (key.startsWith("_") || value instanceof File) {
      return;
    }

    const cleanKey = key.replace("[]", "");
    const cleanValue = String(value).trim();

    if (!cleanValue) {
      return;
    }

    payload[cleanKey] = payload[cleanKey]
      ? `${payload[cleanKey]}, ${cleanValue}`
      : cleanValue;
  });

  return payload;
}
