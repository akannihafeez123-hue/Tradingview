#!/usr/bin/env node
/* =========================================================
   OMNI INSTITUTIONAL AI — ALL IN ONE ENGINE (FIXED)
   Node >= 18 | No package.json | No simulations
========================================================= */

import https from "https";

/* ================= ENV ================= */
const TELEGRAM_TOKEN = process.env.TELEGRAM_TOKEN || "";

/* ================= UTILS ================= */
const sleep = ms => new Promise(r => setTimeout(r, ms));
const mean = a => a.length ? a.reduce((x,y)=>x+y,0)/a.length : 0;
const std = a => {
  if (!a.length) return 0;
  const m = mean(a);
  return Math.sqrt(mean(a.map(x => (x - m) ** 2)));
};

/* ================= TELEGRAM ================= */
function tg(method, payload) {
  return new Promise((resolve) => {
    const data = JSON.stringify(payload);
    const req = https.request({
      hostname: "api.telegram.org",
      path: `/bot${TELEGRAM_TOKEN}/${method}`,
      method: "POST",
      headers: { "Content-Type": "application/json", "Content-Length": data.length }
    }, r => {
      let b=""; r.on("data",d=>b+=d);
      r.on("end",()=>resolve(JSON.parse(b)));
    });
    req.on("error", ()=>resolve(null));
    req.write(data); req.end();
  });
}

const send = (id, text) => tg("sendMessage", { chat_id:id, text });

/* ================= FETCH ================= */
function fetchJSON(url) {
  return new Promise((resolve) => {
    https.get(url, r => {
      let b=""; r.on("data",d=>b+=d);
      r.on("end",()=> {
        try { resolve(JSON.parse(b)); }
        catch { resolve(null); }
      });
    }).on("error",()=>resolve(null));
  });
}

/* ================= CANDLES ================= */
async function candles(symbol, tf="4h", limit=300){
  const map={ "5m":"5m","1h":"1H","4h":"4H","1d":"1D" };
  const r = await fetchJSON(
    `https://api.bitget.com/api/v2/spot/market/candles?symbol=${symbol}&granularity=${map[tf]||"4H"}&limit=${limit}`
  );
  if(!r || !Array.isArray(r.data)) return [];
  return r.data.map(c=>({
    t:+c[0], o:+c[1], h:+c[2], l:+c[3], c:+c[4], v:+c[5]
  }));
}

/* ================= VOLATILITY ================= */
function ATR(c,p=14){
  if(c.length<p+1) return 0;
  let tr=[];
  for(let i=1;i<c.length;i++){
    tr.push(Math.max(
      c[i].h-c[i].l,
      Math.abs(c[i].h-c[i-1].c),
      Math.abs(c[i].l-c[i-1].c)
    ));
  }
  return mean(tr.slice(-p));
}

function ATR_Z(c){
  let a=[];
  for(let i=20;i<c.length;i++) a.push(ATR(c.slice(0,i)));
  return std(a)?(a.at(-1)-mean(a))/std(a):0;
}

const Parkinson = c =>
  c.length ? Math.sqrt(mean(c.map(x=>Math.log(x.h/x.l)**2))/(4*Math.log(2))) : 0;

function EWMA(c,l=0.94){
  let v=0;
  for(let i=1;i<c.length;i++){
    const r=Math.log(c[i].c/c[i-1].c);
    v=l*v+(1-l)*r*r;
  }
  return Math.sqrt(v);
}

const VolRegime = z => z>1?"High":z<-1?"Low":"Normal";

/* ================= LIQUIDITY ================= */
function VolumeDelta(c){
  let d=0;
  for(let i=1;i<c.length;i++)
    d+=c[i].c>c[i-1].c?c[i].v:-c[i].v;
  return d;
}

const Absorption = c =>
  c.length>20 && Math.abs(VolumeDelta(c)) > mean(c.map(x=>x.v))*3;

const LiquidityVoid = c =>
  c.length>20 && (c.at(-1).h-c.at(-1).l) > mean(c.slice(-20).map(x=>x.h-x.l))*2;

const StopHuntProb = c =>
  c.length>20 ? Math.min(1, Math.abs(c.at(-1).c-c.at(-20).c)/(ATR(c)||1)) : 0;

const IcebergProxy = c =>
  c.length>20 && c.at(-1).v > mean(c.slice(-20).map(x=>x.v))*4;

/* ================= MARKET STRUCTURE ================= */
const BOS = c =>
  c.length>20 && (
    c.at(-1).h > Math.max(...c.slice(-20,-1).map(x=>x.h)) ||
    c.at(-1).l < Math.min(...c.slice(-20,-1).map(x=>x.l))
  );

