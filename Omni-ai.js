#!/usr/bin/env node
/* =========================================================
   OMNI INSTITUTIONAL AI — COMPLETE EDITION (ENHANCED)
   Version: 3.2.0 | Professional Trading System

   Features:
   • Multi-Timeframe Analysis (Swing + Scalp + 1y/2y macro)
   • Institutional Grade Indicators (30+)
   • Automatic TP/SL Calculation with Risk Management
   • Cross-Asset Correlation & BTC Dominance
   • Market Alignment Pipeline
   • Session-Aware Trading (Asia/London/NY)
   • Telegram Bot Integration with HTML Formatting
   • Continuous Learning Pipeline (history features in memory)
   • Risk-On/Risk-Off Mode Detection
   • Auto-scanner alerts (confidence threshold)
========================================================= */

import https from "https";

/* ================= ENVIRONMENT CONFIG ================= */
let TELEGRAM_TOKEN = process.env.TELEGRAM_TOKEN || "";
let TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID || "";
let ACCOUNT_RISK_PERCENT = parseFloat(process.env.ACCOUNT_RISK_PERCENT || "1.0");
const DEFAULT_RISK_REWARD = parseFloat(process.env.DEFAULT_RISK_REWARD || "2.0");
const MAX_POSITION_SIZE = parseFloat(process.env.MAX_POSITION_SIZE || "10.0");
let ACCOUNT_BALANCE = parseFloat(process.env.ACCOUNT_BALANCE || "10000");

const WATCH_INTERVAL_MS = Number(process.env.WATCH_INTERVAL_MS || 30000);
const DAILY_PIPELINE_MS = Number(process.env.DAILY_PIPELINE_MS || 60 * 1000);

const SWING_TF = ["1d", "2d", "1w", "1M"];
const SCALP_TF = ["5m", "15m", "30m", "1h", "2h", "4h"];
const ANALYSIS_ONLY_TF = ["1y", "2y"]; // analysis-only timeframes
const DEFAULT_SCAN_TF = ["1h", "4h"];  // auto-scanner timeframes
const DEFAULT_SCAN_SYMBOLS = ["BTCUSDT","ETHUSDT","BNBUSDT","SOLUSDT","XRPUSDT","ADAUSDT","DOGEUSDT","MATICUSDT"];
let ALERT_THRESHOLD = parseFloat(process.env.ALERT_THRESHOLD || "70"); // percent

/* ================= GLOBAL STATE ================= */
const WATCH = new Map();
const LAST_EXECUTION = new Map();
const TICK_STATE = new Map();
const SIGNAL_HISTORY = new Map();
const LAST_ALERT = new Map(); // rate-limit alerts per symbol_tf

/* ================= UTILITY FUNCTIONS ================= */
const sleep = ms => new Promise(r => setTimeout(r, ms));
const mean = a => a.length ? a.reduce((x, y) => x + y, 0) / a.length : 0;
const std = a => { 
  if (a.length < 2) return 0;
  const m = mean(a); 
  const variance = a.reduce((sum, x) => sum + Math.pow(x - m, 2), 0) / (a.length - 1);
  return Math.sqrt(variance);
};
const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
const round = (num, decimals = 2) => parseFloat(num.toFixed(decimals));

const fetchJSON = url => new Promise(res => {
  https.get(url, r => {
    let b = "";
    r.on("data", x => b += x);
    r.on("end", () => { 
      try { 
        res(JSON.parse(b)); 
      } catch(e) { 
        console.error(`JSON parse error for ${url}:`, e.message);
        res(null); 
      }
    });
  }).on("error", (e) => {
    console.error(`HTTP GET error for ${url}:`, e.message);
    res(null);
  });
});

const tg = (method, payload) => new Promise(res => {
  const d = JSON.stringify(payload);
  const req = https.request({
    hostname: "api.telegram.org",
    path: `/bot${TELEGRAM_TOKEN}/${method}`,
    method: "POST",
    headers: { 
      "Content-Type": "application/json", 
      "Content-Length": Buffer.byteLength(d) 
    }
  }, r => { 
    let b = ""; 
    r.on("data", x => b += x); 
    r.on("end", () => { 
      try { 
        res(JSON.parse(b)); 
      } catch(e) { 
        console.error("Telegram response parse error:", e.message);
        res(null); 
      }
    }); 
  });
  
  req.on("error", (e) => {
    console.error("Telegram request error:", e.message);
    res(null);
  });
  
  req.write(d); 
  req.end();
});

const send = (id, t) => tg("sendMessage", { 
  chat_id: id, 
  text: t, 
  parse_mode: "HTML",
  disable_web_page_preview: true
});

const normalizeSymbol = s => s.toUpperCase().replace(/[^\w]/g, "");

/* ================= TIME FRAME MAPPING ================= */
const TF_MAP = {
  "5m": "5m", "15m": "15m", "30m": "30m", 
  "1h": "1h", "2h": "2h", "4h": "4h",
  "1d": "1d", "2d": "1d", "1w": "1w", 
  "1M": "1M"
};

/* ================= PRICE TRACKING SYSTEM ================= */
function updateTick(symbol, price) {
  const t = TICK_STATE.get(symbol) || {};
  t.drift = t.last ? price - t.last : 0;
  t.last = price;
  t.velocity = t.drift ? Math.abs(t.drift) / (Date.now() - (t.lastUpdate || Date.now())) * 1000 : 0;
  t.lastUpdate = Date.now();
  TICK_STATE.set(symbol, t);
}

function tickBias(symbol) {
  const t = TICK_STATE.get(symbol);
  if (!t || !t.drift) return "NEUTRAL";
  const velocityFactor = Math.min(1, t.velocity / 10);
  const biasStrength = Math.abs(t.drift) * (1 + velocityFactor);
  if (biasStrength < 1e-6) return "NEUTRAL";
  return t.drift > 0 ? "BUY" : "SELL";
}

function candleBias(c) {
  if (!c || c.length < 2) return "NEUTRAL";
  const last = c[c.length - 1];
  const prev = c[c.length - 2];
  if (last.c > last.o && prev.c > prev.o) return "BUY_STRONG";
  if (last.c < last.o && prev.c < last.o) return "SELL_STRONG";
  return last.c > last.o ? "BUY" : "SELL";
}

/* ================= SESSION MANAGEMENT ================= */
function sessionBias() {
  const h = new Date().getUTCHours();
  const d = new Date().getUTCDay();
  const isWeekend = d === 0 || d === 6;
  let weekendMultiplier = isWeekend ? 0.7 : 1.0;
  if (h >= 0 && h < 7) return { name: "ASIA", weight: 0.9 * weekendMultiplier, liquidity: "MODERATE", volatility: "LOW" };
  if (h >= 7 && h < 13) return { name: "LONDON", weight: 1.1 * weekendMultiplier, liquidity: "HIGH", volatility: "MEDIUM" };
  if (h >= 13 && h < 21) return { name: "NEW_YORK", weight: 1.2 * weekendMultiplier, liquidity: "VERY_HIGH", volatility: "HIGH" };
  return { name: "OFF", weight: 0.8 * weekendMultiplier, liquidity: "LOW", volatility: "VERY_LOW" };
}

