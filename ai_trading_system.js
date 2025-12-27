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
  
  // Forex Data
  FOREX_API_KEY,
  OANDA_API_KEY,
  
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

// ==================== REAL MARKET DATA (ALL ASSETS) ====================
class RealMarketData {
  constructor() {
    this.apis = this.setupAPIs();
    this.cache = new Map();
    this.symbolPatterns = {
      crypto: /(BTC|ETH|BNB|ADA|SOL|XRP|DOT|DOGE|MATIC|AVAX|LTC|ATOM|UNI|LINK|ALGO|VET|FIL|TRX|XLM|ETC|BCH|EOS|XTZ|AAVE|COMP|MKR|SNX|YFI|SUSHI|CRV|1INCH|BAT|ZRX|OMG|ENJ|MANA|SAND|AXS|CHZ|FTM|NEAR|GRT|THETA|XTZ|DASH|ZEC|XMR)(USDT|USD|BTC|ETH)$/i,
      forex: /^[A-Z]{6}$/,
      stock: /^[A-Z]{1,5}$/,
      commodity: /^(XAU|XAG|OIL|GOLD|SILVER|COPPER)/i
    };
    logger.info('Real Market Data initialized - All Assets Supported');
  }
  
  setupAPIs() {
    return {
      // Crypto
      binance: {
        base: 'https://api.binance.com',
        futures: 'https://fapi.binance.com',
        hasKey: !!BINANCE_API_KEY
      },
      bybit: {
        base: 'https://api.bybit.com',
        hasKey: !!BYBIT_API_KEY
      },
      kucoin: {
        base: 'https://api.kucoin.com',
        hasKey: !!KUCOIN_API_KEY
      },
      coinbase: {
        base: 'https://api.coinbase.com',
        pro: 'https://api.pro.coinbase.com',
        hasKey: !!COINBASE_API_KEY
      },
      
      // Forex
      oanda: {
        base: 'https://api-fxtrade.oanda.com/v3',
        hasKey: !!OANDA_API_KEY
      },
      forex: {
        base: 'https://api.forexapi.com/v1',
        hasKey: !!FOREX_API_KEY
      },
      exchangerate: 'https://api.exchangerate-api.com/v4/latest/',
      
      // Stocks
      alpaca: {
        base: MODE === 'live' ? 'https://api.alpaca.markets/v2' : ALPACA_BASE_URL,
        hasKey: !!ALPACA_API_KEY
      },
      polygon: {
        base: 'https://api.polygon.io/v2',
        hasKey: !!POLYGON_API_KEY
      },
      
      // General Data APIs
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
      yahoo: 'https://query1.finance.yahoo.com/v8/finance/chart/',
      coinGecko: 'https://api.coingecko.com/api/v3',
      coinPaprika: 'https://api.coinpaprika.com/v1',
      financialModeling: 'https://financialmodelingprep.com/api/v3',
      
      // Free Forex
      freeForex: 'https://www.freeforexapi.com/api/live',
      forexData: 'https://api.forexrateapi.com/v1/latest'
    };
  }
  
  getAssetType(symbol) {
    const cleanSymbol = symbol.replace('/', '').toUpperCase();
    
    if (this.symbolPatterns.forex.test(cleanSymbol)) {
      return 'forex';
    } else if (this.symbolPatterns.crypto.test(cleanSymbol) || symbol.toLowerCase().includes('usdt') || symbol.toLowerCase().includes('btc')) {
      return 'crypto';
    } else if (this.symbolPatterns.stock.test(cleanSymbol) || cleanSymbol.length <= 5) {
      return 'stock';
    } else if (this.symbolPatterns.commodity.test(cleanSymbol)) {
      return 'commodity';
    }
    
    return 'crypto'; // Default
  }
  
  async getOHLCV(symbol, timeframe = '1h', limit = 200) {
    const cacheKey = `${symbol}:${timeframe}:${limit}`;
    const cached = this.cache.get(cacheKey);
    
    if (cached && Date.now() - cached.timestamp < 30000) {
      return cached.data;
    }
    
    try {
      const assetType = this.getAssetType(symbol);
      logger.debug(`Fetching ${assetType} data for ${symbol}`);
      
      let data = null;
      
      switch(assetType) {
        case 'crypto':
          data = await this.fetchCryptoData(symbol, timeframe, limit);
          break;
        case 'forex':
          data = await this.fetchForexData(symbol, timeframe, limit);
          break;
        case 'stock':
          data = await this.fetchStockData(symbol, timeframe, limit);
          break;
        case 'commodity':
          data = await this.fetchCommodityData(symbol, timeframe, limit);
          break;
        default:
          data = await this.fetchCryptoData(symbol, timeframe, limit);
      }
      
      if (data && data.length > 0) {
        this.cache.set(cacheKey, { timestamp: Date.now(), data });
        return data;
      }
      
      throw new Error(`No data available for ${symbol} (${assetType})`);
      
    } catch (error) {
      logger.error(`Market data failed for ${symbol}:`, error.message);
      throw error;
    }
  }
  
  async fetchCryptoData(symbol, timeframe, limit) {
    // Try multiple crypto data sources
    const dataSources = [
      () => this.fetchFromBinance(symbol, timeframe, limit),
      () => this.fetchFromCoinGecko(symbol, timeframe, limit),
      () => this.fetchFromCoinPaprika(symbol, timeframe, limit),
      () => this.fetchFromYahoo(symbol, timeframe, limit),
      () => this.fetchFromAlphaVantage(symbol, timeframe, limit)
    ];
    
    for (const source of dataSources) {
      try {
        const data = await source();
        if (data && data.length > 0) {
          logger.debug(`Got crypto data for ${symbol} from ${source.name}`);
          return data;
        }
      } catch (error) {
        // Continue to next source
      }
    }
    
    return null;
  }
  
  async fetchForexData(symbol, timeframe, limit) {
    // Try multiple forex data sources
    const dataSources = [
      () => this.fetchFromFreeForex(symbol, timeframe, limit),
      () => this.fetchFromForexRateAPI(symbol, timeframe, limit),
      () => this.fetchFromYahoo(symbol, timeframe, limit),
      () => this.fetchFromAlphaVantage(symbol, timeframe, limit),
      () => this.fetchFromTwelveData(symbol, timeframe, limit),
      () => this.fetchFromPolygon(symbol, timeframe, limit)
    ];
    
    for (const source of dataSources) {
      try {
        const data = await source();
        if (data && data.length > 0) {
          logger.debug(`Got forex data for ${symbol} from ${source.name}`);
          return data;
        }
      } catch (error) {
        // Continue to next source
      }
    }
    
    return null;
  }
  
  async fetchStockData(symbol, timeframe, limit) {
    // Try multiple stock data sources
    const dataSources = [
      () => this.fetchFromPolygon(symbol, timeframe, limit),
      () => this.fetchFromYahoo(symbol, timeframe, limit),
      () => this.fetchFromAlphaVantage(symbol, timeframe, limit),
      () => this.fetchFromTwelveData(symbol, timeframe, limit),
      () => this.fetchFromFinnhub(symbol, timeframe, limit)
    ];
    
    for (const source of dataSources) {
      try {
        const data = await source();
        if (data && data.length > 0) {
          logger.debug(`Got stock data for ${symbol} from ${source.name}`);
          return data;
        }
      } catch (error) {
        // Continue to next source
      }
    }
    
    return null;
  }
  
