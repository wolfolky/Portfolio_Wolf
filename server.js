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

// ── Default holdings (overridden by in-memory user edits via API) ──────────
var DEFAULT_HOLDINGS = [
  // STOCKS (26 open positions — verified from updated Excel)
  { ticker:'ALMU', name:'Aeluma',                        type:'stock',  shares:105,       avgCost:15.95   },
  { ticker:'AMD',  name:'Advanced Micro Devices',        type:'stock',  shares:16,        avgCost:119.21  },
  { ticker:'AMZN', name:'Amazon',                        type:'stock',  shares:20,        avgCost:147.08  },
  { ticker:'ASPI', name:'ASP Isotopes',                  type:'stock',  shares:150,       avgCost:11.55   },
  { ticker:'ASTS', name:'AST SpaceMobile',               type:'stock',  shares:42,        avgCost:72.16   },
  { ticker:'CEG',  name:'Constellation Energy',          type:'stock',  shares:12,        avgCost:298.58  },
  { ticker:'CRDO', name:'Credo Technology',              type:'stock',  shares:20,        avgCost:146.60  },
  { ticker:'ENTG', name:'Entegris',                      type:'stock',  shares:10,        avgCost:150.59  },
  { ticker:'EOSE', name:'Eos Energy',                    type:'stock',  shares:380,       avgCost:4.66    },
  { ticker:'FCX',  name:'Freeport-McMoRan',              type:'stock',  shares:20,        avgCost:61.50   },
  { ticker:'GLW',  name:'Corning',                       type:'stock',  shares:15,        avgCost:154.56  },
  { ticker:'GOOG', name:'Alphabet Class A',              type:'stock',  shares:20,        avgCost:197.81  },
  { ticker:'HL',   name:'Hecla Mining',                  type:'stock',  shares:140,       avgCost:15.29   },
  { ticker:'IREN', name:'IREN',                          type:'stock',  shares:20,        avgCost:57.36   },
  { ticker:'META', name:'Meta Platforms',                type:'stock',  shares:10,        avgCost:423.12  },
  { ticker:'MP',   name:'MP Materials',                  type:'stock',  shares:40,        avgCost:48.66   },
  { ticker:'MRVL', name:'Marvell Technology',            type:'stock',  shares:20,        avgCost:131.50  },
  { ticker:'MSFT', name:'Microsoft',                     type:'stock',  shares:5,         avgCost:394.69  },
  { ticker:'MSTR', name:'MicroStrategy',                 type:'stock',  shares:15,        avgCost:305.06  },
  { ticker:'MU',   name:'Micron Technology',             type:'stock',  shares:6,         avgCost:955.54  },
  { ticker:'NVDA', name:'Nvidia',                        type:'stock',  shares:65,        avgCost:164.90  },
  { ticker:'ONDS', name:'Ondas',                         type:'stock',  shares:220,       avgCost:9.20    },
  { ticker:'RKLB', name:'Rocket Lab USA',                type:'stock',  shares:40,        avgCost:18.95   },
  { ticker:'SPCX', name:'SpaceX',                        type:'stock',  shares:40,        avgCost:126.23  },
  { ticker:'TEM',  name:'Tempus AI',                     type:'stock',  shares:50,        avgCost:65.59   },
  { ticker:'TSLA', name:'Tesla',                         type:'stock',  shares:29,        avgCost:277.63  },
  // ETFs — European UCITS (prices fetched via Yahoo Finance fallback, stored in USD)
  { ticker:'IEMA', name:'iShares MSCI EM UCITS ETF',     type:'etf',    shares:40,        avgCost:53.69   },
  { ticker:'QUTM', name:'VanEck Quantum Computing ETF',  type:'etf',    shares:120,       avgCost:23.78   },
  { ticker:'SEC0', name:'iShares Global Semiconductors', type:'etf',    shares:50,        avgCost:22.28   },
  // Crypto
  { ticker:'BTC',  name:'Bitcoin',                       type:'crypto', shares:0.067169,  avgCost:101815  },
  { ticker:'ETH',  name:'Ethereum',                      type:'crypto', shares:1,         avgCost:3546.26 },
  { ticker:'NEXO', name:'NEXO',                          type:'crypto', shares:2723.58,   avgCost:1.26    },
  { ticker:'RND',  name:'Render',                        type:'crypto', shares:300,       avgCost:3.85    },
  { ticker:'XRP',  name:'Ripple',                        type:'crypto', shares:800,       avgCost:2.61    },
];

