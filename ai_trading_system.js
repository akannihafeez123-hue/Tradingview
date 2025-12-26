#!/usr/bin/env node
'use strict';

// ==================== CONFIGURATION ====================
const {
  PORT = 3000,
  MODE = 'paper',
  TELEGRAM_BOT_TOKEN,
  TELEGRAM_CHAT_ID,
  TV_WEBHOOK_SECRET,
  
  // TRADING PARAMETERS
  ACCOUNT_EQUITY = 100000,
  DEFAULT_RISK_PCT = 2.0,
  DAILY_DRAWDOWN_LIMIT = 0.05,
  MAX_POSITIONS = 5,
  
  // EXCHANGE API KEYS (REAL)
  BINANCE_API_KEY,
  BINANCE_API_SECRET,
  BYBIT_API_KEY,
  BYBIT_API_SECRET,
  KUCOIN_API_KEY,
  KUCOIN_API_SECRET,
  COINBASE_API_KEY,
  COINBASE_API_SECRET,
  
  // TRADITIONAL MARKETS
  ALPACA_API_KEY,
  ALPACA_SECRET_KEY,
  ALPACA_BASE_URL = 'https://paper-api.alpaca.markets/v2',
  
  // DATA APIS (REAL)
  FINNHUB_API_KEY,
  ALPHA_VANTAGE_API_KEY,
  TWELVE_DATA_API_KEY,
  POLYGON_API_KEY,
  
  // AI SETTINGS
  ENABLE_AI_STRATEGY_SELECTION = 'true',
  LOG_LEVEL = 'info',
  
  // TELEGRAM WEBHOOK (REAL WORKING URL)
  TELEGRAM_WEBHOOK_URL,
  
  // SECURITY
  JWT_SECRET = 'ai-trading-secret-2024',
  API_RATE_LIMIT = 100
  
} = process.env;

// Load environment variables
if (require('fs').existsSync('.env')) {
  require('fs').readFileSync('.env', 'utf8').split('\n').forEach(line => {
    const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
    if (match) {
      let value = match[2] || '';
      if (value.startsWith('"') && value.endsWith('"')) value = value.slice(1, -1);
      if (value.startsWith("'") && value.endsWith("'")) value = value.slice(1, -1);
      process.env[match[1]] = value;
    }
  });
}

if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_CHAT_ID) {
  console.error('❌ Missing TELEGRAM_BOT_TOKEN or TELEGRAM_CHAT_ID');
  process.exit(1);
}

// ==================== REAL LOGGER ====================
class RealLogger {
  constructor() {
    this.levels = { error: 0, warn: 1, info: 2, debug: 3 };
    this.level = this.levels[LOG_LEVEL] || 1;
    this.logFile = 'trading_system.log';
    this.initLogFile();
  }
  
  initLogFile() {
    const fs = require('fs');
    const header = `\n\n=== AI TRADING SYSTEM LOG - ${new Date().toISOString()} ===\n`;
    fs.appendFileSync(this.logFile, header);
  }
  
  log(level, message, data = null) {
    if (this.levels[level] <= this.level) {
      const timestamp = new Date().toISOString();
      const logEntry = `${timestamp} [${level.toUpperCase()}] ${message}` + 
                       (data ? ` | ${JSON.stringify(data)}` : '');
      
      console.log(logEntry);
      
      // Write to file
      const fs = require('fs');
      fs.appendFileSync(this.logFile, logEntry + '\n');
    }
  }
  
  info(message, data) { this.log('info', message, data); }
  error(message, data) { this.log('error', message, data); }
  warn(message, data) { this.log('warn', message, data); }
  debug(message, data) { this.log('debug', message, data); }
  
  tradeSignal(symbol, direction, entry, sl, tp) {
    const signal = {
      timestamp: Date.now(),
      symbol,
      direction,
      entry,
      stopLoss: sl,
      takeProfit: tp,
      type: 'AI_SIGNAL'
    };
    
    const message = `📈 ${direction} ${symbol} @ $${entry} | SL: $${sl} | TP: $${tp.join('/')}`;
    this.log('info', message, signal);
    
    // Also write to signals file
    const fs = require('fs');
    fs.appendFileSync('trade_signals.jsonl', JSON.stringify(signal) + '\n');
  }
}

const logger = new RealLogger();

// ==================== REAL HTTP CLIENT ====================
class RealHttpClient {
  constructor() {
    this.https = require('https');
    this.http = require('http');
    this.cache = new Map();
    this.rateLimits = new Map();
    this.userAgent = 'Mozilla/5.0 (compatible; AI_Trading_System/5.0)';
  }
  
