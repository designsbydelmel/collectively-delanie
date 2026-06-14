const menuButton = document.querySelector(".menu-button");
const siteNav = document.querySelector(".site-nav");
const navLinks = document.querySelectorAll(".site-nav a");
const year = document.getElementById("year");
const orderForm = document.querySelector(".custom-order-form");
const requestedDate = document.querySelector('input[name="Requested Completion Date"]');

menuButton.addEventListener("click", () => {
  const isOpen = siteNav.classList.toggle("open");
  menuButton.setAttribute("aria-expanded", String(isOpen));
});

navLinks.forEach((link) => {
  link.addEventListener("click", () => {
    siteNav.classList.remove("open");
    menuButton.setAttribute("aria-expanded", "false");
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
    }
  });
}

if (requestedDate) {
  requestedDate.min = new Date().toISOString().split("T")[0];
}