// Default transactions from Excel history
var DEFAULT_TRANSACTIONS = [
  {symbol:'AMD',  name:'Advanced Micro Devices', category:'stock',     spent:11018.75,received:15027.82,pl:4009.07, status:'closed',date:'2023-03-23'},
  {symbol:'CRWD', name:'CrowdStrike',             category:'stock',     spent:2769.79, received:4625.47, pl:1855.68,status:'closed',date:'2023-04-10'},
  {symbol:'BRK.B',name:'Berkshire Hathaway B',   category:'stock',     spent:10433.40,received:11808.93,pl:1375.53,status:'closed',date:'2023-04-15'},
  {symbol:'PLTR', name:'Palantir',                category:'stock',     spent:2711.34, received:3944.62, pl:1233.28,status:'closed',date:'2023-05-01'},
  {symbol:'AVGO', name:'Broadcom',                category:'stock',     spent:2348.25, received:3325.35, pl:977.10, status:'closed',date:'2023-05-10'},
  {symbol:'AAPL', name:'Apple',                   category:'stock',     spent:5884.01, received:6782.25, pl:898.24, status:'closed',date:'2023-06-01'},
  {symbol:'ASME', name:'ASML',                    category:'stock',     spent:2916.68, received:3720.16, pl:803.48, status:'closed',date:'2023-06-15'},
  {symbol:'SNPS', name:'Synopsis',                category:'stock',     spent:2503.15, received:3277.09, pl:773.94, status:'closed',date:'2023-07-01'},
  {symbol:'OSCR', name:'Oscar Health',            category:'stock',     spent:2008.21, received:2773.39, pl:765.18, status:'closed',date:'2023-07-10'},
  {symbol:'SOFI', name:'SoFi Technologies',       category:'stock',     spent:5975.18, received:6657.40, pl:682.22, status:'closed',date:'2023-08-01'},
  {symbol:'FIG',  name:'Figma',                   category:'stock',     spent:2582.58, received:3041.98, pl:459.40, status:'closed',date:'2023-09-01'},
  {symbol:'APP',  name:'Applovin',                category:'stock',     spent:1932.00, received:2388.87, pl:456.87, status:'closed',date:'2023-09-15'},
  {symbol:'IONQ', name:'IonQ',                    category:'stock',     spent:1297.20, received:1713.18, pl:415.98, status:'closed',date:'2023-10-01'},
  {symbol:'RKT',  name:'Rocket Companies',        category:'stock',     spent:2010.81, received:2363.98, pl:353.17, status:'closed',date:'2023-10-15'},
  {symbol:'XAU',  name:'Gold',                    category:'commodity', spent:3492.72, received:3818.44, pl:325.72, status:'closed',date:'2023-11-01'},
  {symbol:'TKR',  name:'Timken',                  category:'stock',     spent:1027.90, received:1333.78, pl:305.88, status:'closed',date:'2023-11-10'},
  {symbol:'OUST', name:'Ouster',                  category:'stock',     spent:2112.00, received:2397.59, pl:285.59, status:'closed',date:'2023-12-01'},
  {symbol:'SKYT', name:'Skywater Technology',     category:'stock',     spent:1377.06, received:1644.49, pl:267.43, status:'closed',date:'2023-12-10'},
  {symbol:'SIRI', name:'Sirius XM',               category:'stock',     spent:3066.54, received:3287.91, pl:221.37, status:'closed',date:'2024-01-01'},
  {symbol:'WAL',  name:'Western Alliance',        category:'stock',     spent:1273.64, received:1402.80, pl:129.16, status:'closed',date:'2024-01-10'},
  {symbol:'NQSE', name:'iShares VII',             category:'etf',       spent:2600.00, received:2723.27, pl:123.27, status:'closed',date:'2024-02-01'},
  {symbol:'COPA', name:'WisdomTree Copper',       category:'etf',       spent:1550.80, received:1651.10, pl:100.30, status:'closed',date:'2024-02-10'},
  {symbol:'Z',    name:'Zillow',                  category:'stock',     spent:1589.18, received:1685.00, pl:95.82,  status:'closed',date:'2024-03-01'},
  {symbol:'BAC',  name:'Bank of America',         category:'stock',     spent:2387.84, received:2478.07, pl:90.23,  status:'closed',date:'2024-03-10'},
  {symbol:'SNOW', name:'Snowflake',               category:'stock',     spent:1645.56, received:1691.92, pl:46.36,  status:'closed',date:'2024-04-01'},
  {symbol:'EQQB', name:'NASDAQ ETF ACC',          category:'etf',       spent:374.05,  received:417.98,  pl:43.93,  status:'closed',date:'2024-04-10'},
  {symbol:'O4J0', name:'iShares S&P 500 EW',     category:'etf',       spent:1487.50, received:1504.99, pl:17.49,  status:'closed',date:'2024-05-01'},
  {symbol:'NOW',  name:'ServiceNow',              category:'stock',     spent:724.17,  received:698.93,  pl:-25.24, status:'closed',date:'2024-05-10'},
  {symbol:'CSCO', name:'Cisco',                   category:'stock',     spent:3074.00, received:3043.80, pl:-30.20, status:'closed',date:'2024-06-01'},
  {symbol:'O',    name:'Realty Income',           category:'stock',     spent:1200.00, received:1132.99, pl:-67.01, status:'closed',date:'2024-06-10'},
  {symbol:'NFLX', name:'Netflix',                 category:'stock',     spent:5329.91, received:5233.46, pl:-96.45, status:'closed',date:'2024-07-01'},
  {symbol:'CYBR', name:'CyberArk',                category:'stock',     spent:1607.60, received:1500.48, pl:-107.12,status:'closed',date:'2024-07-10'},
  {symbol:'QDV5', name:'iShares MSCI India',      category:'etf',       spent:2392.50, received:2252.50, pl:-140.00,status:'closed',date:'2024-08-01'},
  {symbol:'CLS',  name:'Celestica',               category:'stock',     spent:1554.81, received:1399.54, pl:-155.27,status:'closed',date:'2024-08-10'},
  {symbol:'XAG',  name:'Silver',                  category:'commodity', spent:2939.88, received:2727.85, pl:-212.03,status:'closed',date:'2024-09-01'},
  {symbol:'CVX',  name:'Chevron',                 category:'stock',     spent:3239.92, received:2984.82, pl:-255.10,status:'closed',date:'2024-09-10'},
  {symbol:'PPTA', name:'Perpetua Resources',      category:'stock',     spent:1659.30, received:1391.80, pl:-267.50,status:'closed',date:'2024-10-01'},
  {symbol:'PATH', name:'UiPath',                  category:'stock',     spent:2781.78, received:2509.16, pl:-272.62,status:'closed',date:'2024-10-10'},
  {symbol:'VUAA', name:'S&P500 ETF ACC',          category:'etf',       spent:7400.97, received:7088.89, pl:-312.08,status:'closed',date:'2024-11-01'},
  {symbol:'HD',   name:'Home Depot',              category:'stock',     spent:2349.84, received:1997.63, pl:-352.21,status:'closed',date:'2024-11-10'},
  {symbol:'DELL', name:'Dell Technologies',       category:'stock',     spent:2599.30, received:2040.67, pl:-558.63,status:'closed',date:'2024-12-01'},
  {symbol:'ZETA', name:'Zeta Global',             category:'stock',     spent:2919.46, received:2351.47, pl:-567.99,status:'closed',date:'2024-12-10'},
  {symbol:'IS04', name:'iShares Treasury 20+',    category:'etf',       spent:5017.44, received:4171.30, pl:-846.14,status:'closed',date:'2025-01-01'},
  {symbol:'XPT',  name:'Platinum',                category:'commodity', spent:4994.70, received:3617.84, pl:-1376.86,status:'closed',date:'2025-01-10'},
  {symbol:'HIMS', name:'Hims & Hers Health',      category:'stock',     spent:2810.92, received:1300.75, pl:-1510.17,status:'closed',date:'2025-02-01'},
  {symbol:'BABA', name:'Alibaba',                 category:'stock',     spent:5555.08, received:3946.32, pl:-1608.76,status:'closed',date:'2025-02-10'},
  // Open positions
  {symbol:'AMZN', name:'Amazon',                  category:'stock',     spent:27603.54,received:26964.02,pl:0,status:'open',date:'2025-03-01'},
  {symbol:'META', name:'Meta Platforms',          category:'stock',     spent:19083.73,received:12558.00,pl:0,status:'open',date:'2025-03-10'},
  {symbol:'TSLA', name:'Tesla',                   category:'stock',     spent:18079.33,received:9753.26, pl:0,status:'open',date:'2025-04-01'},
  {symbol:'MSFT', name:'Microsoft',               category:'stock',     spent:17030.57,received:14829.82,pl:0,status:'open',date:'2025-04-10'},
  {symbol:'NVDA', name:'Nvidia',                  category:'stock',     spent:10267.93,received:206.84,  pl:0,status:'open',date:'2025-05-01'},
  {symbol:'MSTR', name:'MicroStrategy',           category:'stock',     spent:7022.78, received:3314.31, pl:0,status:'open',date:'2025-05-10'},
  {symbol:'MU',   name:'Micron Technology',       category:'stock',     spent:5736.24, received:0,       pl:0,status:'open',date:'2025-06-01'},
  {symbol:'CEG',  name:'Constellation Energy',    category:'stock',     spent:5673.11, received:2486.26, pl:0,status:'open',date:'2025-06-10'},
  {symbol:'SPCX', name:'SpaceX',                  category:'stock',     spent:5052.99, received:0,       pl:0,status:'open',date:'2025-07-01'},
  {symbol:'GOOG', name:'Alphabet Class A',        category:'stock',     spent:4947.32, received:1609.59, pl:0,status:'open',date:'2025-07-10'},
  {symbol:'MRVL', name:'Marvell Technology',      category:'stock',     spent:3682.97, received:2262.16, pl:0,status:'open',date:'2025-08-01'},
  {symbol:'CRDO', name:'Credo Technology',        category:'stock',     spent:3667.82, received:1102.20, pl:0,status:'open',date:'2025-08-10'},
  {symbol:'ETH',  name:'Ethereum',                category:'crypto',    spent:3581.37, received:0,       pl:0,status:'open',date:'2025-09-01'},
  {symbol:'NEXO', name:'NEXO',                    category:'crypto',    spent:3441.79, received:0,       pl:0,status:'open',date:'2025-09-10'},
  {symbol:'TEM',  name:'Tempus AI',               category:'stock',     spent:3280.31, received:0,       pl:0,status:'open',date:'2025-10-01'},
  {symbol:'EOSE', name:'Eos Energy',              category:'stock',     spent:3170.57, received:2905.48, pl:0,status:'open',date:'2025-10-10'},
  {symbol:'GLW',  name:'Corning',                 category:'stock',     spent:3091.25, received:926.33,  pl:0,status:'open',date:'2025-11-01'},
  {symbol:'ASTS', name:'AST SpaceMobile',         category:'stock',     spent:3031.73, received:0,       pl:0,status:'open',date:'2025-11-10'},
  {symbol:'QNTM', name:'VanEck Quantum ETF',      category:'etf',       spent:2828.80, received:0,       pl:0,status:'open',date:'2025-12-01'},
  {symbol:'ONDS', name:'Ondas',                   category:'stock',     spent:2345.64, received:472.85,  pl:0,status:'open',date:'2025-12-10'},
  {symbol:'IEMA', name:'iShares MSCI EM ETF',     category:'etf',       spent:2315.51, received:0,       pl:0,status:'open',date:'2026-01-01'},
  {symbol:'ENTG', name:'Entegris',                category:'stock',     spent:2259.90, received:679.65,  pl:0,status:'open',date:'2026-01-10'},
  {symbol:'ALMU', name:'Aeluma',                  category:'stock',     spent:2234.77, received:932.05,  pl:0,status:'open',date:'2026-02-01'},
  {symbol:'HL',   name:'Hecla Mining',            category:'stock',     spent:2140.60, received:0,       pl:0,status:'open',date:'2026-02-10'},
  {symbol:'MP',   name:'MP Materials',            category:'stock',     spent:1947.13, received:0,       pl:0,status:'open',date:'2026-03-01'},
  {symbol:'ASPI', name:'ASP Isotopes',            category:'stock',     spent:1732.01, received:0,       pl:0,status:'open',date:'2026-03-10'},
  {symbol:'IREN', name:'IREN',                    category:'stock',     spent:1722.12, received:407.99,  pl:0,status:'open',date:'2026-04-01'},
  {symbol:'BTC',  name:'Bitcoin',                 category:'crypto',    spent:13847.33,received:6637.58, pl:0,status:'open',date:'2026-04-10'},
  {symbol:'RKLB', name:'Rocket Lab USA',          category:'stock',     spent:1497.05, received:2123.32, pl:0,status:'open',date:'2026-05-01'},
  {symbol:'FCX',  name:'Freeport-McMoRan',        category:'stock',     spent:1230.00, received:0,       pl:0,status:'open',date:'2026-05-10'},
  {symbol:'SEC0', name:'iShares Semiconductors',  category:'etf',       spent:1167.00, received:0,       pl:0,status:'open',date:'2026-06-01'},
  {symbol:'XRP',  name:'Ripple',                  category:'crypto',    spent:6268.43, received:3600.21, pl:0,status:'open',date:'2026-06-10'},
  {symbol:'RND',  name:'Render',                  category:'crypto',    spent:1166.70, received:0,       pl:0,status:'open',date:'2026-07-01'},
];