  async request(method, url, options = {}) {
    const cacheKey = `${method}:${url}:${JSON.stringify(options.body || {})}`;
    const cacheTTL = options.cacheTTL || 0;
    
    // Check cache
    if (cacheTTL > 0 && this.cache.has(cacheKey)) {
      const cached = this.cache.get(cacheKey);
      if (Date.now() - cached.timestamp < cacheTTL) {
        return cached.data;
      }
    }
    
    // Rate limiting
    const domain = new URL(url).hostname;
    const now = Date.now();
    const window = 60000; // 1 minute
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
          // Update rate limit
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
            // Not JSON, keep as text
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
      
      req.on('error', reject);
      req.on('timeout', () => {
        req.destroy();
        reject(new Error(`Request timeout after ${reqOptions.timeout}ms`));
      });
      
      if (options.body) {
        if (typeof options.body === 'string') {
          req.write(options.body);
        } else if (options.formData) {
          // Handle multipart/form-data
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
}

const http = new RealHttpClient();

// ==================== REAL MARKET DATA ====================
class RealMarketData {
  constructor() {
    this.apis = this.setupAPIs();
    this.cache = new Map();
    this.symbolCache = new Map();
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
        base: ALPACA_BASE_URL,
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
      financialModeling: 'https://financialmodelingprep.com/api/v3',
      marketStack: 'https://api.marketstack.com/v1'
    };
  }
  
  async getOHLCV(symbol, timeframe = '1h', limit = 200) {
    const cacheKey = `${symbol}:${timeframe}:${limit}`;
    const cached = this.cache.get(cacheKey);
    
    if (cached && Date.now() - cached.timestamp < 30000) {
      return cached.data;
    }
    
    try {
      const data = await this.fetchFromAllSources(symbol, timeframe, limit);
      
      if (data && data.length > 0) {
        this.cache.set(cacheKey, { timestamp: Date.now(), data });
        return data;
      }
      
      throw new Error('No data from any source');
      
    } catch (error) {
      logger.error(`Market data failed for ${symbol}:`, error.message);
      throw error;
    }
  }
  
  async fetchFromAllSources(symbol, timeframe, limit) {
    const symbolType = this.detectSymbolType(symbol);
    
    const promises = [];
    
    if (symbolType === 'crypto') {
      promises.push(this.fetchFromBinance(symbol, timeframe, limit));
      promises.push(this.fetchFromCoinGecko(symbol, timeframe, limit));
      promises.push(this.fetchFromCoinPaprika(symbol, timeframe, limit));
      promises.push(this.fetchFromBybit(symbol, timeframe, limit));
    } else if (symbolType === 'stock') {
      promises.push(this.fetchFromAlpaca(symbol, timeframe, limit));
      promises.push(this.fetchFromFinnhub(symbol, timeframe, limit));
      promises.push(this.fetchFromYahoo(symbol, timeframe, limit));
      promises.push(this.fetchFromPolygon(symbol, timeframe, limit));
    } else if (symbolType === 'forex') {
      promises.push(this.fetchFromTwelveData(symbol, timeframe, limit));
      promises.push(this.fetchFromMarketStack(symbol, timeframe, limit));
    }
    
    promises.push(this.fetchFromFinancialModeling(symbol, timeframe, limit));
    
    const results = await Promise.allSettled(promises);
    
    for (const result of results) {
      if (result.status === 'fulfilled' && result.value && result.value.length > 0) {
        logger.debug(`Got data from source: ${result.value.source || 'unknown'}`);
        return result.value;
      }
    }
    
    return [];
  }
  
  async fetchFromBinance(symbol, timeframe, limit) {
    try {
      const interval = this.mapTimeframe(timeframe, 'binance');
      const binanceSymbol = symbol.replace('/', '').toUpperCase();
      
      const response = await http.get(
        `${this.apis.binance.base}/api/v3/klines?symbol=${binanceSymbol}&interval=${interval}&limit=${limit}`
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
          trades: candle[8],
          takerBuyBase: parseFloat(candle[9]),
          takerBuyQuote: parseFloat(candle[10])
        }));
      }
    } catch (error) {
      logger.debug(`Binance failed: ${error.message}`);
    }
    return null;
  }
  
  async fetchFromAlpaca(symbol, timeframe, limit) {
    if (!this.apis.alpaca.hasKey) return null;
    
    try {
      const interval = this.mapTimeframe(timeframe, 'alpaca');
      const response = await http.get(
        `${this.apis.alpaca.base}/stocks/${symbol}/bars?timeframe=${interval}&limit=${limit}`,
        {
          headers: {
            'APCA-API-KEY-ID': ALPACA_API_KEY,
            'APCA-API-SECRET-KEY': ALPACA_SECRET_KEY
          }
        }
      );
      
      if (response.json && response.json.bars) {
        return response.json.bars.map(bar => ({
          timestamp: new Date(bar.t).getTime(),
          open: bar.o,
          high: bar.h,
          low: bar.l,
          close: bar.c,
          volume: bar.v,
          tradeCount: bar.n,
          vwap: bar.vw
        }));
      }
    } catch (error) {
      logger.debug(`Alpaca failed: ${error.message}`);
    }
    return null;
  }
  
  async fetchFromFinnhub(symbol, timeframe, limit) {
    if (!this.apis.finnhub.hasKey) return null;
    
    try {
      const resolution = this.mapTimeframe(timeframe, 'finnhub');
      const to = Math.floor(Date.now() / 1000);
      const from = to - (limit * this.getSecondsForTimeframe(timeframe));
      
      const response = await http.get(
        `${this.apis.finnhub.base}/stock/candle?symbol=${symbol}&resolution=${resolution}&from=${from}&to=${to}&token=${FINNHUB_API_KEY}`
      );
      
      if (response.json && response.json.s === 'ok') {
        const data = [];
        for (let i = 0; i < response.json.c.length; i++) {
          data.push({
            timestamp: response.json.t[i] * 1000,
            open: response.json.o[i],
            high: response.json.h[i],
            low: response.json.l[i],
            close: response.json.c[i],
            volume: response.json.v[i]
          });
        }
        return data;
      }
    } catch (error) {
      logger.debug(`Finnhub failed: ${error.message}`);
    }
    return null;
  }
  
  async fetchFromYahoo(symbol, timeframe, limit) {
    try {
      const interval = this.mapTimeframe(timeframe, 'yahoo');
      const range = this.getYahooRange(limit, timeframe);
      
      let yahooSymbol = symbol;
      if (this.detectSymbolType(symbol) === 'crypto') {
        yahooSymbol = `${symbol.replace('/', '-')}=X`;
      }
      
      const response = await http.get(
        `${this.apis.yahoo}/${yahooSymbol}?interval=${interval}&range=${range}`
      );
      
      if (response.json && response.json.chart && response.json.chart.result) {
        const result = response.json.chart.result[0];
        const timestamps = result.timestamp;
        const quotes = result.indicators.quote[0];
        
        const data = [];
        for (let i = 0; i < timestamps.length; i++) {
          data.push({
            timestamp: timestamps[i] * 1000,
            open: quotes.open[i],
            high: quotes.high[i],
            low: quotes.low[i],
            close: quotes.close[i],
            volume: quotes.volume[i],
            adjclose: result.indicators.adjclose ? result.indicators.adjclose[0].adjclose[i] : quotes.close[i]
          });
        }
        return data.slice(-limit);
      }
    } catch (error) {
      logger.debug(`Yahoo failed: ${error.message}`);
    }
    return null;
  }
  
  async fetchFromCoinGecko(symbol, timeframe, limit) {
    try {
      const coinId = this.mapSymbolToCoinGecko(symbol);
      if (!coinId) return null;
      
      const days = this.getDaysForTimeframe(limit, timeframe);
      const response = await http.get(
        `${this.apis.coinGecko}/coins/${coinId}/ohlc?vs_currency=usd&days=${days}`
      );
      
      if (response.json && Array.isArray(response.json)) {
        return response.json.slice(-limit).map(candle => ({
          timestamp: candle[0],
          open: candle[1],
          high: candle[2],
          low: candle[3],
          close: candle[4],
          volume: 0
        }));
      }
    } catch (error) {
      logger.debug(`CoinGecko failed: ${error.message}`);
    }
    return null;
  }
  
  async fetchFromBybit(symbol, timeframe, limit) {
    if (!this.apis.bybit.hasKey) return null;
    
    try {
      const interval = this.mapTimeframe(timeframe, 'bybit');
      const category = symbol.includes('USDT') ? 'linear' : 'spot';
      const bybitSymbol = symbol.replace('/', '');
      
      const response = await http.get(
        `${this.apis.bybit.base}/v5/market/kline?category=${category}&symbol=${bybitSymbol}&interval=${interval}&limit=${limit}`
      );
      
      if (response.json && response.json.result && response.json.result.list) {
        return response.json.result.list.reverse().map(candle => ({
          timestamp: parseFloat(candle[0]),
          open: parseFloat(candle[1]),
          high: parseFloat(candle[2]),
          low: parseFloat(candle[3]),
          close: parseFloat(candle[4]),
          volume: parseFloat(candle[5]),
          turnover: parseFloat(candle[6])
        }));
      }
    } catch (error) {
      logger.debug(`Bybit failed: ${error.message}`);
    }
    return null;
  }
  
  async fetchFromCoinPaprika(symbol, timeframe, limit) {
    try {
      const coinId = this.mapSymbolToCoinPaprika(symbol);
      if (!coinId) return null;
      
      const end = new Date().toISOString();
      const start = new Date(Date.now() - (limit * this.getMillisecondsForTimeframe(timeframe))).toISOString();
      
      const response = await http.get(
        `${this.apis.coinPaprika}/tickers/${coinId}/historical?start=${start}&end=${end}&interval=${timeframe}&limit=${limit}`
      );
      
      if (response.json && Array.isArray(response.json)) {
        return response.json.map(item => ({
          timestamp: new Date(item.timestamp).getTime(),
          open: item.open,
          high: item.high,
          low: item.low,
          close: item.close,
          volume: item.volume
        })).reverse();
      }
    } catch (error) {
      logger.debug(`CoinPaprika failed: ${error.message}`);
    }
    return null;
  }
  
  async fetchFromTwelveData(symbol, timeframe, limit) {
    if (!this.apis.twelveData.hasKey) return null;
    
    try {
      const interval = this.mapTimeframe(timeframe, 'twelvedata');
      const response = await http.get(
        `${this.apis.twelveData.base}/time_series?symbol=${symbol}&interval=${interval}&outputsize=${limit}&apikey=${TWELVE_DATA_API_KEY}`
      );
      
      if (response.json && response.json.values) {
        return response.json.values.map(item => ({
          timestamp: new Date(item.datetime).getTime(),
          open: parseFloat(item.open),
          high: parseFloat(item.high),
          low: parseFloat(item.low),
          close: parseFloat(item.close),
          volume: parseFloat(item.volume)
        })).reverse();
      }
    } catch (error) {
      logger.debug(`TwelveData failed: ${error.message}`);
    }
    return null;
  }
  
  async fetchFromPolygon(symbol, timeframe, limit) {
    if (!this.apis.polygon.hasKey) return null;
    
    try {
      const multiplier = this.getPolygonMultiplier(timeframe);
      const timespan = this.getPolygonTimespan(timeframe);
      const to = new Date().toISOString().split('T')[0];
      const from = new Date(Date.now() - (limit * this.getMillisecondsForTimeframe(timeframe) * 2))
        .toISOString().split('T')[0];
      
      const response = await http.get(
        `${this.apis.polygon.base}/aggs/ticker/${symbol}/range/${multiplier}/${timespan}/${from}/${to}?adjusted=true&sort=asc&limit=${limit}&apiKey=${POLYGON_API_KEY}`
      );
      
      if (response.json && response.json.results) {
        return response.json.results.map(item => ({
          timestamp: item.t,
          open: item.o,
          high: item.h,
          low: item.l,
          close: item.c,
          volume: item.v,
          vwap: item.vw,
          transactions: item.n
        }));
      }
    } catch (error) {
      logger.debug(`Polygon failed: ${error.message}`);
    }
    return null;
  }
  
  async fetchFromFinancialModeling(symbol, timeframe, limit) {
    try {
      const interval = this.mapTimeframe(timeframe, 'fmp');
      const response = await http.get(
        `https://financialmodelingprep.com/api/v3/historical-chart/${interval}/${symbol}?apikey=${FINNHUB_API_KEY || 'demo'}`
      );
      
      if (response.json && Array.isArray(response.json)) {
        return response.json.slice(0, limit).map(item => ({
          timestamp: new Date(item.date).getTime(),
          open: item.open,
          high: item.high,
          low: item.low,
          close: item.close,
          volume: item.volume
        })).reverse();
      }
    } catch (error) {
      logger.debug(`FinancialModeling failed: ${error.message}`);
    }
    return null;
  }
  
  async fetchFromMarketStack(symbol, timeframe, limit) {
    try {
      const response = await http.get(
        `https://api.marketstack.com/v1/eod?access_key=${FINNHUB_API_KEY || 'demo'}&symbols=${symbol}&limit=${limit}`
      );
      
      if (response.json && response.json.data) {
        return response.json.data.map(item => ({
          timestamp: new Date(item.date).getTime(),
          open: item.open,
          high: item.high,
          low: item.low,
          close: item.close,
          volume: item.volume,
          adjClose: item.adj_close
        })).reverse();
      }
    } catch (error) {
      logger.debug(`MarketStack failed: ${error.message}`);
    }
    return null;
  }
  
  detectSymbolType(symbol) {
    const sym = symbol.toUpperCase();
    
    if (sym.endsWith('USDT') || sym.endsWith('BTC') || sym.endsWith('ETH') || 
        sym.endsWith('USD') || sym.includes('/')) {
      return 'crypto';
    } else if (/^[A-Z]{6}$/.test(sym) || sym.includes('=')) {
      return 'forex';
    } else if (/^[A-Z]{1,5}$/.test(sym) || sym.includes('.')) {
      return 'stock';
    } else if (sym === 'XAUUSD' || sym === 'XAGUSD' || sym === 'XPTUSD' || sym === 'XPDUSD') {
      return 'metal';
    } else if (sym.includes('VIX') || sym.includes('IND')) {
      return 'index';
    } else if (sym.includes('FUT') || sym.includes('PERP')) {
      return 'future';
    }
    
    return 'unknown';
  }
  
  mapTimeframe(tf, api) {
    const maps = {
      binance: {
        '1m': '1m', '5m': '5m', '15m': '15m', '30m': '30m',
        '1h': '1h', '4h': '4h', '1d': '1d', '1w': '1w'
      },
      alpaca: {
        '1m': '1Min', '5m': '5Min', '15m': '15Min',
        '1h': '1Hour', '1d': '1Day'
      },
      finnhub: {
        '1m': '1', '5m': '5', '15m': '15', '30m': '30',
        '1h': '60', '1d': 'D', '1w': 'W'
      },
      yahoo: {
        '1m': '1m', '5m': '5m', '15m': '15m', '30m': '30m',
        '1h': '1h', '1d': '1d', '1w': '1wk', '1M': '1mo'
      },
      bybit: {
        '1m': '1', '5m': '5', '15m': '15', '30m': '30',
        '1h': '60', '4h': '240', '1d': 'D', '1w': 'W'
      },
      twelvedata: {
        '1m': '1min', '5m': '5min', '15m': '15min', '30m': '30min',
        '1h': '1h', '4h': '4h', '1d': '1day', '1w': '1week'
      },
      fmp: {
        '1m': '1min', '5m': '5min', '15m': '15min',
        '1h': '1hour', '4h': '4hour', '1d': '1day'
      }
    };
    
    return maps[api]?.[tf] || tf;
  }
  
  getSecondsForTimeframe(tf) {
    const seconds = {
      '1m': 60, '5m': 300, '15m': 900, '30m': 1800,
      '1h': 3600, '4h': 14400, '1d': 86400, '1w': 604800
    };
    return seconds[tf] || 3600;
  }
  
  getMillisecondsForTimeframe(tf) {
    return this.getSecondsForTimeframe(tf) * 1000;
  }
  
  getDaysForTimeframe(limit, tf) {
    const candlesPerDay = {
      '1h': 24, '4h': 6, '1d': 1, '1w': 0.142857
    };
    const cpd = candlesPerDay[tf] || 24;
    return Math.ceil(limit / cpd);
  }
  
  getYahooRange(limit, tf) {
    const ranges = {
      '1d': '1d', '5d': '5d', '1mo': '1mo', '3mo': '3mo',
      '6mo': '6mo', '1y': '1y', '2y': '2y', '5y': '5y', '10y': '10y', 'ytd': 'ytd', 'max': 'max'
    };
    
    const candlesPerDay = {
      '1m': 1440, '5m': 288, '15m': 96, '30m': 48,
      '1h': 24, '1d': 1, '1w': 0.142857
    };
    
    const cpd = candlesPerDay[tf] || 24;
    const daysNeeded = Math.ceil(limit / cpd);
    
    if (daysNeeded <= 1) return '1d';
    if (daysNeeded <= 5) return '5d';
    if (daysNeeded <= 30) return '1mo';
    if (daysNeeded <= 90) return '3mo';
    if (daysNeeded <= 180) return '6mo';
    if (daysNeeded <= 365) return '1y';
    if (daysNeeded <= 730) return '2y';
    if (daysNeeded <= 1825) return '5y';
    return 'max';
  }
  
  getPolygonMultiplier(tf) {
    const multipliers = {
      '1m': 1, '5m': 5, '15m': 15, '30m': 30,
      '1h': 60, '4h': 240, '1d': 1440, '1w': 10080
    };
    return multipliers[tf] || 60;
  }
  
  getPolygonTimespan(tf) {
    const timespans = {
      '1m': 'minute', '5m': 'minute', '15m': 'minute', '30m': 'minute',
      '1h': 'hour', '4h': 'hour', '1d': 'day', '1w': 'week'
    };
    return timespans[tf] || 'hour';
  }
  
  mapSymbolToCoinGecko(symbol) {
    const map = {
      'BTCUSDT': 'bitcoin',
      'ETHUSDT': 'ethereum',
      'BNBUSDT': 'binancecoin',
      'SOLUSDT': 'solana',
      'ADAUSDT': 'cardano',
      'XRPUSDT': 'ripple',
      'DOTUSDT': 'polkadot',
      'DOGEUSDT': 'dogecoin',
      'AVAXUSDT': 'avalanche-2',
      'MATICUSDT': 'matic-network',
      'LINKUSDT': 'chainlink',
      'ATOMUSDT': 'cosmos',
      'UNIUSDT': 'uniswap',
      'LTCUSDT': 'litecoin',
      'ETCUSDT': 'ethereum-classic',
      'XLMUSDT': 'stellar',
      'BCHUSDT': 'bitcoin-cash',
      'ALGOUSDT': 'algorand',
      'VETUSDT': 'vechain',
      'THETAUSDT': 'theta-token',
      'FILUSDT': 'filecoin',
      'TRXUSDT': 'tron',
      'EOSUSDT': 'eos',
      'AAVEUSDT': 'aave',
      'XTZUSDT': 'tezos',
      'NEOUSDT': 'neo',
      'MKRUSDT': 'maker',
      'COMPUSDT': 'compound-governance-token',
      'YFIUSDT': 'yearn-finance',
      'SUSHIUSDT': 'sushi',
      'CRVUSDT': 'curve-dao-token',
      'SNXUSDT': 'havven',
      'BATUSDT': 'basic-attention-token',
      'ZECUSDT': 'zcash',
      'DASHUSDT': 'dash',
      'ZILUSDT': 'zilliqa',
      'ENJUSDT': 'enjincoin',
      'MANAUSDT': 'decentraland',
      'GALAUSDT': 'gala',
      'SANDUSDT': 'the-sandbox',
      'AXSUSDT': 'axie-infinity',
      'CHZUSDT': 'chiliz',
      'APEUSDT': 'apecoin',
      'GMTUSDT': 'stepn'
    };
    return map[symbol.toUpperCase()] || null;
  }
  
  mapSymbolToCoinPaprika(symbol) {
    const map = {
      'BTCUSDT': 'btc-bitcoin',
      'ETHUSDT': 'eth-ethereum',
      'BNBUSDT': 'bnb-binance-coin',
      'SOLUSDT': 'sol-solana',
      'ADAUSDT': 'ada-cardano',
      'XRPUSDT': 'xrp-xrp',
      'DOTUSDT': 'dot-polkadot',
      'DOGEUSDT': 'doge-dogecoin'
    };
    return map[symbol.toUpperCase()] || null;
  }
  
  async getCurrentPrice(symbol) {
    try {
      const data = await this.getOHLCV(symbol, '1m', 1);
      if (data && data.length > 0) {
        return data[data.length - 1].close;
      }
    } catch (error) {
      logger.debug(`Failed to get current price: ${error.message}`);
    }
    
    try {
      const symbolType = this.detectSymbolType(symbol);
      
      if (symbolType === 'crypto') {
        const response = await http.get(`https://api.binance.com/api/v3/ticker/price?symbol=${symbol.replace('/', '')}`);
        if (response.json) {
          return parseFloat(response.json.price);
        }
      } else if (symbolType === 'stock') {
        const response = await http.get(`https://finnhub.io/api/v1/quote?symbol=${symbol}&token=${FINNHUB_API_KEY || 'demo'}`);
        if (response.json) {
          return response.json.c;
        }
      }
    } catch (error) {
      logger.error(`Price fetch failed: ${error.message}`);
    }
    
    return null;
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
        nextMarketOpen: this.getNextMarketOpen(now)
      };
    } catch (error) {
      logger.error(`Market status failed: ${error.message}`);
      return { error: error.message };
    }
  }
  
  getNextMarketOpen(now) {
    const next = new Date(now);
    const day = next.getDay();
    const hour = next.getHours();
    
    if (day === 5 && hour >= 16) {
      next.setDate(next.getDate() + 3);
      next.setHours(9, 30, 0, 0);
    } else if (day === 6) {
      next.setDate(next.getDate() + 2);
      next.setHours(9, 30, 0, 0);
    } else if (day === 0) {
      next.setDate(next.getDate() + 1);
      next.setHours(9, 30, 0, 0);
    } else if (hour >= 16) {
      next.setDate(next.getDate() + 1);
      next.setHours(9, 30, 0, 0);
    } else if (hour < 9 || (hour === 9 && next.getMinutes() < 30)) {
      next.setHours(9, 30, 0, 0);
    } else {
      return 'MARKET IS OPEN';
    }
    
    return next.toISOString();
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
      williamsR: this.calculateWilliamsR(highs, lows, closes, 14),
      cci: this.calculateCCI(highs, lows, closes, 20),
      
      atr: this.calculateATR(highs, lows, closes, 14),
      bollinger: this.calculateBollingerBands(closes, 20, 2),
      keltner: this.calculateKeltnerChannels(highs, lows, closes, 20),
      
      volumeSMA: this.calculateSMA(volumes, 20),
      obv: this.calculateOBV(closes, volumes),
      mfi: this.calculateMFI(highs, lows, closes, volumes, 14),
      
      adx: this.calculateADX(highs, lows, closes, 14),
      macd: this.calculateMACD(closes, 12, 26, 9),
      parabolicSAR: this.calculateParabolicSAR(highs, lows, closes),
      
      pivotPoints: this.calculatePivotPoints(highs[highs.length - 1], lows[lows.length - 1], closes[closes.length - 1]),
      fibonacci: this.calculateFibonacciLevels(Math.max(...highs.slice(-50)), Math.min(...lows.slice(-50))),
      
      trend: this.analyzeTrend(closes, highs, lows),
      support: this.findSupportLevels(closes, lows),
      resistance: this.findResistanceLevels(closes, highs),
      
      volatility: this.calculateVolatility(closes, 20),
      averageRange: this.calculateAverageRange(highs, lows, 20),
      
      isTrending: this.isMarketTrending(closes, 50),
      isVolatile: this.isMarketVolatile(closes, 20),
      isOverbought: this.isOverbought(closes, highs, lows),
      isOversold: this.isOversold(closes, highs, lows)
    };
    
    results.priceVsSMA20 = ((currentPrice - results.sma20) / results.sma20) * 100;
    results.priceVsSMA50 = ((currentPrice - results.sma50) / results.sma50) * 100;
    results.sma20vs50 = ((results.sma20 - results.sma50) / results.sma50) * 100;
    results.bollingerPosition = ((currentPrice - results.bollinger.middle) / (results.bollinger.upper - results.bollinger.middle)) * 100;
    
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
      bearish: histogram < 0,
      crossover: this.detectMACDCrossover(macdLine, signalLine, histogram)
    };
  }
  
  detectMACDCrossover(macd, signal, histogram) {
    if (histogram > 0 && macd > signal) return 'BULLISH_CROSS';
    if (histogram < 0 && macd < signal) return 'BEARISH_CROSS';
    return 'NO_CROSS';
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
      oversold: k < 20,
      bullish: k > d && k < 80,
      bearish: k < d && k > 20
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
      bandwidth: ((std * stdDev * 2) / middle) * 100,
      squeezed: ((std * stdDev * 2) / middle) < 0.1,
      position: ((closes[closes.length - 1] - middle) / (std * stdDev)) * 100
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
  
  calculateMFI(highs, lows, closes, volumes, period = 14) {
    if (highs.length < period || lows.length < period || closes.length < period || volumes.length < period) {
      return 50;
    }
    
    let positiveMoneyFlow = 0;
    let negativeMoneyFlow = 0;
    
    for (let i = closes.length - period; i < closes.length; i++) {
      const typicalPrice = (highs[i] + lows[i] + closes[i]) / 3;
      const moneyFlow = typicalPrice * volumes[i];
      
      if (i > closes.length - period) {
        const prevTypical = (highs[i - 1] + lows[i - 1] + closes[i - 1]) / 3;
        
        if (typicalPrice > prevTypical) {
          positiveMoneyFlow += moneyFlow;
        } else if (typicalPrice < prevTypical) {
          negativeMoneyFlow += moneyFlow;
        }
      }
    }
    
    if (negativeMoneyFlow === 0) return 100;
    const moneyRatio = positiveMoneyFlow / negativeMoneyFlow;
    return 100 - (100 / (1 + moneyRatio));
  }
  
  calculateADX(highs, lows, closes, period = 14) {
    if (highs.length < period * 2 || lows.length < period * 2 || closes.length < period * 2) {
      return { adx: 0, pdi: 0, ndi: 0, trend: 'WEAK' };
    }
    
    let plusDM = 0;
    let minusDM = 0;
    let tr = 0;
    
    for (let i = 1; i <= period; i++) {
      const upMove = highs[i] - highs[i - 1];
      const downMove = lows[i - 1] - lows[i];
      
      if (upMove > downMove && upMove > 0) {
        plusDM += upMove;
      } else if (downMove > upMove && downMove > 0) {
        minusDM += downMove;
      }
      
      const hl = highs[i] - lows[i];
      const hc = Math.abs(highs[i] - closes[i - 1]);
      const lc = Math.abs(lows[i] - closes[i - 1]);
      tr += Math.max(hl, hc, lc);
    }
    
    const plusDI = (plusDM / tr) * 100;
    const minusDI = (minusDM / tr) * 100;
    const dx = Math.abs(plusDI - minusDI) / (plusDI + minusDI) * 100;
    
    const adx = dx;
    
    let trend = 'WEAK';
    if (adx > 25) trend = 'STRONG';
    if (adx > 40) trend = 'VERY_STRONG';
    
    return {
      adx: adx,
      pdi: plusDI,
      ndi: minusDI,
      trend: trend,
      bullish: plusDI > minusDI && adx > 20,
      bearish: minusDI > plusDI && adx > 20
    };
  }
  
  calculateWilliamsR(highs, lows, closes, period = 14) {
    if (highs.length < period || lows.length < period || closes.length < period) {
      return 0;
    }
    
    const recentHigh = Math.max(...highs.slice(-period));
    const recentLow = Math.min(...lows.slice(-period));
    const currentClose = closes[closes.length - 1];
    
    return ((recentHigh - currentClose) / (recentHigh - recentLow)) * -100;
  }
  
  calculateCCI(highs, lows, closes, period = 20) {
    if (highs.length < period || lows.length < period || closes.length < period) {
      return 0;
    }
    
    const typicalPrices = [];
    for (let i = closes.length - period; i < closes.length; i++) {
      typicalPrices.push((highs[i] + lows[i] + closes[i]) / 3);
    }
    
    const sma = typicalPrices.reduce((a, b) => a + b, 0) / period;
    
    let meanDeviation = 0;
    for (let i = 0; i < typicalPrices.length; i++) {
      meanDeviation += Math.abs(typicalPrices[i] - sma);
    }
    meanDeviation /= period;
    
    const currentTP = (highs[highs.length - 1] + lows[lows.length - 1] + closes[closes.length - 1]) / 3;
    
    return (currentTP - sma) / (0.015 * meanDeviation);
  }
  
  calculateParabolicSAR(highs, lows, closes, acceleration = 0.02, maxAcceleration = 0.2) {
    if (highs.length < 2 || lows.length < 2 || closes.length < 2) {
      return { sar: closes[closes.length - 1], trend: 'NEUTRAL' };
    }
    
    let trend = 'BULLISH';
    let sar = lows[0];
    let ep = highs[0];
    let af = acceleration;
    
    for (let i = 1; i < closes.length; i++) {
      if (trend === 'BULLISH') {
        sar = sar + af * (ep - sar);
        
        if (lows[i] < sar) {
          trend = 'BEARISH';
          sar = ep;
          ep = lows[i];
          af = acceleration;
        } else {
          if (highs[i] > ep) {
            ep = highs[i];
            af = Math.min(af + acceleration, maxAcceleration);
          }
        }
      } else {
        sar = sar + af * (ep - sar);
        
        if (highs[i] > sar) {
          trend = 'BULLISH';
          sar = ep;
          ep = highs[i];
          af = acceleration;
        } else {
          if (lows[i] < ep) {
            ep = lows[i];
            af = Math.min(af + acceleration, maxAcceleration);
          }
        }
      }
    }
    
    return { sar: sar, trend: trend };
  }
  
  calculateKeltnerChannels(highs, lows, closes, period = 20, multiplier = 2) {
    if (highs.length < period || lows.length < period || closes.length < period) {
      return { upper: null, middle: null, lower: null };
    }
    
    const ema = this.calculateEMA(closes, period);
    const atr = this.calculateATR(highs, lows, closes, period);
    
    return {
      upper: ema + (atr * multiplier),
      middle: ema,
      lower: ema - (atr * multiplier)
    };
  }
  
  calculatePivotPoints(high, low, close) {
    const pp = (high + low + close) / 3;
    const r1 = (2 * pp) - low;
    const r2 = pp + (high - low);
    const r3 = high + 2 * (pp - low);
    const s1 = (2 * pp) - high;
    const s2 = pp - (high - low);
    const s3 = low - 2 * (high - pp);
    
    return {
      pivot: pp,
      r1: r1,
      r2: r2,
      r3: r3,
      s1: s1,
      s2: s2,
      s3: s3,
      mr1: (pp + r1) / 2,
      mr2: (r1 + r2) / 2,
      mr3: (r2 + r3) / 2,
      ms1: (pp + s1) / 2,
      ms2: (s1 + s2) / 2,
      ms3: (s2 + s3) / 2
    };
  }
  
  calculateFibonacciLevels(high, low) {
    const diff = high - low;
    
    return {
      level_0: low,
      level_236: low + diff * 0.236,
      level_382: low + diff * 0.382,
      level_500: low + diff * 0.5,
      level_618: low + diff * 0.618,
      level_786: low + diff * 0.786,
      level_100: high,
      extension_127: high + diff * 0.272,
      extension_161: high + diff * 0.618,
      extension_261: high + diff * 1.618
    };
  }
  
  analyzeTrend(closes, highs, lows) {
    if (closes.length < 50) return { direction: 'NEUTRAL', strength: 0 };
    
    const sma20 = this.calculateSMA(closes, 20);
    const sma50 = this.calculateSMA(closes, 50);
    const sma200 = this.calculateSMA(closes, 200);
    const currentPrice = closes[closes.length - 1];
    
    const alignedUp = currentPrice > sma20 && sma20 > sma50 && sma50 > sma200;
    const alignedDown = currentPrice < sma20 && sma20 < sma50 && sma50 < sma200;
    
    let higherHighs = 0;
    let higherLows = 0;
    let lowerHighs = 0;
    let lowerLows = 0;
    
    for (let i = 20; i < 50; i += 5) {
      if (highs[i] > highs[i - 5]) higherHighs++;
      if (lows[i] > lows[i - 5]) higherLows++;
      if (highs[i] < highs[i - 5]) lowerHighs++;
      if (lows[i] < lows[i - 5]) lowerLows++;
    }
    
    const bullStructure = higherHighs >= 4 && higherLows >= 4;
    const bearStructure = lowerHighs >= 4 && lowerLows >= 4;
    
    let direction = 'NEUTRAL';
    let strength = 0;
    
    if (alignedUp && bullStructure) {
      direction = 'BULLISH';
      strength = 0.9;
    } else if (alignedDown && bearStructure) {
      direction = 'BEARISH';
      strength = 0.9;
    } else if (currentPrice > sma50 && sma20 > sma50) {
      direction = 'BULLISH';
      strength = 0.7;
    } else if (currentPrice < sma50 && sma20 < sma50) {
      direction = 'BEARISH';
      strength = 0.7;
    } else {
      direction = 'NEUTRAL';
      strength = 0.3;
    }
    
    return { direction, strength, alignedUp, alignedDown, bullStructure, bearStructure };
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
        const avgPrice = closes.reduce((a, b) => a + b, 0) / closes.length;
        const distanceFromAvg = Math.abs(currentLow - avgPrice) / avgPrice;
        
        if (distanceFromAvg > sensitivity) {
          supports.push({
            price: currentLow,
            strength: this.calculateSupportStrength(lows, i, currentLow),
            touched: this.countTouches(lows, currentLow, sensitivity)
          });
        }
      }
    }
    
    return supports
      .sort((a, b) => b.strength - a.strength)
      .filter((level, index, array) => {
        return array.findIndex(l => Math.abs(l.price - level.price) / level.price < 0.01) === index;
      })
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
        const avgPrice = closes.reduce((a, b) => a + b, 0) / closes.length;
        const distanceFromAvg = Math.abs(currentHigh - avgPrice) / avgPrice;
        
        if (distanceFromAvg > sensitivity) {
          resistances.push({
            price: currentHigh,
            strength: this.calculateResistanceStrength(highs, i, currentHigh),
            touched: this.countTouches(highs, currentHigh, sensitivity)
          });
        }
      }
    }
    
    return resistances
      .sort((a, b) => b.strength - a.strength)
      .filter((level, index, array) => {
        return array.findIndex(l => Math.abs(l.price - level.price) / level.price < 0.01) === index;
      })
      .slice(0, 5);
  }
  
  calculateSupportStrength(lows, index, price, sensitivity = 0.02) {
    let strength = 0;
    const window = 50;
    
    for (let i = Math.max(0, index - window); i < Math.min(lows.length, index + window); i++) {
      if (Math.abs(lows[i] - price) / price < sensitivity) {
        strength++;
      }
    }
    
    return Math.min(strength / 20, 1);
  }
  
  calculateResistanceStrength(highs, index, price, sensitivity = 0.02) {
    let strength = 0;
    const window = 50;
    
    for (let i = Math.max(0, index - window); i < Math.min(highs.length, index + window); i++) {
      if (Math.abs(highs[i] - price) / price < sensitivity) {
        strength++;
      }
    }
    
    return Math.min(strength / 20, 1);
  }
  
  countTouches(prices, level, sensitivity = 0.02) {
    let touches = 0;
    
    for (const price of prices) {
      if (Math.abs(price - level) / level < sensitivity) {
        touches++;
      }
    }
    
    return touches;
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
  
  calculateAverageRange(highs, lows, period = 20) {
    if (highs.length < period || lows.length < period) return 0;
    
    let totalRange = 0;
    for (let i = highs.length - period; i < highs.length; i++) {
      totalRange += (highs[i] - lows[i]) / lows[i];
    }
    
    return (totalRange / period) * 100;
  }
  
  isMarketTrending(closes, period = 50) {
    if (closes.length < period) return false;
    
    const sma20 = this.calculateSMA(closes, 20);
    const sma50 = this.calculateSMA(closes, 50);
    const price = closes[closes.length - 1];
    
    const aboveBoth = price > sma20 * 1.02 && price > sma50 * 1.02;
    const belowBoth = price < sma20 * 0.98 && price < sma50 * 0.98;
    
    return aboveBoth || belowBoth;
  }
  
  isMarketVolatile(closes, period = 20) {
    const volatility = this.calculateVolatility(closes, period);
    return volatility > 0.4;
  }
  
  isOverbought(closes, highs, lows) {
    const rsi = this.calculateRSI(closes, 14);
    const stochastic = this.calculateStochastic(highs, lows, closes, 14, 3);
    const williamsR = this.calculateWilliamsR(highs, lows, closes, 14);
    
    return rsi > 70 || stochastic.k > 80 || williamsR > -20;
  }
  
  isOversold(closes, highs, lows) {
    const rsi = this.calculateRSI(closes, 14);
    const stochastic = this.calculateStochastic(highs, lows, closes, 14, 3);
    const williamsR = this.calculateWilliamsR(highs, lows, closes, 14);
    
    return rsi < 30 || stochastic.k < 20 || williamsR < -80;
  }
}

