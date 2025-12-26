#!/usr/bin/env node
'use strict';

// ==================== CONFIGURATION ====================
const {
  // System Configuration
  PORT = 3000,
  MODE = 'paper', // 'paper' or 'live'
  NODE_ENV = 'production',
  
  // Telegram Configuration
  TELEGRAM_BOT_TOKEN,
  TELEGRAM_CHAT_ID,
  
  // Trading Parameters
  ACCOUNT_EQUITY = 10000,
  DEFAULT_RISK_PCT = 1.0,
  DAILY_DRAWDOWN_LIMIT = 0.03,
  MAX_POSITIONS = 3,
  MAX_DAILY_TRADES = 10,
  
  // Exchange API Keys (LIVE - BE CAREFUL!)
  BINANCE_API_KEY,
  BINANCE_API_SECRET,
  BYBIT_API_KEY,
  BYBIT_API_SECRET,
  KUCOIN_API_KEY,
  KUCOIN_API_SECRET,
  COINBASE_API_KEY,
  COINBASE_API_SECRET,
  
  // Traditional Markets
  ALPACA_API_KEY,
  ALPACA_SECRET_KEY,
  ALPACA_BASE_URL = 'https://paper-api.alpaca.markets/v2',
  
  // Data APIs
  FINNHUB_API_KEY,
  ALPHA_VANTAGE_API_KEY,
  TWELVE_DATA_API_KEY,
  POLYGON_API_KEY,
  
  // AI Settings
  ENABLE_AI_STRATEGY_SELECTION = 'true',
  LOG_LEVEL = 'info',
  
  // Security
  JWT_SECRET = 'ai-trading-secret-' + Date.now(),
  API_RATE_LIMIT = 100
  
} = process.env;

// ==================== REAL LOGGER ====================
class RealLogger {
  constructor() {
    this.levels = { error: 0, warn: 1, info: 2, debug: 3 };
    this.level = this.levels[LOG_LEVEL] || 1;
    this.logFile = 'trading_system.log';
    this.tradeLogFile = 'live_trades.log';
    this.initLogFile();
  }
  
  initLogFile() {
    const fs = require('fs');
    const header = `\n\n=== AI TRADING SYSTEM LIVE - ${new Date().toISOString()} ===\n`;
    fs.appendFileSync(this.logFile, header);
    
    if (MODE === 'live') {
      const liveHeader = `\n\n=== LIVE TRADING STARTED - ${new Date().toISOString()} ===\n`;
      fs.appendFileSync(this.tradeLogFile, liveHeader);
    }
  }
  
  log(level, message, data = null) {
    if (this.levels[level] <= this.level) {
      const timestamp = new Date().toISOString();
      const logEntry = `${timestamp} [${level.toUpperCase()}] ${message}` + 
                       (data ? ` | ${JSON.stringify(data)}` : '');
      
      console.log(logEntry);
      
      const fs = require('fs');
      fs.appendFileSync(this.logFile, logEntry + '\n');
    }
  }
  
  info(message, data) { this.log('info', message, data); }
  error(message, data) { this.log('error', message, data); }
  warn(message, data) { this.log('warn', message, data); }
  debug(message, data) { this.log('debug', message, data); }
  
  tradeSignal(symbol, direction, entry, sl, tp, quantity, exchange, orderId = null) {
    const signal = {
      timestamp: Date.now(),
      symbol,
      direction,
      entry,
      stopLoss: sl,
      takeProfit: tp,
      quantity,
      exchange,
      orderId,
      mode: MODE,
      type: MODE === 'live' ? 'LIVE_TRADE' : 'PAPER_TRADE'
    };
    
    const modeEmoji = MODE === 'live' ? '🚀' : '📝';
    const message = `${modeEmoji} ${direction} ${symbol} @ $${entry} | Qty: ${quantity} | SL: $${sl} | TP: $${tp.join('/')}`;
    this.log('info', message, signal);
    
    const fs = require('fs');
    fs.appendFileSync('trade_signals.jsonl', JSON.stringify(signal) + '\n');
    
    if (MODE === 'live') {
      fs.appendFileSync(this.tradeLogFile, `${new Date().toISOString()} - ${message}\n`);
    }
  }
  
  liveTradeAlert(message, data = null) {
    const alert = {
      timestamp: Date.now(),
      type: 'LIVE_TRADE_ALERT',
      message,
      data,
      mode: MODE
    };
    
    this.log('info', `🚨 ${message}`, alert);
    
    if (MODE === 'live') {
      const fs = require('fs');
      fs.appendFileSync(this.tradeLogFile, `${new Date().toISOString()} - 🚨 ${message}\n`);
    }
  }
}

const logger = new RealLogger();

// ==================== REAL HTTP CLIENT ====================
class RealHttpClient {
  constructor() {
    this.https = require('https');
    this.http = require('http');
    this.crypto = require('crypto');
    this.cache = new Map();
    this.rateLimits = new Map();
    this.userAgent = 'AI_Trading_System/5.0';
    this.activeRequests = new Map();
  }
  
  async request(method, url, options = {}) {
    const requestId = Math.random().toString(36).substr(2, 9);
    this.activeRequests.set(requestId, { url, started: Date.now() });
    
    try {
      const cacheKey = `${method}:${url}:${JSON.stringify(options.body || {})}`;
      const cacheTTL = options.cacheTTL || 0;
      
      if (cacheTTL > 0 && this.cache.has(cacheKey)) {
        const cached = this.cache.get(cacheKey);
        if (Date.now() - cached.timestamp < cacheTTL) {
          this.activeRequests.delete(requestId);
          return cached.data;
        }
      }
      
      const domain = new URL(url).hostname;
      const now = Date.now();
      const window = 60000;
      const maxRequests = 30;
      
      if (!this.rateLimits.has(domain)) {
        this.rateLimits.set(domain, []);
      }
      
      const requests = this.rateLimits.get(domain);
      const recent = requests.filter(time => now - time < window);
      
      if (recent.length >= maxRequests) {
        const oldest = Math.min(...recent);
        const waitTime = window - (now - oldest);
        await this.sleep(waitTime);
      }
      
      return new Promise((resolve, reject) => {
        const parsedUrl = new URL(url);
        const isHttps = parsedUrl.protocol === 'https:';
        const client = isHttps ? this.https : this.http;
        
        const reqOptions = {
          hostname: parsedUrl.hostname,
          port: parsedUrl.port || (isHttps ? 443 : 80),
          path: parsedUrl.pathname + parsedUrl.search,
          method: method,
          headers: {
            'User-Agent': this.userAgent,
            'Accept': 'application/json',
            ...options.headers
          },
          timeout: options.timeout || 10000
        };
        
        const req = client.request(reqOptions, (res) => {
          let data = '';
          let chunks = [];
          
          res.on('data', chunk => {
            data += chunk;
            chunks.push(chunk);
          });
          
          res.on('end', () => {
            this.activeRequests.delete(requestId);
            
            requests.push(Date.now());
            this.rateLimits.set(domain, requests.slice(-maxRequests * 2));
            
            const response = {
              status: res.statusCode,
              headers: res.headers,
              data: options.binary ? Buffer.concat(chunks) : data,
              text: data
            };
            
            try {
              if (options.json !== false && data) {
                response.json = JSON.parse(data);
              }
            } catch (e) {
              // Not JSON
            }
            
            if (res.statusCode >= 400) {
              reject(new Error(`HTTP ${res.statusCode}: ${data.substring(0, 200)}`));
            } else {
              if (cacheTTL > 0) {
                this.cache.set(cacheKey, {
                  timestamp: Date.now(),
                  data: response
                });
              }
              resolve(response);
            }
          });
        });
        
        req.on('error', (err) => {
          this.activeRequests.delete(requestId);
          reject(err);
        });
        
        req.on('timeout', () => {
          req.destroy();
          this.activeRequests.delete(requestId);
          reject(new Error(`Request timeout after ${reqOptions.timeout}ms`));
        });
        
        if (options.body) {
          if (typeof options.body === 'string') {
            req.write(options.body);
          } else if (options.formData) {
            const boundary = '----WebKitFormBoundary' + Math.random().toString(16);
            req.setHeader('Content-Type', `multipart/form-data; boundary=${boundary}`);
            
            let body = '';
            Object.entries(options.body).forEach(([key, value]) => {
              body += `--${boundary}\r\n`;
              body += `Content-Disposition: form-data; name="${key}"\r\n\r\n`;
              body += `${value}\r\n`;
            });
            body += `--${boundary}--\r\n`;
            req.write(body);
          } else {
            req.setHeader('Content-Type', 'application/json');
            req.write(JSON.stringify(options.body));
          }
        }
        
        req.end();
      });
    } catch (error) {
      this.activeRequests.delete(requestId);
      throw error;
    }
  }
  
  async get(url, options = {}) {
    return this.request('GET', url, options);
  }
  
  async post(url, data, options = {}) {
    return this.request('POST', url, { ...options, body: data });
  }
  
  async sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
  
  createSignature(secret, data) {
    return this.crypto.createHmac('sha256', secret).update(data).digest('hex');
  }
}

const http = new RealHttpClient();

// ==================== REAL MARKET DATA ====================
class RealMarketData {
  constructor() {
    this.apis = this.setupAPIs();
    this.cache = new Map();
    logger.info('Real Market Data initialized');
  }
  
  setupAPIs() {
    return {
      binance: {
        base: 'https://api.binance.com',
        futures: 'https://fapi.binance.com',
        spot: 'https://api.binance.com',
        hasKey: !!BINANCE_API_KEY
      },
      bybit: {
        base: 'https://api.bybit.com',
        futures: 'https://api.bybit.com',
        spot: 'https://api.bybit.com',
        hasKey: !!BYBIT_API_KEY
      },
      kucoin: {
        base: 'https://api.kucoin.com',
        futures: 'https://api-futures.kucoin.com',
        spot: 'https://api.kucoin.com',
        hasKey: !!KUCOIN_API_KEY
      },
      coinbase: {
        base: 'https://api.coinbase.com',
        pro: 'https://api.pro.coinbase.com',
        hasKey: !!COINBASE_API_KEY
      },
      alpaca: {
        base: MODE === 'live' ? 'https://api.alpaca.markets/v2' : ALPACA_BASE_URL,
        hasKey: !!ALPACA_API_KEY
      },
      finnhub: {
        base: 'https://finnhub.io/api/v1',
        hasKey: !!FINNHUB_API_KEY
      },
      alphaVantage: {
        base: 'https://www.alphavantage.co/query',
        hasKey: !!ALPHA_VANTAGE_API_KEY
      },
      twelveData: {
        base: 'https://api.twelvedata.com',
        hasKey: !!TWELVE_DATA_API_KEY
      },
      polygon: {
        base: 'https://api.polygon.io/v2',
        hasKey: !!POLYGON_API_KEY
      },
      yahoo: 'https://query1.finance.yahoo.com/v8/finance/chart',
      coinGecko: 'https://api.coingecko.com/api/v3',
      coinPaprika: 'https://api.coinpaprika.com/v1',
      financialModeling: 'https://financialmodelingprep.com/api/v3'
    };
  }
  
