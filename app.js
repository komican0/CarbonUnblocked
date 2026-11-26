const grid = document.querySelector("#game-grid");
const emptyState = document.querySelector("#empty-state");
const search = document.querySelector("#search");
const dialog = document.querySelector("#game-dialog");
const frame = document.querySelector("#game-frame");
const placeholder = document.querySelector("#frame-placeholder");
const keyboard = document.querySelector("#virtual-keyboard");
const keyboardToggle = document.querySelector("#keyboard-toggle");
const blankButton = document.querySelector("#blank-button");
const tabCloakButton = document.querySelector("#tab-cloak-button");
const selfDestructButton = document.querySelector("#self-destruct-button");
const siteFavicon = document.querySelector("#site-favicon");
const carbonTitle = document.title;
const carbonFavicon = siteFavicon.href;
let games = [];
let activeGame = null;
const keyboardRows = [
  [["Escape", "Esc"], ["1", "1"], ["2", "2"], ["3", "3"], ["4", "4"], ["5", "5"], ["6", "6"], ["7", "7"], ["8", "8"], ["9", "9"], ["0", "0"], ["-", "-"], ["=", "="], ["Backspace", "⌫", "wide"]],
  [["Tab", "Tab", "wide"], ..."QWERTYUIOP".split("").map(key => [key.toLowerCase(), key]), ["[", "["], ["]", "]"], ["\\", "\\", "wide"]],
  [["CapsLock", "Caps", "wide"], ..."ASDFGHJKL".split("").map(key => [key.toLowerCase(), key]), [";", ";"], ["'", "'"], ["Enter", "Enter", "wide"]],
  [["Shift", "Shift", "wider"], ..."ZXCVBNM".split("").map(key => [key.toLowerCase(), key]), [",", ","], [".", "."], ["/", "/"], ["Shift", "Shift", "wider"]],
  [["Control", "Ctrl", "wide"], ["Meta", "Win", "wide"], ["Alt", "Alt", "wide"], [" ", "Space", "space"], ["Alt", "Alt", "wide"], ["ContextMenu", "Menu", "wide"], ["Control", "Ctrl", "wide"], ["ArrowLeft", "←", "arrow"], [["ArrowUp", "↑", "arrow"], ["ArrowDown", "↓", "arrow"]], ["ArrowRight", "→", "arrow"]]
];

function renderGames() {
  const query = search.value.trim().toLowerCase();
  const visible = games.filter(game => game.title.toLowerCase().includes(query));
  grid.innerHTML = visible.map((game, index) => `
    <article class="game-card" tabindex="0" role="button" data-game-id="${escapeHtml(game.id)}" aria-label="Play ${escapeHtml(game.title)}">
      <div class="game-cover" style="--cover-glow:${escapeHtml(game.glow || game.color || "#d7ff5f")};--cover-card:${escapeHtml(game.color || "#d7ff5f")}">
        <span class="cover-tag">${escapeHtml(game.tag || game.title.toUpperCase())}</span>
        <span class="cover-art" aria-hidden="true">${escapeHtml(game.icon || "✳")}</span>
        <span class="cover-spot">${String(index + 1).padStart(2, "0")} / ${String(games.length).padStart(2, "0")}</span>
      </div>
      <div class="game-info"><div class="game-name-line"><span class="game-name">${escapeHtml(game.title)}</span><span class="game-arrow" aria-hidden="true">↗</span></div>
        <div class="game-meta"><span>${escapeHtml(game.tag || "READY TO PLAY")}</span><span>✳ &nbsp; BROWSER GAME</span></div></div>
    </article>`).join("");
  emptyState.hidden = visible.length > 0;
}

document.querySelector("#virtual-keyboard").innerHTML = keyboardRows.map(row =>
  `<div class="key-row">${row.map(key => Array.isArray(key[0])
    ? `<span class="arrow-cluster">${key.map(item => virtualKey(item)).join("")}</span>`
    : virtualKey(key)).join("")}</div>`).join("") + `<p>HOLD KEYS FOR MOVEMENT · SAME-ORIGIN GAMES WORK BEST</p>`;

function virtualKey([key, label, size = ""]) {
  const safeKey = key === " " ? "Space" : key;
  return `<button class="virtual-key ${size}" data-key="${escapeHtml(safeKey)}" aria-label="${escapeHtml(label === "Space" ? "Space" : label)}">${escapeHtml(label)}</button>`;
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, char => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char]);
}

function launchGame(game) {
  activeGame = game;
  document.querySelector("#dialog-title").textContent = game.title.toUpperCase();
  document.querySelector("#game-hint").textContent = game.controls || "USE YOUR KEYBOARD TO PLAY";
  placeholder.classList.toggle("visible", !game.url);
  frame.src = game.url || "about:blank";
  keyboard.hidden = true;
  keyboardToggle.setAttribute("aria-expanded", "false");
  dialog.showModal();
  document.body.classList.add("dialog-open");
}