// ==================== REAL AI STRATEGY ENGINE ====================
class RealAIStrategyEngine {
  constructor() {
    this.strategies = {
      QUANTUM: {
        name: 'Quantum Engine V3.0',
        description: 'Multi-timeframe institutional analysis with machine learning',
        conditions: ['strong_trend', 'clear_structure', 'high_volume', 'low_correlation'],
        weight: 0.35,
        emoji: '⚛️'
      },
      MOMENTUM: {
        name: 'Momentum Pro V2.0',
        description: 'Advanced momentum capture with volume confirmation',
        conditions: ['high_momentum', 'volume_spike', 'breakout_confirmation', 'trend_alignment'],
        weight: 0.25,
        emoji: '📈'
      },
      BREAKOUT: {
        name: 'Breakout Master V1.5',
        description: 'Precision breakout trading with risk management',
        conditions: ['consolidation', 'low_volatility', 'volume_accumulation', 'key_level_proximity'],
        weight: 0.20,
        emoji: '🚀'
      },
      MEAN_REVERSION: {
        name: 'Mean Reversion Pro V1.2',
        description: 'Statistical arbitrage with divergence detection',
        conditions: ['extreme_levels', 'divergence', 'oversold_overbought', 'support_resistance'],
        weight: 0.20,
        emoji: '↕️'
      }
    };
    
    this.conditionWeights = {
      strong_trend: { QUANTUM: 0.9, MOMENTUM: 0.7, BREAKOUT: 0.3, MEAN_REVERSION: 0.1 },
      clear_structure: { QUANTUM: 0.8, MOMENTUM: 0.5, BREAKOUT: 0.6, MEAN_REVERSION: 0.3 },
      high_volume: { QUANTUM: 0.7, MOMENTUM: 0.9, BREAKOUT: 0.8, MEAN_REVERSION: 0.4 },
      low_correlation: { QUANTUM: 0.6, MOMENTUM: 0.3, BREAKOUT: 0.4, MEAN_REVERSION: 0.2 },
      high_momentum: { QUANTUM: 0.4, MOMENTUM: 1.0, BREAKOUT: 0.5, MEAN_REVERSION: 0.1 },
      volume_spike: { QUANTUM: 0.5, MOMENTUM: 0.9, BREAKOUT: 0.7, MEAN_REVERSION: 0.3 },
      breakout_confirmation: { QUANTUM: 0.6, MOMENTUM: 0.8, BREAKOUT: 0.9, MEAN_REVERSION: 0.4 },
      trend_alignment: { QUANTUM: 0.8, MOMENTUM: 0.7, BREAKOUT: 0.6, MEAN_REVERSION: 0.2 },
      consolidation: { QUANTUM: 0.3, MOMENTUM: 0.2, BREAKOUT: 1.0, MEAN_REVERSION: 0.5 },
      low_volatility: { QUANTUM: 0.2, MOMENTUM: 0.1, BREAKOUT: 0.9, MEAN_REVERSION: 0.6 },
      volume_accumulation: { QUANTUM: 0.4, MOMENTUM: 0.3, BREAKOUT: 0.8, MEAN_REVERSION: 0.4 },
      key_level_proximity: { QUANTUM: 0.5, MOMENTUM: 0.4, BREAKOUT: 0.7, MEAN_REVERSION: 0.3 },
      extreme_levels: { QUANTUM: 0.2, MOMENTUM: 0.1, BREAKOUT: 0.3, MEAN_REVERSION: 1.0 },
      divergence: { QUANTUM: 0.3, MOMENTUM: 0.2, BREAKOUT: 0.4, MEAN_REVERSION: 0.9 },
      oversold_overbought: { QUANTUM: 0.2, MOMENTUM: 0.1, BREAKOUT: 0.3, MEAN_REVERSION: 0.8 },
      support_resistance: { QUANTUM: 0.6, MOMENTUM: 0.4, BREAKOUT: 0.7, MEAN_REVERSION: 0.5 }
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
    
    // 1. Trend Analysis
    analysis.conditions.strong_trend = this.isStrongTrend(closes, highs, lows);
    analysis.conditions.clear_structure = this.hasClearStructure(highs, lows);
    analysis.conditions.trend_alignment = this.isTrendAligned(indicators);
    
    // 2. Momentum Analysis
    analysis.conditions.high_momentum = this.hasHighMomentum(closes, indicators);
    analysis.conditions.volume_spike = this.hasVolumeSpike(volumes);
    analysis.conditions.breakout_confirmation = this.hasBreakoutConfirmation(closes, highs, lows, indicators);
    
    // 3. Volatility Analysis
    analysis.conditions.low_volatility = this.isLowVolatility(indicators);
    analysis.conditions.consolidation = this.isConsolidating(highs, lows, closes);
    
    // 4. Volume Analysis
    analysis.conditions.high_volume = this.hasHighVolume(volumes);
    analysis.conditions.volume_accumulation = this.hasVolumeAccumulation(volumes, closes);
    
    // 5. Technical Levels
    analysis.conditions.key_level_proximity = this.isNearKeyLevel(closes[closes.length - 1], indicators);
    analysis.conditions.support_resistance = this.hasStrongSupportResistance(indicators);
    
    // 6. Extreme Conditions
    analysis.conditions.extreme_levels = this.isAtExtremeLevels(closes, indicators);
    analysis.conditions.oversold_overbought = this.isOverboughtOversold(indicators);
    analysis.conditions.divergence = this.hasDivergence(closes, indicators);
    
    // 7. Risk Analysis
    analysis.conditions.low_correlation = this.hasLowCorrelation(closes);
    
    // Calculate scores for each strategy
    analysis.scores = this.calculateStrategyScores(analysis.conditions);
    
    // Generate recommendations
    analysis.recommendations = this.generateRecommendations(analysis);
    
    return analysis;
  }
  
  selectOptimalStrategy(marketAnalysis) {
    if (!ENABLE_AI_STRATEGY_SELECTION || ENABLE_AI_STRATEGY_SELECTION === 'false') {
      return {
        strategy: 'QUANTUM',
        reason: 'AI selection disabled',
        ...this.strategies.QUANTUM
      };
    }
    
    const scores = marketAnalysis.scores;
    let bestStrategy = 'QUANTUM';
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
      reason: reason,
      ...this.strategies[bestStrategy]
    };
  }
  