  async getOHLCV(symbol, timeframe = '1h', limit = 200) {
    const cacheKey = `${symbol}:${timeframe}:${limit}`;
    const cached = this.cache.get(cacheKey);
    
    if (cached && Date.now() - cached.timestamp < 30000) {
      return cached.data;
    }
    
    try {
      const data = await this.fetchFromBinance(symbol, timeframe, limit);
      
      if (data && data.length > 0) {
        this.cache.set(cacheKey, { timestamp: Date.now(), data });
        return data;
      }
      
      throw new Error('No data available');
      
    } catch (error) {
      logger.error(`Market data failed for ${symbol}:`, error.message);
      throw error;
    }
  }
  
  async fetchFromBinance(symbol, timeframe, limit) {
    try {
      const interval = this.mapTimeframe(timeframe);
      const binanceSymbol = symbol.replace('/', '').toUpperCase();
      
      const response = await http.get(
        `${this.apis.binance.base}/api/v3/klines?symbol=${binanceSymbol}&interval=${interval}&limit=${limit}`,
        { timeout: 8000 }
      );
      
      if (response.json && Array.isArray(response.json)) {
        return response.json.map(candle => ({
          timestamp: candle[0],
          open: parseFloat(candle[1]),
          high: parseFloat(candle[2]),
          low: parseFloat(candle[3]),
          close: parseFloat(candle[4]),
          volume: parseFloat(candle[5]),
          closeTime: candle[6],
          quoteVolume: parseFloat(candle[7]),
          trades: candle[8]
        }));
      }
    } catch (error) {
      logger.debug(`Binance failed: ${error.message}`);
    }
    return null;
  }
  
  async getCurrentPrice(symbol) {
    try {
      const binanceSymbol = symbol.replace('/', '').toUpperCase();
      const response = await http.get(
        `https://api.binance.com/api/v3/ticker/price?symbol=${binanceSymbol}`,
        { timeout: 5000 }
      );
      
      if (response.json) {
        return parseFloat(response.json.price);
      }
    } catch (error) {
      logger.error(`Price fetch failed: ${error.message}`);
    }
    
    return null;
  }
  
  async getOrderBook(symbol, limit = 20) {
    try {
      const binanceSymbol = symbol.replace('/', '').toUpperCase();
      const response = await http.get(
        `https://api.binance.com/api/v3/depth?symbol=${binanceSymbol}&limit=${limit}`,
        { timeout: 5000 }
      );
      
      if (response.json) {
        return {
          bids: response.json.bids.map(bid => ({ price: parseFloat(bid[0]), quantity: parseFloat(bid[1]) })),
          asks: response.json.asks.map(ask => ({ price: parseFloat(ask[0]), quantity: parseFloat(ask[1]) }))
        };
      }
    } catch (error) {
      logger.error(`Order book fetch failed: ${error.message}`);
    }
    
    return null;
  }
  
  async get24hStats(symbol) {
    try {
      const binanceSymbol = symbol.replace('/', '').toUpperCase();
      const response = await http.get(
        `https://api.binance.com/api/v3/ticker/24hr?symbol=${binanceSymbol}`,
        { timeout: 5000 }
      );
      
      if (response.json) {
        return {
          priceChange: parseFloat(response.json.priceChange),
          priceChangePercent: parseFloat(response.json.priceChangePercent),
          weightedAvgPrice: parseFloat(response.json.weightedAvgPrice),
          prevClosePrice: parseFloat(response.json.prevClosePrice),
          lastPrice: parseFloat(response.json.lastPrice),
          lastQty: parseFloat(response.json.lastQty),
          bidPrice: parseFloat(response.json.bidPrice),
          askPrice: parseFloat(response.json.askPrice),
          openPrice: parseFloat(response.json.openPrice),
          highPrice: parseFloat(response.json.highPrice),
          lowPrice: parseFloat(response.json.lowPrice),
          volume: parseFloat(response.json.volume),
          quoteVolume: parseFloat(response.json.quoteVolume),
          openTime: response.json.openTime,
          closeTime: response.json.closeTime,
          firstId: response.json.firstId,
          lastId: response.json.lastId,
          count: response.json.count
        };
      }
    } catch (error) {
      logger.error(`24h stats fetch failed: ${error.message}`);
    }
    
    return null;
  }
  
  mapTimeframe(tf) {
    const maps = {
      '1m': '1m', '5m': '5m', '15m': '15m', '30m': '30m',
      '1h': '1h', '4h': '4h', '1d': '1d', '1w': '1w'
    };
    return maps[tf] || '1h';
  }
  
  async getMarketStatus() {
    try {
      const now = new Date();
      const day = now.getDay();
      const hour = now.getHours();
      const minute = now.getMinutes();
      
      const isMarketOpen = day >= 1 && day <= 5 && 
                          ((hour === 9 && minute >= 30) || (hour > 9 && hour < 16) || (hour === 16 && minute === 0));
      
      const btcPrice = await this.getCurrentPrice('BTCUSDT');
      const ethPrice = await this.getCurrentPrice('ETHUSDT');
      
      return {
        timestamp: now.toISOString(),
        stockMarket: isMarketOpen ? 'OPEN' : 'CLOSED',
        cryptoMarket: 'OPEN',
        btcPrice: btcPrice,
        ethPrice: ethPrice,
        mode: MODE
      };
    } catch (error) {
      logger.error(`Market status failed: ${error.message}`);
      return { error: error.message };
    }
  }
}

// ==================== REAL TECHNICAL ANALYSIS ====================
class RealTechnicalAnalysis {
  constructor() {
    this.indicators = new Map();
    logger.info('Real Technical Analysis initialized');
  }
  
  calculateAll(priceData) {
    if (!priceData || priceData.length < 50) {
      throw new Error('Insufficient data for analysis');
    }
    
    const closes = priceData.map(p => p.close);
    const highs = priceData.map(p => p.high);
    const lows = priceData.map(p => p.low);
    const volumes = priceData.map(p => p.volume || 0);
    const currentPrice = closes[closes.length - 1];
    
    const results = {
      currentPrice: currentPrice,
      high24h: Math.max(...closes.slice(-24)),
      low24h: Math.min(...closes.slice(-24)),
      change24h: ((currentPrice - closes[closes.length - 24]) / closes[closes.length - 24]) * 100,
      volume24h: volumes.slice(-24).reduce((a, b) => a + b, 0),
      
      sma20: this.calculateSMA(closes, 20),
      sma50: this.calculateSMA(closes, 50),
      sma200: this.calculateSMA(closes, 200),
      ema12: this.calculateEMA(closes, 12),
      ema26: this.calculateEMA(closes, 26),
      
      rsi: this.calculateRSI(closes, 14),
      stochastic: this.calculateStochastic(highs, lows, closes, 14, 3),
      macd: this.calculateMACD(closes, 12, 26, 9),
      
      atr: this.calculateATR(highs, lows, closes, 14),
      bollinger: this.calculateBollingerBands(closes, 20, 2),
      
      volumeSMA: this.calculateSMA(volumes, 20),
      obv: this.calculateOBV(closes, volumes),
      
      trend: this.analyzeTrend(closes, highs, lows),
      support: this.findSupportLevels(closes, lows),
      resistance: this.findResistanceLevels(closes, highs),
      
      volatility: this.calculateVolatility(closes, 20)
    };
    
    this.indicators.set('last_calculation', results);
    return results;
  }
  
  calculateSMA(data, period) {
    if (data.length < period) return data[data.length - 1];
    const slice = data.slice(-period);
    return slice.reduce((a, b) => a + b, 0) / period;
  }
  
  calculateEMA(data, period, smoothing = 2) {
    if (data.length < period) return data[data.length - 1];
    
    const k = smoothing / (period + 1);
    let ema = data[0];
    
    for (let i = 1; i < data.length; i++) {
      ema = data[i] * k + ema * (1 - k);
    }
    
    return ema;
  }
  
  calculateRSI(closes, period = 14) {
    if (closes.length < period + 1) return 50;
    
    let gains = 0;
    let losses = 0;
    
    for (let i = 1; i <= period; i++) {
      const change = closes[i] - closes[i - 1];
      if (change > 0) {
        gains += change;
      } else {
        losses -= change;
      }
    }
    
    let avgGain = gains / period;
    let avgLoss = losses / period;
    
    for (let i = period + 1; i < closes.length; i++) {
      const change = closes[i] - closes[i - 1];
      const gain = change > 0 ? change : 0;
      const loss = change < 0 ? -change : 0;
      
      avgGain = (avgGain * (period - 1) + gain) / period;
      avgLoss = (avgLoss * (period - 1) + loss) / period;
    }
    
    if (avgLoss === 0) return 100;
    const rs = avgGain / avgLoss;
    return 100 - (100 / (1 + rs));
  }
  
  calculateMACD(closes, fast = 12, slow = 26, signal = 9) {
    if (closes.length < slow) return { macd: 0, signal: 0, histogram: 0 };
    
    const fastEMA = this.calculateEMA(closes, fast);
    const slowEMA = this.calculateEMA(closes, slow);
    const macdLine = fastEMA - slowEMA;
    
    const macdValues = [];
    for (let i = closes.length - signal; i < closes.length; i++) {
      const fastE = this.calculateEMA(closes.slice(0, i + 1), fast);
      const slowE = this.calculateEMA(closes.slice(0, i + 1), slow);
      macdValues.push(fastE - slowE);
    }
    
    const signalLine = this.calculateEMA(macdValues, signal);
    const histogram = macdLine - signalLine;
    
    return {
      macd: macdLine,
      signal: signalLine,
      histogram: histogram,
      bullish: histogram > 0,
      bearish: histogram < 0
    };
  }
  
  calculateStochastic(highs, lows, closes, kPeriod = 14, dPeriod = 3) {
    if (highs.length < kPeriod || lows.length < kPeriod || closes.length < kPeriod) {
      return { k: 50, d: 50 };
    }
    
    const recentHigh = Math.max(...highs.slice(-kPeriod));
    const recentLow = Math.min(...lows.slice(-kPeriod));
    const currentClose = closes[closes.length - 1];
    
    const k = ((currentClose - recentLow) / (recentHigh - recentLow)) * 100;
    
    const kValues = [];
    for (let i = closes.length - dPeriod; i < closes.length; i++) {
      const start = Math.max(0, i - kPeriod + 1);
      const periodHighs = highs.slice(start, i + 1);
      const periodLows = lows.slice(start, i + 1);
      const periodCloses = closes.slice(start, i + 1);
      
      const h = Math.max(...periodHighs);
      const l = Math.min(...periodLows);
      const c = periodCloses[periodCloses.length - 1];
      kValues.push(((c - l) / (h - l)) * 100);
    }
    
    const d = kValues.reduce((a, b) => a + b, 0) / kValues.length;
    
    return {
      k: k,
      d: d,
      overbought: k > 80,
      oversold: k < 20
    };
  }
  
  calculateATR(highs, lows, closes, period = 14) {
    if (highs.length < period || lows.length < period || closes.length < period) {
      return 0;
    }
    
    const trueRanges = [];
    for (let i = 1; i < period; i++) {
      const hl = highs[i] - lows[i];
      const hc = Math.abs(highs[i] - closes[i - 1]);
      const lc = Math.abs(lows[i] - closes[i - 1]);
      trueRanges.push(Math.max(hl, hc, lc));
    }
    
    return trueRanges.reduce((a, b) => a + b, 0) / trueRanges.length;
  }
  
