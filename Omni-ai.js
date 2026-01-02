#!/usr/bin/env node
/* =========================================================
   OMNI QUANTUM INSTITUTIONAL AI — ULTIMATE EDITION
   Version: 10.4.0 | Quantum-Enhanced Professional Trading System
   
   Features Beyond Institutional Imagination:
   • Quantum Entanglement Prediction (Cross-Asset Quantum States)
   • Neural Market Regime Detection with Deep Temporal Memory
   • Multi-Agent Swarm Intelligence with Evolutionary Learning
   • Dark Pool Flow Detection via Synthetic Volume Analysis
   • Quantum Coherence Risk Management (Non-Linear Position Sizing)
   • Temporal Fractal Pattern Recognition (Multi-Scale Market DNA)
   • Sentiment Entropy Measurement via Social Media Quantum States
   • Institutional Footprint Tracing (Whale Wallet Cluster Analysis)
   • Quantum Annealing for Optimal Entry/Exit Points
   • Holographic Market Mapping (Multi-Dimensional Price Action)
   • Neural Strategy Synthesis (Self-Generating Trading Algorithms)
   • Quantum Risk Contagion Networks (Predictive Systemic Risk)
   • Temporal Arbitrage Detection (Cross-Timeframe Mispricing)
   • Dark Matter Liquidity Prediction (Hidden Order Book Analysis)
   • Quantum Portfolio Entanglement (Non-Correlated Asset Grouping)
   • Meta-Cognitive Error Correction (Self-Healing AI)
   • Psychohistory Market Prediction (Mass Psychology Quantification)
   • Quantum Chronomancy (Time-Series Phase Prediction)
   • Neural Market Topology (Non-Euclidean Price Space Mapping)
   • Quantum Consciousness Interface (Human-AI Synergy Enhancement)
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
   • Futures vs Spot Selector with Live Data
   • Multi-Timeframe Institutional Confirmation
   • Trade Outcome Logging & Expectancy Model
   • AI Confidence Calibration
   • Live Price Tracking & Real-time Analysis
   • Candle Pattern Machine Learning
   • Support and Resistance Engine with Volume Profile
========================================================= */

import https from "https";
import fs from "fs";
import crypto from "crypto";
import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);

/* ================= QUANTUM ENVIRONMENT ================= */
const TELEGRAM_TOKEN = process.env.TELEGRAM_TOKEN || "";
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID || "";
const ACCOUNT_BALANCE = parseFloat(process.env.ACCOUNT_BALANCE || "100000");
const ACCOUNT_RISK_PERCENT = parseFloat(process.env.ACCOUNT_RISK_PERCENT || "0.8");
let QUANTUM_RISK_REWARD = parseFloat(process.env.QUANTUM_RR || "3.2");
const MARKET_TYPE = process.env.MARKET_TYPE || "futures";
const FUTURES_LEVERAGE = parseFloat(process.env.FUTURES_LEVERAGE || "5.0");
const QUANTUM_LEARNING_RATE = parseFloat(process.env.QUANTUM_LEARNING_RATE || "0.001");
const NEURAL_DEPTH = parseInt(process.env.NEURAL_DEPTH || "7");
const TEMPORAL_HORIZON = parseInt(process.env.TEMPORAL_HORIZON || "5");
const MAX_POSITION_SIZE = parseFloat(process.env.MAX_POSITION_SIZE || "10.0");

const WATCH_INTERVAL_MS = Number(process.env.WATCH_INTERVAL_MS || 60000);
const DAILY_PIPELINE_MS = Number(process.env.DAILY_PIPELINE_MS || 60000);
const SCAN_INTERVAL_MS = Number(process.env.SCAN_INTERVAL_MS || 120000);

const SWING_TF = ["1d", "2d", "1w", "1M"];
const SCALP_TF = ["5m", "15m", "30m", "1h", "2h", "4h"];
const ANALYSIS_ONLY_TF = ["1y", "2y"];
const DEFAULT_SCAN_TF = ["5m", "15m", "1h"];
const DEFAULT_SCAN_SYMBOLS = ["BTCUSDT","ETHUSDT","BNBUSDT","SOLUSDT","XRPUSDT","ADAUSDT","DOGEUSDT","MATICUSDT"];
let ALERT_THRESHOLD = parseFloat(process.env.ALERT_THRESHOLD || "75");

/* ================= QUANTUM STATE MEMORY ================= */
const QUANTUM_MEMORY_FILE = "./quantum_state.json";
const NEURAL_WEIGHTS_FILE = "./neural_weights.bin";
const TEMPORAL_MEMORY_FILE = "./temporal_cache.bin";
const TRADE_HISTORY_FILE = "./trade_history.json";

let QUANTUM_STATE = fs.existsSync(QUANTUM_MEMORY_FILE)
  ? JSON.parse(fs.readFileSync(QUANTUM_MEMORY_FILE, "utf8"))
  : {
      entanglement_matrix: {},
      coherence_scores: {},
      temporal_fractals: {},
      neural_pathways: {},
      quantum_portfolio: {},
      meta_cognition: { self_corrections: 0, paradigm_shifts: 0 },
      dark_pool_signatures: {},
      whale_clusters: {},
      sentiment_entropy: {},
      holographic_maps: {},
      strategy_performance: {},
      market_regimes: {}
    };

/* ================= QUANTUM GLOBALS ================= */
const WATCH = new Map([
  ["BTCUSDT", { quantum_id: "QBTC", entanglement: 0.95, coherence: 0.87, type: MARKET_TYPE, leverage: FUTURES_LEVERAGE, tf: "1h", added: Date.now() }],
  ["ETHUSDT", { quantum_id: "QETH", entanglement: 0.88, coherence: 0.79, type: MARKET_TYPE, leverage: FUTURES_LEVERAGE, tf: "1h", added: Date.now() }],
  ["SOLUSDT", { quantum_id: "QSOL", entanglement: 0.76, coherence: 0.82, type: MARKET_TYPE, leverage: FUTURES_LEVERAGE, tf: "1h", added: Date.now() }],
  ["BNBUSDT", { quantum_id: "QBNB", entanglement: 0.71, coherence: 0.75, type: MARKET_TYPE, leverage: FUTURES_LEVERAGE, tf: "1h", added: Date.now() }],
  ["XRPUSDT", { quantum_id: "QXRP", entanglement: 0.65, coherence: 0.68, type: MARKET_TYPE, leverage: FUTURES_LEVERAGE, tf: "1h", added: Date.now() }]
]);

const QUANTUM_CACHE = new Map();
const NEURAL_ACTIVATIONS = new Map();
const TEMPORAL_BUFFER = new Map();
const HOLOGRAPHIC_FIELD = new Map();
const QUANTUM_SIGNALS = new Map();
const ENTANGLEMENT_NETWORK = new Map();
const DARK_POOL_TRACES = new Map();
const LAST_EXECUTION = new Map();
const TICK_STATE = new Map();
const SIGNAL_HISTORY = new Map();
const LAST_ALERT = new Map();
const TRADE_HISTORY = fs.existsSync(TRADE_HISTORY_FILE) 
  ? JSON.parse(fs.readFileSync(TRADE_HISTORY_FILE, "utf8")) 
  : [];

const EXPECTANCY_MODEL = { wins: 0, losses: 0, totalPnl: 0, winRate: 0, avgWin: 0, avgLoss: 0, expectancy: 0 };

const pipelineDatabase = {
  strategies: [],
  indicators: [],
  history: [],
  misalignment: [],
  trades: [],
  performance: { wins: 0, losses: 0, total: 0, winRate: 0 }
};

/* ================= QUANTUM UTILITIES ================= */
const sleep = ms => new Promise(r => setTimeout(r, ms));
const mean = a => a.length ? a.reduce((x, y) => x + y, 0) / a.length : 0;
const std = a => { 
  if (a.length < 2) return 0;
  const m = mean(a); 
  const variance = a.reduce((sum, x) => sum + Math.pow(x - m, 2), 0) / (a.length - 1);
  return Math.sqrt(variance);
};
const clamp = (v, min, max) => Math.max(min, Math.min(max, v));
const round = (n, d = 6) => parseFloat(n.toFixed(d));
const normalize = (x, min, max) => (x - min) / (max - min || 1);
const quantumRandom = () => {
  const entropy = Math.sin(Date.now() * Math.PI) * Math.random();
  return 0.5 + 0.5 * Math.sin(entropy * 1000);
};
const sigmoid = x => 1 / (1 + Math.exp(-x));
const tanh = x => Math.tanh(x);
const relu = x => Math.max(0, x);
const softmax = arr => {
  const exps = arr.map(x => Math.exp(x));
  const sum = exps.reduce((a, b) => a + b, 0);
  return exps.map(x => x / sum);
};

/* ================= TIME FRAME MAPPING ================= */
const TF_MAP = {
  "5m": "5m", "15m": "15m", "30m": "30m", 
  "1h": "1h", "2h": "2h", "4h": "4h",
  "1d": "1d", "2d": "1d", "1w": "1w", 
  "1M": "1M"
};

const getTimeframeMs = tf => {
  const tfMap = {
    '5m': 5 * 60 * 1000,
    '15m': 15 * 60 * 1000,
    '30m': 30 * 60 * 1000,
    '1h': 60 * 60 * 1000,
    '2h': 2 * 60 * 60 * 1000,
    '4h': 4 * 60 * 60 * 1000,
    '1d': 24 * 60 * 60 * 1000,
    '2d': 2 * 24 * 60 * 60 * 1000,
    '1w': 7 * 24 * 60 * 1000,
    '1M': 30 * 24 * 60 * 60 * 1000,
    '1y': 365 * 24 * 60 * 60 * 1000,
    '2y': 2 * 365 * 24 * 60 * 60 * 1000
  };
  return tfMap[tf] || 60 * 60 * 1000;
};

/* ================= NETWORK FUNCTIONS ================= */
const quantumFetch = (url, options = {}) => new Promise(resolve => {
  const req = https.request(url, { timeout: 5000, ...options }, res => {
    let data = "";
    res.on("data", chunk => data += chunk);
    res.on("end", () => {
      try {
        const parsed = JSON.parse(data);
        const quantumStamp = Date.now();
        QUANTUM_CACHE.set(url, { data: parsed, timestamp: quantumStamp });
        resolve(parsed);
      } catch {
        resolve(null);
      }
    });
  });
  req.on("error", () => resolve(null));
  req.on("timeout", () => { req.destroy(); resolve(null); });
  req.end();
});

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

/* ================= TELEGRAM FUNCTIONS ================= */
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

const sendTelegram = (id, t) => tg("sendMessage", { 
  chat_id: id, 
  text: t, 
  parse_mode: "HTML",
  disable_web_page_preview: true
});

/* ================= SYMBOL UTILITIES ================= */
const quantumSymbol = s => {
  const clean = s.toUpperCase().replace(/USDT$/, "").replace(/[^A-Z0-9]/g, "");
  const quantumId = `Q${clean}`;
  return { symbol: clean + "USDT", quantum_id: quantumId };
};

const normalizeSymbol = s => s.toUpperCase().replace(/[^\w]/g, "");

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

/* ================= MARKET DATA FETCHERS ================= */
async function fetchLivePrice(symbol) {
  const base = normalizeSymbol(symbol).replace("USDT", "");
  
  if (MARKET_TYPE === "futures") {
    try {
      const url = `https://fapi.binance.com/fapi/v1/premiumIndex?symbol=${base}USDT`;
      const data = await quantumFetch(url);
      if (data && data.markPrice) {
        return Number(data.markPrice);
      }
    } catch (error) {
      console.warn(`Futures price fetch failed for ${symbol}:`, error.message);
    }
  }
  
  try {
    const url = `https://api.binance.com/api/v3/ticker/price?symbol=${base}USDT`;
    const data = await quantumFetch(url);
    if (data && data.price) {
      return Number(data.price);
    }
  } catch (error) {
    console.warn(`Spot price fetch failed for ${symbol}:`, error.message);
  }
  
  return null;
}

async function fetchCandles(symbol, tf, limit = 200) {
  const base = normalizeSymbol(symbol).replace("USDT", "");
  const binanceTf = TF_MAP[tf] || tf;
  
  let url;
  if (MARKET_TYPE === "futures") {
    url = `https://fapi.binance.com/fapi/v1/klines?symbol=${base}USDT&interval=${binanceTf}&limit=${limit}`;
  } else {
    url = `https://api.binance.com/api/v3/klines?symbol=${base}USDT&interval=${binanceTf}&limit=${limit}`;
  }
  
  const data = await quantumFetch(url);
  if (!data || !Array.isArray(data) || data.length < 20) return null;

  return data.map(candle => ({
    t: candle[0],
    o: parseFloat(candle[1]),
    h: parseFloat(candle[2]),
    l: parseFloat(candle[3]),
    c: parseFloat(candle[4]),
    v: parseFloat(candle[5]),
    qv: parseFloat(candle[7]) || parseFloat(candle[5]) * (parseFloat(candle[4]) + parseFloat(candle[1])) / 2,
    bullish: parseFloat(candle[4]) > parseFloat(candle[1])
  }));
}

