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
  { ticker:'GOOG',  name:'Alphabet Class A',       type:'stock',     shares:20,    avgCost:190.18 },
  { ticker:'AMZN',  name:'Amazon',                 type:'stock',     shares:20,    avgCost:194.78 },
  { ticker:'META',  name:'Meta Platforms',         type:'stock',     shares:10,    avgCost:567.50 },
  { ticker:'MSFT',  name:'Microsoft',              type:'stock',     shares:5,     avgCost:404.00 },
  { ticker:'NVDA',  name:'Nvidia',                 type:'stock',     shares:45,    avgCost:159.21 },
  { ticker:'TSLA',  name:'Tesla',                  type:'stock',     shares:29,    avgCost:326.65 },
  { ticker:'RKLB',  name:'Rocket Lab USA',         type:'stock',     shares:40,    avgCost:18.95  },
  { ticker:'EOSE',  name:'Eos Energy',             type:'stock',     shares:380,   avgCost:5.14   },
  { ticker:'MSTR',  name:'MicroStrategy',          type:'stock',     shares:15,    avgCost:297.69 },
  { ticker:'TEM',   name:'Tempus AI',              type:'stock',     shares:50,    avgCost:68.00  },
  { ticker:'ASPI',  name:'ASP Isotopes',           type:'stock',     shares:150,   avgCost:11.02  },
  { ticker:'IREN',  name:'IREN',                   type:'stock',     shares:20,    avgCost:53.02  },
  { ticker:'CRDO',  name:'Credo Technology',       type:'stock',     shares:20,    avgCost:154.93 },
  { ticker:'ONDS',  name:'Ondas',                  type:'stock',     shares:220,   avgCost:9.26   },
  { ticker:'MRVL',  name:'Marvell Technology',     type:'stock',     shares:20,    avgCost:148.58 },
  { ticker:'GLW',   name:'Corning',                type:'stock',     shares:15,    avgCost:158.04 },
  { ticker:'ALMU',  name:'Aeluma',                 type:'stock',     shares:105,   avgCost:16.18  },
  { ticker:'CEG',   name:'Constellation Energy',   type:'stock',     shares:12,    avgCost:291.39 },
  { ticker:'MU',    name:'Micron Technology',      type:'stock',     shares:6,     avgCost:955.54 },
  { ticker:'ENTG',  name:'Entegris',               type:'stock',     shares:10,    avgCost:146.34 },
  { ticker:'SPCX',  name:'SpaceX',                 type:'stock',     shares:40,    avgCost:131.22 },
  { ticker:'ASTS',  name:'AST SpaceMobile',        type:'stock',     shares:42,    avgCost:71.03  },
  { ticker:'HL',    name:'Hecla Mining',            type:'stock',     shares:140,   avgCost:15.29  },
  { ticker:'FCX',   name:'Freeport-McMoRan',       type:'stock',     shares:20,    avgCost:61.50  },
  { ticker:'MP',    name:'MP Materials',           type:'stock',     shares:40,    avgCost:48.66  },
  { ticker:'QNTM',  name:'VanEck Quantum ETF',     type:'etf',       shares:120,   avgCost:23.73  },
  { ticker:'IEMG',  name:'iShares MSCI EM ETF',    type:'etf',       shares:40,    avgCost:57.80  },
  { ticker:'SEC0',  name:'iShares Semiconductors', type:'etf',       shares:50,    avgCost:23.34  },
  { ticker:'BTC',   name:'Bitcoin',                type:'crypto',    shares:0.0672,avgCost:101992 },
  { ticker:'XRP',   name:'Ripple',                 type:'crypto',    shares:800,   avgCost:2.59   },
  { ticker:'ETH',   name:'Ethereum',               type:'crypto',    shares:1,     avgCost:3546   },
  { ticker:'NEXO',  name:'NEXO',                   type:'crypto',    shares:2724,  avgCost:1.24   },
  { ticker:'RND',   name:'Render',                 type:'crypto',    shares:300,   avgCost:3.85   },
];

const CASH = 38971;

// Pre-seed cache with avg cost prices so API returns data immediately on first request
// Live prices will overwrite these as Finnhub responds
var priceCache = { stocks: {}, news: [], updatedAt: new Date().toISOString(), seeded: false };

