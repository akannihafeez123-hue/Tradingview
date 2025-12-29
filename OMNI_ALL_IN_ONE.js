#!/usr/bin/env node
/* =========================================================
   OMNI INSTITUTIONAL AI — AUTONOMOUS INSTITUTIONAL DESK
   Node >= 18 | Spot/Futures Auto | Multi-TF | Multi-Asset
   Complete Strategies, Indicators, ML Ensemble, News, Multi-TF, Watchlist
========================================================= */

import https from "https";
import tf from "@tensorflow/tfjs-node"; // TensorFlow.js for Node

/* ================= ENV ================= */
const TELEGRAM_TOKEN = process.env.TELEGRAM_TOKEN || "";
const NEWS_API_KEY = process.env.NEWS_API_KEY || "";
const ALERT_THRESHOLD = parseFloat(process.env.ALERT_THRESHOLD) || 0.8;
const WATCH_INTERVAL_MS = parseInt(process.env.WATCH_INTERVAL_MS) || 30000;

/* ================= UTILITIES ================= */
const sleep = ms => new Promise(r => setTimeout(r, ms));
const mean = arr => arr.length ? arr.reduce((a,b)=>a+b,0)/arr.length : 0;
const std = arr => { if(!arr.length) return 0; const m=mean(arr); return Math.sqrt(mean(arr.map(x=>(x-m)**2))); };
const corr = (a,b) => { if(a.length!==b.length||a.length===0) return 0; const ma=mean(a),mb=mean(b); const num=a.map((x,i)=>(x-ma)*(b[i]-mb)).reduce((x,y)=>x+y,0); const den=Math.sqrt(a.map(x=>Math.pow(x-ma,2)).reduce((x,y)=>x+y,0) * b.map(y=>Math.pow(y-mb,2)).reduce((x,y)=>x+y,0)); return den?num/den:0; };

