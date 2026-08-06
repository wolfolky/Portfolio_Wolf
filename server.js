const express = require('express');
const cors = require('cors');
const path = require('path');
const fetch = require('node-fetch');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

const FINNHUB_KEY = process.env.FINNHUB_KEY || 'd9qemfpr01qk3buvleb0d9qemfpr01qk3buvlebg';

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
  { ticker: 'BRK.B', name: 'Berkshire Hathaway B',         type: 'stock', shares: 6,   avgCost: 495.59 },
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

// Fetch one quote from Finnhub
function fetchQuote(ticker) {
  var url = 'https://finnhub.io/api/v1/quote?symbol=' + ticker + '&token=' + FINNHUB_KEY;
  return fetch(url)
    .then(function(res) { return res.json(); })
    .then(function(data) {
      if (data && data.c && data.c > 0) {
        var change = data.c - data.pc;
        var changePct = data.pc > 0 ? (change / data.pc) * 100 : 0;
        priceCache.stocks[ticker] = {
          price: data.c,
          change: change,
          changePct: changePct,
          prevClose: data.pc,
          high: data.h,
          low: data.l,
          open: data.o,
        };
        console.log('OK ' + ticker + ' $' + data.c);
      } else {
        console.log('NO DATA ' + ticker);
      }
    })
    .catch(function(e) {
      console.error('Error ' + ticker + ': ' + e.message);
    });
}

// Fetch all quotes with a small delay between each to respect rate limits (60/min free tier)
async function fetchAllPrices() {
  console.log('Fetching ' + HOLDINGS.length + ' tickers from Finnhub...');
  for (var i = 0; i < HOLDINGS.length; i++) {
    await fetchQuote(HOLDINGS[i].ticker);
    // 1.1 second delay = ~54 requests/min, safely under free tier 60/min limit
    if (i < HOLDINGS.length - 1) {
      await new Promise(function(r) { setTimeout(r, 1100); });
    }
  }
  console.log('All tickers fetched. Loaded: ' + Object.keys(priceCache.stocks).length + '/' + HOLDINGS.length);
}

async function fetchNews() {
  try {
    var url = 'https://finnhub.io/api/v1/news?category=general&token=' + FINNHUB_KEY;
    var res = await fetch(url);
    var data = await res.json();
    if (Array.isArray(data)) {
      priceCache.news = data.slice(0, 10).map(function(n) {
        return {
          title: n.headline,
          publisher: n.source,
          link: n.url,
          time: n.datetime,
          thumbnail: n.image || null,
        };
      });
      console.log('News loaded: ' + priceCache.news.length + ' articles');
    }
  } catch (e) {
    console.error('News fetch error:', e.message);
  }
}

async function refreshAll() {
  await Promise.all([fetchAllPrices(), fetchNews()]);
  priceCache.updatedAt = new Date().toISOString();
  console.log('Refresh complete at ' + priceCache.updatedAt);
}

// Initial load + refresh every 2 minutes (27 tickers x 1.1s = ~30s per cycle)
refreshAll();
setInterval(refreshAll, 120000);

function buildPortfolio() {
  var enriched = HOLDINGS.map(function(h) {
    var q = priceCache.stocks[h.ticker] || {};
    var price = q.price || h.avgCost;
    var value = price * h.shares;
    var cost = h.avgCost * h.shares;
    var pl = value - cost;
    var plPct = ((price - h.avgCost) / h.avgCost) * 100;
    return Object.assign({}, h, {
      price: price,
      value: value,
      cost: cost,
      pl: pl,
      plPct: plPct,
      changePct: q.changePct || 0,
      change: q.change || 0,
      high: q.high,
      low: q.low,
      liveData: !!q.price,
    });
  });
  var totalEquity = enriched.reduce(function(a, h) { return a + h.value; }, 0);
  var totalValue = totalEquity + CASH;
  return enriched.map(function(h) {
    return Object.assign({}, h, { allocPct: (h.value / totalValue) * 100 });
  }).sort(function(a, b) { return b.value - a.value; });
}

function buildSummary(portfolio) {
  var totalValue = portfolio.reduce(function(a, h) { return a + h.value; }, 0) + CASH;
  var totalCost = portfolio.reduce(function(a, h) { return a + h.cost; }, 0);
  var totalPL = portfolio.reduce(function(a, h) { return a + h.pl; }, 0);
  var dayChange = portfolio.reduce(function(a, h) { return a + (h.value * (h.changePct / 100)); }, 0);
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
    liveCount: portfolio.filter(function(h) { return h.liveData; }).length,
    updatedAt: priceCache.updatedAt,
  };
}

app.get('/api/portfolio', function(req, res) {
  var p = buildPortfolio();
  res.json({ ok: true, holdings: p, cash: CASH });
});

app.get('/api/portfolio/summary', function(req, res) {
  var p = buildPortfolio();
  res.json({ ok: true, summary: buildSummary(p) });
});

app.get('/api/portfolio/:ticker', function(req, res) {
  var p = buildPortfolio();
  var h = p.find(function(h) { return h.ticker.toLowerCase() === req.params.ticker.toLowerCase(); });
  if (!h) return res.status(404).json({ ok: false, error: 'Ticker not found' });
  res.json({ ok: true, holding: h });
});

app.get('/api/allocation', function(req, res) {
  var p = buildPortfolio();
  var s = buildSummary(p);
  var alloc = p.map(function(h) {
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
  var loaded = Object.keys(priceCache.stocks).length;
  res.json({ ok: true, status: 'running', tickersLoaded: loaded, totalTickers: HOLDINGS.length, updatedAt: priceCache.updatedAt });
});

app.get('*', function(req, res) {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, function() {
  console.log('Portfolio platform running on port ' + PORT);
});
