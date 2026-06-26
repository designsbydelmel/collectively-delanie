const menuButton = document.querySelector(".menu-button");
const siteNav = document.querySelector(".site-nav");
const navLinks = document.querySelectorAll(".site-nav a");
const year = document.getElementById("year");
const orderForms = document.querySelectorAll(".custom-order-form");
const requestedDate = document.querySelector('input[name="Requested Completion Date"]');
const photoInput = document.querySelector('input[name="Inspiration Photos"]');
const fileStatus = document.querySelector(".file-status");
const galleryFilters = document.querySelectorAll(".gallery-filter");
const projectCards = document.querySelectorAll(".project-card");
const wellnessCarousel = document.querySelector("[data-carousel]");
const siteConfig = window.COLLECTIVELY_DELANIE_CONFIG || {};
const maxUploadBytes = 10 * 1024 * 1024;

const fileToUploadPayload = (file) => new Promise((resolve, reject) => {
  const reader = new FileReader();

  reader.onload = () => {
    const result = String(reader.result || "");

    resolve({
      name: file.name,
      type: file.type || "application/octet-stream",
      data: result.split(",")[1] || ""
    });
  };

  reader.onerror = () => reject(reader.error);
  reader.readAsDataURL(file);
});

const formDataToUrlSearchParams = async (form) => {
  const formData = new FormData(form);
  const payload = new URLSearchParams();
  const uploadInputs = Array.from(form.querySelectorAll('input[type="file"]'));

  uploadInputs.forEach((input) => {
    formData.delete(input.name);
  });

  formData.forEach((value, key) => {
    payload.append(key, value);
  });

  const uploadedPhotos = [];

  for (const input of uploadInputs) {
    const files = Array.from(input.files || []);

    for (const file of files) {
      uploadedPhotos.push(await fileToUploadPayload(file));
    }
  }

  if (uploadedPhotos.length) {
    payload.set("Inspiration Photos", JSON.stringify(uploadedPhotos));
  }

  return payload;
};

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

orderForms.forEach((orderForm) => {
  orderForm.addEventListener("submit", async (event) => {
    const multiContactMethods = orderForm.querySelectorAll('input[name="Preferred Contact Method[]"]');
    const checkedMultiContactMethods = orderForm.querySelectorAll('input[name="Preferred Contact Method[]"]:checked');
    const actionUrl = orderForm.dataset.actionSource === "site-config"
      ? siteConfig.appsScriptUrl
      : orderForm.action;

    if (multiContactMethods.length > 0 && checkedMultiContactMethods.length === 0) {
      event.preventDefault();
      alert("Please select at least one preferred contact method.");
      return;
    }

    const uploadInputs = Array.from(orderForm.querySelectorAll('input[type="file"]'));
    const totalUploadBytes = uploadInputs.reduce((total, input) => {
      return total + Array.from(input.files || []).reduce((sum, file) => sum + file.size, 0);
    }, 0);

    if (totalUploadBytes > maxUploadBytes) {
      event.preventDefault();
      alert("Photos exceed the 10MB combined limit. Please choose smaller files.");
      return;
    }

    event.preventDefault();

    if (!actionUrl) {
      alert("This form is not connected yet. Please email collectivelydelanie@gmail.com.");
      return;
    }

    const submitButton = orderForm.querySelector(".submit-order");
    const originalButtonText = submitButton ? submitButton.textContent : "";

    if (submitButton) {
      submitButton.disabled = true;
      submitButton.textContent = "Submitting...";
    }

    try {
      const payload = await formDataToUrlSearchParams(orderForm);

      await fetch(actionUrl, {
        method: "POST",
        mode: "no-cors",
        body: payload,
      });

      window.location.href = orderForm.dataset.thankYou || "order-thank-you.html";
    } catch (error) {
      if (submitButton) {
        submitButton.disabled = false;
        submitButton.textContent = originalButtonText;
      }

      alert("There was an issue submitting your order. Please try again or email collectivelydelanie@gmail.com.");
    }
  });
});

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

if (wellnessCarousel) {
  const slidesContainer = wellnessCarousel.querySelector(".carousel-slides");
  const prevButton = wellnessCarousel.querySelector(".carousel-prev");
  const nextButton = wellnessCarousel.querySelector(".carousel-next");
  const dotsContainer = wellnessCarousel.querySelector(".carousel-dots");
  let currentSlide = 0;

  const getSlides = () => Array.from(wellnessCarousel.querySelectorAll(".carousel-slide"));

  const showSlide = (index) => {
    const slides = getSlides();

    if (!slides.length) {
      return;
    }

    currentSlide = (index + slides.length) % slides.length;

    slides.forEach((slide, slideIndex) => {
      slide.classList.toggle("active", slideIndex === currentSlide);
    });

    if (dotsContainer) {
      Array.from(dotsContainer.children).forEach((dot, dotIndex) => {
        dot.classList.toggle("active", dotIndex === currentSlide);
        dot.setAttribute("aria-pressed", String(dotIndex === currentSlide));
      });
    }
  };

  const renderDots = () => {
    if (!dotsContainer) {
      return;
    }

    dotsContainer.innerHTML = "";

    getSlides().forEach((slide, index) => {
      const dot = document.createElement("button");
      dot.className = "carousel-dot";
      dot.type = "button";
      dot.setAttribute("aria-label", `Show PEPd photo ${index + 1}`);
      dot.addEventListener("click", () => showSlide(index));
      dotsContainer.appendChild(dot);
    });

    showSlide(currentSlide);
  };

  if (prevButton) {
    prevButton.addEventListener("click", () => showSlide(currentSlide - 1));
  }

  if (nextButton) {
    nextButton.addEventListener("click", () => showSlide(currentSlide + 1));
  }

  renderDots();
}