// ── In-memory state (user can edit via API, persists until server restart) ─
var HOLDINGS = JSON.parse(JSON.stringify(DEFAULT_HOLDINGS));
var TRANSACTIONS = JSON.parse(JSON.stringify(DEFAULT_TRANSACTIONS));
var CASH = 0; // user-editable, no default

// ── Price cache ─────────────────────────────────────────────────────────────
var priceCache = { stocks:{}, news:[], updatedAt:new Date().toISOString() };

// Seed with avg cost immediately
HOLDINGS.forEach(function(h){
  priceCache.stocks[h.ticker]={price:h.avgCost,change:0,changePct:0,prevClose:h.avgCost,seeded:true};
});

function delay(ms){return new Promise(function(r){setTimeout(r,ms);});}

// Finnhub ticker map
var TICKER_MAP = {
  // Crypto — Binance exchange prefix
  'BTC':  'BINANCE:BTCUSDT',
  'ETH':  'BINANCE:ETHUSDT',
  'XRP':  'BINANCE:XRPUSDT',
  'NEXO': 'BINANCE:NEXOUSDT',
  'RND':  'BINANCE:RENDERUSDT',
  // European UCITS ETFs mapped to US-listed equivalents (ratio applied in fetchQuote)
  // Ratios calibrated Aug 2026 from TipRanks actual prices — see ETF_RATIO below
  'IEMA': 'IEMG',   // iShares Core MSCI EM (same index, USD-listed)
  'QUTM': 'QTUM',   // Defiance Quantum ETF (similar holdings, USD-listed)
  'SEC0': 'SOXX',   // iShares Semiconductor ETF (same sector, USD-listed)
};