  calculateBollingerBands(closes, period = 20, stdDev = 2) {
    if (closes.length < period) return { upper: null, middle: null, lower: null };
    
    const slice = closes.slice(-period);
    const middle = slice.reduce((a, b) => a + b, 0) / period;
    
    const variance = slice.reduce((a, b) => a + Math.pow(b - middle, 2), 0) / period;
    const std = Math.sqrt(variance);
    
    return {
      upper: middle + (std * stdDev),
      middle: middle,
      lower: middle - (std * stdDev),
      width: (std * stdDev * 2) / middle,
      squeezed: ((std * stdDev * 2) / middle) < 0.1
    };
  }
  
  calculateOBV(closes, volumes) {
    if (closes.length < 2 || volumes.length < 2) return 0;
    
    let obv = 0;
    for (let i = 1; i < closes.length; i++) {
      if (closes[i] > closes[i - 1]) {
        obv += volumes[i];
      } else if (closes[i] < closes[i - 1]) {
        obv -= volumes[i];
      }
    }
    
    return obv;
  }
  
  analyzeTrend(closes, highs, lows) {
    if (closes.length < 50) return { direction: 'NEUTRAL', strength: 0 };
    
    const sma20 = this.calculateSMA(closes, 20);
    const sma50 = this.calculateSMA(closes, 50);
    const sma200 = this.calculateSMA(closes, 200);
    const currentPrice = closes[closes.length - 1];
    
    const alignedUp = currentPrice > sma20 && sma20 > sma50 && sma50 > sma200;
    const alignedDown = currentPrice < sma20 && sma20 < sma50 && sma50 < sma200;
    
    let direction = 'NEUTRAL';
    let strength = 0;
    
    if (alignedUp) {
      direction = 'BULLISH';
      strength = 0.9;
    } else if (alignedDown) {
      direction = 'BEARISH';
      strength = 0.9;
    } else if (currentPrice > sma50 && sma20 > sma50) {
      direction = 'BULLISH';
      strength = 0.7;
    } else if (currentPrice < sma50 && sma20 < sma50) {
      direction = 'BEARISH';
      strength = 0.7;
    }
    
    return { direction, strength };
  }
  
  findSupportLevels(closes, lows) {
    if (closes.length < 100) return [];
    
    const supports = [];
    const sensitivity = 0.02;
    
    for (let i = 10; i < lows.length - 10; i++) {
      const currentLow = lows[i];
      const leftMin = Math.min(...lows.slice(i - 10, i));
      const rightMin = Math.min(...lows.slice(i + 1, i + 11));
      
      if (currentLow <= leftMin && currentLow <= rightMin) {
        supports.push({
          price: currentLow,
          strength: this.calculateLevelStrength(lows, i, currentLow, sensitivity)
        });
      }
    }
    
    return supports
      .sort((a, b) => b.strength - a.strength)
      .slice(0, 5);
  }
  
  findResistanceLevels(closes, highs) {
    if (closes.length < 100) return [];
    
    const resistances = [];
    const sensitivity = 0.02;
    
    for (let i = 10; i < highs.length - 10; i++) {
      const currentHigh = highs[i];
      const leftMax = Math.max(...highs.slice(i - 10, i));
      const rightMax = Math.max(...highs.slice(i + 1, i + 11));
      
      if (currentHigh >= leftMax && currentHigh >= rightMax) {
        resistances.push({
          price: currentHigh,
          strength: this.calculateLevelStrength(highs, i, currentHigh, sensitivity)
        });
      }
    }
    
    return resistances
      .sort((a, b) => b.strength - a.strength)
      .slice(0, 5);
  }
  
  calculateLevelStrength(prices, index, level, sensitivity = 0.02) {
    let strength = 0;
    const window = 50;
    
    for (let i = Math.max(0, index - window); i < Math.min(prices.length, index + window); i++) {
      if (Math.abs(prices[i] - level) / level < sensitivity) {
        strength++;
      }
    }
    
    return Math.min(strength / 20, 1);
  }
  
  calculateVolatility(closes, period = 20) {
    if (closes.length < period) return 0;
    
    const returns = [];
    for (let i = 1; i < period; i++) {
      returns.push(Math.log(closes[i] / closes[i - 1]));
    }
    
    const mean = returns.reduce((a, b) => a + b, 0) / returns.length;
    const variance = returns.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / returns.length;
    
    return Math.sqrt(variance) * Math.sqrt(252);
  }
}

// ==================== REAL AI STRATEGY ENGINE ====================
class RealAIStrategyEngine {
  constructor() {
    this.strategies = {
      TREND_FOLLOWING: {
        name: 'Trend Following Pro',
        description: 'Follows strong trends with momentum confirmation',
        weight: 0.4,
        emoji: '📈'
      },
      BREAKOUT: {
        name: 'Breakout Trader',
        description: 'Trades breakouts from consolidation with volume',
        weight: 0.3,
        emoji: '🚀'
      },
      MEAN_REVERSION: {
        name: 'Mean Reversion',
        description: 'Trades reversals from overbought/oversold levels',
        weight: 0.3,
        emoji: '↕️'
      }
    };
    
    this.technicalAnalysis = new RealTechnicalAnalysis();
    logger.info('Real AI Strategy Engine initialized');
  }
  
  analyzeMarket(priceData, indicators) {
    const analysis = {
      conditions: {},
      scores: {},
      recommendations: []
    };
    
    const closes = priceData.map(p => p.close);
    const highs = priceData.map(p => p.high);
    const lows = priceData.map(p => p.low);
    const volumes = priceData.map(p => p.volume || 0);
    const currentPrice = closes[closes.length - 1];
    
    // Trend Analysis
    analysis.conditions.strong_trend = indicators.trend.strength > 0.7;
    analysis.conditions.trend_aligned = indicators.trend.direction !== 'NEUTRAL';
    
    // Momentum Analysis
    analysis.conditions.high_momentum = Math.abs(indicators.macd.histogram) > 0.5;
    analysis.conditions.volume_spike = volumes.slice(-5).reduce((a, b) => a + b, 0) > 
                                       volumes.slice(-20).reduce((a, b) => a + b, 0) / 4 * 1.5;
    
    // Volatility Analysis
    analysis.conditions.low_volatility = indicators.volatility < 0.3;
    analysis.conditions.consolidation = this.isConsolidating(highs, lows, closes);
    
    // Technical Levels
    analysis.conditions.oversold = indicators.rsi < 30 && indicators.stochastic.oversold;
    analysis.conditions.overbought = indicators.rsi > 70 && indicators.stochastic.overbought;
    
    // Calculate scores
    analysis.scores = this.calculateStrategyScores(analysis.conditions, indicators);
    
    // Generate recommendations
    analysis.recommendations = this.generateRecommendations(analysis, indicators);
    
    return analysis;
  }
  
  isConsolidating(highs, lows, closes) {
    if (highs.length < 30 || lows.length < 30) return false;
    
    const recentRange = Math.max(...highs.slice(-10)) - Math.min(...lows.slice(-10));
    const olderRange = Math.max(...highs.slice(-30, -10)) - Math.min(...lows.slice(-30, -10));
    const currentPrice = closes[closes.length - 1];
    const rangePercent = recentRange / currentPrice;
    
    return recentRange < olderRange * 0.7 && rangePercent < 0.03;
  }
  
  calculateStrategyScores(conditions, indicators) {
    const scores = {};
    
    // Trend Following Score
    scores.TREND_FOLLOWING = 0.4;
    if (conditions.strong_trend) scores.TREND_FOLLOWING += 0.3;
    if (conditions.high_momentum) scores.TREND_FOLLOWING += 0.2;
    if (conditions.volume_spike) scores.TREND_FOLLOWING += 0.1;
    
    // Breakout Score
    scores.BREAKOUT = 0.3;
    if (conditions.consolidation) scores.BREAKOUT += 0.4;
    if (conditions.low_volatility) scores.BREAKOUT += 0.2;
    if (conditions.volume_spike) scores.BREAKOUT += 0.1;
    
    // Mean Reversion Score
    scores.MEAN_REVERSION = 0.3;
    if (conditions.oversold || conditions.overbought) scores.MEAN_REVERSION += 0.4;
    if (indicators.bollinger.squeezed) scores.MEAN_REVERSION += 0.2;
    if (Math.abs(indicators.macd.histogram) > 1) scores.MEAN_REVERSION += 0.1;
    
    // Normalize scores
    Object.keys(scores).forEach(key => {
      scores[key] = Math.max(0.1, Math.min(0.95, scores[key]));
    });
    
    return scores;
  }
  
  selectOptimalStrategy(marketAnalysis) {
    const scores = marketAnalysis.scores;
    let bestStrategy = 'TREND_FOLLOWING';
    let bestScore = -1;
    
    Object.entries(scores).forEach(([strategy, score]) => {
      if (score > bestScore) {
        bestScore = score;
        bestStrategy = strategy;
      }
    });
    
    const reason = this.generateStrategyReason(bestStrategy, marketAnalysis.conditions);
    
    return {
      strategy: bestStrategy,
      score: bestScore,
      reason: reason,
      ...this.strategies[bestStrategy]
    };
  }
  
  generateStrategyReason(strategy, conditions) {
    const reasons = [];
    
    switch(strategy) {
      case 'TREND_FOLLOWING':
        if (conditions.strong_trend) reasons.push('Strong trend detected');
        if (conditions.high_momentum) reasons.push('High momentum');
        if (conditions.volume_spike) reasons.push('Volume spike confirming trend');
        break;
      case 'BREAKOUT':
        if (conditions.consolidation) reasons.push('Market consolidating');
        if (conditions.low_volatility) reasons.push('Low volatility period');
        if (conditions.volume_spike) reasons.push('Volume breakout');
        break;
      case 'MEAN_REVERSION':
        if (conditions.oversold) reasons.push('Oversold conditions');
        if (conditions.overbought) reasons.push('Overbought conditions');
        break;
    }
    
    return reasons.length > 0 ? reasons.join(', ') : 'Market conditions optimal';
  }
  
  generateRecommendations(marketAnalysis, indicators) {
    const recommendations = [];
    
    if (marketAnalysis.conditions.strong_trend) {
      recommendations.push({
        type: 'TREND_FOLLOWING',
        action: 'Follow trend direction',
        timeframe: '1H-4H'
      });
    }
    
    if (marketAnalysis.conditions.consolidation) {
      recommendations.push({
        type: 'BREAKOUT_WATCH',
        action: 'Watch for breakout with volume',
        timeframe: '1H-4H'
      });
    }
    
    if (marketAnalysis.conditions.oversold || marketAnalysis.conditions.overbought) {
      recommendations.push({
        type: 'REVERSION_WATCH',
        action: 'Watch for reversal signals',
        timeframe: '1H-4H'
      });
    }
    
    return recommendations;
  }
}

