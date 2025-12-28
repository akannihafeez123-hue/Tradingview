#!/usr/bin/env node
/* =========================================================
   OMNI INSTITUTIONAL AI — FULL INSTITUTIONAL ALL-IN-ONE
   ✔ Spot/Futures Auto-Selection
   ✔ Multi-Timeframe Confluence
   ✔ Complete Strategies, Indicators & Features
   ✔ Confidence Scoring
   ✔ Cross-Asset Correlation
   ✔ Risk-On/Off Regime
   ✔ Auto Trade Signals (Entry / SL / TP)
   Node >= 18 | No package.json | No simulation
========================================================= */

import https from "https";

/* ================= ENV ================= */
const TELEGRAM_TOKEN = process.env.TELEGRAM_TOKEN || "";

/* ================= UTILITIES ================= */
const sleep = ms => new Promise(r => setTimeout(r, ms));
const mean = arr => arr.length ? arr.reduce((a,b)=>a+b,0)/arr.length : 0;
const std = arr => { if(!arr.length) return 0; const m = mean(arr); return Math.sqrt(mean(arr.map(x=>(x-m)**2))); };
const corr = (a,b) => { if(a.length!==b.length || a.length===0) return 0; const ma=mean(a), mb=mean(b); const num=a.map((x,i)=>(x-ma)*(b[i]-mb)).reduce((x,y)=>x+y,0); const den=Math.sqrt(a.map(x=>(x-ma)**2).reduce((x,y)=>x+y,0) * b.map(y=>(y-mb)**2).reduce((x,y)=>x+y,0)); return den?num/den:0; };

/* ================= TELEGRAM ================= */
const tgRequest = (method, payload) => new Promise(resolve=>{
  const data = JSON.stringify(payload);
  const req = https.request({
    hostname:"api.telegram.org",
    path:`/bot${TELEGRAM_TOKEN}/${method}`,
    method:"POST",
    headers:{ "Content-Type":"application/json", "Content-Length":data.length }
  }, r=>{
    let b=""; r.on("data",d=>b+=d);
    r.on("end",()=>resolve(JSON.parse(b)));
  });
  req.on("error",()=>resolve(null));
  req.write(data); req.end();
});
const send = (id,txt)=>tgRequest("sendMessage",{chat_id:id,text:txt});

/* ================= HTTP FETCH ================= */
async function fetchJSON(url){
  return new Promise(resolve=>{
    https.get(url,r=>{
      let b=""; r.on("data",d=>b+=d);
      r.on("end",()=>{ try{resolve(JSON.parse(b))}catch{resolve(null)} });
    }).on("error",()=>resolve(null));
  });
}

/* ================= SYMBOL & TIMEFRAME ================= */
const normalizeSymbol = s=>s?.toUpperCase().replace(/[\/\-_]/g,"");
const tfMap = { "1m":"1m","5m":"5m","15m":"15m","30m":"30m","1h":"1H","4h":"4H","1d":"1D","1w":"1W" };
const normalizeTF = tf => tfMap[tf] || "4H";

/* ================= MARKET DATA ================= */
async function fetchCandles(symbol, tf, market){
  const s = normalizeSymbol(symbol);
  const g = normalizeTF(tf);
  const url = market==="spot"
    ? `https://api.bitget.com/api/v2/spot/market/candles?symbol=${s}&granularity=${g}&limit=500`
    : `https://api.bitget.com/api/v2/mix/market/candles?symbol=${s}&productType=USDT-FUTURES&granularity=${g}&limit=500`;
  const r = await fetchJSON(url);
  if(!r || !Array.isArray(r.data)) return [];
  return r.data.map(c=>({t:+c[0], o:+c[1], h:+c[2], l:+c[3], c:+c[4], v:+c[5]}));
}

async function getMarketCandles(symbol, tf){
  let c = await fetchCandles(symbol, tf, "spot");
  if(c.length>=50) return { candles:c, market:"SPOT" };
  c = await fetchCandles(symbol, tf, "futures");
  if(c.length>=50) return { candles:c, market:"FUTURES" };
  return { candles:[], market:null };
}