// ETF price ratios: UCITS EUR price (in USD) / US ETF price
// Recalibrated Aug 2026 using TipRanks actual prices + EUR/USD = 1.088
// Update these if prices drift significantly (edit in Railway Variables or server.js)
var ETF_RATIO = {
  'IEMA': 1.0376,  // IEMA €54.36 -> $59.14 / IEMG $57.00 = 1.0376
  'QUTM': 0.3599,  // QNTM €25.47 -> $27.71 / QTUM $77.00 = 0.3599
  'SEC0': 0.0809,  // SEC0 €17.10 -> $18.60 / SOXX $230.0 = 0.0809
};

async function fetchQuote(ticker){
  var fsym = TICKER_MAP[ticker] || ticker;
  var ratio = ETF_RATIO[ticker] || 1;
  try{
    var res=await fetch('https://finnhub.io/api/v1/quote?symbol='+fsym+'&token='+FINNHUB_KEY,{headers:{'User-Agent':'Mozilla/5.0'}});
    var d=await res.json();
    if(d&&d.c&&d.c>0){
      // Apply ratio to convert US ETF price -> UCITS price (so P&L is calculated correctly)
      var price=parseFloat((d.c*ratio).toFixed(4));
      var prev=parseFloat((d.pc*ratio).toFixed(4));
      var chg=parseFloat((price-prev).toFixed(4));
      var pct=prev>0?(chg/prev)*100:0;
      priceCache.stocks[ticker]={price:price,change:chg,changePct:pct,prevClose:prev,seeded:false};
      return true;
    }
  }catch(e){console.error('Quote '+ticker+':'+e.message);}
  return false;
}

async function fetchAllPrices(){
  var tickers=[...new Set(HOLDINGS.map(function(h){return h.ticker;}))];
  // Seed any new tickers with avg cost
  tickers.forEach(function(t){
    if(!priceCache.stocks[t]){
      var h=HOLDINGS.find(function(x){return x.ticker===t;});
      if(h)priceCache.stocks[t]={price:h.avgCost,change:0,changePct:0,seeded:true};
    }
  });
  // Fetch all via Finnhub (ETFs use US-equivalent tickers from TICKER_MAP, then apply ratio)
  for(var i=0;i<tickers.length;i++){
    await fetchQuote(tickers[i]);
    if(i<tickers.length-1)await delay(1200);
  }
  priceCache.updatedAt=new Date().toISOString();
}

// Rotate through top holdings for targeted news
var NEWS_TICKERS = ['AMZN','META','TSLA','MSFT','NVDA','MSTR','GOOG','CRDO','MRVL','CEG','RKLB','ASTS','MU','TEM','EOSE'];
var newsTickerIdx = 0;

async function fetchNews(){
  try{
    var allNews = [];
    // Fetch from 3 different tickers to get relevant news
    for(var i = 0; i < 3; i++){
      var sym = NEWS_TICKERS[(newsTickerIdx + i) % NEWS_TICKERS.length];
      var url = 'https://finnhub.io/api/v1/company-news?symbol='+sym+'&from='+getDateStr(7)+'&to='+getDateStr(0)+'&token='+FINNHUB_KEY;
      try{
        var res = await fetch(url, {headers:{'User-Agent':'Mozilla/5.0'}});
        var d = await res.json();
        if(Array.isArray(d) && d.length){
          var mapped = d.slice(0,4).map(function(n){
            return{title:n.headline,publisher:n.source,link:n.url,time:n.datetime,thumbnail:n.image||null,symbol:sym};
          });
          allNews = allNews.concat(mapped);
        }
      }catch(e){}
      await new Promise(function(r){setTimeout(r,500);});
    }
    // Deduplicate by headline and sort by time
    var seen = {};
    allNews = allNews.filter(function(n){
      if(seen[n.title])return false;
      seen[n.title]=true;return true;
    }).sort(function(a,b){return b.time-a.time;}).slice(0,15);

    if(allNews.length > 0) priceCache.news = allNews;
    // Also fall back to general market news if not enough
    if(allNews.length < 5){
      var gres = await fetch('https://finnhub.io/api/v1/news?category=general&token='+FINNHUB_KEY);
      var gd = await gres.json();
      if(Array.isArray(gd)) priceCache.news = priceCache.news.concat(gd.slice(0,5).map(function(n){return{title:n.headline,publisher:n.source,link:n.url,time:n.datetime,thumbnail:n.image||null};}));
      priceCache.news = priceCache.news.slice(0,15);
    }
    newsTickerIdx = (newsTickerIdx + 3) % NEWS_TICKERS.length;
  }catch(e){console.error('News error:',e.message);}
}