// ==================== REAL TRADING ENGINE (WITH LIVE TRADING) ====================
class RealTradingEngine {
  constructor() {
    this.marketData = new RealMarketData();
    this.technicalAnalysis = new RealTechnicalAnalysis();
    this.aiEngine = new RealAIStrategyEngine();
    this.positions = new Map();
    this.tradeHistory = [];
    this.dailyTrades = 0;
    this.dailyProfitLoss = 0;
    this.performance = {
      totalTrades: 0,
      winningTrades: 0,
      losingTrades: 0,
      totalProfit: 0,
      maxDrawdown: 0,
      winRate: 0,
      sharpeRatio: 0
    };
    
    this.tradingActive = true;
    this.lastTradeTime = 0;
    this.minTradeInterval = 60000; // 1 minute between trades
    
    logger.info(`Real Trading Engine initialized - Mode: ${MODE}`);
  }
  
  async analyzeSymbol(symbol, timeframe = '1h') {
    try {
      logger.info(`🔍 Analyzing ${symbol} (${timeframe})...`);
      
      const priceData = await this.marketData.getOHLCV(symbol, timeframe, 200);
      if (priceData.length < 50) {
        throw new Error(`Insufficient data: ${priceData.length} candles`);
      }
      
      const indicators = this.technicalAnalysis.calculateAll(priceData);
      const marketAnalysis = this.aiEngine.analyzeMarket(priceData, indicators);
      const strategySelection = this.aiEngine.selectOptimalStrategy(marketAnalysis);
      
      const tradeSignal = await this.generateTradeSignal(
        symbol,
        priceData,
        indicators,
        marketAnalysis,
        strategySelection
      );
      
      const riskAssessment = this.assessRisk(tradeSignal, indicators);
      
      const analysis = {
        id: `${symbol}_${Date.now()}`,
        symbol: symbol,
        timeframe: timeframe,
        timestamp: Date.now(),
        
        priceData: priceData.slice(-50),
        currentPrice: indicators.currentPrice,
        priceChange24h: indicators.change24h,
        volume24h: indicators.volume24h,
        
        indicators: indicators,
        marketAnalysis: marketAnalysis,
        strategySelection: strategySelection,
        tradeSignal: tradeSignal,
        riskAssessment: riskAssessment,
        
        mode: MODE,
        dataQuality: 'REAL'
      };
      
      if (tradeSignal.direction !== 'NEUTRAL') {
        logger.tradeSignal(
          symbol,
          tradeSignal.direction,
          tradeSignal.entry,
          tradeSignal.stopLoss,
          tradeSignal.takeProfit,
          tradeSignal.positionSize.units,
          'analysis'
        );
      }
      
      logger.info(`✅ Analysis complete: ${strategySelection.name} (Score: ${strategySelection.score.toFixed(2)})`);
      
      return analysis;
      
    } catch (error) {
      logger.error(`Analysis failed for ${symbol}:`, error.message);
      
      return {
        id: `${symbol}_${Date.now()}`,
        symbol: symbol,
        timeframe: timeframe,
        timestamp: Date.now(),
        error: true,
        errorMessage: error.message,
        tradeSignal: {
          direction: 'NEUTRAL',
          reason: `Analysis failed: ${error.message}`
        }
      };
    }
  }
  
  async generateTradeSignal(symbol, priceData, indicators, marketAnalysis, strategySelection) {
    const closes = priceData.map(p => p.close);
    const highs = priceData.map(p => p.high);
    const lows = priceData.map(p => p.low);
    const currentPrice = indicators.currentPrice;
    const atr = indicators.atr || (currentPrice * 0.02);
    
    let direction = 'NEUTRAL';
    let confidence = strategySelection.score;
    let reasons = [strategySelection.reason];
    
    // Strategy-specific signal generation
    switch(strategySelection.strategy) {
      case 'TREND_FOLLOWING':
        if (indicators.trend.direction === 'BULLISH' && indicators.trend.strength > 0.6) {
          direction = 'LONG';
        } else if (indicators.trend.direction === 'BEARISH' && indicators.trend.strength > 0.6) {
          direction = 'SHORT';
        }
        break;
        
      case 'BREAKOUT':
        const recentHigh = Math.max(...highs.slice(-20));
        const recentLow = Math.min(...lows.slice(-20));
        
        if (currentPrice > recentHigh - (atr * 0.5)) {
          direction = 'LONG';
          reasons.push('Breaking above resistance');
        } else if (currentPrice < recentLow + (atr * 0.5)) {
          direction = 'SHORT';
          reasons.push('Breaking below support');
        }
        break;
        
      case 'MEAN_REVERSION':
        if (indicators.rsi < 30 && indicators.stochastic.oversold) {
          direction = 'LONG';
          reasons.push('Oversold bounce');
        } else if (indicators.rsi > 70 && indicators.stochastic.overbought) {
          direction = 'SHORT';
          reasons.push('Overbought reversal');
        }
        break;
    }
    
    if (direction === 'NEUTRAL') {
      return {
        direction: 'NEUTRAL',
        reason: 'No clear entry signal',
        timestamp: Date.now()
      };
    }
    
    const positionSize = this.calculatePositionSize(currentPrice, atr, direction, confidence);
    
    const stopLoss = this.calculateStopLoss(currentPrice, atr, direction, indicators.support, indicators.resistance);
    const takeProfit = this.calculateTakeProfit(currentPrice, atr, direction, stopLoss);
    
    const risk = Math.abs(currentPrice - stopLoss);
    const reward1 = Math.abs(takeProfit[0] - currentPrice);
    const reward2 = Math.abs(takeProfit[1] - currentPrice);
    const reward3 = Math.abs(takeProfit[2] - currentPrice);
    
    const riskReward1 = risk > 0 ? reward1 / risk : 0;
    const riskReward2 = risk > 0 ? reward2 / risk : 0;
    const riskReward3 = risk > 0 ? reward3 / risk : 0;
    
    if (riskReward1 < 1) {
      return {
        direction: 'NEUTRAL',
        reason: `Risk/Reward too low: 1:${riskReward1.toFixed(2)}`,
        timestamp: Date.now()
      };
    }
    
    return {
      direction: direction,
      confidence: confidence,
      reasons: reasons,
      
      entry: this.round(currentPrice),
      stopLoss: this.round(stopLoss),
      takeProfit: takeProfit.map(tp => this.round(tp)),
      
      positionSize: positionSize,
      riskAmount: this.round(risk * positionSize.units),
      
      risk: this.round(risk),
      rewards: [this.round(reward1), this.round(reward2), this.round(reward3)],
      riskRewards: [this.round(riskReward1), this.round(riskReward2), this.round(riskReward3)],
      
      strategy: strategySelection.strategy,
      strategyName: strategySelection.name,
      
      timestamp: Date.now(),
      expiry: Date.now() + (24 * 60 * 60 * 1000)
    };
  }
  
  calculatePositionSize(currentPrice, atr, direction, confidence) {
    const accountEquity = parseFloat(ACCOUNT_EQUITY);
    const baseRisk = parseFloat(DEFAULT_RISK_PCT);
    
    // Adjust risk based on confidence
    const adjustedRisk = baseRisk * confidence;
    
    // Calculate risk amount
    const riskAmount = accountEquity * (adjustedRisk / 100);
    
    // Calculate position size based on ATR
    const riskPerUnit = atr * 1.5;
    let units = riskAmount / riskPerUnit;
    
    // Calculate position value
    const positionValue = units * currentPrice;
    const positionPercentage = (positionValue / accountEquity) * 100;
    
    // Apply position limits
    const maxPositionPercentage = MODE === 'live' ? 10 : 20;
    let adjusted = false;
    
    if (positionPercentage > maxPositionPercentage) {
      units = (accountEquity * (maxPositionPercentage / 100)) / currentPrice;
      adjusted = true;
    }
    
    // Ensure minimum quantity for exchange
    const minQuantity = currentPrice > 100 ? 0.001 : currentPrice > 10 ? 0.01 : 0.1;
    units = Math.max(units, minQuantity);
    
    return {
      units: this.round(units, 6),
      positionValue: this.round(units * currentPrice, 2),
      riskAmount: this.round(riskPerUnit * units, 2),
      riskPercentage: this.round(adjustedRisk, 2),
      positionPercentage: this.round((units * currentPrice) / accountEquity * 100, 2),
      adjusted: adjusted
    };
  }
  
  calculateStopLoss(currentPrice, atr, direction, supportLevels, resistanceLevels) {
    const atrStop = atr * 1.5;
    
    if (direction === 'LONG') {
      if (supportLevels && supportLevels.length > 0) {
        const nearestSupport = supportLevels[0].price;
        return Math.max(nearestSupport, currentPrice - atrStop);
      }
      return currentPrice - atrStop;
    } else {
      if (resistanceLevels && resistanceLevels.length > 0) {
        const nearestResistance = resistanceLevels[0].price;
        return Math.min(nearestResistance, currentPrice + atrStop);
      }
      return currentPrice + atrStop;
    }
  }
  
  calculateTakeProfit(currentPrice, atr, direction, stopLoss) {
    const takeProfitLevels = [];
    const risk = Math.abs(currentPrice - stopLoss);
    
    if (direction === 'LONG') {
      takeProfitLevels.push(currentPrice + risk); // 1:1
      takeProfitLevels.push(currentPrice + (risk * 2)); // 1:2
      takeProfitLevels.push(currentPrice + (risk * 3)); // 1:3
    } else {
      takeProfitLevels.push(currentPrice - risk); // 1:1
      takeProfitLevels.push(currentPrice - (risk * 2)); // 1:2
      takeProfitLevels.push(currentPrice - (risk * 3)); // 1:3
    }
    
    return takeProfitLevels;
  }
  
  assessRisk(tradeSignal, indicators) {
    if (tradeSignal.direction === 'NEUTRAL') {
      return {
        level: 'LOW',
        score: 0,
        recommendation: 'NO_TRADE'
      };
    }
    
    let riskScore = 0.5;
    const reasons = [];
    
    const volatility = indicators.volatility || 0;
    if (volatility > 0.5) {
      riskScore += 0.2;
      reasons.push('High volatility');
    } else if (volatility < 0.2) {
      riskScore -= 0.1;
      reasons.push('Low volatility');
    }
    
    const marketTrend = indicators.trend?.strength || 0;
    if (marketTrend < 0.3) {
      riskScore += 0.15;
      reasons.push('Weak market trend');
    }
    
    const positionPercentage = tradeSignal.positionSize?.positionPercentage || 0;
    if (positionPercentage > 5) {
      riskScore += 0.15;
      reasons.push('Large position size');
    }
    
    const now = new Date();
    const hour = now.getHours();
    const day = now.getDay();
    
    if ((day === 5 && hour >= 15) || day === 6 || day === 0) {
      riskScore += 0.1;
      reasons.push('Weekend risk');
    }
    
    riskScore = Math.max(0.1, Math.min(0.9, riskScore));
    
    let level = 'MEDIUM';
    if (riskScore > 0.7) level = 'HIGH';
    else if (riskScore < 0.3) level = 'LOW';
    
    let recommendation = 'PROCEED';
    if (riskScore > 0.7) recommendation = 'REDUCE_SIZE';
    if (riskScore > 0.8) recommendation = 'AVOID';
    
    return {
      level: level,
      score: this.round(riskScore, 2),
      reasons: reasons,
      recommendation: recommendation,
      volatility: this.round(volatility, 3)
    };
  }
  
