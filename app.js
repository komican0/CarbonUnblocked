const grid = document.querySelector("#game-grid");
const emptyState = document.querySelector("#empty-state");
const search = document.querySelector("#search");
const dialog = document.querySelector("#game-dialog");
const frame = document.querySelector("#game-frame");
const placeholder = document.querySelector("#frame-placeholder");
const blankButton = document.querySelector("#blank-button");
const livePanelButton = document.querySelector("#live-panel-button");
const tabCloakButton = document.querySelector("#tab-cloak-button");
const siteFavicon = document.querySelector("#site-favicon");
const carbonTitle = document.title;
const carbonFavicon = siteFavicon.href;
const secretPanel = document.querySelector("#secret-panel");
const instanceList = document.querySelector("#instance-list");
const instanceCount = document.querySelector("#instance-count");
const instanceCountLabel = document.querySelector("#instance-count-label");
const secretPanelStatus = document.querySelector("#secret-panel-status");
const selfDestructAllButton = document.querySelector("#self-destruct-all");
const heroRotatingWord = document.querySelector("#hero-rotating-word");
const heroPrefixCaret = document.querySelector("#hero-prefix-caret");
const heroWordCaret = document.querySelector("#hero-word-caret");
const realtimeConfig = window.CARBON_REALTIME || {};
const realtimeUrl = typeof realtimeConfig.url === "string" ? realtimeConfig.url.trim() : "";
const instanceId = globalThis.crypto?.randomUUID?.() || `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
const liveInstances = new Map();
const staleInstanceMs = 30000;
let instanceChannel = null;
let realtimeSocket = null;
let globalVisitorCount = null;
let realtimeRetryTimer = null;
let realtimeHeartbeat = null;
let games = [];
let frameLoadTimeout = null;
let dialogCloseTimer = null;

function currentInstanceStatus() {
  if (dialog.open) return `Playing ${document.querySelector("#dialog-title").textContent}`;
  return document.visibilityState === "hidden" ? "Open in a background tab" : "Browsing games";
}

function announceInstance(type = "presence") {
  instanceChannel?.postMessage({ type, id: instanceId, status: currentInstanceStatus(), sentAt: Date.now() });
}

function renderInstanceList() {
  const now = Date.now();
  for (const [id, instance] of liveInstances) {
    if (now - instance.seenAt > staleInstanceMs) liveInstances.delete(id);
  }
  const instances = [
    { id: instanceId, status: currentInstanceStatus(), current: true },
    ...Array.from(liveInstances.values()).map(instance => ({ ...instance, current: false }))
  ];
  instanceList.innerHTML = instances.map(instance => `
    <div class="instance-row" role="listitem" ${instance.current ? 'data-current="true"' : ""}>
      <div class="instance-row-top"><strong>${instance.current ? "THIS TAB" : `CARBON TAB · ${escapeHtml(instance.id.slice(-4).toUpperCase())}`}</strong><span>${instance.current ? "HERE" : "OPEN"}</span></div>
      <p>${escapeHtml(instance.status)}</p>
    </div>`).join("");
  instanceCount.textContent = String(globalVisitorCount ?? instances.length);
  instanceCountLabel.textContent = globalVisitorCount !== null
    ? "active visitors online"
    : "Carbon tabs open in this browser";
  secretPanelStatus.textContent = globalVisitorCount !== null
    ? "ACTIVE VISITORS ONLINE ACROSS CARBON"
    : instanceChannel
    ? `${instances.length} CARBON TAB${instances.length === 1 ? "" : "S"} FOUND IN THIS BROWSER`
    : "SHOWING THIS TAB · LOCAL SCAN UNAVAILABLE";
}

function connectRealtime() {
  if (!realtimeUrl || !/^https?:\/\//i.test(realtimeUrl) || !("WebSocket" in window)) return;
  let visitorId;
  try {
    visitorId = localStorage.getItem("carbon-visitor-id");
    if (!visitorId) {
      visitorId = globalThis.crypto?.randomUUID?.() || `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
      localStorage.setItem("carbon-visitor-id", visitorId);
    }
  } catch {
    visitorId = instanceId;
  }
  const endpoint = new URL("presence", realtimeUrl.endsWith("/") ? realtimeUrl : `${realtimeUrl}/`);
  endpoint.protocol = endpoint.protocol === "https:" ? "wss:" : "ws:";
  endpoint.searchParams.set("visitor", visitorId);
  try { realtimeSocket = new WebSocket(endpoint); }
  catch {
    globalVisitorCount = null;
    realtimeRetryTimer = setTimeout(connectRealtime, 10000);
    return;
  }
  realtimeSocket.addEventListener("open", () => {
    clearInterval(realtimeHeartbeat);
    realtimeHeartbeat = setInterval(() => {
      if (realtimeSocket?.readyState === WebSocket.OPEN) realtimeSocket.send("ping");
    }, 25000);
  });
  realtimeSocket.addEventListener("message", event => {
    try {
      const message = JSON.parse(event.data);
      if (message.type === "count" && Number.isFinite(message.count)) {
        globalVisitorCount = message.count;
        if (secretPanel.open) renderInstanceList();
      }
      if (message.type === "self-destruct-all") window.location.assign("https://www.google.com/");
    } catch { /* Ignore malformed realtime messages. */ }
  });
  realtimeSocket.addEventListener("close", () => {
    clearInterval(realtimeHeartbeat);
    realtimeSocket = null;
    globalVisitorCount = null;
    if (secretPanel.open) renderInstanceList();
    clearTimeout(realtimeRetryTimer);
    realtimeRetryTimer = setTimeout(connectRealtime, 5000);
  });
}
connectRealtime();

