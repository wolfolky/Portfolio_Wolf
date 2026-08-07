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

// Open positions — net shares from full transaction history (Investment_Records_for_Claude.xlsx)
const HOLDINGS = [
  { ticker:'AMZN', name:'Amazon',                   type:'stock',  shares:20,      avgCost:147.08 },
  { ticker:'META', name:'Meta Platforms',            type:'stock',  shares:10,      avgCost:423.12 },
  { ticker:'TSLA', name:'Tesla',                     type:'stock',  shares:29,      avgCost:277.63 },
  { ticker:'MSFT', name:'Microsoft',                 type:'stock',  shares:5,       avgCost:394.69 },
  { ticker:'NVDA', name:'Nvidia',                    type:'stock',  shares:45,      avgCost:157.91 },
  { ticker:'MSTR', name:'MicroStrategy',             type:'stock',  shares:15,      avgCost:305.06 },
  { ticker:'MU',   name:'Micron Technology',         type:'stock',  shares:6,       avgCost:955.54 },
  { ticker:'CEG',  name:'Constellation Energy',      type:'stock',  shares:12,      avgCost:298.58 },
  { ticker:'SPCX', name:'SpaceX',                    type:'stock',  shares:40,      avgCost:126.23 },
  { ticker:'GOOG', name:'Alphabet Class A',          type:'stock',  shares:20,      avgCost:197.81 },
  { ticker:'MRVL', name:'Marvell Technology',        type:'stock',  shares:20,      avgCost:131.50 },
  { ticker:'CRDO', name:'Credo Technology',          type:'stock',  shares:20,      avgCost:146.60 },
  { ticker:'TEM',  name:'Tempus AI',                 type:'stock',  shares:50,      avgCost:65.59  },
  { ticker:'EOSE', name:'Eos Energy',                type:'stock',  shares:380,     avgCost:4.66   },
  { ticker:'GLW',  name:'Corning',                   type:'stock',  shares:15,      avgCost:154.56 },
  { ticker:'ASTS', name:'AST SpaceMobile',           type:'stock',  shares:42,      avgCost:72.16  },
  { ticker:'ONDS', name:'Ondas',                     type:'stock',  shares:220,     avgCost:9.20   },
  { ticker:'ENTG', name:'Entegris',                  type:'stock',  shares:10,      avgCost:150.59 },
  { ticker:'ALMU', name:'Aeluma',                    type:'stock',  shares:105,     avgCost:15.95  },
  { ticker:'HL',   name:'Hecla Mining',               type:'stock',  shares:140,     avgCost:15.29  },
  { ticker:'MP',   name:'MP Materials',              type:'stock',  shares:40,      avgCost:48.66  },
  { ticker:'ASPI', name:'ASP Isotopes',              type:'stock',  shares:150,     avgCost:11.55  },
  { ticker:'IREN', name:'IREN',                      type:'stock',  shares:20,      avgCost:57.36  },
  { ticker:'RKLB', name:'Rocket Lab USA',            type:'stock',  shares:40,      avgCost:18.95  },
  { ticker:'FCX',  name:'Freeport-McMoRan',          type:'stock',  shares:20,      avgCost:61.50  },
  { ticker:'QNTM', name:'VanEck Quantum ETF',        type:'etf',    shares:120,     avgCost:23.57  },
  { ticker:'IEMG', name:'iShares MSCI EM ETF',       type:'etf',    shares:40,      avgCost:57.80  },
  { ticker:'SEC0', name:'iShares Semiconductors ETF',type:'etf',    shares:50,      avgCost:23.34  },
  { ticker:'BTC',  name:'Bitcoin',                   type:'crypto', shares:0.067169,avgCost:101815 },
  { ticker:'XRP',  name:'Ripple',                    type:'crypto', shares:800,     avgCost:2.61   },
  { ticker:'ETH',  name:'Ethereum',                  type:'crypto', shares:1,       avgCost:3546   },
  { ticker:'NEXO', name:'NEXO',                      type:'crypto', shares:2723.58, avgCost:1.26   },
  { ticker:'RND',  name:'Render',                    type:'crypto', shares:300,     avgCost:3.85   },
];

const CASH = 38971;

// Seed cache immediately with avg cost so page renders on first hit
var priceCache = { stocks:{}, news:[], updatedAt:new Date().toISOString() };
HOLDINGS.forEach(function(h){
  priceCache.stocks[h.ticker]={price:h.avgCost,change:0,changePct:0,prevClose:h.avgCost,seeded:true};
});

function delay(ms){return new Promise(function(r){setTimeout(r,ms);});}

