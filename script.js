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
  orderForm.addEventListener("submit", async (event) => {
    const contactMethods = orderForm.querySelectorAll('input[name="Preferred Contact Method[]"]:checked');

    if (contactMethods.length === 0) {
      event.preventDefault();
      alert("Please select at least one preferred contact method.");
      return;
    }

    event.preventDefault();

    const submitButton = orderForm.querySelector(".submit-order");
    const originalButtonText = submitButton ? submitButton.textContent : "";

    if (submitButton) {
      submitButton.disabled = true;
      submitButton.textContent = "Submitting...";
    }

    try {
      await fetch(orderForm.action, {
        method: "POST",
        mode: "no-cors",
        body: new URLSearchParams(new FormData(orderForm)),
      });

      window.location.href = "order-thank-you.html";
    } catch (error) {
      if (submitButton) {
        submitButton.disabled = false;
        submitButton.textContent = originalButtonText;
      }

      alert("There was an issue submitting your order. Please try again or email collectivelydelanie@gmail.com.");
    }
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