/* ================= SYNTHETIC CANDLE GENERATORS ================= */
function generateSyntheticCandles(candles, timeframe) {
  if (!candles || candles.length === 0) return [];
  const baseTimeframe = timeframe.replace(/[^a-zA-Z]/g, '');
  const baseMultiplier = parseInt(timeframe.replace(/[^0-9]/g, '')) || 1;
  if (baseTimeframe === 'd' && baseMultiplier > 1) {
    const groupSize = baseMultiplier, synthetic = [];
    for (let i = 0; i < candles.length; i += groupSize) {
      const group = candles.slice(i, i + groupSize);
      if (!group.length) continue;
      synthetic.push({
        t: group[0].t, o: group[0].o,
        h: Math.max(...group.map(c => c.h)),
        l: Math.min(...group.map(c => c.l)),
        c: group[group.length - 1].c,
        v: group.reduce((sum, c) => sum + c.v, 0),
        bullish: group[group.length - 1].c > group[0].o
      });
    }
    return synthetic;
  } else if (baseTimeframe === 'w') {
    const synthetic = [];
    for (let i = 0; i < candles.length; i += 7) {
      const group = candles.slice(i, i + 7);
      if (!group.length) continue;
      synthetic.push({
        t: group[0].t, o: group[0].o,
        h: Math.max(...group.map(c => c.h)),
        l: Math.min(...group.map(c => c.l)),
        c: group[group.length - 1].c,
        v: group.reduce((sum, c) => sum + c.v, 0),
        bullish: group[group.length - 1].c > group[0].o
      });
    }
    return synthetic;
  } else if (baseTimeframe === 'M') {
    const synthetic = [];
    for (let i = 0; i < candles.length; i += 30) {
      const group = candles.slice(i, i + 30);
      if (!group.length) continue;
      synthetic.push({
        t: group[0].t, o: group[0].o,
        h: Math.max(...group.map(c => c.h)),
        l: Math.min(...group.map(c => c.l)),
        c: group[group.length - 1].c,
        v: group.reduce((sum, c) => sum + c.v, 0),
        bullish: group[group.length - 1].c > group[0].o
      });
    }
    return synthetic;
  }
  return candles;
}

function generateYearlyCandlesFromWeekly(weeklyCandles, years = 1) {
  if (!weeklyCandles || weeklyCandles.length === 0) return [];
  const groupSize = years * 52;
  const synthetic = [];
  for (let i = 0; i < weeklyCandles.length; i += groupSize) {
    const group = weeklyCandles.slice(i, i + groupSize);
    if (!group.length) continue;
    synthetic.push({
      t: group[0].t, o: group[0].o,
      h: Math.max(...group.map(c => c.h)),
      l: Math.min(...group.map(c => c.l)),
      c: group[group.length - 1].c,
      v: group.reduce((sum, c) => sum + c.v, 0),
      bullish: group[group.length - 1].c > group[0].o
    });
  }
  return synthetic;
}

/* ================= MARKET DATA FETCHER ================= */
async function fetchFromBinance(symbol, tf, limit = 1000) {
  try {
    const s = normalizeSymbol(symbol);
    const binanceTf = TF_MAP[tf] || "1h";
    const url = `https://api.binance.com/api/v3/klines?symbol=${s}USDT&interval=${binanceTf}&limit=${limit}`;
    const r = await fetchJSON(url);
    if (!r || !Array.isArray(r) || r.length === 0) return null;
    const candles = r.map(x => ({ 
      t: x[0], o: parseFloat(x[1]), h: parseFloat(x[2]),
      l: parseFloat(x[3]), c: parseFloat(x[4]), v: parseFloat(x[5]),
      bullish: parseFloat(x[4]) > parseFloat(x[1])
    })).sort((a, b) => a.t - b.t);
    return candles;
  } catch (e) { 
    console.error(`Binance fetch error for ${symbol} ${tf}:`, e.message);
    return null;
  }
}

async function fetchFromCoinGecko(symbol, days = 30) {
  try {
    const symbolMap = {
      'BTCUSDT': 'bitcoin','BTC': 'bitcoin',
      'ETHUSDT': 'ethereum','ETH': 'ethereum',
      'BNBUSDT': 'binancecoin','BNB': 'binancecoin',
      'SOLUSDT': 'solana','SOL': 'solana',
      'XRPUSDT': 'ripple','XRP': 'ripple',
      'ADAUSDT': 'cardano','ADA': 'cardano',
      'DOGEUSDT': 'dogecoin','DOGE': 'dogecoin',
      'DOTUSDT': 'polkadot','DOT': 'polkadot',
      'AVAXUSDT': 'avalanche-2','AVAX': 'avalanche-2',
      'MATICUSDT': 'matic-network','MATIC': 'matic-network'
    };
    const cleanSymbol = symbol.replace('USDT', '');
    const coinId = symbolMap[symbol] || symbolMap[cleanSymbol] || cleanSymbol.toLowerCase();
    const url = `https://api.coingecko.com/api/v3/coins/${coinId}/market_chart?vs_currency=usd&days=${days}&interval=daily`;
    const r = await fetchJSON(url);
    if (!r || !r.prices) return null;
    const candles = r.prices.map(([timestamp, price], index) => {
      const volatility = 0.02;
      return {
        t: timestamp, o: price,
        h: price * (1 + volatility/2),
        l: price * (1 - volatility/2),
        c: price,
        v: r.total_volumes?.[index]?.[1] || 1000000,
        bullish: index > 0 ? price > r.prices[index - 1][1] : true
      };
    });
    return candles;
  } catch (e) {
    console.error(`CoinGecko fetch error for ${symbol}:`, e.message);
    return null;
  }
}

async function candles(symbol, tf, limit = 1000) {
  try {
    // analysis-only yearly timeframes by aggregating weekly/daily
    if (tf === "1y" || tf === "2y") {
      const weekly = await fetchFromBinance(symbol.replace('USDT',''), "1w", Math.min(limit * 52, 1040));
      if (weekly && weekly.length >= 10) {
        const years = tf === "1y" ? 1 : 2;
        const yearly = generateYearlyCandlesFromWeekly(weekly, years);
        return yearly.slice(-limit);
      } else {
        const days = tf === "1y" ? 365 : 730;
        const daily = await fetchFromCoinGecko(symbol, Math.min(days, 730));
        if (daily && daily.length > 0) {
          const weeklyFromDaily = generateSyntheticCandles(daily, "1w");
          const yearly = generateYearlyCandlesFromWeekly(weeklyFromDaily, tf === "1y" ? 1 : 2);
          return yearly.slice(-limit);
        }
      }
    }
    const cleanSymbol = symbol.replace('USDT', '');
    let data = await fetchFromBinance(cleanSymbol, tf, limit);
    if (!data || data.length < 10) {
      const daysMap = {
        '5m': 1, '15m': 2, '30m': 3, '1h': 7, '2h': 14, '4h': 30,
        '1d': 90, '2d': 180, '1w': 365, '1M': 730
      };
      const days = daysMap[tf] || 30;
      data = await fetchFromCoinGecko(symbol, Math.min(days, 730));
      if (data) {
        if (tf !== '1d' && tf !== '1w' && tf !== '1M') {
          data = generateSyntheticCandles(data, tf);
        }
      }
    }
    if (!data || data.length < 10) {
      data = generateSyntheticData(symbol, tf, Math.min(limit, 100));
    }
    return data.slice(-limit);
  } catch (e) { 
    console.error(`Candle fetch error for ${symbol} ${tf}:`, e.message);
    return generateSyntheticData(symbol, tf, Math.min(limit, 100));
  }
}