/* ================= INDICATORS ================= */
const ATR = (c,p=14)=> { if(c.length<p+1) return 0; const tr=[]; for(let i=1;i<c.length;i++){ tr.push(Math.max(c[i].h-c[i].l, Math.abs(c[i].h-c[i-1].c), Math.abs(c[i].l-c[i-1].c))); } return mean(tr.slice(-p)); };
const ATR_Z = c=>{ const a=[]; for(let i=30;i<c.length;i++) a.push(ATR(c.slice(0,i))); return std(a)?(a.at(-1)-mean(a))/std(a):0; };
const Parkinson = c=>Math.sqrt(mean(c.map(x=>Math.log(x.h/x.l)**2))/(4*Math.log(2)));
const EWMA = (c,l=0.94)=>{ let v=0; for(let i=1;i<c.length;i++){ const r=Math.log(c[i].c/c[i-1].c); v=l*v+(1-l)*r*r; } return Math.sqrt(v); };
const VolRegime = z => z>1?"High":z<-1?"Low":"Normal";

/* ================= INSTITUTIONAL LIQUIDITY ================= */
const VolumeDelta = c => c.slice(1).reduce((d,x,i)=>d+(x.c>c[i].c?x.v:-x.v),0);
const Absorption = c => Math.abs(VolumeDelta(c))>mean(c.map(x=>x.v))*3;
const LiquidityVoid = c => c.length>20 && (c.at(-1).h-c.at(-1).l)>mean(c.slice(-20).map(x=>x.h-x.l))*2;
const StopHuntProb = c => Math.min(1,Math.abs(c.at(-1).c-c.at(-20).c)/(ATR(c)||1));
const IcebergProxy = c => c.at(-1).v>mean(c.slice(-20).map(x=>x.v))*4;

/* ================= MARKET STRUCTURE ================= */
const BOS = c=>c.length>20 && (c.at(-1).h>Math.max(...c.slice(-20,-1).map(x=>x.h)) || c.at(-1).l<Math.min(...c.slice(-20,-1).map(x=>x.l)));
const CHoCH = c=>c.length>4 && ((c.at(-1).c>c.at(-2).h && c.at(-2).c<c.at(-3).l) || (c.at(-1).c<c.at(-2).l && c.at(-2).c>c.at(-3).h)));
const PremiumDiscount = c=>c.at(-1).c>(Math.max(...c.map(x=>x.h))+Math.min(...c.map(x=>x.l)))/2?"Premium":"Discount";
const RangeState = c=>Math.abs(c.at(-1).c-c.at(-20).c)<ATR(c)?"Accepted":"Rejected";

/* ================= ORDER FLOW ================= */
const WyckoffEVR = c => Math.abs(c.at(-1).c-c.at(-20).c)/mean(c.slice(-20).map(x=>x.v));
const SpreadEfficiency = c => (c.at(-1).h-c.at(-1).l)/(ATR(c)||1);
const RelativeVolume = c => c.at(-1).v/mean(c.slice(-20).map(x=>x.v));

/* ================= TIME & CYCLE ================= */
const Hurst = c=>{let s=0,r=0,m=mean(c.map(x=>x.c)); for(const x of c){s+=x.c-m; r=Math.max(r,Math.abs(s));} return std(c.map(x=>x.c))?Math.log(r/std(c.map(x=>x.c)))/Math.log(c.length):0;};
const FractalDimension = c=>2-Hurst(c);
const TimeSymmetry = c=>mean(c.slice(-10).map((x,i)=>x.c-c[i].c));

/* ================= CROSS-ASSET ================= */
const BTCDominance = async()=>{ const r=await fetchJSON("https://api.coingecko.com/api/v3/global"); return r?.data?.market_cap_percentage?.btc||0; };
async function CorrelationFilter(symbol){
  const btc = await getMarketCandles("BTCUSDT","1h");
  const s = await getMarketCandles(symbol,"1h");
  if(!btc.candles.length || !s.candles.length) return 1;
  const btcClose = btc.candles.map(x=>x.c);
  const sClose = s.candles.map(x=>x.c).slice(-btcClose.length);
  return corr(btcClose,sClose);
}
async function RiskOnOff(){ const btcDom=await BTCDominance(); return btcDom>50?"Risk-On":"Risk-Off"; }

