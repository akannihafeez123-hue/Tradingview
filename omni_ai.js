#!/usr/bin/env node
/* =========================================================
   OMNI INSTITUTIONAL AI — COMPLETE EDITION
   Version: 3.0.0 | Professional Trading System
   
   Features:
   • Multi-Timeframe Analysis (Swing + Scalp)
   • Institutional Grade Indicators (30+)
   • Automatic TP/SL Calculation with Risk Management
   • Cross-Asset Correlation & BTC Dominance
   • Market Alignment Pipeline
   • Session-Aware Trading (Asia/London/NY)
   • Telegram Bot Integration with HTML Formatting
   • Continuous Learning Pipeline
   • Risk-On/Risk-Off Mode Detection
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
const AI_COUNT = 3;

/* ================= GLOBAL STATE ================= */
const WATCH = new Map();
const LAST_EXECUTION = new Map();
const TICK_STATE = new Map();
const SIGNAL_HISTORY = new Map();

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
  "5m": "5min", "15m": "15min", "30m": "30min", 
  "1h": "1H", "2h": "2H", "4h": "4H",
  "1d": "1D", "2d": "2D", "1w": "1W", 
  "1M": "1M", "2Y": "2Y"
};

/* ================= PRICE TRACKING SYSTEM ================= */
function updateTick(symbol, price) {
  const t = TICK_STATE.get(symbol) || {};
  t.drift = t.last ? price - t.last : 0;
  t.last = price;
  t.velocity = t.drift ? Math.abs(t.drift) / (Date.now() - (t.lastUpdate || 0)) * 1000 : 0;
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
  if (c.length < 2) return "NEUTRAL";
  const last = c[c.length - 1];
  const prev = c[c.length - 2];
  
  if (last.c > last.o && prev.c > prev.o) return "BUY_STRONG";
  if (last.c < last.o && prev.c < prev.o) return "SELL_STRONG";
  
  return last.c > last.o ? "BUY" : "SELL";
}

/* ================= SESSION MANAGEMENT ================= */
function sessionBias() {
  const h = new Date().getUTCHours();
  const d = new Date().getUTCDay();
  
  const isWeekend = d === 0 || d === 6;
  let weekendMultiplier = isWeekend ? 0.7 : 1.0;
  
  if (h >= 0 && h < 7) return { 
    name: "ASIA", 
    weight: 0.9 * weekendMultiplier,
    liquidity: "MODERATE",
    volatility: "LOW"
  };
  if (h >= 7 && h < 13) return { 
    name: "LONDON", 
    weight: 1.1 * weekendMultiplier,
    liquidity: "HIGH",
    volatility: "MEDIUM"
  };
  if (h >= 13 && h < 21) return { 
    name: "NEW_YORK", 
    weight: 1.2 * weekendMultiplier,
    liquidity: "VERY_HIGH",
    volatility: "HIGH"
  };
  return { 
    name: "OFF", 
    weight: 0.8 * weekendMultiplier,
    liquidity: "LOW",
    volatility: "VERY_LOW"
  };
}

/* ================= MARKET DATA FETCHER ================= */
async function candles(symbol, tf, limit = 1000) {
  try {
    const s = normalizeSymbol(symbol);
    
    // Try Binance API as alternative
    const timeframeMap = {
      "5m": "5m", "15m": "15m", "30m": "30m",
      "1h": "1h", "2h": "2h", "4h": "4h",
      "1d": "1d", "1w": "1w", "1M": "1M"
    };
    
    const binanceTf = timeframeMap[tf] || "1h";
    const url = `https://api.binance.com/api/v3/klines?symbol=${s}&interval=${binanceTf}&limit=${limit}`;
    
    const r = await fetchJSON(url);
    if (!r || !Array.isArray(r)) {
      console.warn(`No data for ${symbol} ${tf} from Binance`);
      return [];
    }
    
    return r.map(x => ({ 
      t: x[0], 
      o: parseFloat(x[1]), 
      h: parseFloat(x[2]), 
      l: parseFloat(x[3]), 
      c: parseFloat(x[4]), 
      v: parseFloat(x[5]),
      bullish: parseFloat(x[4]) > parseFloat(x[1])
    })).sort((a, b) => a.t - b.t);
  } catch (e) { 
    console.error(`Candle fetch error for ${symbol} ${tf}:`, e.message);
    return []; 
  }
}

/* ================= INSTITUTIONAL INDICATORS ================= */
const ATR = (c, p = 14) => {
  if (c.length < p + 1) return 0;
  const tr = [];
  for (let i = 1; i < c.length; i++) {
    tr.push(Math.max(
      c[i].h - c[i].l,
      Math.abs(c[i].h - c[i - 1].c),
      Math.abs(c[i].l - c[i - 1].c)
    ));
  }
  return mean(tr.slice(-p));
};

const ATR_Z = c => {
  const a = [];
  for (let i = 30; i < c.length; i++) {
    a.push(ATR(c.slice(0, i)));
  }
  if (a.length < 2) return 0;
  const stdev = std(a);
  return stdev ? ((a[a.length - 1] - mean(a)) / stdev) * 100 : 0;
};

const ParkinsonVol = c => {
  if (c.length === 0) return 0;
  const sum = c.reduce((acc, x) => acc + Math.pow(Math.log(x.h / x.l), 2), 0);
  return Math.sqrt(sum / c.length / (4 * Math.log(2)));
};

const EWMA = (c, l = 0.94) => {
  if (c.length < 2) return 0;
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
  if (c.length < 2) return 0;
  return c.slice(1).reduce((d, x, i) => d + (x.c > c[i].c ? x.v : -x.v), 0);
};

const Absorption = c => {
  const delta = VolumeDelta(c);
  const avgVol = mean(c.map(x => x.v));
  return Math.abs(delta) > avgVol * 3;
};

const LiquidityVoid = c => {
  if (c.length < 20) return false;
  const currentRange = c[c.length - 1].h - c[c.length - 1].l;
  const avgRange = mean(c.slice(-20).map(x => x.h - x.l));
  return currentRange > avgRange * 2;
};

const StopHuntProb = c => {
  if (c.length < 20) return 0;
  const atrVal = ATR(c);
  if (atrVal === 0) return 0;
  return Math.min(1, Math.abs(c[c.length - 1].c - c[c.length - 20].c) / atrVal);
};

const IcebergProxy = c => {
  if (c.length < 20) return false;
  const lastVol = c[c.length - 1].v;
  const avgVol = mean(c.slice(-20).map(x => x.v));
  return lastVol > avgVol * 4;
};

const BOS = c => {
  if (c.length < 20) return false;
  const recentHighs = c.slice(-20, -1).map(x => x.h);
  const recentLows = c.slice(-20, -1).map(x => x.l);
  const last = c[c.length - 1];
  return last.h > Math.max(...recentHighs) || last.l < Math.min(...recentLows);
};