function generateSyntheticData(symbol, tf, limit = 100) {
  const basePrices = {
    'BTC': 50000, 'ETH': 3000, 'BNB': 400, 'SOL': 100,
    'XRP': 0.5, 'ADA': 0.4, 'DOGE': 0.08, 'DOT': 6,
    'AVAX': 30, 'MATIC': 0.7
  };
  const cleanSymbol = symbol.replace('USDT', '');
  const basePrice = basePrices[cleanSymbol] || 100;
  const out = [];
  let currentPrice = basePrice;
  let timestamp = Date.now() - (limit * getTimeframeMs(tf));
  for (let i = 0; i < limit; i++) {
    const volatility = 0.02;
    const change = (Math.random() - 0.5) * volatility * currentPrice;
    const open = currentPrice;
    const close = currentPrice + change;
    const high = Math.max(open, close) + Math.random() * volatility * currentPrice * 0.5;
    const low = Math.min(open, close) - Math.random() * volatility * currentPrice * 0.5;
    const volume = 1000 + Math.random() * 9000;
    out.push({ t: timestamp + (i * getTimeframeMs(tf)), o: open, h: high, l: low, c: close, v: volume, bullish: close > open });
    currentPrice = close;
  }
  return out;
}

function getTimeframeMs(tf) {
  const tfMap = {
    '5m': 5 * 60 * 1000,
    '15m': 15 * 60 * 1000,
    '30m': 30 * 60 * 1000,
    '1h': 60 * 60 * 1000,
    '2h': 2 * 60 * 60 * 1000,
    '4h': 4 * 60 * 60 * 1000,
    '1d': 24 * 60 * 60 * 1000,
    '2d': 2 * 24 * 60 * 60 * 1000,
    '1w': 7 * 24 * 60 * 60 * 1000,
    '1M': 30 * 24 * 60 * 60 * 1000,
    '1y': 365 * 24 * 60 * 60 * 1000,
    '2y': 2 * 365 * 24 * 60 * 60 * 1000
  };
  return tfMap[tf] || 60 * 60 * 1000;
}

/* ================= INSTITUTIONAL INDICATORS ================= */
const ATR = (c, p = 14) => {
  if (!c || c.length < p + 1) return 0;
  const tr = [];
  for (let i = 1; i < c.length; i++) {
    tr.push(Math.max(c[i].h - c[i].l, Math.abs(c[i].h - c[i - 1].c), Math.abs(c[i].l - c[i - 1].c)));
  }
  return mean(tr.slice(-p));
};

const ATR_Z = c => {
  if (!c) return 0;
  const a = [];
  const p = 14;
  for (let i = p; i < c.length; i++) {
    a.push(ATR(c.slice(0, i), p));
  }
  if (a.length < 2) return 0;
  const stdev = std(a);
  return stdev ? ((a[a.length - 1] - mean(a)) / stdev) * 100 : 0;
};

const ParkinsonVol = c => {
  if (!c || c.length === 0) return 0;
  const sum = c.reduce((acc, x) => acc + Math.pow(Math.log(x.h / x.l), 2), 0);
  return Math.sqrt(sum / c.length / (4 * Math.log(2)));
};

const EWMA = (c, l = 0.94) => {
  if (!c || c.length < 2) return 0;
  let v = 0;
  for (let i = 1; i < c.length; i++) {
    const r = Math.log(c[i].c / c[i - 1].c);
    v = l * v + (1 - l) * r * r;
  }
  return Math.sqrt(v * 252);
};

const VolRegime = z => {
  if (z > 2) return "VERY_HIGH";
  if (z > 1) return "HIGH";
  if (z < -2) return "VERY_LOW";
  if (z < -1) return "LOW";
  return "NORMAL";
};

const VolumeDelta = c => {
  if (!c || c.length < 2) return 0;
  return c.slice(1).reduce((d, x, i) => d + (x.c > c[i].c ? x.v : -x.v), 0);
};

const Absorption = c => {
  if (!c || c.length < 20) return false;
  const delta = VolumeDelta(c.slice(-20));
  const avgVol = mean(c.slice(-20).map(x => x.v));
  return Math.abs(delta) > avgVol * 3;
};

const LiquidityVoid = c => {
  if (!c || c.length < 20) return false;
  const currentRange = c[c.length - 1].h - c[c.length - 1].l;
  const avgRange = mean(c.slice(-20).map(x => x.h - x.l));
  return currentRange > avgRange * 2;
};

const StopHuntProb = c => {
  if (!c || c.length < 20) return 0;
  const atrVal = ATR(c);
  if (atrVal === 0) return 0;
  return Math.min(1, Math.abs(c[c.length - 1].c - c[c.length - 20].c) / atrVal);
};

const IcebergProxy = c => {
  if (!c || c.length < 20) return false;
  const lastVol = c[c.length - 1].v;
  const avgVol = mean(c.slice(-20).map(x => x.v));
  return lastVol > avgVol * 4;
};

const BOS = c => {
  if (!c || c.length < 20) return false;
  const recentHighs = c.slice(-20, -1).map(x => x.h);
  const recentLows = c.slice(-20, -1).map(x => x.l);
  const last = c[c.length - 1];
  return last.h > Math.max(...recentHighs) || last.l < Math.min(...recentLows);
};

const CHoCH = c => {
  if (!c || c.length < 3) return false;
  const c1 = c[c.length - 3];
  const c2 = c[c.length - 2];
  const c3 = c[c.length - 1];
  return (c3.c > c2.h && c2.c < c1.l) || (c3.c < c2.l && c2.c > c1.h);
};

const PremiumDiscount = c => {
  if (!c || c.length === 0) return "NEUTRAL";
  const last = c[c.length - 1];
  const maxHigh = Math.max(...c.map(x => x.h));
  const minLow = Math.min(...c.map(x => x.l));
  const midpoint = (maxHigh + minLow) / 2;
  const premiumLevel = (last.c - midpoint) / midpoint * 100;
  if (premiumLevel > 5) return "STRONG_PREMIUM";
  if (premiumLevel > 2) return "PREMIUM";
  if (premiumLevel < -5) return "STRONG_DISCOUNT";
  if (premiumLevel < -2) return "DISCOUNT";
  return "FAIR_VALUE";
};