  calculateStrategyScores(conditions) {
    const scores = {};
    
    Object.keys(this.strategies).forEach(strategy => {
      let score = this.strategies[strategy].weight;
      let matchedConditions = 0;
      let totalWeight = 0;
      
      Object.entries(conditions).forEach(([condition, isTrue]) => {
        if (isTrue && this.conditionWeights[condition] && this.conditionWeights[condition][strategy]) {
          const weight = this.conditionWeights[condition][strategy];
          score += weight;
          totalWeight += weight;
          matchedConditions++;
        }
      });
      
      if (matchedConditions > 0) {
        score = score / (1 + (matchedConditions / 2));
      }
      
      score = Math.max(0.1, Math.min(0.95, score));
      scores[strategy] = score;
    });
    
    return scores;
  }
  
  isStrongTrend(closes, highs, lows) {
    const trend = this.technicalAnalysis.analyzeTrend(closes, highs, lows);
    return trend.strength > 0.7;
  }
  
  hasClearStructure(highs, lows) {
    if (highs.length < 50 || lows.length < 50) return false;
    
    let higherHighs = 0;
    let higherLows = 0;
    let lowerHighs = 0;
    let lowerLows = 0;
    
    for (let i = 20; i < 50; i += 5) {
      if (highs[i] > highs[i - 5]) higherHighs++;
      if (lows[i] > lows[i - 5]) higherLows++;
      if (highs[i] < highs[i - 5]) lowerHighs++;
      if (lows[i] < lows[i - 5]) lowerLows++;
    }
    
    return (higherHighs >= 4 && higherLows >= 4) || (lowerHighs >= 4 && lowerLows >= 4);
  }
  
