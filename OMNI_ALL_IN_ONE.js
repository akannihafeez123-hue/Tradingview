#!/usr/bin/env node
/* =========================================================
   OMNI INSTITUTIONAL AI — AUTONOMOUS DESK
   Node >= 18 | Single File | No External Dependencies
========================================================= */

import https from "https";

/* ================= ENV ================= */
const TELEGRAM_TOKEN = process.env.TELEGRAM_TOKEN || "";
const NEWS_API_KEY = process.env.NEWS_API_KEY || "";
const ALERT_THRESHOLD = Number(process.env.ALERT_THRESHOLD || 0.8);
const WATCH_INTERVAL_MS = Number(process.env.WATCH_INTERVAL_MS || 30000);

/* ================= CORE UTILS ================= */
const sleep = ms => new Promise(r => setTimeout(r, ms));
const mean = a => a.length ? a.reduce((x,y)=>x+y,0)/a.length : 0;
const std = a => {
  if(!a.length) return 0;
  const m = mean(a);
  return Math.sqrt(mean(a.map(x => (x - m) ** 2)));
};

/* ================= TELEGRAM ================= */
function tg(method, payload){
  return new Promise(res=>{
    const d = JSON.stringify(payload);
    const req = https.request({
      hostname:"api.telegram.org",
      path:`/bot${TELEGRAM_TOKEN}/${method}`,
      method:"POST",
      headers:{ "Content-Type":"application/json","Content-Length":d.length }
    }, r=>{
      let b=""; r.on("data",x=>b+=x);
      r.on("end",()=>res(JSON.parse(b)));
    });
    req.on("error",()=>res(null));
    req.write(d); req.end();
  });
}
const send = (id,t)=>tg("sendMessage",{chat_id:id,text:t});

/* ================= FETCH ================= */
const fetchJSON = url => new Promise(res=>{
  https.get(url,r=>{
    let b=""; r.on("data",x=>b+=x);
    r.on("end",()=>{ try{res(JSON.parse(b))}catch{res(null)} });
  }).on("error",()=>res(null));
});

/* ================= SYMBOL & TF ================= */
const normalizeSymbol = s => s.toUpperCase().replace(/[^\w]/g,"");
const TF_MAP = {
  "1m":"1m","5m":"5m","15m":"15m","30m":"30m",
  "1h":"1H","2h":"2H","4h":"4H","8h":"8H","12h":"12H",
  "1d":"1D","2d":"2D","3d":"3D",
  "1w":"1W","2w":"2W",
  "1M":"1M","2M":"2M","3M":"3M",
  "1Y":"1Y","2Y":"2Y"
};

/* ================= MARKET DATA ================= */
async function candles(symbol, tf){
  const s = normalizeSymbol(symbol);
  const g = TF_MAP[tf];
  if(!g) return [];
  const url = `https://api.bitget.com/api/v2/spot/market/candles?symbol=${s}&granularity=${g}&limit=500`;
  const r = await fetchJSON(url);
  if(!r?.data) return [];
  return r.data.map(x=>({ t:+x[0], o:+x[1], h:+x[2], l:+x[3], c:+x[4], v:+x[5] }));
}

/* ================= INDICATORS ================= */
const ATR = (c,p=14)=>{
  if(c.length<p+1) return 0;
  const tr=[];
  for(let i=1;i<c.length;i++){
    tr.push(Math.max(
      c[i].h-c[i].l,
      Math.abs(c[i].h-c[i-1].c),
      Math.abs(c[i].l-c[i-1].c)
    ));
  }
  return mean(tr.slice(-p));
};

const ATR_Z = c => {
  const a=[];
  for(let i=30;i<c.length;i++) a.push(ATR(c.slice(0,i)));
  return std(a)?(a.at(-1)-mean(a))/std(a):0;
};

const BOS = c =>
  c.length>20 &&
  (c.at(-1).h > Math.max(...c.slice(-20,-1).map(x=>x.h)) ||
   c.at(-1).l < Math.min(...c.slice(-20,-1).map(x=>x.l)));