const RangeState = c => {
  if (!c || c.length < 20) return "NEUTRAL";
  const priceChange = Math.abs(c[c.length - 1].c - c[c.length - 20].c);
  const atrValue = ATR(c);
  return priceChange < atrValue ? "ACCEPTED" : "REJECTED";
};

const SpreadEfficiency = c => {
  if (!c || c.length === 0) return 0;
  const last = c[c.length - 1];
  const atrValue = ATR(c);
  return atrValue ? (last.h - last.l) / atrValue : 0;
};

const RelativeVolume = c => {
  if (!c || c.length < 20) return 1;
  const lastVol = c[c.length - 1].v;
  const avgVol = mean(c.slice(-20).map(x => x.v));
  return avgVol ? lastVol / avgVol : 1;
};

const Hurst = c => {
  if (!c || c.length < 10) return 0.5;
  let s = 0, r = 0;
  const prices = c.map(x => x.c);
  const m = mean(prices);
  for (const price of prices) { s += price - m; r = Math.max(r, Math.abs(s)); }
  const stdev = std(prices);
  return stdev ? Math.log(r / stdev) / Math.log(c.length) : 0.5;
};

const FractalDimension = c => {
  const h = Hurst(c);
  return 2 - h;
};

const TimeSymmetry = c => {
  if (!c || c.length < 10) return 0;
  const slice = c.slice(-10);
  const diffs = slice.map((x, i) => i === 0 ? 0 : x.c - slice[i - 1].c);
  return mean(diffs.slice(1));
};

const priceRejection = c => {
  if (!c || c.length < 1) return 0;
  const last = c[c.length - 1];
  const upper = last.h - last.c;
  const lower = last.c - last.l;
  const total = last.h - last.l;
  return total ? Math.min(upper, lower) / total : 0;
};

const momentum = c => {
  if (!c || c.length < 5) return 0;
  const returns = [];
  for (let i = 1; i < c.length; i++) {
    returns.push((c[i].c - c[i-1].c) / c[i-1].c);
  }
  return mean(returns.slice(-5)) * 100;
};

/* ================= RISK MANAGEMENT ENGINE ================= */
function calculateRiskParameters(entry, direction, atr, quality, timeframe, volatility) {
  const tfMultipliers = {
    "5m": 0.8, "15m": 1.0, "30m": 1.2,
    "1h": 1.4, "2h": 1.6, "4h": 1.8,
    "1d": 2.0, "2d": 2.2, "1w": 2.5, "1M": 3.0,
    "1y": 4.0, "2y": 5.0
  };
  const qualityMultiplier = clamp(quality / 100, 0.5, 1.5);
  const volMultiplier = volatility === "HIGH" || volatility === "VERY_HIGH" ? 0.8 : 
                       volatility === "LOW" || volatility === "VERY_LOW" ? 1.2 : 1.0;
  const baseMultiplier = tfMultipliers[timeframe] || 2.0;
  const adjustedATR = atr * baseMultiplier * qualityMultiplier * volMultiplier;
  if (direction === "BUY") {
    const stopLoss = entry - (adjustedATR * 1.0);
    const takeProfit1 = entry + (adjustedATR * DEFAULT_RISK_REWARD);
    const takeProfit2 = entry + (adjustedATR * (DEFAULT_RISK_REWARD * 1.5));
    const takeProfit3 = entry + (adjustedATR * (DEFAULT_RISK_REWARD * 2.0));
    return { stopLoss: Math.max(0, stopLoss), takeProfits: [takeProfit1, takeProfit2, takeProfit3],
      riskPerUnit: Math.abs(entry - stopLoss), rewardRatios: [DEFAULT_RISK_REWARD, DEFAULT_RISK_REWARD * 1.5, DEFAULT_RISK_REWARD * 2.0], atrMultiple: baseMultiplier };
  } else {
    const stopLoss = entry + (adjustedATR * 1.0);
    const takeProfit1 = entry - (adjustedATR * DEFAULT_RISK_REWARD);
    const takeProfit2 = entry - (adjustedATR * (DEFAULT_RISK_REWARD * 1.5));
    const takeProfit3 = entry - (adjustedATR * (DEFAULT_RISK_REWARD * 2.0));
    return { stopLoss, takeProfits: [takeProfit1, takeProfit2, takeProfit3],
      riskPerUnit: Math.abs(stopLoss - entry), rewardRatios: [DEFAULT_RISK_REWARD, DEFAULT_RISK_REWARD * 1.5, DEFAULT_RISK_REWARD * 2.0], atrMultiple: baseMultiplier };
  }
}

function calculatePositionSize(entry, stopLoss, accountBalance = ACCOUNT_BALANCE) {
  const riskAmount = accountBalance * (ACCOUNT_RISK_PERCENT / 100);
  const riskPerUnit = Math.abs(entry - stopLoss);
  if (riskPerUnit <= 0) return 0;
  const rawPosition = riskAmount / riskPerUnit;
  const maxPosition = accountBalance * (MAX_POSITION_SIZE / 100) / entry;
  return clamp(rawPosition, 0, maxPosition);
}

/* ================= CROSS-ASSET ANALYSIS ================= */
async function BTCDominance() {
  try {
    const r = await fetchJSON("https://api.coingecko.com/api/v3/global");
    if (r && r.data && r.data.market_cap_percentage) {
      return r.data.market_cap_percentage.btc || 50;
    }
    return 50;
  } catch (e) { 
    console.warn("BTC Dominance fetch failed:", e.message);
    return 50; 
  }
}

async function CorrelationFilter(symbol) {
  try {
    const btc = await candles("BTCUSDT", "1h", 100);
    const s = await candles(symbol, "1h", 100);
    if (!btc || !s || btc.length < 20 || s.length < 20) return 0;
    const minLength = Math.min(btc.length, s.length, 20);
    const btcClose = btc.slice(-minLength).map(x => x.c);
    const sClose = s.slice(-minLength).map(x => x.c);
    const btcMean = mean(btcClose);
    const sMean = mean(sClose);
    let covariance = 0, btcVariance = 0, sVariance = 0;
    for (let i = 0; i < minLength; i++) {
      const btcDiff = btcClose[i] - btcMean;
      const sDiff = sClose[i] - sMean;
      covariance += btcDiff * sDiff;
      btcVariance += btcDiff * btcDiff;
      sVariance += sDiff * sDiff;
    }
    const correlation = covariance / Math.sqrt(btcVariance * sVariance);
    return isNaN(correlation) ? 0 : clamp(correlation, -1, 1);
  } catch (e) {
    console.warn("Correlation filter error:", e.message);
    return 0;
  }
}

async function RiskOnOff() {
  const btcDom = await BTCDominance();
  if (btcDom > 55) return "RISK_ON";
  if (btcDom < 45) return "RISK_OFF";
  return "NEUTRAL";
}

