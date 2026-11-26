const grid = document.querySelector("#game-grid");
const emptyState = document.querySelector("#empty-state");
const search = document.querySelector("#search");
const dialog = document.querySelector("#game-dialog");
const frame = document.querySelector("#game-frame");
const placeholder = document.querySelector("#frame-placeholder");
const blankButton = document.querySelector("#blank-button");
const tabCloakButton = document.querySelector("#tab-cloak-button");
const siteFavicon = document.querySelector("#site-favicon");
const carbonTitle = document.title;
const carbonFavicon = siteFavicon.href;
const secretPanel = document.querySelector("#secret-panel");
const neonSurgeToggle = document.querySelector("#neon-surge-toggle");
const secretPanelStatus = document.querySelector("#secret-panel-status");
const surgeStorageKey = "carbon-neon-surge";
let surgeChannel = null;
let games = [];
let frameLoadTimeout = null;

const encodedTrigger = "PJ4HQ6D2PB5HQ===";
function decodeBase32(encoded) {
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
  let buffer = 0;
  let bits = 0;
  let decoded = "";
  for (const character of encoded.replace(/=+$/, "")) {
    const value = alphabet.indexOf(character);
    if (value < 0) throw new Error("Invalid Base32 trigger.");
    buffer = (buffer << 5) | value;
    bits += 5;
    if (bits >= 8) {
      bits -= 8;
      decoded += String.fromCharCode((buffer >> bits) & 255);
      buffer &= (1 << bits) - 1;
    }
  }
  return decoded;
}
const secretTrigger = decodeBase32(encodedTrigger);
let typedKeys = "";

function applyNeonSurge(enabled, broadcast = false) {
  document.documentElement.classList.toggle("carbon-surge", enabled);
  neonSurgeToggle.setAttribute("aria-pressed", String(enabled));
  neonSurgeToggle.querySelector(".surge-state").textContent = enabled ? "ON" : "OFF";
  secretPanelStatus.textContent = enabled ? "NEON SURGE IS ON · SYNCED TO OPEN TABS" : "NEON SURGE IS OFF";
  if (!broadcast) return;
  try { localStorage.setItem(surgeStorageKey, String(enabled)); } catch { /* BroadcastChannel still syncs open tabs. */ }
  surgeChannel?.postMessage({ type: "neon-surge", enabled });
}

try {
  surgeChannel = new BroadcastChannel("carbon-open-tabs");
  surgeChannel.addEventListener("message", event => {
    if (event.data?.type === "neon-surge" && typeof event.data.enabled === "boolean") applyNeonSurge(event.data.enabled);
  });
} catch { /* Storage events provide a fallback where BroadcastChannel is unavailable. */ }
window.addEventListener("storage", event => {
  if (event.key === surgeStorageKey) applyNeonSurge(event.newValue === "true");
});
try { applyNeonSurge(localStorage.getItem(surgeStorageKey) === "true"); } catch { applyNeonSurge(false); }

neonSurgeToggle.addEventListener("click", () => {
  applyNeonSurge(neonSurgeToggle.getAttribute("aria-pressed") !== "true", true);
});
document.querySelector("#close-secret-panel").addEventListener("click", () => secretPanel.close());
document.addEventListener("keydown", event => {
  if (event.ctrlKey || event.metaKey || event.altKey || dialog.open || secretPanel.open) { typedKeys = ""; return; }
  const target = event.target;
  if (!(target instanceof Element) || target.isContentEditable || target.matches("input, textarea, select")) { typedKeys = ""; return; }
  if (event.key.length !== 1) return;
  typedKeys = (typedKeys + event.key.toLowerCase()).slice(-secretTrigger.length);
  if (typedKeys !== secretTrigger) return;
  typedKeys = "";
  secretPanel.showModal();
});

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

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, char => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char]);
}

function launchGame(game) {
  clearTimeout(frameLoadTimeout);
  document.querySelector("#dialog-title").textContent = game.title.toUpperCase();
  document.querySelector("#game-hint").textContent = game.controls || "USE YOUR KEYBOARD TO PLAY";
  if (game.url) {
    document.querySelector("#frame-message-title").textContent = "Loading game…";
    document.querySelector("#frame-error-detail").textContent = "Waiting for the game to respond.";
    placeholder.classList.add("visible");
    frameLoadTimeout = setTimeout(() => showFrameError("The game did not respond in time. It may be offline or block embedding."), 15000);
  } else {
    showFrameError("No game URL is configured for this title.");
  }
  frame.src = game.url || "about:blank";
  dialog.showModal();
  document.body.classList.add("dialog-open");
}

function showFrameError(message) {
  clearTimeout(frameLoadTimeout);
  document.querySelector("#frame-message-title").textContent = "Oops, nothing to see here";
  document.querySelector("#frame-error-detail").textContent = message;
  placeholder.classList.add("visible");
}

frame.addEventListener("load", () => {
  clearTimeout(frameLoadTimeout);
  if (frame.src !== "about:blank") placeholder.classList.remove("visible");
});
frame.addEventListener("error", () => showFrameError("The game frame reported a loading error."));

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
dialog.addEventListener("close", () => { document.body.classList.remove("dialog-open"); clearTimeout(frameLoadTimeout); frame.src = "about:blank"; });
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
function tickClock() {
  const now = new Date();
  document.querySelector("#clock").textContent = now.toLocaleTimeString([], { hour: "numeric", minute: "2-digit", hour12: true });
}
tickClock();
setInterval(tickClock, 30000);

fetch("games.json").then(response => { if (!response.ok) throw new Error("Could not load games.json"); return response.json(); })
  .then(data => { games = Array.isArray(data) ? data.filter(game => game && game.id && game.title) : []; renderGames(); })
  .catch(() => { grid.innerHTML = ""; emptyState.hidden = false; emptyState.textContent = "Couldn't load the game library. Check that games.json is available."; });
