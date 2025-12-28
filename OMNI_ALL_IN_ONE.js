/*****************************************************************************************
 OMNI INSTITUTIONAL AI — SINGLE FILE (ABSOLUTE ALL-IN-ONE)
 REAL DATA • REAL MATH • REAL STRATEGIES • NO SIMULATION
*****************************************************************************************/

/* =============================================================================
   📦 EMBEDDED package.json (EXTRACT IF NEEDED)
============================================================================= */
/*
{
  "name": "omni-institutional-ai",
  "version": "1.0.0",
  "description": "All-in-one Institutional AI Trading & Analysis Engine",
  "type": "module",
  "main": "OMNI_ALL_IN_ONE.js",
  "scripts": {
    "start": "node OMNI_ALL_IN_ONE.js"
  },
  "engines": {
    "node": ">=18.0.0"
  },
  "dependencies": {
    "axios": "^1.6.8",
    "dotenv": "^16.4.5",
    "node-telegram-bot-api": "^0.66.0"
  }
}
*/

/* =============================================================================
   🌍 EMBEDDED .env TEMPLATE (DO NOT COMMIT REAL VALUES)
============================================================================= */
/*
TELEGRAM_TOKEN=YOUR_TELEGRAM_BOT_TOKEN

BITGET_API_KEY=YOUR_BITGET_KEY
BITGET_API_SECRET=YOUR_BITGET_SECRET
BITGET_PASSPHRASE=YOUR_BITGET_PASSPHRASE

NEWS_API_KEY=YOUR_NEWS_API_KEY

NODE_ENV=production
*/

/* =============================================================================
   ☁️ EMBEDDED wasmer.toml (WASMER / CHOREO / EDGE)
============================================================================= */
/*
[package]
name = "omni-institutional-ai"
version = "1.0.0"

[command]
name = "run"
module = "node"
runner = "node"
args = ["OMNI_ALL_IN_ONE.js"]

[env]
NODE_ENV = "production"

[fs]
"." = "."
*/

/* =============================================================================
   🚀 RUNTIME CODE STARTS HERE
============================================================================= */

import TelegramBot from "node-telegram-bot-api";
import axios from "axios";
import dotenv from "dotenv";
dotenv.config();

/* =========================
   BOOTSTRAP
========================= */
const bot = new TelegramBot(process.env.TELEGRAM_TOKEN, { polling: true });
const BITGET = "https://api.bitget.com";

process.on("unhandledRejection", e => console.error("UNHANDLED:", e));
process.on("uncaughtException", e => console.error("UNCAUGHT:", e));

bot.on("message", m => console.log("MSG:", m.text));

/* =========================
   MATH CORE
========================= */
const mean = a => a.reduce((x,y)=>x+y,0)/a.length;
const std  = a => Math.sqrt(mean(a.map(x=>(x-mean(a))**2)));
const sum  = a => a.reduce((x,y)=>x+y,0);

/* =========================
   MARKET DATA
========================= */
async function candles(symbol, tf, limit=600){
  const r = await axios.get(`${BITGET}/api/v2/spot/market/candles`,{
    params:{ symbol:symbol.replace("/",""), granularity:tf, limit }
  });
  return r.data.data.map(x=>({
    t:+x[0], o:+x[1], h:+x[2], l:+x[3], c:+x[4], v:+x[5]
  })).reverse();
}

/* =========================
   VOLATILITY & RISK (FULL)
========================= */
function ATR(c,n=14){
  let t=[];
  for(let i=1;i<c.length;i++)
    t.push(Math.max(
      c[i].h-c[i].l,
      Math.abs(c[i].h-c[i-1].c),
      Math.abs(c[i].l-c[i-1].c)
    ));
  return mean(t.slice(-n));
}

function atrZ(c){
  const a=[];
  for(let i=30;i<c.length;i++) a.push(ATR(c.slice(0,i)));
  return (a.at(-1)-mean(a))/std(a);
}

function parkinson(c){
  return Math.sqrt(mean(c.map(x=>Math.log(x.h/x.l)**2)));
}

function ewmaVol(c,λ=0.94){
  let v=0;
  for(let i=1;i<c.length;i++){
    const r=Math.log(c[i].c/c[i-1].c);
    v=λ*v+(1-λ)*r*r;
  }
  return Math.sqrt(v);
}