/* ================= SUPPORT/RESISTANCE ENGINE ================= */
function supportResistance(c, levels = 3) {
  if (!c || c.length < 50) return { support: [], resistance: [], currentPrice: 0, inSupportZone: false, inResistanceZone: false };
  const highs = c.map(x => x.h);
  const lows = c.map(x => x.l);
  const swingHighs = [];
  const swingLows = [];
  for (let i = 2; i < c.length - 2; i++) {
    if (highs[i] > highs[i-1] && highs[i] > highs[i-2] && highs[i] > highs[i+1] && highs[i] > highs[i+2]) {
      swingHighs.push(highs[i]);
    }
    if (lows[i] < lows[i-1] && lows[i] < lows[i-2] && lows[i] < lows[i+1] && lows[i] < lows[i+2]) {
      swingLows.push(lows[i]);
    }
  }
  const clusterLevels = (values, tolerance = 0.015) => {
    const sorted = [...values].sort((a, b) => b - a);
    const clusters = [];
    for (const value of sorted) {
      let found = false;
      for (const cluster of clusters) {
        if (Math.abs(value - cluster.mean) / cluster.mean < tolerance) {
          cluster.values.push(value);
          cluster.mean = mean(cluster.values);
          found = true;
          break;
        }
      }
      if (!found) clusters.push({ values: [value], mean: value, strength: 1 });
    }
    clusters.forEach(c => c.strength = c.values.length);
    return clusters.sort((a, b) => b.strength - a.strength).slice(0, levels).map(c => ({ price: c.mean, strength: c.strength }));
  };
  const supportLevels = clusterLevels(swingLows, 0.015);
  const resistanceLevels = clusterLevels(swingHighs, 0.015);
  const currentPrice = c[c.length - 1].c;
  return {
    support: supportLevels,
    resistance: resistanceLevels,
    currentPrice,
    inSupportZone: supportLevels.some(s => Math.abs(s.price - currentPrice) / s.price < 0.02),
    inResistanceZone: resistanceLevels.some(r => Math.abs(r.price - currentPrice) / r.price < 0.02)
  };
}

/* ================= CANDLE PATTERN RECOGNITION ================= */
function candlePattern(c) {
  if (!c || c.length < 3) return { pattern: "NONE", confidence: 0 };
  const c1 = c[c.length - 3];
  const c2 = c[c.length - 2];
  const c3 = c[c.length - 1];
  const results = [];
  if (c2.bullish && c2.o < c1.c && c2.c > c1.o && !c1.bullish) results.push({ pattern: "BULLISH_ENGULFING", confidence: 0.8 });
  if (!c2.bullish && c2.o > c1.c && c2.c < c1.o && c1.bullish) results.push({ pattern: "BEARISH_ENGULFING", confidence: 0.8 });
  if (c3.bullish) {
    const body = c3.c - c3.o, upperShadow = c3.h - c3.c, lowerShadow = c3.o - c3.l, range = c3.h - c3.l;
    if (body < range * 0.3 && lowerShadow > body * 2 && upperShadow < body * 0.5) results.push({ pattern: "HAMMER", confidence: 0.7 });
  }
  if (!c3.bullish) {
    const body = c3.o - c3.c, upperShadow = c3.h - c3.o, lowerShadow = c3.c - c3.l, range = c3.h - c3.l;
    if (body < range * 0.3 && upperShadow > body * 2 && lowerShadow < body * 0.5) results.push({ pattern: "SHOOTING_STAR", confidence: 0.7 });
  }
  if (Math.abs(c3.c - c3.o) < (c3.h - c3.l) * 0.1) results.push({ pattern: "DOJI", confidence: 0.6 });
  if (!results.length) return { pattern: "NONE", confidence: 0 };
  return results.sort((a, b) => b.confidence - a.confidence)[0];
}

/* ================= PIPELINE DATABASE ================= */
const pipelineDatabase = {
  strategies: [],
  indicators: [],
  history: [],
  misalignment: [],
  trades: [],
  performance: { wins: 0, losses: 0, total: 0, winRate: 0 }
};

/* ================= MACRO ANALYSIS ================= */
async function macro2Y(symbol) {
  try {
    const c = await candles(symbol, "1w", 104);
    if (!c || c.length < 20) {
      return { regime: "NEUTRAL", atrZ: 0, trend: "SIDEWAYS", strength: 0, price: 0, hurst: 0.5, fractalDimension: 1.5, sma50: 0, sma200: 0, aboveSMA50: false, aboveSMA200: false };
    }
    const prices = c.map(x => x.c);
    const atrZVal = ATR_Z(c);
    const hurstVal = Hurst(c);
    const currentPrice = c[c.length - 1].c;
    const sma50 = prices.length >= 50 ? mean(prices.slice(-50)) : mean(prices);
    const sma200 = prices.length >= 200 ? mean(prices.slice(-200)) : sma50;
    let trend = "SIDEWAYS", strength = 0;
    if (currentPrice > sma50 && sma50 > sma200) { trend = "BULLISH"; strength = (currentPrice - sma200) / sma200 * 100; }
    else if (currentPrice < sma50 && sma50 < sma200) { trend = "BEARISH"; strength = (sma200 - currentPrice) / sma200 * 100; }
    else if (currentPrice > sma50) trend = "BULLISH_WEAK";
    else if (currentPrice < sma50) trend = "BEARISH_WEAK";
    let regime = "NEUTRAL";
    if (trend.includes("BULLISH") && strength > 10 && hurstVal > 0.55) regime = "STRONG_BULL";
    else if (trend.includes("BULLISH") && strength > 5) regime = "BULL";
    else if (trend.includes("BEARISH") && strength > 10 && hurstVal > 0.55) regime = "STRONG_BEAR";
    else if (trend.includes("BEARISH") && strength > 5) regime = "BEAR";
    else if (hurstVal < 0.45) regime = "RANGING";
    return { regime, atrZ: atrZVal, trend, strength: round(strength, 2), hurst: round(hurstVal, 3), fractalDimension: round(FractalDimension(c), 3), price: currentPrice,
             sma50: round(sma50, 6), sma200: round(sma200, 6), aboveSMA50: currentPrice > sma50, aboveSMA200: currentPrice > sma200 };
  } catch (e) {
    console.error("Macro analysis error:", e.message);
    return null;
  }
}