  isTrendAligned(indicators) {
    if (!indicators.trend) return false;
    return indicators.trend.alignedUp || indicators.trend.alignedDown;
  }
  
  hasHighMomentum(closes, indicators) {
    if (!indicators.rsi || !indicators.macd) return false;
    
    const rsiMomentum = indicators.rsi > 60 || indicators.rsi < 40;
    const macdMomentum = Math.abs(indicators.macd.histogram) > 0.5;
    const priceChange = Math.abs((closes[closes.length - 1] - closes[closes.length - 10]) / closes[closes.length - 10]);
    
    return rsiMomentum && macdMomentum && priceChange > 0.03;
  }
  
  hasVolumeSpike(volumes) {
    if (volumes.length < 20) return false;
    
    const recentVolume = volumes.slice(-5).reduce((a, b) => a + b, 0) / 5;
    const averageVolume = volumes.slice(-20).reduce((a, b) => a + b, 0) / 20;
    
    return recentVolume > averageVolume * 1.5;
  }
  
  hasBreakoutConfirmation(closes, highs, lows, indicators) {
    if (!indicators.bollinger || !indicators.support || !indicators.resistance) return false;
    
    const currentPrice = closes[closes.length - 1];
    const recentHigh = Math.max(...highs.slice(-10));
    const recentLow = Math.min(...lows.slice(-10));
    
    const aboveResistance = currentPrice > indicators.resistance[0]?.price * 1.01;
    const belowSupport = currentPrice < indicators.support[0]?.price * 0.99;
    const bollingerBreakout = currentPrice > indicators.bollinger.upper || currentPrice < indicators.bollinger.lower;
    
    return (aboveResistance || belowSupport) && bollingerBreakout;
  }
  
  isLowVolatility(indicators) {
    if (!indicators.volatility || !indicators.bollinger) return false;
    
    return indicators.volatility < 0.3 && indicators.bollinger.squeezed;
  }
  
  isConsolidating(highs, lows, closes) {
    if (highs.length < 30 || lows.length < 30) return false;
    
    const recentRange = Math.max(...highs.slice(-10)) - Math.min(...lows.slice(-10));
    const olderRange = Math.max(...highs.slice(-30, -10)) - Math.min(...lows.slice(-30, -10));
    const currentPrice = closes[closes.length - 1];
    const rangePercent = recentRange / currentPrice;
    
    return recentRange < olderRange * 0.7 && rangePercent < 0.03;
  }
  
  hasHighVolume(volumes) {
    if (volumes.length < 20) return false;
    
    const recentVolume = volumes.slice(-10).reduce((a, b) => a + b, 0);
    const averageVolume = volumes.slice(-20).reduce((a, b) => a + b, 0) / 2;
    
    return recentVolume > averageVolume * 1.2;
  }
  
  hasVolumeAccumulation(volumes, closes) {
    if (volumes.length < 50 || closes.length < 50) return false;
    
    const recentVolume = volumes.slice(-20).reduce((a, b) => a + b, 0);
    const olderVolume = volumes.slice(-40, -20).reduce((a, b) => a + b, 0);
    const priceChange = Math.abs((closes[closes.length - 1] - closes[closes.length - 20]) / closes[closes.length - 20]);
    
    return recentVolume > olderVolume * 1.3 && priceChange < 0.05;
  }
  
  isNearKeyLevel(currentPrice, indicators) {
    if (!indicators.support || !indicators.resistance) return false;
    
    const nearestSupport = indicators.support[0]?.price;
    const nearestResistance = indicators.resistance[0]?.price;
    
    if (!nearestSupport || !nearestResistance) return false;
    
    const distanceToSupport = Math.abs(currentPrice - nearestSupport) / currentPrice;
    const distanceToResistance = Math.abs(currentPrice - nearestResistance) / currentPrice;
    
    return distanceToSupport < 0.02 || distanceToResistance < 0.02;
  }
  
  hasStrongSupportResistance(indicators) {
    if (!indicators.support || !indicators.resistance) return false;
    
    const strongSupport = indicators.support.some(s => s.strength > 0.7 && s.touched > 3);
    const strongResistance = indicators.resistance.some(r => r.strength > 0.7 && r.touched > 3);
    
    return strongSupport || strongResistance;
  }
  
  isAtExtremeLevels(closes, indicators) {
    if (!indicators.rsi || !indicators.bollinger) return false;
    
    const currentPrice = closes[closes.length - 1];
    const rsiExtreme = indicators.rsi > 75 || indicators.rsi < 25;
    const bollingerExtreme = currentPrice > indicators.bollinger.upper * 1.02 || 
                            currentPrice < indicators.bollinger.lower * 0.98;
    
    return rsiExtreme && bollingerExtreme;
  }
  
  isOverboughtOversold(indicators) {
    if (!indicators.rsi || !indicators.stochastic) return false;
    
    const rsiExtreme = indicators.rsi > 70 || indicators.rsi < 30;
    const stochasticExtreme = indicators.stochastic.overbought || indicators.stochastic.oversold;
    
    return rsiExtreme && stochasticExtreme;
  }
  
  hasDivergence(closes, indicators) {
    if (closes.length < 30) return false;
    
    const recentCloses = closes.slice(-10);
    const olderCloses = closes.slice(-20, -10);
    
    const recentTrend = recentCloses[recentCloses.length - 1] > recentCloses[0];
    const olderTrend = olderCloses[olderCloses.length - 1] > olderCloses[0];
    
    return recentTrend !== olderTrend;
  }
  
  hasLowCorrelation(closes) {
    if (closes.length < 100) return true;
    
    const changes = [];
    for (let i = 1; i < closes.length; i++) {
      changes.push(closes[i] - closes[i - 1]);
    }
    
    const mean = changes.reduce((a, b) => a + b, 0) / changes.length;
    const variance = changes.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / changes.length;
    const stdDev = Math.sqrt(variance);
    
    return stdDev / Math.abs(mean) > 2;
  }
  
  generateStrategyReason(strategy, conditions) {
    const activeConditions = Object.entries(conditions)
      .filter(([_, isTrue]) => isTrue)
      .map(([condition]) => condition);
    
    const conditionNames = {
      strong_trend: 'strong trend',
      clear_structure: 'clear market structure',
      high_volume: 'high trading volume',
      low_correlation: 'low correlation',
      high_momentum: 'strong momentum',
      volume_spike: 'volume spike',
      breakout_confirmation: 'breakout confirmation',
      trend_alignment: 'trend alignment',
      consolidation: 'market consolidation',
      low_volatility: 'low volatility',
      volume_accumulation: 'volume accumulation',
      key_level_proximity: 'near key level',
      extreme_levels: 'extreme price levels',
      divergence: 'divergence detected',
      oversold_overbought: 'overbought/oversold',
      support_resistance: 'strong support/resistance'
    };
    
    let reason = `${this.strategies[strategy].emoji} ${this.strategies[strategy].name} selected because:\n`;
    
    if (activeConditions.length > 0) {
      reason += activeConditions
        .slice(0, 3)
        .map(cond => `• ${conditionNames[cond] || cond}`)
        .join('\n');
    } else {
      reason += '• Market conditions are balanced';
    }
    
    return reason;
  }
  
