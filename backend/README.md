# Carbon realtime backend

This Cloudflare Worker provides an approximate active visitor count and a server-side broadcast to every connected Carbon page. It keeps only random first-party visitor IDs on live WebSocket connections; it does not store IP addresses or browsing history.

## Deploy

From this `backend` directory, install and authenticate Wrangler, then run:

```sh
npx wrangler login
npx wrangler deploy
npx wrangler secret put ADMIN_TOKEN
```

The first deploy creates the Worker and Durable Object. `secret put` then adds the private token as a Worker secret.

Use a long random admin token. The secret stays in Cloudflare and is requested in a prompt when the global self-destruct button is used. Do not put it in `realtime-config.js` or any public source file.

Copy the deployed `https://carbon-realtime.<your-subdomain>.workers.dev` URL into `realtime-config.js` as `window.CARBON_REALTIME = { url: "..." }`, then publish the site. Refresh open Carbon pages to connect them. The panel count is the number of unique browser profiles connected to the Worker, so it is an approximate active visitor count rather than a verified person count.
