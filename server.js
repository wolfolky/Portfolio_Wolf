const express = require('express');
const cors = require('cors');
const path = require('path');
const fetch = require('node-fetch');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

const HOLDINGS = [
  { ticker: 'TSLA',  name: 'Tesla',                        type: 'stock', shares: 26,  avgCost: 354.10 },
  { ticker: 'NVDA',  name: 'Nvidia',                       type: 'stock', shares: 50,  avgCost: 159.03 },
  { ticker: 'AMD',   name: 'Advanced Micro Devices',       type: 'stock', shares: 20,  avgCost: 124.44 },
  { ticker: 'GOOG',  name: 'Alphabet Class C',             type: 'stock', shares: 20,  avgCost: 201.83 },
  { ticker: 'AMZN',  name: 'Amazon',                       type: 'stock', shares: 30,  avgCost: 218.92 },
  { ticker: 'RKLB',  name: 'Rocket Lab USA',               type: 'stock', shares: 50,  avgCost: 18.95  },
  { ticker: 'META',  name: 'Meta Platforms',               type: 'stock', shares: 9,   avgCost: 670.96 },
  { ticker: 'CRDO',  name: 'Credo Technology',             type: 'stock', shares: 20,  avgCost: 147.99 },
  { ticker: 'MRVL',  name: 'Marvell',                      type: 'stock', shares: 15,  avgCost: 119.34 },
  { ticker: 'QNTM',  name: 'VanEck Quantum Computing ETF', type: 'etf',   shares: 120, avgCost: 22.15  },
  { ticker: 'BRK-B', name: 'Berkshire Hathaway B',         type: 'stock', shares: 6,   avgCost: 495.59 },
  { ticker: 'CRWD',  name: 'CrowdStrike',                  type: 'stock', shares: 4,   avgCost: 415.52 },
  { ticker: 'GLW',   name: 'Corning',                      type: 'stock', shares: 15,  avgCost: 158.04 },
  { ticker: 'IEMG',  name: 'iShares Core MSCI EM ETF',     type: 'etf',   shares: 40,  avgCost: 49.35  },
  { ticker: 'TEM',   name: 'Tempus AI',                    type: 'stock', shares: 50,  avgCost: 65.59  },
  { ticker: 'CEG',   name: 'Constellation Energy',         type: 'stock', shares: 9,   avgCost: 294.28 },
  { ticker: 'MSFT',  name: 'Microsoft',                    type: 'stock', shares: 5,   avgCost: 372.40 },
  { ticker: 'MSTR',  name: 'Strategy (MicroStrategy)',     type: 'stock', shares: 15,  avgCost: 294.34 },
  { ticker: 'WAL',   name: 'Western Alliance',             type: 'stock', shares: 17,  avgCost: 74.92  },
  { ticker: 'EOSE',  name: 'Eos Energy',                   type: 'stock', shares: 200, avgCost: 4.11   },
  { ticker: 'IREN',  name: 'IREN',                         type: 'stock', shares: 20,  avgCost: 53.02  },
  { ticker: 'ONDS',  name: 'Ondas',                        type: 'stock', shares: 110, avgCost: 9.47   },
  { ticker: 'ALMU',  name: 'Aeluma',                       type: 'stock', shares: 40,  avgCost: 13.98  },
  { ticker: 'ASPI',  name: 'ASP Isotopes',                 type: 'stock', shares: 150, avgCost: 11.55  },
  { ticker: 'MU',    name: 'Micron',                       type: 'stock', shares: 1,   avgCost: 908.05 },
  { ticker: 'TKR',   name: 'Timken',                       type: 'stock', shares: 6,   avgCost: 102.79 },
  { ticker: 'ENTG',  name: 'Entegris',                     type: 'stock', shares: 5,   avgCost: 133.58 },
];

const CASH = 38971;

let priceCache = { stocks: {}, news: [], updatedAt: null };

