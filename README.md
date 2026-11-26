# Carbon

A small, static browser arcade built with HTML, CSS, and vanilla JavaScript.

## Run it

Serve this folder over HTTP (the browser fetches `games.json`):

```sh
python -m http.server 8000
```

Then open `http://localhost:8000`.

## Add a game

Edit `games.json` and add an entry like this:

```json
{
  "id": "my-game",
  "title": "My Game",
  "icon": "✦",
  "tag": "QUICK PLAY",
  "color": "#d7ff5f",
  "glow": "#91de5b",
  "url": "games/my-game/index.html",
  "controls": "ARROW KEYS TO MOVE"
}
```

Put self-hosted games in a subfolder and point `url` at their entry HTML file. A blank URL shows a “coming soon” placeholder.

The touch controls provide a 60% keyboard layout plus arrow keys, and send synthetic keyboard events to the game iframe. Browsers restrict this across origins, so they work best when a game is hosted on the same origin as this site; cross-origin games need their own touch support.

## Realtime panel backend

The Carbon live panel can show active browser profiles and broadcast the global self-destruct action after the [Cloudflare Worker](backend/README.md) is deployed. Until its URL is set in `realtime-config.js`, the visitor count falls back to tabs in the current browser and global broadcast stays unavailable.