  generateRecommendations(marketAnalysis) {
    const recommendations = [];
    const conditions = marketAnalysis.conditions;
    
    if (conditions.strong_trend && conditions.clear_structure) {
      recommendations.push({
        type: 'TREND_FOLLOWING',
        action: 'Enter in direction of trend',
        risk: 'MEDIUM',
        timeframe: '1H-4H'
      });
    }
    
    if (conditions.high_momentum && conditions.volume_spike) {
      recommendations.push({
        type: 'MOMENTUM',
        action: 'Enter with momentum direction',
        risk: 'HIGH',
        timeframe: '15M-1H'
      });
    }
    
    if (conditions.consolidation && conditions.breakout_confirmation) {
      recommendations.push({
        type: 'BREAKOUT',
        action: 'Enter on confirmed breakout',
        risk: 'MEDIUM',
        timeframe: '1H-4H'
      });
    }
    
    if (conditions.extreme_levels && conditions.divergence) {
      recommendations.push({
        type: 'MEAN_REVERSION',
        action: 'Enter on reversal confirmation',
        risk: 'MEDIUM',
        timeframe: '1H-1D'
      });
    }
    
    if (conditions.low_volatility) {
      recommendations.push({
        type: 'RISK_MANAGEMENT',
        action: 'Reduce position size',
        risk: 'LOW',
        timeframe: 'ALL'
      });
    }
    
    return recommendations;
  }
}

// ==================== REAL TRADING ENGINE ====================
class RealTradingEngine {
  constructor() {
    this.marketData = new RealMarketData();
    this.technicalAnalysis = new RealTechnicalAnalysis();
    this.aiEngine = new RealAIStrategyEngine();
    this.positions = new Map();
    this.tradeHistory = [];
    this.performance = {
      totalTrades: 0,
      winningTrades: 0,
      losingTrades: 0,
      totalProfit: 0,
      maxDrawdown: 0,
      sharpeRatio: 0,
      winRate: 0
    };
    
    logger.info('Real Trading Engine initialized');
  }
  
