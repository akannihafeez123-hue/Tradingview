#!/usr/bin/env node
/* =========================================================
   OMNI INSTITUTIONAL AI — SINGLE FILE ENGINE (Choreo-ready)
   Node >= 18, CommonJS, runtime dependencies injection
========================================================= */

const https = require("https");
const crypto = require("crypto");

/* ================= RUNTIME DEPENDENCY INJECTION ================= */
async function loadModule(name) {
  try { return await import(name); }
  catch(e){ console.warn(`Module ${name} not found, attempting runtime install...`); 
    const { execSync } = require("child_process");
    execSync(`npm install ${name}`, { stdio: "inherit" });
    return await import(name);
  }
}

/* ================= ENV ================= */
const TELEGRAM_TOKEN = process.env.TELEGRAM_TOKEN || "";
const NEWS_API_KEY = process.env.NEWS_API_KEY || "";
const BITGET_KEY = process.env.BITGET_API_KEY || "";
const BITGET_SECRET = process.env.BITGET_API_SECRET || "";
const BITGET_PASSPHRASE = process.env.BITGET_PASSPHRASE || "";

/* ================= UTILS ================= */
const sleep = ms => new Promise(r => setTimeout(r, ms));
const mean = a => a.reduce((x, y) => x + y, 0) / a.length;
const std = a => {
  const m = mean(a);
  return Math.sqrt(mean(a.map(x => (x - m) ** 2)));
};

/* ================= TELEGRAM ================= */
function tgRequest(method, payload) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify(payload);
    const req = https.request({
      hostname: "api.telegram.org",
      path: `/bot${TELEGRAM_TOKEN}/${method}`,
      method: "POST",
      headers: { "Content-Type": "application/json", "Content-Length": data.length }
    }, res => {
      let b = "";
      res.on("data", d => b += d);
      res.on("end", () => resolve(JSON.parse(b)));
    });
    req.on("error", reject);
    req.write(data);
    req.end();
  });
}

async function send(chatId, text) {
  return tgRequest("sendMessage", { chat_id: chatId, text });
}

/* ================= MARKET DATA ================= */
function fetchJSON(url) {
  return new Promise((resolve, reject) => {
    https.get(url, res => {
      let b = "";
      res.on("data", d => b += d);
      res.on("end", () => resolve(JSON.parse(b)));
    }).on("error", reject);
  });
}

async function getCandles(symbol, tf, limit = 300) {
  const map = { "5m": "5m", "1h": "1H", "4h": "4H", "1d": "1D" };
  const url = `https://api.bitget.com/api/v2/spot/market/candles?symbol=${symbol}&granularity=${map[tf] || "4H"}&limit=${limit}`;
  const r = await fetchJSON(url);
  return r.data.map(c => ({
    t: +c[0], o: +c[1], h: +c[2], l: +c[3], c: +c[4], v: +c[5]
  }));
}

/* ================= VOLATILITY ================= */
function ATR(c, p = 14) {
  const tr = [];
  for (let i = 1; i < c.length; i++) {
    tr.push(Math.max(
      c[i].h - c[i].l,
      Math.abs(c[i].h - c[i - 1].c),
      Math.abs(c[i].l - c[i - 1].c)
    ));
  }
  return mean(tr.slice(-p));
}

function atrZ(c) {
  const a = c.map((_, i) => i > 20 ? ATR(c.slice(0, i)) : null).filter(Boolean);
  return (a.at(-1) - mean(a)) / std(a);
}

function parkinson(c) {
  return Math.sqrt(mean(c.map(x => Math.log(x.h / x.l) ** 2)) / (4 * Math.log(2)));
}

function garchEWMA(c, l = 0.94) {
  let v = 0;
  for (let i = 1; i < c.length; i++) {
    const r = Math.log(c[i].c / c[i - 1].c);
    v = l * v + (1 - l) * r * r;
  }
  return Math.sqrt(v);
}

/* ================= MARKET STRUCTURE ================= */
function BOS(c) {
  const h = c.map(x => x.h), l = c.map(x => x.l);
  return h.at(-1) > Math.max(...h.slice(-20, -1)) ||
         l.at(-1) < Math.min(...l.slice(-20, -1));
}