// Fetch prices using Yahoo Finance v8 with rotating user agents
async function fetchStockPrices() {
  const agents = [
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36',
    'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/118.0.0.0 Safari/537.36',
  ];
  const agent = agents[Math.floor(Math.random() * agents.length)];

  // Fetch in batches of 10 to avoid URL length limits
  const batches = [];
  for (let i = 0; i < HOLDINGS.length; i += 10) {
    batches.push(HOLDINGS.slice(i, i + 10));
  }

  for (const batch of batches) {
    const symbols = batch.map(function(h) { return h.ticker; }).join('%2C');
    const url = 'https://query2.finance.yahoo.com/v8/finance/spark?symbols=' + symbols + '&range=1d&interval=5m';
    try {
      const res = await fetch(url, {
        headers: {
          'User-Agent': agent,
          'Accept': '*/*',
          'Accept-Language': 'en-US,en;q=0.9',
          'Referer': 'https://finance.yahoo.com',
          'Origin': 'https://finance.yahoo.com',
        }
      });
      const data = await res.json();
      const spark = (data && data.spark && data.spark.result) || [];
      spark.forEach(function(item) {
        if (!item || !item.symbol) return;
        const resp = item.response && item.response[0];
        if (!resp) return;
        const meta = resp.meta || {};
        const closes = (resp.indicators && resp.indicators.quote && resp.indicators.quote[0] && resp.indicators.quote[0].close) || [];
        const validCloses = closes.filter(function(c) { return c !== null && c !== undefined; });
        const currentPrice = meta.regularMarketPrice || validCloses[validCloses.length - 1];
        const prevClose = meta.chartPreviousClose || validCloses[0];
        const change = currentPrice && prevClose ? currentPrice - prevClose : 0;
        const changePct = prevClose && prevClose !== 0 ? (change / prevClose) * 100 : 0;
        if (currentPrice) {
          priceCache.stocks[item.symbol] = {
            price: currentPrice,
            change: change,
            changePct: changePct,
            prevClose: prevClose,
            sparkline: validCloses.slice(-20),
          };
        }
      });
    } catch (e) {
      console.error('Batch fetch error:', e.message);
    }
  }

  // Fallback: try v7 quote endpoint for any missing tickers
  const missing = HOLDINGS.filter(function(h) { return !priceCache.stocks[h.ticker]; });
  if (missing.length > 0) {
    try {
      const symbols = missing.map(function(h) { return h.ticker; }).join(',');
      const url = 'https://query1.finance.yahoo.com/v7/finance/quote?symbols=' + symbols;
      const res = await fetch(url, {
        headers: { 'User-Agent': agent, 'Referer': 'https://finance.yahoo.com' }
      });
      const data = await res.json();
      const quotes = (data && data.quoteResponse && data.quoteResponse.result) || [];
      quotes.forEach(function(q) {
        if (q.regularMarketPrice) {
          priceCache.stocks[q.symbol] = {
            price: q.regularMarketPrice,
            change: q.regularMarketChange || 0,
            changePct: q.regularMarketChangePercent || 0,
            prevClose: q.regularMarketPreviousClose || q.regularMarketPrice,
            sparkline: [],
          };
        }
      });
    } catch (e) {
      console.error('Fallback fetch error:', e.message);
    }
  }
}

async function fetchNews() {
  const topics = ['NVDA', 'TSLA', 'AMD', 'stock+market'];
  const topic = topics[Math.floor(Math.random() * topics.length)];
  try {
    const url = 'https://query1.finance.yahoo.com/v1/finance/search?q=' + topic + '&newsCount=10&quotesCount=0';
    const res = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36', 'Referer': 'https://finance.yahoo.com' }
    });
    const data = await res.json();
    const news = (data && data.news) || [];
    priceCache.news = news.map(function(n) {
      return {
        title: n.title,
        publisher: n.publisher,
        link: n.link,
        time: n.providerPublishTime,
        thumbnail: (n.thumbnail && n.thumbnail.resolutions && n.thumbnail.resolutions[0] && n.thumbnail.resolutions[0].url) || null,
      };
    }).slice(0, 10);
  } catch (e) {
    console.error('News fetch error:', e.message);
  }
}

async function refreshAll() {
  console.log('Refreshing prices...');
  await Promise.all([fetchStockPrices(), fetchNews()]);
  priceCache.updatedAt = new Date().toISOString();
  const loaded = Object.keys(priceCache.stocks).length;
  console.log('Prices refreshed: ' + loaded + '/' + HOLDINGS.length + ' tickers loaded at ' + priceCache.updatedAt);
}