  // ==================== LIVE TRADING METHODS ====================
  
  async executeLiveTrade(symbol, tradeSignal, exchange = 'binance') {
    if (MODE !== 'live') {
      logger.warn(`Cannot execute live trade. Current mode: ${MODE}`);
      return { success: false, message: `Not in live mode: ${MODE}` };
    }
    
    if (!this.tradingActive) {
      logger.warn('Trading is currently paused');
      return { success: false, message: 'Trading paused' };
    }
    
    if (!tradeSignal.direction || tradeSignal.direction === 'NEUTRAL') {
      return { success: false, message: 'No valid trade signal' };
    }
    
    // Check trade limits
    const now = Date.now();
    if (now - this.lastTradeTime < this.minTradeInterval) {
      return { success: false, message: 'Minimum trade interval not reached' };
    }
    
    if (this.dailyTrades >= MAX_DAILY_TRADES) {
      return { success: false, message: 'Daily trade limit reached' };
    }
    
    try {
      logger.liveTradeAlert(`ATTEMPTING LIVE TRADE: ${tradeSignal.direction} ${symbol}`);
      
      const currentPrice = await this.marketData.getCurrentPrice(symbol);
      if (!currentPrice) {
        throw new Error('Could not fetch current price');
      }
      
      const orderBook = await this.marketData.getOrderBook(symbol, 10);
      if (!orderBook) {
        throw new Error('Could not fetch order book');
      }
      
      // Update entry price to current market price
      tradeSignal.entry = this.round(currentPrice);
      
      let tradeResult;
      switch(exchange.toLowerCase()) {
        case 'binance':
          tradeResult = await this.executeBinanceTrade(symbol, tradeSignal, orderBook);
          break;
        default:
          throw new Error(`Unsupported exchange: ${exchange}`);
      }
      
      if (tradeResult.success) {
        this.recordTrade(tradeResult, symbol, tradeSignal, exchange);
        this.lastTradeTime = now;
        this.dailyTrades++;
        
        logger.liveTradeAlert(`LIVE TRADE EXECUTED: ${tradeResult.orderId}`, tradeResult);
        logger.tradeSignal(
          symbol,
          tradeSignal.direction,
          tradeSignal.entry,
          tradeSignal.stopLoss,
          tradeSignal.takeProfit,
          tradeResult.quantity,
          exchange,
          tradeResult.orderId
        );
      }
      
      return tradeResult;
      
    } catch (error) {
      logger.error(`❌ Live trade execution failed:`, error.message);
      return { success: false, error: error.message };
    }
  }
  
  async executeBinanceTrade(symbol, tradeSignal, orderBook) {
    if (!BINANCE_API_KEY || !BINANCE_API_SECRET) {
      throw new Error('Binance API keys not configured');
    }
    
    const binanceSymbol = symbol.replace('/', '').toUpperCase();
    const side = tradeSignal.direction === 'LONG' ? 'BUY' : 'SELL';
    const quantity = tradeSignal.positionSize.units;
    
    // Get best price from order book
    const bestPrice = side === 'BUY' ? orderBook.asks[0].price : orderBook.bids[0].price;
    
    const timestamp = Date.now();
    const query = `symbol=${binanceSymbol}&side=${side}&type=LIMIT&timeInForce=GTC&quantity=${quantity}&price=${bestPrice}&timestamp=${timestamp}&recvWindow=5000`;
    
    const signature = http.createSignature(BINANCE_API_SECRET, query);
    const url = `https://api.binance.com/api/v3/order?${query}&signature=${signature}`;
    
    const response = await http.post(url, null, {
      headers: {
        'X-MBX-APIKEY': BINANCE_API_KEY,
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      timeout: 10000
    });
    
    if (response.json) {
      if (response.json.code) {
        throw new Error(`Binance API error: ${response.json.msg}`);
      }
      
      return {
        success: true,
        orderId: response.json.orderId,
        symbol: response.json.symbol,
        side: response.json.side,
        quantity: parseFloat(response.json.origQty),
        price: parseFloat(response.json.price),
        status: response.json.status,
        fills: response.json.fills || []
      };
    }
    
    throw new Error('Binance trade execution failed');
  }
  
  recordTrade(tradeResult, symbol, tradeSignal, exchange) {
    const tradeRecord = {
      id: `trade_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: Date.now(),
      symbol: symbol,
      direction: tradeSignal.direction,
      entryPrice: tradeResult.price || tradeSignal.entry,
      stopLoss: tradeSignal.stopLoss,
      takeProfit: tradeSignal.takeProfit,
      quantity: tradeResult.quantity,
      exchange: exchange,
      strategy: tradeSignal.strategy,
      orderId: tradeResult.orderId,
      status: 'OPEN',
      fills: tradeResult.fills || []
    };
    
    this.positions.set(tradeRecord.id, tradeRecord);
    this.tradeHistory.push(tradeRecord);
    this.performance.totalTrades++;
    
    // Save to file
    const fs = require('fs');
    fs.appendFileSync('live_trades.jsonl', JSON.stringify(tradeRecord) + '\n');
    
    return tradeRecord;
  }
  
  async checkAndManagePositions() {
    const openPositions = Array.from(this.positions.values()).filter(pos => pos.status === 'OPEN');
    
    for (const position of openPositions) {
      try {
        const currentPrice = await this.marketData.getCurrentPrice(position.symbol);
        if (!currentPrice) continue;
        
        // Check stop loss
        if (position.direction === 'LONG' && currentPrice <= position.stopLoss) {
          logger.liveTradeAlert(`⛔ STOP LOSS HIT: ${position.symbol} @ $${currentPrice}`);
          await this.closePosition(position.id, position.exchange);
        } else if (position.direction === 'SHORT' && currentPrice >= position.stopLoss) {
          logger.liveTradeAlert(`⛔ STOP LOSS HIT: ${position.symbol} @ $${currentPrice}`);
          await this.closePosition(position.id, position.exchange);
        }
        
        // Check take profit
        const tpLevels = position.takeProfit || [];
        for (let i = 0; i < tpLevels.length; i++) {
          if (position.direction === 'LONG' && currentPrice >= tpLevels[i] && !position[`tp${i+1}Hit`]) {
            logger.liveTradeAlert(`✅ TAKE PROFIT ${i+1} HIT: ${position.symbol} @ $${currentPrice}`);
            position[`tp${i+1}Hit`] = true;
            
            // For live trading, consider partial closes or trailing stops
            if (i === tpLevels.length - 1) {
              // Last TP hit, close position
              await this.closePosition(position.id, position.exchange);
            }
          } else if (position.direction === 'SHORT' && currentPrice <= tpLevels[i] && !position[`tp${i+1}Hit`]) {
            logger.liveTradeAlert(`✅ TAKE PROFIT ${i+1} HIT: ${position.symbol} @ $${currentPrice}`);
            position[`tp${i+1}Hit`] = true;
            
            if (i === tpLevels.length - 1) {
              await this.closePosition(position.id, position.exchange);
            }
          }
        }
      } catch (error) {
        logger.error(`Error managing position ${position.id}:`, error.message);
      }
    }
  }
  
  async closePosition(positionId, exchange = 'binance') {
    const position = this.positions.get(positionId);
    if (!position) {
      throw new Error(`Position not found: ${positionId}`);
    }
    
    try {
      if (MODE === 'live') {
        const closeSide = position.direction === 'LONG' ? 'SELL' : 'BUY';
        const closeQuantity = position.quantity;
        
        // Similar to executeBinanceTrade but for closing
        const binanceSymbol = position.symbol.replace('/', '').toUpperCase();
        const currentPrice = await this.marketData.getCurrentPrice(position.symbol);
        
        const timestamp = Date.now();
        const query = `symbol=${binanceSymbol}&side=${closeSide}&type=LIMIT&timeInForce=GTC&quantity=${closeQuantity}&price=${currentPrice}&timestamp=${timestamp}&recvWindow=5000`;
        
        const signature = http.createSignature(BINANCE_API_SECRET, query);
        const url = `https://api.binance.com/api/v3/order?${query}&signature=${signature}`;
        
        const response = await http.post(url, null, {
          headers: {
            'X-MBX-APIKEY': BINANCE_API_KEY,
            'Content-Type': 'application/x-www-form-urlencoded'
          },
          timeout: 10000
        });
        
        if (response.json) {
          const exitPrice = parseFloat(response.json.price) || currentPrice;
          const pnl = this.calculatePnl(position, exitPrice);
          
          position.exitPrice = exitPrice;
          position.exitTime = Date.now();
          position.status = 'CLOSED';
          position.pnl = pnl;
          position.exitOrderId = response.json.orderId;
          
          this.updatePerformance(position, pnl);
          
          logger.liveTradeAlert(`✅ POSITION CLOSED: ${position.symbol} | P&L: $${pnl.toFixed(2)}`);
          return { success: true, pnl: pnl };
        }
      } else {
        // Paper trading close
        const currentPrice = await this.marketData.getCurrentPrice(position.symbol);
        const pnl = this.calculatePnl(position, currentPrice);
        
        position.exitPrice = currentPrice;
        position.exitTime = Date.now();
        position.status = 'CLOSED';
        position.pnl = pnl;
        
        this.updatePerformance(position, pnl);
        
        logger.info(`📝 PAPER POSITION CLOSED: ${position.symbol} | P&L: $${pnl.toFixed(2)}`);
        return { success: true, pnl: pnl };
      }
    } catch (error) {
      logger.error(`Failed to close position ${positionId}:`, error);
      return { success: false, error: error.message };
    }
  }
  
  calculatePnl(position, exitPrice) {
    if (position.direction === 'LONG') {
      return (exitPrice - position.entryPrice) * position.quantity;
    } else {
      return (position.entryPrice - exitPrice) * position.quantity;
    }
  }
  
  updatePerformance(position, pnl) {
    this.dailyProfitLoss += pnl;
    
    if (pnl > 0) {
      this.performance.winningTrades++;
      this.performance.totalProfit += pnl;
    } else {
      this.performance.losingTrades++;
      this.performance.totalProfit += pnl;
    }
    
    this.performance.winRate = this.performance.totalTrades > 0 ? 
      (this.performance.winningTrades / this.performance.totalTrades) * 100 : 0;
  }
  
  getOpenPositions() {
    return Array.from(this.positions.values()).filter(pos => pos.status === 'OPEN');
  }
  
  getTradeHistory(limit = 50) {
    return this.tradeHistory.slice(-limit).reverse();
  }
  
  getPerformance() {
    return {
      ...this.performance,
      dailyTrades: this.dailyTrades,
      dailyProfitLoss: this.dailyProfitLoss,
      openPositions: this.getOpenPositions().length,
      tradingActive: this.tradingActive,
      mode: MODE
    };
  }
  
  toggleTrading(active) {
    this.tradingActive = active;
    logger.liveTradeAlert(`Trading ${active ? 'ACTIVATED' : 'PAUSED'}`);
    return this.tradingActive;
  }
  
  resetDailyStats() {
    this.dailyTrades = 0;
    this.dailyProfitLoss = 0;
    logger.info('Daily stats reset');
  }
  
  round(value, decimals = 4) {
    const factor = Math.pow(10, decimals);
    return Math.round(value * factor) / factor;
  }
}

