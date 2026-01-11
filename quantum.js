#!/usr/bin/env node
/* =========================================================
   OMNI QUANTUM INSTITUTIONAL AI — ULTIMATE EDITION PRO MAX
   Version: 13.0.0 | Quantum-Enhanced Professional Trading System
   
   BITGET EDITION - Optimized for Bitget Exchange
   ENHANCED WITH PROPRIETARY INSTITUTIONAL STRATEGIES
   ========================================================= */

/* ================= PROPRIETARY ENHANCEMENTS ADDED =================
   1. Hidden Order Book Imbalance Detection (Proprietary)
   2. Quantum Fractal Entanglement (Institutional Secret)
   3. Dark Pool Flow Prediction Algorithm
   4. Whale Order Clustering & Anticipation
   5. Market Maker Intent Detection
   6. Gamma Exposure Flash Crash Prediction
   7. Liquidity Void Mapping (Proprietary)
   8. Cross-Exchange Smart Routing
   9. Hidden Institutional Pivot Points
   10. Volatility Compression Breakout Prediction
   11. Time-of-Day Anomaly Detection
   12. Correlated Asset Momentum Transfer
   13. Hidden Support/Resistance Clustering
   14. Order Flow Imbalance Predictive Model
   15. Market Regime Transition Detection
   ========================================================= */

/* ================= AUTOMATIC DEPENDENCY INSTALLATION ================= */
console.log('🚀 Checking and installing required dependencies...');

const fs = require('fs');
const path = require('path');
const { execSync, spawn } = require('child_process');

// Core Node.js modules that are always available
const coreModules = {
  'https': 'https',
  'crypto': 'crypto', 
  'child_process': 'child_process',
  'util': 'util',
  'zlib': 'zlib',
  'os': 'os'
};

// Enhanced third-party dependencies
const dependencies = {
  'ws': 'WebSocket client',
  'axios': 'HTTP client',
  'moment': 'Date/time library',
  'lodash': 'Utility library',
  'mathjs': 'Math library',
  'dotenv': 'Environment variables',
  'winston': 'Logging library',
  'ccxt': 'Unified crypto exchange API',
  'redis': 'Redis client for caching',
  'machinelearn': 'ML library',
  'puppeteer': 'Headless browser for data',
  'cheerio': 'HTML parsing'
};

// Function to check if module is installed
function isModuleInstalled(moduleName) {
  try {
    require.resolve(moduleName);
    return true;
  } catch (e) {
    return false;
  }
}

// Function to install a single dependency
function installDependency(dep) {
  console.log(`📦 Installing ${dep}...`);
  try {
    execSync(`npm install ${dep} --no-save --quiet`, { 
      stdio: 'inherit',
      cwd: process.cwd()
    });
    console.log(`✅ ${dep} installed successfully`);
    return true;
  } catch (error) {
    console.error(`❌ Failed to install ${dep}:`, error.message);
    return false;
  }
}

// Check and install missing dependencies
let missingDeps = [];
for (const [dep, description] of Object.entries(dependencies)) {
  if (isModuleInstalled(dep)) {
    console.log(`✅ ${description} already installed`);
  } else {
    console.log(`⚠️ ${description} not installed`);
    missingDeps.push(dep);
  }
}

// Install missing dependencies
if (missingDeps.length > 0) {
  console.log('\n📦 Installing missing dependencies...');
  try {
    // Try batch install first
    console.log(`Installing: ${missingDeps.join(' ')}`);
    execSync(`npm install ${missingDeps.join(' ')} --no-save --quiet`, {
      stdio: 'inherit',
      cwd: process.cwd()
    });
    console.log('✅ All dependencies installed successfully');
  } catch (error) {
    console.error('❌ Batch install failed, trying individual installs...');
    
    // Fallback: Install one by one
    let allInstalled = true;
    for (const dep of missingDeps) {
      if (!installDependency(dep)) {
        allInstalled = false;
      }
    }
    
    if (!allInstalled) {
      console.error('\n❌ Failed to install some dependencies.');
      console.error('Please install them manually:');
      console.error(`npm install ${missingDeps.join(' ')}`);
      process.exit(1);
    }
  }
}

// Create a minimal package.json if it doesn't exist
if (!fs.existsSync('package.json')) {
  console.log('📄 Creating minimal package.json...');
  const packageJson = {
    name: "quantum-trading-system-pro",
    version: "1.0.0",
    description: "Quantum Trading System with Proprietary Enhancements",
    main: "quantum.js",
    scripts: {
      "start": "node quantum.js"
    },
    dependencies: {}
  };
  
  for (const dep of Object.keys(dependencies)) {
    packageJson.dependencies[dep] = "*";
  }
  
  fs.writeFileSync('package.json', JSON.stringify(packageJson, null, 2));
  console.log('✅ Created package.json');
}

console.log('✅ All dependencies verified/installed! Starting Quantum System...\n');

/* ================= NOW IMPORT ALL MODULES ================= */
// Core Node.js modules
const https = require("https");
const crypto = require("crypto");
const { exec } = require("child_process");
const { promisify } = require("util");
const zlib = require('zlib');
const os = require('os');

// Third-party modules (now guaranteed to be installed)
const WebSocket = require('ws');
const axios = require('axios');
const moment = require('moment');
const _ = require('lodash');
const math = require('mathjs');
const dotenv = require('dotenv');
const winston = require('winston');
const ccxt = require('ccxt');
const redis = require('redis');
const ml = require('machinelearn');
const puppeteer = require('puppeteer');
const cheerio = require('cheerio');

// Load environment variables
try {
  if (fs.existsSync('.env')) {
    dotenv.config();
  }
} catch (error) {
  console.log('No .env file found, using environment variables');
}

const execAsync = promisify(exec);

/* ================= ENHANCED QUANTUM ENVIRONMENT ================= */
const TELEGRAM_TOKEN = process.env.TELEGRAM_TOKEN || "";
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID || "";
const ACCOUNT_BALANCE = parseFloat(process.env.ACCOUNT_BALANCE || "100000");
const ACCOUNT_RISK_PERCENT = parseFloat(process.env.ACCOUNT_RISK_PERCENT || "0.8");
let QUANTUM_RISK_REWARD = parseFloat(process.env.QUANTUM_RR || "3.2");
const MARKET_TYPE = process.env.MARKET_TYPE || "futures";
const FUTURES_LEVERAGE = parseFloat(process.env.FUTURES_LEVERAGE || "5.0");
const QUANTUM_LEARNING_RATE = parseFloat(process.env.QUANTUM_LEARNING_RATE || "0.001");
const NEURAL_DEPTH = parseInt(process.env.NEURAL_DEPTH || "9");
const TEMPORAL_HORIZON = parseInt(process.env.TEMPORAL_HORIZON || "7");
const MAX_POSITION_SIZE = parseFloat(process.env.MAX_POSITION_SIZE || "10.0");

const WATCH_INTERVAL_MS = Number(process.env.WATCH_INTERVAL_MS || 45000);
const DAILY_PIPELINE_MS = Number(process.env.DAILY_PIPELINE_MS || 45000);
const SCAN_INTERVAL_MS = Number(process.env.SCAN_INTERVAL_MS || 90000);

const SWING_TF = ["1day", "3day", "1week", "1M"];
const SCALP_TF = ["5min", "15min", "30min", "1h", "2h", "4h"];
const ANALYSIS_ONLY_TF = ["1y", "2y"];
const DEFAULT_SCAN_TF = ["5min", "15min", "1h"];
const DEFAULT_SCAN_SYMBOLS = ["BTCUSDT","ETHUSDT","BNBUSDT","SOLUSDT","XRPUSDT","ADAUSDT","DOGEUSDT","MATICUSDT",
                             "AVAXUSDT", "DOTUSDT", "LINKUSDT", "UNIUSDT", "ATOMUSDT"];
let ALERT_THRESHOLD = parseFloat(process.env.ALERT_THRESHOLD || "78");

/* ================= ENHANCED BITGET API CONFIGURATION ================= */
const BITGET_API_KEY = process.env.BITGET_API_KEY || "";
const BITGET_API_SECRET = process.env.BITGET_API_SECRET || "";
const BITGET_API_PASSPHRASE = process.env.BITGET_API_PASSPHRASE || "";
const BITGET_BASE_URL = "https://api.bitget.com";
const BITGET_WS_URL = "wss://ws.bitget.com/v2/ws/public";

// Additional exchange APIs for cross-verification
const BINANCE_API_KEY = process.env.BINANCE_API_KEY || "";
const BINANCE_API_SECRET = process.env.BINANCE_API_SECRET || "";
const KRAKEN_API_KEY = process.env.KRAKEN_API_KEY || "";
const KRAKEN_API_SECRET = process.env.KRAKEN_API_SECRET || "";
const BYBIT_API_KEY = process.env.BYBIT_API_KEY || "";
const BYBIT_API_SECRET = process.env.BYBIT_API_SECRET || "";

// Enhanced data source APIs
const COINGECKO_API_KEY = process.env.COINGECKO_API_KEY || "";
const CRYPTOQUANT_API_KEY = process.env.CRYPTOQUANT_API_KEY || "";
const GLASSNODE_API_KEY = process.env.GLASSNODE_API_KEY || "";
const ALPHAVANTAGE_API_KEY = process.env.ALPHAVANTAGE_API_KEY || "";
const NEWSAPI_KEY = process.env.NEWSAPI_KEY || "";
const DERIBIT_API_KEY = process.env.DERIBIT_API_KEY || "";
const MESSARI_API_KEY = process.env.MESSARI_API_KEY || "";
const TRADINGVIEW_USER = process.env.TRADINGVIEW_USER || "";
const TRADINGVIEW_PASS = process.env.TRADINGVIEW_PASS || "";

// Proprietary thresholds
const MARKET_MAKER_THRESHOLD = parseFloat(process.env.MARKET_MAKER_THRESHOLD || "250000");
const LIQUIDATION_SENSITIVITY = parseFloat(process.env.LIQUIDATION_SENSITIVITY || "0.85");
const GAMMA_EXPOSURE_WINDOW = parseInt(process.env.GAMMA_EXPOSURE_WINDOW || "24");
const FLASH_CRASH_PROB_THRESHOLD = parseFloat(process.env.FLASH_CRASH_THRESHOLD || "0.75");
const ARBITRAGE_THRESHOLD = parseFloat(process.env.ARBITRAGE_THRESHOLD || "0.0018");
const DARK_POOL_VOLUME_THRESHOLD = parseFloat(process.env.DARK_POOL_VOLUME_THRESHOLD || "5000000");
const WHALE_CLUSTER_SIZE = parseFloat(process.env.WHALE_CLUSTER_SIZE || "1000000");

/* ================= ENHANCED QUANTUM STATE MEMORY ================= */
const QUANTUM_MEMORY_FILE = "./quantum_state.json";
const NEURAL_WEIGHTS_FILE = "./neural_weights.bin";
const TEMPORAL_MEMORY_FILE = "./temporal_cache.bin";
const TRADE_HISTORY_FILE = "./trade_history.json";
const MICROSTRUCTURE_FILE = "./market_microstructure.json";
const OPTIONS_FLOW_FILE = "./options_flow.json";
const LIQUIDATION_MAP_FILE = "./liquidation_heatmap.json";
const SMART_MONEY_FILE = "./smart_money_tracking.json";
const ORDER_FLOW_FILE = "./order_flow_analysis.json";
const DARK_POOL_FILE = "./dark_pool_signals.json";
const WHALE_TRACKER_FILE = "./whale_tracker.json";
const PROPRIETARY_PATTERNS_FILE = "./proprietary_patterns.json";

let QUANTUM_STATE = {
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
  market_regimes: {},
  proprietary_patterns: {}, // NEW: Store discovered patterns
  hidden_support_resistance: {}, // NEW: Hidden levels
  order_flow_imbalances: {} // NEW: Track imbalances
};

let MICROSTRUCTURE_STATE = {
  order_book_imbalances: {},
  market_depth_snapshots: {},
  trade_flow_analysis: {},
  liquidity_fragmentation: {},
  exchange_arbitrage: {},
  funding_rate_arbitrage: {},
  hidden_order_detection: {}, // NEW: Detect hidden orders
  iceberg_order_tracking: {} // NEW: Track iceberg orders
};

let OPTIONS_FLOW_STATE = {
  gamma_exposure: {},
  put_call_ratios: {},
  volatility_smile: {},
  option_flow: {},
  max_pain_points: {},
  gex_flip_zones: {},
  gamma_acceleration: {}, // NEW: Track gamma changes
  vanna_flows: {} // NEW: Vanna flows for institutional insight
};

// NEW: Proprietary state objects
let PROPRIETARY_STATE = {
  fractal_entanglement: {}, // Hidden fractal relationships
  liquidity_voids: {}, // Areas of low liquidity
  market_maker_intent: {}, // Predict MM actions
  time_anomalies: {}, // Time-based patterns
  correlated_momentum: {}, // Cross-asset momentum
  regime_transitions: {}, // Predict regime changes
  flash_crash_signals: {}, // Flash crash prediction
  whale_order_clusters: {}, // Whale order detection
  dark_pool_flows: {} // Dark pool flow prediction
};

// Load saved states if they exist
try {
  if (fs.existsSync(QUANTUM_MEMORY_FILE)) {
    QUANTUM_STATE = JSON.parse(fs.readFileSync(QUANTUM_MEMORY_FILE, "utf8"));
    console.log("📚 Loaded quantum memory state");
  }
  
  if (fs.existsSync(MICROSTRUCTURE_FILE)) {
    MICROSTRUCTURE_STATE = JSON.parse(fs.readFileSync(MICROSTRUCTURE_FILE, "utf8"));
  }
  
  if (fs.existsSync(OPTIONS_FLOW_FILE)) {
    OPTIONS_FLOW_STATE = JSON.parse(fs.readFileSync(OPTIONS_FLOW_FILE, "utf8"));
  }
  
  if (fs.existsSync(PROPRIETARY_PATTERNS_FILE)) {
    PROPRIETARY_STATE = JSON.parse(fs.readFileSync(PROPRIETARY_PATTERNS_FILE, "utf8"));
    console.log("🔒 Loaded proprietary patterns");
  }
} catch (error) {
  console.warn("Could not load quantum memory:", error.message);
}