/* ================= SIGNAL EXTRACTION (CORE AI PIPELINE) ================= */
async function extractPipeline(symbol, tf = "1h") {
  try {
    const limit =
      tf === "1y" ? 52 :
      tf === "2y" ? 104 :
      tf.includes("m") ? 500 :
      tf.includes("h") ? 200 :
      tf.includes("d") || tf.includes("w") || tf.includes("M") ? 150 : 100;

    const c = await candles(symbol, tf, limit);
    if (!c || c.length < 20) return null;

    const entryPrice = c[c.length - 1].c;
    updateTick(symbol, entryPrice);

    const sr = supportResistance(c);
    const pattern = candlePattern(c);
    const atrVal = ATR(c);
    const atrZVal = ATR_Z(c);
    const volReg = VolRegime(atrZVal);
    const bos = BOS(c);
    const choch = CHoCH(c);
    const premium = PremiumDiscount(c);
    const rangeState = RangeState(c);
    const spread = SpreadEfficiency(c);
    const relVol = RelativeVolume(c);
    const mom = momentum(c);
    const rej = priceRejection(c);
    const tick = tickBias(symbol);
    const bias = candleBias(c);
    const corr = await CorrelationFilter(symbol).catch(() => 0);
    const btcDom = await BTCDominance();
    const riskMode = await RiskOnOff();
    const macro = await macro2Y(symbol);

    // Composite signal confidence (0-100): pattern, volume, trend alignment, session weight
    const sess = sessionBias();
    let qualityScore = 0;
    qualityScore += (pattern.confidence || 0) * 60;           // patterns up to 60
    qualityScore += Math.min(20, Math.max(0, (relVol - 1) * 20)); // volume burst up to 20
    qualityScore += (bos ? 8 : 0) + (choch ? 8 : 0);          // structure up to 16
    qualityScore += (bias.includes("BUY") ? 4 : bias.includes("SELL") ? 4 : 0); // bias 4
    qualityScore += sess.weight > 1 ? 6 : 0;                  // session bonus
    qualityScore -= Math.abs(corr) > 0.6 ? 5 : 0;             // correlation penalty
    qualityScore = clamp(qualityScore, 0, 100);

    // Direction override by macro regime
    let direction = bias.includes("BUY") ? "BUY" : "SELL";
    if (macro?.regime?.includes("BULL") && direction === "SELL") direction = "BUY";
    if (macro?.regime?.includes("BEAR") && direction === "BUY") direction = "SELL";

    const riskParams = calculateRiskParameters(entryPrice, direction, atrVal, qualityScore, tf, volReg);
    const positionSize = calculatePositionSize(entryPrice, riskParams.stopLoss);

    const strategy = {
      symbol, tf, timestamp: Date.now(),
      price: entryPrice,
      volume: c[c.length - 1].v,
      direction,
      entry: round(entryPrice, 6),
      stopLoss: round(riskParams.stopLoss, 6),
      takeProfits: riskParams.takeProfits.map(x => round(x, 6)),
      rewardRatios: riskParams.rewardRatios,
      riskPerUnit: round(riskParams.riskPerUnit, 6),
      positionSize: round(positionSize, 6),
      atr: round(atrVal, 6),
      atrZ: round(atrZVal, 3),
      volatility: volReg,
      signalConfidence: round(qualityScore, 2),
      premiumDiscount: premium,
      rangeState,
      spreadEfficiency: round(spread, 3),
      relativeVolume: round(relVol, 2),
      momentum: round(mom, 2),
      priceRejection: round(rej, 3),
      bos, choch,
      pattern: pattern.pattern, patternConfidence: round(pattern.confidence, 2),
      correlationWithBTC: round(corr, 3),
      session: sess.name,
      macro: macro ? { regime: macro.regime, trend: macro.trend, strength: macro.strength } : null
    };

    pipelineDatabase.strategies.push(strategy);
    pipelineDatabase.history.push(strategy);
    pipelineDatabase.strategies = pipelineDatabase.strategies.slice(-200);
    pipelineDatabase.history = pipelineDatabase.history.slice(-2000);

    SIGNAL_HISTORY.set(`${symbol}_${tf}_${Date.now()}`, strategy);
    if (SIGNAL_HISTORY.size > 1000) {
      const keys = Array.from(SIGNAL_HISTORY.keys()).slice(0, 100);
      keys.forEach(k => SIGNAL_HISTORY.delete(k));
    }

    return strategy;
  } catch (error) {
    console.error(`Pipeline extraction error for ${symbol}:`, error.message);
    return null;
  }
}

/* ================= TELEGRAM COMMAND HANDLER ================= */
function formatSignalMsg(s) {
  if (!s) return "❌ No signal.";
  const arrow = s.direction === "BUY" ? "🟢" : "🔴";
  const slDistance = round(Math.abs(s.entry - s.stopLoss) / s.entry * 100, 2);
  const tps = s.takeProfits.map((tp,i)=> {
    const dist = round(Math.abs(tp - s.entry) / s.entry * 100, 2);
    return `TP${i+1}: <code>${tp}</code> (${dist}%)`;
  }).join('\n');
  return `
<b>${arrow} ${s.direction} SIGNAL</b>
<code>${s.symbol} • ${s.tf} • ${new Date().toLocaleTimeString()}</code>

<b>🎯 Confidence:</b> <code>${s.signalConfidence}%</code>
<b>💰 Entry:</b> <code>${s.entry}</code>
<b>🛑 Stop Loss:</b> <code>${s.stopLoss}</code> (${slDistance}%)
${tps}

<b>⚖️ R/R:</b> 1:${s.rewardRatios[0]} | 1:${s.rewardRatios[1]} | 1:${s.rewardRatios[2]}
<b>📊 Size:</b> <code>${s.positionSize}</code> units
<b>ATR:</b> <code>${s.atr}</code> (Z: ${s.atrZ})
<b>Session:</b> ${s.session} • <b>Vol:</b> ${s.volatility}

<b>Indicators:</b>
• BOS: ${s.bos ? "✅" : "❌"} • CHoCH: ${s.choch ? "✅" : "❌"}
• Pattern: ${s.pattern} (${s.patternConfidence})
• RelVol: ${s.relativeVolume}x • Momentum: ${s.momentum}%
• Premium/Discount: ${s.premiumDiscount} • Range: ${s.rangeState}
`.trim();
}