const CHoCH = c => {
  if (c.length < 3) return false;
  const c1 = c[c.length - 3];
  const c2 = c[c.length - 2];
  const c3 = c[c.length - 1];
  return (c3.c > c2.h && c2.c < c1.l) || (c3.c < c2.l && c2.c > c1.h);
};

const PremiumDiscount = c => {
  if (c.length === 0) return "NEUTRAL";
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
  if (c.length < 20) return "NEUTRAL";
  const priceChange = Math.abs(c[c.length - 1].c - c[c.length - 20].c);
  const atrValue = ATR(c);
  return priceChange < atrValue ? "ACCEPTED" : "REJECTED";
};

const SpreadEfficiency = c => {
  if (c.length === 0) return 0;
  const last = c[c.length - 1];
  const atrValue = ATR(c);
  return atrValue ? (last.h - last.l) / atrValue : 0;
};

const RelativeVolume = c => {
  if (c.length < 20) return 1;
  const lastVol = c[c.length - 1].v;
  const avgVol = mean(c.slice(-20).map(x => x.v));
  return avgVol ? lastVol / avgVol : 1;
};

const Hurst = c => {
  if (c.length < 10) return 0.5;
  let s = 0, r = 0;
  const prices = c.map(x => x.c);
  const m = mean(prices);
  
  for (const price of prices) {
    s += price - m;
    r = Math.max(r, Math.abs(s));
  }
  
  const stdev = std(prices);
  return stdev ? Math.log(r / stdev) / Math.log(c.length) : 0.5;
};

const FractalDimension = c => {
  const h = Hurst(c);
  return 2 - h;
};

const TimeSymmetry = c => {
  if (c.length < 10) return 0;
  const slice = c.slice(-10);
  const diffs = slice.map((x, i) => {
    if (i === 0) return 0;
    return x.c - slice[i - 1].c;
  });
  return mean(diffs.slice(1));
};

const priceRejection = c => {
  if (c.length < 1) return 0;
  const last = c[c.length - 1];
  const upper = last.h - last.c;
  const lower = last.c - last.l;
  const total = last.h - last.l;
  return total ? Math.min(upper, lower) / total : 0;
};

const momentum = c => {
  if (c.length < 5) return 0;
  const returns = [];
  for (let i = 1; i < c.length; i++) {
    returns.push((c[i].c - c[i-1].c) / c[i-1].c);
  }
  return mean(returns.slice(-5)) * 100;
};