function getDateStr(daysAgo){
  var d = new Date(Date.now() - daysAgo*86400000);
  return d.toISOString().slice(0,10);
}

fetchAllPrices().then(fetchNews);
fetchMacro();
setInterval(function(){fetchAllPrices().then(fetchNews);},120000);
setInterval(fetchMacro, 300000); // Macro refreshes every 5 min

// ── Macro data ────────────────────────────────────────────────────────────────
var macroCache = {
  indices:{}, fx:{}, economic:{}, bonds:{}, commodities:{}, crypto:{},
  regimeClimate:null, regimeWeather:null, regimeTech:null,
  narrative:null, scenarios:null, calendar:[], updatedAt:null
};

async function fetchMacroQuote(symbol) {
  try {
    var res = await fetch('https://finnhub.io/api/v1/quote?symbol='+symbol+'&token='+FINNHUB_KEY, {headers:{'User-Agent':'Mozilla/5.0'}});
    var d = await res.json();
    if(d && d.c && d.c > 0) {
      var chg = d.c - d.pc, pct = d.pc > 0 ? (chg/d.pc)*100 : 0;
      return {price:d.c, change:chg, changePct:pct, prevClose:d.pc, high:d.h, low:d.l, open:d.o};
    }
  } catch(e) {}
  return null;
}

async function fetchEconomicSeries(code) {
  try {
    var res = await fetch('https://finnhub.io/api/v1/economic?code='+code+'&token='+FINNHUB_KEY, {headers:{'User-Agent':'Mozilla/5.0'}});
    var d = await res.json();
    if(Array.isArray(d) && d.length > 0) {
      var sorted = d.sort(function(a,b){return a.period > b.period ? -1:1;});
      return { current: sorted[0], previous: sorted[1]||null, history: sorted.slice(0,12) };
    }
  } catch(e) {}
  return null;
}

async function generateMacroNarrative() {
  try {
    var mc = macroCache;
    var vix = mc.indices.vix ? mc.indices.vix.price : null;
    var sp500 = mc.indices.sp500 ? mc.indices.sp500.price : null;
    var spChg = mc.indices.sp500 ? mc.indices.sp500.changePct : null;
    var treasury10 = mc.bonds.treasury10 ? mc.bonds.treasury10.price : null;
    var treasury2 = mc.bonds.treasury2 ? mc.bonds.treasury2.price : null;
    var gold = mc.commodities.gold ? mc.commodities.gold.price : null;
    var goldChg = mc.commodities.gold ? mc.commodities.gold.changePct : null;
    var dxy = mc.fx.DXY ? mc.fx.DXY.price : null;
    var dxyChg = mc.fx.DXY ? mc.fx.DXY.changePct : null;
    var oil = mc.commodities.oil ? mc.commodities.oil.price : null;
    var cpi = mc.economic.cpi ? mc.economic.cpi.current.value : null;
    var gdp = mc.economic.gdp ? mc.economic.gdp.current.value : null;
    var unemploy = mc.economic.unemploy ? mc.economic.unemploy.current.value : null;
    // Yield spread (proxy: IEF/SHY price difference indicates curve shape)
    var spread10y2y = mc.bonds.spread || null;

    var dataCtx = 'S&P500 ' + (sp500 ? '$'+sp500.toFixed(0)+'('+spChg.toFixed(2)+'%)' : 'n/a') +
      ' VIX ' + (vix ? vix.toFixed(1) : 'n/a') +
      ' Gold ' + (gold ? '$'+gold.toFixed(0)+'('+goldChg.toFixed(2)+'%)' : 'n/a') +
      ' DXY ' + (dxy ? dxy.toFixed(2)+'('+dxyChg.toFixed(2)+'%)' : 'n/a') +
      ' WTI ' + (oil ? '$'+oil.toFixed(1) : 'n/a') +
      ' CPI ' + (cpi ? cpi.toFixed(1)+'%' : 'n/a') +
      ' GDP ' + (gdp ? gdp.toFixed(1)+'%' : 'n/a') +
      ' Unemployment ' + (unemploy ? unemploy.toFixed(1)+'%' : 'n/a') +
      ' 10Y ' + (treasury10 ? '$'+treasury10.toFixed(2) : 'n/a') +
      ' Date:' + new Date().toDateString();

    var schema = JSON.stringify({
      regime_signal:'one sentence about market regime',
      climate_score:'0-10 number',climate_label:'Calm|Tense|Risk-On|Risk-Off',
      weather_score_low:'-10 to +10',weather_score_high:'-10 to +10',weather_label:'short phrase',
      tech_score:'0-100 IBD-style',tech_label:'short phrase',
      narrative:'2-3 sentence market narrative',
      risk:{title:'main risk',body:'2-3 sentences'},
      opportunity:{title:'main opportunity',body:'2-3 sentences'},
      low_risk:{title:'low-risk note',body:'1-2 sentences'},
      scenario_bull:{trigger:'condition',title:'name',body:'implication'},
      scenario_base:{trigger:'condition',title:'name',body:'implication'},
      scenario_bear:{trigger:'condition',title:'name',body:'implication'},
      changes_since_yesterday:['bullet1','bullet2','bullet3']
    });

    var prompt = 'You are a macro analyst. Given this market data: ' + dataCtx +
      ' Write a daily macro dashboard as JSON matching this schema exactly: ' + schema +
      ' Respond ONLY with valid JSON. No markdown. No explanation.';

    var res = await fetch('https://api.anthropic.com/v1/messages', {
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body: JSON.stringify({
        model:'claude-sonnet-4-6',
        max_tokens:1000,
        messages:[{role:'user',content:prompt}]
      })
    });
    var data = await res.json();
    if(data && data.content && data.content[0]) {
      var text = data.content[0].text.replace(/```json|```/g,'').trim();
      var parsed = JSON.parse(text);
      macroCache.regimeClimate = {score:parsed.climate_score, label:parsed.climate_label};
      macroCache.regimeWeather = {low:parsed.weather_score_low, high:parsed.weather_score_high, label:parsed.weather_label};
      macroCache.regimeTech = {score:parsed.tech_score, label:parsed.tech_label};
      macroCache.narrative = {
        signal:parsed.regime_signal, text:parsed.narrative,
        risk:parsed.risk, opportunity:parsed.opportunity, lowRisk:parsed.low_risk,
        changes:parsed.changes_since_yesterday || []
      };
      macroCache.scenarios = {
        bull:parsed.scenario_bull,
        base:parsed.scenario_base,
        bear:parsed.scenario_bear
      };
      console.log('Macro narrative generated.');
    }
  } catch(e) { console.error('Narrative generation error:', e.message); }
}