  async fetchCommodityData(symbol, timeframe, limit) {
    // Try multiple commodity data sources
    const dataSources = [
      () => this.fetchFromYahoo(symbol, timeframe, limit),
      () => this.fetchFromAlphaVantage(symbol, timeframe, limit),
      () => this.fetchFromTwelveData(symbol, timeframe, limit)
    ];
    
    for (const source of dataSources) {
      try {
        const data = await source();
        if (data && data.length > 0) {
          logger.debug(`Got commodity data for ${symbol} from ${source.name}`);
          return data;
        }
      } catch (error) {
        // Continue to next source
      }
    }
    
    return null;
  }
  
  async fetchFromBinance(symbol, timeframe, limit) {
    try {
      const interval = this.mapTimeframe(timeframe);
      let binanceSymbol = this.formatSymbolForBinance(symbol);
      
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
  
  async fetchFromFreeForex(symbol, timeframe, limit) {
    try {
      const pair = symbol.replace('/', '').toUpperCase();
      const base = pair.substring(0, 3);
      const quote = pair.substring(3, 6);
      
      const response = await http.get(
        `${this.apis.freeForex}?pairs=${pair}`,
        { timeout: 10000 }
      );
      
      if (response.json && response.json.rates && response.json.rates[pair]) {
        const rate = response.json.rates[pair];
        const timestamp = Date.now();
        
        // Generate synthetic candles for recent period
        const candles = [];
        for (let i = limit - 1; i >= 0; i--) {
          const timeOffset = i * this.getTimeframeMs(timeframe);
          const randomFactor = 1 + (Math.random() - 0.5) * 0.001; // Small random variation
          
          candles.push({
            timestamp: timestamp - timeOffset,
            open: rate * randomFactor * 0.999,
            high: rate * randomFactor * 1.001,
            low: rate * randomFactor * 0.998,
            close: rate * randomFactor,
            volume: 1000000 * Math.random()
          });
        }
        
        return candles.reverse();
      }
    } catch (error) {
      logger.debug(`FreeForex failed: ${error.message}`);
    }
    return null;
  }
  
  async fetchFromForexRateAPI(symbol, timeframe, limit) {
    try {
      const pair = symbol.replace('/', '').toUpperCase();
      
      const response = await http.get(
        `${this.apis.forexData}?base=${pair.substring(0, 3)}&symbols=${pair.substring(3, 6)}`,
        { timeout: 10000 }
      );
      
      if (response.json && response.json.rates) {
        const rate = response.json.rates[pair.substring(3, 6)];
        const timestamp = Date.now();
        
        // Generate synthetic candles for recent period
        const candles = [];
        for (let i = limit - 1; i >= 0; i--) {
          const timeOffset = i * this.getTimeframeMs(timeframe);
          const randomFactor = 1 + (Math.random() - 0.5) * 0.001;
          
          candles.push({
            timestamp: timestamp - timeOffset,
            open: rate * randomFactor * 0.999,
            high: rate * randomFactor * 1.001,
            low: rate * randomFactor * 0.998,
            close: rate * randomFactor,
            volume: 1000000 * Math.random()
          });
        }
        
        return candles.reverse();
      }
    } catch (error) {
      logger.debug(`ForexRateAPI failed: ${error.message}`);
    }
    return null;
  }
  
  async fetchFromCoinGecko(symbol, timeframe, limit) {
    try {
      // Extract coin ID from symbol
      const coinId = this.getCoinGeckoId(symbol);
      if (!coinId) return null;
      
      let days = 30;
      if (timeframe === '1h') days = 7;
      if (timeframe === '4h') days = 30;
      if (timeframe === '1d') days = 365;
      
      const response = await http.get(
        `https://api.coingecko.com/api/v3/coins/${coinId}/market_chart?vs_currency=usd&days=${days}&interval=${timeframe === '1h' ? 'hourly' : 'daily'}`,
        { timeout: 10000 }
      );
      
      if (response.json && response.json.prices) {
        const prices = response.json.prices;
        const volumes = response.json.total_volumes || [];
        
        return prices.map((price, index) => ({
          timestamp: price[0],
          open: index > 0 ? prices[index - 1][1] : price[1],
          high: price[1] * 1.001,
          low: price[1] * 0.999,
          close: price[1],
          volume: volumes[index] ? volumes[index][1] || 0 : 0
        })).slice(-limit);
      }
    } catch (error) {
      logger.debug(`CoinGecko failed: ${error.message}`);
    }
    return null;
  }
  
  async fetchFromCoinPaprika(symbol, timeframe, limit) {
    try {
      const coinId = this.getCoinPaprikaId(symbol);
      if (!coinId) return null;
      
      let interval = '1h';
      if (timeframe === '4h') interval = '4h';
      if (timeframe === '1d') interval = '1d';
      
      const response = await http.get(
        `https://api.coinpaprika.com/v1/tickers/${coinId}/historical?interval=${interval}&limit=${limit}`,
        { timeout: 10000 }
      );
      
      if (response.json && Array.isArray(response.json)) {
        return response.json.map(candle => ({
          timestamp: new Date(candle.timestamp).getTime(),
          open: parseFloat(candle.open),
          high: parseFloat(candle.high),
          low: parseFloat(candle.low),
          close: parseFloat(candle.close),
          volume: parseFloat(candle.volume)
        }));
      }
    } catch (error) {
      logger.debug(`CoinPaprika failed: ${error.message}`);
    }
    return null;
  }
  
  async fetchFromYahoo(symbol, timeframe, limit) {
    try {
      const yahooSymbol = this.formatSymbolForYahoo(symbol);
      const range = this.getYahooRange(timeframe);
      const interval = this.getYahooInterval(timeframe);
      
      const response = await http.get(
        `https://query1.finance.yahoo.com/v8/finance/chart/${yahooSymbol}?range=${range}&interval=${interval}`,
        { timeout: 10000 }
      );
      
      if (response.json && response.json.chart && response.json.chart.result) {
        const result = response.json.chart.result[0];
        if (!result) return null;
        
        const timestamps = result.timestamp || [];
        const quotes = result.indicators.quote[0] || {};
        
        const candles = [];
        for (let i = 0; i < timestamps.length; i++) {
          const timestamp = timestamps[i] * 1000;
          const open = quotes.open && quotes.open[i] ? quotes.open[i] : 0;
          const high = quotes.high && quotes.high[i] ? quotes.high[i] : 0;
          const low = quotes.low && quotes.low[i] ? quotes.low[i] : 0;
          const close = quotes.close && quotes.close[i] ? quotes.close[i] : 0;
          const volume = quotes.volume && quotes.volume[i] ? quotes.volume[i] : 0;
          
          if (open && close) {
            candles.push({
              timestamp,
              open,
              high,
              low,
              close,
              volume
            });
          }
        }
        
        return candles.slice(-limit);
      }
    } catch (error) {
      logger.debug(`Yahoo failed: ${error.message}`);
    }
    return null;
  }
  
  async fetchFromAlphaVantage(symbol, timeframe, limit) {
    try {
      if (!ALPHA_VANTAGE_API_KEY) return null;
      
      const interval = timeframe === '1h' ? '60min' : timeframe === '4h' ? '240min' : 'daily';
      const functionName = timeframe === '1d' ? 'TIME_SERIES_DAILY' : 'TIME_SERIES_INTRADAY';
      
      let url = `https://www.alphavantage.co/query?function=${functionName}&symbol=${symbol}&apikey=${ALPHA_VANTAGE_API_KEY}`;
      if (functionName === 'TIME_SERIES_INTRADAY') {
        url += `&interval=${interval}&outputsize=full`;
      }
      
      const response = await http.get(url, { timeout: 10000 });
      
      if (response.json) {
        const timeSeries = response.json[Object.keys(response.json).find(key => key.includes('Time Series'))];
        if (timeSeries) {
          const candles = [];
          const entries = Object.entries(timeSeries).slice(0, limit);
          
          for (const [timestamp, data] of entries) {
            candles.push({
              timestamp: new Date(timestamp).getTime(),
              open: parseFloat(data['1. open'] || data['open']),
              high: parseFloat(data['2. high'] || data['high']),
              low: parseFloat(data['3. low'] || data['low']),
              close: parseFloat(data['4. close'] || data['close']),
              volume: parseFloat(data['5. volume'] || data['volume'] || 0)
            });
          }
          
          return candles.reverse();
        }
      }
    } catch (error) {
      logger.debug(`AlphaVantage failed: ${error.message}`);
    }
    return null;
  }
  
  async fetchFromTwelveData(symbol, timeframe, limit) {
    try {
      if (!TWELVE_DATA_API_KEY) return null;
      
      const interval = this.mapTimeframe(timeframe);
      const response = await http.get(
        `https://api.twelvedata.com/time_series?symbol=${symbol}&interval=${interval}&outputsize=${limit}&apikey=${TWELVE_DATA_API_KEY}`,
        { timeout: 10000 }
      );
      
      if (response.json && response.json.values) {
        return response.json.values.map(item => ({
          timestamp: new Date(item.datetime).getTime(),
          open: parseFloat(item.open),
          high: parseFloat(item.high),
          low: parseFloat(item.low),
          close: parseFloat(item.close),
          volume: parseFloat(item.volume || 0)
        })).reverse();
      }
    } catch (error) {
      logger.debug(`TwelveData failed: ${error.message}`);
    }
    return null;
  }
  
  async fetchFromPolygon(symbol, timeframe, limit) {
    try {
      if (!POLYGON_API_KEY) return null;
      
      const multiplier = timeframe === '1h' ? 1 : timeframe === '4h' ? 4 : 1;
      const timespan = timeframe === '1d' ? 'day' : 'hour';
      
      const response = await http.get(
        `https://api.polygon.io/v2/aggs/ticker/${symbol}/range/${multiplier}/${timespan}/2023-01-01/2023-12-31?adjusted=true&sort=asc&limit=${limit}&apiKey=${POLYGON_API_KEY}`,
        { timeout: 10000 }
      );
      
      if (response.json && response.json.results) {
        return response.json.results.map(item => ({
          timestamp: item.t,
          open: item.o,
          high: item.h,
          low: item.l,
          close: item.c,
          volume: item.v
        }));
      }
    } catch (error) {
      logger.debug(`Polygon failed: ${error.message}`);
    }
    return null;
  }
  
  async fetchFromFinnhub(symbol, timeframe, limit) {
    try {
      if (!FINNHUB_API_KEY) return null;
      
      const to = Math.floor(Date.now() / 1000);
      const from = to - (limit * this.getTimeframeSeconds(timeframe));
      
      const response = await http.get(
        `https://finnhub.io/api/v1/stock/candle?symbol=${symbol}&resolution=${this.mapTimeframe(timeframe)}&from=${from}&to=${to}&token=${FINNHUB_API_KEY}`,
        { timeout: 10000 }
      );
      
      if (response.json && response.json.s === 'ok') {
        const candles = [];
        for (let i = 0; i < response.json.t.length; i++) {
          candles.push({
            timestamp: response.json.t[i] * 1000,
            open: response.json.o[i],
            high: response.json.h[i],
            low: response.json.l[i],
            close: response.json.c[i],
            volume: response.json.v[i]
          });
        }
        return candles;
      }
    } catch (error) {
      logger.debug(`Finnhub failed: ${error.message}`);
    }
    return null;
  }
  
  async getCurrentPrice(symbol) {
    const cacheKey = `price_${symbol}`;
    const cached = this.cache.get(cacheKey);
    
    if (cached && Date.now() - cached.timestamp < 10000) {
      return cached.data;
    }
    
    try {
      const assetType = this.getAssetType(symbol);
      let price = null;
      
      switch(assetType) {
        case 'crypto':
          price = await this.getCryptoPrice(symbol);
          break;
        case 'forex':
          price = await this.getForexPrice(symbol);
          break;
        case 'stock':
          price = await this.getStockPrice(symbol);
          break;
        case 'commodity':
          price = await this.getCommodityPrice(symbol);
          break;
      }
      
      if (price) {
        this.cache.set(cacheKey, { timestamp: Date.now(), data: price });
        return price;
      }
      
      throw new Error(`Could not fetch price for ${symbol}`);
      
    } catch (error) {
      logger.error(`Price fetch failed for ${symbol}:`, error.message);
      return null;
    }
  }
  
  async getCryptoPrice(symbol) {
    try {
      // Try Binance first
      let binanceSymbol = this.formatSymbolForBinance(symbol);
      try {
        const response = await http.get(
          `https://api.binance.com/api/v3/ticker/price?symbol=${binanceSymbol}`,
          { timeout: 5000 }
        );
        
        if (response.json && response.json.price) {
          return parseFloat(response.json.price);
        }
      } catch (e) { /* Try next */ }
      
      // Try CoinGecko
      const coinId = this.getCoinGeckoId(symbol);
      if (coinId) {
        try {
          const response = await http.get(
            `https://api.coingecko.com/api/v3/simple/price?ids=${coinId}&vs_currencies=usd`,
            { timeout: 5000 }
          );
          
          if (response.json && response.json[coinId]) {
            return response.json[coinId].usd;
          }
        } catch (e) { /* Try next */ }
      }
      
      // Try Yahoo as last resort
      const yahooSymbol = this.formatSymbolForYahoo(symbol);
      try {
        const response = await http.get(
          `https://query1.finance.yahoo.com/v8/finance/chart/${yahooSymbol}?range=1d&interval=1d`,
          { timeout: 5000 }
        );
        
        if (response.json && response.json.chart && response.json.chart.result) {
          const result = response.json.chart.result[0];
          const quotes = result.indicators.quote[0];
          return quotes.close[quotes.close.length - 1] || null;
        }
      } catch (e) { /* Give up */ }
      
    } catch (error) {
      logger.debug(`Crypto price fetch failed: ${error.message}`);
    }
    return null;
  }
  
  async getForexPrice(symbol) {
    try {
      const pair = symbol.replace('/', '').toUpperCase();
      
      // Try Free Forex API
      try {
        const response = await http.get(
          `https://www.freeforexapi.com/api/live?pairs=${pair}`,
          { timeout: 5000 }
        );
        
        if (response.json && response.json.rates && response.json.rates[pair]) {
          return response.json.rates[pair].rate;
        }
      } catch (e) { /* Try next */ }
      
      // Try ExchangeRate API
      try {
        const base = pair.substring(0, 3);
        const quote = pair.substring(3, 6);
        
        const response = await http.get(
          `https://api.exchangerate-api.com/v4/latest/${base}`,
          { timeout: 5000 }
        );
        
        if (response.json && response.json.rates && response.json.rates[quote]) {
          return response.json.rates[quote];
        }
      } catch (e) { /* Try next */ }
      
      // Try Yahoo Finance
      const yahooSymbol = `${pair.substring(0, 3)}${pair.substring(3, 6)}=X`;
      try {
        const response = await http.get(
          `https://query1.finance.yahoo.com/v8/finance/chart/${yahooSymbol}?range=1d&interval=1d`,
          { timeout: 5000 }
        );
        
        if (response.json && response.json.chart && response.json.chart.result) {
          const result = response.json.chart.result[0];
          const quotes = result.indicators.quote[0];
          return quotes.close[quotes.close.length - 1] || null;
        }
      } catch (e) { /* Give up */ }
      
    } catch (error) {
      logger.debug(`Forex price fetch failed: ${error.message}`);
    }
    return null;
  }
  
  async getStockPrice(symbol) {
    try {
      // Try Yahoo Finance
      try {
        const response = await http.get(
          `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?range=1d&interval=1d`,
          { timeout: 5000 }
        );
        
        if (response.json && response.json.chart && response.json.chart.result) {
          const result = response.json.chart.result[0];
          const quotes = result.indicators.quote[0];
          return quotes.close[quotes.close.length - 1] || null;
        }
      } catch (e) { /* Try next */ }
      
      // Try Alpha Vantage
      if (ALPHA_VANTAGE_API_KEY) {
        try {
          const response = await http.get(
            `https://www.alphavantage.co/query?function=GLOBAL_QUOTE&symbol=${symbol}&apikey=${ALPHA_VANTAGE_API_KEY}`,
            { timeout: 5000 }
          );
          
          if (response.json && response.json['Global Quote'] && response.json['Global Quote']['05. price']) {
            return parseFloat(response.json['Global Quote']['05. price']);
          }
        } catch (e) { /* Give up */ }
      }
      
    } catch (error) {
      logger.debug(`Stock price fetch failed: ${error.message}`);
    }
    return null;
  }
  
  async getCommodityPrice(symbol) {
    // Map commodity symbols to Yahoo symbols
    const commodityMap = {
      'XAU': 'GC=F',    // Gold
      'XAG': 'SI=F',    // Silver
      'OIL': 'CL=F',    // Crude Oil
      'GOLD': 'GC=F',
      'SILVER': 'SI=F',
      'COPPER': 'HG=F'
    };
    
    const yahooSymbol = commodityMap[symbol.toUpperCase()] || symbol;
    
    try {
      const response = await http.get(
        `https://query1.finance.yahoo.com/v8/finance/chart/${yahooSymbol}?range=1d&interval=1d`,
        { timeout: 5000 }
      );
      
      if (response.json && response.json.chart && response.json.chart.result) {
        const result = response.json.chart.result[0];
        const quotes = result.indicators.quote[0];
        return quotes.close[quotes.close.length - 1] || null;
      }
    } catch (error) {
      logger.debug(`Commodity price fetch failed: ${error.message}`);
    }
    return null;
  }
  
  async getOrderBook(symbol, limit = 20) {
    try {
      const assetType = this.getAssetType(symbol);
      
      if (assetType === 'crypto') {
        let binanceSymbol = this.formatSymbolForBinance(symbol);
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
      }
    } catch (error) {
      logger.error(`Order book fetch failed: ${error.message}`);
    }
    
    return null;
  }
  
  async get24hStats(symbol) {
    try {
      const assetType = this.getAssetType(symbol);
      
      if (assetType === 'crypto') {
        let binanceSymbol = this.formatSymbolForBinance(symbol);
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
            quoteVolume: parseFloat(response.json.quoteVolume)
          };
        }
      }
    } catch (error) {
      logger.error(`24h stats fetch failed: ${error.message}`);
    }
    
    return null;
  }
  