function premiumDiscount(c) {
  const hi = Math.max(...c.map(x => x.h));
  const lo = Math.min(...c.map(x => x.l));
  const mid = (hi + lo) / 2;
  return c.at(-1).c > mid ? "Premium" : "Discount";
}

/* ================= ORDER FLOW PROXIES ================= */
function volumeDelta(c) {
  let d = 0;
  for (let i = 1; i < c.length; i++)
    d += c[i].c > c[i - 1].c ? c[i].v : -c[i].v;
  return d;
}

function effortVsResult(c) {
  return Math.abs(c.at(-1).c - c.at(-20).c) / mean(c.slice(-20).map(x => x.v));
}

/* ================= TIME / CYCLE ================= */
function hurst(c) {
  const n = c.length;
  const m = mean(c.map(x => x.c));
  let s = 0, r = 0;
  for (let i = 0; i < n; i++) {
    s += c[i].c - m;
    r = Math.max(r, Math.abs(s));
  }
  return Math.log(r / std(c.map(x => x.c))) / Math.log(n);
}

/* ================= CROSS ASSET ================= */
async function btcDominance() {
  const r = await fetchJSON("https://api.coingecko.com/api/v3/global");
  return r.data.market_cap_percentage.btc;
}

/* ================= NEWS ================= */
async function newsScore() {
  if (!NEWS_API_KEY) return 0;
  return new Promise(async resolve => {
    try {
      const axios = (await loadModule("axios")).default;
      const r = await axios.get(`https://newsapi.org/v2/top-headlines?q=crypto&apiKey=${NEWS_API_KEY}`);
      resolve(r.data.articles.length);
    } catch (e) { resolve(0); }
  });
}

/* ================= STRATEGY SELECTION ================= */
function selectStrategy(f) {
  if (f.vol > 1 && f.structure) return "Momentum / Breakout";
  if (f.vol < 0 && f.absorption) return "Mean Reversion";
  return "Hybrid Institutional";
}

/* ================= ANALYSIS ================= */
async function analyze(symbol, tf) {
  const candles = await getCandles(symbol, tf);
  const features = {
    atrZ: atrZ(candles),
    parkinson: parkinson(candles),
    garch: garchEWMA(candles),
    structure: BOS(candles),
    zone: premiumDiscount(candles),
    delta: volumeDelta(candles),
    evr: effortVsResult(candles),
    hurst: hurst(candles),
    btcDom: await btcDominance(),
    news: await newsScore()
  };

  const strat = selectStrategy({
    vol: features.atrZ,
    structure: features.structure,
    absorption: features.delta < 0
  });

  const price = candles.at(-1).c;
  return {
    symbol, tf,
    strategy: strat,
    entry: price,
    stop: price * (features.zone === "Premium" ? 1.01 : 0.99),
    target: price * (features.zone === "Premium" ? 0.98 : 1.02),
    reason: JSON.stringify(features, null, 2)
  };
}

/* ================= TELEGRAM LOOP ================= */
async function poll() {
  let offset = 0;
  while (true) {
    const r = await fetchJSON(`https://api.telegram.org/bot${TELEGRAM_TOKEN}/getUpdates?offset=${offset}`);
    for (const u of r.result) {
      offset = u.update_id + 1;
      const msg = u.message?.text || "";
      const chat = u.message?.chat.id;
      if (msg === "/start") send(chat, "Institutional AI Online\nUse /analyze BTC/USDT 4h");
      if (msg.startsWith("/analyze")) {
        try {
          const [, sym, tf] = msg.split(" ");
          const res = await analyze(sym, tf);
          send(chat,
`Asset: ${res.symbol}
TF: ${res.tf}
Strategy: ${res.strategy}
Entry: ${res.entry}
SL: ${res.stop}
TP: ${res.target}

Why:
${res.reason}`);
        } catch (e) { send(chat, "Error: " + e.message); }
      }
    }
    await sleep(2000);
  }
}

if (!TELEGRAM_TOKEN) {
  console.error("TELEGRAM_TOKEN missing");
  process.exit(1);
}

console.log("OMNI INSTITUTIONAL AI — LIVE (Runtime injection enabled)");
poll();