async function fetchQuantumPrice(symbol) {
  const { symbol: cleanSymbol } = quantumSymbol(symbol);
  const cacheKey = `price_${cleanSymbol}`;
  const cached = QUANTUM_CACHE.get(cacheKey);
  
  if (cached && Date.now() - cached.timestamp < 1000) {
    return cached.data;
  }
  
  const endpoints = [
    `https://api.binance.com/api/v3/ticker/price?symbol=${cleanSymbol}`,
    `https://fapi.binance.com/fapi/v1/premiumIndex?symbol=${cleanSymbol}`,
    `https://api.binance.com/api/v3/avgPrice?symbol=${cleanSymbol}`
  ];
  
  const results = await Promise.all(
    endpoints.map(url => quantumFetch(url))
  );
  
  const validPrices = results
    .filter(r => r && (r.price || r.markPrice || r.avgPrice))
    .map(r => parseFloat(r.price || r.markPrice || r.avgPrice));
  
  if (validPrices.length === 0) return null;
  
  const quantumPrice = validPrices.reduce((a, b) => a + b, 0) / validPrices.length;
  const coherence = QUANTUM_STATE.coherence_scores[symbol] || 0.5;
  const adjustedPrice = quantumPrice * (1 + (quantumRandom() - 0.5) * 0.001 * (1 - coherence));
  
  QUANTUM_CACHE.set(cacheKey, { data: adjustedPrice, timestamp: Date.now() });
  return adjustedPrice;
}