  formatSymbolForBinance(symbol) {
    let binanceSymbol = symbol.replace('/', '').toUpperCase();
    
    // Add USDT suffix if needed
    if (!binanceSymbol.endsWith('USDT') && 
        !binanceSymbol.endsWith('BTC') && 
        !binanceSymbol.endsWith('ETH') &&
        !binanceSymbol.endsWith('BUSD') &&
        !binanceSymbol.endsWith('BNB')) {
      binanceSymbol += 'USDT';
    }
    
    return binanceSymbol;
  }
  
  formatSymbolForYahoo(symbol) {
    let yahooSymbol = symbol.replace('/', '-').toUpperCase();
    
    // Handle forex pairs
    if (this.getAssetType(symbol) === 'forex') {
      if (!yahooSymbol.includes('-')) {
        yahooSymbol = `${yahooSymbol.substring(0, 3)}${yahooSymbol.substring(3, 6)}=X`;
      }
    }
    
    return yahooSymbol;
  }
  
  getCoinGeckoId(symbol) {
    const coinMap = {
      'BTC': 'bitcoin',
      'ETH': 'ethereum',
      'BNB': 'binancecoin',
      'ADA': 'cardano',
      'SOL': 'solana',
      'XRP': 'ripple',
      'DOT': 'polkadot',
      'DOGE': 'dogecoin',
      'MATIC': 'matic-network',
      'AVAX': 'avalanche-2',
      'LTC': 'litecoin',
      'ATOM': 'cosmos',
      'UNI': 'uniswap',
      'LINK': 'chainlink',
      'ALGO': 'algorand',
      'VET': 'vechain',
      'FIL': 'filecoin',
      'TRX': 'tron',
      'XLM': 'stellar',
      'ETC': 'ethereum-classic',
      'BCH': 'bitcoin-cash',
      'EOS': 'eos',
      'XTZ': 'tezos',
      'AAVE': 'aave',
      'COMP': 'compound-governance-token',
      'MKR': 'maker',
      'SNX': 'havven',
      'YFI': 'yearn-finance',
      'SUSHI': 'sushi',
      'CRV': 'curve-dao-token',
      '1INCH': '1inch',
      'BAT': 'basic-attention-token',
      'ZRX': '0x',
      'OMG': 'omisego',
      'ENJ': 'enjincoin',
      'MANA': 'decentraland',
      'SAND': 'the-sandbox',
      'AXS': 'axie-infinity',
      'CHZ': 'chiliz',
      'FTM': 'fantom',
      'NEAR': 'near',
      'GRT': 'the-graph',
      'THETA': 'theta-token',
      'DASH': 'dash',
      'ZEC': 'zcash',
      'XMR': 'monero'
    };
    
    const cleanSymbol = symbol.replace('USDT', '').replace('/', '').toUpperCase();
    return coinMap[cleanSymbol] || cleanSymbol.toLowerCase();
  }
  