async function fetchMacro() {
  console.log('Fetching macro data...');
  try {
    // ── Market indices (via ETF proxies on Finnhub free) ──
    var indexTickers = [
      {key:'sp500',  sym:'SPY',  name:'S&P 500',    mult:10},
      {key:'nasdaq', sym:'QQQ',  name:'Nasdaq 100',  mult:40},
      {key:'dow',    sym:'DIA',  name:'Dow Jones',   mult:350},
      {key:'russell',sym:'IWM',  name:'Russell 2000',mult:11},
      {key:'vix',    sym:'VIXY', name:'VIX',         mult:1, isVix:true},
    ];
    for(var i=0;i<indexTickers.length;i++){
      var t=indexTickers[i], q=await fetchMacroQuote(t.sym);
      if(q){
        if(t.isVix){
          macroCache.indices[t.key]=Object.assign({name:t.name,symbol:'VIX'},q);
        } else {
          // multiply ETF price to get approximate index level
          macroCache.indices[t.key]=Object.assign({name:t.name,symbol:t.sym},q,{
            indexPrice: parseFloat((q.price*t.mult).toFixed(2)),
            indexChange: parseFloat((q.change*t.mult).toFixed(2))
          });
        }
      }
      await delay(1200);
    }

    // ── DXY Dollar Index (via UUP ETF, then back-calc) ──
    var dxy = await fetchMacroQuote('UUP');
    if(dxy) {
      // UUP ~$30 = DXY ~100, ratio ~3.33
      macroCache.fx.DXY = {name:'Dollar Index (DXY)', symbol:'UUP', price:parseFloat((dxy.price*3.32).toFixed(2)), change:parseFloat((dxy.change*3.32).toFixed(2)), changePct:dxy.changePct};
    }
    await delay(1200);

    // ── Bond market (via ETF proxies) ──
    // IEF = 7-10Y Treasury ETF (~$98), use as 10Y yield proxy
    // SHY = 1-3Y Treasury ETF, 2Y proxy
    var ief = await fetchMacroQuote('IEF'); await delay(1200);
    var shy = await fetchMacroQuote('SHY'); await delay(1200);
    var tip = await fetchMacroQuote('TIP'); await delay(1200);
    var hyg = await fetchMacroQuote('HYG'); await delay(1200);
    var lqd = await fetchMacroQuote('LQD'); await delay(1200);

    if(ief) macroCache.bonds.treasury10 = Object.assign({name:'10Y Treasury (IEF)', symbol:'IEF'}, ief);
    if(shy) macroCache.bonds.treasury2  = Object.assign({name:'2Y Treasury (SHY)',  symbol:'SHY'}, shy);
    if(tip) macroCache.bonds.tips       = Object.assign({name:'TIPS Real Rate (TIP)',symbol:'TIP'}, tip);
    if(hyg) macroCache.bonds.hiyield    = Object.assign({name:'High Yield (HYG)',   symbol:'HYG'}, hyg);
    if(lqd) macroCache.bonds.investgrade= Object.assign({name:'Invest. Grade (LQD)',symbol:'LQD'}, lqd);
    // Yield curve proxy: SHY vs IEF price divergence
    if(ief&&shy) macroCache.bonds.spread = {
      name:'10Y-2Y Curve', value: parseFloat((ief.changePct - shy.changePct).toFixed(3)),
      label: (ief.changePct > shy.changePct) ? 'Steepening' : 'Flattening'
    };

    // ── Commodities ──
    var comms = [
      {key:'gold',   sym:'GLD',  name:'Gold (GLD)',        mult:9.4},
      {key:'oil',    sym:'USO',  name:'WTI Oil (USO)',     mult:2.2},
      {key:'brent',  sym:'BNO',  name:'Brent Oil (BNO)',   mult:2.5},
      {key:'silver', sym:'SLV',  name:'Silver (SLV)',      mult:21},
      {key:'copper', sym:'CPER', name:'Copper (CPER)',     mult:1},
    ];
    for(var i=0;i<comms.length;i++){
      var t=comms[i], q=await fetchMacroQuote(t.sym);
      if(q) macroCache.commodities[t.key]=Object.assign({name:t.name,symbol:t.sym},q,{
        spotPrice: parseFloat((q.price*t.mult).toFixed(2))
      });
      await delay(1200);
    }

    // ── Crypto ──
    var btc = await fetchMacroQuote('BINANCE:BTCUSDT'); await delay(1200);
    var eth = await fetchMacroQuote('BINANCE:ETHUSDT'); await delay(1200);
    if(btc) macroCache.crypto.btc = Object.assign({name:'Bitcoin',symbol:'BTC'}, btc);
    if(eth) macroCache.crypto.eth = Object.assign({name:'Ethereum',symbol:'ETH'}, eth);

    // ── FX Rates ──
    await delay(1200);
    try {
      var fxRes = await fetch('https://finnhub.io/api/v1/forex/rates?base=USD&token='+FINNHUB_KEY, {headers:{'User-Agent':'Mozilla/5.0'}});
      var fxData = await fxRes.json();
      if(fxData && fxData.quote) {
        var pairs = [{k:'EURUSD',to:'EUR',n:'EUR/USD'},{k:'GBPUSD',to:'GBP',n:'GBP/USD'},{k:'USDJPY',to:'JPY',n:'USD/JPY'},{k:'USDTRY',to:'TRY',n:'USD/TRY'},{k:'USDCHF',to:'CHF',n:'USD/CHF'}];
        pairs.forEach(function(p){ if(fxData.quote[p.to]) macroCache.fx[p.k]={name:p.n,rate:parseFloat((1/fxData.quote[p.to]).toFixed(4))}; });
        // fix EUR/USD (inverse)
        if(fxData.quote.EUR) macroCache.fx.EURUSD={name:'EUR/USD',rate:parseFloat(fxData.quote.EUR.toFixed(4))};
        if(fxData.quote.GBP) macroCache.fx.GBPUSD={name:'GBP/USD',rate:parseFloat(fxData.quote.GBP.toFixed(4))};
      }
    } catch(e) {}

    // ── Economic indicators ──
    var econCodes = [
      {k:'gdp',      code:'US_GDP',      name:'GDP Growth',     unit:'%'},
      {k:'cpi',      code:'US_CPI',      name:'CPI Inflation',  unit:'%'},
      {k:'unemploy', code:'US_UNEMPLOY', name:'Unemployment',   unit:'%'},
      {k:'retail',   code:'US_RETAIL',   name:'Retail Sales',   unit:'%'},
      {k:'indpro',   code:'US_INDPRO',   name:'Industrial Prod',unit:'idx'},
      {k:'housstart',code:'US_HOUSSTART',name:'Housing Starts', unit:'K'},
    ];
    for(var i=0;i<econCodes.length;i++){
      var ec=econCodes[i], data=await fetchEconomicSeries(ec.code);
      if(data) macroCache.economic[ec.k]=Object.assign({name:ec.name,unit:ec.unit},data);
      await delay(1200);
    }

    // ── Generate AI narrative ──
    await generateMacroNarrative();

    // ── Upcoming economic calendar (static, update weekly) ──
    macroCache.calendar = [
      {date:'2026-08-12',time:'12:30 ET',event:'CPI (July)',importance:'high',consensus:'+0.1% MoM',prior:'+0.3% MoM'},
      {date:'2026-08-14',time:'08:30 ET',event:'Retail Sales (July)',importance:'high',consensus:'+0.3%',prior:'-0.1%'},
      {date:'2026-08-14',time:'08:30 ET',event:'PPI (July)',importance:'medium',consensus:'+0.2%',prior:'+0.0%'},
      {date:'2026-08-15',time:'08:30 ET',event:'Empire State Mfg',importance:'low',consensus:'-5.0',prior:'-6.0'},
      {date:'2026-09-16',time:'14:00 ET',event:'FOMC Decision',importance:'high',consensus:'Hold 4.25-4.50%',prior:'4.25-4.50%'},
    ];

    macroCache.updatedAt = new Date().toISOString();
    console.log('Macro data refreshed at ' + macroCache.updatedAt);
  } catch(e) { console.error('Macro fetch error:', e.message); }
}