/* ================= TELEGRAM ================= */
const tgRequest = (method,payload) => new Promise(resolve=>{
  const data = JSON.stringify(payload);
  const req = https.request({
    hostname:"api.telegram.org",
    path:`/bot${TELEGRAM_TOKEN}/${method}`,
    method:"POST",
    headers:{ "Content-Type":"application/json","Content-Length":data.length }
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
const tfMap = {
  "5m":"5m","15m":"15m","30m":"30m","1h":"1H","2h":"2H","4h":"4H","5h":"5H","8h":"8H","12h":"12H",
  "1d":"1D","2d":"2D","3d":"3D","1w":"1W","2w":"2W","1M":"1M","2M":"2M","3M":"3M","1Y":"1Y","2Y":"2Y"
};
const normalizeTF = tf=>tfMap[tf]||null;

/* ================= MARKET DATA ================= */
async function fetchCandles(symbol, tf, market){
  const s = normalizeSymbol(symbol);
  const g = normalizeTF(tf);
  if(!g) return [];
  const url = market==="spot"
    ? `https://api.bitget.com/api/v2/spot/market/candles?symbol=${s}&granularity=${g}&limit=500`
    : `https://api.bitget.com/api/v2/mix/market/candles?symbol=${s}&productType=USDT-FUTURES&granularity=${g}&limit=500`;
  const r = await fetchJSON(url);
  if(!r||!Array.isArray(r.data)) return [];
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
const ATR = (c,p=14)=>{ if(c.length<p+1) return 0; const tr=[]; for(let i=1;i<c.length;i++){ tr.push(Math.max(c[i].h-c[i].l, Math.abs(c[i].h-c[i-1].c), Math.abs(c[i].l-c[i-1].c))); } return mean(tr.slice(-p)); };
const ATR_Z = c=>{ const a=[]; for(let i=30;i<c.length;i++) a.push(ATR(c.slice(0,i))); return std(a)?(a.at(-1)-mean(a))/std(a):0; };
const Parkinson = c=>Math.sqrt(mean(c.map(x=>Math.log(x.h/x.l)**2))/(4*Math.log(2)));
const EWMA = (c,l=0.94)=>{ let v=0; for(let i=1;i<c.length;i++){ const r=Math.log(c[i].c/c[i-1].c); v=l*v+(1-l)*r*r; } return Math.sqrt(v); };
const VolRegime = z => z>1?"High":z<-1?"Low":"Normal";
const EMA = (c, period=14)=>{ let k=2/(period+1); let ema=c[0].c; for(let i=1;i<c.length;i++){ ema=c[i].c*k + ema*(1-k); } return ema; };
const RSI = (c, period=14)=>{ if(c.length<period+1) return 50; let gains=0,losses=0; for(let i=1;i<c.length;i++){ const diff=c[i].c-c[i-1].c; if(diff>0) gains+=diff; else losses-=diff; } return 100-(100/(1+gains/(losses||1))); };
const MACD = (c, fast=12, slow=26, signal=9)=>{ const emaFast=EMA(c,fast); const emaSlow=EMA(c,slow); const macdLine=emaFast-emaSlow; return {macd:macdLine, signal:EMA(c.slice(-signal),signal), hist:macdLine-EMA(c.slice(-signal),signal)}; };
const BollingerBands = (c, period=20, mult=2)=>{ const m=mean(c.slice(-period).map(x=>x.c)); const s=std(c.slice(-period).map(x=>x.c)); return {upper:m+mult*s, middle:m, lower:m-mult*s}; };

/* ================= INSTITUTIONAL LIQUIDITY ================= */
const VolumeDelta = c => c.slice(1).reduce((d,x,i)=>d+(x.c>c[i].c?x.v:-x.v),0);
const Absorption = c => Math.abs(VolumeDelta(c))>mean(c.map(x=>x.v))*3;
const LiquidityVoid = c => c.length>20&&(c.at(-1).h-c.at(-1).l)>mean(c.slice(-20).map(x=>x.h-x.l))*2;
const StopHuntProb = c => Math.min(1,Math.abs(c.at(-1).c-c.at(-20).c)/(ATR(c)||1));
const IcebergProxy = c => c.at(-1).v>mean(c.slice(-20).map(x=>x.v))*4;

/* ================= MARKET STRUCTURE ================= */
const BOS = c=>c.length>20&&(c.at(-1).h>Math.max(...c.slice(-20,-1).map(x=>x.h)) || c.at(-1).l<Math.min(...c.slice(-20,-1).map(x=>x.l)));
const CHoCH = c=>c.length>3 && ((c.at(-1).c>c.at(-2).h && c.at(-2).c<c.at(-3).l) || (c.at(-1).c<c.at(-2).l && c.at(-2).c>c.at(-3).h));
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
  if(!btc.candles.length||!s.candles.length) return 1;
  const btcClose = btc.candles.map(x=>x.c);
  const sClose = s.candles.map(x=>x.c).slice(-btcClose.length);
  return corr(btcClose,sClose);
}
async function RiskOnOff(){ const btcDom=await BTCDominance(); return btcDom>50?"Risk-On":"Risk-Off"; }

/* ================= NEWS SCORE ================= */
async function newsScore(symbol){
  if(!NEWS_API_KEY) return 0;
  const r=await fetchJSON(`https://newsapi.org/v2/everything?q=${symbol}&apiKey=${NEWS_API_KEY}`);
  if(!r?.articles?.length) return 0;
  let score=0;
  for(const a of r.articles){
    const t = (a.title||"").toLowerCase() + " " + (a.description||"").toLowerCase();
    if(t.includes("bull")||t.includes("buy")) score+=1;
    else if(t.includes("bear")||t.includes("sell")) score-=1;
  }
  return score/r.articles.length;
}

/* ================= ML MODEL ================= */
let mlModel=null;
async function loadMLModel(){
  try{ mlModel = await tf.loadLayersModel('file://./ml_model/model.json'); }catch(e){ console.error("ML model load failed",e); }
}
async function predictConfidence(features){
  if(!mlModel) return 0.5;
  const tensor = tf.tensor2d([features]);
  const pred = mlModel.predict(tensor);
  const conf = (await pred.data())[0];
  return conf;
}

/* ================= STRATEGY ENGINE ================= */
function StrategyEngine(f){
  const strategies=[];
  if(f.liq && f.stopHunt>0.6) strategies.push("Liquidity Engine");
  if(f.bos && f.volRegime==="High") strategies.push("Breakout Hunter");
  if(f.atrZ>1 && f.relVol>2) strategies.push("Momentum Scalper");
  if(f.absorption && f.volRegime==="Low") strategies.push("Mean Reversion");
  strategies.push("Quantum Engine V2.0");
  return strategies[Math.floor(Math.random()*strategies.length)];
}

/* ================= SINGLE TF ANALYSIS ================= */
function analyzeTF(c){
  const volZ = ATR_Z(c);
  const atr = ATR(c);
  const delta = VolumeDelta(c);
  const relVol = RelativeVolume(c);
  const bos = BOS(c);
  const choch = CHoCH(c);
  const liq = LiquidityVoid(c);
  const stopHunt = StopHuntProb(c);
  const absorption = Absorption(c);
  const volRegime = VolRegime(volZ);
  const direction = (bos && c.at(-1).c>c.at(-2).c) || (absorption && c.at(-1).c>c.at(-2).c) ? "BUY" : "SELL";
  const qualityScore = volZ*Math.abs(delta)*relVol*(bos?1.2:1)*(absorption?1.1:1);
  return { atr, atrZ:volZ, delta, relVol, bos, choch, liq, stopHunt, absorption, volRegime, direction, qualityScore };
}

/* ================= TRADE SIGNALS ================= */
function TradeSignals(c,f,newsImpact=0){
  const entry = c.at(-1).c;
  const atr = f.atr || 0;
  let sl,tp;
  let dir = f.direction;
  if(newsImpact>0.1) dir="BUY"; else if(newsImpact<-0.1) dir="SELL";
  if(dir==="BUY"){ sl = entry - atr*1; tp = entry + atr*2; }
  else{ sl = entry + atr*1; tp = entry - atr*2; }
  return {entry, sl, tp, direction:dir};
}

/* ================= MULTI-TF TOP-DOWN ANALYSIS ================= */
const topDownTFs = ["2Y","1Y","3M","2M","1M","2w","1w","3d","2d","1d","12h","8h","5h","4h","1h","15m","5m"];
const tfWeights = {"2Y":8,"1Y":7,"3M":6,"2M":5,"1M":4,"2w":3,"1w":2,"3d":1.5,"2d":1.3,"1d":1.2,"12h":1.1,"8h":1,"5h":1,"4h":1,"1h":0.8,"15m":0.5,"5m":0.3};

/* ================= WATCHLIST ================= */
const watchlist = new Map();

/* ================= ANALYZE WITH CONFIDENCE & WAIT ================= */
async function analyze(symbol, chat){
  const results=[];
  let marketUsed=null;
  let voteScore = {BUY:0,SELL:0};
  const stratVotes={};
  let totalQuality=0;
  const newsImpact = await newsScore(symbol);

  for(const tf of topDownTFs){
    const r = await getMarketCandles(symbol,tf);
    if(!r.candles.length) continue;
    marketUsed=r.market;
    const f = analyzeTF(r.candles);
    const s = TradeSignals(r.candles,f,newsImpact);
    const strat = StrategyEngine(f);
    stratVotes[strat]=(stratVotes[strat]||0)+(tfWeights[tf]||1);
    results.push({tf, features:f, signals:s, strat});
    voteScore[s.direction]+=tfWeights[tf]||1;
    totalQuality+=f.qualityScore*(tfWeights[tf]||1);
  }

  if(!results.length) throw new Error("No supported Bitget data available");

  const avgQuality = totalQuality/results.length;
  const totalWeight = voteScore.BUY + voteScore.SELL;
  const finalDirection = voteScore.BUY>=voteScore.SELL?"BUY":"SELL";
  const confluenceRatio = finalDirection==="BUY"?voteScore.BUY/totalWeight:voteScore.SELL/totalWeight;

  // ML Prediction Integration
  const featuresVector = results.map(r=>r.features.qualityScore);
  const mlConfidence = await predictConfidence(featuresVector);

  if(avgQuality<ALERT_THRESHOLD || mlConfidence<ALERT_THRESHOLD){
    watchlist.set(symbol,{chat,lastAnalysis:Date.now()});
    send(chat,`Market for ${symbol} is choppy / low volatility — waiting for optimal setup`);
    return;
  }

  const finalEntry = results.at(-1).signals.entry;
  const finalSL = results.at(-1).signals.sl;
  const finalTP = results.at(-1).signals.tp;
  const bestStrategy = Object.entries(stratVotes).sort((a,b)=>b[1]-a[1])[0][0];

  send(chat,
`Asset: ${normalizeSymbol(symbol)}
Market: ${marketUsed}
Direction: ${finalDirection}
Confluence: ${(confluenceRatio*100).toFixed(0)}%
Entry: ${finalEntry.toFixed(4)}
SL: ${finalSL.toFixed(4)}
TP: ${finalTP.toFixed(4)}
Avg Confidence: ${avgQuality.toFixed(2)}
ML Confidence: ${mlConfidence.toFixed(2)}
News Impact: ${newsImpact.toFixed(2)}
Recommended Strategy: ${bestStrategy}

Multi-TF Signals:
${results.map(x=>`${x.tf} | ${x.strat} | Dir:${x.signals.direction} | Entry:${x.signals.entry.toFixed(4)} | SL:${x.signals.sl.toFixed(4)} | TP:${x.signals.tp.toFixed(4)} | Qual:${x.features.qualityScore.toFixed(2)}`).join("\n")}`);
}

/* ================= WATCHLIST LOOP ================= */
async function watchLoop(){
  while(true){
    for(const [symbol,data] of watchlist){
      try{
        const r = await getMarketCandles(symbol,"1h");
        if(!r.candles.length) continue;
        const f = analyzeTF(r.candles);
        if(f.qualityScore>=ALERT_THRESHOLD){
          await analyze(symbol,data.chat);
          watchlist.delete(symbol);
        }
      }catch{}
    }
    await sleep(WATCH_INTERVAL_MS);
  }
}

/* ================= TELEGRAM LOOP ================= */
async function poll(){
  let off=0;
  while(true){
    const r=await fetchJSON(`https://api.telegram.org/bot${TELEGRAM_TOKEN}/getUpdates?offset=${off}`);
    if(!r?.result) { await sleep(2000); continue; }
    for(const u of r.result){
      off=u.update_id+1;
      const msg=u.message?.text||"", chat=u.message?.chat.id;
      if(msg.startsWith("/analyze")){
        const [,s] = msg.split(" ");
        if(!s) continue;
        analyze(s,chat);
      }
    }
    await sleep(2000);
  }
}

/* ================= BOOT ================= */
if(!TELEGRAM_TOKEN){ console.error("Missing TELEGRAM_TOKEN"); process.exit(1); }
console.log("OMNI INSTITUTIONAL AI — AUTONOMOUS DESK LIVE");
await loadMLModel();
watchLoop();
poll();