async function fetchQuote(ticker){
  var url='https://finnhub.io/api/v1/quote?symbol='+ticker+'&token='+FINNHUB_KEY;
  try{
    var res=await fetch(url,{headers:{'User-Agent':'Mozilla/5.0'}});
    var data=await res.json();
    if(data&&data.c&&data.c>0){
      var chg=data.c-data.pc, pct=data.pc>0?(chg/data.pc)*100:0;
      priceCache.stocks[ticker]={price:data.c,change:chg,changePct:pct,prevClose:data.pc,high:data.h,low:data.l,seeded:false};
      return true;
    }
  }catch(e){console.error('Quote error '+ticker+':'+e.message);}
  return false;
}

async function fetchAllPrices(){
  console.log('Fetching live prices...');
  for(var i=0;i<HOLDINGS.length;i++){
    var ok=await fetchQuote(HOLDINGS[i].ticker);
    console.log((ok?'OK':'MISS')+' '+HOLDINGS[i].ticker+' ('+(i+1)+'/'+HOLDINGS.length+')');
    if(i<HOLDINGS.length-1)await delay(1200);
  }
  priceCache.updatedAt=new Date().toISOString();
  console.log('Done. '+Object.values(priceCache.stocks).filter(function(q){return!q.seeded;}).length+'/'+HOLDINGS.length+' live');
}

async function fetchNews(){
  try{
    var res=await fetch('https://finnhub.io/api/v1/news?category=general&token='+FINNHUB_KEY);
    var data=await res.json();
    if(Array.isArray(data))priceCache.news=data.slice(0,10).map(function(n){return{title:n.headline,publisher:n.source,link:n.url,time:n.datetime,thumbnail:n.image||null};});
  }catch(e){console.error('News error:',e.message);}
}

fetchAllPrices().then(fetchNews);
setInterval(function(){fetchAllPrices().then(fetchNews);},120000);

function buildPortfolio(){
  var enriched=HOLDINGS.map(function(h){
    var q=priceCache.stocks[h.ticker]||{price:h.avgCost,change:0,changePct:0};
    var price=q.price||h.avgCost, value=price*h.shares, cost=h.avgCost*h.shares;
    return Object.assign({},h,{price:price,value:value,cost:cost,pl:value-cost,plPct:((price-h.avgCost)/h.avgCost)*100,changePct:q.changePct||0,change:q.change||0,liveData:!q.seeded});
  });
  var totalVal=enriched.reduce(function(a,h){return a+h.value;},0)+CASH;
  return enriched.map(function(h){return Object.assign({},h,{allocPct:(h.value/totalVal)*100});}).sort(function(a,b){return b.value-a.value;});
}

function buildSummary(p){
  var tv=p.reduce(function(a,h){return a+h.value;},0)+CASH;
  var tc=p.reduce(function(a,h){return a+h.cost;},0);
  var tpl=p.reduce(function(a,h){return a+h.pl;},0);
  var dc=p.reduce(function(a,h){return a+(h.value*(h.changePct/100));},0);
  return{totalValue:tv,totalCost:tc,totalPL:tpl,plPct:(tpl/tc)*100,dayChange:dc,dayChangePct:(dc/tv)*100,cash:CASH,cashPct:(CASH/tv)*100,positions:p.length,winners:p.filter(function(h){return h.pl>0;}).length,losers:p.filter(function(h){return h.pl<0;}).length,liveCount:p.filter(function(h){return h.liveData;}).length,updatedAt:priceCache.updatedAt};
}

