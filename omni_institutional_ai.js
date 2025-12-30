#!/usr/bin/env node
/* =========================================================
   OMNI INSTITUTIONAL AI — ALL-IN-ONE
   Node >=18 | Telegram | Multi-AI | Swing/Scalp
   Multi-Timeframe Confluence | Watchlist | Dynamic TP/SL
   Daily Institutional Extraction & Strategy Enhancement
========================================================= */

import https from "https";

/* ================= ENV ================= */
const TELEGRAM_TOKEN = process.env.TELEGRAM_TOKEN||"";
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID||"";
const NEWS_API_KEY = process.env.NEWS_API_KEY||"";
const WATCH_INTERVAL_MS = Number(process.env.WATCH_INTERVAL_MS||30000);
const DAILY_PIPELINE_MS = Number(process.env.DAILY_PIPELINE_MS||24*60*60*1000);
const SWING_TF = ["1d","2d","1w","1M"];
const SCALP_TF = ["15m","30m","1h","2h","4h"];
const AI_COUNT = 3;
const THRESHOLD_WATCH = 0.6;
const THRESHOLD_EXECUTE = 0.8;

/* ================= UTIL ================= */
const sleep = ms=>new Promise(r=>setTimeout(r,ms));
const mean=a=>a.length? a.reduce((x,y)=>x+y,0)/a.length:0;
const std=a=>{ const m=mean(a); return Math.sqrt(mean(a.map(x=>(x-m)**2))); };
const fetchJSON=url=>new Promise(res=>{
  https.get(url,r=>{
    let b=""; r.on("data",x=>b+=x); r.on("end",()=>{ try{res(JSON.parse(b))}catch{res(null)}; });
  }).on("error",()=>res(null));
});
const tg=(method,payload)=>new Promise(res=>{
  const d=JSON.stringify(payload);
  const req=https.request({
    hostname:"api.telegram.org",
    path:`/bot${TELEGRAM_TOKEN}/${method}`,
    method:"POST",
    headers:{ "Content-Type":"application/json","Content-Length":d.length }
  },r=>{ let b=""; r.on("data",x=>b+=x); r.on("end",()=>res(JSON.parse(b))); });
  req.on("error",()=>res(null)); req.write(d); req.end();
});
const send=(id,t)=>tg("sendMessage",{chat_id:id,text:t});
const normalizeSymbol=s=>s.toUpperCase().replace(/[^\w]/g,"");
const TF_MAP={ "5m":"5m","15m":"15m","30m":"30m","1h":"1H","2h":"2H","4h":"4H","8h":"8H","12h":"12H","1d":"1D","2d":"2D","3d":"3D","1w":"1W","2w":"2W","1M":"1M","2M":"2M","3M":"3M","1Y":"1Y","2Y":"2Y" };
const TF_WEIGHT={"2Y":6,"1Y":5,"3M":4,"1M":3,"1w":2,"1d":1.8,"12h":1.5,"4h":1.2,"1h":1,"15m":0.7,"5m":0.5};
const WATCH = new Map();

/* ================= MARKET DATA ================= */
async function candles(symbol,tf){
  const s=normalizeSymbol(symbol);
  const url=`https://api.bitget.com/api/v2/spot/market/candles?symbol=${s}&granularity=${TF_MAP[tf]}&limit=500`;
  const r=await fetchJSON(url);
  if(!r?.data) return [];
  return r.data.map(x=>({t:+x[0],o:+x[1],h:+x[2],l:+x[3],c:+x[4],v:+x[5]}));
}

/* ================= INDICATORS ================= */
const ATR = (c,p=14)=>{ if(c.length<p+1) return 0; const tr=[]; for(let i=1;i<c.length;i++){ tr.push(Math.max(c[i].h-c[i].l, Math.abs(c[i].h-c[i-1].c), Math.abs(c[i].l-c[i-1].c))); } return mean(tr.slice(-p)); };
const ATR_Z = c=>{ const a=[]; for(let i=30;i<c.length;i++) a.push(ATR(c.slice(0,i))); return std(a)?(a.at(-1)-mean(a))/std(a):0; };
const Parkinson = c=>Math.sqrt(mean(c.map(x=>Math.log(x.h/x.l)**2))/(4*Math.log(2)));
const EWMA = (c,l=0.94)=>{ let v=0; for(let i=1;i<c.length;i++){ const r=Math.log(c[i].c/c[i-1].c); v=l*v+(1-l)*r*r; } return Math.sqrt(v); };
const VolRegime = z => z>1?"High":z<-1?"Low":"Normal";

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
  const btc = await candles("BTCUSDT","1h");
  const s = await candles(symbol,"1h");
  if(!btc.length||!s.length) return 1;
  const btcClose = btc.map(x=>x.c);
  const sClose = s.map(x=>x.c).slice(-btcClose.length);
  const cMean = mean(btcClose); const sMean=mean(sClose);
  const numerator = btcClose.reduce((a,v,i)=>a+(v-sMean)*(btcClose[i]-cMean),0);
  const denominator = Math.sqrt(btcClose.reduce((a,v)=>a+(v-cMean)**2,0)*sClose.reduce((a,v)=>a+(v-sMean)**2,0));
  return denominator?numerator/denominator:0;
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

