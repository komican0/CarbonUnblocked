const ALLOWED_ORIGINS = new Set([
  "https://carbonug.lol",
  "https://www.carbonug.lol",
]);

function corsHeaders(origin) {
  return {
    "Access-Control-Allow-Origin": ALLOWED_ORIGINS.has(origin) ? origin : "https://carbonug.lol",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Vary": "Origin",
  };
}

export default {
  async fetch(request, env) {
    const origin = request.headers.get("Origin") || "";
    const url = new URL(request.url);
    if (request.method === "OPTIONS") return new Response(null, { headers: corsHeaders(origin) });

    if (url.pathname === "/presence" && request.headers.get("Upgrade")?.toLowerCase() === "websocket") {
      if (!ALLOWED_ORIGINS.has(origin)) return new Response("Origin not allowed", { status: 403 });
      const visitor = url.searchParams.get("visitor") || "";
      if (!/^[a-zA-Z0-9-]{8,80}$/.test(visitor)) return new Response("Invalid visitor id", { status: 400 });
      const room = env.CARBON_ROOM.get(env.CARBON_ROOM.idFromName("global"));
      return room.fetch(new Request(`https://carbon.internal/presence?visitor=${encodeURIComponent(visitor)}`, request));
    }

    if (url.pathname === "/self-destruct" && request.method === "POST") {
      if (!ALLOWED_ORIGINS.has(origin)) return new Response("Origin not allowed", { status: 403, headers: corsHeaders(origin) });
      let body;
      try { body = await request.json(); } catch { body = {}; }
      if (!env.ADMIN_TOKEN || typeof body.token !== "string" || body.token !== env.ADMIN_TOKEN) {
        return new Response("Unauthorized", { status: 401, headers: corsHeaders(origin) });
      }
      const room = env.CARBON_ROOM.get(env.CARBON_ROOM.idFromName("global"));
      const result = await room.fetch("https://carbon.internal/self-destruct", { method: "POST" });
      return new Response(await result.text(), { status: result.status, headers: corsHeaders(origin) });
    }

    if (url.pathname === "/health") return new Response("Carbon realtime is online", { headers: corsHeaders(origin) });
    return new Response("Not found", { status: 404, headers: corsHeaders(origin) });
  },
};

export class CarbonRoom {
  constructor(state) {
    this.state = state;
    this.sockets = new Set();
    this.state.setWebSocketAutoResponse(
      new WebSocketRequestResponsePair("ping", "pong"),
    );
  }

  async fetch(request) {
    const url = new URL(request.url);
    if (url.pathname === "/self-destruct" && request.method === "POST") {
      this.broadcast({ type: "self-destruct-all" });
      return new Response("Self-destruct broadcast sent", { status: 200 });
    }
    if (url.pathname !== "/presence") return new Response("Not found", { status: 404 });

    const pair = new WebSocketPair();
    const [client, server] = Object.values(pair);
    this.state.acceptWebSocket(server);
    server.serializeAttachment({ visitor: url.searchParams.get("visitor") });
    server.send(JSON.stringify({ type: "connected" }));
    this.broadcastCount();
    return new Response(null, { status: 101, webSocket: client });
  }

  webSocketMessage() { /* Heartbeat pings are handled by the automatic pair above. */ }

  webSocketClose(socket) {
    try { socket.close(); } catch { /* It may already be closed. */ }
    this.broadcastCount();
  }

  webSocketError(socket) {
    try { socket.close(); } catch { /* It may already be closed. */ }
    this.broadcastCount();
  }

  broadcastCount() {
    const visitors = new Set();
    for (const socket of this.state.getWebSockets()) {
      const attachment = socket.deserializeAttachment();
      if (attachment?.visitor) visitors.add(attachment.visitor);
    }
    this.broadcast({ type: "count", count: visitors.size });
  }

  broadcast(message) {
    const payload = JSON.stringify(message);
    for (const socket of this.state.getWebSockets()) {
      try { socket.send(payload); } catch { /* A closing connection may reject sends. */ }
    }
  }
}