/* ================= STRATEGY ENGINE ================= */
function StrategyEngine(f){
  if(f.liq && f.stopHunt>0.6) return "Liquidity Engine";
  if(f.bos && f.volRegime==="High") return "Breakout Hunter";
  if(f.atrZ>1 && f.relVol>2) return "Momentum Scalper";
  if(f.absorption && f.volRegime==="Low") return "Mean Reversion";
  return "Quantum Engine V2.0";
}

/* ================= SINGLE TF ANALYSIS ================= */
function analyzeTF(c){
  const volZ = ATR_Z(c);
  return {
    atr:ATR(c), atrZ:volZ, delta:VolumeDelta(c),
    bos:BOS(c), choch:CHoCH(c),
    liq:LiquidityVoid(c), stopHunt:StopHuntProb(c),
    absorption:Absorption(c), relVol:RelativeVolume(c),
    volRegime:VolRegime(volZ)
  };
}

/* ================= TRADE SIGNALS ================= */
function TradeSignals(c, features){
  const entry = c.at(-1).c;
  const atr = features.atr || 0;
  let sl, tp;
  // Logic based on strategy
  if(features.bos){
    sl = entry - atr*0.8;
    tp = entry + atr*1.5;
  }else if(features.absorption){
    sl = entry - atr*0.5;
    tp = entry + atr*1;
  }else{
    sl = entry - atr*0.7;
    tp = entry + atr*1.2;
  }
  return {entry, sl, tp};
}

/* ================= MULTI-TF CONFLUENCE ================= */
async function analyze(symbol, tf){
  const tfs = ["1h","4h","1d"];
  if(!tfs.includes(tf)) tfs.unshift(tf);
  const results = [];
  let marketUsed = null;
  for(const t of tfs){
    const r = await getMarketCandles(symbol,t);
    if(!r.candles.length) continue;
    marketUsed=r.market;
    const f = analyzeTF(r.candles);
    const signals = TradeSignals(r.candles,f);
    results.push({tf:t,features:f,strat:StrategyEngine(f),signals});
  }
  if(!results.length) throw Error("No Bitget spot or futures data available");
  const votes = {};
  for(const r of results) votes[r.strat]=(votes[r.strat]||0)+1;
  const finalStrat = Object.entries(votes).sort((a,b)=>b[1]-a[1])[0][0];
  const confidence = Math.round(Object.entries(votes).sort((a,b)=>b[1]-a[1])[0][1]/results.length*100);
  return {
    symbol:normalizeSymbol(symbol),
    market:marketUsed,
    strategy:finalStrat,
    confidence,
    confluence:results,
    risk:await RiskOnOff(),
    correlation:await CorrelationFilter(symbol)
  };
}

/* ================= TELEGRAM LOOP ================= */
async function poll(){
  let off=0;
  while(true){
    const r = await fetchJSON(`https://api.telegram.org/bot${TELEGRAM_TOKEN}/getUpdates?offset=${off}`);
    if(!r?.result) continue;
    for(const u of r.result){
      off=u.update_id+1;
      const msg=u.message?.text||"", chat=u.message?.chat.id;
      if(msg.startsWith("/analyze")){
        const [,s,t]=msg.split(" ");
        try{
          const a = await analyze(s,t||"4h");
          send(chat,
`Asset: ${a.symbol}
Market: ${a.market}
Final Strategy: ${a.strategy} (Confidence: ${a.confidence}%)
Risk Regime: ${a.risk}
Correlation vs BTC: ${a.correlation.toFixed(2)}

Confluence:
${a.confluence.map(x=>`${x.tf}: ${x.strat} | Entry: ${x.signals.entry} | SL: ${x.signals.sl} | TP: ${x.signals.tp}`).join("\n")}`);
        }catch(e){ send(chat,e.message); }
      }
    }
    await sleep(2000);
  }
}

/* ================= BOOT ================= */
if(!TELEGRAM_TOKEN){ console.error("Missing TELEGRAM_TOKEN"); process.exit(1); }
console.log("OMNI INSTITUTIONAL AI — FULL SYSTEM LIVE WITH TRADE SIGNALS");
poll();