// Transaction history — ALL trades from Excel (closed + open)
const TRANSACTIONS = [
  // CLOSED — winners
  {symbol:'AMD',  name:'Advanced Micro Devices', category:'stock',    spent:11018.75,received:15027.82,pl:4009.07, status:'closed'},
  {symbol:'CRWD', name:'CrowdStrike',             category:'stock',    spent:2769.79, received:4625.47, pl:1855.68,status:'closed'},
  {symbol:'BRK.B',name:'Berkshire Hathaway B',   category:'stock',    spent:10433.40,received:11808.93,pl:1375.53,status:'closed'},
  {symbol:'PLTR', name:'Palantir',                category:'stock',    spent:2711.34, received:3944.62, pl:1233.28,status:'closed'},
  {symbol:'AVGO', name:'Broadcom',                category:'stock',    spent:2348.25, received:3325.35, pl:977.10, status:'closed'},
  {symbol:'AAPL', name:'Apple',                   category:'stock',    spent:5884.01, received:6782.25, pl:898.24, status:'closed'},
  {symbol:'ASME', name:'ASML',                    category:'stock',    spent:2916.68, received:3720.16, pl:803.48, status:'closed'},
  {symbol:'SNPS', name:'Synopsis',                category:'stock',    spent:2503.15, received:3277.09, pl:773.94, status:'closed'},
  {symbol:'OSCR', name:'Oscar Health',            category:'stock',    spent:2008.21, received:2773.39, pl:765.18, status:'closed'},
  {symbol:'SOFI', name:'SoFi Technologies',       category:'stock',    spent:5975.18, received:6657.40, pl:682.22, status:'closed'},
  {symbol:'FIG',  name:'Figma',                   category:'stock',    spent:2582.58, received:3041.98, pl:459.40, status:'closed'},
  {symbol:'APP',  name:'Applovin',                category:'stock',    spent:1932.00, received:2388.87, pl:456.87, status:'closed'},
  {symbol:'IONQ', name:'IonQ',                    category:'stock',    spent:1297.20, received:1713.18, pl:415.98, status:'closed'},
  {symbol:'RKT',  name:'Rocket Companies',        category:'stock',    spent:2010.81, received:2363.98, pl:353.17, status:'closed'},
  {symbol:'XAU',  name:'Gold',                    category:'commodity',spent:3492.72, received:3818.44, pl:325.72, status:'closed'},
  {symbol:'TKR',  name:'Timken',                  category:'stock',    spent:1027.90, received:1333.78, pl:305.88, status:'closed'},
  {symbol:'OUST', name:'Ouster',                  category:'stock',    spent:2112.00, received:2397.59, pl:285.59, status:'closed'},
  {symbol:'SKYT', name:'Skywater Technology',     category:'stock',    spent:1377.06, received:1644.49, pl:267.43, status:'closed'},
  {symbol:'SIRI', name:'Sirius XM',               category:'stock',    spent:3066.54, received:3287.91, pl:221.37, status:'closed'},
  {symbol:'WAL',  name:'Western Alliance',        category:'stock',    spent:1273.64, received:1402.80, pl:129.16, status:'closed'},
  {symbol:'NQSE', name:'iShares VII',             category:'etf',      spent:2600.00, received:2723.27, pl:123.27, status:'closed'},
  {symbol:'COPA', name:'WisdomTree Copper',       category:'etf',      spent:1550.80, received:1651.10, pl:100.30, status:'closed'},
  {symbol:'Z',    name:'Zillow',                  category:'stock',    spent:1589.18, received:1685.00, pl:95.82,  status:'closed'},
  {symbol:'BAC',  name:'Bank of America',         category:'stock',    spent:2387.84, received:2478.07, pl:90.23,  status:'closed'},
  {symbol:'SNOW', name:'Snowflake',               category:'stock',    spent:1645.56, received:1691.92, pl:46.36,  status:'closed'},
  {symbol:'EQQB', name:'NASDAQ ETF ACC',          category:'etf',      spent:374.05,  received:417.98,  pl:43.93,  status:'closed'},
  {symbol:'O4J0', name:'iShares S&P 500 EW',     category:'etf',      spent:1487.50, received:1504.99, pl:17.49,  status:'closed'},
  // CLOSED — losers
  {symbol:'NOW',  name:'ServiceNow',              category:'stock',    spent:724.17,  received:698.93,  pl:-25.24, status:'closed'},
  {symbol:'CSCO', name:'Cisco',                   category:'stock',    spent:3074.00, received:3043.80, pl:-30.20, status:'closed'},
  {symbol:'O',    name:'Realty Income',           category:'stock',    spent:1200.00, received:1132.99, pl:-67.01, status:'closed'},
  {symbol:'NFLX', name:'Netflix',                 category:'stock',    spent:5329.91, received:5233.46, pl:-96.45, status:'closed'},
  {symbol:'CYBR', name:'CyberArk',                category:'stock',    spent:1607.60, received:1500.48, pl:-107.12,status:'closed'},
  {symbol:'QDV5', name:'iShares MSCI India',      category:'etf',      spent:2392.50, received:2252.50, pl:-140.00,status:'closed'},
  {symbol:'CLS',  name:'Celestica',               category:'stock',    spent:1554.81, received:1399.54, pl:-155.27,status:'closed'},
  {symbol:'XAG',  name:'Silver',                  category:'commodity',spent:2939.88, received:2727.85, pl:-212.03,status:'closed'},
  {symbol:'CVX',  name:'Chevron',                 category:'stock',    spent:3239.92, received:2984.82, pl:-255.10,status:'closed'},
  {symbol:'PPTA', name:'Perpetua Resources',      category:'stock',    spent:1659.30, received:1391.80, pl:-267.50,status:'closed'},
  {symbol:'PATH', name:'UiPath',                  category:'stock',    spent:2781.78, received:2509.16, pl:-272.62,status:'closed'},
  {symbol:'VUAA', name:'S&P500 ETF ACC',          category:'etf',      spent:7400.97, received:7088.89, pl:-312.08,status:'closed'},
  {symbol:'HD',   name:'Home Depot',              category:'stock',    spent:2349.84, received:1997.63, pl:-352.21,status:'closed'},
  {symbol:'DELL', name:'Dell Technologies',       category:'stock',    spent:2599.30, received:2040.67, pl:-558.63,status:'closed'},
  {symbol:'ZETA', name:'Zeta Global',             category:'stock',    spent:2919.46, received:2351.47, pl:-567.99,status:'closed'},
  {symbol:'IS04', name:'iShares Treasury 20+',    category:'etf',      spent:5017.44, received:4171.30, pl:-846.14,status:'closed'},
  {symbol:'XPT',  name:'Platinum',                category:'commodity',spent:4994.70, received:3617.84, pl:-1376.86,status:'closed'},
  {symbol:'HIMS', name:'Hims & Hers Health',      category:'stock',    spent:2810.92, received:1300.75, pl:-1510.17,status:'closed'},
  {symbol:'BABA', name:'Alibaba',                 category:'stock',    spent:5555.08, received:3946.32, pl:-1608.76,status:'closed'},
  // OPEN positions
  {symbol:'AMZN', name:'Amazon',                  category:'stock',    spent:27603.54,received:26964.02,pl:0,status:'open'},
  {symbol:'META', name:'Meta Platforms',          category:'stock',    spent:19083.73,received:12558.00,pl:0,status:'open'},
  {symbol:'TSLA', name:'Tesla',                   category:'stock',    spent:18079.33,received:9753.26, pl:0,status:'open'},
  {symbol:'MSFT', name:'Microsoft',               category:'stock',    spent:17030.57,received:14829.82,pl:0,status:'open'},
  {symbol:'NVDA', name:'Nvidia',                  category:'stock',    spent:10267.93,received:206.84,  pl:0,status:'open'},
  {symbol:'MSTR', name:'MicroStrategy',           category:'stock',    spent:7022.78, received:3314.31, pl:0,status:'open'},
  {symbol:'MU',   name:'Micron Technology',       category:'stock',    spent:5736.24, received:0,       pl:0,status:'open'},
  {symbol:'CEG',  name:'Constellation Energy',    category:'stock',    spent:5673.11, received:2486.26, pl:0,status:'open'},
  {symbol:'SPCX', name:'SpaceX',                  category:'stock',    spent:5052.99, received:0,       pl:0,status:'open'},
  {symbol:'GOOG', name:'Alphabet Class A',        category:'stock',    spent:4947.32, received:1609.59, pl:0,status:'open'},
  {symbol:'MRVL', name:'Marvell Technology',      category:'stock',    spent:3682.97, received:2262.16, pl:0,status:'open'},
  {symbol:'CRDO', name:'Credo Technology',        category:'stock',    spent:3667.82, received:1102.20, pl:0,status:'open'},
  {symbol:'ETH',  name:'Ethereum',                category:'crypto',   spent:3581.37, received:0,       pl:0,status:'open'},
  {symbol:'NEXO', name:'NEXO',                    category:'crypto',   spent:3441.79, received:0,       pl:0,status:'open'},
  {symbol:'TEM',  name:'Tempus AI',               category:'stock',    spent:3280.31, received:0,       pl:0,status:'open'},
  {symbol:'EOSE', name:'Eos Energy',              category:'stock',    spent:3170.57, received:2905.48, pl:0,status:'open'},
  {symbol:'GLW',  name:'Corning',                 category:'stock',    spent:3091.25, received:926.33,  pl:0,status:'open'},
  {symbol:'ASTS', name:'AST SpaceMobile',         category:'stock',    spent:3031.73, received:0,       pl:0,status:'open'},
  {symbol:'QUTM', name:'VanEck Quantum ETF',      category:'etf',      spent:2828.80, received:0,       pl:0,status:'open'},
  {symbol:'ONDS', name:'Ondas',                   category:'stock',    spent:2345.64, received:472.85,  pl:0,status:'open'},
  {symbol:'IEMA', name:'iShares MSCI EM ETF',     category:'etf',      spent:2315.51, received:0,       pl:0,status:'open'},
  {symbol:'ENTG', name:'Entegris',                category:'stock',    spent:2259.90, received:679.65,  pl:0,status:'open'},
  {symbol:'ALMU', name:'Aeluma',                  category:'stock',    spent:2234.77, received:932.05,  pl:0,status:'open'},
  {symbol:'HL',   name:'Hecla Mining',             category:'stock',    spent:2140.60, received:0,       pl:0,status:'open'},
  {symbol:'MP',   name:'MP Materials',            category:'stock',    spent:1947.13, received:0,       pl:0,status:'open'},
  {symbol:'ASPI', name:'ASP Isotopes',            category:'stock',    spent:1732.01, received:0,       pl:0,status:'open'},
  {symbol:'IREN', name:'IREN',                    category:'stock',    spent:1722.12, received:407.99,  pl:0,status:'open'},
  {symbol:'BTC',  name:'Bitcoin',                 category:'crypto',   spent:13847.33,received:6637.58, pl:0,status:'open'},
  {symbol:'RKLB', name:'Rocket Lab USA',          category:'stock',    spent:1497.05, received:2123.32, pl:0,status:'open'},
  {symbol:'FCX',  name:'Freeport-McMoRan',        category:'stock',    spent:1230.00, received:0,       pl:0,status:'open'},
  {symbol:'SEC0', name:'iShares Semiconductors',  category:'etf',      spent:1167.00, received:0,       pl:0,status:'open'},
  {symbol:'XRP',  name:'Ripple',                  category:'crypto',   spent:6268.43, received:3600.21, pl:0,status:'open'},
  {symbol:'RND',  name:'Render',                  category:'crypto',   spent:1166.70, received:0,       pl:0,status:'open'},
];

