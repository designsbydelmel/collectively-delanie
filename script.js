const menuButton = document.querySelector(".menu-button");
const siteNav = document.querySelector(".site-nav");
const navLinks = document.querySelectorAll(".site-nav a");
const year = document.getElementById("year");

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

year.textContent = new Date().getFullYear();