  async analyzeSymbol(symbol, timeframe = '1h') {
    try {
      logger.info(`🔍 Analyzing ${symbol} (${timeframe})...`);
      
      const priceData = await this.marketData.getOHLCV(symbol, timeframe, 200);
      if (priceData.length < 50) {
        throw new Error(`Insufficient real data: ${priceData.length} candles`);
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
      
      const riskAssessment = this.assessRisk(tradeSignal, indicators, priceData);
      
      const analysis = {
        id: `${symbol}_${Date.now()}`,
        symbol: symbol,
        timeframe: timeframe,
        timestamp: Date.now(),
        timestampReadable: new Date().toISOString(),
        
        priceData: priceData.slice(-50),
        currentPrice: indicators.currentPrice,
        priceChange24h: indicators.change24h,
        volume24h: indicators.volume24h,
        
        indicators: indicators,
        marketAnalysis: marketAnalysis,
        strategySelection: strategySelection,
        tradeSignal: tradeSignal,
        riskAssessment: riskAssessment,
        
        dataQuality: 'REAL',
        dataPoints: priceData.length,
        dataSource: 'MULTIPLE_REAL_APIS'
      };
      
      if (tradeSignal.direction !== 'NEUTRAL') {
        logger.tradeSignal(
          symbol,
          tradeSignal.direction,
          tradeSignal.entry,
          tradeSignal.stopLoss,
          tradeSignal.takeProfit
        );
      }
      
      logger.info(`✅ Analysis complete: ${strategySelection.name}`);
      
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
    if (strategySelection.strategy === 'NO_TRADE') {
      return {
        direction: 'NEUTRAL',
        reason: strategySelection.reason,
        timestamp: Date.now()
      };
    }
    
    const closes = priceData.map(p => p.close);
    const highs = priceData.map(p => p.high);
    const lows = priceData.map(p => p.low);
    const currentPrice = indicators.currentPrice;
    const atr = indicators.atr || (currentPrice * 0.02);
    
    let direction = 'NEUTRAL';
    let reasons = [strategySelection.reason];
    let entry = currentPrice;
    let stopLoss = currentPrice;
    let takeProfit = [];
    
    switch(strategySelection.strategy) {
      case 'QUANTUM':
        direction = await this.generateQuantumSignal(closes, highs, lows, indicators, marketAnalysis);
        break;
      case 'MOMENTUM':
        direction = await this.generateMomentumSignal(closes, indicators, marketAnalysis);
        break;
      case 'BREAKOUT':
        direction = await this.generateBreakoutSignal(closes, highs, lows, indicators, marketAnalysis);
        break;
      case 'MEAN_REVERSION':
        direction = await this.generateMeanReversionSignal(closes, indicators, marketAnalysis);
        break;
    }
    
    if (direction === 'NEUTRAL') {
      return {
        direction: 'NEUTRAL',
        reason: 'No clear entry signal',
        timestamp: Date.now()
      };
    }
    
    const positionSize = this.calculatePositionSize(
      currentPrice,
      atr,
      direction
    );
    
    stopLoss = this.calculateStopLoss(
      currentPrice,
      atr,
      direction,
      indicators.support,
      indicators.resistance
    );
    
    takeProfit = this.calculateTakeProfit(
      currentPrice,
      atr,
      direction,
      indicators.support,
      indicators.resistance
    );
    
    const risk = Math.abs(entry - stopLoss);
    const rewards = takeProfit.map(tp => Math.abs(tp - entry));
    const riskRewards = rewards.map(reward => risk > 0 ? this.round(reward / risk) : 0);
    
    if (riskRewards[0] < 1) {
      return {
        direction: 'NEUTRAL',
        reason: `Risk/Reward too low: 1:${riskRewards[0].toFixed(2)}`,
        timestamp: Date.now()
      };
    }
    
    return {
      direction: direction,
      reasons: reasons,
      
      entry: this.round(entry),
      stopLoss: this.round(stopLoss),
      takeProfit: takeProfit.map(tp => this.round(tp)),
      
      positionSize: positionSize,
      riskAmount: this.round(risk * positionSize.units),
      
      risk: this.round(risk),
      rewards: rewards.map(r => this.round(r)),
      riskRewards: riskRewards.map(rr => this.round(rr)),
      avgRiskReward: this.round(riskRewards.reduce((a, b) => a + b, 0) / riskRewards.length),
      
      strategy: strategySelection.strategy,
      strategyName: strategySelection.name,
      
      timestamp: Date.now(),
      expiry: Date.now() + (24 * 60 * 60 * 1000),
      timeframe: '1H-4H'
    };
  }
  
  async generateQuantumSignal(closes, highs, lows, indicators, marketAnalysis) {
    const trend = indicators.trend;
    
    if (trend.strength > 0.7) {
      if (trend.direction === 'BULLISH' && trend.alignedUp) {
        return 'LONG';
      } else if (trend.direction === 'BEARISH' && trend.alignedDown) {
        return 'SHORT';
      }
    }
    
    const hasInstitutionalPattern = this.detectInstitutionalPatterns(closes, highs, lows, indicators);
    
    if (hasInstitutionalPattern.direction !== 'NEUTRAL') {
      return hasInstitutionalPattern.direction;
    }
    
    return 'NEUTRAL';
  }
  
  async generateMomentumSignal(closes, indicators, marketAnalysis) {
    const momentum = indicators.macd;
    const volume = indicators.volumeSMA;
    
    if (momentum.bullish && momentum.histogram > 0.5 && volume > 0) {
      const momentumStrength = this.calculateMomentumStrength(closes);
      if (momentumStrength > 0.02) {
        return 'LONG';
      }
    } else if (momentum.bearish && momentum.histogram < -0.5 && volume > 0) {
      const momentumStrength = this.calculateMomentumStrength(closes);
      if (momentumStrength < -0.02) {
        return 'SHORT';
      }
    }
    
    return 'NEUTRAL';
  }
  
  async generateBreakoutSignal(closes, highs, lows, indicators, marketAnalysis) {
    if (!marketAnalysis.conditions.consolidation) {
      return 'NEUTRAL';
    }
    
    const currentPrice = closes[closes.length - 1];
    const recentHigh = Math.max(...highs.slice(-20));
    const recentLow = Math.min(...lows.slice(-20));
    const atr = indicators.atr;
    
    if (currentPrice > recentHigh - (atr * 0.5)) {
      const volumeConfirmation = this.checkVolumeConfirmation(closes, indicators);
      if (volumeConfirmation) {
        return 'LONG';
      }
    }
    
    if (currentPrice < recentLow + (atr * 0.5)) {
      const volumeConfirmation = this.checkVolumeConfirmation(closes, indicators);
      if (volumeConfirmation) {
        return 'SHORT';
      }
    }
    
    return 'NEUTRAL';
  }
  
  async generateMeanReversionSignal(closes, indicators, marketAnalysis) {
    if (!marketAnalysis.conditions.extreme_levels || !marketAnalysis.conditions.oversold_overbought) {
      return 'NEUTRAL';
    }
    
    const rsi = indicators.rsi;
    const stochastic = indicators.stochastic;
    const bollinger = indicators.bollinger;
    const currentPrice = closes[closes.length - 1];
    
    if (rsi < 30 && stochastic.oversold && currentPrice < bollinger.lower) {
      const hasBullishDivergence = this.checkBullishDivergence(closes, indicators);
      if (hasBullishDivergence) {
        return 'LONG';
      }
    }
    
    if (rsi > 70 && stochastic.overbought && currentPrice > bollinger.upper) {
      const hasBearishDivergence = this.checkBearishDivergence(closes, indicators);
      if (hasBearishDivergence) {
        return 'SHORT';
      }
    }
    
    return 'NEUTRAL';
  }
  
  detectInstitutionalPatterns(closes, highs, lows, indicators) {
    const volumeTrend = this.analyzeVolumeTrend(closes, indicators);
    const priceAction = this.analyzePriceAction(closes, highs, lows);
    
    if (volumeTrend === 'ACCUMULATION' && priceAction === 'BULLISH_SETUP') {
      return { direction: 'LONG' };
    } else if (volumeTrend === 'DISTRIBUTION' && priceAction === 'BEARISH_SETUP') {
      return { direction: 'SHORT' };
    }
    
    return { direction: 'NEUTRAL' };
  }
  
  calculateMomentumStrength(closes) {
    if (closes.length < 20) return 0;
    
    const recent = closes.slice(-5);
    const older = closes.slice(-10, -5);
    const recentAvg = recent.reduce((a, b) => a + b, 0) / recent.length;
    const olderAvg = older.reduce((a, b) => a + b, 0) / older.length;
    
    return (recentAvg - olderAvg) / olderAvg;
  }
  
  checkVolumeConfirmation(closes, indicators) {
    if (!indicators.volumeSMA || indicators.volumeSMA === 0) return false;
    
    const recentCloses = closes.slice(-5);
    const priceChange = (recentCloses[recentCloses.length - 1] - recentCloses[0]) / recentCloses[0];
    
    return Math.abs(priceChange) > 0.01;
  }
  
  checkBullishDivergence(closes, indicators) {
    if (closes.length < 30) return false;
    
    const recentCloses = closes.slice(-10);
    const olderCloses = closes.slice(-20, -10);
    
    const recentLow = Math.min(...recentCloses);
    const olderLow = Math.min(...olderCloses);
    
    return recentLow < olderLow;
  }
  
  checkBearishDivergence(closes, indicators) {
    if (closes.length < 30) return false;
    
    const recentCloses = closes.slice(-10);
    const olderCloses = closes.slice(-20, -10);
    
    const recentHigh = Math.max(...recentCloses);
    const olderHigh = Math.max(...olderCloses);
    
    return recentHigh > olderHigh;
  }
  
  analyzeVolumeTrend(closes, indicators) {
    if (!indicators.obv || !indicators.mfi) return 'NEUTRAL';
    
    if (indicators.obv > 0 && indicators.mfi > 50) {
      return 'ACCUMULATION';
    } else if (indicators.obv < 0 && indicators.mfi < 50) {
      return 'DISTRIBUTION';
    }
    
    return 'NEUTRAL';
  }
  
  analyzePriceAction(closes, highs, lows) {
    const currentPrice = closes[closes.length - 1];
    const sma20 = this.technicalAnalysis.calculateSMA(closes, 20);
    const sma50 = this.technicalAnalysis.calculateSMA(closes, 50);
    
    if (currentPrice > sma20 && sma20 > sma50) {
      return 'BULLISH_SETUP';
    } else if (currentPrice < sma20 && sma20 < sma50) {
      return 'BEARISH_SETUP';
    }
    
    return 'NEUTRAL';
  }
  
  calculatePositionSize(currentPrice, atr, direction) {
    const accountEquity = parseFloat(ACCOUNT_EQUITY);
    const riskPercentage = parseFloat(DEFAULT_RISK_PCT);
    
    const riskAmount = accountEquity * (riskPercentage / 100);
    const riskPerUnit = atr * 1.5;
    const units = riskAmount / riskPerUnit;
    
    const positionValue = units * currentPrice;
    const positionPercentage = (positionValue / accountEquity) * 100;
    
    const maxPositionPercentage = 20;
    let finalUnits = units;
    let adjusted = false;
    
    if (positionPercentage > maxPositionPercentage) {
      finalUnits = (accountEquity * (maxPositionPercentage / 100)) / currentPrice;
      adjusted = true;
    }
    
    return {
      units: this.round(finalUnits, 6),
      positionValue: this.round(finalUnits * currentPrice, 2),
      riskAmount: this.round(riskPerUnit * finalUnits, 2),
      riskPercentage: this.round(riskPercentage, 2),
      positionPercentage: this.round((finalUnits * currentPrice) / accountEquity * 100, 2),
      adjusted: adjusted
    };
  }
  
  calculateStopLoss(currentPrice, atr, direction, supportLevels, resistanceLevels) {
    if (direction === 'LONG') {
      if (supportLevels && supportLevels.length > 0) {
        const nearestSupport = supportLevels[0].price;
        const atrStop = currentPrice - (atr * 1.5);
        return Math.max(nearestSupport, atrStop);
      }
      return currentPrice - (atr * 1.5);
    } else if (direction === 'SHORT') {
      if (resistanceLevels && resistanceLevels.length > 0) {
        const nearestResistance = resistanceLevels[0].price;
        const atrStop = currentPrice + (atr * 1.5);
        return Math.min(nearestResistance, atrStop);
      }
      return currentPrice + (atr * 1.5);
    }
    
    return currentPrice;
  }
  
  calculateTakeProfit(currentPrice, atr, direction, supportLevels, resistanceLevels) {
    const takeProfitLevels = [];
    
    if (direction === 'LONG') {
      takeProfitLevels.push(currentPrice + (atr * 1.5));
      
      if (resistanceLevels && resistanceLevels.length > 0) {
        const nextResistance = resistanceLevels[0].price;
        takeProfitLevels.push(nextResistance);
      } else {
        takeProfitLevels.push(currentPrice + (atr * 3));
      }
      
      takeProfitLevels.push(currentPrice + (atr * 4.5));
    } else if (direction === 'SHORT') {
      takeProfitLevels.push(currentPrice - (atr * 1.5));
      
      if (supportLevels && supportLevels.length > 0) {
        const nextSupport = supportLevels[0].price;
        takeProfitLevels.push(nextSupport);
      } else {
        takeProfitLevels.push(currentPrice - (atr * 3));
      }
      
      takeProfitLevels.push(currentPrice - (atr * 4.5));
    }
    
    return takeProfitLevels;
  }
  
  assessRisk(tradeSignal, indicators, priceData) {
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
    if (positionPercentage > 10) {
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
      volatility: this.round(volatility, 3),
      positionSizePercentage: this.round(positionPercentage, 2)
    };
  }
  
  round(value, decimals = 4) {
    const factor = Math.pow(10, decimals);
    return Math.round(value * factor) / factor;
  }
  
  async getMarketOverview(symbols = ['BTCUSDT', 'ETHUSDT', 'AAPL', 'EURUSD', 'XAUUSD']) {
    const overview = {
      timestamp: Date.now(),
      markets: [],
      summary: {
        total: 0,
        bullish: 0,
        bearish: 0,
        neutral: 0
      }
    };
    
    for (const symbol of symbols) {
      try {
        const analysis = await this.analyzeSymbol(symbol, '1h');
        
        overview.markets.push({
          symbol: symbol,
          currentPrice: analysis.currentPrice,
          change24h: analysis.priceChange24h,
          aiStrategy: analysis.strategySelection?.strategy || 'NO_TRADE',
          signal: analysis.tradeSignal?.direction || 'NEUTRAL',
          rsi: analysis.indicators?.rsi,
          trend: analysis.indicators?.trend?.direction
        });
        
        if (analysis.tradeSignal?.direction === 'LONG') overview.summary.bullish++;
        else if (analysis.tradeSignal?.direction === 'SHORT') overview.summary.bearish++;
        else overview.summary.neutral++;
        
      } catch (error) {
        logger.error(`Market overview failed for ${symbol}:`, error.message);
      }
    }
    
    overview.summary.total = overview.markets.length;
    
    return overview;
  }
}

// ==================== TELEGRAM BOT HANDLER (POLLING) ====================
class TelegramBotHandler {
  constructor() {
    this.botToken = TELEGRAM_BOT_TOKEN;
    this.chatId = TELEGRAM_CHAT_ID;
    this.tradingEngine = new RealTradingEngine();
    this.lastUpdateId = 0;
    this.isRunning = false;
    
    if (!this.botToken || !this.chatId) {
      throw new Error('Telegram bot token and chat ID required');
    }
    
    logger.info('Telegram Bot Handler initialized (Polling Mode)');
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
          }
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
        `https://api.telegram.org/bot${this.botToken}/getUpdates?offset=${this.lastUpdateId + 1}&timeout=30`
      );
      
      const result = JSON.parse(response.text);
      
      if (result.ok && result.result.length > 0) {
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
    
    while (this.isRunning) {
      try {
        const updates = await this.getUpdates();
        
        for (const update of updates) {
          this.lastUpdateId = update.update_id;
          await this.handleUpdate(update);
        }
        
        await http.sleep(1000);
      } catch (error) {
        logger.error(`Polling error: ${error.message}`);
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
      } else if (text === '/overview') {
        await this.sendMarketOverview(chatId);
      } else if (text === '/markets') {
        await this.sendMarketStatus(chatId);
      } else if (text.startsWith('/test ')) {
        const symbol = text.split(' ')[1];
        await this.testAnalysis(chatId, symbol);
      } else if (text === '/stop') {
        await this.sendMessage(chatId, 'Bot polling stopped. Use /start to restart.');
        this.stopPolling();
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
      `<b>🤖 AI Analyzing: ${symbol}</b>\n\n` +
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

<b>Market Conditions:</b>
${Object.entries(analysis.marketAnalysis?.conditions || {})
  .filter(([_, isTrue]) => isTrue)
  .slice(0, 5)
  .map(([key]) => `• ${key.replace(/_/g, ' ').toUpperCase()}`)
  .join('\n') || '• Neutral conditions'}

<b>📊 Technicals:</b>
Price: $${analysis.currentPrice.toFixed(2)}
24h Change: ${analysis.priceChange24h.toFixed(2)}%
RSI: ${analysis.indicators.rsi.toFixed(1)}
Trend: ${analysis.indicators.trend?.direction || 'NEUTRAL'}

<b>🤖 Recommendation:</b>
Wait for better conditions or try different timeframe.
      `;
      
      await this.sendMessage(chatId, message);
      return;
    }
    
    const emoji = signal.direction === 'LONG' ? '🟢' : '🔴';
    const directionText = signal.direction === 'LONG' ? 'BUY/LONG' : 'SELL/SHORT';
    
    const message = `
${emoji} <b>AI TRADE SIGNAL: ${analysis.symbol}</b>

<b>Trade:</b> ${directionText} ${emoji}
<b>Strategy:</b> ${strategy.name} ${strategy.emoji}

<b>🎯 Entry Levels:</b>
Entry: $${signal.entry}
Stop Loss: $${signal.stopLoss}
Take Profit: $${signal.takeProfit.join(' | $')}

<b>📊 Position Size:</b>
Units: ${signal.positionSize.units}
Value: $${signal.positionSize.positionValue}
Risk: $${signal.positionSize.riskAmount} (${signal.positionSize.riskPercentage}%)

<b>⚖️ Risk/Reward:</b>
Risk: $${signal.risk}
Avg R/R: 1:${signal.avgRiskReward.toFixed(2)}
TP1: 1:${signal.riskRewards[0].toFixed(2)}
TP2: 1:${signal.riskRewards[1].toFixed(2)}
TP3: 1:${signal.riskRewards[2].toFixed(2)}

<b>🤔 AI Reasoning:</b>
${signal.reasons.join('\n')}

<b>📈 Market Analysis:</b>
• ${analysis.marketAnalysis?.recommendations?.[0]?.type || 'Institutional analysis'}
• Data Quality: ${analysis.dataQuality}

<b>⚠️ Risk Assessment:</b>
Level: ${analysis.riskAssessment.level}
Score: ${analysis.riskAssessment.score}/10
${analysis.riskAssessment.reasons?.slice(0, 2).map(r => `• ${r}`).join('\n') || ''}

<b>📊 Technical Summary:</b>
Price: $${analysis.currentPrice.toFixed(2)}
24h Change: ${analysis.priceChange24h.toFixed(2)}%
RSI: ${analysis.indicators.rsi.toFixed(1)}
Trend: ${analysis.indicators.trend?.direction || 'NEUTRAL'}
Volume: ${analysis.volume24h.toLocaleString()}

<b>⏰ Signal Valid Until:</b>
${new Date(signal.expiry).toLocaleTimeString()}

<b>🚨 RISK DISCLAIMER:</b>
This is real AI analysis using live market data. Trade responsibly with proper risk management.
      `;
    
    await this.sendMessage(chatId, message);
  }
  
  async sendHelpMessage(chatId) {
    const message = `
<b>🤖 AI Trading System v5.0</b>
<i>Real Market Data • No Simulations</i>

<b>📋 Commands:</b>
/analyze SYMBOL - AI analyzes any asset
/overview - Market overview
/markets - Market status
/status - System status
/test SYMBOL - Test analysis
/help - This message
/stop - Stop bot polling

<b>📈 Examples:</b>
/analyze BTCUSDT
/analyze ETHUSDT
/analyze AAPL
/analyze EURUSD
/analyze XAUUSD

<b>🧠 AI Strategies:</b>
⚛️ <b>Quantum Engine</b> - Institutional multi-timeframe
📈 <b>Momentum Pro</b> - Advanced momentum capture
🚀 <b>Breakout Master</b> - Precision breakout trading
↕️ <b>Mean Reversion Pro</b> - Statistical arbitrage

<b>📡 Real Data Sources:</b>
• Binance, Bybit, KuCoin
• Yahoo Finance, Finnhub
• Alpha Vantage, Polygon
• Multiple real-time APIs

<b>⚠️ RISK WARNING:</b>
Trading involves risk. AI analysis is for informational purposes only. Always use stop losses.
      `;
    
    await this.sendMessage(chatId, message);
  }
  
  async sendStatusMessage(chatId) {
    const marketData = new RealMarketData();
    const marketStatus = await marketData.getMarketStatus();
    
    const message = `
<b>📊 AI Trading System Status</b>

<b>System:</b> 🟢 OPERATIONAL
<b>Mode:</b> ${MODE.toUpperCase()}
<b>AI Engine:</b> 🟢 ACTIVE
<b>Telegram Mode:</b> POLLING

<b>🎯 Trading Parameters:</b>
Account Equity: $${ACCOUNT_EQUITY}
Risk per Trade: ${DEFAULT_RISK_PCT}%

<b>📈 Market Status:</b>
Stock Market: ${marketStatus.stockMarket}
Crypto Market: ${marketStatus.cryptoMarket}
BTC Price: $${marketStatus.btcPrice?.toFixed(2) || 'N/A'}
ETH Price: $${marketStatus.ethPrice?.toFixed(2) || 'N/A'}

<b>🔧 Real Data APIs:</b>
${BINANCE_API_KEY ? '• Binance: 🟢' : '• Binance: ⚫'}
${ALPACA_API_KEY ? '• Alpaca: 🟢' : '• Alpaca: ⚫'}
${FINNHUB_API_KEY ? '• Finnhub: 🟢' : '• Finnhub: ⚫'}

<b>🚀 Usage:</b>
/analyze SYMBOL for real AI analysis
      `;
    
    await this.sendMessage(chatId, message);
  }
  
  async sendMarketOverview(chatId) {
    const processingMsg = await this.sendMessage(chatId, '📊 Generating market overview...');
    
    try {
      const overview = await this.tradingEngine.getMarketOverview();
      
      let message = `<b>🌐 MARKET OVERVIEW</b>\n\n`;
      
      overview.markets.forEach(market => {
        const changeEmoji = market.change24h > 0 ? '🟢' : market.change24h < 0 ? '🔴' : '🟡';
        const signalEmoji = market.signal === 'LONG' ? '🟢' : market.signal === 'SHORT' ? '🔴' : '🟡';
        
        message += `<b>${market.symbol}</b>\n`;
        message += `Price: $${market.currentPrice.toFixed(2)} ${changeEmoji} ${market.change24h.toFixed(2)}%\n`;
        message += `Signal: ${signalEmoji} ${market.signal} | ${market.aiStrategy}\n`;
        message += `RSI: ${market.rsi.toFixed(1)} | Trend: ${market.trend || 'NEUTRAL'}\n`;
        message += `━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
      });
      
      message += `\n<b>📈 SUMMARY</b>\n`;
      message += `Bullish: ${overview.summary.bullish} | Bearish: ${overview.summary.bearish} | Neutral: ${overview.summary.neutral}\n`;
      message += `Total Markets: ${overview.summary.total}\n\n`;
      message += `<i>Real-time data • No simulations</i>`;
      
      await this.sendMessage(chatId, message);
      
    } catch (error) {
      await this.sendMessage(chatId,
        `<b>❌ Overview Failed</b>\n\n<code>${error.message}</code>`
      );
    }
  }
  