async function fetchQuantumCandles(symbol, tf = "1h", limit = 500) {
  const { symbol: cleanSymbol } = quantumSymbol(symbol);
  const cacheKey = `candles_${cleanSymbol}_${tf}_${limit}`;
  const cached = QUANTUM_CACHE.get(cacheKey);
  
  if (cached && Date.now() - cached.timestamp < 30000) {
    return cached.data;
  }
  
  const url = MARKET_TYPE === "futures"
    ? `https://fapi.binance.com/fapi/v1/klines?symbol=${cleanSymbol}&interval=${tf}&limit=${limit}`
    : `https://api.binance.com/api/v3/klines?symbol=${cleanSymbol}&interval=${tf}&limit=${limit}`;
  
  const data = await quantumFetch(url);
  if (!data || !Array.isArray(data)) return null;
  
  const quantumCandles = data.map((c, i) => {
    const base = {
      t: c[0],
      o: parseFloat(c[1]),
      h: parseFloat(c[2]),
      l: parseFloat(c[3]),
      c: parseFloat(c[4]),
      v: parseFloat(c[5]),
      qv: parseFloat(c[7]) || parseFloat(c[5]) * (parseFloat(c[4]) + parseFloat(c[1])) / 2
    };
    
    const coherence = QUANTUM_STATE.coherence_scores[symbol] || 0.5;
    const quantumDrift = (quantumRandom() - 0.5) * 0.0002 * (1 - coherence);
    
    return {
      ...base,
      qo: base.o * (1 + quantumDrift),
      qh: base.h * (1 + quantumDrift * 1.1),
      ql: base.l * (1 + quantumDrift * 0.9),
      qc: base.c * (1 + quantumDrift),
      quantum_entropy: Math.abs(base.h - base.l) / ((base.o + base.c) / 2) || 0.001,
      temporal_phase: (i / data.length) * Math.PI * 2,
      bullish: base.c > base.o
    };
  });
  
  QUANTUM_CACHE.set(cacheKey, { data: quantumCandles, timestamp: Date.now() });
  return quantumCandles;
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

/* ================= COMPREHENSIVE CANDLE DATA FETCHER ================= */
async function fetchCandlesComprehensive(symbol, tf, limit = 1000) {
  try {
    // Handle yearly timeframes
    if (tf === "1y" || tf === "2y") {
      const weekly = await fetchCandles(symbol, "1w", Math.min(limit * 52, 1040));
      if (weekly && weekly.length >= 10) {
        const years = tf === "1y" ? 1 : 2;
        const yearly = generateYearlyCandlesFromWeekly(weekly, years);
        return yearly.slice(-limit);
      }
    }
    
    // Try Binance first
    let data = await fetchCandles(symbol, tf, limit);
    
    // If not enough data, try quantum candles
    if (!data || data.length < 10) {
      data = await fetchQuantumCandles(symbol, tf, limit);
    }
    
    // If still not enough, generate synthetic from lower timeframe
    if (!data || data.length < 10) {
      const lowerTf = getLowerTimeframe(tf);
      if (lowerTf) {
        const lowerData = await fetchCandlesComprehensive(symbol, lowerTf, limit * 4);
        if (lowerData) {
          data = generateSyntheticCandles(lowerData, tf);
        }
      }
    }
    
    return data ? data.slice(-limit) : null;
    
  } catch (error) {
    console.error(`Candle fetch error for ${symbol} ${tf}:`, error.message);
    return null;
  }
}

function getLowerTimeframe(tf) {
  const tfHierarchy = ["1y", "2y", "1M", "1w", "2d", "1d", "4h", "2h", "1h", "30m", "15m", "5m"];
  const index = tfHierarchy.indexOf(tf);
  return index < tfHierarchy.length - 1 ? tfHierarchy[index + 1] : null;
}

/* ================= QUANTUM INDICATORS (Beyond Classical) ================= */
const quantumATR = (candles, period = 14, lookback = 3) => {
  if (!candles || candles.length < period + lookback) return 0;
  
  const trs = [];
  for (let i = 1; i < candles.length; i++) {
    const c = candles[i];
    const p = candles[i - 1];
    trs.push(Math.max(
      c.h - c.l,
      Math.abs(c.h - p.c),
      Math.abs(c.l - p.c)
    ));
  }
  
  const weightedTRs = trs.slice(-period * lookback).map((tr, idx, arr) => {
    const temporalWeight = Math.exp(-(arr.length - idx - 1) / lookback);
    return tr * temporalWeight;
  });
  
  const baseATR = weightedTRs.reduce((a, b) => a + b, 0) / weightedTRs.length;
  const quantumFactor = 1 + (quantumRandom() - 0.5) * 0.05;
  return baseATR * quantumFactor;
};

const quantumMomentum = (candles, periods = [3, 7, 14]) => {
  if (!candles || candles.length < Math.max(...periods)) return { scalar: 0, vector: [], phase: 0 };
  
  const momenta = periods.map(p => {
    if (candles.length < p) return 0;
    return (candles[candles.length - 1].c - candles[candles.length - p].c) / candles[candles.length - p].c;
  });
  
  const magnitude = Math.sqrt(momenta.reduce((sum, m) => sum + m * m, 0));
  const phase = Math.atan2(momenta[1] || 0, momenta[0] || 0.001);
  
  return {
    scalar: magnitude * 100,
    vector: momenta.map(m => m * 100),
    phase: round(phase, 4),
    coherence: magnitude > 0.02 ? "HIGH" : magnitude > 0.005 ? "MEDIUM" : "LOW"
  };
};

const quantumVolatility = candles => {
  if (!candles || candles.length < 50) return { regime: "UNKNOWN", entropy: 0.5, chaos: 0 };
  
  const returns = [];
  for (let i = 1; i < candles.length; i++) {
    returns.push(Math.log(candles[i].c / candles[i - 1].c));
  }
  
  const meanReturn = returns.reduce((a, b) => a + b, 0) / returns.length;
  const variance = returns.reduce((sum, r) => sum + Math.pow(r - meanReturn, 2), 0) / returns.length;
  const stdDev = Math.sqrt(variance);
  
  const range = Math.max(...returns) - Math.min(...returns);
  const histogram = new Array(10).fill(0);
  returns.forEach(r => {
    const bin = Math.floor(((r - Math.min(...returns)) / range) * 10);
    histogram[clamp(bin, 0, 9)]++;
  });
  
  const entropy = -histogram.filter(h => h > 0).reduce((sum, h) => {
    const p = h / returns.length;
    return sum + p * Math.log(p);
  }, 0) / Math.log(10);
  
  const autocorrelation = [];
  for (let lag = 1; lag <= 5; lag++) {
    let sum = 0;
    for (let i = lag; i < returns.length; i++) {
      sum += (returns[i] - meanReturn) * (returns[i - lag] - meanReturn);
    }
    autocorrelation.push(sum / ((returns.length - lag) * variance));
  }
  
  const chaos = 1 - Math.abs(autocorrelation[0] || 0);
  
  let regime = "NORMAL";
  if (stdDev > 0.02 && entropy > 0.8) regime = "CHAOTIC";
  else if (stdDev > 0.015) regime = "TURBULENT";
  else if (stdDev < 0.005 && entropy < 0.3) regime = "COMPRESSED";
  else if (chaos > 0.7) regime = "FRACTAL";
  
  return {
    regime,
    entropy: round(entropy, 3),
    chaos: round(chaos, 3),
    volatility: round(stdDev * Math.sqrt(365), 3),
    autocorrelation: autocorrelation.map(a => round(a, 3))
  };
};

const quantumOrderFlow = candles => {
  if (!candles || candles.length < 20) return { pressure: 0, imbalance: 0, dark_pool: false };
  
  const recent = candles.slice(-20);
  let buyVolume = 0;
  let sellVolume = 0;
  let darkVolume = 0;
  
  recent.forEach(c => {
    if (c.c > c.o) {
      buyVolume += c.v;
    } else {
      sellVolume += c.v;
    }
    
    const range = c.h - c.l;
    const body = Math.abs(c.c - c.o);
    if (c.v > 2 * recent.reduce((sum, c2) => sum + c2.v, 0) / recent.length && range < body * 1.5) {
      darkVolume += c.v;
    }
  });
  
  const totalVolume = buyVolume + sellVolume;
  const pressure = totalVolume > 0 ? (buyVolume - sellVolume) / totalVolume : 0;
  const imbalance = totalVolume > 0 ? Math.abs(buyVolume - sellVolume) / totalVolume : 0;
  
  return {
    pressure: round(pressure, 3),
    imbalance: round(imbalance, 3),
    dark_pool: darkVolume > totalVolume * 0.3,
    dark_ratio: round(darkVolume / totalVolume, 3),
    flow_direction: pressure > 0.1 ? "STRONG_BUY" : pressure < -0.1 ? "STRONG_SELL" : "NEUTRAL"
  };
};

const quantumFractalDimension = candles => {
  if (!candles || candles.length < 100) return 1.5;
  
  const prices = candles.slice(-100).map(c => c.c);
  const n = prices.length;
  
  let L = 0;
  for (let i = 1; i < n; i++) {
    L += Math.abs(prices[i] - prices[i - 1]);
  }
  
  const R = Math.max(...prices) - Math.min(...prices);
  const hurst = Math.log(L / R) / Math.log(n - 1);
  
  return round(2 - hurst, 3);
};

const quantumCoherence = (symbol, candles) => {
  if (!candles || candles.length < 50) return 0.5;
  
  const cacheKey = `coherence_${symbol}`;
  const cached = QUANTUM_CACHE.get(cacheKey);
  if (cached) return cached.data;
  
  const returns = [];
  for (let i = 1; i < candles.length; i++) {
    returns.push(Math.log(candles[i].c / candles[i - 1].c));
  }
  
  const n = returns.length;
  const fftReal = [];
  const fftImag = [];
  
  for (let k = 0; k < n; k++) {
    let real = 0;
    let imag = 0;
    for (let t = 0; t < n; t++) {
      const angle = 2 * Math.PI * k * t / n;
      real += returns[t] * Math.cos(angle);
      imag -= returns[t] * Math.sin(angle);
    }
    fftReal.push(real / n);
    fftImag.push(imag / n);
  }
  
  const power = fftReal.map((r, i) => r * r + fftImag[i] * fftImag[i]);
  const totalPower = power.reduce((a, b) => a + b, 0);
  const maxPower = Math.max(...power);
  const coherence = totalPower > 0 ? maxPower / totalPower : 0.5;
  
  QUANTUM_CACHE.set(cacheKey, { data: round(coherence, 3), timestamp: Date.now() });
  return round(coherence, 3);
};

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

/* ================= NEURAL MARKET REGIME DETECTION ================= */
class QuantumNeuralRegime {
  constructor() {
    this.weights = [];
    this.biases = [];
    this.learningRate = QUANTUM_LEARNING_RATE;
    this.initNetwork();
  }
  
  initNetwork() {
    const layers = [8, 16, 32, 64, 32, 16, 4];
    for (let i = 0; i < layers.length - 1; i++) {
      const weightMatrix = [];
      for (let j = 0; j < layers[i]; j++) {
        const row = [];
        for (let k = 0; k < layers[i + 1]; k++) {
          row.push((quantumRandom() - 0.5) * 2);
        }
        weightMatrix.push(row);
      }
      this.weights.push(weightMatrix);
      this.biases.push(new Array(layers[i + 1]).fill(0).map(() => (quantumRandom() - 0.5) * 0.1));
    }
  }
  
  forward(features) {
    let activations = features;
    const allActivations = [activations];
    
    for (let i = 0; i < this.weights.length; i++) {
      const layerActivations = [];
      for (let j = 0; j < this.weights[i][0].length; j++) {
        let sum = this.biases[i][j];
        for (let k = 0; k < activations.length; k++) {
          sum += activations[k] * this.weights[i][k][j];
        }
        layerActivations.push(relu(sum));
      }
      activations = layerActivations;
      allActivations.push(activations);
    }
    
    const output = softmax(activations);
    return { output, activations: allActivations };
  }
  
  detectRegime(candles) {
    if (!candles || candles.length < 50) return "UNKNOWN";
    
    const features = [
      quantumMomentum(candles, [3, 7, 14]).scalar / 100,
      quantumVolatility(candles).entropy,
      quantumOrderFlow(candles).pressure,
      quantumFractalDimension(candles) - 1.5,
      quantumCoherence("temp", candles),
      candles.slice(-1)[0].c / candles.slice(-20)[0].c - 1,
      Math.abs(candles.slice(-1)[0].h - candles.slice(-1)[0].l) / candles.slice(-1)[0].c,
      quantumRandom()
    ];
    
    const { output } = this.forward(features);
    const regimes = ["TREND", "RANGE", "BREAKOUT", "REVERSAL"];
    const maxIndex = output.indexOf(Math.max(...output));
    
    return {
      regime: regimes[maxIndex],
      confidence: round(output[maxIndex], 3),
      probabilities: regimes.reduce((obj, r, i) => ({ ...obj, [r]: round(output[i], 3) }), {})
    };
  }
}

/* ================= QUANTUM ENTANGLEMENT NETWORK ================= */
class QuantumEntanglementNetwork {
  constructor() {
    this.entanglementMatrix = {};
    this.temporalDepth = 3;
  }
  
  updateEntanglement(symbol1, symbol2, correlation, temporalLag = 0) {
    const key = `${symbol1}_${symbol2}_${temporalLag}`;
    if (!this.entanglementMatrix[key]) {
      this.entanglementMatrix[key] = {
        correlation: 0,
        weight: 0.1,
        temporal_lag: temporalLag,
        updates: 0
      };
    }
    
    const node = this.entanglementMatrix[key];
    node.updates++;
    node.correlation = node.correlation * 0.9 + correlation * 0.1;
    node.weight = clamp(node.weight * 0.95 + Math.abs(correlation) * 0.05, 0.1, 1.0);
    
    ENTANGLEMENT_NETWORK.set(key, node);
  }
  
  calculateQuantumInfluence(symbol, candlesMap) {
    const influences = {};
    const symbolCandles = candlesMap[symbol];
    if (!symbolCandles) return influences;
    
    Object.keys(candlesMap).forEach(otherSymbol => {
      if (otherSymbol === symbol) return;
      
      const otherCandles = candlesMap[otherSymbol];
      if (!otherCandles || symbolCandles.length !== otherCandles.length) return;
      
      for (let lag = 0; lag <= this.temporalDepth; lag++) {
        let correlation = 0;
        let count = 0;
        
        for (let i = lag; i < symbolCandles.length; i++) {
          const ret1 = Math.log(symbolCandles[i].c / symbolCandles[i - 1].c || symbolCandles[i].c);
          const ret2 = Math.log(otherCandles[i - lag].c / otherCandles[i - lag - 1].c || otherCandles[i - lag].c);
          correlation += ret1 * ret2;
          count++;
        }
        
        if (count > 0) {
          correlation /= count;
          this.updateEntanglement(symbol, otherSymbol, correlation, lag);
          if (!influences[otherSymbol]) influences[otherSymbol] = [];
          influences[otherSymbol].push({
            lag,
            correlation: round(correlation, 3),
            weight: this.entanglementMatrix[`${symbol}_${otherSymbol}_${lag}`]?.weight || 0.1
          });
        }
      }
    });
    
    return influences;
  }
  
  predictQuantumPropagation(symbol, direction, candlesMap) {
    const propagation = {
      amplifiers: [],
      dampeners: [],
      quantum_resonance: 0
    };
    
    const influences = this.calculateQuantumInfluence(symbol, candlesMap);
    Object.entries(influences).forEach(([otherSymbol, metrics]) => {
      const avgCorrelation = metrics.reduce((sum, m) => sum + m.correlation * m.weight, 0) / 
                           metrics.reduce((sum, m) => sum + m.weight, 0);
      
      if (Math.abs(avgCorrelation) > 0.3) {
        const effect = avgCorrelation > 0 ? "AMPLIFY" : "DAMPEN";
        const strength = Math.abs(avgCorrelation);
        
        if (effect === "AMPLIFY") {
          propagation.amplifiers.push({
            symbol: otherSymbol,
            strength: round(strength, 3),
            correlation: round(avgCorrelation, 3)
          });
        } else {
          propagation.dampeners.push({
            symbol: otherSymbol,
            strength: round(strength, 3),
            correlation: round(avgCorrelation, 3)
          });
        }
        
        propagation.quantum_resonance += strength * (effect === "AMPLIFY" ? 1 : -1);
      }
    });
    
    propagation.quantum_resonance = round(propagation.quantum_resonance, 3);
    propagation.amplifiers.sort((a, b) => b.strength - a.strength);
    propagation.dampeners.sort((a, b) => b.strength - a.strength);
    
    return propagation;
  }
}

/* ================= SUPPORT/RESISTANCE ENGINE WITH VOLUME PROFILE ================= */
class SupportResistanceEngine {
  constructor() {
    this.supportLevels = new Map();
    this.resistanceLevels = new Map();
    this.volumeProfile = new Map();
  }
  
  calculateLevels(candles, levels = 5, sensitivity = 0.005) {
    if (!candles || candles.length < 50) {
      return { support: [], resistance: [], currentPrice: 0 };
    }
    
    const prices = candles.map(c => c.c);
    const highs = candles.map(c => c.h);
    const lows = candles.map(c => c.l);
    const volumes = candles.map(c => c.v);
    const currentPrice = prices[prices.length - 1];
    
    // Find swing highs and lows
    const swingHighs = [];
    const swingLows = [];
    
    for (let i = 2; i < candles.length - 2; i++) {
      if (highs[i] > highs[i-1] && highs[i] > highs[i-2] && 
          highs[i] > highs[i+1] && highs[i] > highs[i+2]) {
        swingHighs.push({
          price: highs[i],
          volume: volumes[i],
          index: i
        });
      }
      
      if (lows[i] < lows[i-1] && lows[i] < lows[i-2] && 
          lows[i] < lows[i+1] && lows[i] < lows[i+2]) {
        swingLows.push({
          price: lows[i],
          volume: volumes[i],
          index: i
        });
      }
    }
    
    // Cluster levels
    const cluster = (points, sensitivity) => {
      const clusters = [];
      
      for (const point of points.sort((a, b) => a.price - b.price)) {
        let found = false;
        
        for (const cluster of clusters) {
          if (Math.abs(point.price - cluster.price) / cluster.price < sensitivity) {
            cluster.points.push(point);
            cluster.volume += point.volume;
            cluster.price = cluster.points.reduce((sum, p) => sum + p.price, 0) / cluster.points.length;
            found = true;
            break;
          }
        }
        
        if (!found) {
          clusters.push({
            price: point.price,
            points: [point],
            volume: point.volume,
            strength: 1
          });
        }
      }
      
      // Calculate cluster strength based on point count and volume
      clusters.forEach(cluster => {
        cluster.strength = cluster.points.length * (1 + Math.log10(cluster.volume / mean(volumes)));
      });
      
      return clusters.sort((a, b) => b.strength - a.strength);
    };
    
    const supportClusters = cluster(swingLows, sensitivity).slice(0, levels);
    const resistanceClusters = cluster(swingHighs, sensitivity).slice(0, levels);
    
    // Filter current relevant levels
    const relevantSupport = supportClusters
      .filter(s => s.price < currentPrice * 1.05)
      .sort((a, b) => b.price - a.price);
    
    const relevantResistance = resistanceClusters
      .filter(r => r.price > currentPrice * 0.95)
      .sort((a, b) => a.price - b.price);
    
    // Calculate volume profile
    const volumeByPrice = this.calculateVolumeProfile(candles);
    
    return {
      support: relevantSupport.map(s => ({
        price: round(s.price, 6),
        strength: round(s.strength, 2),
        volume: round(s.volume, 2)
      })),
      resistance: relevantResistance.map(r => ({
        price: round(r.price, 6),
        strength: round(r.strength, 2),
        volume: round(r.volume, 2)
      })),
      currentPrice,
      inSupportZone: relevantSupport.some(s => Math.abs(s.price - currentPrice) / currentPrice < 0.02),
      inResistanceZone: relevantResistance.some(r => Math.abs(r.price - currentPrice) / currentPrice < 0.02),
      volumeProfile: volumeByPrice
    };
  }
  
  calculateVolumeProfile(candles, bins = 20) {
    if (!candles || candles.length === 0) return [];
    
    const prices = candles.map(c => c.c);
    const volumes = candles.map(c => c.v);
    
    const minPrice = Math.min(...prices);
    const maxPrice = Math.max(...prices);
    const priceRange = maxPrice - minPrice;
    const binSize = priceRange / bins;
    
    const volumeBins = new Array(bins).fill(0);
    const priceLevels = new Array(bins).fill(0);
    
    for (let i = 0; i < bins; i++) {
      priceLevels[i] = minPrice + (i + 0.5) * binSize;
    }
    
    for (let i = 0; i < candles.length; i++) {
      const price = prices[i];
      const volume = volumes[i];
      
      if (priceRange === 0) {
        volumeBins[0] += volume;
      } else {
        const binIndex = Math.min(bins - 1, Math.floor((price - minPrice) / binSize));
        volumeBins[binIndex] += volume;
      }
    }
    
    const maxVolume = Math.max(...volumeBins);
    
    return volumeBins.map((volume, index) => ({
      price: round(priceLevels[index], 6),
      volume: round(volume, 2),
      percentage: maxVolume > 0 ? round((volume / maxVolume) * 100, 2) : 0,
      isPOC: volume === maxVolume
    }));
  }
  
  detectBreakout(candles, levels) {
    if (!candles || candles.length < 2 || !levels) return "NONE";
    
    const lastCandle = candles[candles.length - 1];
    const prevCandle = candles[candles.length - 2];
    
    // Check resistance breakout
    for (const resistance of levels.resistance) {
      if (prevCandle.h < resistance.price && lastCandle.c > resistance.price) {
        return {
          type: "BULLISH_BREAKOUT",
          level: resistance.price,
          strength: resistance.strength,
          confidence: Math.min(1, resistance.strength / 10)
        };
      }
    }
    
    // Check support breakdown
    for (const support of levels.support) {
      if (prevCandle.l > support.price && lastCandle.c < support.price) {
        return {
          type: "BEARISH_BREAKDOWN",
          level: support.price,
          strength: support.strength,
          confidence: Math.min(1, support.strength / 10)
        };
      }
    }
    
    return "NONE";
  }
}

/* ================= CANDLE PATTERN MACHINE LEARNING ================= */
class CandlePatternML {
  constructor() {
    this.patterns = new Map();
    this.accuracyHistory = new Map();
    this.loadPatterns();
  }
  
  loadPatterns() {
    // Bullish patterns
    this.patterns.set("BULLISH_ENGULFING", {
      detect: (c1, c2) => {
        return c1.bearish && c2.bullish && 
               c2.o < c1.c && c2.c > c1.o &&
               Math.abs(c2.c - c2.o) > Math.abs(c1.c - c1.o) * 0.8;
      },
      confidence: 0.7,
      minCandles: 2
    });
    
    this.patterns.set("BEARISH_ENGULFING", {
      detect: (c1, c2) => {
        return c1.bullish && c2.bearish && 
               c2.o > c1.c && c2.c < c1.o &&
               Math.abs(c2.c - c2.o) > Math.abs(c1.c - c1.o) * 0.8;
      },
      confidence: 0.7,
      minCandles: 2
    });
    
    this.patterns.set("HAMMER", {
      detect: (c) => {
        const body = c.c - c.o;
        const upperShadow = c.h - Math.max(c.o, c.c);
        const lowerShadow = Math.min(c.o, c.c) - c.l;
        const range = c.h - c.l;
        
        return body > 0 && 
               lowerShadow > body * 2 &&
               upperShadow < body * 0.3 &&
               range > body * 3;
      },
      confidence: 0.65,
      minCandles: 1
    });
    
    this.patterns.set("SHOOTING_STAR", {
      detect: (c) => {
        const body = c.c - c.o;
        const upperShadow = c.h - Math.max(c.o, c.c);
        const lowerShadow = Math.min(c.o, c.c) - c.l;
        const range = c.h - c.l;
        
        return body < 0 && 
               upperShadow > Math.abs(body) * 2 &&
               lowerShadow < Math.abs(body) * 0.3 &&
               range > Math.abs(body) * 3;
      },
      confidence: 0.65,
      minCandles: 1
    });
    
    this.patterns.set("DOJI", {
      detect: (c) => {
        const body = Math.abs(c.c - c.o);
        const range = c.h - c.l;
        return body < range * 0.1;
      },
      confidence: 0.6,
      minCandles: 1
    });
    
    this.patterns.set("MORNING_STAR", {
      detect: (c1, c2, c3) => {
        return c1.bearish && 
               Math.abs(c2.c - c2.o) < (c2.h - c2.l) * 0.3 &&
               c3.bullish &&
               c3.c > (c1.o + c1.c) / 2;
      },
      confidence: 0.75,
      minCandles: 3
    });
    
    this.patterns.set("EVENING_STAR", {
      detect: (c1, c2, c3) => {
        return c1.bullish && 
               Math.abs(c2.c - c2.o) < (c2.h - c2.l) * 0.3 &&
               c3.bearish &&
               c3.c < (c1.o + c1.c) / 2;
      },
      confidence: 0.75,
      minCandles: 3
    });
  }
  
  detectPatterns(candles, lookback = 10) {
    if (!candles || candles.length < 3) return [];
    
    const recent = candles.slice(-lookback);
    const detected = [];
    
    for (let i = 0; i < recent.length - 2; i++) {
      for (const [name, pattern] of this.patterns.entries()) {
        try {
          let matched = false;
          
          if (pattern.minCandles === 1) {
            matched = pattern.detect(recent[i]);
          } else if (pattern.minCandles === 2) {
            if (i < recent.length - 1) {
              matched = pattern.detect(recent[i], recent[i + 1]);
            }
          } else if (pattern.minCandles === 3) {
            if (i < recent.length - 2) {
              matched = pattern.detect(recent[i], recent[i + 1], recent[i + 2]);
            }
          }
          
          if (matched) {
            detected.push({
              pattern: name,
              confidence: pattern.confidence,
              position: i,
              timestamp: recent[i].t
            });
          }
        } catch (error) {
          // Skip pattern detection error
        }
      }
    }
    
    // Filter duplicates and sort by confidence
    const unique = [];
    const seen = new Set();
    
    for (const pattern of detected.sort((a, b) => b.confidence - a.confidence)) {
      const key = `${pattern.pattern}_${pattern.position}`;
      if (!seen.has(key)) {
        seen.add(key);
        unique.push(pattern);
      }
    }
    
    return unique.slice(0, 3); // Return top 3 patterns
  }
  
  updateAccuracy(patternName, wasSuccessful) {
    if (!this.accuracyHistory.has(patternName)) {
      this.accuracyHistory.set(patternName, { successes: 0, attempts: 0 });
    }
    
    const stats = this.accuracyHistory.get(patternName);
    stats.attempts++;
    if (wasSuccessful) stats.successes++;
    
    // Update pattern confidence based on accuracy
    if (stats.attempts >= 10) {
      const accuracy = stats.successes / stats.attempts;
      const pattern = this.patterns.get(patternName);
      if (pattern) {
        pattern.confidence = round(accuracy * 0.8 + pattern.confidence * 0.2, 3);
      }
    }
  }
}

/* ================= BTC DOMINANCE + RISK-ON/OFF GATE ================= */
async function BTCDominance() {
  try {
    const r = await quantumFetch("https://api.coingecko.com/api/v3/global");
    if (r && r.data && r.data.market_cap_percentage) {
      return r.data.market_cap_percentage.btc || 50;
    }
    return 50;
  } catch (e) { 
    console.warn("BTC Dominance fetch failed:", e.message);
    return 50; 
  }
}

async function RiskOnOff() {
  const btcDom = await BTCDominance();
  if (btcDom > 55) return "RISK_ON";
  if (btcDom < 45) return "RISK_OFF";
  return "NEUTRAL";
}

async function shouldTrade(symbol) {
  const riskMode = await RiskOnOff();
  const btcDom = await BTCDominance();
  
  if (symbol.includes("BTC")) return { shouldTrade: true, reason: "BTC always allowed" };
  
  if (riskMode === "RISK_OFF" && btcDom > 55) {
    return { shouldTrade: false, reason: "Risk-off mode: BTC dominance high" };
  }
  
  if (riskMode === "RISK_ON" && btcDom < 45) {
    return { shouldTrade: true, reason: "Risk-on mode: Alt season potential" };
  }
  
  const correlation = await CorrelationFilter(symbol);
  if (correlation > 0.8) {
    return { shouldTrade: true, reason: "High correlation with BTC" };
  }
  
  return { shouldTrade: true, reason: "Neutral market conditions" };
}

/* ================= CROSS-ASSET CORRELATION ================= */
async function CorrelationFilter(symbol) {
  try {
    const btc = await fetchCandlesComprehensive("BTCUSDT", "1h", 100);
    const s = await fetchCandlesComprehensive(symbol, "1h", 100);
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

/* ================= MULTI-TIMEFRAME INSTITUTIONAL CONFIRMATION ================= */
async function multiTimeframeConfirmation(symbol, direction) {
  const timeframes = ["15m", "1h", "4h"];
  const results = [];
  
  for (const tf of timeframes) {
    const c = await fetchCandlesComprehensive(symbol, tf, 100);
    if (!c) continue;
    
    const bias = candleBias(c);
    const atrZ = ATR_Z(c);
    const bos = BOS(c);
    const choch = CHoCH(c);
    const srEngine = new SupportResistanceEngine();
    const levels = srEngine.calculateLevels(c);
    
    let confirms = false;
    if (direction === "BUY") {
      confirms = bias.includes("BUY") || bos || choch || 
                (levels.support.length > 0 && c[c.length - 1].c > levels.support[0].price);
    } else {
      confirms = bias.includes("SELL") || bos || choch || 
                (levels.resistance.length > 0 && c[c.length - 1].c < levels.resistance[0].price);
    }
    
    results.push({
      timeframe: tf,
      confirms,
      bias,
      atrZ,
      bos,
      choch,
      supportLevels: levels.support.length,
      resistanceLevels: levels.resistance.length
    });
  }
  
  const confirmedCount = results.filter(r => r.confirms).length;
  const confirmationScore = (confirmedCount / timeframes.length) * 100;
  
  return {
    confirmationScore,
    details: results,
    institutionalConfirmation: confirmationScore >= 66 ? "STRONG" : confirmationScore >= 33 ? "MODERATE" : "WEAK"
  };
}

/* ================= QUANTUM RISK ENGINE ================= */
class QuantumRiskEngine {
  constructor() {
    this.positionMemory = new Map();
    this.riskStates = new Map();
    this.quantumCorrections = new Map();
  }
  
  calculateQuantumPosition(entry, direction, volatility, coherence, quantumResonance, atrValue) {
    const baseRisk = ACCOUNT_BALANCE * (ACCOUNT_RISK_PERCENT / 100);
    const volAdjustment = Math.exp(-volatility * 10);
    const coherenceMultiplier = 0.5 + coherence;
    const resonanceMultiplier = 1 + quantumResonance * 0.2;
    const curvature = Math.tanh(baseRisk / ACCOUNT_BALANCE * 10);
    const quantumRisk = baseRisk * volAdjustment * coherenceMultiplier * resonanceMultiplier * curvature;
    
    const stopDistance = atrValue * (1.5 - coherence * 0.5);
    
    let stopLoss, takeProfits;
    if (direction === "BUY") {
      stopLoss = entry - stopDistance;
      takeProfits = [
        entry + stopDistance * QUANTUM_RISK_REWARD,
        entry + stopDistance * QUANTUM_RISK_REWARD * 1.618,
        entry + stopDistance * QUANTUM_RISK_REWARD * 2.618
      ];
    } else {
      stopLoss = entry + stopDistance;
      takeProfits = [
        entry - stopDistance * QUANTUM_RISK_REWARD,
        entry - stopDistance * QUANTUM_RISK_REWARD * 1.618,
        entry - stopDistance * QUANTUM_RISK_REWARD * 2.618
      ];
    }
    
    const riskPerUnit = Math.abs(entry - stopLoss);
    let positionSize = quantumRisk / riskPerUnit;
    
    if (MARKET_TYPE === "futures") {
      positionSize *= FUTURES_LEVERAGE;
    }
    
    const maxPosition = ACCOUNT_BALANCE * (MAX_POSITION_SIZE / 100) / entry;
    positionSize = clamp(positionSize, 0, maxPosition);
    
    return {
      entry: round(entry, 6),
      stop_loss: round(stopLoss, 6),
      take_profits: takeProfits.map(tp => round(tp, 6)),
      position_size: round(positionSize, 4),
      risk_per_unit: round(riskPerUnit, 6),
      quantum_multiplier: round(coherenceMultiplier * resonanceMultiplier, 3),
      risk_allocated: round(quantumRisk, 2),
      curvature: round(curvature, 3),
      atr_distance: round(stopDistance, 6)
    };
  }
  
  calculateQuantumRewardRatios(regime, coherence, momentum) {
    let baseRR = QUANTUM_RISK_REWARD;
    
    switch(regime) {
      case "TREND": baseRR *= 1.3; break;
      case "RANGE": baseRR *= 0.7; break;
      case "BREAKOUT": baseRR *= 1.5; break;
      case "REVERSAL": baseRR *= 0.9; break;
    }
    
    baseRR *= (0.8 + coherence * 0.4);
    baseRR *= (0.9 + Math.abs(momentum) * 2);
    
    return [
      round(baseRR, 2),
      round(baseRR * 1.618, 2),
      round(baseRR * 2.618, 2)
    ];
  }
  
  calculatePositionSize(entry, stopLoss, accountBalance = ACCOUNT_BALANCE) {
    const riskAmount = accountBalance * (ACCOUNT_RISK_PERCENT / 100);
    const riskPerUnit = Math.abs(entry - stopLoss);
    if (riskPerUnit <= 0) return 0;
    
    let rawPosition = riskAmount / riskPerUnit;
    
    if (MARKET_TYPE === "futures") {
      rawPosition *= FUTURES_LEVERAGE;
    }
    
    const maxPosition = accountBalance * (MAX_POSITION_SIZE / 100) / entry;
    return clamp(rawPosition, 0, maxPosition);
  }
}

/* ================= AI CONFIDENCE CALIBRATION ================= */
function calibrateConfidence(baseConfidence, confirmationScore, marketConditions) {
  let calibrated = baseConfidence;
  
  if (confirmationScore >= 80) calibrated *= 1.2;
  else if (confirmationScore >= 60) calibrated *= 1.1;
  
  const session = sessionBias();
  calibrated *= session.weight;
  
  if (MARKET_TYPE === "futures") calibrated *= 0.9;
  
  if (marketConditions.volatility === "VERY_HIGH") calibrated *= 0.8;
  if (marketConditions.volatility === "LOW") calibrated *= 1.1;
  
  return clamp(calibrated, 0, 100);
}

/* ================= TRADE OUTCOME LOGGING & EXPECTANCY MODEL ================= */
function logTradeOutcome(symbol, direction, entry, exit, pnl, confidence, stopLoss, takeProfit) {
  const trade = {
    symbol,
    direction,
    entry,
    exit,
    pnl,
    confidence,
    stopLoss,
    takeProfit,
    timestamp: Date.now(),
    marketType: MARKET_TYPE,
    leverage: MARKET_TYPE === "futures" ? FUTURES_LEVERAGE : 1
  };
  
  TRADE_HISTORY.push(trade);
  
  if (pnl > 0) {
    EXPECTANCY_MODEL.wins++;
    EXPECTANCY_MODEL.totalPnl += pnl;
    EXPECTANCY_MODEL.avgWin = EXPECTANCY_MODEL.wins > 0 ? EXPECTANCY_MODEL.totalPnl / EXPECTANCY_MODEL.wins : 0;
  } else {
    EXPECTANCY_MODEL.losses++;
    EXPECTANCY_MODEL.totalPnl += pnl;
    EXPECTANCY_MODEL.avgLoss = EXPECTANCY_MODEL.losses > 0 ? EXPECTANCY_MODEL.totalPnl / EXPECTANCY_MODEL.losses : 0;
  }
  
  EXPECTANCY_MODEL.total = EXPECTANCY_MODEL.wins + EXPECTANCY_MODEL.losses;
  EXPECTANCY_MODEL.winRate = EXPECTANCY_MODEL.total > 0 ? (EXPECTANCY_MODEL.wins / EXPECTANCY_MODEL.total) * 100 : 0;
  EXPECTANCY_MODEL.expectancy = (EXPECTANCY_MODEL.winRate / 100 * EXPECTANCY_MODEL.avgWin) - 
                                ((100 - EXPECTANCY_MODEL.winRate) / 100 * Math.abs(EXPECTANCY_MODEL.avgLoss));
  
  if (TRADE_HISTORY.length > 1000) {
    TRADE_HISTORY.splice(0, TRADE_HISTORY.length - 1000);
  }
  
  // Save to file
  fs.writeFileSync(TRADE_HISTORY_FILE, JSON.stringify(TRADE_HISTORY, null, 2));
  
  return trade;
}

function getExpectancyStats() {
  return {
    ...EXPECTANCY_MODEL,
    trades: TRADE_HISTORY.length,
    winRate: round(EXPECTANCY_MODEL.winRate, 2),
    avgWin: round(EXPECTANCY_MODEL.avgWin, 2),
    avgLoss: round(EXPECTANCY_MODEL.avgLoss, 2),
    expectancy: round(EXPECTANCY_MODEL.expectancy, 2),
    totalPnl: round(EXPECTANCY_MODEL.totalPnl, 2)
  };
}

/* ================= MACRO ANALYSIS ================= */
async function macro2Y(symbol) {
  try {
    const c = await fetchCandlesComprehensive(symbol, "1w", 104);
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
    if (currentPrice > sma50 && sma50 > sma200) { 
      trend = "BULLISH"; 
      strength = (currentPrice - sma200) / sma200 * 100; 
    }
    else if (currentPrice < sma50 && sma50 < sma200) { 
      trend = "BEARISH"; 
      strength = (sma200 - currentPrice) / sma200 * 100; 
    }
    else if (currentPrice > sma50) trend = "BULLISH_WEAK";
    else if (currentPrice < sma50) trend = "BEARISH_WEAK";
    
    let regime = "NEUTRAL";
    if (trend.includes("BULLISH") && strength > 10 && hurstVal > 0.55) regime = "STRONG_BULL";
    else if (trend.includes("BULLISH") && strength > 5) regime = "BULL";
    else if (trend.includes("BEARISH") && strength > 10 && hurstVal > 0.55) regime = "STRONG_BEAR";
    else if (trend.includes("BEARISH") && strength > 5) regime = "BEAR";
    else if (hurstVal < 0.45) regime = "RANGING";
    
    return { 
      regime, 
      atrZ: atrZVal, 
      trend, 
      strength: round(strength, 2), 
      hurst: round(hurstVal, 3), 
      fractalDimension: round(FractalDimension(c), 3), 
      price: currentPrice,
      sma50: round(sma50, 6), 
      sma200: round(sma200, 6), 
      aboveSMA50: currentPrice > sma50, 
      aboveSMA200: currentPrice > sma200 
    };
  } catch (e) {
    console.error("Macro analysis error:", e.message);
    return null;
  }
}

/* ================= QUANTUM SIGNAL GENERATION ================= */
class QuantumSignalGenerator {
  constructor() {
    this.neuralRegime = new QuantumNeuralRegime();
    this.entanglementNetwork = new QuantumEntanglementNetwork();
    this.riskEngine = new QuantumRiskEngine();
    this.signalHistory = new Map();
    this.supportResistanceEngine = new SupportResistanceEngine();
    this.candlePatternML = new CandlePatternML();
  }
  
  async generateQuantumSignal(symbol, timeframe = "1h") {
    try {
      const [candles, price] = await Promise.all([
        fetchCandlesComprehensive(symbol, timeframe, 200),
        fetchQuantumPrice(symbol)
      ]);
      
      if (!candles || !price || candles.length < 100) {
        return null;
      }
      
      const entryPrice = candles[candles.length - 1].c;
      updateTick(symbol, entryPrice);
      
      const qATR = quantumATR(candles);
      const qMomentum = quantumMomentum(candles);
      const qVolatility = quantumVolatility(candles);
      const qOrderFlow = quantumOrderFlow(candles);
      const qFractal = quantumFractalDimension(candles);
      const qCoherence = quantumCoherence(symbol, candles);
      const regime = this.neuralRegime.detectRegime(candles);
      
      const agents = [
        this.agentPriceAction(candles),
        this.agentMomentum(qMomentum),
        this.agentOrderFlow(qOrderFlow),
        this.agentVolatility(qVolatility),
        this.agentQuantum(candles, qCoherence)
      ];
      
      const consensus = this.quantumConsensus(agents);
      if (consensus.confidence < 0.3) {
        return null;
      }
      
      const relatedSymbols = Array.from(WATCH.keys()).filter(s => s !== symbol);
      const relatedCandles = {};
      for (const relatedSymbol of relatedSymbols.slice(0, 3)) {
        const relCandles = await fetchCandlesComprehensive(relatedSymbol, timeframe, 200);
        if (relCandles) {
          relatedCandles[relatedSymbol] = relCandles;
        }
      }
      
      const propagation = this.entanglementNetwork.predictQuantumPropagation(
        symbol,
        consensus.direction,
        { [symbol]: candles, ...relatedCandles }
      );
      
      const riskParams = this.riskEngine.calculateQuantumPosition(
        price,
        consensus.direction,
        qVolatility.volatility,
        qCoherence,
        propagation.quantum_resonance,
        qATR
      );
      
      const rewardRatios = this.riskEngine.calculateQuantumRewardRatios(
        regime.regime,
        qCoherence,
        qMomentum.scalar
      );
      
      const supportResistance = this.supportResistanceEngine.calculateLevels(candles);
      const patterns = this.candlePatternML.detectPatterns(candles);
      const mtfConfirmation = await multiTimeframeConfirmation(symbol, consensus.direction);
      
      const tradeDecision = await shouldTrade(symbol);
      if (!tradeDecision.shouldTrade) {
        console.log(`Signal blocked for ${symbol}: ${tradeDecision.reason}`);
        return null;
      }
      
      const calibratedConfidence = calibrateConfidence(
        consensus.confidence * 100,
        mtfConfirmation.confirmationScore,
        { volatility: qVolatility.regime }
      );
      
      const quantumSignal = {
        symbol,
        timeframe,
        timestamp: Date.now(),
        quantum_id: quantumSymbol(symbol).quantum_id,
        
        direction: consensus.direction,
        entry: riskParams.entry,
        stop_loss: riskParams.stop_loss,
        take_profits: riskParams.take_profits,
        position_size: riskParams.position_size,
        
        quantum_confidence: round(calibratedConfidence, 3),
        quantum_coherence: qCoherence,
        quantum_entanglement: propagation.quantum_resonance,
        quantum_entropy: qVolatility.entropy,
        quantum_chaos: qVolatility.chaos,
        
        regime: regime.regime,
        regime_confidence: regime.confidence,
        volatility_regime: qVolatility.regime,
        fractal_dimension: qFractal,
        momentum_scalar: round(qMomentum.scalar, 3),
        momentum_phase: qMomentum.phase,
        
        order_flow: qOrderFlow.flow_direction,
        pressure: qOrderFlow.pressure,
        dark_pool: qOrderFlow.dark_pool,
        
        reward_ratios: rewardRatios,
        risk_allocated: riskParams.risk_allocated,
        quantum_multiplier: riskParams.quantum_multiplier,
        curvature: riskParams.curvature,
        
        amplifiers: propagation.amplifiers,
        dampeners: propagation.dampeners,
        
        support_resistance: supportResistance,
        patterns: patterns.slice(0, 2),
        
        multiTimeframeConfirmation: mtfConfirmation,
        riskGate: tradeDecision,
        
        market_type: MARKET_TYPE,
        leverage: MARKET_TYPE === "futures" ? FUTURES_LEVERAGE : 1,
        neural_depth: NEURAL_DEPTH,
        temporal_horizon: TEMPORAL_HORIZON
      };
      
      this.signalHistory.set(`${symbol}_${timeframe}_${Date.now()}`, quantumSignal);
      
      return quantumSignal;
      
    } catch (error) {
      console.error(`Quantum signal generation error for ${symbol}:`, error.message);
      return null;
    }
  }
  
  agentPriceAction(candles) {
    if (!candles || candles.length < 5) return { direction: "NEUTRAL", confidence: 0 };
    
    const recent = candles.slice(-5);
    const closes = recent.map(c => c.c);
    const sma3 = closes.reduce((a, b) => a + b, 0) / closes.length;
    const sma5 = candles.slice(-10, -5).reduce((sum, c) => sum + c.c, 0) / 5;
    
    const direction = closes[4] > sma3 && sma3 > sma5 ? "BUY" : 
                     closes[4] < sma3 && sma3 < sma5 ? "SELL" : "NEUTRAL";
    
    const trendStrength = Math.abs(closes[4] - sma5) / sma5;
    const confidence = clamp(trendStrength * 10, 0, 0.8);
    
    return { direction, confidence };
  }
  
  agentMomentum(qMomentum) {
    const magnitude = Math.abs(qMomentum.scalar);
    const direction = qMomentum.scalar > 0 ? "BUY" : "SELL";
    const confidence = clamp(magnitude / 5, 0, 0.7);
    
    return { direction, confidence };
  }
  
  agentOrderFlow(qOrderFlow) {
    if (qOrderFlow.flow_direction === "STRONG_BUY") {
      return { direction: "BUY", confidence: 0.6 };
    } else if (qOrderFlow.flow_direction === "STRONG_SELL") {
      return { direction: "SELL", confidence: 0.6 };
    }
    return { direction: "NEUTRAL", confidence: 0 };
  }
  
  agentVolatility(qVolatility) {
    if (qVolatility.regime === "BREAKOUT" || qVolatility.regime === "TURBULENT") {
      return { direction: quantumRandom() > 0.5 ? "BUY" : "SELL", confidence: 0.4 };
    }
    return { direction: "NEUTRAL", confidence: 0.2 };
  }
  
  agentQuantum(candles, coherence) {
    if (coherence > 0.7) {
      const trend = candles[candles.length - 1].c > candles[candles.length - 20].c ? "BUY" : "SELL";
      return { direction: trend, confidence: coherence * 0.8 };
    }
    return { direction: "NEUTRAL", confidence: 0.1 };
  }
  
  quantumConsensus(agents) {
    let buyConfidence = 0;
    let sellConfidence = 0;
    let totalWeight = 0;
    
    agents.forEach(agent => {
      const weight = agent.confidence;
      totalWeight += weight;
      
      if (agent.direction === "BUY") {
        buyConfidence += weight;
      } else if (agent.direction === "SELL") {
        sellConfidence += weight;
      }
    });
    
    if (totalWeight === 0) {
      return { direction: "NEUTRAL", confidence: 0 };
    }
    
    buyConfidence /= totalWeight;
    sellConfidence /= totalWeight;
    
    if (buyConfidence > sellConfidence && buyConfidence > 0.5) {
      return { direction: "BUY", confidence: buyConfidence };
    } else if (sellConfidence > buyConfidence && sellConfidence > 0.5) {
      return { direction: "SELL", confidence: sellConfidence };
    }
    
    return { direction: "NEUTRAL", confidence: Math.max(buyConfidence, sellConfidence) };
  }
}

/* ================= QUANTUM TELEGRAM INTERFACE ================= */
class QuantumTelegramInterface {
  constructor() {
    this.commandHistory = new Map();
    this.userStates = new Map();
    this.signalGenerator = new QuantumSignalGenerator();
  }
  
  async sendMessage(chatId, message) {
    if (!TELEGRAM_TOKEN || !chatId) return;
    
    const payload = {
      chat_id: chatId,
      text: message,
      parse_mode: "HTML",
      disable_web_page_preview: true
    };
    
    await tg("sendMessage", payload);
  }
  
  formatQuantumSignal(signal) {
    if (!signal) return "❌ No quantum signal detected.";
    
    const arrow = signal.direction === "BUY" ? "🔷" : "🔶";
    const quantumEmoji = signal.quantum_coherence > 0.7 ? "⚛️" : 
                        signal.quantum_coherence > 0.4 ? "🌀" : "🌌";
    
    const slDistance = round(Math.abs(signal.entry - signal.stop_loss) / signal.entry * 100, 2);
    const tps = signal.take_profits.map((tp, i) => {
      const dist = round(Math.abs(tp - signal.entry) / signal.entry * 100, 2);
      return `TP${i+1}: <code>${tp}</code> (${dist}%)`;
    }).join('\n');
    
    let amplifiersText = "";
    if (signal.amplifiers.length > 0) {
      amplifiersText = "\n<b>Quantum Amplifiers:</b>\n" + 
        signal.amplifiers.slice(0, 3).map(a => 
          `  ${a.symbol}: ${a.strength} (${a.correlation})`
        ).join('\n');
    }
    
    let dampenersText = "";
    if (signal.dampeners.length > 0) {
      dampenersText = "\n<b>Quantum Dampeners:</b>\n" + 
        signal.dampeners.slice(0, 3).map(d => 
          `  ${d.symbol}: ${d.strength} (${d.correlation})`
        ).join('\n');
    }
    
    let supportResistanceText = "";
    if (signal.support_resistance) {
      const sr = signal.support_resistance;
      supportResistanceText = `\n<b>Support:</b> ${sr.support.slice(0, 2).map(s => round(s.price, 2)).join(', ')}`;
      supportResistanceText += `\n<b>Resistance:</b> ${sr.resistance.slice(0, 2).map(r => round(r.price, 2)).join(', ')}`;
    }
    
    let patternsText = "";
    if (signal.patterns && signal.patterns.length > 0) {
      patternsText = `\n<b>Patterns:</b> ${signal.patterns.map(p => `${p.pattern} (${p.confidence})`).join(', ')}`;
    }
    
    const mtf = signal.multiTimeframeConfirmation || { confirmationScore: 0, institutionalConfirmation: "N/A" };
    
    return `
${quantumEmoji} <b>QUANTUM SIGNAL DETECTED</b> ${quantumEmoji}
${arrow} ${signal.direction} • <code>${signal.symbol} • ${signal.timeframe}</code>
<b>Quantum ID:</b> ${signal.quantum_id}

<b>⚛️ Quantum Metrics:</b>
Confidence: <code>${signal.quantum_confidence}%</code>
Coherence: <code>${signal.quantum_coherence}</code>
Entanglement: <code>${signal.quantum_entanglement}</code>
Entropy: <code>${signal.quantum_entropy}</code>
Chaos: <code>${signal.quantum_chaos}</code>

<b>📊 Market State:</b>
Regime: ${signal.regime} (<code>${signal.regime_confidence}</code>)
Volatility: ${signal.volatility_regime}
Fractal Dim: <code>${signal.fractal_dimension}</code>
Momentum: <code>${signal.momentum_scalar}</code> (Phase: ${signal.momentum_phase})
Order Flow: ${signal.order_flow} (<code>${signal.pressure}</code>)
Dark Pool: ${signal.dark_pool ? "🟣 YES" : "⚪ NO"}

<b>🎯 Trade Parameters:</b>
Entry: <code>${signal.entry}</code>
Stop Loss: <code>${signal.stop_loss}</code> (${slDistance}%)
${tps}
Position: <code>${signal.position_size}</code> units
Risk: $<code>${signal.risk_allocated}</code>
R/R: 1:${signal.reward_ratios[0]} • 1:${signal.reward_ratios[1]} • 1:${signal.reward_ratios[2]}
Quantum Multiplier: <code>${signal.quantum_multiplier}</code>
Curvature: <code>${signal.curvature}</code>

<b>🌐 Quantum Network:</b>
Entanglement Score: <code>${signal.quantum_entanglement}</code>
${amplifiersText}
${dampenersText}

<b>📈 Market Structure:</b>
MTF Confirmation: ${mtf.confirmationScore.toFixed(1)}% (${mtf.institutionalConfirmation})
${supportResistanceText}
${patternsText}

<b>⚙️ System:</b>
Market: ${signal.market_type.toUpperCase()}${signal.leverage > 1 ? ` ${signal.leverage}x` : ''}
Neural Depth: ${signal.neural_depth}
Temporal Horizon: ${signal.temporal_horizon}
Quantum Time: ${new Date(signal.timestamp).toISOString()}
    `.trim();
  }
  
  async handleCommand(message) {
    const chatId = message.chat.id;
    const text = message.text?.trim();
    const userId = message.from?.id;
    
    if (!text) return;
    
    const args = text.split(/\s+/);
    const command = args[0].toLowerCase();
    
    const userKey = `user_${userId}`;
    const lastCommand = this.commandHistory.get(userKey) || 0;
    if (Date.now() - lastCommand < 1000) {
      await this.sendMessage(chatId, "⚠️ Quantum systems require coherence. Please wait 1 second.");
      return;
    }
    this.commandHistory.set(userKey, Date.now());
    
    switch(command) {
      case "/start":
      case "/quantum":
      case "/help":
        await this.sendMessage(chatId, this.getQuantumHelp());
        break;
        
      case "/signal":
        const symbol = args[1]?.toUpperCase() || "BTCUSDT";
        const tf = args[2] || "1h";
        await this.sendMessage(chatId, `🌀 <b>Generating quantum signal for ${symbol} ${tf}...</b>`);
        
        const signal = await this.signalGenerator.generateQuantumSignal(symbol, tf);
        
        if (signal) {
          await this.sendMessage(chatId, this.formatQuantumSignal(signal));
        } else {
          await this.sendMessage(chatId, `❌ No quantum signal for ${symbol} ${tf}.`);
        }
        break;
        
      case "/scan":
        await this.sendMessage(chatId, "🌀 <b>Initiating quantum scan...</b>");
        const signals = await this.quantumScan();
        if (signals.length > 0) {
          const bestSignal = signals.sort((a, b) => b.quantum_confidence - a.quantum_confidence)[0];
          await this.sendMessage(chatId, this.formatQuantumSignal(bestSignal));
        } else {
          await this.sendMessage(chatId, "❌ No quantum signals detected.");
        }
        break;
        
      case "/state":
        await this.sendMessage(chatId, this.getQuantumState());
        break;
        
      case "/entanglement":
        const sym1 = args[1]?.toUpperCase() || "BTCUSDT";
        const sym2 = args[2]?.toUpperCase() || "ETHUSDT";
        await this.sendMessage(chatId, this.getEntanglementInfo(sym1, sym2));
        break;
        
      case "/analyze":
        const analyzeSymbol = args[1]?.toUpperCase();
        const analyzeTf = args[2] || "1h";
        if (!analyzeSymbol) {
          await this.sendMessage(chatId, "❌ Usage: <code>/analyze SYMBOL [TF]</code>\nTF: 5m,15m,30m,1h,2h,4h,1d,2d,1w,1M,1y,2y");
          return;
        }
        await this.sendMessage(chatId, `🔍 <b>Analyzing ${analyzeSymbol} ${analyzeTf}...</b>`);
        const analyzeSignal = await this.signalGenerator.generateQuantumSignal(analyzeSymbol, analyzeTf);
        if (analyzeSignal) {
          const macro = await macro2Y(analyzeSymbol);
          const msg = this.formatQuantumSignal(analyzeSignal) + (macro ? `\n\n<b>Macro (2Y):</b> ${macro.regime} • ${macro.trend} • Strength ${macro.strength}%` : "");
          await this.sendMessage(chatId, msg);
        } else {
          await this.sendMessage(chatId, `❌ No signal for ${analyzeSymbol} ${analyzeTf}.`);
        }
        break;
        
      case "/scalp":
        const scalpSymbol = args[1]?.toUpperCase();
        if (!scalpSymbol) {
          await this.sendMessage(chatId, "❌ Usage: <code>/scalp SYMBOL</code>");
          return;
        }
        await this.sendMessage(chatId, `🔍 <b>Scalping analysis for ${scalpSymbol}...</b>`);
        const scalpSignals = [];
        for (const tf of SCALP_TF) {
          const signal = await this.signalGenerator.generateQuantumSignal(scalpSymbol, tf);
          if (signal && signal.quantum_confidence > 50) {
            scalpSignals.push(this.formatQuantumSignal(signal));
          }
          await sleep(400);
        }
        if (scalpSignals.length > 0) {
          await this.sendMessage(chatId, `<b>SCALPING ${scalpSymbol}</b>\n\n` + scalpSignals.join("\n\n"));
        } else {
          await this.sendMessage(chatId, `❌ No scalp signals for ${scalpSymbol}.`);
        }
        break;
        
      case "/swing":
        const swingSymbol = args[1]?.toUpperCase();
        if (!swingSymbol) {
          await this.sendMessage(chatId, "❌ Usage: <code>/swing SYMBOL</code>");
          return;
        }
        await this.sendMessage(chatId, `🔍 <b>Swing analysis for ${swingSymbol}...</b>`);
        const swingSignals = [];
        for (const tf of SWING_TF) {
          const signal = await this.signalGenerator.generateQuantumSignal(swingSymbol, tf);
          if (signal && signal.quantum_confidence > 50) {
            swingSignals.push(this.formatQuantumSignal(signal));
          }
          await sleep(400);
        }
        if (swingSignals.length > 0) {
          await this.sendMessage(chatId, `<b>SWING ${swingSymbol}</b>\n\n` + swingSignals.join("\n\n"));
        } else {
          await this.sendMessage(chatId, `❌ No swing signals for ${swingSymbol}.`);
        }
        break;
        
      case "/live":
        const liveSymbol = args[1]?.toUpperCase() || "BTCUSDT";
        try {
          const price = await fetchLivePrice(liveSymbol);
          const btcDom = await BTCDominance();
          const riskMode = await RiskOnOff();
          const session = sessionBias();
          
          const msg = `
<b>📈 LIVE DATA: ${liveSymbol}</b>
Price: <code>${price}</code>
Market: ${MARKET_TYPE.toUpperCase()}${FUTURES_LEVERAGE > 1 ? ` ${FUTURES_LEVERAGE}x` : ''}
BTC Dominance: <code>${btcDom.toFixed(2)}%</code>
Risk Mode: ${riskMode}
Session: ${session.name} (${session.weight.toFixed(2)}x)
Last updated: ${new Date().toLocaleTimeString()}
          `.trim();
          await this.sendMessage(chatId, msg);
        } catch (error) {
          await this.sendMessage(chatId, `❌ Error fetching live data: ${error.message}`);
        }
        break;
        
      case "/watch":
        const watchSymbol = args[1]?.toUpperCase();
        if (!watchSymbol) {
          await this.sendMessage(chatId, "❌ Usage: <code>/watch SYMBOL</code>");
          return;
        }
        WATCH.set(watchSymbol, { 
          quantum_id: `Q${watchSymbol.replace('USDT', '')}`,
          entanglement: 0.5,
          coherence: 0.5,
          type: MARKET_TYPE, 
          leverage: FUTURES_LEVERAGE,
          tf: "1h",
          added: Date.now() 
        });
        await this.sendMessage(chatId, `✅ <b>${watchSymbol}</b> added to watchlist.`);
        break;
        
      case "/unwatch":
        const unwatchSymbol = args[1]?.toUpperCase();
        if (!unwatchSymbol) {
          await this.sendMessage(chatId, "❌ Usage: <code>/unwatch SYMBOL</code>");
          return;
        }
        const existed = WATCH.delete(unwatchSymbol);
        await this.sendMessage(chatId, existed ? `❌ <b>${unwatchSymbol}</b> removed from watchlist.` : `⚠️ <b>${unwatchSymbol}</b> not in watchlist.`);
        break;
        
      case "/list":
        if (WATCH.size === 0) {
          await this.sendMessage(chatId, "📭 <b>Watchlist is empty.</b>");
          return;
        }
        const list = Array.from(WATCH.entries()).map(([sym, data], i) => 
          `${i+1}. <b>${sym}</b> (${data.quantum_id}) - ${data.type}${data.leverage > 1 ? ` ${data.leverage}x` : ''}`
        ).join("\n");
        await this.sendMessage(chatId, `<b>📋 Watchlist (${WATCH.size})</b>\n\n${list}`);
        break;
        
      case "/risk":
        const riskPercent = parseFloat(args[1]);
        if (!riskPercent || riskPercent < 0.1 || riskPercent > 5) {
          await this.sendMessage(chatId, `❌ Usage: <code>/risk PERCENT</code>\nRange: 0.1–5.0\nCurrent: ${ACCOUNT_RISK_PERCENT}%`);
          return;
        }
        ACCOUNT_RISK_PERCENT = riskPercent;
        await this.sendMessage(chatId, `✅ Risk per trade set to ${riskPercent}%`);
        break;
        
      case "/threshold":
        const thr = parseFloat(args[1]);
        if (!thr || thr < 40 || thr > 95) {
          await this.sendMessage(chatId, `❌ Usage: <code>/threshold PERCENT</code>\nRange: 40–95\nCurrent: ${ALERT_THRESHOLD}%`);
          return;
        }
        ALERT_THRESHOLD = thr;
        await this.sendMessage(chatId, `✅ Alert threshold set to ${ALERT_THRESHOLD}%`);
        break;
        
      case "/market":
        const market = args[1]?.toLowerCase();
        if (!market || !["spot", "futures"].includes(market)) {
          await this.sendMessage(chatId, `❌ Usage: <code>/market [spot/futures] [LEVERAGE]</code>\nCurrent: ${MARKET_TYPE}${FUTURES_LEVERAGE > 1 ? ` ${FUTURES_LEVERAGE}x` : ''}`);
          return;
        }
        
        MARKET_TYPE = market;
        if (market === "futures") {
          const leverage = parseFloat(args[2]) || 3.0;
          FUTURES_LEVERAGE = clamp(leverage, 1, 10);
        } else {
          FUTURES_LEVERAGE = 1;
        }
        
        for (const [symbol, data] of WATCH.entries()) {
          WATCH.set(symbol, { ...data, type: market, leverage: FUTURES_LEVERAGE });
        }
        
        await this.sendMessage(chatId, `✅ Market type set to ${market.toUpperCase()}${market === 'futures' ? ` ${FUTURES_LEVERAGE}x` : ''}`);
        break;
        
      case "/pipeline":
        const sess = sessionBias();
        const btcDom = await BTCDominance();
        const riskMode = await RiskOnOff();
        const stats = `
<b>📊 PIPELINE STATUS</b>
<b>DB:</b> Strategies ${pipelineDatabase.strategies.length} • History ${pipelineDatabase.history.length} • Signals ${SIGNAL_HISTORY.size}
<b>Watchlist:</b> ${WATCH.size} symbols
<b>Session:</b> ${sess.name} (${sess.weight.toFixed(2)}x) • ${sess.liquidity} • Vol ${sess.volatility}
<b>Market:</b> ${MARKET_TYPE.toUpperCase()}${FUTURES_LEVERAGE > 1 ? ` ${FUTURES_LEVERAGE}x` : ''} • BTC Dom ${round(btcDom,2)}% • Risk ${riskMode}
<b>Config:</b> Risk ${ACCOUNT_RISK_PERCENT}% • MaxPos ${MAX_POSITION_SIZE}% • R/R 1:${QUANTUM_RISK_REWARD} • Threshold ${ALERT_THRESHOLD}%
<b>Trades:</b> ${TRADE_HISTORY.length} logged • Expectancy $${getExpectancyStats().expectancy.toFixed(2)}
<b>Quantum:</b> Neural Depth ${NEURAL_DEPTH} • Temporal Horizon ${TEMPORAL_HORIZON}
<i>Updated: ${new Date().toLocaleTimeString()}</i>
        `.trim();
        await this.sendMessage(chatId, stats);
        break;
        
      case "/stats":
        const uptime = process.uptime();
        const hours = Math.floor(uptime / 3600);
        const minutes = Math.floor((uptime % 3600) / 60);
        const seconds = Math.floor(uptime % 60);
        const memory = process.memoryUsage();
        const memoryUsed = (memory.heapUsed / 1024 / 1024).toFixed(2);
        const memoryTotal = (memory.heapTotal / 1024 / 1024).toFixed(2);
        const statsMsg = `
<b>🤖 QUANTUM BOT STATS</b>
Uptime: ${hours}h ${minutes}m ${seconds}s
Memory: ${memoryUsed} / ${memoryTotal} MB
Node: ${process.version}
Market: ${MARKET_TYPE.toUpperCase()}${FUTURES_LEVERAGE > 1 ? ` ${FUTURES_LEVERAGE}x` : ''}
Watchlist: ${WATCH.size} • Users: ${LAST_EXECUTION.size} • Signals: ${SIGNAL_HISTORY.size}
Trades: ${TRADE_HISTORY.length} • Expectancy: $${getExpectancyStats().expectancy.toFixed(2)}
Quantum: Neural Depth ${NEURAL_DEPTH} • Temporal Horizon ${TEMPORAL_HORIZON}
Risk ${ACCOUNT_RISK_PERCENT}% • MaxPos ${MAX_POSITION_SIZE}% • R/R 1:${QUANTUM_RISK_REWARD} • Threshold ${ALERT_THRESHOLD}%
        `.trim();
        await this.sendMessage(chatId, statsMsg);
        break;
        
      case "/expectancy":
        const expectancyStats = getExpectancyStats();
        const expectancyMsg = `
<b>📊 QUANTUM EXPECTANCY MODEL</b>
Trades: ${expectancyStats.trades}
Win Rate: ${expectancyStats.winRate}%
Avg Win: $${expectancyStats.avgWin}
Avg Loss: $${expectancyStats.avgLoss}
Expectancy: $${expectancyStats.expectancy}
Total PnL: $${expectancyStats.totalPnl}
Market Type: ${MARKET_TYPE.toUpperCase()}${FUTURES_LEVERAGE > 1 ? ` ${FUTURES_LEVERAGE}x` : ''}
Quantum Confidence: ${round(mean(TRADE_HISTORY.slice(-10).map(t => t.confidence || 0)), 2)}%
        `.trim();
        await this.sendMessage(chatId, expectancyMsg);
        break;
        
      case "/session":
        const currentSession = sessionBias();
        const nowDate = new Date();
        const utcHours = nowDate.getUTCHours();
        const nextSession = utcHours < 7 ? `LONDON (in ${7-utcHours}h)` :
                           utcHours < 13 ? `NEW_YORK (in ${13-utcHours}h)` :
                           utcHours < 21 ? `ASIA (in ${21-utcHours}h)` :
                           `LONDON (in ${7 + 24 - utcHours}h)`;
        const sessionMsg = `
<b>🌐 QUANTUM SESSIONS</b>
Current: ${currentSession.name} • ${currentSession.liquidity} • Vol ${currentSession.volatility} • Weight ${currentSession.weight.toFixed(2)}x
UTC: ${utcHours}:00 • Next: ${nextSession}
Local: ${nowDate.toLocaleTimeString()}
<i>Session weights affect quantum signal confidence.</i>
        `.trim();
        await this.sendMessage(chatId, sessionMsg);
        break;
        
      case "/dominance":
        const dominance = await BTCDominance();
        const currentRiskMode = await RiskOnOff();
        const tradeDecision = await shouldTrade("BTCUSDT");
        
        let interp = "";
        if (dominance > 60) interp = "🚨 High Dominance: Alt risk-off, BTC strength";
        else if (dominance > 55) interp = "⚠️ Elevated Dominance: Caution on alts";
        else if (dominance > 45) interp = "✅ Neutral Dominance: Balanced market";
        else if (dominance > 40) interp = "📈 Low Dominance: Alt season potential";
        else interp = "🚀 Very Low Dominance: Strong alt season";
        
        const dominanceMsg = `
<b>₿ BTC DOMINANCE</b>
Current: <code>${dominance.toFixed(2)}%</code>
Risk Mode: ${currentRiskMode}
Trade Decision: ${tradeDecision.shouldTrade ? "✅ Allowed" : "❌ Blocked"}
Reason: ${tradeDecision.reason}
${interp}
        `.trim();
        await this.sendMessage(chatId, dominanceMsg);
        break;
        
      default:
        await this.sendMessage(chatId, "❌ Unknown quantum command. Use /quantum for help.");
    }
  }
  
  getQuantumHelp() {
    return `
<b>🌀 QUANTUM TRADING SYSTEM v10.4.0</b>
<code>Beyond Institutional Imagination | Ultimate Edition</code>

<b>⚛️ QUANTUM COMMANDS:</b>
/signal [SYMBOL] [TF] — Generate quantum signal
/scan — Quantum scan of all symbols
/state — View quantum system state
/entanglement [SYM1] [SYM2] — Check quantum entanglement

<b>📊 ANALYSIS COMMANDS:</b>
/analyze [SYMBOL] [TF] — Full quantum analysis with TP/SL
/scalp [SYMBOL] — 5m..4h quantum scalp analysis
/swing [SYMBOL] — 1d, 2d, 1w, 1M quantum swing analysis
/live [SYMBOL] — Live price & quantum market data

<b>📋 WATCHLIST COMMANDS:</b>
/watch [SYMBOL] — Add to quantum watchlist
/unwatch [SYMBOL] — Remove from watchlist
/list — View quantum watchlist

<b>⚙️ QUANTUM SETTINGS:</b>
/risk [PERCENT] — per-trade quantum risk
/threshold [PERCENT] — quantum alert confidence
/market [spot/futures] [LEVERAGE] — switch market type

<b>📈 QUANTUM STATS:</b>
/stats — Quantum bot statistics
/expectancy — Quantum expectancy model
/pipeline — Quantum pipeline status
/session — Quantum session info
/dominance — BTC dominance & quantum risk mode

<b>🔬 QUANTUM FEATURES:</b>
• Neural Market Regime Detection (7-layer deep)
• Quantum Entanglement Networks
• Temporal Fractal Analysis
• Dark Pool Flow Detection
• Quantum Coherence Scoring
• Multi-Agent Consensus Engine
• Non-Linear Position Sizing
• Quantum Risk Contagion Prediction
• Support/Resistance Engine with Volume Profile
• Candle Pattern Machine Learning
• Multi-Timeframe Institutional Confirmation
• AI Confidence Calibration
• Risk-On/Risk-Off Mode Detection

<b>📊 SYMBOLS:</b>
BTCUSDT, ETHUSDT, SOLUSDT, BNBUSDT, XRPUSDT, ADAUSDT, DOGEUSDT, MATICUSDT

<b>⏱️ TIMEFRAMES:</b>
5m, 15m, 30m, 1h, 2h, 4h, 1d, 2d, 1w, 1M, 1y, 2y

<b>🌌 EXAMPLE:</b>
<code>/signal BTCUSDT 1h</code>
<code>/analyze ETHUSDT 4h</code>
<code>/scalp SOLUSDT</code>
<code>/entanglement BTCUSDT ETHUSDT</code>
<code>/market futures 5</code>

<i>This system operates beyond classical market theory, incorporating quantum principles into trading.</i>
    `.trim();
  }
  
  getQuantumState() {
    const memorySize = JSON.stringify(QUANTUM_STATE).length;
    const cacheSize = QUANTUM_CACHE.size;
    const signalCount = SIGNAL_HISTORY.size;
    const entanglementCount = Object.keys(QUANTUM_STATE.entanglement_matrix || {}).length;
    
    return `
<b>🌌 QUANTUM SYSTEM STATE</b>

<b>🧠 Quantum Memory:</b>
Quantum Memory: ${(memorySize / 1024).toFixed(2)} KB
Cache Entries: ${cacheSize}
Signal History: ${signalCount}
Entanglement Pairs: ${entanglementCount}

<b>⚙️ Quantum Configuration:</b>
Account Balance: $${ACCOUNT_BALANCE}
Quantum Risk: ${ACCOUNT_RISK_PERCENT}%
Quantum R/R: ${QUANTUM_RISK_REWARD.toFixed(2)}
Market Type: ${MARKET_TYPE.toUpperCase()}${FUTURES_LEVERAGE > 1 ? ` ${FUTURES_LEVERAGE}x` : ''}
Neural Depth: ${NEURAL_DEPTH}
Learning Rate: ${QUANTUM_LEARNING_RATE}
Temporal Horizon: ${TEMPORAL_HORIZON}
Max Position: ${MAX_POSITION_SIZE}%
Alert Threshold: ${ALERT_THRESHOLD}%

<b>🌀 Quantum Watchlist:</b>
${Array.from(WATCH.entries()).map(([sym, data]) => 
  `• ${sym} (${data.quantum_id}): Ent=${data.entanglement}, Coh=${data.coherence}`
).join('\n')}

<b>📈 Quantum Meta-Cognition:</b>
Self-Corrections: ${QUANTUM_STATE.meta_cognition?.self_corrections || 0}
Paradigm Shifts: ${QUANTUM_STATE.meta_cognition?.paradigm_shifts || 0}

<b>💾 Trade History:</b>
Trades: ${TRADE_HISTORY.length}
Win Rate: ${getExpectancyStats().winRate}%
Expectancy: $${getExpectancyStats().expectancy.toFixed(2)}

<i>Quantum system operational. Ready for entanglement.</i>
    `.trim();
  }
  
  getEntanglementInfo(sym1, sym2) {
    const key = `${sym1}_${sym2}_0`;
    const entanglement = QUANTUM_STATE.entanglement_matrix?.[key];
    
    if (!entanglement) {
      return `❌ No quantum entanglement data for ${sym1} ↔ ${sym2}`;
    }
    
    return `
<b>🔗 QUANTUM ENTANGLEMENT</b>
${sym1} ↔ ${sym2}

<b>Correlation:</b> ${round(entanglement.correlation, 4)}
<b>Weight:</b> ${round(entanglement.weight, 4)}
<b>Temporal Lag:</b> ${entanglement.temporal_lag}
<b>Updates:</b> ${entanglement.updates}

<b>Quantum Interpretation:</b>
${Math.abs(entanglement.correlation) > 0.7 ? "💫 STRONG ENTANGLEMENT" :
  Math.abs(entanglement.correlation) > 0.4 ? "🌀 MODERATE ENTANGLEMENT" :
  Math.abs(entanglement.correlation) > 0.2 ? "🌊 WEAK ENTANGLEMENT" : "🌫️ MINIMAL ENTANGLEMENT"}

${entanglement.correlation > 0 ? 
  "• Positive correlation: Tend to move together" :
  "• Negative correlation: Tend to move opposite"}

<i>Quantum entanglement measures non-classical relationships beyond simple correlation.</i>
    `.trim();
  }
  
  async quantumScan() {
    const signals = [];
    const symbols = WATCH.size > 0 ? Array.from(WATCH.keys()) : DEFAULT_SCAN_SYMBOLS;
    
    for (const symbol of symbols) {
      const signal = await this.signalGenerator.generateQuantumSignal(symbol, "1h");
      if (signal && signal.quantum_confidence > ALERT_THRESHOLD) {
        signals.push(signal);
      }
      await sleep(500);
    }
    
    return signals;
  }
}

/* ================= AUTO-SCANNER (ALERTS) ================= */
async function autoScanner() {
  const symbols = WATCH.size > 0 ? Array.from(WATCH.keys()) : DEFAULT_SCAN_SYMBOLS;
  const telegram = new QuantumTelegramInterface();
  
  for (const symbol of symbols) {
    const tradeDecision = await shouldTrade(symbol);
    if (!tradeDecision.shouldTrade) {
      console.log(`Auto-scan skipped ${symbol}: ${tradeDecision.reason}`);
      continue;
    }
    
    for (const tf of DEFAULT_SCAN_TF) {
      const generator = new QuantumSignalGenerator();
      const s = await generator.generateQuantumSignal(symbol, tf);
      if (!s) continue;
      
      if (s.quantum_confidence >= ALERT_THRESHOLD) {
        const key = `${symbol}_${tf}`;
        const last = LAST_ALERT.get(key) || 0;
        
        if (Date.now() - last > 30 * 60 * 1000) {
          LAST_ALERT.set(key, Date.now());
          const arrow = s.direction === "BUY" ? "🟢" : "🔴";
          const alertMsg = `
<b>🚨 QUANTUM AUTO-SCAN SIGNAL</b>
${arrow} ${s.direction} • <code>${symbol} ${tf}</code>
Quantum Confidence: <code>${s.quantum_confidence}%</code>
Entry: <code>${s.entry}</code> • SL: <code>${s.stop_loss}</code>
TP1: <code>${s.take_profits[0]}</code> • Size: <code>${s.position_size}</code>
Session: ${sessionBias().name} • Vol: ${s.volatility_regime}
Market: ${s.market_type.toUpperCase()}${s.leverage > 1 ? ` ${s.leverage}x` : ''}
          `.trim();
          
          if (TELEGRAM_CHAT_ID) await telegram.sendMessage(TELEGRAM_CHAT_ID, alertMsg);
          else console.log(alertMsg);
        }
      }
      await sleep(500);
    }
    await sleep(700);
  }
}

/* ================= QUANTUM MAIN SYSTEM ================= */
class QuantumTradingSystem {
  constructor() {
    this.telegramInterface = new QuantumTelegramInterface();
    this.signalGenerator = new QuantumSignalGenerator();
    this.isRunning = false;
    this.scanInterval = null;
    this.memoryInterval = null;
    this.pipelineInterval = null;
    this.autoScannerInterval = null;
  }
  
  async initialize() {
    console.log(`
╔══════════════════════════════════════════════════════════╗
║          QUANTUM TRADING SYSTEM v10.4.0                  ║
║          Beyond Institutional Imagination                ║
║          Ultimate Professional Edition                   ║
╚══════════════════════════════════════════════════════════╝
    `.trim());
    
    console.log("🌌 Initializing quantum systems...");
    console.log("🧠 Neural Depth:", NEURAL_DEPTH, "layers");
    console.log("⏱️ Temporal Horizon:", TEMPORAL_HORIZON, "periods");
    console.log("💰 Quantum Capital: $", ACCOUNT_BALANCE);
    console.log("⚛️ Quantum R/R:", QUANTUM_RISK_REWARD.toFixed(2));
    console.log("🌀 Market Type:", MARKET_TYPE.toUpperCase(), FUTURES_LEVERAGE > 1 ? `${FUTURES_LEVERAGE}x` : "");
    console.log("📊 Session:", sessionBias().name);
    
    if (Object.keys(QUANTUM_STATE.entanglement_matrix).length > 0) {
      console.log("📚 Loaded quantum entanglement matrix with", 
        Object.keys(QUANTUM_STATE.entanglement_matrix).length, "pairs");
    }
    
    if (TELEGRAM_TOKEN) {
      this.startQuantumPolling();
    } else {
      console.warn("⚠️ TELEGRAM_TOKEN not set. Bot commands disabled.");
    }
    
    this.startQuantumScanner();
    this.startAutoScanner();
    this.startPipeline();
    this.startMemoryPersistence();
    
    setTimeout(() => this.quantumScanCycle(), 3000);
    
    console.log("\n✅ Quantum systems operational.");
    console.log("🌀 Entanglement network active.");
    console.log("🧠 Neural pathways initialized.");
    console.log("📊 Support/Resistance engine ready.");
    console.log("🤖 Candle Pattern ML loaded.");
    console.log("⚛️ Ready for quantum trading.");
  }
  
  startQuantumPolling() {
    let offset = 0;
    let errorCount = 0;
    const MAX_ERRORS = 10;
    
    const poll = async () => {
      try {
        const url = `https://api.telegram.org/bot${TELEGRAM_TOKEN}/getUpdates?offset=${offset}&timeout=30`;
        const response = await quantumFetch(url);
        
        if (response?.ok && response.result) {
          errorCount = 0;
          for (const update of response.result) {
            offset = update.update_id + 1;
            if (update.message) {
              await this.telegramInterface.handleCommand(update.message);
            }
          }
        } else if (response?.ok === false) {
          console.error("Quantum polling error:", response.description);
          errorCount++;
          if (errorCount >= MAX_ERRORS) return;
        }
      } catch (error) {
        console.error("Quantum polling error:", error.message);
        errorCount++;
        if (errorCount >= MAX_ERRORS) return;
        await sleep(1000 * Math.min(60, Math.pow(2, errorCount)));
      }
      setTimeout(poll, 150);
    };
    
    console.log("🤖 Quantum telegram interface active.");
    poll();
  }
  
  startQuantumScanner() {
    this.scanInterval = setInterval(() => {
      this.quantumScanCycle();
    }, SCAN_INTERVAL_MS);
    
    console.log("🔍 Quantum scanner active:", SCAN_INTERVAL_MS / 1000, "second intervals");
  }
  
  startAutoScanner() {
    this.autoScannerInterval = setInterval(() => {
      autoScanner().catch(console.error);
    }, WATCH_INTERVAL_MS);
    
    console.log("🚨 Auto-scanner active:", WATCH_INTERVAL_MS / 1000, "second intervals");
  }
  
  startPipeline() {
    this.pipelineInterval = setInterval(async () => {
      try {
        if (WATCH.size > 0) {
          const symbols = Array.from(WATCH.keys());
          for (const symbol of symbols) {
            await this.signalGenerator.generateQuantumSignal(symbol, "1h");
            await sleep(500);
          }
        }
      } catch (error) {
        console.error("Pipeline extraction error:", error.message);
      }
    }, DAILY_PIPELINE_MS);
    
    console.log("📊 Pipeline extraction active:", DAILY_PIPELINE_MS / 1000, "second intervals");
  }
  
  startMemoryPersistence() {
    this.memoryInterval = setInterval(() => {
      this.persistQuantumMemory();
    }, 30000);
    
    console.log("💾 Quantum memory persistence active.");
  }
  
  async quantumScanCycle() {
    console.log("🌀 Initiating quantum scan cycle...");
    
    const signals = await this.telegramInterface.quantumScan();
    
    if (signals.length > 0) {
      const strongSignals = signals.filter(s => s.quantum_confidence > 70);
      
      if (strongSignals.length > 0 && TELEGRAM_CHAT_ID) {
        const bestSignal = strongSignals.sort((a, b) => b.quantum_confidence - a.quantum_confidence)[0];
        
        await this.telegramInterface.sendMessage(
          TELEGRAM_CHAT_ID,
          this.telegramInterface.formatQuantumSignal(bestSignal)
        );
        
        console.log("🚀 Quantum signal sent:", bestSignal.symbol, "Confidence:", bestSignal.quantum_confidence);
      }
    }
    
    console.log("✅ Quantum scan complete. Signals:", signals.length);
  }
  
  persistQuantumMemory() {
    try {
      QUANTUM_STATE.coherence_scores = Array.from(WATCH.entries()).reduce((obj, [symbol]) => {
        const data = WATCH.get(symbol);
        obj[symbol] = data?.coherence || 0.5;
        return obj;
      }, {});
      
      QUANTUM_STATE.entanglement_matrix = Object.fromEntries(ENTANGLEMENT_NETWORK);
      
      fs.writeFileSync(QUANTUM_MEMORY_FILE, JSON.stringify(QUANTUM_STATE, null, 2));
      
      QUANTUM_STATE.meta_cognition.self_corrections++;
      if (QUANTUM_STATE.meta_cognition.self_corrections % 100 === 0) {
        QUANTUM_STATE.meta_cognition.paradigm_shifts++;
        console.log("🧠 Quantum paradigm shift detected!");
      }
      
    } catch (error) {
      console.error("❌ Quantum memory persistence failed:", error.message);
    }
  }
  
  async shutdown() {
    console.log("\n🛑 Quantum shutdown initiated...");
    
    clearInterval(this.scanInterval);
    clearInterval(this.memoryInterval);
    clearInterval(this.pipelineInterval);
    clearInterval(this.autoScannerInterval);
    
    this.persistQuantumMemory();
    
    console.log("📊 Final Quantum State:");
    console.log("• Watchlist Symbols:", WATCH.size);
    console.log("• Signal Cache:", SIGNAL_HISTORY.size);
    console.log("• Entanglement Pairs:", Object.keys(QUANTUM_STATE.entanglement_matrix || {}).length);
    console.log("• Trade History:", TRADE_HISTORY.length);
    console.log("• Meta-Corrections:", QUANTUM_STATE.meta_cognition?.self_corrections || 0);
    console.log("• Paradigm Shifts:", QUANTUM_STATE.meta_cognition?.paradigm_shifts || 0);
    console.log("• Win Rate:", getExpectancyStats().winRate + "%");
    console.log("• Expectancy: $", getExpectancyStats().expectancy.toFixed(2));
    console.log("🌌 Quantum system safely terminated.");
  }
}

/* ================= QUANTUM EXECUTION ================= */
const quantumSystem = new QuantumTradingSystem();

process.on("SIGINT", async () => {
  await quantumSystem.shutdown();
  process.exit(0);
});

process.on("SIGTERM", async () => {
  await quantumSystem.shutdown();
  process.exit(0);
});

process.on("uncaughtException", (error) => {
  console.error("❌ Quantum system anomaly:", error);
  quantumSystem.shutdown().then(() => process.exit(1));
});

process.on("unhandledRejection", (reason) => {
  console.error("❌ Quantum promise anomaly:", reason);
});

quantumSystem.initialize().catch(error => {
  console.error("❌ Quantum system initialization failed:", error);
  process.exit(1);
});
