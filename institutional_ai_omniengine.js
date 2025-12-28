/****************************************************************************************
 INSTITUTIONAL AI — OMNI ENGINE (ALL STRATEGIES, ONE FILE)
****************************************************************************************/
import fetch from "node-fetch";
import TelegramBot from "node-telegram-bot-api";
import dotenv from "dotenv";
dotenv.config();

/* ================= BASIC UTILS ================= */
const mean=a=>a.reduce((x,y)=>x+y,0)/a.length;
const std=a=>Math.sqrt(mean(a.map(x=>(x-mean(a))**2)));
const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));

/* ================= DATA ================= */
async function ohlcv(symbol, tf="1h", limit=500){
  const map={ "5m":"5min","1h":"1H","4h":"4H","1d":"1D","1w":"1W" };
  const r=await fetch(
    `https://api.bitget.com/api/spot/v1/market/candles?symbol=${symbol.replace("/","")}&period=${map[tf]}&limit=${limit}`
  );
  const j=await r.json();
  return j.data.map(c=>({o:+c[1],h:+c[2],l:+c[3],c:+c[4],v:+c[5]}));
}

/* ================= VOLATILITY ================= */
const ATR=c=>Math.abs(c.h-c.l);
const atrZ=(cs,p=20)=>{const a=cs.slice(-p).map(ATR);return (a.at(-1)-mean(a))/std(a)};
const parkinson=cs=>Math.sqrt(mean(cs.map(c=>Math.log(c.h/c.l)**2))/4);

/* ================= LIQUIDITY ================= */
const absorption=(c,av)=>Math.abs(c.c-c.o)<(c.h-c.l)*0.25 && c.v>av*1.5;
const iceberg=(c,av)=>c.v>av*2 && Math.abs(c.c-c.o)<(c.h-c.l)*0.2;
const stopHunt=(c,p)=>((c.h>p.h||c.l<p.l)?0.5:0)+(Math.abs(c.c-c.o)<(c.h-c.l)*0.3?0.3:0);

/* ================= MARKET STRUCTURE ================= */
const BOS=(p,c)=>c.h>p.h||c.l<p.l;
const CHoCH=(p,c)=>(p.c>p.o&&c.c<c.o)||(p.c<p.o&&c.c>c.o);

/* ================= TIME & CHAOS ================= */
function hurst(pr){
  const l=[2,5,10,20];
  const t=l.map(L=>{
    const d=[];for(let i=L;i<pr.length;i++)d.push(pr[i]-pr[i-L]);
    return std(d);
  });
  return Math.log(t.at(-1)/t[0])/Math.log(l.at(-1)/l[0]);
}

/* ====================== STRATEGY ENGINES ====================== */

/* Fibonacci Vortex */
function fibonacciVortex(cs){
  const r=Math.abs(cs.at(-1).c-cs.at(-5).c)/(cs.at(-5).c||1);
  return r>0.618?0.7:0.3;
}

/* Quantum Entanglement */
function quantumWave(cs){
  const u=std(cs.map(c=>c.c))/mean(cs.map(c=>c.c));
  return clamp(1-u,0,1);
}

/* Dark Pool Institutional */
function darkPool(cs,av){
  const c=cs.at(-1);
  return absorption(c,av)||iceberg(c,av)?0.7:0.3;
}

/* Gann Time Cycle */
function gannCycle(i){
  return Math.abs(Math.sin(i/9));
}

/* Elliott Wave Neural (proxy) */
function elliott(cs){
  const swings=cs.filter((c,i)=>i>0&&((c.c>cs[i-1].c&&c.c>cs[i+1]?.c)||(c.c<cs[i-1].c&&c.c<cs[i+1]?.c)));
  return swings.length>=5?0.65:0.35;
}

/* Cosmic Cycle */
function cosmic(i){
  return (Math.sin(i/14)+1)/2;
}

/* Momentum Scalper */
function momentum(cs){
  const r=(cs.at(-1).c-cs.at(-4).c)/cs.at(-4).c;
  return r>0?0.6:0.4;
}

/* Breakout Hunter */
function breakout(cs){
  const h=Math.max(...cs.slice(-20).map(x=>x.h));
  const l=Math.min(...cs.slice(-20).map(x=>x.l));
  return cs.at(-1).c>h||cs.at(-1).c<l?0.7:0.3;
}

/* Mean Reversion */
function meanRev(cs){
  const m=mean(cs.slice(-20).map(x=>x.c));
  return Math.abs(cs.at(-1).c-m)/m>0.02?0.6:0.4;
}

/* ================= MASTER ANALYSIS ================= */
async function analyze(symbol, tf){
  const cs=await ohlcv(symbol,tf);
  const c=cs.at(-1), p=cs.at(-2);
  const av=mean(cs.slice(-50).map(x=>x.v));

  let score=0;
  score+=fibonacciVortex(cs)*0.1;
  score+=quantumWave(cs)*0.1;
  score+=darkPool(cs,av)*0.1;
  score+=gannCycle(cs.length)*0.05;
  score+=elliott(cs)*0.1;
  score+=cosmic(cs.length)*0.05;
  score+=momentum(cs)*0.1;
  score+=breakout(cs)*0.15;
  score+=meanRev(cs)*0.05;
  score+=BOS(p,c)?0.1:0;

  score=clamp(score,0,1);
  const dir=score>0.6?"BUY":score<0.4?"SELL":"WAIT";
  const atr=ATR(c);

  return {
    direction:dir,
    confidence:Math.round(score*100),
    entry:c.c,
    sl:dir==="BUY"?c.c-2*atr:c.c+2*atr,
    tp:[c.c+atr*(dir==="BUY"?1:-1),c.c+2*atr*(dir==="BUY"?1:-1)]
  };
}

/* ================= TELEGRAM ================= */
const bot=new TelegramBot(process.env.TELEGRAM_TOKEN,{polling:true});
bot.onText(/\/analyze (.+) (.+)/,async(m,g)=>{
  const r=await analyze(g[1],g[2]);
  bot.sendMessage(m.chat.id,
`📊 ${g[1]} (${g[2]})
Signal: ${r.direction}
Confidence: ${r.confidence}%

Entry: ${r.entry}
SL: ${r.sl}
TP1: ${r.tp[0]}
TP2: ${r.tp[1]}`
  );
});

console.log("OMNI INSTITUTIONAL AI — ALL STRATEGIES ACTIVE");