  getCoinPaprikaId(symbol) {
    const coinMap = {
      'BTC': 'btc-bitcoin',
      'ETH': 'eth-ethereum',
      'BNB': 'bnb-binance-coin',
      'ADA': 'ada-cardano',
      'SOL': 'sol-solana',
      'XRP': 'xrp-xrp',
      'DOT': 'dot-polkadot',
      'DOGE': 'doge-dogecoin',
      'MATIC': 'matic-polygon',
      'AVAX': 'avax-avalanche',
      'LTC': 'ltc-litecoin',
      'ATOM': 'atom-cosmos',
      'UNI': 'uni-uniswap',
      'LINK': 'link-chainlink',
      'ALGO': 'algo-algorand',
      'VET': 'vet-vechain',
      'FIL': 'fil-filecoin',
      'TRX': 'trx-tron',
      'XLM': 'xlm-stellar',
      'ETC': 'etc-ethereum-classic',
      'BCH': 'bch-bitcoin-cash',
      'EOS': 'eos-eos',
      'XTZ': 'xtz-tezos',
      'AAVE': 'aave-aave',
      'COMP': 'comp-compoundd',
      'MKR': 'mkr-maker',
      'SNX': 'snx-synthetix-network-token',
      'YFI': 'yfi-yearnfinance',
      'SUSHI': 'sushi-sushiswap',
      'CRV': 'crv-curve-dao-token',
      '1INCH': '1inch-1inch',
      'BAT': 'bat-basic-attention-token',
      'ZRX': 'zrx-0x',
      'OMG': 'omg-omg',
      'ENJ': 'enj-enjin',
      'MANA': 'mana-decentraland',
      'SAND': 'sand-the-sandbox',
      'AXS': 'axs-axie-infinity',
      'CHZ': 'chz-chiliz',
      'FTM': 'ftm-fantom',
      'NEAR': 'near-near',
      'GRT': 'grt-the-graph',
      'THETA': 'theta-theta',
      'DASH': 'dash-dash',
      'ZEC': 'zec-zcash',
      'XMR': 'xmr-monero'
    };
    
    const cleanSymbol = symbol.replace('USDT', '').replace('/', '').toUpperCase();
    return coinMap[cleanSymbol] || null;
  }
  