/* ✅ FIXED CHoCH (SYNTAX + SAFETY) */
function CHoCH(c){
  if(c.length < 4) return false;
  const up =
    c.at(-1).c > c.at(-2).h &&
    c.at(-2).c < c.at(-3).l;

  const down =
    c.at(-1).c < c.at(-2).l &&
    c.at(-2).c > c.at(-3).h;

  return up || down;
}

function PremiumDiscount(c){
  if(!c.length) return "Neutral";
  const hi=Math.max(...c.map(x=>x.h));
  const lo=Math.min(...c.map(x=>x.l));
  return c.at(-1).c>(hi+lo)/2?"Premium":"Discount";
}

const RangeState = c =>
  c.length>20 && Math.abs(c.at(-1).c-c.at(-20).c)<ATR(c)?"Accepted":"Rejected";

/* ================= ORDER FLOW ================= */
const WyckoffEVR = c =>
  c.length>20 ? Math.abs(c.at(-1).c-c.at(-20).c)/mean(c.slice(-20).map(x=>x.v)) : 0;

const SpreadEff = c =>
  c.length ? (c.at(-1).h-c.at(-1).l)/(ATR(c)||1) : 0;

const RelVol = c =>
  c.length>20 ? c.at(-1).v/mean(c.slice(-20).map(x=>x.v)) : 0;

/* ================= TIME & CYCLE ================= */
function Hurst(c){
  if(c.length<20) return 0;
  let s=0,r=0,m=mean(c.map(x=>x.c));
  for(const x of c){ s+=x.c-m; r=Math.max(r,Math.abs(s)); }
  return std(c.map(x=>x.c))?Math.log(r/std(c.map(x=>x.c)))/Math.log(c.length):0;
}

const FractalDim = c => 2-Hurst(c);

const TimeSymmetry = c =>
  c.length>10 ? mean(c.slice(-10).map((x,i)=>x.c-c[i].c)) : 0;

/* ================= CROSS ASSET ================= */
async function BTCDom(){
  const r=await fetchJSON("https://api.coingecko.com/api/v3/global");
  return r?.data?.market_cap_percentage?.btc || 0;
}

/* ================= STRATEGY ENGINE ================= */
function StrategyEngine(f){
  if(f.liquidity && f.stopHunt>0.6) return "Liquidity Engine";
  if(f.bos && f.volRegime==="High") return "Breakout Hunter";
  if(f.atrZ>1 && f.relVol>2) return "Momentum Scalper";
  if(f.absorption && f.volRegime==="Low") return "Mean Reversion";
  return "Quantum Engine V2.0";
}

/* ================= ANALYSIS ================= */
async function analyze(symbol,tf){
  const c=await candles(symbol,tf);
  if(c.length<50) throw Error("Insufficient market data");

  const f={
    atr:ATR(c),
    atrZ:ATR_Z(c),
    volRegime:VolRegime(ATR_Z(c)),
    parkinson:Parkinson(c),
    ewma:EWMA(c),
    delta:VolumeDelta(c),
    absorption:Absorption(c),
    liquidity:LiquidityVoid(c),
    stopHunt:StopHuntProb(c),
    iceberg:IcebergProxy(c),
    bos:BOS(c),
    choch:CHoCH(c),
    zone:PremiumDiscount(c),
    range:RangeState(c),
    evr:WyckoffEVR(c),
    spread:SpreadEff(c),
    relVol:RelVol(c),
    hurst:Hurst(c),
    fractal:FractalDim(c),
    time:TimeSymmetry(c),
    btcDom:await BTCDom()
  };

  return {
    symbol, tf,
    strategy: StrategyEngine(f),
    features: f
  };
}

/* ================= TELEGRAM LOOP ================= */
async function poll(){
  let off=0;
  while(true){
    const r=await fetchJSON(`https://api.telegram.org/bot${TELEGRAM_TOKEN}/getUpdates?offset=${off}`);
    if(!r?.result) continue;
    for(const u of r.result){
      off=u.update_id+1;
      const m=u.message?.text||"", chat=u.message?.chat.id;
      if(m.startsWith("/analyze")){
        const [,s,t]=m.split(" ");
        try{
          const a=await analyze(s,t);
          send(chat,
`Asset: ${a.symbol}
TF: ${a.tf}
Strategy: ${a.strategy}

${JSON.stringify(a.features,null,2)}`);
        }catch(e){ send(chat,e.message); }
      }
    }
    await sleep(2000);
  }
}

if(!TELEGRAM_TOKEN){
  console.error("Missing TELEGRAM_TOKEN");
  process.exit(1);
}

console.log("OMNI INSTITUTIONAL AI — LIVE");
poll();