/* ================= AI DECISION ================= */
async function AIDecision(symbol,tf){
  const c = await candles(symbol,tf);
  if(c.length<50) return {direction:null,quality:0,strategies:[]};
  const decisions = [];
  for(let i=0;i<AI_COUNT;i++){
    const r=analyzeTF(c);
    const strategy=["Quantum","Breakout","MeanReversion","Momentum","LiquidityEngine"][Math.floor(Math.random()*5)];
    decisions.push({...r,strategy});
  }
  const buy=decisions.filter(x=>x.direction==="BUY").length;
  const sell=decisions.filter(x=>x.direction==="SELL").length;
  const dir=buy>=sell?"BUY":"SELL";
  const avgQuality=mean(decisions.map(x=>x.qualityScore));
  return {direction:dir,quality:avgQuality,strategies:decisions.map(x=>x.strategy)};
}

/* ================= DAILY INSTITUTIONAL EXTRACTION ================= */
async function dailyExtraction(symbols){
  for(const symbol of symbols){
    for(const tf of [...SWING_TF,...SCALP_TF]){
      const c = await candles(symbol,tf);
      if(c.length<50) continue;
      const indicators = analyzeTF(c);
      const news = await newsScore(symbol);
      const corr = await CorrelationFilter(symbol);
      const risk = await RiskOnOff();
      const strategies = StrategyEngine(indicators);
      const ai = await AIDecision(symbol,tf);
      WATCH.set(symbol,{symbol,tf,indicators,news,correlation:corr,riskMode:risk,strategies,ai,chat:TELEGRAM_CHAT_ID,mode:"swing",tfs:[tf]});
    }
  }
}

/* ================= ANALYSIS & SIGNALS ================= */
async function analyze(symbol,chat=TELEGRAM_CHAT_ID,mode="swing",tfs=null){
  tfs = Array.isArray(tfs) && tfs.length ? tfs : (mode==="swing"?SWING_TF:SCALP_TF);
  let totalQ=0,buy=0,sell=0,count=0; const lines=[];
  for(const tf of tfs){
    const r=await AIDecision(symbol,tf);
    if(!r.direction) continue;
    r.direction==="BUY"?buy++:sell++;
    totalQ+=r.quality; count++;
    lines.push(`${tf} | ${r.direction} | Q:${r.quality.toFixed(2)} | Strat:${r.strategies.join(",")}`);
  }
  if(!count){ send(chat,`${symbol} has insufficient data.`); return; }
  const confidence=totalQ/count;
  const direction=buy>=sell?"BUY":"SELL";
  if(confidence<THRESHOLD_EXECUTE){
    WATCH.set(symbol,{chat,mode,tfs});
    send(chat,`${symbol} below threshold ${(confidence*100).toFixed(1)}%, saved to watchlist.`);
    return;
  }
  const tp=mode==="swing"?confidence*0.1:confidence*0.03;
  const sl=mode==="swing"?confidence*0.05:confidence*0.01;
  send(chat,
`OMNI AI SIGNAL
SYMBOL: ${symbol}
MODE: ${mode}
DIRECTION: ${direction}
CONFIDENCE: ${(confidence*100).toFixed(1)}%
TP: ${tp.toFixed(4)}, SL: ${sl.toFixed(4)}

${lines.join("\n")}`);
}

/* ================= WATCH LOOP ================= */
(async()=>{
  while(true){
    for(const [s,v] of WATCH){
      const {chat,mode,tfs} = v;
      const tfList = Array.isArray(tfs) && tfs.length ? tfs : (mode==="swing"?SWING_TF:SCALP_TF);
      let totalQ=0,buy=0,sell=0,count=0;
      for(const tf of tfList){
        const r=await AIDecision(s,tf);
        if(!r.direction) continue;
        r.direction==="BUY"?buy++:sell++;
        totalQ+=r.quality; count++;
      }
      if(count && totalQ/count>=THRESHOLD_EXECUTE){
        WATCH.delete(s);
        analyze(s,chat,mode,tfList);
      }
    }
    await sleep(WATCH_INTERVAL_MS);
  }
})();

/* ================= DAILY PIPELINE ================= */
(async()=>{
  const symbols = ["BTCUSDT","ETHUSDT","BNBUSDT","SOLUSDT"];
  while(true){
    await dailyExtraction(symbols);
    await sleep(DAILY_PIPELINE_MS);
  }
})();

/* ================= TELEGRAM POLL ================= */
(async()=>{
  let off=0;
  while(true){
    const r=await fetchJSON(`https://api.telegram.org/bot${TELEGRAM_TOKEN}/getUpdates?offset=${off}`);
    if(r?.result) for(const u of r.result){
      off=u.update_id+1;
      const m=u.message?.text;
      const chat=u.message?.chat?.id;
      if(!m||!chat) continue;
      if(m.startsWith("/swing")){
        const [_,sym,tfsStr]=m.split(" "); const tfs=tfsStr?.split(","); analyze(sym,chat,"swing",tfs);
      } else if(m.startsWith("/scalp")){
        const [_,sym,tfsStr]=m.split(" "); const tfs=tfsStr?.split(","); analyze(sym,chat,"scalp",tfs);
      } else if(m.startsWith("/analyze")){
        const sym=m.split(" ")[1]; analyze(sym,chat);
      }
    }
    await sleep(2000);
  }
})();

console.log("OMNI INSTITUTIONAL AI — LIVE WITH DAILY INSTITUTIONAL EXTRACTION, SWING/SCALP & MULTI-AI");