// ==================== TELEGRAM BOT HANDLER ====================
class TelegramBotHandler {
  constructor() {
    this.botToken = TELEGRAM_BOT_TOKEN;
    this.chatId = TELEGRAM_CHAT_ID;
    this.tradingEngine = new RealTradingEngine();
    this.lastUpdateId = 0;
    this.isRunning = false;
    this.pendingConfirmation = null;
    
    if (!this.botToken || !this.chatId) {
      throw new Error('Telegram bot token and chat ID required');
    }
    
    logger.info(`Telegram Bot Handler initialized - Mode: ${MODE}`);
  }
  
  async sendMessage(chatId, text, options = {}) {
    try {
      const data = {
        chat_id: chatId,
        text: text,
        parse_mode: options.parse_mode || 'HTML',
        reply_to_message_id: options.reply_to_message_id
      };
      
      const response = await http.post(
        `https://api.telegram.org/bot${this.botToken}/sendMessage`,
        JSON.stringify(data),
        {
          headers: {
            'Content-Type': 'application/json'
          },
          timeout: 5000
        }
      );
      
      const result = JSON.parse(response.text);
      
      if (result.ok) {
        return result.result;
      } else {
        throw new Error(result.description);
      }
    } catch (error) {
      logger.error(`Telegram send failed: ${error.message}`);
      throw error;
    }
  }
  
  async getUpdates() {
    try {
      const response = await http.get(
        `https://api.telegram.org/bot${this.botToken}/getUpdates?offset=${this.lastUpdateId + 1}&timeout=10`,
        { timeout: 15000 }
      );
      
      const result = JSON.parse(response.text);
      
      if (result.ok) {
        return result.result;
      }
      return [];
    } catch (error) {
      logger.error(`Get updates failed: ${error.message}`);
      return [];
    }
  }
  
  async startPolling() {
    if (this.isRunning) {
      logger.warn('Polling already running');
      return;
    }
    
    this.isRunning = true;
    logger.info('Starting Telegram polling...');
    
    // Send startup message
    try {
      await this.sendMessage(this.chatId, 
        `🤖 AI Trading System v5.0\n` +
        `Mode: ${MODE.toUpperCase()}\n` +
        `Status: 🟢 SYSTEM READY\n` +
        `Account: $${ACCOUNT_EQUITY}\n` +
        `Risk/Trade: ${DEFAULT_RISK_PCT}%\n\n` +
        `Type /help for commands`
      );
    } catch (error) {
      logger.error(`Failed to send startup message: ${error.message}`);
    }
    
    // Start polling loop
    this.pollingLoop();
  }
  
  async pollingLoop() {
    while (this.isRunning) {
      try {
        const updates = await this.getUpdates();
        
        if (updates && updates.length > 0) {
          for (const update of updates) {
            this.lastUpdateId = update.update_id;
            await this.handleUpdate(update);
          }
        }
        
        await http.sleep(1000);
      } catch (error) {
        logger.error(`Polling loop error: ${error.message}`);
        await http.sleep(5000);
      }
    }
  }
  
  stopPolling() {
    this.isRunning = false;
    logger.info('Telegram polling stopped');
  }
  
  async handleUpdate(update) {
    if (!update.message) return;
    
    const chatId = update.message.chat.id;
    const text = update.message.text || '';
    
    if (chatId.toString() !== this.chatId.toString()) {
      logger.warn(`Unauthorized chat: ${chatId}`);
      return;
    }
    
    try {
      if (text.startsWith('/analyze ')) {
        await this.handleAnalyzeCommand(chatId, text);
      } else if (text === '/start' || text === '/help') {
        await this.sendHelpMessage(chatId);
      } else if (text === '/status') {
        await this.sendStatusMessage(chatId);
      } else if (text === '/performance') {
        await this.sendPerformanceMessage(chatId);
      } else if (text === '/positions') {
        await this.sendPositionsMessage(chatId);
      } else if (text === '/markets') {
        await this.sendMarketStatus(chatId);
      } else if (text.startsWith('/trade ')) {
        await this.handleTradeCommand(chatId, text);
      } else if (text.startsWith('/confirm ')) {
        await this.handleConfirmation(chatId, text);
      } else if (text === '/toggle') {
        await this.toggleTrading(chatId);
      } else if (text === '/reset') {
        await this.resetDailyStats(chatId);
      }
    } catch (error) {
      logger.error(`Telegram handler error: ${error.message}`);
      await this.sendMessage(chatId, `❌ Error: ${error.message}`);
    }
  }
  
  async handleAnalyzeCommand(chatId, text) {
    const symbol = text.split(' ')[1];
    
    if (!symbol) {
      await this.sendMessage(chatId, '❌ Usage: /analyze SYMBOL\nExample: /analyze BTCUSDT');
      return;
    }
    
    const processingMsg = await this.sendMessage(chatId,
      `<b>🤖 Analyzing: ${symbol}</b>\n\n` +
      `📡 Fetching real market data...\n` +
      `📊 Running technical analysis...\n` +
      `🧠 AI strategy selection...`
    );
    
    try {
      const analysis = await this.tradingEngine.analyzeSymbol(symbol);
      
      if (analysis.error) {
        await this.sendMessage(chatId, 
          `<b>❌ Analysis Failed: ${symbol}</b>\n\n` +
          `<code>${analysis.errorMessage}</code>`
        );
        return;
      }
      
      await this.sendAnalysisResults(chatId, analysis);
      
    } catch (error) {
      await this.sendMessage(chatId,
        `<b>❌ Analysis Error: ${symbol}</b>\n\n` +
        `<code>${error.message}</code>`
      );
    }
  }
  
  async sendAnalysisResults(chatId, analysis) {
    const signal = analysis.tradeSignal;
    const strategy = analysis.strategySelection;
    
    if (signal.direction === 'NEUTRAL') {
      const message = `
⚠️ <b>AI Analysis: ${analysis.symbol}</b>

<b>Decision:</b> NO TRADE
<b>Reason:</b> ${signal.reason || 'Market conditions not optimal'}

<b>AI Strategy:</b> ${strategy.name} ${strategy.emoji}
<b>Score:</b> ${(strategy.score * 100).toFixed(1)}%

<b>📊 Market Conditions:</b>
Price: $${analysis.currentPrice.toFixed(2)}
24h Change: ${analysis.priceChange24h.toFixed(2)}%
RSI: ${analysis.indicators.rsi.toFixed(1)}
Trend: ${analysis.indicators.trend?.direction || 'NEUTRAL'}
Volume: ${analysis.volume24h.toLocaleString()}

<b>🤖 Recommendation:</b>
Wait for better conditions or try different symbol.
      `;
      
      await this.sendMessage(chatId, message);
      return;
    }
    
    const emoji = signal.direction === 'LONG' ? '🟢' : '🔴';
    const directionText = signal.direction === 'LONG' ? 'BUY/LONG' : 'SELL/SHORT';
    
    const message = `
${emoji} <b>TRADE SIGNAL: ${analysis.symbol}</b>

<b>Action:</b> ${directionText} ${emoji}
<b>Strategy:</b> ${strategy.name} ${strategy.emoji}
<b>Confidence:</b> ${(signal.confidence * 100).toFixed(1)}%

<b>🎯 Levels:</b>
Entry: $${signal.entry}
Stop Loss: $${signal.stopLoss}
Take Profit: $${signal.takeProfit.join(' | $')}

<b>💰 Position:</b>
Units: ${signal.positionSize.units}
Value: $${signal.positionSize.positionValue}
Risk: $${signal.positionSize.riskAmount} (${signal.positionSize.riskPercentage}%)

<b>⚖️ Risk/Reward:</b>
Risk: $${signal.risk}
R/R: 1:${signal.riskRewards[0].toFixed(2)} | 1:${signal.riskRewards[1].toFixed(2)} | 1:${signal.riskRewards[2].toFixed(2)}

<b>⚠️ Risk Assessment:</b>
Level: ${analysis.riskAssessment.level}
Score: ${analysis.riskAssessment.score}/10
${analysis.riskAssessment.reasons?.map(r => `• ${r}`).join('\n') || '• Normal conditions'}

<b>📊 Technicals:</b>
Price: $${analysis.currentPrice.toFixed(2)}
24h Change: ${analysis.priceChange24h.toFixed(2)}%
RSI: ${analysis.indicators.rsi.toFixed(1)}
MACD: ${analysis.indicators.macd.histogram.toFixed(4)}
ATR: ${analysis.indicators.atr.toFixed(4)}

${MODE === 'live' ? `<b>🚨 LIVE MODE ACTIVE</b>\nType <code>/trade ${analysis.symbol}</code> to execute` : ''}
      `;
    
    await this.sendMessage(chatId, message);
  }
  
  async handleTradeCommand(chatId, text) {
    const parts = text.split(' ');
    const symbol = parts[1];
    const exchange = parts[2] || 'binance';
    
    if (!symbol) {
      await this.sendMessage(chatId, '❌ Usage: /trade SYMBOL [exchange]\nExample: /trade BTCUSDT binance');
      return;
    }
    
    if (MODE !== 'live') {
      await this.sendMessage(chatId,
        `❌ Cannot execute trade. Current mode: ${MODE}\n` +
        `Set MODE=live in environment variables to enable live trading.`
      );
      return;
    }
    
    // First analyze the symbol
    const processingMsg = await this.sendMessage(chatId,
      `<b>🚀 Preparing Live Trade: ${symbol}</b>\n\n` +
      `Analyzing market conditions...`
    );
    
    try {
      const analysis = await this.tradingEngine.analyzeSymbol(symbol);
      
      if (analysis.error) {
        await this.sendMessage(chatId, 
          `<b>❌ Analysis Failed: ${symbol}</b>\n\n` +
          `<code>${analysis.errorMessage}</code>`
        );
        return;
      }
      
      if (analysis.tradeSignal.direction === 'NEUTRAL') {
        await this.sendAnalysisResults(chatId, analysis);
        return;
      }
      
      // Show trade details and ask for confirmation
      const signal = analysis.tradeSignal;
      const emoji = signal.direction === 'LONG' ? '🟢' : '🔴';
      
      const confirmationMessage = `
🚨 <b>LIVE TRADE CONFIRMATION REQUIRED</b>

${emoji} <b>${signal.direction} ${symbol}</b>

<b>Entry:</b> $${signal.entry}
<b>Stop Loss:</b> $${signal.stopLoss}
<b>Take Profit:</b> $${signal.takeProfit.join(' | $')}

<b>Position Size:</b>
Units: ${signal.positionSize.units}
Value: $${signal.positionSize.positionValue}
Risk: $${signal.positionSize.riskAmount}

<b>Exchange:</b> ${exchange.toUpperCase()}
<b>Mode:</b> ${MODE.toUpperCase()}

<b>⚠️ REAL MONEY AT RISK ⚠️</b>

Type <code>/confirm ${symbol} ${exchange}</code> within 30 seconds to execute.
Type anything else to cancel.
      `;
      
      await this.sendMessage(chatId, confirmationMessage);
      
      // Store pending confirmation
      this.pendingConfirmation = {
        chatId: chatId,
        symbol: symbol,
        exchange: exchange,
        analysis: analysis,
        timestamp: Date.now()
      };
      
      // Auto-cancel after 30 seconds
      setTimeout(() => {
        if (this.pendingConfirmation && this.pendingConfirmation.symbol === symbol) {
          this.sendMessage(chatId, `⏰ Trade confirmation timed out for ${symbol}`);
          this.pendingConfirmation = null;
        }
      }, 30000);
      
    } catch (error) {
      await this.sendMessage(chatId,
        `<b>❌ Trade preparation failed: ${symbol}</b>\n\n` +
        `<code>${error.message}</code>`
      );
    }
  }
  