/* ================= RISK MANAGEMENT ENGINE ================= */
function calculateRiskParameters(entry, direction, atr, quality, timeframe, volatility) {
  const tfMultipliers = {
    "5m": 1.0, "15m": 1.2, "30m": 1.4,
    "1h": 1.6, "2h": 1.8, "4h": 2.0,
    "1d": 2.5, "2d": 2.8, "1w": 3.2, "1M": 4.0
  };
  
  const qualityMultiplier = clamp(quality / 100, 0.5, 1.5);
  const volMultiplier = volatility === "HIGH" || volatility === "VERY_HIGH" ? 1.2 : 1.0;
  const baseMultiplier = tfMultipliers[timeframe] || 2.0;
  const adjustedATR = atr * baseMultiplier * qualityMultiplier * volMultiplier;
  
  if (direction === "BUY") {
    const stopLoss = entry - (adjustedATR * 1.0);
    const takeProfit1 = entry + (adjustedATR * DEFAULT_RISK_REWARD);
    const takeProfit2 = entry + (adjustedATR * (DEFAULT_RISK_REWARD * 1.5));
    const takeProfit3 = entry + (adjustedATR * (DEFAULT_RISK_REWARD * 2.0));
    
    return {
      stopLoss: Math.max(0, stopLoss),
      takeProfits: [takeProfit1, takeProfit2, takeProfit3],
      riskPerUnit: Math.abs(entry - stopLoss),
      rewardRatios: [DEFAULT_RISK_REWARD, DEFAULT_RISK_REWARD * 1.5, DEFAULT_RISK_REWARD * 2.0],
      atrMultiple: baseMultiplier
    };
  } else {
    const stopLoss = entry + (adjustedATR * 1.0);
    const takeProfit1 = entry - (adjustedATR * DEFAULT_RISK_REWARD);
    const takeProfit2 = entry - (adjustedATR * (DEFAULT_RISK_REWARD * 1.5));
    const takeProfit3 = entry - (adjustedATR * (DEFAULT_RISK_REWARD * 2.0));
    
    return {
      stopLoss: stopLoss,
      takeProfits: [takeProfit1, takeProfit2, takeProfit3],
      riskPerUnit: Math.abs(stopLoss - entry),
      rewardRatios: [DEFAULT_RISK_REWARD, DEFAULT_RISK_REWARD * 1.5, DEFAULT_RISK_REWARD * 2.0],
      atrMultiple: baseMultiplier
    };
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
    if (!btc.length || !s.length || btc.length < 20 || s.length < 20) return 0;
    
    const minLength = Math.min(btc.length, s.length, 20);
    const btcClose = btc.slice(-minLength).map(x => x.c);
    const sClose = s.slice(-minLength).map(x => x.c);
    
    const btcMean = mean(btcClose);
    const sMean = mean(sClose);
    
    let covariance = 0;
    let btcVariance = 0;
    let sVariance = 0;
    
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
  if (c.length < 50) return { support: [], resistance: [], currentPrice: 0, inSupportZone: false, inResistanceZone: false };
  
  const highs = c.map(x => x.h);
  const lows = c.map(x => x.l);
  
  const swingHighs = [];
  const swingLows = [];
  
  for (let i = 2; i < c.length - 2; i++) {
    if (highs[i] > highs[i-1] && highs[i] > highs[i-2] && 
        highs[i] > highs[i+1] && highs[i] > highs[i+2]) {
      swingHighs.push(highs[i]);
    }
    if (lows[i] < lows[i-1] && lows[i] < lows[i-2] && 
        lows[i] < lows[i+1] && lows[i] < lows[i+2]) {
      swingLows.push(lows[i]);
    }
  }
  
  const clusterLevels = (values, tolerance = 0.01) => {
    const sorted = [...values].sort((a, b) => b - a);
    const clusters = [];
    
    for (const value of sorted) {
      let foundCluster = false;
      for (const cluster of clusters) {
        if (Math.abs(value - cluster.mean) / cluster.mean < tolerance) {
          cluster.values.push(value);
          cluster.mean = mean(cluster.values);
          foundCluster = true;
          break;
        }
      }
      if (!foundCluster) {
        clusters.push({ values: [value], mean: value, strength: 1 });
      }
    }
    
    clusters.forEach(cluster => {
      cluster.strength = cluster.values.length;
    });
    
    return clusters
      .sort((a, b) => b.strength - a.strength)
      .slice(0, levels)
      .map(cluster => ({
        price: cluster.mean,
        strength: cluster.strength,
        type: 'support'
      }));
  };
  
  const supportLevels = clusterLevels(swingLows, 0.015);
  const resistanceLevels = clusterLevels(swingHighs, 0.015);
  const currentPrice = c[c.length - 1].c;
  
  return {
    support: supportLevels,
    resistance: resistanceLevels,
    currentPrice: currentPrice,
    inSupportZone: supportLevels.some(s => Math.abs(s.price - currentPrice) / s.price < 0.02),
    inResistanceZone: resistanceLevels.some(r => Math.abs(r.price - currentPrice) / r.price < 0.02)
  };
}

/* ================= CANDLE PATTERN RECOGNITION ================= */
function candlePattern(c) {
  if (c.length < 3) return { pattern: "NONE", confidence: 0 };
  
  const c1 = c[c.length - 3];
  const c2 = c[c.length - 2];
  const c3 = c[c.length - 1];
  const results = [];
  
  // Bullish Engulfing
  if (c2.bullish && c2.o < c1.c && c2.c > c1.o && !c1.bullish) {
    results.push({ pattern: "BULLISH_ENGULFING", confidence: 0.8 });
  }
  
  // Bearish Engulfing
  if (!c2.bullish && c2.o > c1.c && c2.c < c1.o && c1.bullish) {
    results.push({ pattern: "BEARISH_ENGULFING", confidence: 0.8 });
  }
  
  // Hammer
  if (c3.bullish) {
    const body = c3.c - c3.o;
    const upperShadow = c3.h - c3.c;
    const lowerShadow = c3.o - c3.l;
    const totalRange = c3.h - c3.l;
    
    if (body < totalRange * 0.3 && lowerShadow > body * 2 && upperShadow < body * 0.5) {
      results.push({ pattern: "HAMMER", confidence: 0.7 });
    }
  }
  
  // Shooting Star
  if (!c3.bullish) {
    const body = c3.o - c3.c;
    const upperShadow = c3.h - c3.o;
    const lowerShadow = c3.c - c3.l;
    const totalRange = c3.h - c3.l;
    
    if (body < totalRange * 0.3 && upperShadow > body * 2 && lowerShadow < body * 0.5) {
      results.push({ pattern: "SHOOTING_STAR", confidence: 0.7 });
    }
  }
  
  // Doji
  if (Math.abs(c3.c - c3.o) < (c3.h - c3.l) * 0.1) {
    results.push({ pattern: "DOJI", confidence: 0.6 });
  }
  
  if (results.length === 0) {
    return { pattern: "NONE", confidence: 0 };
  }
  
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

async function extractPipeline(symbol, tf = "1h") {
  try {
    const c = await candles(symbol, tf, tf.includes("m") ? 500 : 200);
    if (c.length < 50) return;
    
    const sr = supportResistance(c);
    const pattern = candlePattern(c);
    const atrVal = ATR(c);
    const atrZVal = ATR_Z(c);
    
    const strategy = {
      symbol, 
      tf,
      timestamp: Date.now(),
      price: c[c.length - 1].c,
      volume: c[c.length - 1].v,
      atr: atrVal,
      atrZ: atrZVal,
      volatility: VolRegime(atrZVal),
      supportResistance: sr,
      pattern: pattern.pattern,
      patternConfidence: pattern.confidence,
      bos: BOS(c),
      choch: CHoCH(c),
      premiumDiscount: PremiumDiscount(c),
      rangeState: RangeState(c),
      spreadEfficiency: SpreadEfficiency(c),
      relativeVolume: RelativeVolume(c),
      momentum: momentum(c)
    };
    
    pipelineDatabase.strategies.push(strategy);
    pipelineDatabase.history.push(strategy);
    
    pipelineDatabase.strategies = pipelineDatabase.strategies.slice(-200);
    pipelineDatabase.history = pipelineDatabase.history.slice(-1000);
    
  } catch (error) {
    console.error(`Pipeline extraction error for ${symbol}:`, error.message);
  }
}

/* ================= MACRO ANALYSIS ================= */
async function macro2Y(symbol) {
  try {
    const c = await candles(symbol, "1w", 104); // Approx 2 years of weekly data
    
    if (!c || c.length < 50) {
      return { 
        regime: "NEUTRAL", 
        atrZ: 0, 
        trend: "SIDEWAYS", 
        strength: 0,
        price: 0 
      };
    }
    
    const prices = c.map(x => x.c);
    const atrZVal = ATR_Z(c);
    const hurstVal = Hurst(c);
    const currentPrice = c[c.length - 1].c;
    
    const sma50 = mean(prices.slice(-Math.min(50, prices.length)));
    const sma200 = prices.length >= 200 ? mean(prices.slice(-200).slice(0, 150)) : mean(prices);
    
    let trend = "SIDEWAYS";
    let strength = 0;
    
    if (currentPrice > sma50 && sma50 > sma200) {
      trend = "BULLISH";
      strength = (currentPrice - sma200) / sma200 * 100;
    } else if (currentPrice < sma50 && sma50 < sma200) {
      trend = "BEARISH";
      strength = (sma200 - currentPrice) / sma200 * 100;
    }
    
    let regime = "NEUTRAL";
    if (trend === "BULLISH" && strength > 10 && hurstVal > 0.55) regime = "STRONG_BULL";
    else if (trend === "BULLISH" && strength > 5) regime = "BULL";
    else if (trend === "BEARISH" && strength > 10 && hurstVal > 0.55) regime = "STRONG_BEAR";
    else if (trend === "BEARISH" && strength > 5) regime = "BEAR";
    else if (hurstVal < 0.45) regime = "RANGING";
    
    return {
      regime,
      atrZ: atrZVal,
      trend,
      strength: round(strength, 2),
      hurst: round(hurstVal, 3),
      fractalDimension: round(FractalDimension(c), 3),
      price: currentPrice,
      sma50,
      sma200,
      aboveSMA50: currentPrice > sma50,
      aboveSMA200: currentPrice > sma200
    };
    
  } catch (error) {
    console.error(`Macro analysis error for ${symbol}:`, error.message);
    return { 
      regime: "NEUTRAL", 
      atrZ: 0, 
      trend: "SIDEWAYS", 
      strength: 0,
      price: 0 
    };
  }
}

/* ================= EXECUTION GATES ================= */
function htfGate(macro, ltfDirection) {
  if (!macro) return { passed: true, reason: "No macro data", warning: false };
  
  const { regime } = macro;
  
  if (regime.includes("BULL") && ltfDirection === "SELL") {
    return { passed: false, reason: "HTF Bullish but LTF Sell" };
  }
  
  if (regime.includes("BEAR") && ltfDirection === "BUY") {
    return { passed: false, reason: "HTF Bearish but LTF Buy" };
  }
  
  if (regime === "RANGING") {
    return { passed: true, reason: "Range market - caution advised", warning: true };
  }
  
  return { passed: true, reason: "HTF/LTF alignment OK", warning: false };
}

function atrConfirm(entry, currentPrice, atr, direction, factor = 0.2) {
  if (!atr || atr <= 0) {
    return { passed: false, reason: "Invalid ATR value" };
  }
  
  const move = Math.abs(currentPrice - entry);
  const requiredMove = atr * factor;
  
  if (move < requiredMove) {
    return { 
      passed: false, 
      reason: `Insufficient movement: ${round(move, 4)} < ${round(requiredMove, 4)}` 
    };
  }
  
  if (direction === "BUY" && currentPrice < entry) {
    return { passed: false, reason: "Buy signal but price below entry" };
  }
  
  if (direction === "SELL" && currentPrice > entry) {
    return { passed: false, reason: "Sell signal but price above entry" };
  }
  
  return { 
    passed: true, 
    reason: `Movement sufficient: ${round(move, 4)} >= ${round(requiredMove, 4)}`,
    movementRatio: move / requiredMove
  };
}

/* ================= ENHANCED AI DECISION ENGINE ================= */
async function AIDecisionEnhanced(symbol, tf, accountBalance = ACCOUNT_BALANCE) {
  const startTime = Date.now();
  
  try {
    const c = await candles(symbol, tf, tf.includes("m") ? 500 : 200);
    if (!c.length || c.length < 30) {
      return { 
        success: false,
        direction: null, 
        quality: 0, 
        gate: "INSUFFICIENT_DATA", 
        message: `Only ${c.length} candles available (min: 30)`,
        processingTime: Date.now() - startTime
      };
    }

    const entry = c[c.length - 1].c;
    updateTick(symbol, entry);

    const candleDir = candleBias(c);
    const tickDir = tickBias(symbol);
    const atrVal = ATR(c);
    const atrZVal = ATR_Z(c);
    const volRegime = VolRegime(atrZVal);
    const bos = BOS(c);
    const choch = CHoCH(c);
    const liq = LiquidityVoid(c);
    const absorption = Absorption(c);
    const rejection = priceRejection(c);
    const sr = supportResistance(c, 3);
    const premium = PremiumDiscount(c);
    const rangeState = RangeState(c);
    const relVol = RelativeVolume(c);
    const ts = TimeSymmetry(c);
    const pattern = candlePattern(c);
    const mom = momentum(c);
    const volatility = ParkinsonVol(c);

    const btcDom = await BTCDominance();
    const riskMode = await RiskOnOff();
    const macro = await macro2Y(symbol);
    const correlation = await CorrelationFilter(symbol);
    
    const candleDirection = candleDir.includes("BUY") ? "BUY" : "SELL";
    const htfGateResult = htfGate(macro, candleDirection);
    const sess = sessionBias();
    const atrConfirmResult = atrConfirm(entry, entry, atrVal, candleDirection, 0.15);

    let alignmentScore = 0;
    const scores = [];

    if (macro.regime.includes("BULL") && candleDir.includes("BUY")) {
      alignmentScore += 20;
      scores.push({ component: "Macro Bull/Buy", points: 20 });
    } else if (macro.regime.includes("BEAR") && candleDir.includes("SELL")) {
      alignmentScore += 20;
      scores.push({ component: "Macro Bear/Sell", points: 20 });
    } else if (macro.regime === "NEUTRAL") {
      alignmentScore += 10;
      scores.push({ component: "Neutral Macro", points: 10 });
    }

    if (volRegime !== "LOW" && volRegime !== "VERY_LOW") {
      alignmentScore += 15;
      scores.push({ component: "Good Volatility", points: 15 });
    }

    if (bos || choch) {
      alignmentScore += 15;
      scores.push({ component: "Structure Break", points: 15 });
    }

    if (absorption || liq) {
      alignmentScore += 10;
      scores.push({ component: "Volume Signal", points: 10 });
    }

    if ((premium.includes("DISCOUNT") && candleDir.includes("BUY")) || 
        (premium.includes("PREMIUM") && candleDir.includes("SELL"))) {
      alignmentScore += 10;
      scores.push({ component: "Good Value", points: 10 });
    }

    if (htfGateResult.passed && !htfGateResult.warning) {
      alignmentScore += 10;
      scores.push({ component: "HTF Alignment", points: 10 });
    }

    if (sess.weight > 1) {
      alignmentScore += 10;
      scores.push({ component: "Strong Session", points: 10 });
    }

    if (Math.abs(correlation) > 0.5) {
      alignmentScore += 5;
      scores.push({ component: "Good Correlation", points: 5 });
    }

    if (pattern.confidence > 0.7) {
      alignmentScore += 5;
      scores.push({ component: "Strong Pattern", points: 5 });
    }

    const aligned = alignmentScore >= 60;

    if (!aligned) {
      pipelineDatabase.misalignment.push({
        symbol, tf, timestamp: Date.now(),
        alignmentScore, entry, candleDir, scores,
        indicators: { atrZ: atrZVal, bos, choch, liq, absorption, rejection }
      });
      pipelineDatabase.misalignment = pipelineDatabase.misalignment.slice(-200);
    }

    const gateResults = [];
    
    if (!aligned) {
      gateResults.push({ gate: "MISALIGNMENT", passed: false, reason: `Score: ${alignmentScore}/100` });
    }
    
    if (tickDir !== "NEUTRAL" && !tickDir.includes(candleDir.includes("BUY") ? "BUY" : "SELL")) {
      gateResults.push({ gate: "TICK_MISMATCH", passed: false, reason: `Tick: ${tickDir}, Candle: ${candleDir}` });
    }
    
    if (!atrConfirmResult.passed) {
      gateResults.push({ gate: "ATR_INSUFFICIENT", passed: false, reason: atrConfirmResult.reason });
    }
    
    if (riskMode === "RISK_OFF" && !tf.includes("d") && !tf.includes("w")) {
      gateResults.push({ gate: "RISK_OFF", passed: false, reason: "Risk-off mode active" });
    }
    
    if (gateResults.some(g => !g.passed)) {
      return {
        success: false,
        direction: null,
        quality: 0,
        gate: gateResults.find(g => !g.passed)?.gate || "UNKNOWN",
        message: gateResults.find(g => !g.passed)?.reason || "Gate check failed",
        alignmentScore,
        processingTime: Date.now() - startTime,
        gateResults
      };
    }

    let qualityScore = 0;
    const qualityComponents = [];

    const atrZContribution = Math.min(25, Math.abs(atrZVal) * 0.5);
    qualityScore += atrZContribution;
    qualityComponents.push({ component: "ATR Z-Score", value: atrZContribution });

    const structureContribution = (bos ? 10 : 0) + (choch ? 10 : 0);
    qualityScore += structureContribution;
    qualityComponents.push({ component: "Structure", value: structureContribution });

    const volumeContribution = (absorption ? 5 : 0) + (liq ? 5 : 0) + Math.min(5, (relVol - 1) * 10);
    qualityScore += volumeContribution;
    qualityComponents.push({ component: "Volume", value: volumeContribution });

    const priceActionContribution = Math.min(10, (1 - rejection) * 10) + (pattern.confidence * 5);
    qualityScore += priceActionContribution;
    qualityComponents.push({ component: "Price Action", value: priceActionContribution });

    const momentumContribution = Math.min(10, Math.abs(mom) * 0.5);
    qualityScore += momentumContribution;
    qualityComponents.push({ component: "Momentum", value: momentumContribution });

    qualityScore *= sess.weight;
    qualityComponents.push({ component: `Session (${sess.name})`, value: `x${sess.weight.toFixed(2)}` });

    if (macro.regime.includes("STRONG")) {
      qualityScore *= 1.1;
      qualityComponents.push({ component: "Strong Regime", value: "x1.10" });
    }

    qualityScore = clamp(qualityScore, 0, 100);

    let direction = candleDir.includes("BUY") ? "BUY" : "SELL";
    
    if (macro.regime.includes("BULL") && direction === "SELL") {
      direction = "BUY";
      qualityComponents.push({ component: "Macro Override", value: "Bull → Buy" });
    }
    
    if (macro.regime.includes("BEAR") && direction === "BUY") {
      direction = "SELL";
      qualityComponents.push({ component: "Macro Override", value: "Bear → Sell" });
    }

    if (btcDom > 60 && direction === "BUY") {
      direction = "SELL";
      qualityComponents.push({ component: "BTC Dominance", value: "High → Sell" });
    }
    
    if (btcDom < 40 && direction === "SELL") {
      direction = "BUY";
      qualityComponents.push({ component: "BTC Dominance", value: "Low → Buy" });
    }

    if (rangeState === "ACCEPTED" && qualityScore < 60) {
      return {
        success: false,
        direction: null,
        quality: qualityScore,
        gate: "RANGE_MARKET",
        message: "Range market with insufficient quality",
        alignmentScore,
        processingTime: Date.now() - startTime,
        qualityComponents
      };
    }

    const riskParams = calculateRiskParameters(
      entry, 
      direction, 
      atrVal, 
      qualityScore, 
      tf,
      volRegime
    );
    
    const positionSize = calculatePositionSize(entry, riskParams.stopLoss, accountBalance);
    const riskAmount = riskParams.riskPerUnit * positionSize;
    const riskPercent = (riskAmount / accountBalance) * 100;
    const potentialProfit = Math.abs(riskParams.takeProfits[0] - entry) * positionSize;
    const profitRiskRatio = potentialProfit / riskAmount;

    const signal = {
      success: true,
      symbol,
      timeframe: tf,
      direction,
      quality: round(qualityScore, 1),
      alignmentScore: round(alignmentScore, 1),
      entry: round(entry, 4),
      atr: round(atrVal, 4),
      atrPercent: round((atrVal / entry) * 100, 2),
      stopLoss: round(riskParams.stopLoss, 4),
      takeProfits: riskParams.takeProfits.map(tp => round(tp, 4)),
      rewardRatios: riskParams.rewardRatios.map(rr => round(rr, 2)),
      positionSize: round(positionSize, 6),
      riskAmount: round(riskAmount, 2),
      riskPercent: round(riskPercent, 2),
      potentialProfit: round(potentialProfit, 2),
      profitRiskRatio: round(profitRiskRatio, 2),
      session: sess.name,
      timestamp: Date.now(),
      processingTime: Date.now() - startTime,
      
      context: {
        btcDominance: round(btcDom, 2),
        riskMode,
        macroRegime: macro.regime,
        macroTrend: macro.trend,
        macroStrength: macro.strength,
        volatilityRegime: volRegime,
        correlation: round(correlation, 3),
        sessionLiquidity: sess.liquidity,
        sessionVolatility: sess.volatility
      },
      
      indicators: {
        bos,
        choch,
        absorption,
        liquidityVoid: liq,
        priceRejection: round(rejection, 3),
        rangeState,
        premiumDiscount: premium,
        relativeVolume: round(relVol, 2),
        momentum: round(mom, 2),
        pattern: pattern.pattern,
        patternConfidence: round(pattern.confidence, 2),
        timeSymmetry: round(ts, 4),
        supportLevels: sr.support,
        resistanceLevels: sr.resistance,
        inSupportZone: sr.inSupportZone,
        inResistanceZone: sr.inResistanceZone
      },
      
      qualityComponents,
      gateResults: gateResults.filter(g => g.passed).map(g => ({ gate: g.gate, reason: g.reason }))
    };

    SIGNAL_HISTORY.set(`${symbol}_${tf}_${Date.now()}`, signal);
    
    if (SIGNAL_HISTORY.size > 1000) {
      const keys = Array.from(SIGNAL_HISTORY.keys()).slice(0, 100);
      keys.forEach(key => SIGNAL_HISTORY.delete(key));
    }

    return signal;

  } catch (error) {
    console.error(`AI Decision error for ${symbol} ${tf}:`, error);
    return {
      success: false,
      direction: null,
      quality: 0,
      gate: "ERROR",
      message: error.message,
      processingTime: Date.now() - startTime
    };
  }
}

/* ================= TELEGRAM COMMAND HANDLER ================= */
async function handleTelegramCommand(msg) {
  const chatId = msg.chat.id;
  const text = msg.text?.trim();
  const userId = msg.from?.id;
  const username = msg.from?.username || `User${userId}`;
  
  if (!text) return;
  
  console.log(`📱 ${username}: ${text}`);
  
  const args = text.split(" ");
  const cmd = args[0].toLowerCase();
  
  const now = Date.now();
  const lastExec = LAST_EXECUTION.get(userId) || 0;
  if (now - lastExec < 2000) {
    return send(chatId, "⚠️ Please wait 2 seconds between commands.");
  }
  LAST_EXECUTION.set(userId, now);

  if (cmd === "/start" || cmd === "/help") {
    const helpMsg = `
<b>🚀 OMNI INSTITUTIONAL AI v3.0</b>
<code>Professional Trading System</code>

<b>📊 ANALYSIS COMMANDS:</b>
/analyze [SYMBOL] [TIMEFRAME] - Full analysis with TP/SL
Example: <code>/analyze BTCUSDT 4h</code>

/swing [SYMBOL] - Swing analysis (1d, 2d, 1w, 1M)
Example: <code>/swing ETHUSDT</code>

/scalp [SYMBOL] - Scalp analysis (5m, 15m, 30m, 1h, 2h, 4h)
Example: <code>/scalp SOLUSDT</code>

<b>📋 WATCHLIST COMMANDS:</b>
/watch [SYMBOL] - Add to watchlist
/unwatch [SYMBOL] - Remove from watchlist
/list - Show watchlist

<b>⚙️ SETTINGS COMMANDS:</b>
/risk [PERCENT] - Set risk % (0.1-5.0)
Example: <code>/risk 1.5</code>

<b>📈 SYSTEM COMMANDS:</b>
/pipeline - Show pipeline status
/stats - Show bot statistics
/session - Show current trading session
/dominance - Show BTC dominance

<b>💡 EXAMPLES:</b>
<code>/analyze BTCUSDT 1h</code>
<code>/swing ETHUSDT</code>
<code>/scalp BNBUSDT</code>
<code>/watch XRPUSDT</code>
<code>/risk 2.0</code>

<i>Support: BTC, ETH, BNB, SOL, XRP, ADA, etc.</i>
    `.trim();
    
    return send(chatId, helpMsg);
  }

  if (cmd === "/analyze") {
    const symbol = args[1]?.toUpperCase();
    const tf = args[2] || "1h";
    
    if (!symbol) {
      return send(chatId, 
        "❌ <b>Usage:</b> <code>/analyze SYMBOL [TIMEFRAME]</code>\n" +
        "Example: <code>/analyze BTCUSDT 4h</code>\n" +
        "Timeframes: 5m, 15m, 30m, 1h, 2h, 4h, 1d, 1w"
      );
    }
    
    await send(chatId, `🔍 <b>Analyzing ${symbol} ${tf}...</b>\n<i>This may take a few seconds...</i>`);
    
    const decision = await AIDecisionEnhanced(symbol, tf);
    
    if (decision.success) {
      const { direction, quality, entry, stopLoss, takeProfits, riskPercent, profitRiskRatio } = decision;
      const arrow = direction === "BUY" ? "🟢" : "🔴";
      const directionText = direction === "BUY" ? "STRONG BUY" : "STRONG SELL";
      
      const slDistance = round(Math.abs(entry - stopLoss) / entry * 100, 2);
      const tp1Distance = round(Math.abs(takeProfits[0] - entry) / entry * 100, 2);
      const tp2Distance = round(Math.abs(takeProfits[1] - entry) / entry * 100, 2);
      const tp3Distance = round(Math.abs(takeProfits[2] - entry) / entry * 100, 2);
      
      const signalMsg = `
<b>${arrow} ${directionText} SIGNAL</b>
<code>${symbol} • ${tf} • ${new Date().toLocaleTimeString()}</code>

<b>🎯 Signal Quality:</b> <code>${quality}%</code>
<b>📊 Alignment Score:</b> <code>${decision.alignmentScore}/100</code>

<b>💰 Entry Price:</b> <code>${entry}</code>
<b>🛑 Stop Loss:</b> <code>${stopLoss}</code> (${slDistance}%)
<b>🎯 Take Profit 1:</b> <code>${takeProfits[0]}</code> (${tp1Distance}%)
<b>🎯 Take Profit 2:</b> <code>${takeProfits[1]}</code> (${tp2Distance}%)
<b>🎯 Take Profit 3:</b> <code>${takeProfits[2]}</code> (${tp3Distance}%)

<b>⚖️ Risk/Reward Ratios:</b> 1:${decision.rewardRatios[0]}, 1:${decision.rewardRatios[1]}, 1:${decision.rewardRatios[2]}
<b>📈 Profit/Risk Ratio:</b> 1:${profitRiskRatio.toFixed(2)}

<b>📊 Position Sizing:</b>
• Size: <code>${decision.positionSize}</code> units
• Risk: <code>${decision.riskAmount} USD</code> (${riskPercent}% of account)
• Potential Profit: <code>${decision.potentialProfit} USD</code>

<b>🌐 Market Context:</b>
• BTC Dominance: <code>${decision.context.btcDominance}%</code>
• Risk Mode: ${decision.context.riskMode}
• Macro Regime: ${decision.context.macroRegime}
• Session: ${decision.session} (${decision.context.sessionLiquidity})
• Volatility: ${decision.context.volatilityRegime}

<b>📈 Key Indicators:</b>
• Break of Structure: ${decision.indicators.bos ? "✅" : "❌"}
• Change of Character: ${decision.indicators.choch ? "✅" : "❌"}
• Volume Absorption: ${decision.indicators.absorption ? "✅" : "❌"}
• Premium/Discount: ${decision.indicators.premiumDiscount}
• Relative Volume: ${decision.indicators.relativeVolume}x

<b>🏛️ Support/Resistance:</b>
${decision.indicators.supportLevels.map(s => 
  `• Support: <code>${round(s.price, 2)}</code> (Strength: ${s.strength})`
).join('\n')}
${decision.indicators.resistanceLevels.map(r => 
  `• Resistance: <code>${round(r.price, 2)}</code> (Strength: ${r.strength})`
).join('\n')}

<i>Analysis time: ${decision.processingTime}ms</i>
      `.trim();
      
      return send(chatId, signalMsg);
    } else {
      return send(chatId, 
        `❌ <b>No Signal: ${symbol} ${tf}</b>\n` +
        `<b>Gate:</b> ${decision.gate}\n` +
        `<b>Reason:</b> ${decision.message || "Market conditions not optimal"}\n` +
        `<b>Alignment Score:</b> ${decision.alignmentScore || "N/A"}/100\n` +
        `<i>Analysis time: ${decision.processingTime}ms</i>`
      );
    }
  }

  if (cmd === "/swing" || cmd === "/scalp") {
    const symbol = args[1]?.toUpperCase();
    
    if (!symbol) {
      return send(chatId, 
        `❌ <b>Usage:</b> <code>${cmd} SYMBOL</code>\n` +
        `Example: <code>${cmd} BTCUSDT</code>`
      );
    }
    
    const tfs = cmd === "/swing" ? SWING_TF : SCALP_TF;
    await send(chatId, `🔍 <b>Analyzing ${symbol} for ${cmd}...</b>`);
    
    let results = [];
    let validSignals = 0;
    
    for (const tf of tfs) {
      const decision = await AIDecisionEnhanced(symbol, tf);
      
      if (decision.success && decision.quality >= 60) {
        validSignals++;
        const arrow = decision.direction === "BUY" ? "🟢" : "🔴";
        const sl = decision.stopLoss;
        const tp1 = decision.takeProfits[0];
        const rr = decision.rewardRatios[0];
        
        results.push(
          `<b>${tf}</b> ${arrow} ${decision.direction}\n` +
          `Quality: <code>${decision.quality}%</code> | Entry: <code>${decision.entry}</code>\n` +
          `TP1: <code>${tp1}</code> (1:${rr}) | SL: <code>${sl}</code>\n`
        );
      }
      
      await sleep(500);
    }
    
    if (validSignals === 0) {
      return send(chatId, 
        `❌ <b>No valid ${cmd} signals for ${symbol}</b>\n` +
        `<i>Check shorter/longer timeframes or try another asset.</i>`
      );
    }
    
    const header = `<b>${cmd.toUpperCase()} ANALYSIS: ${symbol}</b>\n` +
                   `<code>${validSignals}/${tfs.length} timeframes show signals</code>\n\n`;
    
    return send(chatId, header + results.join("\n"));
  }

  if (cmd === "/watch") {
    const symbol = args[1]?.toUpperCase();
    
    if (!symbol) {
      return send(chatId, 
        "❌ <b>Usage:</b> <code>/watch SYMBOL</code>\n" +
        "Example: <code>/watch BTCUSDT</code>"
      );
    }
    
    WATCH.set(symbol, { tf: "1h", added: Date.now() });
    return send(chatId, `✅ <b>${symbol}</b> added to watchlist.`);
  }

  if (cmd === "/unwatch") {
    const symbol = args[1]?.toUpperCase();
    
    if (!symbol) {
      return send(chatId, 
        "❌ <b>Usage:</b> <code>/unwatch SYMBOL</code>\n" +
        "Example: <code>/unwatch BTCUSDT</code>"
      );
    }
    
    const existed = WATCH.delete(symbol);
    return send(chatId, 
      existed ? `❌ <b>${symbol}</b> removed from watchlist.` :
      `⚠️ <b>${symbol}</b> was not in watchlist.`
    );
  }

  if (cmd === "/list") {
    if (WATCH.size === 0) {
      return send(chatId, "📭 <b>Watchlist is empty.</b>");
    }
    
    const list = Array.from(WATCH.entries())
      .map(([sym, data], i) => 
        `${i+1}. <b>${sym}</b> (${data.tf}) - ${new Date(data.added).toLocaleDateString()}`
      )
      .join("\n");
    
    return send(chatId, 
      `<b>📋 Watchlist (${WATCH.size} symbols)</b>\n\n${list}`
    );
  }

  if (cmd === "/risk") {
    const riskPercent = parseFloat(args[1]);
    
    if (!riskPercent || riskPercent < 0.1 || riskPercent > 5) {
      return send(chatId, 
        "❌ <b>Usage:</b> <code>/risk PERCENT</code>\n" +
        "Example: <code>/risk 1.5</code>\n" +
        "Range: 0.1% to 5.0%\n" +
        `Current: ${ACCOUNT_RISK_PERCENT}%`
      );
    }
    
    ACCOUNT_RISK_PERCENT = riskPercent;
    return send(chatId, 
      `✅ <b>Risk per trade set to ${riskPercent}%</b>\n` +
      `<i>Position sizing adjusted accordingly.</i>`
    );
  }

  if (cmd === "/pipeline") {
    const sess = sessionBias();
    const btcDom = await BTCDominance();
    const riskMode = await RiskOnOff();
    
    const stats = `
<b>📊 PIPELINE STATUS</b>

<b>Database:</b>
• Strategies: ${pipelineDatabase.strategies.length}
• Indicators: ${pipelineDatabase.indicators.length}
• History: ${pipelineDatabase.history.length}
• Misalignments: ${pipelineDatabase.misalignment.length}
• Trades: ${pipelineDatabase.trades.length}

<b>Watchlist:</b> ${WATCH.size} symbols
<b>Session:</b> ${sess.name} (Weight: ${sess.weight.toFixed(2)})
<b>Liquidity:</b> ${sess.liquidity}
<b>Volatility:</b> ${sess.volatility}

<b>Market:</b>
• BTC Dominance: ${round(btcDom, 2)}%
• Risk Mode: ${riskMode}
• Account Risk: ${ACCOUNT_RISK_PERCENT}%
• Default R/R: 1:${DEFAULT_RISK_REWARD}

<b>Performance:</b>
• Signals Generated: ${SIGNAL_HISTORY.size}
• Last Signal: ${pipelineDatabase.history.length > 0 ? 
  new Date(pipelineDatabase.history[pipelineDatabase.history.length-1].timestamp).toLocaleTimeString() : 
  "None"}

<i>Last updated: ${new Date().toLocaleTimeString()}</i>
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
<b>🤖 BOT STATISTICS</b>

<b>Uptime:</b> ${hours}h ${minutes}m ${seconds}s
<b>Memory:</b> ${memoryUsed} MB / ${memoryTotal} MB
<b>CPU Usage:</b> ${(process.cpuUsage().user / 1000000).toFixed(2)}s
<b>Node.js:</b> ${process.version}

<b>System:</b>
• Watchlist: ${WATCH.size} symbols
• Active Users: ${LAST_EXECUTION.size}
• Commands Processed: ${Array.from(LAST_EXECUTION.values()).length}
• Pipeline Health: ${pipelineDatabase.strategies.length > 100 ? "✅ Excellent" : 
                    pipelineDatabase.strategies.length > 50 ? "⚠️ Good" : "🔴 Learning"}

<b>Trading:</b>
• Account Risk: ${ACCOUNT_RISK_PERCENT}%
• Max Position: ${MAX_POSITION_SIZE}%
• Default R/R: 1:${DEFAULT_RISK_REWARD}
• Account Balance: $${ACCOUNT_BALANCE}

<b>Session:</b> ${sessionBias().name}
<b>BTC Dominance:</b> ${(await BTCDominance()).toFixed(2)}%
<b>Risk Mode:</b> ${await RiskOnOff()}

<i>OMNI Institutional AI v3.0.0</i>
    `.trim();
    
    return send(chatId, stats);
  }

  if (cmd === "/session") {
    const sess = sessionBias();
    const now = new Date();
    const utcHours = now.getUTCHours();
    const nextSession = utcHours < 7 ? "LONDON (opens in " + (7 - utcHours) + "h)" :
                       utcHours < 13 ? "NEW_YORK (opens in " + (13 - utcHours) + "h)" :
                       utcHours < 21 ? "ASIA (opens in " + (21 - utcHours) + "h)" :
                       "LONDON (opens in " + (7 + 24 - utcHours) + "h)";
    
    const sessionMsg = `
<b>🌐 TRADING SESSIONS</b>

<b>Current Session:</b>
• Name: ${sess.name}
• Weight: ${sess.weight.toFixed(2)}x
• Liquidity: ${sess.liquidity}
• Volatility: ${sess.volatility}
• UTC Time: ${utcHours}:00

<b>Session Schedule (UTC):</b>
• ASIA: 00:00 - 07:00 (Weight: 0.9x)
• LONDON: 07:00 - 13:00 (Weight: 1.1x)
• NEW_YORK: 13:00 - 21:00 (Weight: 1.2x)
• OFF: 21:00 - 00:00 (Weight: 0.8x)

<b>Next Session:</b> ${nextSession}
<b>Local Time:</b> ${now.toLocaleTimeString()}
<b>UTC Time:</b> ${now.toUTCString().split(" ")[4]}

<i>Session weights affect signal quality scores.</i>
    `.trim();
    
    return send(chatId, sessionMsg);
  }

  if (cmd === "/dominance") {
    const btcDom = await BTCDominance();
    const riskMode = await RiskOnOff();
    
    let interpretation = "";
    if (btcDom > 60) interpretation = "🚨 <b>High Dominance:</b> Altcoin risk-off, BTC strength";
    else if (btcDom > 55) interpretation = "⚠️ <b>Elevated Dominance:</b> Caution on altcoins";
    else if (btcDom > 45) interpretation = "✅ <b>Neutral Dominance:</b> Balanced market";
    else if (btcDom > 40) interpretation = "📈 <b>Low Dominance:</b> Altcoin season potential";
    else interpretation = "🚀 <b>Very Low Dominance:</b> Strong altcoin season";
    
    const dominanceMsg = `
<b>₿ BTC DOMINANCE ANALYSIS</b>

<b>Current:</b> <code>${btcDom.toFixed(2)}%</code>
<b>Trend:</b> ${riskMode === "RISK_ON" ? "Risk-On (Alts favorable)" : 
               riskMode === "RISK_OFF" ? "Risk-Off (BTC favorable)" : "Neutral"}

${interpretation}

<b>Trading Implications:</b>
• <b>>60%:</b> Favor BTC/Large caps, reduce altcoin exposure
• <b>55-60%:</b> Caution on altcoins, selective opportunities
• <b>45-55%:</b> Balanced approach, both BTC and alts viable
• <b>40-45%:</b> Favor altcoins, increased risk appetite
• <b><40%:</b> Strong altcoin season, aggressive altcoin positions

<b>Market Context:</b>
• Risk Mode: ${riskMode}
• Session: ${sessionBias().name}
• Signal Weight: ${btcDom > 60 ? "SELL bias" : btcDom < 40 ? "BUY bias" : "Neutral"}

<i>Data source: CoinGecko API</i>
    `.trim();
    
    return send(chatId, dominanceMsg);
  }

  return send(chatId, 
    "❌ <b>Unknown command:</b> <code>" + cmd + "</code>\n" +
    "Type <code>/help</code> for available commands."
  );
}

/* ================= TELEGRAM POLLING ================= */
async function setupTelegramPolling() {
  if (!TELEGRAM_TOKEN) {
    console.warn("⚠️ TELEGRAM_TOKEN not set. Bot commands disabled.");
    console.log("💡 Set TELEGRAM_TOKEN to enable Telegram integration.");
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
            console.log(`📱 Telegram update from ${update.message.from?.username || "User"}: ${update.message.text}`);
            await handleTelegramCommand(update.message);
          }
        }
      } else if (response?.ok === false) {
        console.error("Telegram API error:", response.description);
        errorCount++;
        
        if (errorCount >= MAX_ERRORS) {
          console.error("Max Telegram errors reached. Stopping polling.");
          return;
        }
      }
    } catch (error) {
      console.error("Telegram polling error:", error.message);
      errorCount++;
      
      if (errorCount >= MAX_ERRORS) {
        console.error("Max Telegram errors reached. Stopping polling.");
        return;
      }
      
      await sleep(1000 * Math.min(60, Math.pow(2, errorCount)));
    }
    
    setTimeout(poll, 100);
  }
  
  console.log("🤖 Telegram bot polling started...");
  poll();
}