function seedCache() {
  HOLDINGS.forEach(function(h) {
    priceCache.stocks[h.ticker] = {
      price: h.avgCost, change: 0, changePct: 0,
      prevClose: h.avgCost, high: h.avgCost, low: h.avgCost, open: h.avgCost,
      seeded: true
    };
  });
  priceCache.seeded = true;
  console.log('Cache seeded with avg costs — live prices loading in background...');
}

seedCache();

function delay(ms) { return new Promise(function(r) { setTimeout(r, ms); }); }

async function fetchQuote(ticker) {
  var url = 'https://finnhub.io/api/v1/quote?symbol=' + ticker + '&token=' + FINNHUB_KEY;
  try {
    var res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
    var data = await res.json();
    if (data && data.c && data.c > 0) {
      var change = data.c - data.pc;
      var changePct = data.pc > 0 ? (change / data.pc) * 100 : 0;
      priceCache.stocks[ticker] = {
        price: data.c, change: change, changePct: changePct,
        prevClose: data.pc, high: data.h, low: data.l, open: data.o,
        seeded: false
      };
      return true;
    }
  } catch(e) { console.error('Quote error ' + ticker + ': ' + e.message); }
  return false;
}

async function fetchAllPrices() {
  console.log('Fetching live prices from Finnhub...');
  var tickers = HOLDINGS.map(function(h) { return h.ticker; });
  for (var i = 0; i < tickers.length; i++) {
    var ok = await fetchQuote(tickers[i]);
    console.log((ok ? 'OK' : 'MISS') + ' ' + tickers[i] + ' (' + (i+1) + '/' + tickers.length + ')');
    if (i < tickers.length - 1) await delay(1200);
  }
  priceCache.updatedAt = new Date().toISOString();
  var liveCount = Object.values(priceCache.stocks).filter(function(q) { return !q.seeded; }).length;
  console.log('Done. ' + liveCount + '/' + tickers.length + ' live prices loaded.');
}

async function fetchNews() {
  try {
    var res = await fetch('https://finnhub.io/api/v1/news?category=general&token=' + FINNHUB_KEY);
    var data = await res.json();
    if (Array.isArray(data)) {
      priceCache.news = data.slice(0, 10).map(function(n) {
        return { title: n.headline, publisher: n.source, link: n.url, time: n.datetime, thumbnail: n.image || null };
      });
    }
  } catch(e) { console.error('News error:', e.message); }
}

// Start fetching live prices immediately on startup
fetchAllPrices().then(function() { fetchNews(); });
setInterval(function() { fetchAllPrices().then(function() { fetchNews(); }); }, 120000);