  async handleConfirmation(chatId, text) {
    if (!this.pendingConfirmation) {
      await this.sendMessage(chatId, '❌ No pending trade confirmation');
      return;
    }
    
    const parts = text.split(' ');
    const symbol = parts[1];
    const exchange = parts[2] || 'binance';
    
    if (symbol !== this.pendingConfirmation.symbol) {
      await this.sendMessage(chatId, '❌ Confirmation does not match pending trade');
      return;
    }
    
    const analysis = this.pendingConfirmation.analysis;
    const signal = analysis.tradeSignal;
    
    await this.sendMessage(chatId,
      `🚀 <b>EXECUTING LIVE TRADE: ${signal.direction} ${symbol}</b>\n\n` +
      `Placing order on ${exchange.toUpperCase()}...`
    );
    
    try {
      const tradeResult = await this.tradingEngine.executeLiveTrade(symbol, signal, exchange);
      
      if (tradeResult.success) {
        const message = `
✅ <b>LIVE TRADE EXECUTED</b>

<b>Symbol:</b> ${symbol}
<b>Direction:</b> ${signal.direction}
<b>Order ID:</b> ${tradeResult.orderId}
<b>Quantity:</b> ${tradeResult.quantity}
<b>Price:</b> $${tradeResult.price}
<b>Exchange:</b> ${exchange.toUpperCase()}

<b>Stop Loss:</b> $${signal.stopLoss}
<b>Take Profit:</b> $${signal.takeProfit.join(' | $')}

<b>Risk:</b> $${signal.positionSize.riskAmount}
<b>Strategy:</b> ${signal.strategyName}

<b>⏰ Time:</b> ${new Date().toLocaleTimeString()}
        `;
        
        await this.sendMessage(chatId, message);
      } else {
        await this.sendMessage(chatId,
          `❌ <b>Trade execution failed:</b>\n\n` +
          `<code>${tradeResult.error || tradeResult.message}</code>`
        );
      }
    } catch (error) {
      await this.sendMessage(chatId,
        `❌ <b>Trade execution error:</b>\n\n` +
        `<code>${error.message}</code>`
      );
    }
    
    this.pendingConfirmation = null;
  }
  
  async toggleTrading(chatId) {
    const currentState = this.tradingEngine.tradingActive;
    const newState = !currentState;
    
    this.tradingEngine.toggleTrading(newState);
    
    await this.sendMessage(chatId,
      `🔄 <b>Trading ${newState ? 'ACTIVATED' : 'PAUSED'}</b>\n\n` +
      `All ${newState ? 'new trades will be executed' : 'trading is paused'}.\n` +
      `Existing positions will continue to be managed.`
    );
  }
  
  async resetDailyStats(chatId) {
    this.tradingEngine.resetDailyStats();
    
    await this.sendMessage(chatId,
      `🔄 <b>Daily Stats Reset</b>\n\n` +
      `Trade count and P&L have been reset to zero.\n` +
      `Performance history is preserved.`
    );
  }
  
  async sendHelpMessage(chatId) {
    const message = `
<b>🤖 AI Trading System v5.0</b>
<i>Real Market Data • ${MODE.toUpperCase()} Mode</i>

<b>📋 Commands:</b>
/analyze SYMBOL - Analyze any asset
/trade SYMBOL - Execute live trade (LIVE mode only)
/confirm SYMBOL - Confirm pending trade
/status - System status
/performance - Trading performance
/positions - Open positions
/markets - Market status
/toggle - Toggle trading on/off
/reset - Reset daily stats
/help - This message

<b>📈 Examples:</b>
/analyze BTCUSDT
/analyze ETHUSDT
/trade BTCUSDT binance

<b>⚙️ Configuration:</b>
Mode: ${MODE.toUpperCase()}
Account: $${ACCOUNT_EQUITY}
Risk/Trade: ${DEFAULT_RISK_PCT}%
Max Positions: ${MAX_POSITIONS}

<b>⚠️ WARNING:</b>
${MODE === 'live' ? 'LIVE TRADING ACTIVE - REAL MONEY AT RISK' : 'Paper trading mode - No real money'}
      `;
    
    await this.sendMessage(chatId, message);
  }
  
  async sendStatusMessage(chatId) {
    const marketData = new RealMarketData();
    const marketStatus = await marketData.getMarketStatus();
    const performance = this.tradingEngine.getPerformance();
    
    const message = `
<b>📊 System Status</b>

<b>Mode:</b> ${MODE.toUpperCase()}
<b>Trading:</b> ${this.tradingEngine.tradingActive ? '🟢 ACTIVE' : '🔴 PAUSED'}
<b>Uptime:</b> ${Math.floor(process.uptime() / 3600)}h ${Math.floor((process.uptime() % 3600) / 60)}m

<b>💰 Account:</b>
Equity: $${ACCOUNT_EQUITY}
Risk/Trade: ${DEFAULT_RISK_PCT}%

<b>📈 Performance:</b>
Total Trades: ${performance.totalTrades}
Win Rate: ${performance.winRate.toFixed(1)}%
Total P&L: $${performance.totalProfit.toFixed(2)}
Daily Trades: ${performance.dailyTrades}/${MAX_DAILY_TRADES}
Daily P&L: $${performance.dailyProfitLoss.toFixed(2)}
Open Positions: ${performance.openPositions}

<b>📡 Market Status:</b>
${marketStatus.stockMarket ? `Stocks: ${marketStatus.stockMarket}` : ''}
${marketStatus.cryptoMarket ? `Crypto: ${marketStatus.cryptoMarket}` : ''}
${marketStatus.btcPrice ? `BTC: $${marketStatus.btcPrice.toFixed(2)}` : ''}
${marketStatus.ethPrice ? `ETH: $${marketStatus.ethPrice.toFixed(2)}` : ''}
      `;
    
    await this.sendMessage(chatId, message);
  }
  
  async sendPerformanceMessage(chatId) {
    const performance = this.tradingEngine.getPerformance();
    const history = this.tradingEngine.getTradeHistory(10);
    
    let historyText = '';
    if (history.length > 0) {
      historyText = '\n<b>📜 Recent Trades:</b>\n';
      history.forEach(trade => {
        const emoji = trade.direction === 'LONG' ? '🟢' : '🔴';
        const status = trade.status === 'OPEN' ? '🟡' : trade.pnl >= 0 ? '🟢' : '🔴';
        historyText += `${status} ${emoji} ${trade.symbol} | $${trade.entryPrice.toFixed(2)} | P&L: $${trade.pnl?.toFixed(2) || 'N/A'}\n`;
      });
    }
    
    const message = `
<b>💰 Trading Performance</b>

<b>Overall:</b>
Total Trades: ${performance.totalTrades}
Winning: ${performance.winningTrades}
Losing: ${performance.losingTrades}
Win Rate: ${performance.winRate.toFixed(1)}%
Total P&L: $${performance.totalProfit.toFixed(2)}

<b>Today:</b>
Trades: ${performance.dailyTrades}
P&L: $${performance.dailyProfitLoss.toFixed(2)}
Open Positions: ${performance.openPositions}
${historyText}
      `;
    
    await this.sendMessage(chatId, message);
  }
  
  async sendPositionsMessage(chatId) {
    const positions = this.tradingEngine.getOpenPositions();
    
    if (positions.length === 0) {
      await this.sendMessage(chatId, '📭 No open positions');
      return;
    }
    
    let message = `<b>📦 Open Positions (${positions.length})</b>\n\n`;
    
    positions.forEach((pos, index) => {
      const emoji = pos.direction === 'LONG' ? '🟢' : '🔴';
      message += `${index + 1}. ${emoji} <b>${pos.symbol}</b>\n`;
      message += `   Direction: ${pos.direction}\n`;
      message += `   Entry: $${pos.entryPrice.toFixed(2)}\n`;
      message += `   Stop Loss: $${pos.stopLoss.toFixed(2)}\n`;
      message += `   Take Profit: $${pos.takeProfit.join(' | $')}\n`;
      message += `   Quantity: ${pos.quantity}\n`;
      message += `   Strategy: ${pos.strategy}\n`;
      message += `   Order ID: ${pos.orderId}\n\n`;
    });
    
    await this.sendMessage(chatId, message);
  }
  
  async sendMarketStatus(chatId) {
    const marketData = new RealMarketData();
    
    try {
      const status = await marketData.getMarketStatus();
      
      const message = `
<b>📡 Market Status</b>

<b>Current Time:</b> ${new Date().toLocaleString()}
${status.stockMarket ? `<b>Stock Market:</b> ${status.stockMarket}` : ''}
<b>Crypto Market:</b> ${status.cryptoMarket}

<b>💎 Key Prices:</b>
${status.btcPrice ? `BTC: $${status.btcPrice.toFixed(2)}` : ''}
${status.ethPrice ? `ETH: $${status.ethPrice.toFixed(2)}` : ''}

<b>⏰ Trading Hours:</b>
• Stocks: Mon-Fri 9:30AM-4:00PM EST
• Crypto: 24/7
• Forex: 24/5

<b>⚠️ Note:</b>
Market hours affect liquidity and volatility.
      `;
      
      await this.sendMessage(chatId, message);
      
    } catch (error) {
      await this.sendMessage(chatId,
        `<b>❌ Market Status Failed</b>\n\n<code>${error.message}</code>`
      );
    }
  }
}

// ==================== MAIN APPLICATION ====================
class AI_Trading_System {
  constructor() {
    this.telegramBot = null;
    this.tradingEngine = null;
    this.httpServer = null;
    this.instanceId = Math.random().toString(36).substr(2, 9);
    this.positionManagerInterval = null;
  }
  