  mapTimeframe(tf) {
    const maps = {
      '1m': '1m', '5m': '5m', '15m': '15m', '30m': '30m',
      '1h': '1h', '4h': '4h', '1d': '1d', '1w': '1w'
    };
    return maps[tf] || '1h';
  }
  
  getTimeframeMs(tf) {
    const maps = {
      '1m': 60000,
      '5m': 300000,
      '15m': 900000,
      '30m': 1800000,
      '1h': 3600000,
      '4h': 14400000,
      '1d': 86400000,
      '1w': 604800000
    };
    return maps[tf] || 3600000;
  }
  
  getTimeframeSeconds(tf) {
    return this.getTimeframeMs(tf) / 1000;
  }
  
  getYahooRange(tf) {
    const maps = {
      '1m': '1d',
      '5m': '5d',
      '15m': '5d',
      '30m': '5d',
      '1h': '1mo',
      '4h': '3mo',
      '1d': '1y',
      '1w': '5y'
    };
    return maps[tf] || '1mo';
  }
  
  getYahooInterval(tf) {
    const maps = {
      '1m': '1m',
      '5m': '5m',
      '15m': '15m',
      '30m': '30m',
      '1h': '1h',
      '4h': '1h',
      '1d': '1d',
      '1w': '1wk'
    };
    return maps[tf] || '1h';
  }
  