app.get('/api/portfolio',function(req,res){var p=buildPortfolio();res.json({ok:true,holdings:p,cash:CASH});});
app.get('/api/portfolio/summary',function(req,res){var p=buildPortfolio();res.json({ok:true,summary:buildSummary(p)});});
app.get('/api/portfolio/:ticker',function(req,res){var p=buildPortfolio();var h=p.find(function(h){return h.ticker.toLowerCase()===req.params.ticker.toLowerCase();});if(!h)return res.status(404).json({ok:false,error:'Not found'});res.json({ok:true,holding:h});});
app.get('/api/allocation',function(req,res){var p=buildPortfolio();var s=buildSummary(p);var a=p.map(function(h){return{ticker:h.ticker,name:h.name,type:h.type,value:h.value,pct:h.allocPct};}).concat([{ticker:'CASH',name:'Cash',type:'cash',value:CASH,pct:s.cashPct}]);res.json({ok:true,totalValue:s.totalValue,allocation:a});});
app.get('/api/transactions',function(req,res){var cat=req.query.category;var data=cat?TRANSACTIONS.filter(function(t){return t.category===cat;}):TRANSACTIONS;res.json({ok:true,transactions:data,summary:{totalSpent:data.reduce(function(a,t){return a+t.spent;},0),totalReceived:data.reduce(function(a,t){return a+t.received;},0),count:data.length}});});
app.get('/api/transactions/categories',function(req,res){var cats=['stock','etf','crypto','commodity'];var result=cats.map(function(cat){var data=TRANSACTIONS.filter(function(t){return t.category===cat;});var spent=data.reduce(function(a,t){return a+t.spent;},0),received=data.reduce(function(a,t){return a+t.received;},0),pl=data.filter(function(t){return t.status==='closed';}).reduce(function(a,t){return a+t.pl;},0);return{category:cat,count:data.length,totalSpent:spent,totalReceived:received,realizedPL:pl,plPct:spent>0?(pl/spent)*100:0,winners:data.filter(function(t){return t.pl>0;}).length,losers:data.filter(function(t){return t.pl<0;}).length};});res.json({ok:true,categories:result});});
app.get('/api/news',function(req,res){res.json({ok:true,news:priceCache.news,updatedAt:priceCache.updatedAt});});
app.get('/api/prices',function(req,res){res.json({ok:true,stocks:priceCache.stocks,updatedAt:priceCache.updatedAt});});
app.get('/api/health',function(req,res){var live=Object.values(priceCache.stocks).filter(function(q){return!q.seeded;}).length;res.json({ok:true,status:'running',tickersLoaded:live,totalTickers:HOLDINGS.length,updatedAt:priceCache.updatedAt});});
app.get('*',function(req,res){res.sendFile(path.join(__dirname,'public','index.html'));});
app.listen(PORT,function(){console.log('Portfolio running on port '+PORT);});