function volRegime(z){
  if(z>1) return "HIGH";
  if(z<-1) return "LOW";
  return "NORMAL";
}

/* =========================
   INSTITUTIONAL LIQUIDITY
========================= */
function volumeDelta(c){
  return sum(c.slice(-20).map(x=>(x.c>x.o?x.v:-x.v)));
}

function absorption(c){
  return volumeDelta(c)>0 && Math.abs(c.at(-1).c-c.at(-5).c)<ATR(c)*0.3;
}

function liquidityVoid(c){
  const s=c.map(x=>x.h-x.l);
  return s.at(-1)>mean(s)*1.8;
}

function stopHuntProb(c){
  const w=c.map(x=>(x.h-x.c)+(x.c-x.l));
  return w.at(-1)/mean(w);
}

function icebergProxy(c){
  return absorption(c)&&c.at(-1).v>mean(c.map(x=>x.v))*1.5;
}

/* =========================
   MARKET STRUCTURE
========================= */
function BOS(c){
  const hi=Math.max(...c.slice(-20).map(x=>x.h));
  const lo=Math.min(...c.slice(-20).map(x=>x.l));
  if(c.at(-1).c>hi) return "BOS_UP";
  if(c.at(-1).c<lo) return "BOS_DOWN";
  return "NONE";
}

function premiumDiscount(c){
  const hi=Math.max(...c.map(x=>x.h));
  const lo=Math.min(...c.map(x=>x.l));
  return c.at(-1).c>(hi+lo)/2?"PREMIUM":"DISCOUNT";
}

/* =========================
   ORDER FLOW
========================= */
function effortVsResult(c){
  return Math.abs(c.at(-1).c-c.at(-10).c)/sum(c.slice(-10).map(x=>x.v));
}

/* =========================
   TIME & CYCLE
========================= */
function hurst(series){
  const rs=Math.max(...series)-Math.min(...series);
  return Math.log(rs/std(series))/Math.log(series.length);
}

/* =========================
   STRATEGY SELECTION
========================= */
function selectStrategy(ctx){
  if(ctx.volReg==="HIGH") return "BREAKOUT";
  if(ctx.hurst>0.6) return "MOMENTUM";
  if(ctx.hurst<0.4) return "MEAN_REVERSION";
  if(ctx.iceberg) return "LIQUIDITY";
  return "QUANTUM_CONFLUENCE";
}

/* =========================
   ANALYSIS ENGINE
========================= */
async function analyze(symbol){
  const c = await candles(symbol, 14400);
  const atr = ATR(c);
  const ctx={
    volZ:atrZ(c),
    volReg:volRegime(atrZ(c)),
    park:parkinson(c),
    ewma:ewmaVol(c),
    delta:volumeDelta(c),
    absorb:absorption(c),
    void:liquidityVoid(c),
    hunt:stopHuntProb(c),
    iceberg:icebergProxy(c),
    bos:BOS(c),
    zone:premiumDiscount(c),
    evr:effortVsResult(c),
    hurst:hurst(c.map(x=>x.c))
  };
  const strategy=selectStrategy(ctx);
  const price=c.at(-1).c;
  return {
    symbol, strategy, price,
    entry:price,
    stop:price-atr*1.5,
    tp:price+atr*3,
    ctx
  };
}

/* =========================
   TELEGRAM COMMANDS
========================= */
bot.onText(/^\/start$/,m=>bot.sendMessage(m.chat.id,"✅ Omni Institutional AI Online"));
bot.onText(/^\/status$/,m=>bot.sendMessage(m.chat.id,"Systems Operational"));
bot.onText(/^\/analyze (.+)/,async m=>{
  const chatId=m.chat.id;
  try{
    const symbol=m.text.split(" ")[1];
    const r=await analyze(symbol);
    bot.sendMessage(chatId,
`ASSET: ${r.symbol}
STRATEGY: ${r.strategy}
PRICE: ${r.price}

ENTRY: ${r.entry}
STOP: ${r.stop}
TP: ${r.tp}

VOL: ${r.ctx.volReg}
BOS: ${r.ctx.bos}
ZONE: ${r.ctx.zone}`);
  }catch(e){
    console.error(e);
    bot.sendMessage(chatId,"❌ Analysis failed");
  }
});
