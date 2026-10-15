const root = document.documentElement;
const sidebar = document.querySelector("#sidebar");
const backdrop = document.querySelector("#backdrop");
const search = document.querySelector("#searchInput");
const sections = [...document.querySelectorAll(".doc-section")];
const navLinks = [...document.querySelectorAll("#navigation a")];

function setTheme(theme) {
  root.dataset.theme = theme;
  localStorage.setItem("et-docs-theme", theme);
}

setTheme(localStorage.getItem("et-docs-theme") || "dark");
document.querySelectorAll(".theme-toggle").forEach((button) => {
  button.addEventListener("click", () => setTheme(root.dataset.theme === "dark" ? "light" : "dark"));
});

function closeMenu() {
  sidebar.classList.remove("open");
  backdrop.classList.remove("show");
}

document.querySelector("#menuButton").addEventListener("click", () => {
  sidebar.classList.toggle("open");
  backdrop.classList.toggle("show");
});
backdrop.addEventListener("click", closeMenu);
navLinks.forEach((link) => link.addEventListener("click", closeMenu));

document.querySelectorAll("pre").forEach((block) => {
  const button = block.querySelector(".copy-button");
  const code = block.querySelector("code");
  button?.addEventListener("click", async () => {
    await navigator.clipboard.writeText(code.textContent);
    button.textContent = "已复制";
    setTimeout(() => { button.textContent = "复制"; }, 1400);
  });
});

function filterSections() {
  const query = search.value.trim().toLocaleLowerCase();
  let visible = 0;
  for (const section of sections) {
    const matches = !query || `${section.dataset.title || ""} ${section.textContent}`.toLocaleLowerCase().includes(query);
    section.hidden = !matches;
    if (matches) visible += 1;
  }
  document.querySelector("#searchEmpty").hidden = visible !== 0;
  document.querySelector("footer").hidden = Boolean(query);
}

search.addEventListener("input", filterSections);
document.addEventListener("keydown", (event) => {
  if ((event.metaKey || event.ctrlKey) && event.key.toLocaleLowerCase() === "k") {
    event.preventDefault(); search.focus();
  }
  if (event.key === "Escape") { search.value = ""; filterSections(); search.blur(); closeMenu(); }
});

const observer = new IntersectionObserver((entries) => {
  const visible = entries.filter((entry) => entry.isIntersecting).sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
  if (!visible?.target.id) return;
  navLinks.forEach((link) => link.classList.toggle("active", link.hash === `#${visible.target.id}`));
}, { rootMargin: "-15% 0px -70%", threshold: [0, .2, .5] });
sections.forEach((section) => observer.observe(section));

const isLocal = ["localhost", "127.0.0.1", "::1"].includes(location.hostname);
if (!isLocal) {
  document.querySelectorAll("[data-local-lab]").forEach((link) => {
    link.href = "#local-lab";
    link.textContent = "查看本地运行方式 ↓";
  });
}