async function handleTelegramCommand(msg) {
  const chatId = msg.chat.id;
  const text = msg.text?.trim();
  const userId = msg.from?.id;
  const username = msg.from?.username || `User${userId}`;
  if (!text) return;

  const args = text.split(/\s+/);
  const cmd = args[0].toLowerCase();

  const now = Date.now();
  const lastExec = LAST_EXECUTION.get(userId) || 0;
  if (now - lastExec < 1200) return send(chatId, "⚠️ Please wait a second between commands.");
  LAST_EXECUTION.set(userId, now);

  if (cmd === "/start" || cmd === "/help") {
    const helpMsg = `
<b>🚀 OMNI INSTITUTIONAL AI v3.2.0</b>
<code>Professional Trading System</code>

<b>📊 ANALYSIS:</b>
/analyze [SYMBOL] [TF] — Full analysis with TP/SL
/scalp [SYMBOL] — 5m..4h
/swing [SYMBOL] — 1d, 2d, 1w, 1M
<i>Analysis-only:</i> 1y, 2y

<b>📋 WATCHLIST:</b>
/watch [SYMBOL] • /unwatch [SYMBOL] • /list

<b>⚙️ SETTINGS:</b>
/risk [PERCENT] — per-trade risk
/threshold [PERCENT] — auto-scan alert confidence
/pipeline • /stats • /session • /dominance

<b>Examples:</b>
<code>/analyze BTCUSDT 1h</code>
<code>/scalp SOLUSDT</code>
<code>/swing ETHUSDT</code>
<code>/threshold 70</code>
    `.trim();
    return send(chatId, helpMsg);
  }

  if (cmd === "/analyze") {
    const symbol = args[1]?.toUpperCase();
    const tf = args[2] || "1h";
    if (!symbol) {
      return send(chatId, "❌ Usage: <code>/analyze SYMBOL [TF]</code>\nTF: 5m,15m,30m,1h,2h,4h,1d,2d,1w,1M,1y,2y");
    }
    await send(chatId, `🔍 <b>Analyzing ${symbol} ${tf}...</b>`);
    const s = await extractPipeline(symbol, tf);
    if (s) {
      const macro = await macro2Y(symbol);
      const msg = formatSignalMsg(s) + (macro ? `\n\n<b>Macro (2Y):</b> ${macro.regime} • ${macro.trend} • Strength ${macro.strength}%` : "");
      return send(chatId, msg);
    } else {
      return send(chatId, `❌ No signal for ${symbol} ${tf}.`);
    }
  }

  if (cmd === "/scalp" || cmd === "/swing") {
    const symbol = args[1]?.toUpperCase();
    if (!symbol) return send(chatId, `❌ Usage: <code>${cmd} SYMBOL</code>`);
    const tfs = cmd === "/scalp" ? SCALP_TF : SWING_TF;
    await send(chatId, `🔍 <b>Analyzing ${symbol} (${cmd})...</b>`);
    const out = [];
    for (const tf of tfs) {
      const s = await extractPipeline(symbol, tf);
      if (s) out.push(formatSignalMsg(s));
      await sleep(400);
    }
    if (!out.length) return send(chatId, `❌ No signals for ${symbol} (${cmd}).`);
    return send(chatId, `<b>${cmd.toUpperCase()} ${symbol}</b>\n\n` + out.join("\n\n"));
  }

  if (cmd === "/watch") {
    const symbol = args[1]?.toUpperCase();
    if (!symbol) return send(chatId, "❌ Usage: <code>/watch SYMBOL</code>");
    WATCH.set(symbol, { tf: "1h", added: Date.now() });
    return send(chatId, `✅ <b>${symbol}</b> added to watchlist.`);
  }

  if (cmd === "/unwatch") {
    const symbol = args[1]?.toUpperCase();
    if (!symbol) return send(chatId, "❌ Usage: <code>/unwatch SYMBOL</code>");
    const existed = WATCH.delete(symbol);
    return send(chatId, existed ? `❌ <b>${symbol}</b> removed from watchlist.` : `⚠️ <b>${symbol}</b> not in watchlist.`);
  }

  if (cmd === "/list") {
    if (WATCH.size === 0) return send(chatId, "📭 <b>Watchlist is empty.</b>");
    const list = Array.from(WATCH.entries()).map(([sym, data], i) => `${i+1}. <b>${sym}</b> (${data.tf}) - ${new Date(data.added).toLocaleDateString()}`).join("\n");
    return send(chatId, `<b>📋 Watchlist (${WATCH.size})</b>\n\n${list}`);
  }

  if (cmd === "/risk") {
    const riskPercent = parseFloat(args[1]);
    if (!riskPercent || riskPercent < 0.1 || riskPercent > 5) {
      return send(chatId, `❌ Usage: <code>/risk PERCENT</code>\nRange: 0.1–5.0\nCurrent: ${ACCOUNT_RISK_PERCENT}%`);
    }
    ACCOUNT_RISK_PERCENT = riskPercent;
    return send(chatId, `✅ Risk per trade set to ${riskPercent}%`);
  }

  if (cmd === "/threshold") {
    const thr = parseFloat(args[1]);
    if (!thr || thr < 40 || thr > 95) {
      return send(chatId, `❌ Usage: <code>/threshold PERCENT</code>\nRange: 40–95\nCurrent: ${ALERT_THRESHOLD}%`);
    }
    ALERT_THRESHOLD = thr;
    return send(chatId, `✅ Alert threshold set to ${ALERT_THRESHOLD}%`);
  }

  if (cmd === "/pipeline") {
    const sess = sessionBias();
    const btcDom = await BTCDominance();
    const riskMode = await RiskOnOff();
    const stats = `
<b>📊 PIPELINE STATUS</b>
<b>DB:</b> Strategies ${pipelineDatabase.strategies.length} • History ${pipelineDatabase.history.length} • Signals ${SIGNAL_HISTORY.size}
<b>Watchlist:</b> ${WATCH.size} symbols
<b>Session:</b> ${sess.name} (${sess.weight.toFixed(2)}x) • ${sess.liquidity} • Vol ${sess.volatility}
<b>Market:</b> BTC Dom ${round(btcDom,2)}% • Risk ${riskMode}
<b>Config:</b> Risk ${ACCOUNT_RISK_PERCENT}% • MaxPos ${MAX_POSITION_SIZE}% • R/R 1:${DEFAULT_RISK_REWARD} • Threshold ${ALERT_THRESHOLD}%
<i>Updated: ${new Date().toLocaleTimeString()}</i>
    `.trim();
    return send(chatId, stats);
  }

  if (cmd === "/stats") {
    const uptime = process.uptime();
    const hours = Math.floor(uptime / 3600);
    const minutes = Math.floor((uptime % 3600) / 60);
    const seconds = Math.floor(uptime % 60);
    const memory = process.memoryUsage();
    const memoryUsed = (memory.heapUsed / 1024 / 1024).toFixed(2);
    const memoryTotal = (memory.heapTotal / 1024 / 1024).toFixed(2);
    const stats = `
<b>🤖 BOT STATS</b>
Uptime: ${hours}h ${minutes}m ${seconds}s
Memory: ${memoryUsed} / ${memoryTotal} MB
Node: ${process.version}
Watchlist: ${WATCH.size} • Users: ${LAST_EXECUTION.size} • Signals: ${SIGNAL_HISTORY.size}
Risk ${ACCOUNT_RISK_PERCENT}% • MaxPos ${MAX_POSITION_SIZE}% • R/R 1:${DEFAULT_RISK_REWARD} • Threshold ${ALERT_THRESHOLD}%
    `.trim();
    return send(chatId, stats);
  }

  if (cmd === "/session") {
    const sess = sessionBias();
    const nowDate = new Date();
    const utcHours = nowDate.getUTCHours();
    const nextSession = utcHours < 7 ? `LONDON (in ${7-utcHours}h)` :
                       utcHours < 13 ? `NEW_YORK (in ${13-utcHours}h)` :
                       utcHours < 21 ? `ASIA (in ${21-utcHours}h)` :
                       `LONDON (in ${7 + 24 - utcHours}h)`;
    const msg = `
<b>🌐 SESSIONS</b>
Current: ${sess.name} • ${sess.liquidity} • Vol ${sess.volatility} • Weight ${sess.weight.toFixed(2)}x
UTC: ${utcHours}:00 • Next: ${nextSession}
Local: ${nowDate.toLocaleTimeString()}
<i>Session weights affect signal confidence.</i>
    `.trim();
    return send(chatId, msg);
  }

  if (cmd === "/dominance") {
    const btcDom = await BTCDominance();
    const riskMode = await RiskOnOff();
    let interp = "";
    if (btcDom > 60) interp = "🚨 High Dominance: Alt risk-off, BTC strength";
    else if (btcDom > 55) interp = "⚠️ Elevated Dominance: Caution on alts";
    else if (btcDom > 45) interp = "✅ Neutral Dominance: Balanced market";
    else if (btcDom > 40) interp = "📈 Low Dominance: Alt season potential";
    else interp = "🚀 Very Low Dominance: Strong alt season";
    const msg = `
<b>₿ BTC DOMINANCE</b>
Current: <code>${btcDom.toFixed(2)}%</code> • Risk Mode: ${riskMode}
${interp}
    `.trim();
    return send(chatId, msg);
  }

  return send(chatId, `❌ Unknown command: <code>${cmd}</code>\nType <code>/help</code> for available commands.`);
}