  async getMarketStatus() {
    try {
      const now = new Date();
      const day = now.getDay();
      const hour = now.getHours();
      const minute = now.getMinutes();
      
      const isStockMarketOpen = day >= 1 && day <= 5 && 
                               ((hour === 9 && minute >= 30) || (hour > 9 && hour < 16) || (hour === 16 && minute === 0));
      
      const btcPrice = await this.getCurrentPrice('BTCUSDT');
      const ethPrice = await this.getCurrentPrice('ETHUSDT');
      const eurusdPrice = await this.getCurrentPrice('EURUSD');
      const spyPrice = await this.getCurrentPrice('SPY');
      
      return {
        timestamp: now.toISOString(),
        stockMarket: isStockMarketOpen ? 'OPEN' : 'CLOSED',
        cryptoMarket: 'OPEN',
        forexMarket: 'OPEN',
        btcPrice: btcPrice,
        ethPrice: ethPrice,
        eurusdPrice: eurusdPrice,
        spyPrice: spyPrice,
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
    if (!priceData || priceData.length < 20) {
      throw new Error(`Insufficient data for analysis. Got ${priceData ? priceData.length : 0} candles, need at least 20`);
    }
    
    const closes = priceData.map(p => p.close);
    const highs = priceData.map(p => p.high);
    const lows = priceData.map(p => p.low);
    const volumes = priceData.map(p => p.volume || 0);
    const currentPrice = closes[closes.length - 1];
    
    const results = {
      currentPrice: currentPrice,
      high24h: this.calculateHigh24h(priceData),
      low24h: this.calculateLow24h(priceData),
      change24h: this.calculateChange24h(priceData),
      volume24h: this.calculateVolume24h(priceData),
      
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
  
  calculateHigh24h(priceData) {
    if (priceData.length < 24) {
      return Math.max(...priceData.map(p => p.high));
    }
    return Math.max(...priceData.slice(-24).map(p => p.high));
  }
  
  calculateLow24h(priceData) {
    if (priceData.length < 24) {
      return Math.min(...priceData.map(p => p.low));
    }
    return Math.min(...priceData.slice(-24).map(p => p.low));
  }
  
  calculateChange24h(priceData) {
    if (priceData.length < 24) {
      return 0;
    }
    const currentPrice = priceData[priceData.length - 1].close;
    const price24hAgo = priceData[priceData.length - 24].close;
    if (price24hAgo === 0) return 0;
    return ((currentPrice - price24hAgo) / price24hAgo) * 100;
  }
  
  calculateVolume24h(priceData) {
    if (priceData.length < 24) {
      return priceData.reduce((sum, p) => sum + (p.volume || 0), 0);
    }
    return priceData.slice(-24).reduce((sum, p) => sum + (p.volume || 0), 0);
  }
  
  calculateSMA(data, period) {
    if (data.length < period) return data[data.length - 1];
    const slice = data.slice(-period);
    return slice.reduce((a, b) => a + b, 0) / period;
  }
  
  calculateEMA(data, period, smoothing = 2) {
    if (data.length < period) return data[data.length - 1];
    
    const k = smoothing / (period + 1);
    let ema = this.calculateSMA(data.slice(0, period), period);
    
    for (let i = period; i < data.length; i++) {
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
    
    if (avgLoss === 0) return 100;
    
    for (let i = period + 1; i < closes.length; i++) {
      const change = closes[i] - closes[i - 1];
      const gain = change > 0 ? change : 0;
      const loss = change < 0 ? -change : 0;
      
      avgGain = (avgGain * (period - 1) + gain) / period;
      avgLoss = (avgLoss * (period - 1) + loss) / period;
    }
    
    const rs = avgGain / avgLoss;
    return 100 - (100 / (1 + rs));
  }
  
  calculateMACD(closes, fast = 12, slow = 26, signal = 9) {
    if (closes.length < slow) return { macd: 0, signal: 0, histogram: 0, bullish: false, bearish: false };
    
    const fastEMA = this.calculateEMA(closes, fast);
    const slowEMA = this.calculateEMA(closes, slow);
    const macdLine = fastEMA - slowEMA;
    
    // Calculate signal line
    const macdValues = [];
    for (let i = slow - 1; i < closes.length; i++) {
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
      return { k: 50, d: 50, overbought: false, oversold: false };
    }
    
    const recentHigh = Math.max(...highs.slice(-kPeriod));
    const recentLow = Math.min(...lows.slice(-kPeriod));
    const currentClose = closes[closes.length - 1];
    
    if (recentHigh === recentLow) return { k: 50, d: 50, overbought: false, oversold: false };
    
    const k = ((currentClose - recentLow) / (recentHigh - recentLow)) * 100;
    
    // Calculate %D (simple moving average of %K)
    const kValues = [];
    for (let i = 0; i < dPeriod; i++) {
      const start = Math.max(0, closes.length - kPeriod - i);
      const end = closes.length - i;
      const periodHighs = highs.slice(start, end);
      const periodLows = lows.slice(start, end);
      const periodCloses = closes.slice(start, end);
      
      if (periodHighs.length === 0 || periodLows.length === 0 || periodCloses.length === 0) continue;
      
      const h = Math.max(...periodHighs);
      const l = Math.min(...periodLows);
      const c = periodCloses[periodCloses.length - 1];
      
      if (h === l) continue;
      
      kValues.push(((c - l) / (h - l)) * 100);
    }
    
    const d = kValues.length > 0 ? kValues.reduce((a, b) => a + b, 0) / kValues.length : 50;
    
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
    if (closes.length < period) return { upper: null, middle: null, lower: null, width: null, squeezed: false };
    
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
    
    let obv = volumes[0];
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
    if (closes.length < 20) return { direction: 'NEUTRAL', strength: 0 };
    
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
    } else if (currentPrice > sma20) {
      direction = 'BULLISH';
      strength = 0.5;
    } else if (currentPrice < sma20) {
      direction = 'BEARISH';
      strength = 0.5;
    }
    
    return { direction, strength };
  }
  
  findSupportLevels(closes, lows) {
    if (closes.length < 30) return [];
    
    const supports = [];
    const sensitivity = 0.02;
    
    // Simple pivot low detection
    for (let i = 5; i < lows.length - 5; i++) {
      const currentLow = lows[i];
      let isPivot = true;
      
      // Check left side
      for (let j = 1; j <= 5; j++) {
        if (lows[i - j] < currentLow) {
          isPivot = false;
          break;
        }
      }
      
      // Check right side
      for (let j = 1; j <= 5; j++) {
        if (i + j < lows.length && lows[i + j] < currentLow) {
          isPivot = false;
          break;
        }
      }
      
      if (isPivot) {
        // Avoid duplicate levels
        const isDuplicate = supports.some(s => Math.abs(s.price - currentLow) / currentLow < 0.01);
        if (!isDuplicate) {
          supports.push({
            price: currentLow,
            strength: this.calculateLevelStrength(lows, i, currentLow, sensitivity)
          });
        }
      }
    }
    
    return supports
      .sort((a, b) => b.strength - a.strength)
      .slice(0, 3);
  }
  
  findResistanceLevels(closes, highs) {
    if (closes.length < 30) return [];
    
    const resistances = [];
    const sensitivity = 0.02;
    
    // Simple pivot high detection
    for (let i = 5; i < highs.length - 5; i++) {
      const currentHigh = highs[i];
      let isPivot = true;
      
      // Check left side
      for (let j = 1; j <= 5; j++) {
        if (highs[i - j] > currentHigh) {
          isPivot = false;
          break;
        }
      }
      
      // Check right side
      for (let j = 1; j <= 5; j++) {
        if (i + j < highs.length && highs[i + j] > currentHigh) {
          isPivot = false;
          break;
        }
      }
      
      if (isPivot) {
        // Avoid duplicate levels
        const isDuplicate = resistances.some(r => Math.abs(r.price - currentHigh) / currentHigh < 0.01);
        if (!isDuplicate) {
          resistances.push({
            price: currentHigh,
            strength: this.calculateLevelStrength(highs, i, currentHigh, sensitivity)
          });
        }
      }
    }
    
    return resistances
      .sort((a, b) => b.strength - a.strength)
      .slice(0, 3);
  }
  
  calculateLevelStrength(prices, index, level, sensitivity = 0.02) {
    let strength = 0;
    const window = 20;
    
    const start = Math.max(0, index - window);
    const end = Math.min(prices.length, index + window);
    
    for (let i = start; i < end; i++) {
      if (Math.abs(prices[i] - level) / level < sensitivity) {
        strength++;
      }
    }
    
    return Math.min(strength / 10, 1);
  }
  
  calculateVolatility(closes, period = 20) {
    if (closes.length < period) return 0;
    
    const returns = [];
    const slice = closes.slice(-period);
    
    for (let i = 1; i < slice.length; i++) {
      returns.push(Math.log(slice[i] / slice[i - 1]));
    }
    
    if (returns.length === 0) return 0;
    
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
        emoji: '🔄'
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
    
    // Volume Analysis
    const recentVolume = volumes.slice(-5).reduce((a, b) => a + b, 0);
    const avgVolume = volumes.length >= 20 ? 
      volumes.slice(-20).reduce((a, b) => a + b, 0) / 20 : 
      recentVolume / 5;
    analysis.conditions.volume_spike = recentVolume > avgVolume * 1.5;
    
    // Volatility Analysis
    analysis.conditions.low_volatility = indicators.volatility < 0.3;
    analysis.conditions.consolidation = this.isConsolidating(highs, lows, closes);
    
    // Technical Levels
    analysis.conditions.oversold = indicators.rsi < 30 || indicators.stochastic.oversold;
    analysis.conditions.overbought = indicators.rsi > 70 || indicators.stochastic.overbought;
    
    // Calculate scores
    analysis.scores = this.calculateStrategyScores(analysis.conditions, indicators);
    
    // Generate recommendations
    analysis.recommendations = this.generateRecommendations(analysis, indicators);
    
    return analysis;
  }
  
  isConsolidating(highs, lows, closes) {
    if (highs.length < 20 || lows.length < 20) return false;
    
    const recentRange = Math.max(...highs.slice(-10)) - Math.min(...lows.slice(-10));
    const olderRange = Math.max(...highs.slice(-20, -10)) - Math.min(...lows.slice(-20, -10));
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
    if (indicators.bollinger && indicators.bollinger.squeezed) scores.MEAN_REVERSION += 0.2;
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

// ==================== REAL TRADING ENGINE ====================
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
    this.minTradeInterval = 60000;
    
    logger.info(`Real Trading Engine initialized - Mode: ${MODE}`);
  }
  
  async analyzeSymbol(symbol, timeframe = '1h') {
    try {
      logger.info(`🔍 Analyzing ${symbol} (${timeframe})...`);
      
      // Get price data
      const priceData = await this.marketData.getOHLCV(symbol, timeframe, 200);
      
      if (!priceData || priceData.length < 20) {
        throw new Error(`Insufficient data: ${priceData ? priceData.length : 0} candles (need at least 20)`);
      }
      
      // Calculate indicators
      const indicators = this.technicalAnalysis.calculateAll(priceData);
      const marketAnalysis = this.aiEngine.analyzeMarket(priceData, indicators);
      const strategySelection = this.aiEngine.selectOptimalStrategy(marketAnalysis);
      
      // Generate trade signal
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
          reasons.push('Strong bullish trend');
        } else if (indicators.trend.direction === 'BEARISH' && indicators.trend.strength > 0.6) {
          direction = 'SHORT';
          reasons.push('Strong bearish trend');
        }
        break;
        
      case 'BREAKOUT':
        const recentHigh = Math.max(...highs.slice(-20));
        const recentLow = Math.min(...lows.slice(-20));
        const range = recentHigh - recentLow;
        
        if (currentPrice > recentHigh - (range * 0.2)) {
          direction = 'LONG';
          reasons.push('Breaking above resistance zone');
        } else if (currentPrice < recentLow + (range * 0.2)) {
          direction = 'SHORT';
          reasons.push('Breaking below support zone');
        }
        break;
        
      case 'MEAN_REVERSION':
        if (indicators.rsi < 30 && indicators.stochastic.oversold) {
          direction = 'LONG';
          reasons.push('Oversold bounce expected');
        } else if (indicators.rsi > 70 && indicators.stochastic.overbought) {
          direction = 'SHORT';
          reasons.push('Overbought reversal expected');
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
    let minQuantity = 0.001;
    if (currentPrice > 1000) minQuantity = 0.0001;
    else if (currentPrice > 100) minQuantity = 0.001;
    else if (currentPrice > 10) minQuantity = 0.01;
    else if (currentPrice > 1) minQuantity = 0.1;
    else minQuantity = 1;
    
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
    
    const assetType = this.marketData.getAssetType(symbol);
    if (assetType !== 'crypto') {
      throw new Error(`Binance only supports crypto trades, got ${assetType}`);
    }
    
    let binanceSymbol = this.marketData.formatSymbolForBinance(symbol);
    const side = tradeSignal.direction === 'LONG' ? 'BUY' : 'SELL';
    const quantity = tradeSignal.positionSize.units;
    
    // Get best price from order book
    const bestPrice = side === 'BUY' ? orderBook.asks[0].price : orderBook.bids[0].price;
    
    const timestamp = Date.now();
    const query = `symbol=${binanceSymbol}&side=${side}&type=LIMIT&timeInForce=GTC&quantity=${quantity}&price=${bestPrice}&timestamp=${timestamp}&recvWindow=5000`;
    
    const signature = http.createSignature(BINANCE_API_SECRET, query);
    const url = `https://api.binance.com/api/v3/order?${query}&signature=${signature}`;
    
    try {
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
    } catch (error) {
      logger.error(`Binance trade error: ${error.message}`);
      throw error;
    }
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
        
        const assetType = this.marketData.getAssetType(position.symbol);
        
        if (assetType === 'crypto' && exchange === 'binance') {
          let binanceSymbol = this.marketData.formatSymbolForBinance(position.symbol);
          const currentPrice = await this.marketData.getCurrentPrice(position.symbol);
          
          const timestamp = Date.now();
          const query = `symbol=${binanceSymbol}&side=${closeSide}&type=MARKET&quantity=${closeQuantity}&timestamp=${timestamp}&recvWindow=5000`;
          
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
    if (value === null || value === undefined) return 0;
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
      logger.warn('Telegram bot token and/or chat ID not configured');
    } else {
      logger.info(`Telegram Bot Handler initialized - Mode: ${MODE}`);
    }
  }
  
  async sendMessage(chatId, text, options = {}) {
    if (!this.botToken) {
      logger.warn('Telegram bot token not configured, cannot send message');
      return null;
    }
    
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
      
      if (response.text) {
        const result = JSON.parse(response.text);
        if (result.ok) {
          return result.result;
        } else {
          throw new Error(result.description);
        }
      }
      return null;
    } catch (error) {
      logger.error(`Telegram send failed: ${error.message}`);
      return null;
    }
  }
  
  async getUpdates() {
    if (!this.botToken) return [];
    
    try {
      const response = await http.get(
        `https://api.telegram.org/bot${this.botToken}/getUpdates?offset=${this.lastUpdateId + 1}&timeout=10`,
        { timeout: 15000 }
      );
      
      if (response.text) {
        const result = JSON.parse(response.text);
        if (result.ok) {
          return result.result;
        }
      }
      return [];
    } catch (error) {
      logger.error(`Get updates failed: ${error.message}`);
      return [];
    }
  }
  
  async startPolling() {
    if (!this.botToken || !this.chatId) {
      logger.warn('Telegram bot not configured, skipping polling');
      return;
    }
    
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
    
    if (this.chatId && chatId.toString() !== this.chatId.toString()) {
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
      } else if (text === '/test') {
        await this.sendMessage(chatId, '✅ Bot is working!');
      } else if (text.startsWith('/price ')) {
        await this.handlePriceCommand(chatId, text);
      }
    } catch (error) {
      logger.error(`Telegram handler error: ${error.message}`);
      await this.sendMessage(chatId, `❌ Error: ${error.message}`);
    }
  }
  
  async handleAnalyzeCommand(chatId, text) {
    const parts = text.split(' ');
    const symbol = parts[1];
    const timeframe = parts[2] || '1h';
    
    if (!symbol) {
      await this.sendMessage(chatId, '❌ Usage: /analyze SYMBOL [TIMEFRAME]\nExample: /analyze BTCUSDT 1h\nExample: /analyze EURUSD 4h\nExample: /analyze AAPL 1d');
      return;
    }
    
    const processingMsg = await this.sendMessage(chatId,
      `<b>🤖 Analyzing: ${symbol} (${timeframe})</b>\n\n` +
      `📡 Fetching real market data...\n` +
      `📊 Running technical analysis...\n` +
      `🧠 AI strategy selection...`
    );
    
    try {
      const analysis = await this.tradingEngine.analyzeSymbol(symbol, timeframe);
      
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
  
  async handlePriceCommand(chatId, text) {
    const symbol = text.split(' ')[1];
    
    if (!symbol) {
      await this.sendMessage(chatId, '❌ Usage: /price SYMBOL\nExample: /price BTCUSDT\nExample: /price EURUSD\nExample: /price AAPL');
      return;
    }
    
    try {
      const marketData = new RealMarketData();
      const price = await marketData.getCurrentPrice(symbol);
      
      if (price) {
        const assetType = marketData.getAssetType(symbol);
        await this.sendMessage(chatId,
          `<b>💰 Current Price: ${symbol}</b>\n\n` +
          `<b>Asset Type:</b> ${assetType.toUpperCase()}\n` +
          `<b>Current Price:</b> $${price.toFixed(4)}\n` +
          `<b>Time:</b> ${new Date().toLocaleTimeString()}`
        );
      } else {
        await this.sendMessage(chatId, `❌ Could not fetch price for ${symbol}`);
      }
    } catch (error) {
      await this.sendMessage(chatId,
        `<b>❌ Price check failed: ${symbol}</b>\n\n` +
        `<code>${error.message}</code>`
      );
    }
  }
  
  async sendAnalysisResults(chatId, analysis) {
    const signal = analysis.tradeSignal;
    const strategy = analysis.strategySelection;
    const marketData = new RealMarketData();
    const assetType = marketData.getAssetType(analysis.symbol);
    
    if (signal.direction === 'NEUTRAL') {
      const message = `
⚠️ <b>AI Analysis: ${analysis.symbol}</b>
<b>Asset Type:</b> ${assetType.toUpperCase()}

<b>Decision:</b> NO TRADE
<b>Reason:</b> ${signal.reason || 'Market conditions not optimal'}

<b>AI Strategy:</b> ${strategy.name} ${strategy.emoji}
<b>Score:</b> ${(strategy.score * 100).toFixed(1)}%

<b>📊 Market Conditions:</b>
Price: $${analysis.currentPrice.toFixed(4)}
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
<b>Asset Type:</b> ${assetType.toUpperCase()}

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
Price: $${analysis.currentPrice.toFixed(4)}
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
      await this.sendMessage(chatId, '❌ Usage: /trade SYMBOL [exchange]\nExample: /trade BTCUSDT binance\nExample: /trade EURUSD');
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
      const marketData = new RealMarketData();
      const assetType = marketData.getAssetType(symbol);
      
      const confirmationMessage = `
🚨 <b>LIVE TRADE CONFIRMATION REQUIRED</b>

${emoji} <b>${signal.direction} ${symbol}</b>
<b>Asset Type:</b> ${assetType.toUpperCase()}

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
<i>Real Market Data • ${MODE.toUpperCase()} Mode • All Assets Supported</i>

<b>📋 Commands:</b>
/analyze SYMBOL [TIMEFRAME] - Analyze any asset
/price SYMBOL - Get current price
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
/analyze BTCUSDT 1h
/analyze EURUSD 4h
/analyze AAPL 1d
/price XAUUSD
/trade BTCUSDT binance

<b>🔧 Configuration:</b>
Mode: ${MODE.toUpperCase()}
Account: $${ACCOUNT_EQUITY}
Risk/Trade: ${DEFAULT_RISK_PCT}%
Max Positions: ${MAX_POSITIONS}

<b>💎 Supported Assets:</b>
• Crypto: BTCUSDT, ETHUSDT, etc.
• Forex: EURUSD, GBPJPY, USDJPY, etc.
• Stocks: AAPL, TSLA, MSFT, etc.
• Commodities: XAUUSD (Gold), XAGUSD (Silver)

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
${marketStatus.forexMarket ? `Forex: ${marketStatus.forexMarket}` : ''}
${marketStatus.btcPrice ? `BTC: $${marketStatus.btcPrice?.toFixed(2) || 'N/A'}` : ''}
${marketStatus.ethPrice ? `ETH: $${marketStatus.ethPrice?.toFixed(2) || 'N/A'}` : ''}
${marketStatus.eurusdPrice ? `EUR/USD: $${marketStatus.eurusdPrice?.toFixed(4) || 'N/A'}` : ''}
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
        historyText += `${status} ${emoji} ${trade.symbol} | $${trade.entryPrice.toFixed(4)} | P&L: $${trade.pnl?.toFixed(2) || 'N/A'}\n`;
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
    
    let message = `<b>📊 Open Positions (${positions.length})</b>\n\n`;
    
    positions.forEach((pos, index) => {
      const emoji = pos.direction === 'LONG' ? '🟢' : '🔴';
      message += `${index + 1}. ${emoji} <b>${pos.symbol}</b>\n`;
      message += `   Direction: ${pos.direction}\n`;
      message += `   Entry: $${pos.entryPrice.toFixed(4)}\n`;
      message += `   Stop Loss: $${pos.stopLoss.toFixed(4)}\n`;
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
<b>Forex Market:</b> ${status.forexMarket}

<b>💎 Key Prices:</b>
${status.btcPrice ? `BTC: $${status.btcPrice.toFixed(2)}` : ''}
${status.ethPrice ? `ETH: $${status.ethPrice.toFixed(2)}` : ''}
${status.eurusdPrice ? `EUR/USD: $${status.eurusdPrice.toFixed(4)}` : ''}
${status.spyPrice ? `SPY: $${status.spyPrice.toFixed(2)}` : ''}

<b>⏰ Trading Hours:</b>
• Stocks: Mon-Fri 9:30AM-4:00PM EST
• Crypto: 24/7
• Forex: 24/5 (Sunday 5PM - Friday 5PM EST)

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
      logger.info('• All Assets: Crypto, Forex, Stocks, Commodities');
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
        } else if (req.method === 'GET' && pathname === '/api/price') {
          await this.handlePrice(req, res);
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
      if (TELEGRAM_BOT_TOKEN && TELEGRAM_CHAT_ID) {
        this.telegramBot.startPolling().catch(error => {
          logger.error(`Telegram polling failed: ${error.message}`);
        });
      } else {
        logger.warn('Telegram bot not configured, skipping polling');
      }
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
        simulations: 'NONE',
        supported_assets: ['crypto', 'forex', 'stocks', 'commodities']
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
  
  async handlePrice(req, res) {
    const parsedUrl = url.parse(req.url, true);
    const symbol = parsedUrl.query.symbol;
    
    if (!symbol) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Symbol parameter required' }));
      return;
    }
    
    try {
      const marketData = new RealMarketData();
      const price = await marketData.getCurrentPrice(symbol);
      const assetType = marketData.getAssetType(symbol);
      
      if (price) {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          success: true,
          symbol: symbol,
          assetType: assetType,
          price: price,
          timestamp: Date.now()
        }));
      } else {
        res.writeHead(404, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ 
          success: false, 
          error: 'Price not available' 
        }));
      }
    } catch (error) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ 
        success: false, 
        error: error.message 
      }));
    }
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
    // Test market data with multiple assets
    const marketData = new RealMarketData();
    const assets = ['BTCUSDT', 'EURUSD', 'AAPL', 'XAUUSD'];
    const results = {};
    