  async initialize() {
    try {
      logger.info('='.repeat(60));
      logger.info(`🚀 AI TRADING SYSTEM v5.0 - ${MODE.toUpperCase()} MODE`);
      logger.info(`Instance ID: ${this.instanceId}`);
      logger.info('='.repeat(60));
      logger.info('📡 Features:');
      logger.info('• 100% Real Market Data • No Simulations');
      logger.info(`• ${MODE.toUpperCase()} Trading Mode`);
      logger.info('• Advanced AI Strategy Selection');
      logger.info('• Complete Risk Management');
      logger.info('• Live Trade Execution');
      logger.info('');
      logger.info('💰 Trading Parameters:');
      logger.info(`Account Equity: $${ACCOUNT_EQUITY}`);
      logger.info(`Risk per Trade: ${DEFAULT_RISK_PCT}%`);
      logger.info(`Max Positions: ${MAX_POSITIONS}`);
      logger.info(`Max Daily Trades: ${MAX_DAILY_TRADES}`);
      logger.info('');
      
      if (MODE === 'live') {
        logger.warn('🚨 LIVE TRADING MODE ACTIVE');
        logger.warn('   REAL MONEY WILL BE USED');
        logger.warn('   TRADE WITH CAUTION');
        logger.info('');
      }
      
      // Initialize trading engine
      this.tradingEngine = new RealTradingEngine();
      
      // Initialize Telegram bot
      this.telegramBot = new TelegramBotHandler();
      
      // Start HTTP server
      this.startHttpServer();
      
      // Start Telegram polling
      this.startTelegramPolling();
      
      // Start position management
      this.startPositionManagement();
      
      // Reset daily stats at midnight
      this.scheduleDailyReset();
      
      logger.info('');
      logger.info('✅ SYSTEM READY');
      logger.info(`🌐 HTTP: http://localhost:${PORT}`);
      logger.info(`📊 API: POST http://localhost:${PORT}/api/analyze`);
      logger.info('🤖 Telegram: Send /help to bot');
      logger.info(`📝 Mode: ${MODE.toUpperCase()}`);
      
    } catch (error) {
      logger.error('Startup error:', error.message);
      process.exit(1);
    }
  }
  
  startHttpServer() {
    const http = require('http');
    const url = require('url');
    
    const server = http.createServer(async (req, res) => {
      const parsedUrl = url.parse(req.url, true);
      const pathname = parsedUrl.pathname;
      
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
      
      if (req.method === 'OPTIONS') {
        res.writeHead(204);
        res.end();
        return;
      }
      
      try {
        if (req.method === 'GET' && pathname === '/health') {
          await this.handleHealth(req, res);
        } else if (req.method === 'POST' && pathname === '/api/analyze') {
          await this.handleAIAnalysis(req, res);
        } else if (req.method === 'POST' && pathname === '/api/trade') {
          await this.handleLiveTrade(req, res);
        } else if (req.method === 'GET' && pathname === '/api/positions') {
          await this.handlePositions(req, res);
        } else if (req.method === 'GET' && pathname === '/api/performance') {
          await this.handlePerformance(req, res);
        } else if (req.method === 'GET' && pathname === '/test') {
          await this.handleTest(req, res);
        } else if (req.method === 'GET' && pathname === '/') {
          await this.handleRoot(req, res);
        } else {
          res.writeHead(404, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Not found' }));
        }
      } catch (error) {
        logger.error(`HTTP Error: ${error.message}`);
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: error.message }));
      }
    });
    
    server.listen(PORT, () => {
      logger.info(`🌐 HTTP server running on port ${PORT}`);
    });
    
    this.httpServer = server;
  }
  
  startTelegramPolling() {
    // Start polling in background
    setTimeout(() => {
      this.telegramBot.startPolling().catch(error => {
        logger.error(`Telegram polling failed: ${error.message}`);
      });
    }, 2000);
  }
  
  startPositionManagement() {
    // Check positions every 30 seconds
    this.positionManagerInterval = setInterval(async () => {
      try {
        await this.tradingEngine.checkAndManagePositions();
      } catch (error) {
        logger.error(`Position management error: ${error.message}`);
      }
    }, 30000);
    
    logger.info('Position management started (30s interval)');
  }
  
  scheduleDailyReset() {
    // Schedule daily reset at midnight
    const now = new Date();
    const midnight = new Date();
    midnight.setHours(24, 0, 0, 0);
    const timeToMidnight = midnight.getTime() - now.getTime();
    
    setTimeout(() => {
      this.tradingEngine.resetDailyStats();
      // Schedule next reset
      this.scheduleDailyReset();
    }, timeToMidnight);
    
    logger.info(`Daily stats reset scheduled for ${midnight.toLocaleTimeString()}`);
  }
  
  async handleHealth(req, res) {
    const marketData = new RealMarketData();
    const status = await marketData.getMarketStatus();
    
    const health = {
      status: 'operational',
      version: '5.0',
      timestamp: Date.now(),
      uptime: process.uptime(),
      
      system: {
        instanceId: this.instanceId,
        mode: MODE,
        tradingActive: this.tradingEngine.tradingActive,
        accountEquity: ACCOUNT_EQUITY,
        riskPerTrade: DEFAULT_RISK_PCT
      },
      
      market: status,
      
      performance: this.tradingEngine.getPerformance(),
      
      data: {
        quality: 'REAL',
        simulations: 'NONE'
      }
    };
    
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(health, null, 2));
  }
  
  async handleAIAnalysis(req, res) {
    let body = '';
    req.on('data', chunk => body += chunk);
    
    req.on('end', async () => {
      try {
        const data = JSON.parse(body || '{}');
        const { symbol, timeframe = '1h' } = data;
        
        if (!symbol) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Symbol required' }));
          return;
        }
        
        const analysis = await this.tradingEngine.analyzeSymbol(symbol, timeframe);
        
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          success: true,
          timestamp: Date.now(),
          analysis: analysis
        }));
      } catch (error) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ 
          success: false, 
          error: error.message 
        }));
      }
    });
  }
  
  async handleLiveTrade(req, res) {
    if (MODE !== 'live') {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ 
        success: false, 
        error: 'Not in live mode' 
      }));
      return;
    }
    
    let body = '';
    req.on('data', chunk => body += chunk);
    
    req.on('end', async () => {
      try {
        const data = JSON.parse(body || '{}');
        const { symbol, exchange = 'binance' } = data;
        
        if (!symbol) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Symbol required' }));
          return;
        }
        
        // Analyze first
        const analysis = await this.tradingEngine.analyzeSymbol(symbol);
        
        if (analysis.error || analysis.tradeSignal.direction === 'NEUTRAL') {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ 
            success: false, 
            error: 'No valid trade signal',
            analysis: analysis
          }));
          return;
        }
        
        // Execute trade
        const tradeResult = await this.tradingEngine.executeLiveTrade(
          symbol, 
          analysis.tradeSignal, 
          exchange
        );
        
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          success: tradeResult.success,
          timestamp: Date.now(),
          trade: tradeResult,
          analysis: analysis
        }));
      } catch (error) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ 
          success: false, 
          error: error.message 
        }));
      }
    });
  }
  
  async handlePositions(req, res) {
    const positions = this.tradingEngine.getOpenPositions();
    
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      success: true,
      timestamp: Date.now(),
      count: positions.length,
      positions: positions
    }));
  }
  
  async handlePerformance(req, res) {
    const performance = this.tradingEngine.getPerformance();
    
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      success: true,
      timestamp: Date.now(),
      performance: performance
    }));
  }
  
  async handleTest(req, res) {
    const test = {
      status: 'ok',
      message: 'AI Trading System v5.0',
      timestamp: Date.now(),
      mode: MODE,
      features: [
        '100% Real Market Data',
        'No Simulations',
        'Live Trading Capability',
        'Advanced AI Analysis',
        'Complete Risk Management'
      ],
      configuration: {
        accountEquity: ACCOUNT_EQUITY,
        riskPerTrade: DEFAULT_RISK_PCT,
        maxPositions: MAX_POSITIONS,
        maxDailyTrades: MAX_DAILY_TRADES
      }
    };
    
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(test, null, 2));
  }
  
  async handleRoot(req, res) {
    const html = `
<!DOCTYPE html>
<html>
<head>
    <title>AI Trading System v5.0 - ${MODE.toUpperCase()}</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 40px; background: #0f0f23; color: #00ff00; }
        .container { max-width: 800px; margin: 0 auto; }
        .header { background: #1a1a2e; padding: 20px; border-radius: 10px; margin-bottom: 20px; }
        .status { background: #16213e; padding: 15px; border-radius: 8px; margin: 10px 0; }
        .endpoint { background: #0f3460; padding: 10px; border-radius: 5px; margin: 5px 0; }
        .green { color: #00ff00; }
        .yellow { color: #ffff00; }
        .red { color: #ff0000; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🤖 AI Trading System v5.0</h1>
            <p><span class="${MODE === 'live' ? 'red' : 'green'}">${MODE.toUpperCase()} MODE</span></p>
            <p>Instance: ${this.instanceId}</p>
            <p>Real Market Data • No Simulations</p>
        </div>
        
        <div class="status">
            <h2>📊 System Status</h2>
            <p>Trading: <span class="${this.tradingEngine.tradingActive ? 'green' : 'red'}">${this.tradingEngine.tradingActive ? 'ACTIVE' : 'PAUSED'}</span></p>
            <p>Mode: <span class="${MODE === 'live' ? 'red' : 'green'}">${MODE.toUpperCase()}</span></p>
            <p>Port: ${PORT}</p>
        </div>
        
        <div class="status">
            <h2>🚀 API Endpoints</h2>
            <div class="endpoint">
                <strong>GET /health</strong> - System health check
            </div>
            <div class="endpoint">
                <strong>POST /api/analyze</strong> - AI analysis for any symbol
            </div>
            ${MODE === 'live' ? `
            <div class="endpoint">
                <strong>POST /api/trade</strong> - Execute live trade
            </div>
            ` : ''}
            <div class="endpoint">
                <strong>GET /api/positions</strong> - Open positions
            </div>
            <div class="endpoint">
                <strong>GET /api/performance</strong> - Trading performance
            </div>
        </div>
        
        <div class="status">
            <h2>📈 Example Analysis</h2>
            <pre style="background: #000; padding: 10px; border-radius: 5px;">
curl -X POST http://localhost:${PORT}/api/analyze \\
  -H "Content-Type: application/json" \\
  -d '{"symbol": "BTCUSDT", "timeframe": "1h"}'
            </pre>
        </div>
        
        <div class="status">
            <h2>⚠️ Important</h2>
            <p>• Uses 100% real market data (no simulations)</p>
            <p>• ${MODE === 'live' ? 'LIVE TRADING - REAL MONEY AT RISK' : 'Paper trading - No real money'}</p>
            <p>• Always use stop losses</p>
            <p>• Monitor system performance</p>
        </div>
    </div>
</body>
</html>
    `;
    
    res.writeHead(200, { 'Content-Type': 'text/html' });
    res.end(html);
  }
  
  async shutdown() {
    logger.info('🔄 Shutting down AI Trading System...');
    
    if (this.positionManagerInterval) {
      clearInterval(this.positionManagerInterval);
    }
    
    if (this.telegramBot) {
      this.telegramBot.stopPolling();
    }
    
    if (this.httpServer) {
      this.httpServer.close();
    }
    
    logger.info('✅ Shutdown complete');
    process.exit(0);
  }
}

// ==================== START THE SYSTEM ====================
if (require.main === module) {
  const system = new AI_Trading_System();
  
  // Handle graceful shutdown
  process.on('SIGINT', () => system.shutdown());
  process.on('SIGTERM', () => system.shutdown());
  
  // Handle uncaught errors
  process.on('uncaughtException', (error) => {
    logger.error('Uncaught exception:', error);
    system.shutdown();
  });
  
  process.on('unhandledRejection', (error) => {
    logger.error('Unhandled rejection:', error);
  });
  
  system.initialize();
}

// Export for testing
module.exports = {
  AI_Trading_System,
  RealTradingEngine,
  RealAIStrategyEngine,
  RealTechnicalAnalysis,
  RealMarketData,
  TelegramBotHandler
};