// ── Portfolio builder ────────────────────────────────────────────────────────
function buildPortfolio(){
  var enriched=HOLDINGS.map(function(h){
    var q=priceCache.stocks[h.ticker]||{price:h.avgCost,change:0,changePct:0,seeded:true};
    var price=q.price||h.avgCost,value=price*h.shares,cost=h.avgCost*h.shares;
    return Object.assign({},h,{price:price,value:value,cost:cost,pl:value-cost,plPct:((price-h.avgCost)/h.avgCost)*100,changePct:q.changePct||0,change:q.change||0,liveData:!q.seeded});
  });
  var totalEquity=enriched.reduce(function(a,h){return a+h.value;},0);
  var totalValue=totalEquity; // No cash in portfolio total — cash is shown separately
  return enriched.map(function(h){return Object.assign({},h,{allocPct:(h.value/totalValue)*100});}).sort(function(a,b){return b.value-a.value;});
}

function buildSummary(p){
  var tv=p.reduce(function(a,h){return a+h.value;},0);
  var tc=p.reduce(function(a,h){return a+h.cost;},0);
  var tpl=p.reduce(function(a,h){return a+h.pl;},0);
  var dc=p.reduce(function(a,h){return a+(h.value*(h.changePct/100));},0);
  return{totalValue:tv,totalCost:tc,totalPL:tpl,plPct:tc>0?(tpl/tc)*100:0,dayChange:dc,dayChangePct:tv>0?(dc/tv)*100:0,cash:CASH,positions:p.length,winners:p.filter(function(h){return h.pl>0;}).length,losers:p.filter(function(h){return h.pl<0;}).length,liveCount:p.filter(function(h){return h.liveData;}).length,updatedAt:priceCache.updatedAt};
}

// ── API routes ───────────────────────────────────────────────────────────────

// Portfolio
app.get('/api/portfolio',function(req,res){var p=buildPortfolio();res.json({ok:true,holdings:p,cash:CASH});});
app.get('/api/portfolio/summary',function(req,res){var p=buildPortfolio();res.json({ok:true,summary:buildSummary(p)});});
app.get('/api/portfolio/:ticker',function(req,res){var p=buildPortfolio();var h=p.find(function(h){return h.ticker.toLowerCase()===req.params.ticker.toLowerCase();});if(!h)return res.status(404).json({ok:false,error:'Not found'});res.json({ok:true,holding:h});});