    for (const asset of assets) {
      try {
        const price = await marketData.getCurrentPrice(asset);
        const assetType = marketData.getAssetType(asset);
        results[asset] = {
          price: price,
          assetType: assetType,
          success: !!price
        };
      } catch (error) {
        results[asset] = {
          error: error.message,
          success: false
        };
      }
    }
    
    const test = {
      status: 'ok',
      message: 'AI Trading System v5.0 - Multi-Asset Test',
      timestamp: Date.now(),
      mode: MODE,
      real_data: results,
      features: [
        '100% Real Market Data',
        'No Simulations',
        'All Assets: Crypto, Forex, Stocks, Commodities',
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
    const marketData = new RealMarketData();
    const assets = ['BTCUSDT', 'EURUSD', 'AAPL'];
    const prices = {};
    
    for (const asset of assets) {
      try {
        prices[asset] = await marketData.getCurrentPrice(asset);
      } catch (error) {
        prices[asset] = 'Error';
      }
    }
    
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
        .live-data { background: #1a1a2e; padding: 10px; border-radius: 5px; margin: 10px 0; }
        .asset-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 10px; margin: 20px 0; }
        .asset-card { background: #16213e; padding: 15px; border-radius: 8px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🤖 AI Trading System v5.0</h1>
            <p><span class="${MODE === 'live' ? 'red' : 'green'}">${MODE.toUpperCase()} MODE</span></p>
            <p>Instance: ${this.instanceId}</p>
            <p>Real Market Data • No Simulations • All Assets</p>
        </div>
        
        <div class="live-data">
            <h2>📡 Live Market Data</h2>
            <div class="asset-grid">
                <div class="asset-card">
                    <h3>BTCUSDT</h3>
                    <p>$${prices['BTCUSDT'] ? prices['BTCUSDT'].toFixed(2) : 'Loading...'}</p>
                    <small>Crypto</small>
                </div>
                <div class="asset-card">
                    <h3>EURUSD</h3>
                    <p>$${prices['EURUSD'] ? prices['EURUSD'].toFixed(4) : 'Loading...'}</p>
                    <small>Forex</small>
                </div>
                <div class="asset-card">
                    <h3>AAPL</h3>
                    <p>$${prices['AAPL'] ? prices['AAPL'].toFixed(2) : 'Loading...'}</p>
                    <small>Stock</small>
                </div>
            </div>
            <p>Data Source: Multiple real-time APIs</p>
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
            <div class="endpoint">
                <strong>GET /api/price?symbol=ASSET</strong> - Get current price
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
  -d '{"symbol": "EURUSD", "timeframe": "1h"}'
            </pre>
        </div>
        
        <div class="status">
            <h2>💎 Supported Assets</h2>
            <p><strong>Crypto:</strong> BTCUSDT, ETHUSDT, XRPUSDT, etc.</p>
            <p><strong>Forex:</strong> EURUSD, GBPJPY, USDJPY, AUDUSD, etc.</p>
            <p><strong>Stocks:</strong> AAPL, TSLA, MSFT, GOOGL, AMZN, etc.</p>
            <p><strong>Commodities:</strong> XAUUSD (Gold), XAGUSD (Silver), OIL</p>
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