const CHoCH = c =>
  c.length > 3 &&
  (
    (c.at(-1).c > c.at(-2).h && c.at(-2).c < c.at(-3).l) ||
    (c.at(-1).c < c.at(-2).l && c.at(-2).c > c.at(-3).h)
  );

const VolumeDelta = c =>
  c.slice(1).reduce((d,x,i)=>d+(x.c>c[i].c?x.v:-x.v),0);

const RelativeVolume = c =>
  c.at(-1).v / mean(c.slice(-20).map(x=>x.v));

/* ================= TF ANALYSIS ================= */
function analyzeTF(c){
  const atr = ATR(c);
  const z = ATR_Z(c);
  const delta = VolumeDelta(c);
  const rvol = RelativeVolume(c);
  const bos = BOS(c);
  const choch = CHoCH(c);

  const dir =
    (bos || choch) && delta > 0 ? "BUY" :
    (bos || choch) && delta < 0 ? "SELL" :
    delta > 0 ? "BUY" : "SELL";

  const quality =
    Math.abs(delta) *
    rvol *
    (bos ? 1.3 : 1) *
    (choch ? 1.2 : 1) *
    Math.max(0.5, Math.abs(z));

  return { dir, atr, quality };
}

/* ================= TOP DOWN ================= */
const TF_ORDER = [
  "2Y","1Y","3M","1M","1w","1d","12h","4h","1h","15m","5m"
];
const TF_WEIGHT = {
  "2Y":6,"1Y":5,"3M":4,"1M":3,
  "1w":2,"1d":1.8,"12h":1.5,
  "4h":1.2,"1h":1,"15m":0.7,"5m":0.5
};

/* ================= WATCHLIST ================= */
const WATCH = new Map();

/* ================= ANALYZE ================= */
async function analyze(symbol, chat){
  let buy=0,sell=0,totalQ=0,count=0;
  const lines=[];

  for(const tf of TF_ORDER){
    const c = await candles(symbol,tf);
    if(c.length<50) continue;
    const r = analyzeTF(c);
    const w = TF_WEIGHT[tf];
    r.dir==="BUY" ? buy+=w : sell+=w;
    totalQ += r.quality * w;
    count++;
    lines.push(`${tf} | ${r.dir} | Q:${r.quality.toFixed(2)}`);
  }

  if(!count){
    send(chat,"No data available");
    return;
  }

  const confidence = totalQ / count;
  if(confidence < ALERT_THRESHOLD){
    WATCH.set(symbol,chat);
    send(chat,`${symbol} is not ready. Stored in watchlist.`);
    return;
  }

  const direction = buy >= sell ? "BUY" : "SELL";

  send(chat,
`ASSET: ${symbol}
DIRECTION: ${direction}
CONFIDENCE: ${(confidence*100).toFixed(1)}%

${lines.join("\n")}`);
}

/* ================= WATCH LOOP ================= */
(async function watch(){
  while(true){
    for(const [s,chat] of WATCH){
      const c = await candles(s,"1h");
      if(c.length<50) continue;
      const r = analyzeTF(c);
      if(r.quality >= ALERT_THRESHOLD){
        WATCH.delete(s);
        analyze(s,chat);
      }
    }
    await sleep(WATCH_INTERVAL_MS);
  }
})();

/* ================= TELEGRAM ================= */
(async function poll(){
  let off=0;
  while(true){
    const r = await fetchJSON(`https://api.telegram.org/bot${TELEGRAM_TOKEN}/getUpdates?offset=${off}`);
    if(r?.result){
      for(const u of r.result){
        off=u.update_id+1;
        const m=u.message?.text;
        if(m?.startsWith("/analyze")){
          const s=m.split(" ")[1];
          if(s) analyze(s,u.message.chat.id);
        }
      }
    }
    await sleep(2000);
  }
})();

if(!TELEGRAM_TOKEN){
  console.error("Missing TELEGRAM_TOKEN");
  process.exit(1);
}

console.log("OMNI INSTITUTIONAL AI — LIVE");