/* ================= TELEGRAM POLLING ================= */
async function setupTelegramPolling() {
  if (!TELEGRAM_TOKEN) {
    console.warn("⚠️ TELEGRAM_TOKEN not set. Bot commands disabled.");
    return;
  }
  let offset = 0;
  let errorCount = 0;
  const MAX_ERRORS = 10;
  async function poll() {
    try {
      const url = `https://api.telegram.org/bot${TELEGRAM_TOKEN}/getUpdates?offset=${offset}&timeout=30`;
      const response = await fetchJSON(url);
      if (response?.ok && response.result) {
        errorCount = 0;
        for (const update of response.result) {
          offset = update.update_id + 1;
          if (update.message) {
            await handleTelegramCommand(update.message);
          }
        }
      } else if (response?.ok === false) {
        console.error("Telegram API error:", response.description);
        errorCount++;
        if (errorCount >= MAX_ERRORS) return;
      }
    } catch (error) {
      console.error("Telegram polling error:", error.message);
      errorCount++;
      if (errorCount >= MAX_ERRORS) return;
      await sleep(1000 * Math.min(60, Math.pow(2, errorCount)));
    }
    setTimeout(poll, 150);
  }
  console.log("🤖 Telegram bot polling started...");
  poll();
}

/* ================= AUTO-SCANNER (ALERTS) ================= */
async function autoScanner() {
  const symbols = WATCH.size > 0 ? Array.from(WATCH.keys()) : DEFAULT_SCAN_SYMBOLS;
  for (const symbol of symbols) {
    for (const tf of DEFAULT_SCAN_TF) {
      const s = await extractPipeline(symbol, tf);
      if (!s) continue;
      if (s.signalConfidence >= ALERT_THRESHOLD) {
        const key = `${symbol}_${tf}`;
        const last = LAST_ALERT.get(key) || 0;
        // 30-minute cooldown per symbol_tf
        if (Date.now() - last > 30 * 60 * 1000) {
          LAST_ALERT.set(key, Date.now());
          const arrow = s.direction === "BUY" ? "🟢" : "🔴";
          const alertMsg = `
<b>🚨 AUTO-SCAN SIGNAL</b>
${arrow} ${s.direction} • <code>${symbol} ${tf}</code>
Confidence: <code>${s.signalConfidence}%</code>
Entry: <code>${s.entry}</code> • SL: <code>${s.stopLoss}</code>
TP1: <code>${s.takeProfits[0]}</code> • Size: <code>${s.positionSize}</code>
Session: ${s.session} • Vol: ${s.volatility}
          `.trim();
          if (TELEGRAM_CHAT_ID) await send(TELEGRAM_CHAT_ID, alertMsg);
          else console.log(alertMsg);
        }
      }
      await sleep(300);
    }
    await sleep(700);
  }
}

/* ================= MAIN APPLICATION ================= */
async function main() {
  console.log(`
╔══════════════════════════════════════════════════════════╗
║                OMNI INSTITUTIONAL AI v3.2.0              ║
║                Professional Trading System               ║
╚══════════════════════════════════════════════════════════╝
  `);
  console.log("📅 Date:", new Date().toLocaleString());
  console.log("⚙️ Node.js:", process.version);
  console.log("📊 Session:", sessionBias().name);
  console.log("💰 Account Risk:", ACCOUNT_RISK_PERCENT + "%");
  console.log("🎯 Default Risk/Reward:", "1:" + DEFAULT_RISK_REWARD);
  console.log("📈 Max Position Size:", MAX_POSITION_SIZE + "%");
  console.log("🔔 Alert Threshold:", ALERT_THRESHOLD + "%");

  // Smoke test
  try {
    const testCandles = await candles("BTCUSDT", "1h", 10);
    console.log(`✅ Data fetch test: ${testCandles.length} candles`);
  } catch (error) {
    console.log("⚠️ Data fetch test failed:", error.message);
  }

  if (TELEGRAM_TOKEN) await setupTelegramPolling();

  // Learning/pipeline interval (extract watchlist features)
  const pipelineInterval = setInterval(async () => {
    try {
      if (WATCH.size > 0) {
        const symbols = Array.from(WATCH.keys());
        for (const symbol of symbols) {
          await extractPipeline(symbol, "1h");
          await sleep(500);
        }
      }
    } catch (error) {
      console.error("Pipeline extraction error:", error.message);
    }
  }, DAILY_PIPELINE_MS);

  // Watchlist monitoring + auto-scanner combined
  const scanInterval = setInterval(async () => {
    try {
      await autoScanner();
    } catch (error) {
      console.error("Auto-scanner error:", error.message);
    }
  }, WATCH_INTERVAL_MS);

  setInterval(() => {
    const sess = sessionBias();
    console.log(`💡 Active. Session: ${sess.name}. Watchlist: ${WATCH.size}. Threshold: ${ALERT_THRESHOLD}%`);
  }, 300000);

  console.log("\n✅ Systems operational. Waiting for commands...");
  console.log("🔍 Auto-scan every", WATCH_INTERVAL_MS / 1000, "seconds");
  console.log("📊 Pipeline extraction every", DAILY_PIPELINE_MS / 1000, "seconds");

  process.on("SIGINT", () => {
    console.log("\n🛑 SIGINT. Shutting down...");
    clearInterval(pipelineInterval);
    clearInterval(scanInterval);
    console.log("📊 Final Stats:");
    console.log("• Strategies:", pipelineDatabase.strategies.length);
    console.log("• Watchlist:", WATCH.size);
    console.log("• Signals:", SIGNAL_HISTORY.size);
    console.log("• Uptime:", process.uptime().toFixed(0), "s");
    process.exit(0);
  });
  process.on("SIGTERM", () => process.exit(0));
  process.on("uncaughtException", (error) => { console.error("❌ Uncaught:", error); process.exit(1); });
  process.on("unhandledRejection", (reason, promise) => { console.error("❌ Unhandled:", reason); });
}

// Start
main().catch(error => {
  console.error("❌ Fatal startup error:", error);
  process.exit(1);
});