function buildPortfolio() {
  var enriched = HOLDINGS.map(function(h) {
    var q = priceCache.stocks[h.ticker] || { price: h.avgCost, change: 0, changePct: 0 };
    var price = q.price || h.avgCost;
    var value = price * h.shares;
    var cost = h.avgCost * h.shares;
    var pl = value - cost;
    var plPct = ((price - h.avgCost) / h.avgCost) * 100;
    return Object.assign({}, h, {
      price: price, value: value, cost: cost, pl: pl, plPct: plPct,
      changePct: q.changePct || 0, change: q.change || 0,
      liveData: !q.seeded
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
  var liveCount = portfolio.filter(function(h) { return h.liveData; }).length;
  return {
    totalValue: totalValue, totalCost: totalCost, totalPL: totalPL,
    plPct: (totalPL / totalCost) * 100, dayChange: dayChange,
    dayChangePct: (dayChange / totalValue) * 100, cash: CASH,
    cashPct: (CASH / totalValue) * 100, positions: portfolio.length,
    winners: portfolio.filter(function(h) { return h.pl > 0; }).length,
    losers: portfolio.filter(function(h) { return h.pl < 0; }).length,
    liveCount: liveCount, updatedAt: priceCache.updatedAt
  };
}

const TRANSACTIONS = [
  { symbol:'AMD',   name:'Advanced Micro Devices', category:'stock',     spent:11019, received:15028, pl:4009,   status:'closed' },
  { symbol:'CRWD',  name:'CrowdStrike',             category:'stock',     spent:2770,  received:4625,  pl:1856,   status:'closed' },
  { symbol:'BRK.B', name:'Berkshire Hathaway B',    category:'stock',     spent:10433, received:11809, pl:1376,   status:'closed' },
  { symbol:'PLTR',  name:'Palantir',                category:'stock',     spent:2711,  received:3945,  pl:1233,   status:'closed' },
  { symbol:'AVGO',  name:'Broadcom',                category:'stock',     spent:2348,  received:3325,  pl:977,    status:'closed' },
  { symbol:'AAPL',  name:'Apple',                   category:'stock',     spent:5884,  received:6782,  pl:898,    status:'closed' },
  { symbol:'ASME',  name:'ASML',                    category:'stock',     spent:2917,  received:3720,  pl:803,    status:'closed' },
  { symbol:'SNPS',  name:'Synopsis',                category:'stock',     spent:2503,  received:3277,  pl:774,    status:'closed' },
  { symbol:'OSCR',  name:'Oscar Health',            category:'stock',     spent:2008,  received:2773,  pl:765,    status:'closed' },
  { symbol:'SOFI',  name:'SoFi Technologies',       category:'stock',     spent:5975,  received:6657,  pl:682,    status:'closed' },
  { symbol:'FIG',   name:'Figma',                   category:'stock',     spent:2583,  received:3042,  pl:459,    status:'closed' },
  { symbol:'APP',   name:'Applovin',                category:'stock',     spent:1932,  received:2389,  pl:457,    status:'closed' },
  { symbol:'IONQ',  name:'IonQ',                    category:'stock',     spent:1297,  received:1713,  pl:416,    status:'closed' },
  { symbol:'RKT',   name:'Rocket Companies',        category:'stock',     spent:2011,  received:2364,  pl:353,    status:'closed' },
  { symbol:'TKR',   name:'Timken',                  category:'stock',     spent:1028,  received:1334,  pl:306,    status:'closed' },
  { symbol:'OUST',  name:'Ouster',                  category:'stock',     spent:2112,  received:2398,  pl:286,    status:'closed' },
  { symbol:'SKYT',  name:'Skywater Technology',     category:'stock',     spent:1377,  received:1644,  pl:267,    status:'closed' },
  { symbol:'SIRI',  name:'Sirius XM',               category:'stock',     spent:3067,  received:3288,  pl:221,    status:'closed' },
  { symbol:'BAC',   name:'Bank of America',         category:'stock',     spent:2388,  received:2478,  pl:90,     status:'closed' },
  { symbol:'SNOW',  name:'Snowflake',               category:'stock',     spent:1646,  received:1692,  pl:46,     status:'closed' },
  { symbol:'O',     name:'Realty Income',           category:'stock',     spent:1200,  received:1133,  pl:-67,    status:'closed' },
  { symbol:'CSCO',  name:'Cisco',                   category:'stock',     spent:3074,  received:3044,  pl:-30,    status:'closed' },
  { symbol:'NOW',   name:'ServiceNow',              category:'stock',     spent:724,   received:699,   pl:-25,    status:'closed' },
  { symbol:'NFLX',  name:'Netflix',                 category:'stock',     spent:5330,  received:5233,  pl:-97,    status:'closed' },
  { symbol:'CVX',   name:'Chevron',                 category:'stock',     spent:3240,  received:2985,  pl:-255,   status:'closed' },
  { symbol:'HD',    name:'Home Depot',              category:'stock',     spent:2350,  received:1998,  pl:-352,   status:'closed' },
  { symbol:'PATH',  name:'UiPath',                  category:'stock',     spent:2782,  received:2509,  pl:-273,   status:'closed' },
  { symbol:'DELL',  name:'Dell Technologies',       category:'stock',     spent:2599,  received:2041,  pl:-558,   status:'closed' },
  { symbol:'ZETA',  name:'Zeta Global',             category:'stock',     spent:3719,  received:3351,  pl:-368,   status:'closed' },
  { symbol:'HIMS',  name:'Hims & Hers Health',      category:'stock',     spent:2811,  received:1301,  pl:-1510,  status:'closed' },
  { symbol:'BABA',  name:'Alibaba',                 category:'stock',     spent:5555,  received:3946,  pl:-1609,  status:'closed' },
  { symbol:'RKLB',  name:'Rocket Lab (partial)',    category:'stock',     spent:1497,  received:2123,  pl:626,    status:'partial'},
  { symbol:'GOOG',  name:'Alphabet (partial)',       category:'stock',     spent:1090,  received:1610,  pl:520,    status:'partial'},
  { symbol:'TSLA',  name:'Tesla (partial)',          category:'stock',     spent:9327,  received:9753,  pl:426,    status:'partial'},
  { symbol:'META',  name:'Meta (partial)',           category:'stock',     spent:8525,  received:12558, pl:4033,   status:'partial'},
  { symbol:'MSFT',  name:'Microsoft (partial)',      category:'stock',     spent:7831,  received:14830, pl:6999,   status:'partial'},
  { symbol:'AMZN',  name:'Amazon (partial)',         category:'stock',     spent:8640,  received:26964, pl:18324,  status:'partial'},
  { symbol:'EOSE',  name:'Eos Energy (open)',        category:'stock',     spent:3171,  received:2905,  pl:0,      status:'open'   },
  { symbol:'TEM',   name:'Tempus AI',               category:'stock',     spent:3280,  received:0,     pl:0,      status:'open'   },
  { symbol:'ASPI',  name:'ASP Isotopes',            category:'stock',     spent:1732,  received:0,     pl:0,      status:'open'   },
  { symbol:'CRDO',  name:'Credo Technology',        category:'stock',     spent:3668,  received:1102,  pl:0,      status:'open'   },
  { symbol:'ONDS',  name:'Ondas',                   category:'stock',     spent:2346,  received:473,   pl:0,      status:'open'   },
  { symbol:'MRVL',  name:'Marvell Technology',      category:'stock',     spent:3683,  received:2262,  pl:0,      status:'open'   },
  { symbol:'GLW',   name:'Corning',                 category:'stock',     spent:3091,  received:926,   pl:0,      status:'open'   },
  { symbol:'ALMU',  name:'Aeluma',                  category:'stock',     spent:2235,  received:932,   pl:0,      status:'open'   },
  { symbol:'CEG',   name:'Constellation Energy',    category:'stock',     spent:5673,  received:2486,  pl:0,      status:'open'   },
  { symbol:'MU',    name:'Micron Technology',       category:'stock',     spent:5736,  received:0,     pl:0,      status:'open'   },
  { symbol:'SPCX',  name:'SpaceX',                  category:'stock',     spent:5053,  received:0,     pl:0,      status:'open'   },
  { symbol:'ASTS',  name:'AST SpaceMobile',         category:'stock',     spent:3032,  received:0,     pl:0,      status:'open'   },
  { symbol:'HL',    name:'Hecla Mining',             category:'stock',     spent:2141,  received:0,     pl:0,      status:'open'   },
  { symbol:'FCX',   name:'Freeport-McMoRan',        category:'stock',     spent:1230,  received:0,     pl:0,      status:'open'   },
  { symbol:'MP',    name:'MP Materials',            category:'stock',     spent:1947,  received:0,     pl:0,      status:'open'   },
  { symbol:'ENTG',  name:'Entegris',                category:'stock',     spent:669,   received:680,   pl:11,     status:'partial'},
  { symbol:'IREN',  name:'IREN',                    category:'stock',     spent:1722,  received:408,   pl:0,      status:'open'   },
  { symbol:'VUAA',  name:'S&P500 ETF ACC',          category:'etf',       spent:7401,  received:7089,  pl:-312,   status:'closed' },
  { symbol:'NQSE',  name:'iShares VII',             category:'etf',       spent:2600,  received:2723,  pl:123,    status:'closed' },
  { symbol:'EQQB',  name:'NASDAQ ETF ACC',          category:'etf',       spent:374,   received:418,   pl:44,     status:'closed' },
  { symbol:'COPA',  name:'WisdomTree Copper',       category:'etf',       spent:1551,  received:1651,  pl:100,    status:'closed' },
  { symbol:'O4J0',  name:'iShares S&P 500 EW',     category:'etf',       spent:1488,  received:1505,  pl:17,     status:'closed' },
  { symbol:'QDV5',  name:'iShares MSCI India',      category:'etf',       spent:2393,  received:2253,  pl:-140,   status:'closed' },
  { symbol:'IS04',  name:'iShares Treasury 20+',    category:'etf',       spent:5017,  received:4171,  pl:-846,   status:'closed' },
  { symbol:'QNTM',  name:'VanEck Quantum ETF',      category:'etf',       spent:2829,  received:0,     pl:0,      status:'open'   },
  { symbol:'IEMA',  name:'iShares MSCI EM',         category:'etf',       spent:2316,  received:0,     pl:0,      status:'open'   },
  { symbol:'SEC0',  name:'iShares Semiconductors',  category:'etf',       spent:1167,  received:0,     pl:0,      status:'open'   },
  { symbol:'BTC',   name:'Bitcoin (partial)',        category:'crypto',    spent:13847, received:6638,  pl:-7209,  status:'partial'},
  { symbol:'XRP',   name:'Ripple (partial)',         category:'crypto',    spent:6268,  received:3600,  pl:-2668,  status:'partial'},
  { symbol:'ETH',   name:'Ethereum',                category:'crypto',    spent:3581,  received:0,     pl:0,      status:'open'   },
  { symbol:'NEXO',  name:'NEXO',                    category:'crypto',    spent:3442,  received:0,     pl:0,      status:'open'   },
  { symbol:'RND',   name:'Render',                  category:'crypto',    spent:1167,  received:0,     pl:0,      status:'open'   },
  { symbol:'XAU',   name:'Gold',                    category:'commodity',  spent:3493,  received:3818,  pl:326,    status:'closed' },
  { symbol:'XAG',   name:'Silver',                  category:'commodity',  spent:2940,  received:2728,  pl:-212,   status:'closed' },
  { symbol:'XPT',   name:'Platinum',                category:'commodity',  spent:4995,  received:3618,  pl:-1377,  status:'closed' },
];

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
  if (!h) return res.status(404).json({ ok: false, error: 'Not found' });
  res.json({ ok: true, holding: h });
});
app.get('/api/allocation', function(req, res) {
  var p = buildPortfolio(); var s = buildSummary(p);
  var alloc = p.map(function(h) { return { ticker: h.ticker, name: h.name, type: h.type, value: h.value, pct: h.allocPct }; })
    .concat([{ ticker: 'CASH', name: 'Cash', type: 'cash', value: CASH, pct: s.cashPct }]);
  res.json({ ok: true, totalValue: s.totalValue, allocation: alloc });
});
app.get('/api/transactions', function(req, res) {
  var cat = req.query.category;
  var data = cat ? TRANSACTIONS.filter(function(t) { return t.category === cat; }) : TRANSACTIONS;
  res.json({ ok: true, transactions: data, summary: { totalSpent: data.reduce(function(a,t){return a+t.spent;},0), totalReceived: data.reduce(function(a,t){return a+t.received;},0), count: data.length } });
});
app.get('/api/transactions/categories', function(req, res) {
  var cats = ['stock','etf','crypto','commodity'];
  var result = cats.map(function(cat) {
    var data = TRANSACTIONS.filter(function(t) { return t.category === cat; });
    var spent = data.reduce(function(a,t){return a+t.spent;},0);
    var received = data.reduce(function(a,t){return a+t.received;},0);
    var pl = data.filter(function(t){return t.received>0;}).reduce(function(a,t){return a+t.pl;},0);
    return { category: cat, count: data.length, totalSpent: spent, totalReceived: received, realizedPL: pl, plPct: spent>0?(pl/spent)*100:0, winners: data.filter(function(t){return t.pl>0;}).length, losers: data.filter(function(t){return t.pl<0;}).length };
  });
  res.json({ ok: true, categories: result });
});
app.get('/api/news', function(req, res) { res.json({ ok: true, news: priceCache.news, updatedAt: priceCache.updatedAt }); });
app.get('/api/prices', function(req, res) { res.json({ ok: true, stocks: priceCache.stocks, updatedAt: priceCache.updatedAt }); });
app.get('/api/health', function(req, res) {
  var liveCount = Object.values(priceCache.stocks).filter(function(q){return !q.seeded;}).length;
  res.json({ ok: true, status: 'running', tickersLoaded: liveCount, totalTickers: HOLDINGS.length, updatedAt: priceCache.updatedAt });
});
app.get('*', function(req, res) { res.sendFile(path.join(__dirname, 'public', 'index.html')); });
app.listen(PORT, function() { console.log('Portfolio running on port ' + PORT); });