refreshAll();
setInterval(refreshAll, 60000);

function buildPortfolio() {
  const enriched = HOLDINGS.map(function(h) {
    const q = priceCache.stocks[h.ticker] || {};
    const price = q.price || h.avgCost;
    const value = price * h.shares;
    const cost = h.avgCost * h.shares;
    const pl = value - cost;
    const plPct = ((price - h.avgCost) / h.avgCost) * 100;
    return Object.assign({}, h, {
      price: price,
      value: value,
      cost: cost,
      pl: pl,
      plPct: plPct,
      changePct: q.changePct || 0,
      change: q.change || 0,
      sparkline: q.sparkline || [],
      liveData: !!q.price,
    });
  });
  const totalEquity = enriched.reduce(function(a, h) { return a + h.value; }, 0);
  const totalValue = totalEquity + CASH;
  return enriched.map(function(h) {
    return Object.assign({}, h, { allocPct: (h.value / totalValue) * 100 });
  }).sort(function(a, b) { return b.value - a.value; });
}

function buildSummary(portfolio) {
  const totalValue = portfolio.reduce(function(a, h) { return a + h.value; }, 0) + CASH;
  const totalCost = portfolio.reduce(function(a, h) { return a + h.cost; }, 0);
  const totalPL = portfolio.reduce(function(a, h) { return a + h.pl; }, 0);
  const dayChange = portfolio.reduce(function(a, h) { return a + (h.value * (h.changePct / 100)); }, 0);
  const liveCount = portfolio.filter(function(h) { return h.liveData; }).length;
  return {
    totalValue: totalValue,
    totalCost: totalCost,
    totalPL: totalPL,
    plPct: (totalPL / totalCost) * 100,
    dayChange: dayChange,
    dayChangePct: (dayChange / totalValue) * 100,
    cash: CASH,
    cashPct: (CASH / totalValue) * 100,
    positions: portfolio.length,
    winners: portfolio.filter(function(h) { return h.pl > 0; }).length,
    losers: portfolio.filter(function(h) { return h.pl < 0; }).length,
    liveCount: liveCount,
    updatedAt: priceCache.updatedAt,
  };
}

app.get('/api/portfolio', function(req, res) {
  const p = buildPortfolio();
  res.json({ ok: true, holdings: p, cash: CASH });
});

app.get('/api/portfolio/summary', function(req, res) {
  const p = buildPortfolio();
  res.json({ ok: true, summary: buildSummary(p) });
});

app.get('/api/portfolio/:ticker', function(req, res) {
  const p = buildPortfolio();
  const h = p.find(function(h) { return h.ticker.toLowerCase() === req.params.ticker.toLowerCase(); });
  if (!h) return res.status(404).json({ ok: false, error: 'Ticker not found' });
  res.json({ ok: true, holding: h });
});

app.get('/api/allocation', function(req, res) {
  const p = buildPortfolio();
  const s = buildSummary(p);
  const alloc = p.map(function(h) {
    return { ticker: h.ticker, name: h.name, type: h.type, value: h.value, pct: h.allocPct };
  }).concat([{ ticker: 'CASH', name: 'Cash', type: 'cash', value: CASH, pct: s.cashPct }]);
  res.json({ ok: true, totalValue: s.totalValue, allocation: alloc });
});

app.get('/api/news', function(req, res) {
  res.json({ ok: true, news: priceCache.news, updatedAt: priceCache.updatedAt });
});

app.get('/api/prices', function(req, res) {
  res.json({ ok: true, stocks: priceCache.stocks, updatedAt: priceCache.updatedAt });
});

app.get('/api/health', function(req, res) {
  const loaded = Object.keys(priceCache.stocks).length;
  res.json({ ok: true, status: 'running', tickersLoaded: loaded, totalTickers: HOLDINGS.length, updatedAt: priceCache.updatedAt });
});

app.get('*', function(req, res) {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, function() {
  console.log('Portfolio platform running on port ' + PORT);
});