function scanForInstances() {
  if (!instanceChannel) {
    renderInstanceList();
    return;
  }
  secretPanelStatus.textContent = "SCANNING FOR OPEN TABS…";
  announceInstance("discover");
  renderInstanceList();
  setTimeout(() => { if (secretPanel.open) renderInstanceList(); }, 1200);
}

try {
  instanceChannel = new BroadcastChannel("carbon-instance-scan");
  instanceChannel.addEventListener("message", event => {
    const message = event.data;
    if (!message || message.id === instanceId) return;
    if (message.type === "self-destruct-all") {
      window.location.assign("https://www.google.com/");
      return;
    }
    if (message.type === "discover") {
      announceInstance();
      return;
    }
    if (message.type === "leave") liveInstances.delete(message.id);
    else if (message.type === "presence" && typeof message.status === "string") {
      liveInstances.set(message.id, { id: message.id, status: message.status, seenAt: Date.now() });
    }
    if (secretPanel.open) renderInstanceList();
  });
} catch { /* Tab discovery requires BroadcastChannel support. */ }
document.addEventListener("visibilitychange", () => announceInstance());
window.addEventListener("pagehide", () => announceInstance("leave"));
window.addEventListener("pageshow", () => announceInstance());
setInterval(() => {
  announceInstance();
  if (secretPanel.open) renderInstanceList();
}, 10000);
document.querySelector("#close-secret-panel").addEventListener("click", () => secretPanel.close());
livePanelButton.addEventListener("click", () => {
  if (!secretPanel.open) secretPanel.showModal();
  scanForInstances();
});
secretPanel.addEventListener("close", () => instanceList.replaceChildren());
selfDestructAllButton.addEventListener("click", () => {
  selfDestructAllButton.disabled = true;
  if (!realtimeUrl) {
    secretPanelStatus.textContent = "SELF-DESTRUCTING CARBON TABS IN THIS BROWSER…";
    instanceChannel?.postMessage({ type: "self-destruct-all", id: instanceId });
    setTimeout(() => window.location.assign("https://www.google.com/"), 300);
    return;
  }
  const adminToken = window.prompt("Enter the Carbon admin token to self-destruct every connected Carbon tab:");
  if (!adminToken) {
    selfDestructAllButton.disabled = false;
    secretPanelStatus.textContent = "GLOBAL SELF-DESTRUCT CANCELLED";
    return;
  }
  const endpoint = new URL("self-destruct", realtimeUrl.endsWith("/") ? realtimeUrl : `${realtimeUrl}/`);
  fetch(endpoint, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ token: adminToken }) })
    .then(response => {
      if (!response.ok) throw new Error(response.status === 401 ? "Admin token was rejected." : "Backend request failed.");
      secretPanelStatus.textContent = "SELF-DESTRUCT SENT TO ALL CONNECTED VISITORS";
      instanceChannel?.postMessage({ type: "self-destruct-all", id: instanceId });
      setTimeout(() => window.location.assign("https://www.google.com/"), 300);
    })
    .catch(error => {
      secretPanelStatus.textContent = error.message;
      selfDestructAllButton.disabled = false;
    });
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
  announceInstance();
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
function closeGameDialog() {
  if (!dialog.open || dialog.classList.contains("closing")) return;
  dialog.classList.add("closing");
  clearTimeout(dialogCloseTimer);
  dialogCloseTimer = setTimeout(() => dialog.close(), 240);
}
document.querySelector("#close-dialog").addEventListener("click", closeGameDialog);
dialog.addEventListener("cancel", event => { event.preventDefault(); closeGameDialog(); });
dialog.addEventListener("animationend", event => {
  if (event.target !== dialog || event.animationName !== "carbon-dialog-out") return;
  clearTimeout(dialogCloseTimer);
  dialog.close();
});
dialog.addEventListener("close", () => { dialog.classList.remove("closing"); document.body.classList.remove("dialog-open"); clearTimeout(frameLoadTimeout); clearTimeout(dialogCloseTimer); frame.src = "about:blank"; announceInstance(); });
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

function startHeadlineTyping() {
  heroRotatingWord.textContent = "";
  heroPrefixCaret.hidden = false;
  heroWordCaret.hidden = true;
  const pause = milliseconds => new Promise(resolve => setTimeout(resolve, milliseconds));
  (async () => {
    const words = ["round.", "game.", "module."];
    await pause(650);
    while (true) {
      for (const word of words) {
        heroPrefixCaret.hidden = true;
        heroWordCaret.hidden = false;
        for (const character of word) {
          heroRotatingWord.textContent += character;
          await pause(115);
        }
        await pause(1250);
        while (heroRotatingWord.textContent.length) {
          heroRotatingWord.textContent = heroRotatingWord.textContent.slice(0, -1);
          await pause(85);
        }
        heroWordCaret.hidden = true;
        heroPrefixCaret.hidden = false;
        await pause(250);
      }
    }
  })();
}
startHeadlineTyping();

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