grid.addEventListener("click", event => {
  const card = event.target.closest("[data-game-id]");
  if (card) launchGame(games.find(game => game.id === card.dataset.gameId));
});
grid.addEventListener("keydown", event => {
  if (event.key !== "Enter" && event.key !== " ") return;
  const card = event.target.closest("[data-game-id]");
  if (card) { event.preventDefault(); launchGame(games.find(game => game.id === card.dataset.gameId)); }
});
search.addEventListener("input", renderGames);
document.querySelector("#close-dialog").addEventListener("click", () => dialog.close());
dialog.addEventListener("close", () => { document.body.classList.remove("dialog-open"); frame.src = "about:blank"; activeGame = null; });
document.querySelector("#fullscreen-button").addEventListener("click", () => {
  const target = document.querySelector(".game-frame-wrap");
  if (!document.fullscreenElement) target.requestFullscreen?.(); else document.exitFullscreen?.();
});
function updateFullscreenScale() {
  const active = document.fullscreenElement === document.querySelector(".game-frame-wrap");
  const scale = active ? Math.min(1, window.innerWidth / 1920, window.innerHeight / 1080) : 1;
  document.documentElement.style.setProperty("--fullscreen-scale", String(scale));
}
document.addEventListener("fullscreenchange", updateFullscreenScale);
window.addEventListener("resize", updateFullscreenScale);
blankButton.addEventListener("click", () => {
  const blankTab = window.open("about:blank", "_blank");
  if (!blankTab) return;

  const pageCopy = document.documentElement.cloneNode(true);
  const base = blankTab.document.createElement("base");
  base.href = document.baseURI;
  pageCopy.querySelector("head").prepend(base);
  const sourceSearch = document.querySelector("#search");
  const copiedSearch = pageCopy.querySelector("#search");
  if (sourceSearch && copiedSearch) copiedSearch.setAttribute("value", sourceSearch.value);

  blankTab.document.open();
  blankTab.document.write("<!doctype html>" + pageCopy.outerHTML);
  blankTab.document.close();
});
selfDestructButton.addEventListener("click", () => { window.location.assign("https://www.google.com/"); });
function setTabCloak(enabled) {
  document.title = enabled ? "Google" : carbonTitle;
  siteFavicon.href = enabled ? new URL("google-favicon.svg", document.baseURI).href : carbonFavicon;
  tabCloakButton.setAttribute("aria-pressed", String(enabled));
  tabCloakButton.title = enabled ? "Restore Carbon tab title and icon" : "Disguise this tab as Google";
  try { localStorage.setItem("carbon-tab-cloak", String(enabled)); } catch { /* Storage may be disabled. */ }
}
tabCloakButton.addEventListener("click", () => {
  setTabCloak(tabCloakButton.getAttribute("aria-pressed") !== "true");
});
try { setTabCloak(localStorage.getItem("carbon-tab-cloak") === "true"); } catch { setTabCloak(false); }
keyboardToggle.addEventListener("click", () => {
  keyboard.hidden = !keyboard.hidden;
  keyboardToggle.setAttribute("aria-expanded", String(!keyboard.hidden));
});

function sendVirtualKey(button, type) {
  if (!activeGame?.url) return;
  const key = button.dataset.key;
  const code = key === "Space" ? "Space" : key.length === 1 ? `Key${key.toUpperCase()}` : key;
  try {
    frame.contentWindow.focus();
    const event = new KeyboardEvent(type, { key: key === "Space" ? " " : key, code, bubbles: true, cancelable: true });
    frame.contentWindow.dispatchEvent(event);
    frame.contentDocument?.dispatchEvent(new KeyboardEvent(type, { key: key === "Space" ? " " : key, code, bubbles: true, cancelable: true }));
  } catch { /* Cross-origin game frames cannot receive script generated key events. */ }
}
document.querySelectorAll(".virtual-key").forEach(button => {
  button.addEventListener("pointerdown", event => { event.preventDefault(); button.classList.add("pressed"); sendVirtualKey(button, "keydown"); });
  ["pointerup", "pointercancel", "pointerleave"].forEach(type => button.addEventListener(type, () => {
    if (button.classList.contains("pressed")) sendVirtualKey(button, "keyup");
    button.classList.remove("pressed");
  }));
});

function tickClock() {
  const now = new Date();
  document.querySelector("#clock").textContent = now.toLocaleTimeString([], { hour: "numeric", minute: "2-digit", hour12: true });
}
tickClock();
setInterval(tickClock, 30000);

fetch("games.json").then(response => { if (!response.ok) throw new Error("Could not load games.json"); return response.json(); })
  .then(data => { games = Array.isArray(data) ? data.filter(game => game && game.id && game.title) : []; renderGames(); })
  .catch(() => { grid.innerHTML = ""; emptyState.hidden = false; emptyState.textContent = "Couldn't load the game library. Check that games.json is available."; });