// Cash
app.get('/api/cash',function(req,res){res.json({ok:true,cash:CASH});});
app.post('/api/cash',function(req,res){var v=parseFloat(req.body.cash);if(isNaN(v)||v<0)return res.status(400).json({ok:false,error:'Invalid cash value'});CASH=v;res.json({ok:true,cash:CASH});});

// Holdings management
app.post('/api/holdings',function(req,res){
  // Add or update holding
  var h=req.body;
  if(!h.ticker||!h.type||!h.shares||!h.avgCost)return res.status(400).json({ok:false,error:'Missing fields: ticker, type, shares, avgCost'});
  var idx=HOLDINGS.findIndex(function(x){return x.ticker.toUpperCase()===h.ticker.toUpperCase();});
  var entry={ticker:h.ticker.toUpperCase(),name:h.name||h.ticker.toUpperCase(),type:h.type,shares:parseFloat(h.shares),avgCost:parseFloat(h.avgCost)};
  if(idx>=0){HOLDINGS[idx]=entry;}else{HOLDINGS.push(entry);priceCache.stocks[entry.ticker]={price:entry.avgCost,change:0,changePct:0,seeded:true};fetchQuote(entry.ticker);}
  res.json({ok:true,holding:entry,totalHoldings:HOLDINGS.length});
});

app.delete('/api/holdings/:ticker',function(req,res){
  var t=req.params.ticker.toUpperCase();
  var before=HOLDINGS.length;
  HOLDINGS=HOLDINGS.filter(function(h){return h.ticker!==t;});
  res.json({ok:true,removed:before-HOLDINGS.length,totalHoldings:HOLDINGS.length});
});

app.get('/api/holdings',function(req,res){res.json({ok:true,holdings:HOLDINGS});});

// Transactions management
app.get('/api/transactions',function(req,res){
  var cat=req.query.category;
  var data=cat?TRANSACTIONS.filter(function(t){return t.category===cat;}):TRANSACTIONS;
  res.json({ok:true,transactions:data,summary:{totalSpent:data.reduce(function(a,t){return a+t.spent;},0),totalReceived:data.reduce(function(a,t){return a+t.received;},0),count:data.length}});
});

app.post('/api/transactions',function(req,res){
  var t=req.body;
  if(!t.symbol||!t.category||!t.spent===undefined)return res.status(400).json({ok:false,error:'Missing fields'});
  var entry={
    symbol:t.symbol.toUpperCase(),name:t.name||t.symbol.toUpperCase(),
    category:t.category,spent:parseFloat(t.spent)||0,
    received:parseFloat(t.received)||0,
    pl:parseFloat(t.received||0)-parseFloat(t.spent||0),
    status:t.status||'open',date:t.date||new Date().toISOString().slice(0,10),
    id:Date.now()
  };
  TRANSACTIONS.push(entry);
  // Auto-update holding if it's a buy (open)
  if(t.status==='open'&&t.shares&&t.avgCost){
    var idx=HOLDINGS.findIndex(function(h){return h.ticker===entry.symbol;});
    var holding={ticker:entry.symbol,name:entry.name,type:entry.category,shares:parseFloat(t.shares),avgCost:parseFloat(t.avgCost)};
    if(idx>=0){HOLDINGS[idx]=holding;}else{HOLDINGS.push(holding);priceCache.stocks[entry.symbol]={price:parseFloat(t.avgCost),change:0,changePct:0,seeded:true};fetchQuote(entry.symbol);}
  }
  res.json({ok:true,transaction:entry,totalTransactions:TRANSACTIONS.length});
});

app.delete('/api/transactions/:id',function(req,res){
  var id=parseInt(req.params.id);
  var before=TRANSACTIONS.length;
  TRANSACTIONS=TRANSACTIONS.filter(function(t){return t.id!==id;});
  res.json({ok:true,removed:before-TRANSACTIONS.length});
});

app.get('/api/transactions/categories',function(req,res){
  var cats=['stock','etf','crypto','commodity'];
  var result=cats.map(function(cat){
    var data=TRANSACTIONS.filter(function(t){return t.category===cat;});
    var spent=data.reduce(function(a,t){return a+t.spent;},0),received=data.reduce(function(a,t){return a+t.received;},0),pl=data.filter(function(t){return t.status==='closed';}).reduce(function(a,t){return a+t.pl;},0);
    return{category:cat,count:data.length,totalSpent:spent,totalReceived:received,realizedPL:pl,plPct:spent>0?(pl/spent)*100:0,winners:data.filter(function(t){return t.pl>0;}).length,losers:data.filter(function(t){return t.pl<0;}).length};
  });
  res.json({ok:true,categories:result});
});

// Allocation
app.get('/api/allocation',function(req,res){
  var p=buildPortfolio();var s=buildSummary(p);
  var alloc=p.map(function(h){return{ticker:h.ticker,name:h.name,type:h.type,value:h.value,pct:h.allocPct};});
  res.json({ok:true,totalValue:s.totalValue,allocation:alloc});
});

app.get('/api/macro',function(req,res){res.json({ok:true,macro:macroCache,updatedAt:macroCache.updatedAt});});
app.get('/api/news',function(req,res){res.json({ok:true,news:priceCache.news,updatedAt:priceCache.updatedAt});});
app.get('/api/prices',function(req,res){res.json({ok:true,stocks:priceCache.stocks,updatedAt:priceCache.updatedAt});});
app.get('/api/health',function(req,res){var live=Object.values(priceCache.stocks).filter(function(q){return!q.seeded;}).length;res.json({ok:true,status:'running',tickersLoaded:live,totalTickers:HOLDINGS.length,cash:CASH,updatedAt:priceCache.updatedAt});});
app.get('*',function(req,res){res.sendFile(path.join(__dirname,'public','index.html'));});
app.listen(PORT,function(){console.log('Portfolio running on port '+PORT);});