/* ================= MAIN APPLICATION ================= */
async function main() {
  console.log(`
╔══════════════════════════════════════════════════════════╗
║                OMNI INSTITUTIONAL AI v3.0                ║
║                Professional Trading System               ║
╚══════════════════════════════════════════════════════════╝
  `);
  
  console.log("📅 Date:", new Date().toLocaleString());
  console.log("⚙️ Node.js:", process.version);
  console.log("📊 Session:", sessionBias().name);
  console.log("💰 Account Risk:", ACCOUNT_RISK_PERCENT + "%");
  console.log("🎯 Default Risk/Reward:", "1:" + DEFAULT_RISK_REWARD);
  console.log("📈 Max Position Size:", MAX_POSITION_SIZE + "%");
  
  if (TELEGRAM_TOKEN) {
    await setupTelegramPolling();
  }
  
  const pipelineInterval = setInterval(async () => {
    try {
      if (WATCH.size > 0) {
        const symbols = Array.from(WATCH.keys());
        console.log(`🔄 Pipeline: Extracting data for ${symbols.length} symbols...`);
        
        for (const symbol of symbols) {
          await extractPipeline(symbol, "1h");
          await sleep(1000);
        }
      }
    } catch (error) {
      console.error("Pipeline extraction error:", error.message);
    }
  }, DAILY_PIPELINE_MS);
  
  const watchlistInterval = setInterval(async () => {
    try {
      for (const [symbol, config] of WATCH) {
        const decision = await AIDecisionEnhanced(symbol, config.tf);
        
        if (decision.success && decision.quality >= 75) {
          const { direction, quality, entry, stopLoss, takeProfits, riskPercent } = decision;
          const arrow = direction === "BUY" ? "🟢" : "🔴";
          
          console.log(`🚨 ${arrow} High-Quality Signal: ${symbol} ${config.tf} ${direction} @ ${entry}`);
          
          const alertMsg = `
<b>🚨 HIGH-CONVICTION SIGNAL</b>
<code>${symbol} • ${config.tf} • Auto-detected</code>

<b>Signal:</b> ${arrow} ${direction === "BUY" ? "STRONG BUY" : "STRONG SELL"}
<b>Quality:</b> <code>${quality}%</code>

<b>Entry:</b> <code>${entry}</code>
<b>Stop Loss:</b> <code>${stopLoss}</code>
<b>Take Profit 1:</b> <code>${takeProfits[0]}</code>

<b>Risk:</b> ${riskPercent}% of account
<b>R/R:</b> 1:${decision.rewardRatios[0].toFixed(1)}

<i>Session: ${decision.session} | ATR: ${decision.atrPercent}%</i>
          `.trim();
          
          if (TELEGRAM_CHAT_ID) {
            await send(TELEGRAM_CHAT_ID, alertMsg);
          }
        }
        
        await sleep(2000);
      }
    } catch (error) {
      console.error("Watchlist monitoring error:", error.message);
    }
  }, WATCH_INTERVAL_MS);
  
  setInterval(() => {
    const sess = sessionBias();
    console.log(`💡 System active. Session: ${sess.name}, Watchlist: ${WATCH.size} symbols`);
  }, 300000);
  
  console.log("\n✅ All systems operational. Waiting for commands...");
  console.log("💡 Type /help in Telegram for available commands.");
  console.log("🔍 Monitoring watchlist every", WATCH_INTERVAL_MS / 1000, "seconds");
  console.log("📊 Pipeline extraction every", DAILY_PIPELINE_MS / 1000, "seconds");
  
  process.on("SIGINT", () => {
    console.log("\n🛑 Received SIGINT. Shutting down gracefully...");
    
    clearInterval(pipelineInterval);
    clearInterval(watchlistInterval);
    
    console.log("📊 Final Stats:");
    console.log("• Total Strategies:", pipelineDatabase.strategies.length);
    console.log("• Watchlist Symbols:", WATCH.size);
    console.log("• Signals Generated:", SIGNAL_HISTORY.size);
    console.log("• Uptime:", process.uptime().toFixed(0), "seconds");
    
    process.exit(0);
  });
  
  process.on("SIGTERM", () => {
    console.log("\n🛑 Received SIGTERM. Shutting down...");
    process.exit(0);
  });
  
  process.on("uncaughtException", (error) => {
    console.error("❌ Uncaught Exception:", error);
    process.exit(1);
  });
  
  process.on("unhandledRejection", (reason, promise) => {
    console.error("❌ Unhandled Rejection at:", promise, "reason:", reason);
  });
}

// Start the application
main().catch(error => {
  console.error("❌ Fatal error during startup:", error);
  process.exit(1);
});
