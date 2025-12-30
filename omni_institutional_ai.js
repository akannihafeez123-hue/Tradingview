#!/usr/bin/env node
/* =========================================================
   OMNI INSTITUTIONAL AI — FULL ALL-IN-ONE (FINAL)
   Absolute Entry / TP / SL | Normalized Confidence
========================================================= */

import https from "https";

/* ================= ENV ================= */
const TELEGRAM_TOKEN = process.env.TELEGRAM_TOKEN || "";
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID || "";
const NEWS_API_KEY = process.env.NEWS_API_KEY || "";

const WATCH_INTERVAL_MS = 30000;
const DAILY_PIPELINE_MS = 86400000;

const SWING_TF = ["1d","2d","1w","1M"];
const SCALP_TF = ["15m","30m","1h","2h","4h"];

const AI_COUNT = 3;
const EXEC_THRESHOLD = 0.8;

const WATCH = new Map();

/* ================= UTIL ================= */
const sleep = ms => new Promise(r => setTimeout(r, ms));
const mean = a => a.length ? a.reduce((x,y)=>x+y,0)/a.length : 0;
const std = a => { const m=mean(a); return Math.sqrt(mean(a.map(x=>(x-m)**2))); };
const clamp = (v,min,max)=>Math.max(min,Math.min(max,v));

const fetchJSON = url => new Promise(res=>{
  https.get(url,r=>{
    let b=""; r.on("data",d=>b+=d);
    r.on("end",()=>{ try{res(JSON.parse(b))}catch{res(null)} });
  }).on("error",()=>res(null));
});

const send = (id,text)=>{
  if(!TELEGRAM_TOKEN) return;
  const d=JSON.stringify({chat_id:id,text});
  const req=https.request({
    hostname:"api.telegram.org",
    path:`/bot${TELEGRAM_TOKEN}/sendMessage`,
    method:"POST",
    headers:{ "Content-Type":"application/json","Content-Length":d.length }
  });
  req.write(d); req.end();
};

/* ================= MARKET DATA ================= */
async function candles(symbol,tf){
  const url=`https://api.bitget.com/api/v2/spot/market/candles?symbol=${symbol}&granularity=${tf}&limit=500`;
  const r=await fetchJSON(url);
  if(!r?.data) return [];
  return r.data.map(x=>({t:+x[0],o:+x[1],h:+x[2],l:+x[3],c:+x[4],v:+x[5]}));
}

/* ================= INDICATORS ================= */
const ATR=(c,p=14)=>{
  if(c.length<p+1) return 0;
  const tr=[];
  for(let i=1;i<c.length;i++)
    tr.push(Math.max(c[i].h-c[i].l,Math.abs(c[i].h-c[i-1].c),Math.abs(c[i].l-c[i-1].c)));
  return mean(tr.slice(-p));
};
const ATR_Z=c=>{ const a=[]; for(let i=30;i<c.length;i++) a.push(ATR(c.slice(0,i))); return std(a)?(a.at(-1)-mean(a))/std(a):0; };
const Parkinson=c=>Math.sqrt(mean(c.map(x=>Math.log(x.h/x.l)**2))/(4*Math.log(2)));
const EWMA=(c,l=0.94)=>{ let v=0; for(let i=1;i<c.length;i++){ const r=Math.log(c[i].c/c[i-1].c); v=l*v+(1-l)*r*r; } return Math.sqrt(v); };
const VolRegime=z=>z>1?"High":z<-1?"Low":"Normal";

/* ================= LIQUIDITY & ORDER FLOW ================= */
const VolumeDelta=c=>c.slice(1).reduce((d,x,i)=>d+(x.c>c[i].c?x.v:-x.v),0);
const Absorption=c=>Math.abs(VolumeDelta(c))>mean(c.map(x=>x.v))*3;
const LiquidityVoid=c=>c.length>20&&(c.at(-1).h-c.at(-1).l)>mean(c.slice(-20).map(x=>x.h-x.l))*2;
const StopHuntProb=c=>Math.min(1,Math.abs(c.at(-1).c-c.at(-20).c)/(ATR(c)||1));
const Iceberg=c=>c.at(-1).v>mean(c.slice(-20).map(x=>x.v))*4;

/* ================= STRUCTURE ================= */
const BOS=c=>c.length>20&&(c.at(-1).h>Math.max(...c.slice(-20,-1).map(x=>x.h))||c.at(-1).l<Math.min(...c.slice(-20,-1).map(x=>x.l)));
const CHoCH=c=>c.length>3&&((c.at(-1).c>c.at(-2).h&&c.at(-2).c<c.at(-3).l)||(c.at(-1).c<c.at(-2).l&&c.at(-2).c>c.at(-3).h));
const RangeState=c=>Math.abs(c.at(-1).c-c.at(-20).c)<ATR(c)?"Accepted":"Rejected";

