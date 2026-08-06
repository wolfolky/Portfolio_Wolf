# Portfolio Platform v2

Bloomberg-style personal portfolio tracker with **live prices** from Yahoo Finance & CoinGecko.

## Deploy to Railway (3 steps)

1. Push this folder to a new GitHub repo
2. Go to [railway.app](https://railway.app) → **New Project** → **Deploy from GitHub repo**
3. Select your repo — Railway auto-detects Node.js and deploys in ~60 seconds

Your live URL: `https://your-app.up.railway.app`

## Features

- **Live prices** — auto-refreshes every 60 seconds from Yahoo Finance
- **5 pages** — Overview, Holdings, Charts, News, API Docs
- **Ticker tape** — scrolling live prices in the top bar
- **Day movers** — top movers table on overview
- **Dark Bloomberg-style** UI with IBM Plex Mono font

## API Endpoints

| Endpoint | Description |
|---|---|
| `GET /api/portfolio` | All holdings with live prices, P&L |
| `GET /api/portfolio/summary` | Total value, P&L, day change |
| `GET /api/portfolio/:ticker` | Single holding (e.g. `/api/portfolio/NVDA`) |
| `GET /api/allocation` | Allocation breakdown |
| `GET /api/news` | Market news |
| `GET /api/prices` | Raw price cache |
| `GET /api/health` | Health check |

## Update holdings

Edit the `HOLDINGS` array in `server.js`:

```js
{ ticker: 'AAPL', name: 'Apple', type: 'stock', shares: 10, avgCost: 150.00 }
```

Types: `stock` / `etf` / `crypto`

## Run locally

```bash
npm install
npm start
# → http://localhost:3000
```