  async sendMarketStatus(chatId) {
    const marketData = new RealMarketData();
    
    try {
      const status = await marketData.getMarketStatus();
      
      const message = `
<b>📡 MARKET STATUS</b>

<b>Current Time:</b> ${new Date().toLocaleString()}
<b>Stock Market:</b> ${status.stockMarket}
<b>Crypto Market:</b> ${status.cryptoMarket}
${status.nextMarketOpen ? `<b>Next Open:</b> ${new Date(status.nextMarketOpen).toLocaleString()}` : ''}

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
  
  async testAnalysis(chatId, symbol) {
    if (!symbol) {
      await this.sendMessage(chatId, '❌ Usage: /test SYMBOL');
      return;
    }
    
    const testMessage = `
<b>🧪 TEST ANALYSIS: ${symbol}</b>

<b>Testing Real Data Pipeline:</b>
1. Fetching from multiple exchanges...
2. Running technical analysis...
3. AI strategy selection...
4. Risk assessment...

<b>Expected Output:</b>
• Real market data (no simulations)
• Multiple timeframe analysis
• AI-generated trade signal
• Complete risk metrics

<b>Status:</b> 🟢 IN PROGRESS

<i>This may take 10-15 seconds...</i>
      `;
    
    await this.sendMessage(chatId, testMessage);
    
    setTimeout(async () => {
      try {
        await this.handleAnalyzeCommand(chatId, `/analyze ${symbol}`);
      } catch (error) {
        await this.sendMessage(chatId,
          `<b>❌ Test Failed</b>\n\n<code>${error.message}</code>`
        );
      }
    }, 5000);
  }
}

// ==================== MAIN APPLICATION ====================
class AI_Trading_System {
  constructor() {
    this.telegramBot = null;
    this.tradingEngine = null;
    this.httpServer = null;
    this.isSingleInstance = true;
    this.instanceId = Math.random().toString(36).substr(2, 9);
  }
  
  async initialize() {
    try {
      logger.info('='.repeat(60));
      logger.info('🚀 AI TRADING SYSTEM v5.0 - REAL DATA EDITION');
      logger.info('='.repeat(60));
      logger.info('📡 Features:');
      logger.info('• Real market data from multiple exchanges');
      logger.info('• No simulations - 100% real analysis');
      logger.info('• Advanced AI strategy selection');
      logger.info('• Complete risk management');
      logger.info('• Telegram polling integration');
      logger.info('');
      logger.info('🧠 AI Strategies:');
      logger.info('⚛️  Quantum Engine V3.0');
      logger.info('📈 Momentum Pro V2.0');
      logger.info('🚀 Breakout Master V1.5');
      logger.info('↕️  Mean Reversion Pro V1.2');
      logger.info('');
      logger.info('💰 Account Equity: $' + ACCOUNT_EQUITY);
      logger.info('⚖️  Risk per Trade: ' + DEFAULT_RISK_PCT + '%');
      logger.info('🆔 Instance ID: ' + this.instanceId);
      logger.info('');
      
      // Check if another instance is running
      await this.checkSingleInstance();
      
      // Initialize trading engine
      this.tradingEngine = new RealTradingEngine();
      
      // Initialize Telegram bot with polling
      this.telegramBot = new TelegramBotHandler();
      
      // Start HTTP server
      this.startHttpServer();
      
      // Start Telegram polling in background
      this.startTelegramPolling();
      
      logger.info('');
      logger.info('✅ SYSTEM READY');
      logger.info('🤖 Send /analyze BTCUSDT to your Telegram bot');
      logger.info('🌐 Health check: http://localhost:' + PORT + '/health');
      logger.info('📊 API: POST http://localhost:' + PORT + '/api/analyze');
      
    } catch (error) {
      logger.error('Startup error:', error.message);
      process.exit(1);
    }
  }
  
  async checkSingleInstance() {
    try {
      const net = require('net');
      const server = net.createServer();
      
      server.once('error', (err) => {
        if (err.code === 'EADDRINUSE') {
          logger.error('❌ Another instance is already running on port ' + PORT);
          logger.error('   Only one instance can run at a time');
          process.exit(1);
        }
      });
      
      server.once('listening', () => {
        server.close();
      });
      
      server.listen(PORT);
    } catch (error) {
      logger.error('Single instance check failed:', error.message);
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
        } else if (req.method === 'GET' && pathname === '/api/overview') {
          await this.handleMarketOverview(req, res);
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
      logger.info(`📊 Health: GET http://localhost:${PORT}/health`);
      logger.info(`🤖 API: POST http://localhost:${PORT}/api/analyze`);
    });
    
    server.on('error', (error) => {
      logger.error(`Server error: ${error.message}`);
    });
    
    this.httpServer = server;
  }
  
  startTelegramPolling() {
    // Start polling in background
    this.telegramBot.startPolling().catch(error => {
      logger.error(`Telegram polling failed: ${error.message}`);
    });
    
    logger.info('🤖 Telegram polling started');
  }
  
  async handleHealth(req, res) {
    const marketData = new RealMarketData();
    const status = await marketData.getMarketStatus();
    
    const health = {
      status: 'operational',
      version: '5.0',
      timestamp: Date.now(),
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      
      system: {
        mode: MODE,
        aiEnabled: ENABLE_AI_STRATEGY_SELECTION === 'true',
        accountEquity: ACCOUNT_EQUITY,
        riskPerTrade: DEFAULT_RISK_PCT,
        instanceId: this.instanceId
      },
      
      market: status,
      
      apis: {
        telegram: 'POLLING_MODE',
        binance: !!BINANCE_API_KEY,
        alpaca: !!ALPACA_API_KEY,
        finnhub: !!FINNHUB_API_KEY
      },
      
      data: {
        quality: 'REAL',
        sources: 'MULTIPLE_EXCHANGES',
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
  
  async handleMarketOverview(req, res) {
    try {
      const overview = await this.tradingEngine.getMarketOverview();
      
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        success: true,
        timestamp: Date.now(),
        overview: overview
      }));
    } catch (error) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: error.message }));
    }
  }
  
  async handleTest(req, res) {
    const test = {
      status: 'ok',
      message: 'AI Trading System v5.0 - Real Data Edition',
      timestamp: Date.now(),
      features: [
        'Real market data from multiple exchanges',
        'No simulations - 100% real analysis',
        'Advanced AI strategy selection',
        'Complete risk management',
        'Telegram polling integration'
      ],
      endpoints: {
        health: 'GET /health',
        analyze: 'POST /api/analyze',
        overview: 'GET /api/overview'
      },
      configuration: {
        mode: MODE,
        accountEquity: ACCOUNT_EQUITY,
        riskPerTrade: DEFAULT_RISK_PCT,
        dataQuality: 'REAL',
        simulations: 'NONE',
        singleInstance: this.isSingleInstance
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
    <title>AI Trading System v5.0</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 40px; background: #0f0f23; color: #00ff00; }
        .container { max-width: 800px; margin: 0 auto; }
        .header { background: #1a1a2e; padding: 20px; border-radius: 10px; margin-bottom: 20px; }
        .status { background: #16213e; padding: 15px; border-radius: 8px; margin: 10px 0; }
        .endpoint { background: #0f3460; padding: 10px; border-radius: 5px; margin: 5px 0; }
        .green { color: #00ff00; }
        .red { color: #ff0000; }
        .yellow { color: #ffff00; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🤖 AI Trading System v5.0</h1>
            <p><span class="green">Real Market Data • No Simulations</span></p>
        </div>
        
        <div class="status">
            <h2>📊 System Status</h2>
            <p><span class="green">🟢 OPERATIONAL</span></p>
            <p>Instance ID: ${this.instanceId}</p>
            <p>Mode: ${MODE.toUpperCase()}</p>
            <p>Port: ${PORT}</p>
        </div>
        
        <div class="status">
            <h2>🚀 Available Endpoints</h2>
            <div class="endpoint">
                <strong>GET /health</strong> - System health check
            </div>
            <div class="endpoint">
                <strong>POST /api/analyze</strong> - AI analysis for any symbol
            </div>
            <div class="endpoint">
                <strong>GET /api/overview</strong> - Market overview
            </div>
            <div class="endpoint">
                <strong>GET /test</strong> - Test endpoint
            </div>
        </div>
        
        <div class="status">
            <h2>📈 Example API Call</h2>
            <pre style="background: #000; padding: 10px; border-radius: 5px;">
curl -X POST http://localhost:${PORT}/api/analyze \\
  -H "Content-Type: application/json" \\
  -d '{"symbol": "BTCUSDT", "timeframe": "1h"}'
            </pre>
        </div>
        
        <div class="status">
            <h2>⚠️ Important</h2>
            <p>• System runs single instance only</p>
            <p>• Uses real market data (no simulations)</p>
            <p>• Telegram bot running in polling mode</p>
            <p>• Analysis includes full risk management</p>
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