/* ================= CROSS ASSET ================= */
async function BTC_Dominance(){
  const r=await fetchJSON("https://api.coingecko.com/api/v3/global");
  return r?.data?.market_cap_percentage?.btc||0;
}
async function Correlation(symbol){
  const btc=await candles("BTCUSDT","1h");
  const s=await candles(symbol,"1h");
  if(!btc.length||!s.length) return 0;
  const a=btc.map(x=>x.c), b=s.map(x=>x.c);
  return mean(a.map((x,i)=>(x-mean(a))*(b[i]-mean(b))))/(std(a)*std(b)||1);
}

/* ================= NEWS ================= */
async function NewsScore(symbol){
  if(!NEWS_API_KEY) return 0;
  const r=await fetchJSON(`https://newsapi.org/v2/everything?q=${symbol}&apiKey=${NEWS_API_KEY}`);
  if(!r?.articles) return 0;
  let s=0;
  for(const a of r.articles){
    const t=(a.title||"").toLowerCase();
    if(t.includes("bull")) s++;
    if(t.includes("bear")) s--;
  }
  return s/r.articles.length;
}

/* ================= STRATEGY ENGINE ================= */
function StrategyEngine(f){
  const s=[];
  if(f.liq && f.stop>0.6) s.push("Liquidity Engine");
  if(f.bos && f.vol==="High") s.push("Breakout Hunter");
  if(f.abs && f.vol==="Low") s.push("Mean Reversion");
  if(f.delta>0) s.push("Momentum");
  s.push("Quantum Engine");
  return s;
}

/* ================= TF ANALYSIS ================= */
function analyzeTF(c){
  const atr=ATR(c);
  const z=ATR_Z(c);
  const delta=VolumeDelta(c);
  return {
    atr,
    delta,
    bos:BOS(c),
    choch:CHoCH(c),
    abs:Absorption(c),
    liq:LiquidityVoid(c),
    stop:StopHuntProb(c),
    vol:VolRegime(z),
    dir:delta>=0?"BUY":"SELL",
    quality:Math.abs(delta)/(mean(c.map(x=>x.v))||1)
  };
}

/* ================= AI DECISION ================= */
async function AIDecision(symbol,tf){
  const c=await candles(symbol,tf);
  if(c.length<50) return null;

  const votes=[];
  for(let i=0;i<AI_COUNT;i++) votes.push(analyzeTF(c));

  return {
    direction: votes.filter(x=>x.dir==="BUY").length>=votes.length/2?"BUY":"SELL",
    quality: mean(votes.map(x=>x.quality)),
    atr: mean(votes.map(x=>x.atr)),
    entry: c.at(-1).c,
    strategies: StrategyEngine(votes[0])
  };
}

/* ================= SIGNAL CORE ================= */
async function analyze(symbol,chat,mode){
  const tfs=mode==="swing"?SWING_TF:SCALP_TF;

  let buy=0,sell=0,q=0,atr=0,entry=0,count=0;
  const lines=[];

  for(const tf of tfs){
    const r=await AIDecision(symbol,tf);
    if(!r) continue;
    r.direction==="BUY"?buy++:sell++;
    q+=r.quality; atr+=r.atr; entry=r.entry; count++;
    lines.push(`${tf} | ${r.direction} | Q:${r.quality.toFixed(2)} | ${r.strategies.join(",")}`);
  }

  if(!count) return;

  const raw=q/count;
  if(raw<EXEC_THRESHOLD){ WATCH.set(symbol,{chat,mode}); return; }

  const direction=buy>=sell?"BUY":"SELL";
  atr/=count;

  const tp = direction==="BUY"
    ? entry + atr*(mode==="swing"?2.2:1.2)
    : entry - atr*(mode==="swing"?2.2:1.2);

  const sl = direction==="BUY"
    ? entry - atr*(mode==="swing"?1.2:0.8)
    : entry + atr*(mode==="swing"?1.2:0.8);

  const confidence=clamp((raw/EXEC_THRESHOLD)*100,50,100).toFixed(2);

  send(chat,
`OMNI AI SIGNAL
SYMBOL: ${symbol}
MODE: ${mode}
DIRECTION: ${direction}
CONFIDENCE: ${confidence}%

ENTRY: ${entry.toFixed(4)}
TP: ${tp.toFixed(4)}
SL: ${sl.toFixed(4)}

${lines.join("\n")}`);
}

/* ================= WATCH LOOP ================= */
(async()=>{
  while(true){
    for(const [s,v] of WATCH){
      await analyze(s,v.chat,v.mode);
      WATCH.delete(s);
    }
    await sleep(WATCH_INTERVAL_MS);
  }
})();

/* ================= TELEGRAM ================= */
(async()=>{
  let off=0;
  while(true){
    const r=await fetchJSON(`https://api.telegram.org/bot${TELEGRAM_TOKEN}/getUpdates?offset=${off}`);
    if(r?.result) for(const u of r.result){
      off=u.update_id+1;
      const m=u.message?.text, chat=u.message?.chat?.id;
      if(!m||!chat) continue;
      if(m.startsWith("/swing")) analyze(m.split(" ")[1],chat,"swing");
      if(m.startsWith("/scalp")) analyze(m.split(" ")[1],chat,"scalp");
    }
    await sleep(2000);
  }
})();

console.log("OMNI INSTITUTIONAL AI — FULL ENGINE LIVE");