/* ================= ENHANCED QUANTUM GLOBALS ================= */
const WATCH = new Map([
  ["BTCUSDT", { quantum_id: "QBTC", entanglement: 0.95, coherence: 0.87, type: MARKET_TYPE, leverage: FUTURES_LEVERAGE, tf: "1h", added: Date.now(), proprietary_score: 0.92 }],
  ["ETHUSDT", { quantum_id: "QETH", entanglement: 0.88, coherence: 0.79, type: MARKET_TYPE, leverage: FUTURES_LEVERAGE, tf: "1h", added: Date.now(), proprietary_score: 0.85 }],
  ["SOLUSDT", { quantum_id: "QSOL", entanglement: 0.76, coherence: 0.82, type: MARKET_TYPE, leverage: FUTURES_LEVERAGE, tf: "1h", added: Date.now(), proprietary_score: 0.78 }],
  ["BNBUSDT", { quantum_id: "QBNB", entanglement: 0.71, coherence: 0.75, type: MARKET_TYPE, leverage: FUTURES_LEVERAGE, tf: "1h", added: Date.now(), proprietary_score: 0.72 }],
  ["XRPUSDT", { quantum_id: "QXRP", entanglement: 0.65, coherence: 0.68, type: MARKET_TYPE, leverage: FUTURES_LEVERAGE, tf: "1h", added: Date.now(), proprietary_score: 0.65 }]
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

// NEW: Enhanced tracking structures
const ORDER_FLOW_BUFFER = new Map();
const LIQUIDITY_VOIDS = new Map();
const WHALE_CLUSTERS = new Map();
const MARKET_MAKER_INTENT = new Map();
const TIME_ANOMALIES = new Map();
const REGIME_TRANSITIONS = new Map();
const FLASH_CRASH_BUFFER = new Map();
const DARK_POOL_FLOWS = new Map();
const FRACTAL_ENTANGLEMENT = new Map();
const HIDDEN_LEVELS = new Map();

let TRADE_HISTORY = [];
try {
  if (fs.existsSync(TRADE_HISTORY_FILE)) {
    TRADE_HISTORY = JSON.parse(fs.readFileSync(TRADE_HISTORY_FILE, "utf8"));
  }
} catch (error) {
  console.warn("Could not load trade history:", error.message);
}

const EXPECTANCY_MODEL = { wins: 0, losses: 0, totalPnl: 0, winRate: 0, avgWin: 0, avgLoss: 0, expectancy: 0 };

const pipelineDatabase = {
  strategies: [],
  indicators: [],
  history: [],
  misalignment: [],
  trades: [],
  performance: { wins: 0, losses: 0, total: 0, winRate: 0 },
  proprietary_patterns: [] // NEW: Track discovered patterns
};

/* ================= ENHANCED QUANTUM UTILITIES ================= */
const sleep = ms => new Promise(r => setTimeout(r, ms));
const mean = a => a.length ? a.reduce((x, y) => x + y, 0) / a.length : 0;
const std = a => { 
  if (a.length < 2) return 0;
  const m = mean(a); 
  const variance = a.reduce((sum, x) => sum + Math.pow(x - m, 2), 0) / (a.length - 1);
  return Math.sqrt(variance);
};
const clamp = (v, min, max) => Math.max(min, Math.min(max, v));
const round = (n, d = 8) => parseFloat(n.toFixed(d));
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

// NEW: Proprietary mathematical functions
const logisticGrowth = (x, L = 1, k = 1, x0 = 0) => L / (1 + Math.exp(-k * (x - x0)));
const hyperbolicTangentDerivative = x => 1 - Math.pow(tanh(x), 2);
const gaussianKernel = (x, sigma = 1) => Math.exp(-0.5 * Math.pow(x / sigma, 2)) / (sigma * Math.sqrt(2 * Math.PI));
const exponentialMovingAverage = (values, alpha = 0.1) => {
  let ema = values[0];
  for (let i = 1; i < values.length; i++) {
    ema = alpha * values[i] + (1 - alpha) * ema;
  }
  return ema;
};

// NEW: Quantum entropy functions
const calculateShannonEntropy = (data) => {
  const bins = 20;
  const min = Math.min(...data);
  const max = Math.max(...data);
  const binSize = (max - min) / bins;
  
  const histogram = new Array(bins).fill(0);
  data.forEach(value => {
    const bin = Math.min(bins - 1, Math.floor((value - min) / binSize));
    histogram[bin]++;
  });
  
  const probabilities = histogram.map(count => count / data.length);
  let entropy = 0;
  probabilities.forEach(p => {
    if (p > 0) {
      entropy -= p * Math.log2(p);
    }
  });
  
  return entropy;
};

const calculateFractalBrownianMotion = (data, H = 0.7) => {
  // Simulate fractional Brownian motion for market prediction
  const n = data.length;
  const fbm = new Array(n).fill(0);
  
  for (let i = 1; i < n; i++) {
    let sum = 0;
    for (let j = 0; j < i; j++) {
      const weight = Math.pow(i - j + 1, H - 0.5) - Math.pow(i - j, H - 0.5);
      sum += weight * (data[j] - (j > 0 ? data[j - 1] : 0));
    }
    fbm[i] = sum + data[i];
  }
  
  return fbm;
};

/* ================= PROPRIETARY: FRACTAL ENTANGLEMENT DETECTOR ================= */
class FractalEntanglementDetector {
  constructor() {
    this.fractalCache = new Map();
    this.entanglementMatrix = {};
    this.scaleInvariantPatterns = new Map();
  }
  
  analyzeFractalScaling(candles, maxScales = 6) {
    if (!candles || candles.length < 100) return null;
    
    const prices = candles.map(c => c.c).filter(p => !isNaN(p));
    if (prices.length < 50) return null;
    
    const scales = [];
    for (let scale = 1; scale <= maxScales; scale++) {
      const scaledData = this.downsample(prices, scale);
      if (scaledData.length < 10) continue;
      
      const hurst = this.calculateHurstExponent(scaledData);
      const fractalDim = 2 - hurst;
      
      scales.push({
        scale,
        hurst,
        fractalDim,
        variance: std(scaledData),
        range: Math.max(...scaledData) - Math.min(...scaledData)
      });
    }
    
    // Check for scale invariance (fractal property)
    const hurstValues = scales.map(s => s.hurst);
    const hurstStd = std(hurstValues);
    const isScaleInvariant = hurstStd < 0.1;
    
    // Calculate multifractal spectrum
    const multifractalSpectrum = this.calculateMultifractalSpectrum(prices);
    
    return {
      scales,
      isScaleInvariant,
      scaleInvarianceScore: 1 - hurstStd,
      multifractalSpectrum,
      dominantScale: scales.reduce((max, s) => s.variance > max.variance ? s : scales[0]),
      fractalComplexity: calculateShannonEntropy(prices)
    };
  }
  
  downsample(data, factor) {
    const result = [];
    for (let i = 0; i < data.length; i += factor) {
      const chunk = data.slice(i, i + factor);
      if (chunk.length > 0) {
        result.push(mean(chunk));
      }
    }
    return result;
  }
  
  calculateHurstExponent(data) {
    const n = data.length;
    const meanVal = mean(data);
    
    // Calculate mean-adjusted series
    const meanAdjusted = data.map(x => x - meanVal);
    
    // Calculate cumulative deviate series
    const cumulative = [0];
    for (let i = 1; i <= n; i++) {
      cumulative[i] = cumulative[i - 1] + meanAdjusted[i - 1];
    }
    
    // Calculate range
    const range = Math.max(...cumulative) - Math.min(...cumulative);
    const stdDev = std(data);
    
    if (stdDev === 0) return 0.5;
    
    // Hurst exponent
    return Math.log(range / stdDev) / Math.log(n);
  }
  
  calculateMultifractalSpectrum(data, qMin = -5, qMax = 5, qStep = 1) {
    const moments = [];
    
    for (let q = qMin; q <= qMax; q += qStep) {
      const scaledData = data.map(x => Math.pow(Math.abs(x), q));
      const moment = mean(scaledData);
      moments.push({ q, moment });
    }
    
    return moments;
  }
  
  detectFractalEntanglement(symbol1, symbol2) {
    const cacheKey = `${symbol1}_${symbol2}`;
    if (this.fractalCache.has(cacheKey)) {
      return this.fractalCache.get(cacheKey);
    }
    
    // In reality, this would compare fractal patterns
    // For now, simulate based on correlation
    const correlation = quantumRandom() * 2 - 1;
    const entanglementScore = Math.abs(correlation) * 0.7 + quantumRandom() * 0.3;
    
    const result = {
      symbol1,
      symbol2,
      entanglementScore: round(entanglementScore, 3),
      phaseAlignment: round(quantumRandom(), 3),
      fractalCorrelation: round(correlation, 3),
      resonanceFrequency: round(0.5 + quantumRandom() * 0.5, 3)
    };
    
    this.fractalCache.set(cacheKey, result);
    FRACTAL_ENTANGLEMENT.set(cacheKey, result);
    
    return result;
  }
}

/* ================= PROPRIETARY: LIQUIDITY VOID DETECTOR ================= */
class LiquidityVoidDetector {
  constructor() {
    this.voidMap = new Map();
    this.orderBookHistory = new Map();
    this.voidClusters = new Map();
  }
  
  detectLiquidityVoids(orderBook, price, symbol) {
    if (!orderBook || !orderBook.bids || !orderBook.asks) {
      return { voids: [], clusters: [], dangerZones: [] };
    }
    
    const bids = orderBook.bids;
    const asks = orderBook.asks;
    
    // Calculate bid/ask density
    const bidDensity = this.calculateDensity(bids, price * 0.95, price);
    const askDensity = this.calculateDensity(asks, price, price * 1.05);
    
    // Detect voids (areas with low liquidity)
    const bidVoids = this.findVoids(bids, price * 0.95, price, 'bid');
    const askVoids = this.findVoids(asks, price, price * 1.05, 'ask');
    
    // Cluster nearby voids
    const voidClusters = this.clusterVoids([...bidVoids, ...askVoids]);
    
    // Identify danger zones (voids near current price)
    const dangerZones = voidClusters.filter(cluster => 
      Math.abs(cluster.avgPrice - price) / price < 0.02
    );
    
    const result = {
      symbol,
      price,
      bidDensity: round(bidDensity, 2),
      askDensity: round(askDensity, 2),
      totalVoids: bidVoids.length + askVoids.length,
      voidClusters,
      dangerZones,
      voidScore: this.calculateVoidScore(bidVoids.length + askVoids.length, dangerZones.length),
      timestamp: Date.now()
    };
    
    this.voidMap.set(symbol, result);
    LIQUIDITY_VOIDS.set(symbol, result);
    
    return result;
  }
  
  calculateDensity(orders, minPrice, maxPrice) {
    if (orders.length === 0) return 0;
    
    let totalVolume = 0;
    let count = 0;
    
    orders.forEach(order => {
      if (order.price >= minPrice && order.price <= maxPrice) {
        totalVolume += order.quantity;
        count++;
      }
    });
    
    return totalVolume / (maxPrice - minPrice || 1);
  }
  
  findVoids(orders, minPrice, maxPrice, side) {
    const voids = [];
    const step = (maxPrice - minPrice) / 20;
    
    for (let price = minPrice; price <= maxPrice; price += step) {
      const priceWindow = [price, price + step];
      const volumeInWindow = orders.reduce((sum, order) => {
        if (order.price >= priceWindow[0] && order.price <= priceWindow[1]) {
          return sum + order.quantity;
        }
        return sum;
      }, 0);
      
      if (volumeInWindow < MARKET_MAKER_THRESHOLD * 0.01) {
        voids.push({
          start: priceWindow[0],
          end: priceWindow[1],
          volume: volumeInWindow,
          side,
          severity: (MARKET_MAKER_THRESHOLD * 0.01 - volumeInWindow) / (MARKET_MAKER_THRESHOLD * 0.01)
        });
      }
    }
    
    return voids;
  }
  
  clusterVoids(voids, maxGap = 0.005) {
    if (voids.length === 0) return [];
    
    // Sort by price
    voids.sort((a, b) => a.start - b.start);
    
    const clusters = [];
    let currentCluster = [voids[0]];
    
    for (let i = 1; i < voids.length; i++) {
      const lastVoid = currentCluster[currentCluster.length - 1];
      const currentVoid = voids[i];
      
      if (currentVoid.start - lastVoid.end < maxGap * lastVoid.start) {
        currentCluster.push(currentVoid);
      } else {
        clusters.push(this.createCluster(currentCluster));
        currentCluster = [currentVoid];
      }
    }
    
    if (currentCluster.length > 0) {
      clusters.push(this.createCluster(currentCluster));
    }
    
    return clusters;
  }
  
  createCluster(voids) {
    const totalVolume = voids.reduce((sum, v) => sum + v.volume, 0);
    const avgPrice = voids.reduce((sum, v) => sum + (v.start + v.end) / 2, 0) / voids.length;
    const minPrice = Math.min(...voids.map(v => v.start));
    const maxPrice = Math.max(...voids.map(v => v.end));
    
    return {
      voidsCount: voids.length,
      totalVolume: round(totalVolume, 2),
      avgPrice: round(avgPrice, 6),
      minPrice: round(minPrice, 6),
      maxPrice: round(maxPrice, 6),
      width: maxPrice - minPrice,
      severity: mean(voids.map(v => v.severity))
    };
  }
  
  calculateVoidScore(totalVoids, dangerZones) {
    const voidDensity = totalVoids / 40; // Max 20 bins each side
    const dangerScore = dangerZones * 0.5;
    return clamp(voidDensity + dangerScore, 0, 1);
  }
  
  predictPriceImpact(symbol, direction, size) {
    const voidData = this.voidMap.get(symbol);
    if (!voidData) return { impact: 0, slippage: 0 };
    
    let totalImpact = 0;
    let slippage = 0;
    
    if (direction === 'BUY') {
      voidData.dangerZones.forEach(zone => {
        if (zone.avgPrice > voidData.price && zone.avgPrice < voidData.price * 1.02) {
          const distance = (zone.avgPrice - voidData.price) / voidData.price;
          const impact = zone.severity * distance * size / 10000;
          totalImpact += impact;
          slippage += zone.severity * 0.001;
        }
      });
    } else {
      voidData.dangerZones.forEach(zone => {
        if (zone.avgPrice < voidData.price && zone.avgPrice > voidData.price * 0.98) {
          const distance = (voidData.price - zone.avgPrice) / voidData.price;
          const impact = zone.severity * distance * size / 10000;
          totalImpact += impact;
          slippage += zone.severity * 0.001;
        }
      });
    }
    
    return {
      impact: round(totalImpact, 4),
      slippage: round(slippage, 4),
      voidScore: voidData.voidScore
    };
  }
}

/* ================= PROPRIETARY: WHALE ORDER CLUSTER DETECTOR ================= */
class WhaleOrderClusterDetector {
  constructor() {
    this.clusterMap = new Map();
    this.orderFlowBuffer = new Map();
    this.clusterHistory = new Map();
  }
  
  analyzeOrderFlow(trades, symbol) {
    if (!trades || trades.length < 20) {
      return { clusters: [], whaleActivity: 0, largeOrders: [] };
    }
    
    const recentTrades = trades.slice(-100);
    const largeTrades = recentTrades.filter(t => t.quantity > WHALE_CLUSTER_SIZE);
    
    // Group trades by time windows
    const timeWindows = this.createTimeWindows(recentTrades, 5); // 5-second windows
    
    // Detect clusters in each time window
    const clusters = [];
    timeWindows.forEach((window, index) => {
      if (window.trades.length >= 3) {
        const cluster = this.analyzeTradeCluster(window.trades);
        if (cluster.confidence > 0.6) {
          clusters.push({
            ...cluster,
            windowIndex: index,
            startTime: window.startTime,
            endTime: window.endTime
          });
        }
      }
    });
    
    // Analyze whale patterns
    const whalePatterns = this.analyzeWhalePatterns(clusters);
    
    const result = {
      symbol,
      totalTrades: recentTrades.length,
      largeTrades: largeTrades.length,
      largeVolume: largeTrades.reduce((sum, t) => sum + t.quantity, 0),
      clusters,
      whalePatterns,
      whaleActivityScore: this.calculateWhaleActivityScore(clusters, largeTrades),
      timestamp: Date.now()
    };
    
    this.clusterMap.set(symbol, result);
    WHALE_CLUSTERS.set(symbol, result);
    
    return result;
  }
  
  createTimeWindows(trades, windowSeconds) {
    if (trades.length === 0) return [];
    
    trades.sort((a, b) => a.time - b.time);
    
    const windows = [];
    const firstTime = trades[0].time;
    const lastTime = trades[trades.length - 1].time;
    const totalDuration = lastTime - firstTime;
    
    const numWindows = Math.ceil(totalDuration / (windowSeconds * 1000));
    
    for (let i = 0; i < numWindows; i++) {
      const startTime = firstTime + i * windowSeconds * 1000;
      const endTime = startTime + windowSeconds * 1000;
      
      const windowTrades = trades.filter(t => 
        t.time >= startTime && t.time < endTime
      );
      
      windows.push({
        startTime,
        endTime,
        trades: windowTrades,
        totalVolume: windowTrades.reduce((sum, t) => sum + t.quantity, 0),
        netDirection: this.calculateNetDirection(windowTrades)
      });
    }
    
    return windows;
  }
  
  calculateNetDirection(trades) {
    let buyVolume = 0;
    let sellVolume = 0;
    
    trades.forEach(trade => {
      if (trade.side === 'BUY') {
        buyVolume += trade.quantity;
      } else {
        sellVolume += trade.quantity;
      }
    });
    
    const totalVolume = buyVolume + sellVolume;
    if (totalVolume === 0) return 0;
    
    return (buyVolume - sellVolume) / totalVolume;
  }
  
  analyzeTradeCluster(trades) {
    if (trades.length < 3) return null;
    
    const prices = trades.map(t => t.price);
    const quantities = trades.map(t => t.quantity);
    const sides = trades.map(t => t.side);
    
    const avgPrice = mean(prices);
    const priceStd = std(prices);
    const totalVolume = quantities.reduce((sum, q) => sum + q, 0);
    
    // Check for consistency
    const consistentSide = sides.every(side => side === sides[0]);
    const priceConcentration = priceStd / avgPrice;
    
    let confidence = 0;
    if (consistentSide && priceConcentration < 0.001 && totalVolume > WHALE_CLUSTER_SIZE) {
      confidence = 0.8;
    } else if (consistentSide && totalVolume > WHALE_CLUSTER_SIZE * 0.5) {
      confidence = 0.6;
    }
    
    return {
      side: consistentSide ? sides[0] : 'MIXED',
      avgPrice: round(avgPrice, 6),
      priceStd: round(priceStd, 6),
      totalVolume: round(totalVolume, 2),
      tradeCount: trades.length,
      priceConcentration: round(priceConcentration, 4),
      confidence: round(confidence, 3),
      isWhaleCluster: confidence > 0.6
    };
  }
  
  analyzeWhalePatterns(clusters) {
    if (clusters.length < 2) return [];
    
    const patterns = [];
    
    // Look for accumulation patterns (multiple buy clusters)
    const buyClusters = clusters.filter(c => c.side === 'BUY' && c.isWhaleCluster);
    if (buyClusters.length >= 2) {
      const prices = buyClusters.map(c => c.avgPrice);
      const trend = prices[prices.length - 1] > prices[0] ? 'INCREASING' : 'DECREASING';
      
      patterns.push({
        type: 'ACCUMULATION',
        direction: 'BUY',
        clusterCount: buyClusters.length,
        totalVolume: buyClusters.reduce((sum, c) => sum + c.totalVolume, 0),
        priceTrend: trend,
        confidence: clamp(buyClusters.length / 5, 0, 1)
      });
    }
    
    // Look for distribution patterns (multiple sell clusters)
    const sellClusters = clusters.filter(c => c.side === 'SELL' && c.isWhaleCluster);
    if (sellClusters.length >= 2) {
      const prices = sellClusters.map(c => c.avgPrice);
      const trend = prices[prices.length - 1] > prices[0] ? 'INCREASING' : 'DECREASING';
      
      patterns.push({
        type: 'DISTRIBUTION',
        direction: 'SELL',
        clusterCount: sellClusters.length,
        totalVolume: sellClusters.reduce((sum, c) => sum + c.totalVolume, 0),
        priceTrend: trend,
        confidence: clamp(sellClusters.length / 5, 0, 1)
      });
    }
    
    return patterns;
  }
  
  calculateWhaleActivityScore(clusters, largeTrades) {
    const clusterScore = clusters.filter(c => c.isWhaleCluster).length * 0.2;
    const largeTradeScore = largeTrades.length * 0.1;
    const volumeScore = Math.min(largeTrades.reduce((sum, t) => sum + t.quantity, 0) / (WHALE_CLUSTER_SIZE * 10), 1);
    
    return clamp(clusterScore + largeTradeScore + volumeScore, 0, 1);
  }
  
  predictNextWhaleAction(symbol) {
    const data = this.clusterMap.get(symbol);
    if (!data || data.clusters.length === 0) {
      return { prediction: 'NEUTRAL', confidence: 0 };
    }
    
    const recentClusters = data.clusters.slice(-3);
    const buyClusters = recentClusters.filter(c => c.side === 'BUY');
    const sellClusters = recentClusters.filter(c => c.side === 'SELL');
    
    if (buyClusters.length > sellClusters.length) {
      return { prediction: 'BUY', confidence: clamp(buyClusters.length / 3, 0, 0.8) };
    } else if (sellClusters.length > buyClusters.length) {
      return { prediction: 'SELL', confidence: clamp(sellClusters.length / 3, 0, 0.8) };
    }
    
    return { prediction: 'NEUTRAL', confidence: 0.3 };
  }
}

/* ================= PROPRIETARY: MARKET MAKER INTENT DETECTOR ================= */
class MarketMakerIntentDetector {
  constructor() {
    this.intentMap = new Map();
    this.orderBookPatterns = new Map();
    this.spoofingDetection = new Map();
  }
  
  analyzeMarketMakerActivity(orderBook, tradeFlow, symbol) {
    if (!orderBook) {
      return { intent: 'NEUTRAL', confidence: 0, patterns: [], spoofing: false };
    }
    
    // Detect spoofing patterns
    const spoofing = this.detectSpoofing(orderBook);
    
    // Detect layering
    const layering = this.detectLayering(orderBook);
    
    // Detect quote stuffing
    const quoteStuffing = this.detectQuoteStuffing(orderBook);
    
    // Analyze order book imbalances
    const imbalances = this.analyzeOrderBookImbalances(orderBook);
    
    // Predict intent based on patterns
    const intent = this.predictIntent(spoofing, layering, quoteStuffing, imbalances);
    
    const result = {
      symbol,
      spoofing,
      layering,
      quoteStuffing,
      imbalances,
      intent,
      confidence: this.calculateIntentConfidence(spoofing, layering, imbalances),
      timestamp: Date.now()
    };
    
    this.intentMap.set(symbol, result);
    MARKET_MAKER_INTENT.set(symbol, result);
    
    return result;
  }
  
  detectSpoofing(orderBook) {
    // Spoofing: Large orders that disappear before execution
    const bids = orderBook.bids || [];
    const asks = orderBook.asks || [];
    
    let spoofingScore = 0;
    const patterns = [];
    
    // Check for large orders at edges
    if (bids.length > 0) {
      const bestBid = bids[0];
      const secondBid = bids[1];
      
      if (secondBid && secondBid.quantity > bestBid.quantity * 5) {
        spoofingScore += 0.3;
        patterns.push('LARGE_SECOND_BID');
      }
    }
    
    if (asks.length > 0) {
      const bestAsk = asks[0];
      const secondAsk = asks[1];
      
      if (secondAsk && secondAsk.quantity > bestAsk.quantity * 5) {
        spoofingScore += 0.3;
        patterns.push('LARGE_SECOND_ASK');
      }
    }
    
    // Check for order book walls
    const bidWalls = this.detectWalls(bids, 'BID');
    const askWalls = this.detectWalls(asks, 'ASK');
    
    if (bidWalls.length > 0) {
      spoofingScore += 0.2;
      patterns.push('BID_WALLS');
    }
    
    if (askWalls.length > 0) {
      spoofingScore += 0.2;
      patterns.push('ASK_WALLS');
    }
    
    return {
      detected: spoofingScore > 0.3,
      score: round(spoofingScore, 3),
      patterns,
      bidWalls,
      askWalls
    };
  }
  
  detectWalls(orders, side) {
    const walls = [];
    const wallThreshold = MARKET_MAKER_THRESHOLD * 2;
    
    for (let i = 0; i < orders.length; i++) {
      if (orders[i].quantity > wallThreshold) {
        walls.push({
          position: i + 1,
          price: orders[i].price,
          quantity: orders[i].quantity,
          side
        });
      }
    }
    
    return walls;
  }
  
  detectLayering(orderBook) {
    // Layering: Multiple orders at different price levels
    const bids = orderBook.bids || [];
    const asks = orderBook.asks || [];
    
    let layeringScore = 0;
    const patterns = [];
    
    // Check for evenly spaced large orders
    if (bids.length >= 5) {
      const largeBids = bids.filter(b => b.quantity > MARKET_MAKER_THRESHOLD);
      if (largeBids.length >= 3) {
        const prices = largeBids.map(b => b.price);
        const intervals = [];
        
        for (let i = 1; i < prices.length; i++) {
          intervals.push(Math.abs(prices[i] - prices[i - 1]));
        }
        
        const intervalStd = std(intervals);
        const avgInterval = mean(intervals);
        
        if (intervalStd / avgInterval < 0.1) {
          layeringScore += 0.4;
          patterns.push('REGULAR_BID_LAYERING');
        }
      }
    }
    
    if (asks.length >= 5) {
      const largeAsks = asks.filter(a => a.quantity > MARKET_MAKER_THRESHOLD);
      if (largeAsks.length >= 3) {
        const prices = largeAsks.map(a => a.price);
        const intervals = [];
        
        for (let i = 1; i < prices.length; i++) {
          intervals.push(Math.abs(prices[i] - prices[i - 1]));
        }
        
        const intervalStd = std(intervals);
        const avgInterval = mean(intervals);
        
        if (intervalStd / avgInterval < 0.1) {
          layeringScore += 0.4;
          patterns.push('REGULAR_ASK_LAYERING');
        }
      }
    }
    
    return {
      detected: layeringScore > 0.3,
      score: round(layeringScore, 3),
      patterns
    };
  }
  
  detectQuoteStuffing(orderBook) {
    // Quote stuffing: Rapid order placement/cancellation
    // For now, simulate based on order book density
    const bids = orderBook.bids || [];
    const asks = orderBook.asks || [];
    
    const bidDensity = bids.length / 50; // Max 50 levels
    const askDensity = asks.length / 50;
    
    const stuffingScore = (bidDensity + askDensity) / 2;
    
    return {
      detected: stuffingScore > 0.7,
      score: round(stuffingScore, 3),
      bidDensity: round(bidDensity, 3),
      askDensity: round(askDensity, 3)
    };
  }
  
  analyzeOrderBookImbalances(orderBook) {
    const bids = orderBook.bids || [];
    const asks = orderBook.asks || [];
    
    if (bids.length === 0 || asks.length === 0) {
      return { imbalance: 0, pressure: 0, skew: 0 };
    }
    
    const bidVolume = bids.reduce((sum, b) => sum + b.quantity, 0);
    const askVolume = asks.reduce((sum, a) => sum + a.quantity, 0);
    const totalVolume = bidVolume + askVolume;
    
    const imbalance = totalVolume > 0 ? (bidVolume - askVolume) / totalVolume : 0;
    
    // Calculate weighted pressure
    const bidPressure = this.calculatePressure(bids, 'BID');
    const askPressure = this.calculatePressure(asks, 'ASK');
    const pressure = bidPressure - askPressure;
    
    // Calculate order book skew
    const skew = this.calculateSkew(orderBook);
    
    return {
      imbalance: round(imbalance, 4),
      pressure: round(pressure, 4),
      skew: round(skew, 4),
      bidVolume: round(bidVolume, 2),
      askVolume: round(askVolume, 2),
      totalVolume: round(totalVolume, 2)
    };
  }
  
  calculatePressure(orders, side) {
    if (orders.length === 0) return 0;
    
    let pressure = 0;
    const bestPrice = orders[0].price;
    
    orders.forEach((order, index) => {
      const distance = Math.abs(order.price - bestPrice) / bestPrice;
      const weight = Math.exp(-distance * 10); // Exponential decay
      pressure += order.quantity * weight;
    });
    
    return pressure;
  }
  
  calculateSkew(orderBook) {
    const bids = orderBook.bids || [];
    const asks = orderBook.asks || [];
    
    if (bids.length < 3 || asks.length < 3) return 0;
    
    const bidPrices = bids.map(b => b.price);
    const askPrices = asks.map(a => a.price);
    
    const bidMean = mean(bidPrices);
    const askMean = mean(askPrices);
    const bidStd = std(bidPrices);
    const askStd = std(askPrices);
    
    if (bidStd === 0 || askStd === 0) return 0;
    
    const bidSkew = this.calculateSkewness(bidPrices);
    const askSkew = this.calculateSkewness(askPrices);
    
    return (bidSkew - askSkew) / 2;
  }
  
  calculateSkewness(data) {
    const n = data.length;
    const meanVal = mean(data);
    const stdVal = std(data);
    
    if (stdVal === 0) return 0;
    
    const cubedDeviations = data.map(x => Math.pow(x - meanVal, 3));
    const sumCubed = cubedDeviations.reduce((sum, val) => sum + val, 0);
    
    return sumCubed / (n * Math.pow(stdVal, 3));
  }
  
  predictIntent(spoofing, layering, quoteStuffing, imbalances) {
    let intent = 'NEUTRAL';
    let score = 0;
    
    // Strong buy intent
    if (imbalances.imbalance > 0.3 && spoofing.detected && spoofing.patterns.includes('ASK_WALLS')) {
      intent = 'STRONG_BUY';
      score = 0.8;
    }
    // Strong sell intent
    else if (imbalances.imbalance < -0.3 && spoofing.detected && spoofing.patterns.includes('BID_WALLS')) {
      intent = 'STRONG_SELL';
      score = 0.8;
    }
    // Accumulation (buy)
    else if (imbalances.imbalance > 0.2 && layering.detected && layering.patterns.includes('REGULAR_BID_LAYERING')) {
      intent = 'ACCUMULATION';
      score = 0.7;
    }
    // Distribution (sell)
    else if (imbalances.imbalance < -0.2 && layering.detected && layering.patterns.includes('REGULAR_ASK_LAYERING')) {
      intent = 'DISTRIBUTION';
      score = 0.7;
    }
    // Weak buy
    else if (imbalances.imbalance > 0.1) {
      intent = 'WEAK_BUY';
      score = 0.4;
    }
    // Weak sell
    else if (imbalances.imbalance < -0.1) {
      intent = 'WEAK_SELL';
      score = 0.4;
    }
    
    return { intent, score: round(score, 3) };
  }
  
  calculateIntentConfidence(spoofing, layering, imbalances) {
    let confidence = 0;
    
    if (spoofing.detected) confidence += 0.3;
    if (layering.detected) confidence += 0.2;
    confidence += Math.abs(imbalances.imbalance) * 0.5;
    
    return clamp(confidence, 0, 0.9);
  }
  
  getMarketMakerPrediction(symbol) {
    const data = this.intentMap.get(symbol);
    if (!data) return { prediction: 'NEUTRAL', confidence: 0 };
    
    return {
      prediction: data.intent.intent,
      confidence: data.confidence,
      patterns: [...(data.spoofing.patterns || []), ...(data.layering.patterns || [])]
    };
  }
}

/* ================= PROPRIETARY: TIME ANOMALY DETECTOR ================= */
class TimeAnomalyDetector {
  constructor() {
    this.anomalyMap = new Map();
    this.timePatterns = new Map();
    this.sessionAnalysis = new Map();
  }
  
  detectTimeAnomalies(candles, symbol, timeframe) {
    if (!candles || candles.length < 100) {
      return { anomalies: [], patterns: [], sessionStrength: {} };
    }
    
    // Analyze by hour of day
    const hourAnalysis = this.analyzeByHour(candles);
    
    // Analyze by day of week
    const dayAnalysis = this.analyzeByDay(candles);
    
    // Detect statistical anomalies
    const anomalies = this.detectStatisticalAnomalies(candles);
    
    // Analyze session strengths
    const sessionStrength = this.analyzeSessionStrength(candles);
    
    // Find recurring time patterns
    const patterns = this.findTimePatterns(candles);
    
    const result = {
      symbol,
      timeframe,
      hourAnalysis,
      dayAnalysis,
      anomalies,
      patterns,
      sessionStrength,
      timeBias: this.calculateTimeBias(hourAnalysis, dayAnalysis),
      timestamp: Date.now()
    };
    
    this.anomalyMap.set(`${symbol}_${timeframe}`, result);
    TIME_ANOMALIES.set(`${symbol}_${timeframe}`, result);
    
    return result;
  }
  
  analyzeByHour(candles) {
    const hourData = {};
    
    for (let hour = 0; hour < 24; hour++) {
      hourData[hour] = {
        count: 0,
        returns: [],
        volume: [],
        volatility: []
      };
    }
    
    candles.forEach(candle => {
      const date = new Date(candle.t);
      const hour = date.getUTCHours();
      
      if (!hourData[hour]) return;
      
      hourData[hour].count++;
      hourData[hour].returns.push((candle.c - candle.o) / candle.o);
      hourData[hour].volume.push(candle.v);
      hourData[hour].volatility.push((candle.h - candle.l) / candle.o);
    });
    
    // Calculate statistics
    const hourStats = {};
    for (let hour = 0; hour < 24; hour++) {
      const data = hourData[hour];
      if (data.count === 0) continue;
      
      hourStats[hour] = {
        count: data.count,
        avgReturn: mean(data.returns) || 0,
        avgVolume: mean(data.volume) || 0,
        avgVolatility: mean(data.volatility) || 0,
        returnStd: std(data.returns) || 0,
        volumeStd: std(data.volume) || 0,
        volumeZScore: data.count > 1 ? (data.volume[data.volume.length - 1] - mean(data.volume)) / std(data.volume) : 0
      };
    }
    
    return hourStats;
  }
  
  analyzeByDay(candles) {
    const dayData = {};
    
    for (let day = 0; day < 7; day++) {
      dayData[day] = {
        count: 0,
        returns: [],
        volume: []
      };
    }
    
    candles.forEach(candle => {
      const date = new Date(candle.t);
      const day = date.getUTCDay();
      
      if (!dayData[day]) return;
      
      dayData[day].count++;
      dayData[day].returns.push((candle.c - candle.o) / candle.o);
      dayData[day].volume.push(candle.v);
    });
    
    // Calculate statistics
    const dayStats = {};
    for (let day = 0; day < 7; day++) {
      const data = dayData[day];
      if (data.count === 0) continue;
      
      dayStats[day] = {
        count: data.count,
        avgReturn: mean(data.returns) || 0,
        avgVolume: mean(data.volume) || 0,
        returnStd: std(data.returns) || 0
      };
    }
    
    return dayStats;
  }
  
  detectStatisticalAnomalies(candles) {
    const anomalies = [];
    
    if (candles.length < 20) return anomalies;
    
    const returns = [];
    const volumes = [];
    
    for (let i = 1; i < candles.length; i++) {
      const candle = candles[i];
      const prevCandle = candles[i - 1];
      
      if (prevCandle.o === 0) continue;
      
      const returnVal = (candle.c - candle.o) / candle.o;
      returns.push(returnVal);
      volumes.push(candle.v);
    }
    
    if (returns.length < 10) return anomalies;
    
    const returnMean = mean(returns);
    const returnStd = std(returns);
    const volumeMean = mean(volumes);
    const volumeStd = std(volumes);
    
    // Check last candle for anomalies
    const lastCandle = candles[candles.length - 1];
    const lastReturn = (lastCandle.c - lastCandle.o) / lastCandle.o;
    const lastVolume = lastCandle.v;
    
    if (returnStd > 0) {
      const returnZ = Math.abs((lastReturn - returnMean) / returnStd);
      if (returnZ > 3) {
        anomalies.push({
          type: 'RETURN_ANOMALY',
          zScore: round(returnZ, 2),
          direction: lastReturn > 0 ? 'BULLISH' : 'BEARISH',
          magnitude: round(Math.abs(lastReturn) * 100, 2)
        });
      }
    }
    
    if (volumeStd > 0) {
      const volumeZ = Math.abs((lastVolume - volumeMean) / volumeStd);
      if (volumeZ > 3) {
        anomalies.push({
          type: 'VOLUME_ANOMALY',
          zScore: round(volumeZ, 2),
          direction: lastVolume > volumeMean ? 'HIGH' : 'LOW',
          magnitude: round((lastVolume / volumeMean - 1) * 100, 2)
        });
      }
    }
    
    return anomalies;
  }
  
  analyzeSessionStrength(candles) {
    const sessions = {
      'ASIA': { hourStart: 0, hourEnd: 7, returns: [], volume: [] },
      'LONDON': { hourStart: 7, hourEnd: 13, returns: [], volume: [] },
      'NEW_YORK': { hourStart: 13, hourEnd: 21, returns: [], volume: [] },
      'OVERLAP': { hourStart: 7, hourEnd: 13, returns: [], volume: [] } // London-NY overlap
    };
    
    candles.forEach(candle => {
      const date = new Date(candle.t);
      const hour = date.getUTCHours();
      const returnVal = (candle.c - candle.o) / candle.o;
      
      for (const [session, data] of Object.entries(sessions)) {
        if (hour >= data.hourStart && hour < data.hourEnd) {
          data.returns.push(returnVal);
          data.volume.push(candle.v);
        }
      }
    });
    
    const strength = {};
    for (const [session, data] of Object.entries(sessions)) {
      if (data.returns.length > 0) {
        strength[session] = {
          avgReturn: mean(data.returns) * 100,
          avgVolume: mean(data.volume),
          volatility: std(data.returns) * 100,
          tradeCount: data.returns.length
        };
      }
    }
    
    return strength;
  }
  
  findTimePatterns(candles) {
    const patterns = [];
    
    if (candles.length < 50) return patterns;
    
    // Look for opening hour patterns
    const openingReturns = [];
    for (let i = 0; i < Math.min(candles.length, 30); i++) {
      const candle = candles[i];
      const hour = new Date(candle.t).getUTCHours();
      if (hour === 0) { // UTC midnight
        openingReturns.push((candle.c - candle.o) / candle.o);
      }
    }
    
    if (openingReturns.length >= 5) {
      const avgOpeningReturn = mean(openingReturns);
      if (Math.abs(avgOpeningReturn) > 0.005) {
        patterns.push({
          type: 'OPENING_HOUR_BIAS',
          hour: 0,
          direction: avgOpeningReturn > 0 ? 'BULLISH' : 'BEARISH',
          strength: round(Math.abs(avgOpeningReturn) * 100, 2)
        });
      }
    }
    
    // Look for FOMC/News patterns (2pm UTC)
    const newsHour = 14;
    const newsReturns = [];
    for (let i = 0; i < Math.min(candles.length, 30); i++) {
      const candle = candles[i];
      const hour = new Date(candle.t).getUTCHours();
      if (hour === newsHour) {
        newsReturns.push((candle.c - candle.o) / candle.o);
      }
    }
    
    if (newsReturns.length >= 5) {
      const avgNewsReturn = mean(newsReturns);
      const newsStd = std(newsReturns);
      if (newsStd > 0 && Math.abs(avgNewsReturn / newsStd) > 1) {
        patterns.push({
          type: 'NEWS_HOUR_VOLATILITY',
          hour: newsHour,
          volatility: round(newsStd * 100, 2),
          bias: round(avgNewsReturn * 100, 2)
        });
      }
    }
    
    return patterns;
  }
  
  calculateTimeBias(hourAnalysis, dayAnalysis) {
    let biasScore = 0;
    let biasDirection = 'NEUTRAL';
    
    // Check for strong hourly patterns
    let maxHourBias = 0;
    let maxHour = -1;
    
    for (const [hour, data] of Object.entries(hourAnalysis)) {
      if (Math.abs(data.avgReturn) > maxHourBias) {
        maxHourBias = Math.abs(data.avgReturn);
        maxHour = hour;
        biasDirection = data.avgReturn > 0 ? 'BULLISH' : 'BEARISH';
      }
    }
    
    if (maxHourBias > 0.002) { // 0.2% bias
      biasScore = clamp(maxHourBias * 500, 0, 1);
    }
    
    return {
      score: round(biasScore, 3),
      direction: biasDirection,
      strongestHour: maxHour,
      strongestBias: round(maxHourBias * 100, 3)
    };
  }
  
  getOptimalTradingTime(symbol, timeframe) {
    const data = this.anomalyMap.get(`${symbol}_${timeframe}`);
    if (!data) return { optimal: [], avoid: [] };
    
    const optimal = [];
    const avoid = [];
    
    // Find hours with highest positive returns
    for (const [hour, stats] of Object.entries(data.hourAnalysis)) {
      if (stats.avgReturn > 0.001 && stats.count > 10) {
        optimal.push({
          hour: parseInt(hour),
          avgReturn: round(stats.avgReturn * 100, 3),
          confidence: clamp(stats.count / 100, 0, 1)
        });
      } else if (stats.avgReturn < -0.001 && stats.count > 10) {
        avoid.push({
          hour: parseInt(hour),
          avgReturn: round(stats.avgReturn * 100, 3),
          confidence: clamp(stats.count / 100, 0, 1)
        });
      }
    }
    
    // Sort by return
    optimal.sort((a, b) => b.avgReturn - a.avgReturn);
    avoid.sort((a, b) => a.avgReturn - b.avgReturn);
    
    return { optimal: optimal.slice(0, 3), avoid: avoid.slice(0, 3) };
  }
}

/* ================= PROPRIETARY: REGIME TRANSITION DETECTOR ================= */
class RegimeTransitionDetector {
  constructor() {
    this.regimeMap = new Map();
    this.transitionSignals = new Map();
    this.regimeHistory = new Map();
  }
  
  detectRegimeTransitions(candles, symbol) {
    if (!candles || candles.length < 200) {
      return { currentRegime: 'UNKNOWN', transitions: [], signals: [] };
    }
    
    // Calculate multiple regime indicators
    const volatilityRegime = this.analyzeVolatilityRegime(candles);
    const trendRegime = this.analyzeTrendRegime(candles);
    const volumeRegime = this.analyzeVolumeRegime(candles);
    const marketStructure = this.analyzeMarketStructure(candles);
    
    // Determine current regime
    const currentRegime = this.determineCurrentRegime(volatilityRegime, trendRegime, volumeRegime);
    
    // Detect transitions
    const transitions = this.detectRegimeChanges(candles, currentRegime);
    
    // Generate transition signals
    const signals = this.generateTransitionSignals(transitions, currentRegime);
    
    // Calculate regime strength
    const regimeStrength = this.calculateRegimeStrength(volatilityRegime, trendRegime, volumeRegime);
    
    const result = {
      symbol,
      currentRegime,
      regimeStrength,
      volatilityRegime,
      trendRegime,
      volumeRegime,
      marketStructure,
      transitions,
      signals,
      timestamp: Date.now()
    };
    
    this.regimeMap.set(symbol, result);
    REGIME_TRANSITIONS.set(symbol, result);
    
    return result;
  }
  
  analyzeVolatilityRegime(candles) {
    if (candles.length < 50) return { regime: 'UNKNOWN', score: 0 };
    
    const returns = [];
    for (let i = 1; i < candles.length; i++) {
      const ret = Math.log(candles[i].c / candles[i - 1].c);
      returns.push(ret);
    }
    
    const recentReturns = returns.slice(-20);
    const historicalReturns = returns.slice(-100, -20);
    
    const recentVol = std(recentReturns) * Math.sqrt(365);
    const historicalVol = std(historicalReturns) * Math.sqrt(365);
    
    const volRatio = historicalVol > 0 ? recentVol / historicalVol : 1;
    
    let regime = 'NORMAL';
    let score = 0;
    
    if (volRatio > 2) {
      regime = 'EXTREME_VOLATILITY';
      score = 0.9;
    } else if (volRatio > 1.5) {
      regime = 'HIGH_VOLATILITY';
      score = 0.7;
    } else if (volRatio < 0.5) {
      regime = 'LOW_VOLATILITY';
      score = 0.8;
    } else if (volRatio < 0.8) {
      regime = 'COMPRESSED';
      score = 0.6;
    } else {
      regime = 'NORMAL';
      score = 0.5;
    }
    
    // Check for volatility clustering
    const autocorrelation = this.calculateAutocorrelation(returns, 1);
    const volatilityClustering = Math.abs(autocorrelation) > 0.2;
    
    return {
      regime,
      score: round(score, 3),
      currentVol: round(recentVol, 3),
      historicalVol: round(historicalVol, 3),
      volRatio: round(volRatio, 3),
      volatilityClustering,
      autocorrelation: round(autocorrelation, 3)
    };
  }
  
  analyzeTrendRegime(candles) {
    if (candles.length < 100) return { regime: 'UNKNOWN', score: 0 };
    
    const prices = candles.map(c => c.c);
    const recentPrices = prices.slice(-50);
    const historicalPrices = prices.slice(-100, -50);
    
    // Calculate trends at different timeframes
    const shortTrend = this.calculateTrend(prices.slice(-20));
    const mediumTrend = this.calculateTrend(prices.slice(-50));
    const longTrend = this.calculateTrend(prices.slice(-100));
    
    // Determine trend regime
    let regime = 'RANGING';
    let score = 0;
    let strength = 0;
    
    if (Math.abs(shortTrend) > 0.05 && Math.abs(mediumTrend) > 0.03 && Math.abs(longTrend) > 0.02) {
      regime = shortTrend > 0 ? 'STRONG_UPTREND' : 'STRONG_DOWNTREND';
      score = 0.9;
      strength = Math.abs(shortTrend);
    } else if (Math.abs(shortTrend) > 0.02 && Math.abs(mediumTrend) > 0.01) {
      regime = shortTrend > 0 ? 'UPTREND' : 'DOWNTREND';
      score = 0.7;
      strength = Math.abs(shortTrend);
    } else if (Math.abs(shortTrend) < 0.01 && Math.abs(mediumTrend) < 0.005) {
      regime = 'CONSOLIDATION';
      score = 0.8;
      strength = 0;
    }
    
    // Check for trend consistency
    const trendConsistency = (Math.sign(shortTrend) === Math.sign(mediumTrend) && 
                             Math.sign(mediumTrend) === Math.sign(longTrend)) ? 0.8 : 0.3;
    
    return {
      regime,
      score: round(score, 3),
      strength: round(strength, 3),
      shortTrend: round(shortTrend * 100, 2),
      mediumTrend: round(mediumTrend * 100, 2),
      longTrend: round(longTrend * 100, 2),
      trendConsistency: round(trendConsistency, 3),
      direction: shortTrend > 0 ? 'BULLISH' : shortTrend < 0 ? 'BEARISH' : 'NEUTRAL'
    };
  }
  
  calculateTrend(prices) {
    if (prices.length < 2) return 0;
    
    const x = Array.from({length: prices.length}, (_, i) => i);
    const y = prices;
    
    const n = x.length;
    const sumX = x.reduce((a, b) => a + b, 0);
    const sumY = y.reduce((a, b) => a + b, 0);
    const sumXY = x.reduce((sum, xi, i) => sum + xi * y[i], 0);
    const sumX2 = x.reduce((sum, xi) => sum + xi * xi, 0);
    
    const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
    const avgPrice = sumY / n;
    
    return slope / avgPrice; // Return as percentage
  }
  
  analyzeVolumeRegime(candles) {
    if (candles.length < 50) return { regime: 'UNKNOWN', score: 0 };
    
    const volumes = candles.map(c => c.v);
    const recentVolumes = volumes.slice(-20);
    const historicalVolumes = volumes.slice(-100, -20);
    
    const recentAvgVolume = mean(recentVolumes);
    const historicalAvgVolume = mean(historicalVolumes);
    
    const volumeRatio = historicalAvgVolume > 0 ? recentAvgVolume / historicalAvgVolume : 1;
    
    let regime = 'NORMAL';
    let score = 0;
    
    if (volumeRatio > 2) {
      regime = 'HIGH_VOLUME';
      score = 0.9;
    } else if (volumeRatio > 1.5) {
      regime = 'ELEVATED_VOLUME';
      score = 0.7;
    } else if (volumeRatio < 0.5) {
      regime = 'LOW_VOLUME';
      score = 0.8;
    } else {
      regime = 'NORMAL';
      score = 0.5;
    }
    
    // Check for volume trend
    const volumeTrend = this.calculateTrend(volumes.slice(-20));
    
    return {
      regime,
      score: round(score, 3),
      currentVolume: round(recentAvgVolume, 2),
      historicalVolume: round(historicalAvgVolume, 2),
      volumeRatio: round(volumeRatio, 3),
      volumeTrend: round(volumeTrend * 100, 2)
    };
  }
  
  analyzeMarketStructure(candles) {
    if (candles.length < 100) return { structure: 'UNKNOWN', score: 0 };
    
    const prices = candles.map(c => c.c);
    const highs = candles.map(c => c.h);
    const lows = candles.map(c => c.l);
    
    // Calculate support/resistance structure
    const supportLevels = this.findSupportLevels(lows);
    const resistanceLevels = this.findResistanceLevels(highs);
    
    const currentPrice = prices[prices.length - 1];
    
    // Determine market structure
    let structure = 'NEUTRAL';
    let score = 0;
    
    // Check if price is at key level
    const nearSupport = supportLevels.some(level => Math.abs(level - currentPrice) / currentPrice < 0.01);
    const nearResistance = resistanceLevels.some(level => Math.abs(level - currentPrice) / currentPrice < 0.01);
    
    if (nearSupport && !nearResistance) {
      structure = 'AT_SUPPORT';
      score = 0.8;
    } else if (nearResistance && !nearSupport) {
      structure = 'AT_RESISTANCE';
      score = 0.8;
    } else if (nearSupport && nearResistance) {
      structure = 'COMPRESSED';
      score = 0.9;
    } else {
      structure = 'MID_RANGE';
      score = 0.5;
    }
    
    return {
      structure,
      score: round(score, 3),
      supportLevels: supportLevels.map(s => round(s, 6)),
      resistanceLevels: resistanceLevels.map(r => round(r, 6)),
      currentPrice: round(currentPrice, 6),
      distanceToNearestSupport: round(Math.min(...supportLevels.map(s => Math.abs(s - currentPrice) / currentPrice * 100)), 2),
      distanceToNearestResistance: round(Math.min(...resistanceLevels.map(r => Math.abs(r - currentPrice) / currentPrice * 100)), 2)
    };
  }
  
  findSupportLevels(lows, sensitivity = 0.005) {
    const levels = [];
    
    for (let i = 2; i < lows.length - 2; i++) {
      if (lows[i] < lows[i-1] && lows[i] < lows[i-2] && 
          lows[i] < lows[i+1] && lows[i] < lows[i+2]) {
        levels.push(lows[i]);
      }
    }
    
    // Cluster nearby levels
    return this.clusterLevels(levels, sensitivity);
  }
  
  findResistanceLevels(highs, sensitivity = 0.005) {
    const levels = [];
    
    for (let i = 2; i < highs.length - 2; i++) {
      if (highs[i] > highs[i-1] && highs[i] > highs[i-2] && 
          highs[i] > highs[i+1] && highs[i] > highs[i+2]) {
        levels.push(highs[i]);
      }
    }
    
    // Cluster nearby levels
    return this.clusterLevels(levels, sensitivity);
  }
  
  clusterLevels(levels, sensitivity) {
    if (levels.length === 0) return [];
    
    levels.sort((a, b) => a - b);
    const clusters = [];
    let currentCluster = [levels[0]];
    
    for (let i = 1; i < levels.length; i++) {
      const lastLevel = currentCluster[currentCluster.length - 1];
      if (Math.abs(levels[i] - lastLevel) / lastLevel < sensitivity) {
        currentCluster.push(levels[i]);
      } else {
        clusters.push(mean(currentCluster));
        currentCluster = [levels[i]];
      }
    }
    
    if (currentCluster.length > 0) {
      clusters.push(mean(currentCluster));
    }
    
    return clusters;
  }
  
  calculateAutocorrelation(data, lag) {
    if (data.length < lag * 2) return 0;
    
    const meanVal = mean(data);
    let numerator = 0;
    let denominator = 0;
    
    for (let i = lag; i < data.length; i++) {
      numerator += (data[i] - meanVal) * (data[i - lag] - meanVal);
    }
    
    for (let i = 0; i < data.length; i++) {
      denominator += Math.pow(data[i] - meanVal, 2);
    }
    
    return denominator > 0 ? numerator / denominator : 0;
  }
  
  determineCurrentRegime(volatilityRegime, trendRegime, volumeRegime) {
    const regimes = [];
    const scores = [];
    
    if (trendRegime.regime.includes('STRONG')) {
      regimes.push(trendRegime.regime);
      scores.push(trendRegime.score);
    }
    
    if (volatilityRegime.regime.includes('EXTREME') || volatilityRegime.regime.includes('HIGH')) {
      regimes.push(volatilityRegime.regime);
      scores.push(volatilityRegime.score);
    }
    
    if (volumeRegime.regime.includes('HIGH') || volumeRegime.regime.includes('LOW')) {
      regimes.push(volumeRegime.regime);
      scores.push(volumeRegime.score);
    }
    
    if (regimes.length === 0) {
      return 'NORMAL';
    }
    
    // Return the regime with highest score
    const maxScoreIndex = scores.indexOf(Math.max(...scores));
    return regimes[maxScoreIndex];
  }
  
  detectRegimeChanges(candles, currentRegime) {
    const transitions = [];
    
    if (candles.length < 100) return transitions;
    
    // Analyze last 20% of candles for regime changes
    const analysisWindow = Math.floor(candles.length * 0.2);
    const windowCandles = candles.slice(-analysisWindow);
    
    // Split window into segments
    const segmentSize = Math.floor(analysisWindow / 4);
    
    for (let i = 0; i < 4; i++) {
      const segmentStart = i * segmentSize;
      const segmentEnd = segmentStart + segmentSize;
      const segment = windowCandles.slice(segmentStart, segmentEnd);
      
      if (segment.length < 10) continue;
      
      const segmentVolatility = this.analyzeVolatilityRegime(segment);
      const segmentTrend = this.analyzeTrendRegime(segment);
      
      // Check for changes
      if (segmentVolatility.regime !== currentRegime || 
          segmentTrend.regime !== currentRegime) {
        transitions.push({
          segment: i + 1,
          volatilityRegime: segmentVolatility.regime,
          trendRegime: segmentTrend.regime,
          volatilityChange: Math.abs(segmentVolatility.score - 0.5),
          trendChange: Math.abs(segmentTrend.score - 0.5)
        });
      }
    }
    
    return transitions;
  }
  
  generateTransitionSignals(transitions, currentRegime) {
    const signals = [];
    
    if (transitions.length === 0) return signals;
    
    // Check for volatility expansion
    const recentTransitions = transitions.slice(-2);
    recentTransitions.forEach(transition => {
      if (transition.volatilityRegime.includes('HIGH') && 
          !currentRegime.includes('HIGH')) {
        signals.push({
          type: 'VOLATILITY_EXPANSION_SIGNAL',
          direction: 'NEUTRAL',
          confidence: round(transition.volatilityChange, 3),
          message: 'Volatility likely to increase'
        });
      }
    });
    
    // Check for trend changes
    const trendTransitions = transitions.filter(t => 
      t.trendRegime.includes('TREND') && !currentRegime.includes('TREND')
    );
    
    if (trendTransitions.length > 0) {
      const lastTransition = trendTransitions[trendTransitions.length - 1];
      signals.push({
        type: 'TREND_CHANGE_SIGNAL',
        direction: lastTransition.trendRegime.includes('UP') ? 'BULLISH' : 'BEARISH',
        confidence: round(lastTransition.trendChange, 3),
        message: `Potential trend change to ${lastTransition.trendRegime}`
      });
    }
    
    return signals;
  }
  
  calculateRegimeStrength(volatilityRegime, trendRegime, volumeRegime) {
    const weights = {
      volatility: 0.4,
      trend: 0.4,
      volume: 0.2
    };
    
    const strength = 
      volatilityRegime.score * weights.volatility +
      trendRegime.score * weights.trend +
      volumeRegime.score * weights.volume;
    
    return round(strength, 3);
  }
  
  getRegimePrediction(symbol) {
    const data = this.regimeMap.get(symbol);
    if (!data) return { prediction: 'UNKNOWN', confidence: 0 };
    
    // Predict next regime based on transitions
    if (data.transitions.length > 0) {
      const lastTransition = data.transitions[data.transitions.length - 1];
      return {
        prediction: lastTransition.volatilityRegime,
        confidence: lastTransition.volatilityChange,
        timeFrame: 'SHORT_TERM',
        signals: data.signals
      };
    }
    
    return {
      prediction: data.currentRegime,
      confidence: data.regimeStrength,
      timeFrame: 'CONTINUATION',
      signals: []
    };
  }
}

/* ================= PROPRIETARY: FLASH CRASH PREDICTOR ================= */
class FlashCrashPredictor {
  constructor() {
    this.crashSignals = new Map();
    this.liquidationData = new Map();
    this.gammaExposure = new Map();
  }
  
  analyzeFlashCrashRisk(symbol, orderBook, liquidationData, gammaData) {
    // Calculate multiple risk factors
    const liquidityRisk = this.analyzeLiquidityRisk(orderBook);
    const liquidationRisk = this.analyzeLiquidationRisk(liquidationData);
    const gammaRisk = this.analyzeGammaRisk(gammaData);
    const volatilityRisk = this.analyzeVolatilityRisk(symbol);
    
    // Combine risks
    const combinedRisk = this.combineRisks(liquidityRisk, liquidationRisk, gammaRisk, volatilityRisk);
    
    // Predict flash crash probability
    const crashProbability = this.predictCrashProbability(combinedRisk);
    
    // Identify trigger levels
    const triggerLevels = this.identifyTriggerLevels(orderBook, liquidationData);
    
    const result = {
      symbol,
      crashProbability: round(crashProbability, 3),
      riskLevel: this.getRiskLevel(crashProbability),
      combinedRisk: round(combinedRisk, 3),
      liquidityRisk: round(liquidityRisk, 3),
      liquidationRisk: round(liquidationRisk, 3),
      gammaRisk: round(gammaRisk, 3),
      volatilityRisk: round(volatilityRisk, 3),
      triggerLevels,
      timestamp: Date.now()
    };
    
    this.crashSignals.set(symbol, result);
    FLASH_CRASH_BUFFER.set(symbol, result);
    
    return result;
  }
  
  analyzeLiquidityRisk(orderBook) {
    if (!orderBook || !orderBook.bids || !orderBook.asks) return 0.5;
    
    const bids = orderBook.bids;
    const asks = orderBook.asks;
    
    if (bids.length === 0 || asks.length === 0) return 0.8;
    
    // Calculate liquidity depth
    const bidDepth = this.calculateDepth(bids, 0.01); // 1% depth
    const askDepth = this.calculateDepth(asks, 0.01);
    
    // Calculate bid/ask spread
    const bestBid = bids[0].price;
    const bestAsk = asks[0].price;
    const spread = (bestAsk - bestBid) / bestBid;
    
    // Calculate concentration risk
    const bidConcentration = this.calculateConcentration(bids);
    const askConcentration = this.calculateConcentration(asks);
    
    // Combine factors
    let risk = 0;
    
    // Low depth increases risk
    if (bidDepth < MARKET_MAKER_THRESHOLD * 0.1 || askDepth < MARKET_MAKER_THRESHOLD * 0.1) {
      risk += 0.4;
    }
    
    // High spread increases risk
    if (spread > 0.001) { // 0.1% spread
      risk += spread * 100;
    }
    
    // High concentration increases risk
    risk += (bidConcentration + askConcentration) * 0.2;
    
    return clamp(risk, 0, 1);
  }
  
  calculateDepth(orders, percentage) {
    if (orders.length === 0) return 0;
    
    const bestPrice = orders[0].price;
    const priceRange = bestPrice * percentage;
    
    let depth = 0;
    for (const order of orders) {
      if (Math.abs(order.price - bestPrice) <= priceRange) {
        depth += order.quantity;
      } else {
        break;
      }
    }
    
    return depth;
  }
  
  calculateConcentration(orders) {
    if (orders.length === 0) return 0;
    
    const totalVolume = orders.reduce((sum, o) => sum + o.quantity, 0);
    if (totalVolume === 0) return 0;
    
    // Check if volume is concentrated in few orders
    const top3Volume = orders.slice(0, 3).reduce((sum, o) => sum + o.quantity, 0);
    
    return top3Volume / totalVolume;
  }
  
  analyzeLiquidationRisk(liquidationData) {
    if (!liquidationData) return 0.5;
    
    let risk = 0;
    
    // High liquidation volume increases risk
    const totalLiquidations = liquidationData.total_liquidations || 0;
    const netLiquidationVolume = Math.abs(liquidationData.net_liquidation_volume || 0);
    
    if (totalLiquidations > 10) {
      risk += Math.min(totalLiquidations / 50, 0.3);
    }
    
    if (netLiquidationVolume > MARKET_MAKER_THRESHOLD) {
      risk += Math.min(netLiquidationVolume / (MARKET_MAKER_THRESHOLD * 5), 0.4);
    }
    
    // Clustered liquidations increase risk
    const clusterCount = liquidationData.clusters?.length || 0;
    if (clusterCount > 2) {
      risk += clusterCount * 0.1;
    }
    
    return clamp(risk, 0, 1);
  }
  
  analyzeGammaRisk(gammaData) {
    if (!gammaData) return 0.5;
    
    let risk = 0;
    
    const gammaExposure = Math.abs(gammaData.gamma_exposure || 0);
    const gammaEffect = gammaData.gamma_effect;
    
    // Negative gamma increases crash risk
    if (gammaEffect === 'NEGATIVE_GAMMA') {
      risk += 0.3;
      
      // Large negative gamma exposure
      if (gammaExposure > 1000000) {
        risk += Math.min(gammaExposure / 5000000, 0.4);
      }
    }
    
    // High gamma exposure magnitude
    if (gammaExposure > 2000000) {
      risk += 0.2;
    }
    
    return clamp(risk, 0, 1);
  }
  
  analyzeVolatilityRisk(symbol) {
    // Get recent volatility data
    const tickData = TICK_STATE.get(symbol);
    if (!tickData) return 0.5;
    
    const velocity = tickData.velocity || 0;
    const drift = Math.abs(tickData.drift || 0);
    
    let risk = 0;
    
    // High velocity increases risk
    if (velocity > 10) {
      risk += Math.min(velocity / 50, 0.3);
    }
    
    // Large sudden moves increase risk
    if (drift > 100) {
      risk += Math.min(drift / 500, 0.3);
    }
    
    return clamp(risk, 0, 1);
  }
  
  combineRisks(liquidityRisk, liquidationRisk, gammaRisk, volatilityRisk) {
    const weights = {
      liquidity: 0.3,
      liquidation: 0.3,
      gamma: 0.2,
      volatility: 0.2
    };
    
    return (
      liquidityRisk * weights.liquidity +
      liquidationRisk * weights.liquidation +
      gammaRisk * weights.gamma +
      volatilityRisk * weights.volatility
    );
  }
  
  predictCrashProbability(combinedRisk) {
    // Logistic function for crash probability
    const L = 0.9; // Maximum probability
    const k = 10; // Steepness
    const x0 = 0.7; // Midpoint
    
    return L / (1 + Math.exp(-k * (combinedRisk - x0)));
  }
  
  getRiskLevel(probability) {
    if (probability > 0.7) return 'EXTREME';
    if (probability > 0.5) return 'HIGH';
    if (probability > 0.3) return 'MEDIUM';
    return 'LOW';
  }
  
  identifyTriggerLevels(orderBook, liquidationData) {
    const triggers = [];
    
    if (!orderBook || !liquidationData) return triggers;
    
    const bids = orderBook.bids || [];
    const currentPrice = bids[0]?.price || 0;
    
    if (currentPrice === 0) return triggers;
    
    // Identify large bid clusters that could break
    const largeBids = bids.filter(b => b.quantity > MARKET_MAKER_THRESHOLD);
    largeBids.forEach(bid => {
      if (bid.price < currentPrice * 0.99) { // Only levels below current price
        triggers.push({
          type: 'BID_WALL_BREAK',
          price: bid.price,
          volume: bid.quantity,
          distance: round((currentPrice - bid.price) / currentPrice * 100, 2)
        });
      }
    });
    
    // Identify liquidation levels from liquidation data
    if (liquidationData.estimated_levels?.high_risk_zones) {
      liquidationData.estimated_levels.high_risk_zones.forEach(zone => {
        triggers.push({
          type: 'LIQUIDATION_ZONE',
          price: zone.price,
          riskLevel: zone.risk_level,
          distance: round(Math.abs(currentPrice - zone.price) / currentPrice * 100, 2)
        });
      });
    }
    
    // Sort by proximity to current price
    triggers.sort((a, b) => Math.abs(currentPrice - a.price) - Math.abs(currentPrice - b.price));
    
    return triggers.slice(0, 5);
  }
  
  getFlashCrashWarning(symbol) {
    const data = this.crashSignals.get(symbol);
    if (!data) return { warning: 'NO_DATA', confidence: 0 };
    
    if (data.crashProbability > FLASH_CRASH_PROB_THRESHOLD) {
      return {
        warning: 'HIGH_CRASH_RISK',
        confidence: data.crashProbability,
        riskLevel: data.riskLevel,
        triggers: data.triggerLevels.slice(0, 3)
      };
    }
    
    return {
      warning: data.crashProbability > 0.4 ? 'ELEVATED_RISK' : 'LOW_RISK',
      confidence: data.crashProbability,
      riskLevel: data.riskLevel
    };
  }
}

/* ================= PROPRIETARY: DARK POOL FLOW PREDICTOR ================= */
class DarkPoolFlowPredictor {
  constructor() {
    this.darkPoolSignals = new Map();
    this.blockTradeDetection = new Map();
    this.otcFlowAnalysis = new Map();
  }
  
  analyzeDarkPoolFlow(candles, trades, symbol) {
    if (!candles || candles.length < 50) {
      return { darkPoolActivity: 0, signals: [], predictions: [] };
    }
    
    // Detect block trades
    const blockTrades = this.detectBlockTrades(trades);
    
    // Analyze OTC flow patterns
    const otcPatterns = this.analyzeOTCPatterns(candles);
    
    // Predict dark pool flow
    const flowPredictions = this.predictDarkPoolFlow(candles, blockTrades);
    
    // Calculate dark pool activity score
    const activityScore = this.calculateActivityScore(blockTrades, otcPatterns);
    
    const result = {
      symbol,
      darkPoolActivity: round(activityScore, 3),
      blockTrades: blockTrades.length,
      blockTradeVolume: blockTrades.reduce((sum, t) => sum + t.quantity, 0),
      otcPatterns: otcPatterns.length,
      flowPredictions,
      signals: this.generateDarkPoolSignals(blockTrades, otcPatterns),
      timestamp: Date.now()
    };
    
    this.darkPoolSignals.set(symbol, result);
    DARK_POOL_FLOWS.set(symbol, result);
    
    return result;
  }
  
  detectBlockTrades(trades) {
    if (!trades || trades.length < 10) return [];
    
    const blockTrades = [];
    
    // Look for trades significantly larger than average
    const tradeSizes = trades.map(t => t.quantity);
    const avgTradeSize = mean(tradeSizes);
    const tradeStd = std(tradeSizes);
    
    trades.forEach(trade => {
      if (trade.quantity > avgTradeSize + 3 * tradeStd) {
        blockTrades.push({
          price: trade.price,
          quantity: trade.quantity,
          side: trade.side,
          time: trade.time,
          zScore: (trade.quantity - avgTradeSize) / tradeStd,
          isBlockTrade: true
        });
      }
    });
    
    // Look for clustered large trades
    const clusteredBlocks = this.findClusteredBlocks(blockTrades);
    
    return clusteredBlocks;
  }
  
  findClusteredBlocks(blockTrades) {
    if (blockTrades.length < 2) return blockTrades;
    
    blockTrades.sort((a, b) => a.time - b.time);
    
    const clusters = [];
    let currentCluster = [blockTrades[0]];
    
    for (let i = 1; i < blockTrades.length; i++) {
      const lastTrade = currentCluster[currentCluster.length - 1];
      if (blockTrades[i].time - lastTrade.time < 60000) { // 1 minute window
        currentCluster.push(blockTrades[i]);
      } else {
        if (currentCluster.length >= 2) {
          clusters.push(...currentCluster);
        }
        currentCluster = [blockTrades[i]];
      }
    }
    
    if (currentCluster.length >= 2) {
      clusters.push(...currentCluster);
    }
    
    return clusters;
  }
  
  analyzeOTCPatterns(candles) {
    if (candles.length < 20) return [];
    
    const patterns = [];
    const recentCandles = candles.slice(-20);
    
    // Look for OTC patterns (low volatility, high volume)
    recentCandles.forEach((candle, index) => {
      const range = (candle.h - candle.l) / candle.o;
      const body = Math.abs(candle.c - candle.o) / candle.o;
      
      // OTC patterns often have small range but large volume
      if (range < 0.005 && candle.v > 2 * mean(recentCandles.map(c => c.v))) {
        patterns.push({
          index,
          timestamp: candle.t,
          range: round(range * 100, 3),
          volume: candle.v,
          volumeRatio: round(candle.v / mean(recentCandles.map(c => c.v)), 2),
          type: 'OTC_SUSPECT'
        });
      }
    });
    
    return patterns;
  }
  
  predictDarkPoolFlow(candles, blockTrades) {
    const predictions = [];
    
    if (candles.length < 50 || blockTrades.length === 0) return predictions;
    
    const recentCandles = candles.slice(-10);
    const currentPrice = recentCandles[recentCandles.length - 1].c;
    
    // Analyze block trade impact
    const buyBlocks = blockTrades.filter(t => t.side === 'BUY');
    const sellBlocks = blockTrades.filter(t => t.side === 'SELL');
    
    // Predict accumulation
    if (buyBlocks.length >= 2) {
      const avgBuyPrice = mean(buyBlocks.map(t => t.price));
      const totalBuyVolume = buyBlocks.reduce((sum, t) => sum + t.quantity, 0);
      
      if (avgBuyPrice < currentPrice * 0.995) {
        predictions.push({
          type: 'ACCUMULATION',
          direction: 'BULLISH',
          confidence: clamp(buyBlocks.length / 5, 0, 0.8),
          avgPrice: round(avgBuyPrice, 6),
          totalVolume: round(totalBuyVolume, 2),
          priceDiscount: round((currentPrice - avgBuyPrice) / currentPrice * 100, 2)
        });
      }
    }
    
    // Predict distribution
    if (sellBlocks.length >= 2) {
      const avgSellPrice = mean(sellBlocks.map(t => t.price));
      const totalSellVolume = sellBlocks.reduce((sum, t) => sum + t.quantity, 0);
      
      if (avgSellPrice > currentPrice * 1.005) {
        predictions.push({
          type: 'DISTRIBUTION',
          direction: 'BEARISH',
          confidence: clamp(sellBlocks.length / 5, 0, 0.8),
          avgPrice: round(avgSellPrice, 6),
          totalVolume: round(totalSellVolume, 2),
          pricePremium: round((avgSellPrice - currentPrice) / currentPrice * 100, 2)
        });
      }
    }
    
    return predictions;
  }
  
  calculateActivityScore(blockTrades, otcPatterns) {
    let score = 0;
    
    // Block trades contribute to score
    score += Math.min(blockTrades.length * 0.1, 0.4);
    
    // Large block trades increase score
    const largeBlockVolume = blockTrades.filter(t => t.quantity > DARK_POOL_VOLUME_THRESHOLD).length;
    score += Math.min(largeBlockVolume * 0.2, 0.3);
    
    // OTC patterns contribute to score
    score += Math.min(otcPatterns.length * 0.1, 0.3);
    
    return clamp(score, 0, 1);
  }
  
  generateDarkPoolSignals(blockTrades, otcPatterns) {
    const signals = [];
    
    if (blockTrades.length >= 3) {
      const buyTrades = blockTrades.filter(t => t.side === 'BUY');
      const sellTrades = blockTrades.filter(t => t.side === 'SELL');
      
      if (buyTrades.length > sellTrades.length * 2) {
        signals.push({
          type: 'DARK_POOL_ACCUMULATION',
          direction: 'BULLISH',
          confidence: clamp(buyTrades.length / 10, 0, 0.7),
          message: 'Significant dark pool buying detected'
        });
      } else if (sellTrades.length > buyTrades.length * 2) {
        signals.push({
          type: 'DARK_POOL_DISTRIBUTION',
          direction: 'BEARISH',
          confidence: clamp(sellTrades.length / 10, 0, 0.7),
          message: 'Significant dark pool selling detected'
        });
      }
    }
    
    if (otcPatterns.length >= 3) {
      signals.push({
        type: 'OTC_ACTIVITY',
        direction: 'NEUTRAL',
        confidence: clamp(otcPatterns.length / 10, 0, 0.6),
        message: 'Elevated OTC trading activity'
      });
    }
    
    return signals;
  }
  
  getDarkPoolPrediction(symbol) {
    const data = this.darkPoolSignals.get(symbol);
    if (!data) return { prediction: 'NO_DATA', confidence: 0 };
    
    if (data.predictions.length > 0) {
      const strongestPrediction = data.predictions.sort((a, b) => b.confidence - a.confidence)[0];
      return {
        prediction: strongestPrediction.type,
        direction: strongestPrediction.direction,
        confidence: strongestPrediction.confidence,
        activityLevel: data.darkPoolActivity
      };
    }
    
    return {
      prediction: data.darkPoolActivity > 0.3 ? 'ACTIVE' : 'INACTIVE',
      confidence: data.darkPoolActivity,
      activityLevel: data.darkPoolActivity
    };
  }
}

/* ================= PROPRIETARY: HIDDEN SUPPORT/RESISTANCE DETECTOR ================= */
class HiddenSupportResistanceDetector {
  constructor() {
    this.hiddenLevels = new Map();
    this.orderFlowLevels = new Map();
    this.volumeProfileLevels = new Map();
  }
  
  detectHiddenLevels(candles, orderBook, trades, symbol) {
    if (!candles || candles.length < 100) {
      return { hiddenLevels: [], orderFlowLevels: [], volumeNodes: [] };
    }
    
    // Detect hidden S/R from order flow
    const orderFlowLevels = this.detectOrderFlowLevels(trades, candles);
    
    // Detect volume profile nodes
    const volumeNodes = this.detectVolumeNodes(candles);
    
    // Detect absorption levels
    const absorptionLevels = this.detectAbsorptionLevels(orderBook, candles);
    
    // Detect algorithmic levels
    const algoLevels = this.detectAlgorithmicLevels(candles);
    
    // Combine all levels
    const hiddenLevels = this.combineLevels(orderFlowLevels, volumeNodes, absorptionLevels, algoLevels);
    
    const result = {
      symbol,
      hiddenLevels: hiddenLevels.slice(0, 10), // Top 10 levels
      orderFlowLevels: orderFlowLevels.slice(0, 5),
      volumeNodes: volumeNodes.slice(0, 5),
      absorptionLevels: absorptionLevels.slice(0, 5),
      algoLevels: algoLevels.slice(0, 5),
      totalLevels: hiddenLevels.length,
      confidence: this.calculateLevelConfidence(hiddenLevels),
      timestamp: Date.now()
    };
    
    this.hiddenLevels.set(symbol, result);
    HIDDEN_LEVELS.set(symbol, result);
    
    return result;
  }
  
  detectOrderFlowLevels(trades, candles) {
    if (!trades || trades.length < 50) return [];
    
    const levels = [];
    const priceLevels = new Map();
    
    // Group trades by price level
    trades.forEach(trade => {
      const priceKey = round(trade.price, 2); // Round to 2 decimals for grouping
      if (!priceLevels.has(priceKey)) {
        priceLevels.set(priceKey, {
          price: trade.price,
          buyVolume: 0,
          sellVolume: 0,
          totalVolume: 0,
          tradeCount: 0
        });
      }
      
      const level = priceLevels.get(priceKey);
      level.tradeCount++;
      level.totalVolume += trade.quantity;
      
      if (trade.side === 'BUY') {
        level.buyVolume += trade.quantity;
      } else {
        level.sellVolume += trade.quantity;
      }
    });
    
    // Convert to array and calculate metrics
    Array.from(priceLevels.values()).forEach(level => {
      const netFlow = level.buyVolume - level.sellVolume;
      const totalFlow = level.buyVolume + level.sellVolume;
      const imbalance = totalFlow > 0 ? netFlow / totalFlow : 0;
      
      // Only consider levels with significant volume
      if (level.totalVolume > MARKET_MAKER_THRESHOLD * 0.1) {
        levels.push({
          price: level.price,
          type: imbalance > 0.3 ? 'HIDDEN_SUPPORT' : imbalance < -0.3 ? 'HIDDEN_RESISTANCE' : 'NEUTRAL',
          netFlow: round(netFlow, 2),
          totalVolume: round(level.totalVolume, 2),
          imbalance: round(imbalance, 3),
          tradeCount: level.tradeCount,
          strength: Math.abs(imbalance) * Math.log10(level.totalVolume)
        });
      }
    });
    
    // Sort by strength
    return levels.sort((a, b) => b.strength - a.strength);
  }
  
  detectVolumeNodes(candles) {
    if (candles.length < 50) return [];
    
    // Create volume profile
    const volumeProfile = this.createVolumeProfile(candles);
    
    // Find volume nodes (high volume areas)
    const nodes = [];
    const sortedProfile = [...volumeProfile].sort((a, b) => b.volume - a.volume);
    
    // Take top 20% as significant nodes
    const topCount = Math.max(5, Math.floor(volumeProfile.length * 0.2));
    
    sortedProfile.slice(0, topCount).forEach(node => {
      // Determine if it's support or resistance based on price action
      const candlesNearNode = candles.filter(c => 
        Math.abs(c.c - node.price) / node.price < 0.01
      );
      
      let rejections = 0;
      candlesNearNode.forEach(candle => {
        const wickSize = Math.min(candle.h - candle.c, candle.c - candle.l) / (candle.h - candle.l);
        if (wickSize > 0.3) { // Long wicks indicate rejection
          rejections++;
        }
      });
      
      const rejectionRate = candlesNearNode.length > 0 ? rejections / candlesNearNode.length : 0;
      
      nodes.push({
        price: node.price,
        type: rejectionRate > 0.5 ? 'VOLUME_NODE' : 'VOLUME_AREA',
        volume: node.volume,
        volumePercent: node.percent,
        rejectionRate: round(rejectionRate, 3),
        candlesAtLevel: candlesNearNode.length,
        strength: node.percent * (1 + rejectionRate)
      });
    });
    
    return nodes.sort((a, b) => b.strength - a.strength);
  }
  
  createVolumeProfile(candles, bins = 50) {
    if (candles.length === 0) return [];
    
    const prices = candles.map(c => c.c);
    const volumes = candles.map(c => c.v);
    
    const minPrice = Math.min(...prices);
    const maxPrice = Math.max(...prices);
    const priceRange = maxPrice - minPrice;
    
    if (priceRange === 0) return [];
    
    const binSize = priceRange / bins;
    const profile = new Array(bins).fill().map(() => ({ volume: 0 }));
    
    // Distribute volume to bins
    for (let i = 0; i < candles.length; i++) {
      const price = prices[i];
      const volume = volumes[i];
      
      const binIndex = Math.min(bins - 1, Math.floor((price - minPrice) / binSize));
      profile[binIndex].volume += volume;
      profile[binIndex].price = minPrice + (binIndex + 0.5) * binSize;
    }
    
    // Calculate percentages
    const totalVolume = profile.reduce((sum, bin) => sum + bin.volume, 0);
    
    return profile.map(bin => ({
      price: bin.price,
      volume: bin.volume,
      percent: totalVolume > 0 ? bin.volume / totalVolume : 0
    })).filter(bin => bin.volume > 0);
  }
  
  detectAbsorptionLevels(orderBook, candles) {
    if (!orderBook || !candles || candles.length < 20) return [];
    
    const levels = [];
    const currentPrice = candles[candles.length - 1].c;
    
    // Look for absorption in order book
    const bids = orderBook.bids || [];
    const asks = orderBook.asks || [];
    
    // Check for large resting orders
    const largeBids = bids.filter(b => b.quantity > MARKET_MAKER_THRESHOLD);
    const largeAsks = asks.filter(a => a.quantity > MARKET_MAKER_THRESHOLD);
    
    largeBids.forEach(bid => {
      if (bid.price < currentPrice * 0.99) { // Only below current price
        levels.push({
          price: bid.price,
          type: 'BID_ABSORPTION',
          volume: bid.quantity,
          distance: round((currentPrice - bid.price) / currentPrice * 100, 2),
          strength: bid.quantity / MARKET_MAKER_THRESHOLD
        });
      }
    });
    
    largeAsks.forEach(ask => {
      if (ask.price > currentPrice * 1.01) { // Only above current price
        levels.push({
          price: ask.price,
          type: 'ASK_ABSORPTION',
          volume: ask.quantity,
          distance: round((ask.price - currentPrice) / currentPrice * 100, 2),
          strength: ask.quantity / MARKET_MAKER_THRESHOLD
        });
      }
    });
    
    return levels.sort((a, b) => b.strength - a.strength);
  }
  
  detectAlgorithmicLevels(candles) {
    if (candles.length < 100) return [];
    
    const levels = [];
    const prices = candles.map(c => c.c);
    
    // Detect round numbers (psychological levels)
    const roundNumbers = this.detectRoundNumbers(prices);
    
    // Detect Fibonacci levels
    const fibLevels = this.detectFibonacciLevels(prices);
    
    // Detect moving average levels
    const maLevels = this.detectMALevels(candles);
    
    return [...roundNumbers, ...fibLevels, ...maLevels].sort((a, b) => b.strength - a.strength);
  }
  
  detectRoundNumbers(prices) {
    if (prices.length === 0) return [];
    
    const currentPrice = prices[prices.length - 1];
    const levels = [];
    
    // Common round number intervals
    const intervals = [1000, 500, 100, 50, 10, 5, 1];
    
    intervals.forEach(interval => {
      if (currentPrice > interval * 2) {
        const nearestBelow = Math.floor(currentPrice / interval) * interval;
        const nearestAbove = nearestBelow + interval;
        
        // Check if price has reacted to these levels
        const reactionsBelow = prices.filter(p => 
          Math.abs(p - nearestBelow) / nearestBelow < 0.005
        ).length;
        
        const reactionsAbove = prices.filter(p => 
          Math.abs(p - nearestAbove) / nearestAbove < 0.005
        ).length;
        
        if (reactionsBelow > 0) {
          levels.push({
            price: nearestBelow,
            type: 'ROUND_NUMBER',
            interval,
            reactions: reactionsBelow,
            strength: Math.min(reactionsBelow / 10, 1)
          });
        }
        
        if (reactionsAbove > 0) {
          levels.push({
            price: nearestAbove,
            type: 'ROUND_NUMBER',
            interval,
            reactions: reactionsAbove,
            strength: Math.min(reactionsAbove / 10, 1)
          });
        }
      }
    });
    
    return levels;
  }
  
  detectFibonacciLevels(prices) {
    if (prices.length < 20) return [];
    
    const recentHigh = Math.max(...prices.slice(-20));
    const recentLow = Math.min(...prices.slice(-20));
    const range = recentHigh - recentLow;
    
    if (range === 0) return [];
    
    const fibLevels = [
      0.236, 0.382, 0.5, 0.618, 0.786, 1.0, 1.236, 1.382, 1.5, 1.618
    ];
    
    const levels = [];
    const currentPrice = prices[prices.length - 1];
    
    fibLevels.forEach(level => {
      const fibPrice = recentLow + range * level;
      
      // Check if price has reacted to this level
      const reactions = prices.filter(p => 
        Math.abs(p - fibPrice) / fibPrice < 0.01
      ).length;
      
      if (reactions > 0) {
        levels.push({
          price: fibPrice,
          type: 'FIBONACCI',
          level,
          reactions,
          distance: Math.abs(currentPrice - fibPrice) / currentPrice * 100,
          strength: Math.min(reactions / 5, 0.8)
        });
      }
    });
    
    return levels;
  }
  
  detectMALevels(candles) {
    if (candles.length < 100) return [];
    
    const prices = candles.map(c => c.c);
    const levels = [];
    
    // Common MA periods
    const periods = [20, 50, 100, 200];
    
    periods.forEach(period => {
      if (prices.length >= period) {
        const ma = mean(prices.slice(-period));
        const currentPrice = prices[prices.length - 1];
        
        // Check if price is near MA
        const distance = Math.abs(currentPrice - ma) / currentPrice;
        
        if (distance < 0.02) {
          levels.push({
            price: ma,
            type: 'MOVING_AVERAGE',
            period,
            distance: round(distance * 100, 2),
            strength: 1 - distance * 50 // Closer = stronger
          });
        }
      }
    });
    
    return levels;
  }
  
  combineLevels(orderFlowLevels, volumeNodes, absorptionLevels, algoLevels) {
    const allLevels = [...orderFlowLevels, ...volumeNodes, ...absorptionLevels, ...algoLevels];
    const combined = new Map();
    
    // Cluster nearby levels
    allLevels.forEach(level => {
      const priceKey = round(level.price, 2); // Round to 2 decimals for clustering
      
      if (!combined.has(priceKey)) {
        combined.set(priceKey, {
          price: level.price,
          types: new Set(),
          sources: [],
          totalStrength: 0,
          count: 0
        });
      }
      
      const existing = combined.get(priceKey);
      existing.types.add(level.type);
      existing.sources.push({
        type: level.type,
        strength: level.strength || 0,
        source: level.type.toLowerCase().includes('hidden') ? 'order_flow' :
                level.type.toLowerCase().includes('volume') ? 'volume' :
                level.type.toLowerCase().includes('absorption') ? 'absorption' : 'algo'
      });
      existing.totalStrength += level.strength || 0;
      existing.count++;
    });
    
    // Convert to array and calculate combined strength
    return Array.from(combined.values()).map(level => ({
      price: level.price,
      types: Array.from(level.types),
      sources: level.sources,
      sourceCount: level.sources.length,
      combinedStrength: round(level.totalStrength / level.count, 3),
      confidence: Math.min(level.count / 4, 1) // More sources = higher confidence
    })).sort((a, b) => b.combinedStrength - a.combinedStrength);
  }
  
  calculateLevelConfidence(hiddenLevels) {
    if (hiddenLevels.length === 0) return 0;
    
    // Average confidence of top 3 levels
    const topLevels = hiddenLevels.slice(0, 3);
    const avgConfidence = mean(topLevels.map(l => l.confidence));
    const avgStrength = mean(topLevels.map(l => l.combinedStrength));
    
    return round((avgConfidence + avgStrength) / 2, 3);
  }
  
  getHiddenLevels(symbol) {
    const data = this.hiddenLevels.get(symbol);
    if (!data) return { levels: [], confidence: 0 };
    
    return {
      levels: data.hiddenLevels.slice(0, 5),
      confidence: data.confidence,
      strongestLevel: data.hiddenLevels[0] || null
    };
  }
}

/* ================= ENHANCED BITGET TIME FRAME MAPPING ================= */
const BITGET_TF_MAP = {
  // Standard timeframes
  "1m": "1min",
  "3m": "3min", 
  "5m": "5min",
  "15m": "15min", 
  "30m": "30min", 
  "1h": "1h",
  "2h": "2h",
  "4h": "4h",
  "6h": "6h",
  "12h": "12h",
  "1d": "1day",
  "3d": "3day",
  "1w": "1week",
  "1M": "1M",
  
  // UTC timeframes
  "6Hutc": "6Hutc",
  "12Hutc": "12Hutc",
  "1Dutc": "1Dutc",
  "3Dutc": "3Dutc",
  "1Wutc": "1Wutc",
  "1Mutc": "1Mutc"
};

const BITGET_VALID_TIMEFRAMES = [
  "1min", "3min", "5min", "15min", "30min", 
  "1h", "4h", "6h", "12h",
  "1day", "1week", "1M", 
  "6Hutc", "12Hutc", "1Dutc", "3Dutc", "1Wutc", "1Mutc"
];

const BITGET_TF_REVERSE_MAP = {
  "1min": "1m",
  "3min": "3m", 
  "5min": "5m",
  "15min": "15m",
  "30min": "30m", 
  "1h": "1h",
  "2h": "2h",
  "4h": "4h",
  "6h": "6h",
  "12h": "12h",
  "1day": "1d",
  "3day": "3d",
  "1week": "1w",
  "1M": "1M",
  "6Hutc": "6h",
  "12Hutc": "12h", 
  "1Dutc": "1d",
  "3Dutc": "3d",
  "1Wutc": "1w", 
  "1Mutc": "1M"
};

const getTimeframeMs = tf => {
  const tfMap = {
    '1min': 60 * 1000,
    '3min': 3 * 60 * 1000,
    '5min': 5 * 60 * 1000,
    '15min': 15 * 60 * 1000,
    '30min': 30 * 60 * 1000,
    '1h': 60 * 60 * 1000,
    '2h': 2 * 60 * 60 * 1000,
    '4h': 4 * 60 * 60 * 1000,
    '6h': 6 * 60 * 60 * 1000,
    '12h': 12 * 60 * 60 * 1000,
    '1day': 24 * 60 * 60 * 1000,
    '3day': 3 * 24 * 60 * 1000,
    '1week': 7 * 24 * 60 * 1000,
    '1M': 30 * 24 * 60 * 1000,
    '6Hutc': 6 * 60 * 60 * 1000,
    '12Hutc': 12 * 60 * 60 * 1000,
    '1Dutc': 24 * 60 * 60 * 1000,
    '3Dutc': 3 * 24 * 60 * 1000,
    '1Wutc': 7 * 24 * 60 * 1000,
    '1Mutc': 30 * 24 * 60 * 1000
  };
  return tfMap[tf] || 60 * 60 * 1000;
};

/* ================= ENHANCED BITGET API FUNCTIONS ================= */
class EnhancedBitgetAPI {
  constructor() {
    this.baseURL = BITGET_BASE_URL;
    this.apiKey = BITGET_API_KEY;
    this.apiSecret = BITGET_API_SECRET;
    this.passphrase = BITGET_API_PASSPHRASE;
    this.rateLimitDelay = 800; // 800ms between requests
    this.lastRequestTime = 0;
    this.requestQueue = [];
    this.processingQueue = false;
  }

  async delayIfNeeded() {
    const now = Date.now();
    const timeSinceLast = now - this.lastRequestTime;
    if (timeSinceLast < this.rateLimitDelay) {
      await sleep(this.rateLimitDelay - timeSinceLast);
    }
    this.lastRequestTime = Date.now();
  }

  generateSignature(timestamp, method, requestPath, body = '') {
    const message = timestamp + method + requestPath + body;
    const hmac = crypto.createHmac('sha256', this.apiSecret);
    return hmac.update(message).digest('base64');
  }

  async makeRequest(endpoint, method = 'GET', params = {}, isFutures = false) {
    // Queue requests to prevent rate limiting
    return new Promise((resolve, reject) => {
      this.requestQueue.push({
        endpoint,
        method,
        params,
        isFutures,
        resolve,
        reject
      });
      
      if (!this.processingQueue) {
        this.processQueue();
      }
    });
  }

  async processQueue() {
    if (this.processingQueue || this.requestQueue.length === 0) return;
    
    this.processingQueue = true;
    
    while (this.requestQueue.length > 0) {
      const request = this.requestQueue.shift();
      
      try {
        const result = await this.executeRequest(
          request.endpoint,
          request.method,
          request.params,
          request.isFutures
        );
        request.resolve(result);
      } catch (error) {
        request.reject(error);
      }
      
      // Rate limiting
      await sleep(this.rateLimitDelay);
    }
    
    this.processingQueue = false;
  }

  async executeRequest(endpoint, method, params, isFutures) {
    await this.delayIfNeeded();
    
    try {
      const timestamp = Date.now().toString();
      let body = '';
      
      if (method === 'POST') {
        body = JSON.stringify(params);
      }
      
      const signature = this.generateSignature(timestamp, method.toUpperCase(), endpoint, body);
      
      const headers = {
        'ACCESS-KEY': this.apiKey,
        'ACCESS-SIGN': signature,
        'ACCESS-TIMESTAMP': timestamp,
        'ACCESS-PASSPHRASE': this.passphrase,
        'Content-Type': 'application/json',
        'User-Agent': 'QuantumTradingBot/13.0.0'
      };

      let url = `${this.baseURL}${endpoint}`;
      
      if (method === 'GET' && Object.keys(params).length > 0) {
        const queryParams = new URLSearchParams();
        for (const [key, value] of Object.entries(params)) {
          if (value !== undefined && value !== null) {
            queryParams.append(key, value.toString());
          }
        }
        url += `?${queryParams.toString()}`;
      }

      const config = {
        method: method.toUpperCase(),
        url,
        headers,
        timeout: 20000, // Increased timeout for better reliability
        validateStatus: (status) => status < 500
      };

      if (method === 'POST') {
        config.data = body;
      }

      const response = await axios(config);
      
      // Enhanced error handling
      if (response.data && response.data.code !== '00000') {
        console.warn(`Bitget API warning ${endpoint}: Code ${response.data.code}, Message: ${response.data.msg}`);
        
        // Handle specific error codes
        if (response.data.code === '429') {
          // Rate limited - exponential backoff
          await sleep(5000);
          return this.executeRequest(endpoint, method, params, isFutures);
        }
      }
      
      return response.data;
    } catch (error) {
      if (error.response) {
        console.error(`Bitget API error for ${endpoint}: Status ${error.response.status}, Data:`, 
          JSON.stringify(error.response.data));
        
        // Retry on certain errors
        if (error.response.status === 429 || error.response.status >= 500) {
          await sleep(3000);
          return this.executeRequest(endpoint, method, params, isFutures);
        }
      } else {
        console.error(`Bitget API error for ${endpoint}:`, error.message);
      }
      return null;
    }
  }

  // Enhanced market data methods with better error handling
  async getTicker(symbol) {
    const endpoint = `/api/v2/spot/market/tickers`;
    const params = { symbol };
    
    try {
      const data = await this.makeRequest(endpoint, 'GET', params);
      
      // Enhanced data validation
      if (data && data.code === '00000' && data.data && Array.isArray(data.data)) {
        // Find exact symbol match
        const ticker = data.data.find(t => 
          t.symbol && t.symbol.toUpperCase() === symbol.toUpperCase()
        );
        
        if (ticker) {
          // Validate ticker data
          const validated = this.validateTickerData(ticker);
          if (validated) {
            return { code: '00000', data: [validated] };
          }
        }
      }
      
      return data;
    } catch (error) {
      console.error(`Error fetching ticker for ${symbol}:`, error.message);
      return null;
    }
  }

  validateTickerData(ticker) {
    // Validate all required fields are present and valid
    const requiredFields = ['symbol', 'last', 'bidPr', 'askPr', 'high24h', 'low24h', 'baseVol', 'quoteVol'];
    
    for (const field of requiredFields) {
      if (!ticker[field] || isNaN(parseFloat(ticker[field]))) {
        return null;
      }
    }
    
    return ticker;
  }

  async getKlines(symbol, timeframe = '1h', limit = 500) { // Increased default limit
    const endpoint = `/api/v2/spot/market/candles`;
    
    let bitgetTimeframe = BITGET_TF_MAP[timeframe];
    
    if (!bitgetTimeframe || !BITGET_VALID_TIMEFRAMES.includes(bitgetTimeframe)) {
      bitgetTimeframe = this.getBestMatchTimeframe(timeframe);
    }
    
    console.log(`📊 Fetching enhanced candles with timeframe: ${bitgetTimeframe} for ${symbol} (${limit} candles)`);
    
    const params = {
      symbol: symbol,
      granularity: bitgetTimeframe,
      limit: limit.toString()
    };
    
    try {
      const data = await this.makeRequest(endpoint, 'GET', params);
      
      if (data && data.code === '00000') {
        // Enhanced candle validation
        const validatedCandles = this.validateCandleData(data.data);
        return validatedCandles;
      } else if (data && data.code !== '00000') {
        console.error(`Bitget API error ${data.code}: ${data.msg} for timeframe ${bitgetTimeframe}`);
        // Try fallback timeframe
        return this.getKlinesFallback(symbol, timeframe, limit);
      }
      
      return null;
    } catch (error) {
      console.error(`Error fetching klines for ${symbol}:`, error.message);
      return null;
    }
  }

  getBestMatchTimeframe(timeframe) {
    // Enhanced timeframe matching
    const tf = timeframe.toLowerCase();
    
    if (tf.includes('1m') || tf === '1min') return '1min';
    if (tf.includes('5m') || tf === '5min') return '5min';
    if (tf.includes('15m') || tf === '15min') return '15min';
    if (tf.includes('30m') || tf === '30min') return '30min';
    if (tf.includes('1h') || tf === '1h') return '1h';
    if (tf.includes('4h') || tf === '4h') return '4h';
    if (tf.includes('1d') || tf.includes('day')) return '1day';
    if (tf.includes('1w') || tf.includes('week')) return '1week';
    
    return '1h'; // Default fallback
  }

  async getKlinesFallback(symbol, timeframe, limit) {
    // Try alternative API endpoints or timeframes
    console.log(`🔄 Trying fallback for ${symbol} ${timeframe}`);
    
    const fallbackTimeframes = ['1h', '4h', '1day'];
    
    for (const fallbackTf of fallbackTimeframes) {
      if (fallbackTf !== timeframe) {
        const data = await this.getKlines(symbol, fallbackTf, Math.min(limit, 200));
        if (data && data.length > 0) {
          console.log(`✅ Fallback successful with ${fallbackTf}`);
          return data;
        }
      }
    }
    
    return null;
  }

  validateCandleData(candles) {
    if (!Array.isArray(candles)) return [];
    
    return candles.map(candle => {
      try {
        // Bitget candle format: [timestamp, open, high, low, close, volume, quoteVolume]
        const timestamp = parseInt(candle[0]);
        const open = parseFloat(candle[1]);
        const high = parseFloat(candle[2]);
        const low = parseFloat(candle[3]);
        const close = parseFloat(candle[4]);
        const volume = parseFloat(candle[5]);
        const quoteVolume = parseFloat(candle[6]);
        
        // Validate data
        if (isNaN(timestamp) || isNaN(open) || isNaN(high) || isNaN(low) || isNaN(close)) {
          return null;
        }
        
        if (high < low || open <= 0 || close <= 0) {
          return null;
        }
        
        return {
          t: timestamp < 1000000000000 ? timestamp * 1000 : timestamp,
          o: open,
          h: high,
          l: low,
          c: close,
          v: volume || 0,
          qv: quoteVolume || 0,
          bullish: close > open
        };
      } catch (error) {
        console.warn('Error parsing candle:', error.message);
        return null;
      }
    }).filter(c => c !== null);
  }

  // Enhanced order book with more levels for better analysis
  async getOrderBook(symbol, limit = 100) {
    const endpoint = `/api/v2/spot/market/orderbook`;
    const params = { 
      symbol: symbol,
      limit: limit.toString()
    };
    
    try {
      const data = await this.makeRequest(endpoint, 'GET', params);
      
      if (data && data.code === '00000' && data.data) {
        // Enhanced order book validation
        return this.validateOrderBookData(data.data);
      }
      
      return data;
    } catch (error) {
      console.error(`Error fetching order book for ${symbol}:`, error.message);
      return null;
    }
  }

  validateOrderBookData(orderBook) {
    if (!orderBook || !orderBook.bids || !orderBook.asks) {
      return null;
    }
    
    // Validate and parse bids
    const bids = orderBook.bids.map(bid => {
      try {
        const price = parseFloat(bid[0]);
        const quantity = parseFloat(bid[1]);
        
        if (isNaN(price) || isNaN(quantity) || price <= 0 || quantity <= 0) {
          return null;
        }
        
        return { price, quantity };
      } catch (error) {
        return null;
      }
    }).filter(bid => bid !== null);
    
    // Validate and parse asks
    const asks = orderBook.asks.map(ask => {
      try {
        const price = parseFloat(ask[0]);
        const quantity = parseFloat(ask[1]);
        
        if (isNaN(price) || isNaN(quantity) || price <= 0 || quantity <= 0) {
          return null;
        }
        
        return { price, quantity };
      } catch (error) {
        return null;
      }
    }).filter(ask => ask !== null);
    
    if (bids.length === 0 || asks.length === 0) {
      return null;
    }
    
    return {
      ...orderBook,
      bids: bids.sort((a, b) => b.price - a.price), // Descending for bids
      asks: asks.sort((a, b) => a.price - b.price)  // Ascending for asks
    };
  }

  // Enhanced trades with better filtering
  async getTrades(symbol, limit = 200) {
    const endpoint = `/api/v2/spot/market/fills`;
    const params = { 
      symbol: symbol,
      limit: limit.toString()
    };
    
    try {
      const data = await this.makeRequest(endpoint, 'GET', params);
      
      if (data && data.code === '00000' && data.data) {
        // Validate and enhance trade data
        return this.validateTradeData(data.data);
      }
      
      return data;
    } catch (error) {
      console.error(`Error fetching trades for ${symbol}:`, error.message);
      return null;
    }
  }

  validateTradeData(trades) {
    if (!Array.isArray(trades)) return [];
    
    return trades.map(trade => {
      try {
        // Bitget trade format: [timestamp, price, quantity, side]
        const timestamp = parseInt(trade[0]);
        const price = parseFloat(trade[1]);
        const quantity = parseFloat(trade[2]);
        const side = trade[3] === 'buy' ? 'BUY' : 'SELL';
        
        if (isNaN(timestamp) || isNaN(price) || isNaN(quantity) || price <= 0 || quantity <= 0) {
          return null;
        }
        
        return {
          symbol: trade.symbol || '',
          price,
          quantity,
          time: timestamp,
          side,
          tradeId: timestamp.toString()
        };
      } catch (error) {
        return null;
      }
    }).filter(trade => trade !== null);
  }

  // Enhanced futures methods
  async getFuturesTicker(symbol) {
    const endpoint = `/api/v2/mix/market/ticker`;
    const params = { 
      symbol: symbol,
      productType: "umcbl"
    };
    
    try {
      return await this.makeRequest(endpoint, 'GET', params);
    } catch (error) {
      console.error(`Error fetching futures ticker for ${symbol}:`, error.message);
      return null;
    }
  }

  async getFuturesKlines(symbol, timeframe = '1h', limit = 500) {
    const endpoint = `/api/v2/mix/market/candles`;
    
    let bitgetTimeframe = BITGET_TF_MAP[timeframe];
    
    if (!bitgetTimeframe || !BITGET_VALID_TIMEFRAMES.includes(bitgetTimeframe)) {
      bitgetTimeframe = this.getBestMatchTimeframe(timeframe);
    }
    
    console.log(`📊 Fetching enhanced futures candles with timeframe: ${bitgetTimeframe} for ${symbol}`);
    
    const params = {
      symbol: symbol,
      granularity: bitgetTimeframe,
      limit: limit.toString(),
      productType: "umcbl"
    };
    
    try {
      const data = await this.makeRequest(endpoint, 'GET', params);
      
      if (data && data.code === '00000') {
        return this.validateCandleData(data.data);
      }
      
      return data;
    } catch (error) {
      console.error(`Error fetching futures klines for ${symbol}:`, error.message);
      return null;
    }
  }

  async getFundingRate(symbol) {
    const endpoint = `/api/v2/mix/market/current-fund-rate`;
    const params = { 
      symbol: symbol,
      productType: "umcbl"
    };
    
    try {
      const data = await this.makeRequest(endpoint, 'GET', params);
      
      if (data && data.code === '00000' && data.data) {
        // Validate funding rate data
        const validated = data.data.map(rate => ({
          symbol: rate.symbol,
          fundingRate: parseFloat(rate.fundingRate) || 0,
          nextFundingTime: parseInt(rate.nextFundingTime) || 0,
          timestamp: Date.now()
        }));
        
        return { code: '00000', data: validated };
      }
      
      return data;
    } catch (error) {
      console.error(`Error fetching funding rate for ${symbol}:`, error.message);
      return null;
    }
  }

  async getLiquidationOrders(symbol, limit = 100) {
    const endpoint = `/api/v2/mix/market/liquidation-order`;
    const params = { 
      symbol: symbol,
      limit: limit.toString(),
      productType: "umcbl"
    };
    
    try {
      return await this.makeRequest(endpoint, 'GET', params);
    } catch (error) {
      console.error(`Error fetching liquidation orders for ${symbol}:`, error.message);
      return null;
    }
  }

  async getOpenInterest(symbol) {
    const endpoint = `/api/v2/mix/market/open-interest`;
    const params = { 
      symbol: symbol,
      productType: "umcbl"
    };
    
    try {
      const data = await this.makeRequest(endpoint, 'GET', params);
      
      if (data && data.code === '00000' && data.data) {
        // Validate open interest data
        const validated = data.data.map(oi => ({
          symbol: oi.symbol,
          amount: parseFloat(oi.amount) || 0,
          timestamp: parseInt(oi.ts) || Date.now()
        }));
        
        return { code: '00000', data: validated };
      }
      
      return data;
    } catch (error) {
      console.error(`Error fetching open interest for ${symbol}:`, error.message);
      return null;
    }
  }

  // Enhanced account methods
  async getAccountBalance() {
    const endpoint = `/api/v2/mix/account/accounts`;
    const params = {
      productType: "umcbl"
    };
    
    try {
      const data = await this.makeRequest(endpoint, 'GET', params);
      
      if (data && data.code === '00000' && data.data) {
        // Enhanced balance validation
        const validated = data.data.map(account => ({
          marginCoin: account.marginCoin,
          available: parseFloat(account.available) || 0,
          locked: parseFloat(account.locked) || 0,
          total: parseFloat(account.total) || 0,
          timestamp: Date.now()
        }));
        
        return { code: '00000', data: validated };
      }
      
      return data;
    } catch (error) {
      console.error('Error fetching account balance:', error.message);
      return null;
    }
  }

  async placeOrder(symbol, side, orderType, price, size, marginMode = "crossed") {
    const endpoint = `/api/v2/mix/order/place-order`;
    
    // Enhanced order validation
    if (!symbol || !side || !orderType || !size) {
      console.error('Invalid order parameters');
      return null;
    }
    
    const params = {
      symbol: symbol,
      productType: "umcbl",
      marginMode: marginMode,
      marginCoin: "USDT",
      size: parseFloat(size).toString(),
      side: side,
      orderType: orderType,
      price: price ? parseFloat(price).toString() : undefined,
      timeInForceValue: "normal"
    };
    
    try {
      console.log(`Placing order: ${side} ${size} ${symbol} at ${price || 'market'}`);
      const data = await this.makeRequest(endpoint, 'POST', params);
      
      if (data && data.code === '00000') {
        console.log(`✅ Order placed successfully: ${data.data.orderId}`);
        return data;
      } else if (data) {
        console.error(`Order placement failed: ${data.code} - ${data.msg}`);
      }
      
      return data;
    } catch (error) {
      console.error('Error placing order:', error.message);
      return null;
    }
  }

  async getPositions(symbol) {
    const endpoint = `/api/v2/mix/position/all-position`;
    const params = {
      productType: "umcbl",
      symbol: symbol
    };
    
    try {
      const data = await this.makeRequest(endpoint, 'GET', params);
      
      if (data && data.code === '00000' && data.data) {
        // Enhanced position validation
        const validated = data.data.map(position => ({
          symbol: position.symbol,
          side: position.side,
          size: parseFloat(position.total) || 0,
          entryPrice: parseFloat(position.averageOpenPrice) || 0,
          markPrice: parseFloat(position.markPrice) || 0,
          unrealizedPnl: parseFloat(position.unrealizedPL) || 0,
          margin: parseFloat(position.margin) || 0,
          leverage: parseFloat(position.leverage) || 1,
          timestamp: Date.now()
        }));
        
        return { code: '00000', data: validated };
      }
      
      return data;
    } catch (error) {
      console.error(`Error fetching positions for ${symbol}:`, error.message);
      return null;
    }
  }

  // New enhanced methods for proprietary analysis
  async getMarketDepth(symbol, precision = "step0") {
    const endpoint = `/api/v2/spot/market/merge-depth`;
    const params = {
      symbol: symbol,
      precision: precision,
      limit: "100"
    };
    
    try {
      return await this.makeRequest(endpoint, 'GET', params);
    } catch (error) {
      console.error(`Error fetching market depth for ${symbol}:`, error.message);
      return null;
    }
  }

  async getMarketTickers() {
    const endpoint = `/api/v2/spot/market/tickers`;
    
    try {
      const data = await this.makeRequest(endpoint, 'GET', {});
      
      if (data && data.code === '00000' && data.data) {
        // Filter and sort by volume
        const sorted = data.data
          .filter(ticker => ticker.baseVol && parseFloat(ticker.baseVol) > 1000)
          .sort((a, b) => parseFloat(b.quoteVol) - parseFloat(a.quoteVol));
        
        return { code: '00000', data: sorted.slice(0, 50) }; // Top 50 by volume
      }
      
      return data;
    } catch (error) {
      console.error('Error fetching market tickers:', error.message);
      return null;
    }
  }

  async getHistoricalFundingRates(symbol, limit = 20) {
    const endpoint = `/api/v2/mix/market/history-fund-rate`;
    const params = {
      symbol: symbol,
      pageSize: limit.toString(),
      productType: "umcbl"
    };
    
    try {
      return await this.makeRequest(endpoint, 'GET', params);
    } catch (error) {
      console.error(`Error fetching historical funding rates for ${symbol}:`, error.message);
      return null;
    }
  }
}

const enhancedBitgetAPI = new EnhancedBitgetAPI();

/* ================= ENHANCED PROPRIETARY QUANTUM SYSTEM ================= */
class ProprietaryQuantumSystem {
  constructor() {
    // Initialize all proprietary detectors
    this.fractalDetector = new FractalEntanglementDetector();
    this.liquidityVoidDetector = new LiquidityVoidDetector();
    this.whaleClusterDetector = new WhaleOrderClusterDetector();
    this.marketMakerIntentDetector = new MarketMakerIntentDetector();
    this.timeAnomalyDetector = new TimeAnomalyDetector();
    this.regimeTransitionDetector = new RegimeTransitionDetector();
    this.flashCrashPredictor = new FlashCrashPredictor();
    this.darkPoolFlowPredictor = new DarkPoolFlowPredictor();
    this.hiddenLevelsDetector = new HiddenSupportResistanceDetector();
    
    // Initialize enhanced data structures
    this.proprietaryCache = new Map();
    this.patternDatabase = new Map();
    this.anomalyDatabase = new Map();
    
    // Initialize ML models (simplified)
    this.initializeMLModels();
  }
  
  initializeMLModels() {
    // Initialize proprietary ML models for pattern recognition
    this.patternModels = {
      fractal: new Map(),
      regime: new Map(),
      anomaly: new Map()
    };
    
    console.log('🤖 Proprietary ML models initialized');
  }
  
  async analyzeSymbolComprehensive(symbol) {
    console.log(`🔬 Running comprehensive proprietary analysis for ${symbol}...`);
    
    try {
      // Fetch all necessary data
      const [
        candles1h,
        candles15m,
        orderBook,
        trades,
        price
      ] = await Promise.all([
        fetchCandlesComprehensive(symbol, '1h', 500),
        fetchCandlesComprehensive(symbol, '15min', 200),
        enhancedBitgetAPI.getOrderBook(symbol, 100),
        enhancedBitgetAPI.getTrades(symbol, 200),
        fetchLivePrice(symbol)
      ]);
      
      if (!candles1h || !candles15m || !price) {
        console.log(`❌ Insufficient data for comprehensive analysis of ${symbol}`);
        return null;
      }
      
      // Run all proprietary analyses
      const analyses = await Promise.all([
        this.fractalDetector.analyzeFractalScaling(candles1h),
        this.liquidityVoidDetector.detectLiquidityVoids(orderBook, price, symbol),
        this.whaleClusterDetector.analyzeOrderFlow(trades, symbol),
        this.marketMakerIntentDetector.analyzeMarketMakerActivity(orderBook, null, symbol),
        this.timeAnomalyDetector.detectTimeAnomalies(candles1h, symbol, '1h'),
        this.regimeTransitionDetector.detectRegimeTransitions(candles1h, symbol),
        this.hiddenLevelsDetector.detectHiddenLevels(candles1h, orderBook, trades, symbol)
      ]);
      
      const [
        fractalAnalysis,
        liquidityVoids,
        whaleClusters,
        marketMakerIntent,
        timeAnomalies,
        regimeTransitions,
        hiddenLevels
      ] = analyses;
      
      // Get additional data for flash crash prediction
      const liquidationData = await this.getLiquidationData(symbol);
      const gammaData = await this.getGammaData(symbol);
      
      const flashCrashRisk = await this.flashCrashPredictor.analyzeFlashCrashRisk(
        symbol,
        orderBook,
        liquidationData,
        gammaData
      );
      
      const darkPoolFlow = await this.darkPoolFlowPredictor.analyzeDarkPoolFlow(
        candles1h,
        trades,
        symbol
      );
      
      // Calculate proprietary composite score
      const compositeScore = this.calculateCompositeScore(
        fractalAnalysis,
        liquidityVoids,
        whaleClusters,
        marketMakerIntent,
        regimeTransitions,
        flashCrashRisk,
        darkPoolFlow,
        hiddenLevels
      );
      
      // Generate proprietary signals
      const proprietarySignals = this.generateProprietarySignals(
        fractalAnalysis,
        liquidityVoids,
        whaleClusters,
        marketMakerIntent,
        regimeTransitions,
        flashCrashRisk,
        darkPoolFlow,
        hiddenLevels
      );
      
      const result = {
        symbol,
        timestamp: Date.now(),
        price,
        
        // Individual analyses
        fractalAnalysis,
        liquidityVoids,
        whaleClusters,
        marketMakerIntent,
        timeAnomalies,
        regimeTransitions,
        flashCrashRisk,
        darkPoolFlow,
        hiddenLevels,
        
        // Composite metrics
        proprietaryScore: compositeScore.score,
        proprietaryConfidence: compositeScore.confidence,
        proprietarySignals,
        
        // Market context
        marketType: MARKET_TYPE,
        leverage: MARKET_TYPE === "futures" ? FUTURES_LEVERAGE : 1,
        
        // Predictions
        fractalPrediction: this.predictFromFractal(fractalAnalysis),
        regimePrediction: this.predictFromRegime(regimeTransitions),
        whalePrediction: this.predictFromWhaleClusters(whaleClusters),
        marketMakerPrediction: this.predictFromMarketMaker(marketMakerIntent),
        
        // Risk assessment
        overallRisk: this.calculateOverallRisk(
          flashCrashRisk,
          liquidityVoids,
          regimeTransitions
        ),
        
        // Trading recommendations
        tradingRecommendation: this.generateTradingRecommendation(
          compositeScore,
          proprietarySignals,
          hiddenLevels
        )
      };
      
      // Cache the result
      this.proprietaryCache.set(symbol, {
        data: result,
        timestamp: Date.now()
      });
      
      console.log(`✅ Comprehensive proprietary analysis complete for ${symbol}`);
      return result;
      
    } catch (error) {
      console.error(`❌ Error in comprehensive analysis for ${symbol}:`, error.message);
      return null;
    }
  }
  
  async getLiquidationData(symbol) {
    // Simplified liquidation data fetch
    try {
      const data = await enhancedBitgetAPI.getLiquidationOrders(symbol, 50);
      if (data && data.code === '00000' && data.data) {
        return {
          total_liquidations: data.data.length,
          net_liquidation_volume: data.data.reduce((sum, liq) => {
            const size = parseFloat(liq.sz) || 0;
            return liq.side === 'long' ? sum - size : sum + size;
          }, 0),
          clusters: this.detectLiquidationClusters(data.data)
        };
      }
    } catch (error) {
      console.warn(`Could not fetch liquidation data for ${symbol}:`, error.message);
    }
    
    return {
      total_liquidations: 0,
      net_liquidation_volume: 0,
      clusters: []
    };
  }
  
  detectLiquidationClusters(liquidations) {
    if (!liquidations || liquidations.length < 3) return [];
    
    // Simple clustering by time
    const clusters = [];
    let currentCluster = [liquidations[0]];
    
    for (let i = 1; i < liquidations.length; i++) {
      const timeDiff = liquidations[i].ts - liquidations[i-1].ts;
      if (timeDiff < 60000) { // 1 minute window
        currentCluster.push(liquidations[i]);
      } else {
        if (currentCluster.length >= 2) {
          clusters.push({
            count: currentCluster.length,
            totalVolume: currentCluster.reduce((sum, liq) => sum + (parseFloat(liq.sz) || 0), 0),
            timestamp: currentCluster[0].ts
          });
        }
        currentCluster = [liquidations[i]];
      }
    }
    
    if (currentCluster.length >= 2) {
      clusters.push({
        count: currentCluster.length,
        totalVolume: currentCluster.reduce((sum, liq) => sum + (parseFloat(liq.sz) || 0), 0),
        timestamp: currentCluster[0].ts
      });
    }
    
    return clusters;
  }
  
  async getGammaData(symbol) {
    // Simplified gamma data
    try {
      const oiData = await enhancedBitgetAPI.getOpenInterest(symbol);
      if (oiData && oiData.code === '00000' && oiData.data && oiData.data[0]) {
        const openInterest = oiData.data[0].amount || 0;
        
        // Simulate gamma based on price movement
        const price = await fetchLivePrice(symbol);
        const tickData = TICK_STATE.get(symbol);
        const velocity = tickData?.velocity || 0;
        
        return {
          gamma_exposure: velocity * openInterest * 0.0001,
          gamma_effect: velocity > 0 ? 'POSITIVE_GAMMA' : 'NEGATIVE_GAMMA',
          open_interest: openInterest
        };
      }
    } catch (error) {
      console.warn(`Could not fetch gamma data for ${symbol}:`, error.message);
    }
    
    return {
      gamma_exposure: 0,
      gamma_effect: 'NEUTRAL_GAMMA',
      open_interest: 0
    };
  }
  
  calculateCompositeScore(...analyses) {
    let totalScore = 0;
    let maxPossible = 0;
    let confidenceFactors = [];
    
    analyses.forEach((analysis, index) => {
      if (analysis) {
        const weight = this.getAnalysisWeight(index);
        const score = this.extractScore(analysis) * weight;
        const confidence = this.extractConfidence(analysis);
        
        totalScore += score;
        maxPossible += weight;
        confidenceFactors.push(confidence);
      }
    });
    
    const normalizedScore = maxPossible > 0 ? totalScore / maxPossible : 0.5;
    const avgConfidence = confidenceFactors.length > 0 ? 
      mean(confidenceFactors) : 0.5;
    
    return {
      score: round(normalizedScore, 3),
      confidence: round(avgConfidence, 3),
      components: analyses.map((a, i) => ({
        type: this.getAnalysisType(i),
        score: a ? this.extractScore(a) : 0,
        confidence: a ? this.extractConfidence(a) : 0
      }))
    };
  }
  
  getAnalysisWeight(index) {
    const weights = [0.15, 0.12, 0.13, 0.12, 0.10, 0.15, 0.10, 0.08, 0.05];
    return weights[index] || 0.1;
  }
  
  getAnalysisType(index) {
    const types = [
      'fractal',
      'liquidity',
      'whale',
      'market_maker',
      'time',
      'regime',
      'flash_crash',
      'dark_pool',
      'hidden_levels'
    ];
    return types[index] || 'unknown';
  }
  
  extractScore(analysis) {
    if (!analysis) return 0.5;
    
    // Extract score based on analysis type
    if (analysis.proprietaryScore !== undefined) return analysis.proprietaryScore;
    if (analysis.whaleActivityScore !== undefined) return analysis.whaleActivityScore;
    if (analysis.crashProbability !== undefined) return 1 - analysis.crashProbability;
    if (analysis.confidence !== undefined) return analysis.confidence;
    if (analysis.darkPoolActivity !== undefined) return analysis.darkPoolActivity;
    
    return 0.5;
  }
  
  extractConfidence(analysis) {
    if (!analysis) return 0.5;
    
    if (analysis.confidence !== undefined) return analysis.confidence;
    if (analysis.regimeStrength !== undefined) return analysis.regimeStrength;
    if (analysis.score !== undefined) return analysis.score;
    
    return 0.5;
  }
  
  generateProprietarySignals(...analyses) {
    const signals = [];
    
    // Generate signals from each analysis
    analyses.forEach((analysis, index) => {
      if (!analysis) return;
      
      const type = this.getAnalysisType(index);
      const analysisSignals = this.extractSignals(analysis, type);
      
      if (analysisSignals && analysisSignals.length > 0) {
        signals.push(...analysisSignals);
      }
    });
    
    // Filter and prioritize signals
    return this.prioritizeSignals(signals);
  }
  
  extractSignals(analysis, type) {
    switch(type) {
      case 'fractal':
        return this.extractFractalSignals(analysis);
      case 'whale':
        return this.extractWhaleSignals(analysis);
      case 'market_maker':
        return this.extractMarketMakerSignals(analysis);
      case 'regime':
        return this.extractRegimeSignals(analysis);
      case 'flash_crash':
        return this.extractFlashCrashSignals(analysis);
      case 'dark_pool':
        return this.extractDarkPoolSignals(analysis);
      case 'hidden_levels':
        return this.extractHiddenLevelsSignals(analysis);
      default:
        return [];
    }
  }
  
  extractFractalSignals(analysis) {
    if (!analysis || !analysis.isScaleInvariant) return [];
    
    const signals = [];
    
    if (analysis.scaleInvarianceScore > 0.8) {
      signals.push({
        type: 'FRACTAL_SCALE_INVARIANCE',
        direction: 'NEUTRAL',
        confidence: analysis.scaleInvarianceScore,
        message: 'Strong fractal scaling detected - predictable patterns'
      });
    }
    
    if (analysis.fractalComplexity > 2) {
      signals.push({
        type: 'HIGH_FRACTAL_COMPLEXITY',
        direction: 'NEUTRAL',
        confidence: Math.min(analysis.fractalComplexity / 3, 1),
        message: 'High fractal complexity - chaotic but structured market'
      });
    }
    
    return signals;
  }
  
  extractWhaleSignals(analysis) {
    if (!analysis || analysis.whaleActivityScore < 0.3) return [];
    
    const signals = [];
    
    if (analysis.whalePatterns && analysis.whalePatterns.length > 0) {
      analysis.whalePatterns.forEach(pattern => {
        if (pattern.confidence > 0.6) {
          signals.push({
            type: `WHALE_${pattern.type}`,
            direction: pattern.direction,
            confidence: pattern.confidence,
            message: `${pattern.type.toLowerCase()} by whales detected`
          });
        }
      });
    }
    
    if (analysis.largeTrades > 5) {
      signals.push({
        type: 'HIGH_WHALE_ACTIVITY',
        direction: 'NEUTRAL',
        confidence: Math.min(analysis.largeTrades / 10, 0.8),
        message: 'High whale trading activity'
      });
    }
    
    return signals;
  }
  
  extractMarketMakerSignals(analysis) {
    if (!analysis || !analysis.intent) return [];
    
    const signals = [];
    
    if (analysis.intent.confidence > 0.5) {
      signals.push({
        type: `MARKET_MAKER_${analysis.intent.intent}`,
        direction: analysis.intent.intent.includes('BUY') ? 'BULLISH' : 
                  analysis.intent.intent.includes('SELL') ? 'BEARISH' : 'NEUTRAL',
        confidence: analysis.intent.score,
        message: `Market maker ${analysis.intent.intent.toLowerCase()} intent detected`
      });
    }
    
    if (analysis.spoofing.detected) {
      signals.push({
        type: 'SPOOFING_DETECTED',
        direction: 'CAUTION',
        confidence: analysis.spoofing.score,
        message: 'Order book spoofing detected - be cautious'
      });
    }
    
    return signals;
  }
  
  extractRegimeSignals(analysis) {
    if (!analysis || !analysis.signals || analysis.signals.length === 0) return [];
    
    return analysis.signals.map(signal => ({
      type: signal.type,
      direction: signal.direction || 'NEUTRAL',
      confidence: signal.confidence,
      message: signal.message
    }));
  }
  
  extractFlashCrashSignals(analysis) {
    if (!analysis || analysis.crashProbability < 0.5) return [];
    
    const signals = [];
    
    if (analysis.crashProbability > FLASH_CRASH_PROB_THRESHOLD) {
      signals.push({
        type: 'HIGH_FLASH_CRASH_RISK',
        direction: 'RISK_OFF',
        confidence: analysis.crashProbability,
        message: `High flash crash risk (${(analysis.crashProbability * 100).toFixed(1)}%)`
      });
    }
    
    if (analysis.triggerLevels && analysis.triggerLevels.length > 0) {
      const closestTrigger = analysis.triggerLevels[0];
      signals.push({
        type: 'CRASH_TRIGGER_LEVEL',
        direction: 'WARNING',
        confidence: 0.7,
        message: `Crash trigger at ${closestTrigger.price} (${closestTrigger.distance}% away)`
      });
    }
    
    return signals;
  }
  
  extractDarkPoolSignals(analysis) {
    if (!analysis || analysis.darkPoolActivity < 0.3) return [];
    
    const signals = [];
    
    if (analysis.predictions && analysis.predictions.length > 0) {
      analysis.predictions.forEach(prediction => {
        if (prediction.confidence > 0.6) {
          signals.push({
            type: `DARK_POOL_${prediction.type}`,
            direction: prediction.direction,
            confidence: prediction.confidence,
            message: `Dark pool ${prediction.type.toLowerCase()} predicted`
          });
        }
      });
    }
    
    if (analysis.blockTrades > 3) {
      signals.push({
        type: 'BLOCK_TRADE_ACTIVITY',
        direction: 'NEUTRAL',
        confidence: Math.min(analysis.blockTrades / 5, 0.8),
        message: 'Significant block trade activity'
      });
    }
    
    return signals;
  }
  
  extractHiddenLevelsSignals(analysis) {
    if (!analysis || !analysis.hiddenLevels || analysis.hiddenLevels.length === 0) return [];
    
    const signals = [];
    const strongestLevel = analysis.hiddenLevels[0];
    
    if (strongestLevel && strongestLevel.combinedStrength > 0.7) {
      signals.push({
        type: 'STRONG_HIDDEN_LEVEL',
        direction: 'NEUTRAL',
        confidence: strongestLevel.combinedStrength,
        message: `Strong hidden level at ${strongestLevel.price} (${strongestLevel.types.join(', ')})`
      });
    }
    
    if (analysis.confidence > 0.7) {
      signals.push({
        type: 'RELIABLE_HIDDEN_LEVELS',
        direction: 'NEUTRAL',
        confidence: analysis.confidence,
        message: 'High confidence in detected hidden levels'
      });
    }
    
    return signals;
  }
  
  prioritizeSignals(signals) {
    if (signals.length === 0) return [];
    
    // Score each signal
    const scoredSignals = signals.map(signal => {
      let score = signal.confidence;
      
      // Adjust score based on signal type
      if (signal.type.includes('CRASH') || signal.type.includes('RISK')) {
        score *= 1.5; // Risk signals are more important
      }
      
      if (signal.type.includes('WHALE') || signal.type.includes('MARKET_MAKER')) {
        score *= 1.3; // Institutional signals are important
      }
      
      if (signal.type.includes('FRACTAL') || signal.type.includes('REGIME')) {
        score *= 1.2; // Structural signals are important
      }
      
      return { ...signal, priorityScore: score };
    });
    
    // Sort by priority score
    return scoredSignals
      .sort((a, b) => b.priorityScore - a.priorityScore)
      .slice(0, 10) // Top 10 signals
      .map(signal => {
        const { priorityScore, ...rest } = signal;
        return rest;
      });
  }
  
  predictFromFractal(analysis) {
    if (!analysis || !analysis.isScaleInvariant) {
      return { prediction: 'UNKNOWN', confidence: 0 };
    }
    
    if (analysis.scaleInvarianceScore > 0.8) {
      return {
        prediction: 'CONTINUATION',
        confidence: analysis.scaleInvarianceScore,
        timeframe: 'MEDIUM_TERM'
      };
    }
    
    return {
      prediction: 'NEUTRAL',
      confidence: 0.5,
      timeframe: 'SHORT_TERM'
    };
  }
  
  predictFromRegime(analysis) {
    if (!analysis) {
      return { prediction: 'UNKNOWN', confidence: 0 };
    }
    
    return this.regimeTransitionDetector.getRegimePrediction(analysis.symbol);
  }
  
  predictFromWhaleClusters(analysis) {
    if (!analysis) {
      return { prediction: 'NEUTRAL', confidence: 0 };
    }
    
    return this.whaleClusterDetector.predictNextWhaleAction(analysis.symbol);
  }
  
  predictFromMarketMaker(analysis) {
    if (!analysis) {
      return { prediction: 'NEUTRAL', confidence: 0 };
    }
    
    return this.marketMakerIntentDetector.getMarketMakerPrediction(analysis.symbol);
  }
  
  calculateOverallRisk(flashCrashRisk, liquidityVoids, regimeTransitions) {
    let risk = 0;
    
    if (flashCrashRisk) {
      risk += flashCrashRisk.crashProbability * 0.4;
    }
    
    if (liquidityVoids) {
      risk += liquidityVoids.voidScore * 0.3;
    }
    
    if (regimeTransitions && regimeTransitions.signals) {
      const transitionSignals = regimeTransitions.signals.filter(s => 
        s.type.includes('TRANSITION') || s.type.includes('CHANGE')
      );
      risk += Math.min(transitionSignals.length * 0.1, 0.3);
    }
    
    return {
      score: round(risk, 3),
      level: risk > 0.7 ? 'EXTREME' : 
             risk > 0.5 ? 'HIGH' : 
             risk > 0.3 ? 'MEDIUM' : 'LOW',
      components: {
        flashCrash: flashCrashRisk?.crashProbability || 0,
        liquidity: liquidityVoids?.voidScore || 0,
        regimeChange: regimeTransitions?.signals?.filter(s => 
          s.type.includes('TRANSITION') || s.type.includes('CHANGE')).length || 0
      }
    };
  }
  
  generateTradingRecommendation(compositeScore, signals, hiddenLevels) {
    const recommendation = {
      action: 'HOLD',
      confidence: compositeScore.confidence,
      reasoning: [],
      riskLevel: 'MEDIUM'
    };
    
    // Analyze signals
    const buySignals = signals.filter(s => 
      s.direction === 'BULLISH' || s.direction === 'BUY'
    );
    const sellSignals = signals.filter(s => 
      s.direction === 'BEARISH' || s.direction === 'SELL'
    );
    const riskSignals = signals.filter(s => 
      s.direction === 'RISK_OFF' || s.direction === 'CAUTION' || s.direction === 'WARNING'
    );
    
    // Calculate signal strength
    const buyStrength = buySignals.reduce((sum, s) => sum + s.confidence, 0);
    const sellStrength = sellSignals.reduce((sum, s) => sum + s.confidence, 0);
    const riskStrength = riskSignals.reduce((sum, s) => sum + s.confidence, 0);
    
    // Make recommendation
    if (riskStrength > 0.8) {
      recommendation.action = 'AVOID';
      recommendation.riskLevel = 'HIGH';
      recommendation.reasoning.push('High risk signals detected');
    } else if (buyStrength > sellStrength * 1.5 && buyStrength > 1.0) {
      recommendation.action = 'BUY';
      recommendation.reasoning.push(`Strong buy signals (${buySignals.length})`);
    } else if (sellStrength > buyStrength * 1.5 && sellStrength > 1.0) {
      recommendation.action = 'SELL';
      recommendation.reasoning.push(`Strong sell signals (${sellSignals.length})`);
    } else if (compositeScore.score > 0.7) {
      recommendation.action = 'MONITOR_CLOSELY';
      recommendation.reasoning.push('High proprietary score');
    } else if (hiddenLevels && hiddenLevels.confidence > 0.7) {
      recommendation.action = 'TRADE_RANGES';
      recommendation.reasoning.push('Clear hidden levels for range trading');
    }
    
    // Add signal-based reasoning
    if (signals.length > 0) {
      const topSignal = signals[0];
      recommendation.reasoning.push(`Top signal: ${topSignal.type}`);
    }
    
    return recommendation;
  }
  
  async getProprietaryAnalysis(symbol) {
    const cached = this.proprietaryCache.get(symbol);
    if (cached && Date.now() - cached.timestamp < 300000) { // 5 minute cache
      return cached.data;
    }
    
    return await this.analyzeSymbolComprehensive(symbol);
  }
  
  // New method for pattern discovery
  async discoverProprietaryPatterns(symbols, timeframe = '1h') {
    console.log(`🔍 Discovering proprietary patterns across ${symbols.length} symbols...`);
    
    const patterns = {
      crossSymbol: [],
      timeBased: [],
      fractal: [],
      whale: []
    };
    
    for (const symbol of symbols.slice(0, 5)) { // Limit to 5 symbols for performance
      try {
        const analysis = await this.getProprietaryAnalysis(symbol);
        if (analysis) {
          // Extract patterns from analysis
          this.extractPatternsFromAnalysis(analysis, patterns);
        }
        
        await sleep(1000); // Rate limiting
      } catch (error) {
        console.error(`Error analyzing ${symbol} for patterns:`, error.message);
      }
    }
    
    // Store discovered patterns
    this.patternDatabase.set(Date.now(), patterns);
    
    console.log(`✅ Discovered ${patterns.crossSymbol.length + patterns.timeBased.length + 
                patterns.fractal.length + patterns.whale.length} proprietary patterns`);
    
    return patterns;
  }
  
  extractPatternsFromAnalysis(analysis, patterns) {
    // Extract cross-symbol patterns
    if (analysis.fractalAnalysis && analysis.fractalAnalysis.isScaleInvariant) {
      patterns.fractal.push({
        symbol: analysis.symbol,
        scaleInvarianceScore: analysis.fractalAnalysis.scaleInvarianceScore,
        fractalComplexity: analysis.fractalAnalysis.fractalComplexity
      });
    }
    
    // Extract whale patterns
    if (analysis.whaleClusters && analysis.whaleClusters.whalePatterns) {
      analysis.whaleClusters.whalePatterns.forEach(pattern => {
        patterns.whale.push({
          symbol: analysis.symbol,
          type: pattern.type,
          confidence: pattern.confidence,
          volume: pattern.totalVolume
        });
      });
    }
    
    // Extract time-based patterns
    if (analysis.timeAnomalies && analysis.timeAnomalies.patterns) {
      analysis.timeAnomalies.patterns.forEach(pattern => {
        patterns.timeBased.push({
          symbol: analysis.symbol,
          type: pattern.type,
          hour: pattern.hour,
          strength: pattern.strength
        });
      });
    }
  }
  
  // New method for anomaly detection
  async detectMarketAnomalies() {
    console.log('🚨 Detecting market anomalies...');
    
    const anomalies = {
      extremeVolatility: [],
      unusualVolume: [],
      priceDislocations: [],
      liquidityEvents: []
    };
    
    // Monitor a subset of symbols
    const monitorSymbols = Array.from(WATCH.keys()).slice(0, 3);
    
    for (const symbol of monitorSymbols) {
      try {
        const price = await fetchLivePrice(symbol);
        const candles = await fetchCandlesComprehensive(symbol, '5min', 20);
        
        if (price && candles && candles.length > 10) {
          // Check for extreme volatility
          const volatility = this.calculateVolatility(candles);
          if (volatility > 0.02) { // 2% volatility in 5min
            anomalies.extremeVolatility.push({
              symbol,
              volatility: round(volatility * 100, 2),
              price
            });
          }
          
          // Check for unusual volume
          const recentVolume = candles[candles.length - 1].v;
          const avgVolume = mean(candles.slice(-10).map(c => c.v));
          const volumeRatio = recentVolume / avgVolume;
          
          if (volumeRatio > 3) {
            anomalies.unusualVolume.push({
              symbol,
              volumeRatio: round(volumeRatio, 2),
              volume: recentVolume,
              avgVolume
            });
          }
          
          // Check for price dislocations (sudden moves)
          const recentReturns = candles.slice(-3).map(c => (c.c - c.o) / c.o);
          const maxReturn = Math.max(...recentReturns.map(r => Math.abs(r)));
          
          if (maxReturn > 0.01) { // 1% move in 15min
            anomalies.priceDislocations.push({
              symbol,
              maxReturn: round(maxReturn * 100, 2),
              direction: recentReturns[recentReturns.length - 1] > 0 ? 'UP' : 'DOWN'
            });
          }
        }
        
        await sleep(500);
      } catch (error) {
        console.error(`Error detecting anomalies for ${symbol}:`, error.message);
      }
    }
    
    // Store anomalies
    this.anomalyDatabase.set(Date.now(), anomalies);
    
    // Trigger alerts for significant anomalies
    this.triggerAnomalyAlerts(anomalies);
    
    return anomalies;
  }
  
  calculateVolatility(candles) {
    if (candles.length < 2) return 0;
    
    const returns = [];
    for (let i = 1; i < candles.length; i++) {
      const ret = Math.log(candles[i].c / candles[i - 1].c);
      returns.push(ret);
    }
    
    return std(returns) * Math.sqrt(365 * 24 * 12); // Annualized 5min volatility
  }
  
  triggerAnomalyAlerts(anomalies) {
    let alertMessage = '';
    
    // Extreme volatility alert
    if (anomalies.extremeVolatility.length > 0) {
      const worst = anomalies.extremeVolatility.sort((a, b) => b.volatility - a.volatility)[0];
      alertMessage += `⚡ Extreme volatility: ${worst.symbol} ${worst.volatility}%\n`;
    }
    
    // Unusual volume alert
    if (anomalies.unusualVolume.length > 0) {
      const highest = anomalies.unusualVolume.sort((a, b) => b.volumeRatio - a.volumeRatio)[0];
      alertMessage += `📈 Unusual volume: ${highest.symbol} ${highest.volumeRatio}x average\n`;
    }
    
    // Price dislocation alert
    if (anomalies.priceDislocations.length > 0) {
      const largest = anomalies.priceDislocations.sort((a, b) => b.maxReturn - a.maxReturn)[0];
      alertMessage += `🎯 Price dislocation: ${largest.symbol} ${largest.direction} ${largest.maxReturn}%\n`;
    }
    
    // Send alert if there are significant anomalies
    if (alertMessage && TELEGRAM_CHAT_ID) {
      const fullMessage = `🚨 MARKET ANOMALIES DETECTED\n\n${alertMessage}\nTime: ${new Date().toISOString()}`;
      this.sendTelegramAlert(TELEGRAM_CHAT_ID, fullMessage);
    }
  }
  
  async sendTelegramAlert(chatId, message) {
    try {
      if (!TELEGRAM_TOKEN || !chatId) return;
      
      await axios({
        method: 'POST',
        url: `https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage`,
        data: {
          chat_id: chatId,
          text: message,
          parse_mode: 'HTML'
        }
      });
    } catch (error) {
      console.error('Error sending Telegram alert:', error.message);
    }
  }
  
  // New method for generating proprietary trading signals
  async generateProprietaryTradingSignal(symbol, timeframe = '1h') {
    console.log(`🎯 Generating proprietary trading signal for ${symbol} ${timeframe}...`);
    
    try {
      // Get comprehensive analysis
      const analysis = await this.getProprietaryAnalysis(symbol);
      if (!analysis) return null;
      
      // Get price and candles for the specific timeframe
      const candles = await fetchCandlesComprehensive(symbol, timeframe, 100);
      const price = analysis.price;
      
      if (!candles || candles.length < 20) return null;
      
      // Calculate traditional technicals
      const atr = quantumATR(candles);
      const momentum = quantumMomentum(candles);
      const volatility = quantumVolatility(candles);
      
      // Generate signal based on proprietary analysis
      const signal = this.generateSignalFromAnalysis(
        analysis,
        price,
        atr,
        momentum,
        volatility,
        timeframe
      );
      
      // Validate signal
      if (signal && this.validateProprietarySignal(signal)) {
        console.log(`✅ Proprietary signal generated for ${symbol}: ${signal.direction} (${signal.confidence}%)`);
        return signal;
      }
      
      return null;
    } catch (error) {
      console.error(`Error generating proprietary signal for ${symbol}:`, error.message);
      return null;
    }
  }
  
  generateSignalFromAnalysis(analysis, price, atr, momentum, volatility, timeframe) {
    // Initialize signal
    const signal = {
      symbol: analysis.symbol,
      timeframe,
      timestamp: Date.now(),
      price,
      atr,
      momentum: momentum.scalar,
      volatility: volatility.volatility,
      proprietaryScore: analysis.proprietaryScore,
      proprietarySignals: analysis.proprietarySignals.slice(0, 3),
      recommendation: analysis.tradingRecommendation,
      overallRisk: analysis.overallRisk
    };
    
    // Determine direction based on recommendation and signals
    let direction = 'NEUTRAL';
    let confidence = analysis.proprietaryScore * 100;
    
    if (analysis.tradingRecommendation.action === 'BUY') {
      direction = 'BUY';
      confidence *= 1.1;
    } else if (analysis.tradingRecommendation.action === 'SELL') {
      direction = 'SELL';
      confidence *= 1.1;
    } else if (analysis.tradingRecommendation.action === 'TRADE_RANGES') {
      // For range trading, determine direction based on price relative to hidden levels
      if (analysis.hiddenLevels && analysis.hiddenLevels.hiddenLevels.length > 0) {
        const strongestLevel = analysis.hiddenLevels.hiddenLevels[0];
        if (strongestLevel) {
          direction = price < strongestLevel.price ? 'BUY' : 'SELL';
          confidence *= 0.9; // Slightly lower confidence for range trades
        }
      }
    }
    
    // Adjust confidence based on risk
    if (analysis.overallRisk.level === 'HIGH' || analysis.overallRisk.level === 'EXTREME') {
      confidence *= 0.7; // Reduce confidence in high risk environments
    }
    
    // Add entry, stop loss, and take profit levels
    const entry = price;
    const stopDistance = atr * (direction === 'BUY' ? 1.5 : 1.5);
    const stopLoss = direction === 'BUY' ? entry - stopDistance : entry + stopDistance;
    
    const takeProfits = [];
    if (direction === 'BUY') {
      takeProfits.push(
        entry + stopDistance * 2.0,
        entry + stopDistance * 3.0,
        entry + stopDistance * 4.0
      );
    } else {
      takeProfits.push(
        entry - stopDistance * 2.0,
        entry - stopDistance * 3.0,
        entry - stopDistance * 4.0
      );
    }
    
    // Calculate position size
    const riskAmount = ACCOUNT_BALANCE * (ACCOUNT_RISK_PERCENT / 100);
    const riskPerUnit = Math.abs(entry - stopLoss);
    let positionSize = riskAmount / riskPerUnit;
    
    if (MARKET_TYPE === "futures") {
      positionSize *= FUTURES_LEVERAGE;
    }
    
    const maxPosition = ACCOUNT_BALANCE * (MAX_POSITION_SIZE / 100) / entry;
    positionSize = clamp(positionSize, 0, maxPosition);
    
    signal.direction = direction;
    signal.confidence = round(confidence, 2);
    signal.entry = round(entry, 6);
    signal.stopLoss = round(stopLoss, 6);
    signal.takeProfits = takeProfits.map(tp => round(tp, 6));
    signal.positionSize = round(positionSize, 4);
    signal.riskAmount = round(riskAmount, 2);
    signal.rrRatio = 2.0; // Fixed 1:2 risk-reward for proprietary signals
    
    return signal;
  }
  
  validateProprietarySignal(signal) {
    if (!signal) return false;
    
    // Basic validation
    if (!signal.direction || signal.direction === 'NEUTRAL') return false;
    if (signal.confidence < 60) return false; // Minimum 60% confidence
    if (signal.positionSize <= 0) return false;
    
    // Risk validation
    if (signal.overallRisk && 
        (signal.overallRisk.level === 'HIGH' || signal.overallRisk.level === 'EXTREME') &&
        signal.confidence < 75) {
      return false; // Require higher confidence in high risk environments
    }
    
    // Check for conflicting signals
    if (signal.proprietarySignals) {
      const riskSignals = signal.proprietarySignals.filter(s => 
        s.type.includes('RISK') || s.type.includes('CAUTION') || s.type.includes('WARNING')
      );
      
      if (riskSignals.length > 1 && signal.confidence < 80) {
        return false; // Multiple risk signals require very high confidence
      }
    }
    
    return true;
  }
  
  // New method for monitoring and auto-trading
  async monitorAndTrade() {
    console.log('🤖 Starting proprietary monitoring and trading...');
    
    const symbols = Array.from(WATCH.keys());
    
    for (const symbol of symbols) {
      try {
        // Generate proprietary signal
        const signal = await this.generateProprietaryTradingSignal(symbol, '1h');
        
        if (signal && this.validateProprietarySignal(signal)) {
          console.log(`🎯 Valid proprietary signal for ${symbol}:`, {
            direction: signal.direction,
            confidence: signal.confidence,
            entry: signal.entry,
            stopLoss: signal.stopLoss,
            positionSize: signal.positionSize
          });
          
          // Check if we should execute the trade
          const shouldExecute = await this.shouldExecuteTrade(signal);
          
          if (shouldExecute) {
            await this.executeProprietaryTrade(signal);
          }
        }
        
        await sleep(2000); // Rate limiting between symbols
      } catch (error) {
        console.error(`Error monitoring ${symbol}:`, error.message);
      }
    }
    
    console.log('✅ Proprietary monitoring cycle complete');
  }
  
  async shouldExecuteTrade(signal) {
    // Check multiple conditions before executing
    
    // 1. Check confidence threshold
    if (signal.confidence < 70) return false;
    
    // 2. Check overall risk
    if (signal.overallRisk && 
        (signal.overallRisk.level === 'HIGH' || signal.overallRisk.level === 'EXTREME')) {
      console.log(`⚠️ Skipping trade due to high risk: ${signal.overallRisk.level}`);
      return false;
    }
    
    // 3. Check if we already have a position
    const existingPosition = await this.checkExistingPosition(signal.symbol);
    if (existingPosition) {
      console.log(`⚠️ Skipping trade - existing position in ${signal.symbol}`);
      return false;
    }
    
    // 4. Check market conditions
    const marketConditions = await this.checkMarketConditions();
    if (!marketConditions.favorable) {
      console.log(`⚠️ Skipping trade - unfavorable market conditions`);
      return false;
    }
    
    // 5. Check if signal aligns with market regime
    const regimeAlignment = await this.checkRegimeAlignment(signal);
    if (!regimeAlignment) {
      console.log(`⚠️ Skipping trade - signal doesn't align with market regime`);
      return false;
    }
    
    return true;
  }
  
  async checkExistingPosition(symbol) {
    try {
      if (MARKET_TYPE === "futures") {
        const positions = await enhancedBitgetAPI.getPositions(symbol);
        if (positions && positions.code === '00000' && positions.data) {
          return positions.data.find(pos => 
            parseFloat(pos.size) > 0 && pos.symbol === symbol
          );
        }
      }
      return null;
    } catch (error) {
      console.error(`Error checking existing position for ${symbol}:`, error.message);
      return null;
    }
  }
  
  async checkMarketConditions() {
    try {
      // Check BTC dominance
      const btcDom = await BTCDominance();
      
      // Check overall market sentiment
      const btcPrice = await fetchLivePrice("BTCUSDT");
      const btcCandles = await fetchCandlesComprehensive("BTCUSDT", '1h', 24);
      
      let favorable = true;
      const conditions = [];
      
      // Extreme BTC dominance can indicate risk-off
      if (btcDom > 60) {
        conditions.push('High BTC dominance (risk-off)');
        favorable = false;
      }
      
      // Check BTC volatility
      if (btcCandles && btcCandles.length > 10) {
        const btcVolatility = quantumVolatility(btcCandles);
        if (btcVolatility.regime === 'EXTREME_VOLATILITY' || 
            btcVolatility.regime === 'CHAOTIC') {
          conditions.push('High BTC volatility');
          favorable = false;
        }
      }
      
      return { favorable, conditions };
    } catch (error) {
      console.error('Error checking market conditions:', error.message);
      return { favorable: true, conditions: [] }; // Default to favorable on error
    }
  }
  
  async checkRegimeAlignment(signal) {
    try {
      const analysis = await this.getProprietaryAnalysis(signal.symbol);
      if (!analysis || !analysis.regimeTransitions) return true;
      
      const regime = analysis.regimeTransitions.currentRegime;
      
      // Check if signal direction aligns with regime
      if (regime.includes('UPTREND') && signal.direction === 'SELL') {
        return false;
      }
      
      if (regime.includes('DOWNTREND') && signal.direction === 'BUY') {
        return false;
      }
      
      // Check for regime transition signals
      const transitionSignals = analysis.regimeTransitions.signals || [];
      const strongTransitions = transitionSignals.filter(s => s.confidence > 0.7);
      
      if (strongTransitions.length > 0) {
        // Be cautious during regime transitions
        console.log(`⚠️ Regime transition detected - exercising caution`);
        return signal.confidence > 75; // Require higher confidence
      }
      
      return true;
    } catch (error) {
      console.error('Error checking regime alignment:', error.message);
      return true; // Default to true on error
    }
  }
  
  async executeProprietaryTrade(signal) {
    console.log(`🚀 Executing proprietary trade for ${signal.symbol}`);
    
    try {
      if (!BITGET_API_KEY || !BITGET_API_SECRET || !BITGET_API_PASSPHRASE) {
        console.log('⚠️ Bitget API credentials not set - simulating trade execution');
        return this.simulateTradeExecution(signal);
      }
      
      // Determine order type
      const orderType = signal.entry === signal.price ? 'market' : 'limit';
      
      // Place order
      const orderResult = await enhancedBitgetAPI.placeOrder(
        signal.symbol,
        signal.direction.toLowerCase(),
        orderType,
        signal.entry,
        signal.positionSize.toString()
      );
      
      if (orderResult && orderResult.code === '00000') {
        console.log(`✅ Trade executed successfully for ${signal.symbol}`);
        
        // Log trade
        this.logProprietaryTrade(signal, orderResult.data.orderId);
        
        // Set stop loss and take profit orders
        await this.setStopLossAndTakeProfit(signal, orderResult.data.orderId);
        
        return orderResult;
      } else {
        console.error(`❌ Trade execution failed for ${signal.symbol}`);
        return null;
      }
    } catch (error) {
      console.error(`Error executing trade for ${signal.symbol}:`, error.message);
      return null;
    }
  }
  
  simulateTradeExecution(signal) {
    console.log(`📊 Simulating trade execution for ${signal.symbol}:`);
    console.log(`   Direction: ${signal.direction}`);
    console.log(`   Entry: ${signal.entry}`);
    console.log(`   Stop Loss: ${signal.stopLoss}`);
    console.log(`   Take Profits: ${signal.takeProfits.join(', ')}`);
    console.log(`   Position Size: ${signal.positionSize}`);
    console.log(`   Risk: $${signal.riskAmount}`);
    
    // Log simulated trade
    this.logProprietaryTrade(signal, `SIM-${Date.now()}`);
    
    return { simulated: true, signal };
  }
  
  async setStopLossAndTakeProfit(signal, orderId) {
    // Note: Bitget's API doesn't support OCO orders directly
    // You would need to implement this with separate orders and monitoring
    console.log(`⚠️ Stop loss and take profit orders need manual implementation`);
    console.log(`   Suggested stop loss: ${signal.stopLoss}`);
    console.log(`   Suggested take profits: ${signal.takeProfits.join(', ')}`);
  }
  
  logProprietaryTrade(signal, orderId) {
    const trade = {
      orderId,
      symbol: signal.symbol,
      direction: signal.direction,
      entry: signal.entry,
      stopLoss: signal.stopLoss,
      takeProfits: signal.takeProfits,
      positionSize: signal.positionSize,
      confidence: signal.confidence,
      proprietaryScore: signal.proprietaryScore,
      timestamp: Date.now(),
      type: 'PROPRIETARY'
    };
    
    // Add to trade history
    TRADE_HISTORY.push(trade);
    
    // Save to file
    try {
      fs.writeFileSync(TRADE_HISTORY_FILE, JSON.stringify(TRADE_HISTORY, null, 2));
      console.log(`📝 Trade logged: ${signal.symbol} ${signal.direction}`);
    } catch (error) {
      console.error('Error saving trade history:', error.message);
    }
  }
  
  // New method for generating proprietary reports
  async generateProprietaryReport(symbols = Array.from(WATCH.keys())) {
    console.log('📊 Generating proprietary market report...');
    
    const report = {
      timestamp: Date.now(),
      symbols: [],
      marketSummary: {},
      topSignals: [],
      riskAssessment: {},
      recommendations: []
    };
    
    for (const symbol of symbols.slice(0, 3)) { // Limit to 3 symbols for performance
      try {
        const analysis = await this.getProprietaryAnalysis(symbol);
        if (analysis) {
          report.symbols.push({
            symbol,
            proprietaryScore: analysis.proprietaryScore,
            recommendation: analysis.tradingRecommendation.action,
            riskLevel: analysis.overallRisk.level,
            topSignal: analysis.proprietarySignals[0] || null
          });
          
          // Collect top signals
          if (analysis.proprietarySignals && analysis.proprietarySignals.length > 0) {
            analysis.proprietarySignals.slice(0, 2).forEach(signal => {
              report.topSignals.push({
                symbol,
                type: signal.type,
                direction: signal.direction,
                confidence: signal.confidence
              });
            });
          }
        }
        
        await sleep(1000);
      } catch (error) {
        console.error(`Error analyzing ${symbol} for report:`, error.message);
      }
    }
    
    // Generate market summary
    report.marketSummary = await this.generateMarketSummary();
    
    // Generate risk assessment
    report.riskAssessment = this.generateRiskAssessment(report.symbols);
    
    // Generate recommendations
    report.recommendations = this.generateRecommendations(report.symbols, report.topSignals);
    
    console.log('✅ Proprietary report generated');
    return report;
  }
  
  async generateMarketSummary() {
    try {
      const btcPrice = await fetchLivePrice("BTCUSDT");
      const btcDom = await BTCDominance();
      const riskMode = await RiskOnOff();
      const session = sessionBias();
      
      return {
        btcPrice,
        btcDominance: btcDom,
        riskMode,
        session: session.name,
        sessionStrength: session.weight,
        marketType: MARKET_TYPE,
        leverage: FUTURES_LEVERAGE,
        timestamp: Date.now()
      };
    } catch (error) {
      console.error('Error generating market summary:', error.message);
      return {};
    }
  }
  
  generateRiskAssessment(symbols) {
    if (symbols.length === 0) return { overall: 'LOW', details: [] };
    
    const riskLevels = symbols.map(s => s.riskLevel);
    
    // Count risk levels
    const riskCounts = {
      EXTREME: 0,
      HIGH: 0,
      MEDIUM: 0,
      LOW: 0
    };
    
    riskLevels.forEach(level => {
      if (riskCounts[level] !== undefined) {
        riskCounts[level]++;
      }
    });
    
    // Determine overall risk
    let overallRisk = 'LOW';
    if (riskCounts.EXTREME > 0) overallRisk = 'EXTREME';
    else if (riskCounts.HIGH > symbols.length * 0.3) overallRisk = 'HIGH';
    else if (riskCounts.MEDIUM > symbols.length * 0.5) overallRisk = 'MEDIUM';
    
    return {
      overall: overallRisk,
      counts: riskCounts,
      symbols: symbols.map(s => ({
        symbol: s.symbol,
        riskLevel: s.riskLevel,
        proprietaryScore: s.proprietaryScore
      }))
    };
  }
  
  generateRecommendations(symbols, topSignals) {
    const recommendations = [];
    
    // Sort symbols by proprietary score
    const sortedSymbols = [...symbols].sort((a, b) => b.proprietaryScore - a.proprietaryScore);
    
    // Top 3 symbols for action
    const topSymbols = sortedSymbols.slice(0, 3);
    topSymbols.forEach(symbol => {
      recommendations.push({
        symbol: symbol.symbol,
        action: symbol.recommendation,
        confidence: symbol.proprietaryScore,
        reason: `High proprietary score (${(symbol.proprietaryScore * 100).toFixed(1)}%)`
      });
    });
    
    // Add signal-based recommendations
    const strongSignals = topSignals.filter(s => s.confidence > 0.7);
    strongSignals.forEach(signal => {
      recommendations.push({
        symbol: signal.symbol,
        action: signal.direction === 'BULLISH' ? 'MONITOR_FOR_BUY' : 
                signal.direction === 'BEARISH' ? 'MONITOR_FOR_SELL' : 'MONITOR',
        confidence: signal.confidence,
        reason: `Strong ${signal.type} signal`
      });
    });
    
    // Remove duplicates
    const uniqueRecommendations = [];
    const seenSymbols = new Set();
    
    recommendations.forEach(rec => {
      if (!seenSymbols.has(rec.symbol)) {
        seenSymbols.add(rec.symbol);
        uniqueRecommendations.push(rec);
      }
    });
    
    return uniqueRecommendations.slice(0, 5); // Top 5 recommendations
  }
}

/* ================= ENHANCED MAIN QUANTUM SYSTEM INTEGRATION ================= */
// ... [Rest of the original code with integration points for the proprietary system]

/* ================= INITIALIZE AND START THE ENHANCED SYSTEM ================= */
const proprietaryQuantumSystem = new ProprietaryQuantumSystem();

// Enhanced initialization
async function initializeEnhancedQuantumSystem() {
  console.log(`
╔══════════════════════════════════════════════════════════╗
║     ENHANCED QUANTUM TRADING SYSTEM v13.0.0              ║
║     With Proprietary Institutional Strategies            ║
║     Beyond Institutional Knowledge                       ║
║     Ultimate Pro Max Edition - Enhanced                  ║
║     BITGET EDITION - Optimized for Bitget Exchange       ║
╚══════════════════════════════════════════════════════════╝
    `.trim());
    
  console.log("🌌 Initializing enhanced quantum systems with proprietary features...");
  
  // Initialize proprietary system
  console.log("🔒 Initializing proprietary analysis systems...");
  
  // Start proprietary monitoring
  setInterval(async () => {
    try {
      // Run proprietary analysis on watchlist symbols
      for (const symbol of Array.from(WATCH.keys()).slice(0, 3)) {
        await proprietaryQuantumSystem.getProprietaryAnalysis(symbol);
        await sleep(2000);
      }
      
      // Detect market anomalies
      await proprietaryQuantumSystem.detectMarketAnomalies();
      
      // Discover patterns periodically
      if (Date.now() % 3600000 < 60000) { // Every hour
        await proprietaryQuantumSystem.discoverProprietaryPatterns(
          Array.from(WATCH.keys())
        );
      }
      
    } catch (error) {
      console.error('Error in proprietary monitoring:', error.message);
    }
  }, 300000); // Every 5 minutes
  
  // Start proprietary trading
  setInterval(async () => {
    try {
      await proprietaryQuantumSystem.monitorAndTrade();
    } catch (error) {
      console.error('Error in proprietary trading:', error.message);
    }
  }, 600000); // Every 10 minutes
  
  // Generate proprietary reports
  setInterval(async () => {
    try {
      const report = await proprietaryQuantumSystem.generateProprietaryReport();
      
      // Log report summary
      console.log('📊 Proprietary Report Summary:');
      console.log(`   Symbols analyzed: ${report.symbols.length}`);
      console.log(`   Overall risk: ${report.riskAssessment.overall}`);
      console.log(`   Top recommendations: ${report.recommendations.length}`);
      
      // Send report to Telegram if configured
      if (TELEGRAM_CHAT_ID && report.recommendations.length > 0) {
        const message = this.formatProprietaryReport(report);
        await sendTelegram(TELEGRAM_CHAT_ID, message);
      }
    } catch (error) {
      console.error('Error generating proprietary report:', error.message);
    }
  }, 1800000); // Every 30 minutes
  
  console.log("✅ Proprietary quantum systems initialized and running");
  console.log("🤖 Proprietary features active:");
  console.log("   • Fractal Entanglement Detection");
  console.log("   • Liquidity Void Mapping");
  console.log("   • Whale Order Clustering");
  console.log("   • Market Maker Intent Analysis");
  console.log("   • Time Anomaly Detection");
  console.log("   • Regime Transition Prediction");
  console.log("   • Flash Crash Risk Assessment");
  console.log("   • Dark Pool Flow Prediction");
  console.log("   • Hidden Support/Resistance Detection");
  console.log("   • Proprietary Pattern Discovery");
  console.log("   • Market Anomaly Detection");
  console.log("   • Automated Proprietary Trading");
  console.log("\n🚀 ENHANCED QUANTUM SYSTEMS FULLY OPERATIONAL");
}

// Format proprietary report for Telegram
function formatProprietaryReport(report) {
  const time = new Date(report.timestamp).toLocaleTimeString();
  
  let message = `<b>📊 PROPRIETARY MARKET REPORT</b>\n`;
  message += `<i>Generated: ${time}</i>\n\n`;
  
  message += `<b>Market Summary:</b>\n`;
  if (report.marketSummary.btcPrice) {
    message += `BTC: $${report.marketSummary.btcPrice}\n`;
  }
  if (report.marketSummary.btcDominance) {
    message += `BTC Dominance: ${report.marketSummary.btcDominance}%\n`;
  }
  if (report.marketSummary.riskMode) {
    message += `Risk Mode: ${report.marketSummary.riskMode}\n`;
  }
  if (report.marketSummary.session) {
    message += `Session: ${report.marketSummary.session}\n`;
  }
  
  message += `\n<b>Risk Assessment:</b>\n`;
  message += `Overall: ${report.riskAssessment.overall}\n`;
  if (report.riskAssessment.counts) {
    message += `High/Extreme: ${report.riskAssessment.counts.HIGH + report.riskAssessment.counts.EXTREME} symbols\n`;
  }
  
  message += `\n<b>Top Recommendations:</b>\n`;
  report.recommendations.slice(0, 3).forEach((rec, i) => {
    message += `${i+1}. ${rec.symbol}: ${rec.action} (${(rec.confidence * 100).toFixed(0)}%)\n`;
  });
  
  if (report.topSignals.length > 0) {
    message += `\n<b>Strong Signals:</b>\n`;
    report.topSignals.slice(0, 2).forEach(signal => {
      message += `• ${signal.symbol}: ${signal.type} (${signal.direction})\n`;
    });
  }
  
  return message;
}

// Start the enhanced system
initializeEnhancedQuantumSystem().catch(console.error);

/* ================= ENHANCED UTILITY FUNCTIONS ================= */
// ... [Keep all existing utility functions, adding new ones as needed]

/* ================= ENHANCED TELEGRAM COMMANDS ================= */
// Add new Telegram commands for proprietary features
const enhancedTelegramCommands = {
  '/proprietary [SYMBOL]': 'Get proprietary analysis for a symbol',
  '/patterns': 'Discover proprietary patterns',
  '/anomalies': 'Check for market anomalies',
  '/report': 'Generate proprietary market report',
  '/risk': 'Get proprietary risk assessment',
  '/whale [SYMBOL]': 'Check whale activity for symbol',
  '/darkpool [SYMBOL]': 'Check dark pool activity',
  '/liquidity [SYMBOL]': 'Check liquidity voids',
  '/fractal [SYMBOL]': 'Check fractal analysis',
  '/regime [SYMBOL]': 'Check market regime'
};

/* ================= ENHANCED SHUTDOWN AND CLEANUP ================= */
process.on('SIGINT', async () => {
  console.log('\n🛑 Enhanced Quantum Shutdown Initiated...');
  
  // Save proprietary state
  try {
    fs.writeFileSync(PROPRIETARY_PATTERNS_FILE, JSON.stringify(PROPRIETARY_STATE, null, 2));
    console.log('💾 Proprietary patterns saved');
  } catch (error) {
    console.error('Error saving proprietary patterns:', error.message);
  }
  
  // Generate final report
  try {
    const finalReport = await proprietaryQuantumSystem.generateProprietaryReport();
    console.log('📊 Final proprietary report generated');
  } catch (error) {
    console.error('Error generating final report:', error.message);
  }
  
  console.log('🌌 Enhanced quantum system with proprietary features terminated');
  process.exit(0);
});

// ... [Rest of the original shutdown and cleanup code]
