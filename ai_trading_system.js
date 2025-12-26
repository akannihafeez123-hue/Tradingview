#!/usr/bin/env node
'use strict';

// ==================== CONFIGURATION ====================
const {
  PORT = 3000,
  MODE = 'paper',
  TELEGRAM_BOT_TOKEN,
  TELEGRAM_CHAT_ID,
  TV_WEBHOOK_SECRET,
  POSTGRES_URL,
  ACCOUNT_EQUITY = 100000,
  DEFAULT_RISK_PCT = 2.0,
  DAILY_DRAWDOWN_LIMIT = 0.05,
  
  // BITGET
  CCXT_BITGET_API_KEY,
  CCXT_BITGET_SECRET,
  CCXT_BITGET_PASSWORD,
  BITGET_DEMO_MODE = 'true',
  
  // OANDA
  OANDA_API_KEY,
  OANDA_ACCOUNT_ID,
  OANDA_ENVIRONMENT = 'practice',
  
  // ALPACA
  ALPACA_API_KEY,
  ALPACA_SECRET_KEY,
  ALPACA_BASE_URL = 'https://paper-api.alpaca.markets/v2',
  
  // AI SETTINGS
  ENABLE_AI_STRATEGY_SELECTION = 'true',
  MIN_CONFIDENCE_THRESHOLD = 0.65,
  LOG_LEVEL = 'info'
} = process.env;

if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_CHAT_ID) {
  console.error('❌ Missing TELEGRAM_BOT_TOKEN or TELEGRAM_CHAT_ID in environment');
  process.exit(1);
}

// ==================== LIGHTWEIGHT IMPLEMENTATIONS ====================

// Simple logger without winston dependency
class Logger {
  constructor(level = 'info') {
    this.levels = { error: 0, warn: 1, info: 2, debug: 3 };
    this.currentLevel = this.levels[level] || 1;
  }

  log(level, message) {
    if (this.levels[level] <= this.currentLevel) {
      const timestamp = new Date().toISOString().replace('T', ' ').substring(0, 19);
      const formatted = `${timestamp} ${level.toUpperCase()}: ${message}`;
      console.log(formatted);
      
      // Also write to file if in production
      if (process.env.NODE_ENV === 'production') {
        const fs = require('fs').promises;
        fs.appendFile('ai_trading.log', formatted + '\n').catch(() => {});
      }
    }
  }

  info(message) { this.log('info', message); }
  error(message) { this.log('error', message); }
  warn(message) { this.log('warn', message); }
  debug(message) { this.log('debug', message); }
}

const logger = new Logger(LOG_LEVEL);

// Lightweight HTTP client without axios
async function httpRequest(url, options = {}) {
  const http = require('http');
  const https = require('https');
  
  return new Promise((resolve, reject) => {
    const client = url.startsWith('https') ? https : http;
    const req = client.request(url, {
      method: options.method || 'GET',
      headers: options.headers || {},
      timeout: 10000
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          if (res.statusCode >= 400) {
            reject(new Error(`HTTP ${res.statusCode}: ${data}`));
          } else {
            resolve({
              status: res.statusCode,
              data: options.json ? JSON.parse(data) : data,
              headers: res.headers
            });
          }
        } catch (err) {
          reject(err);
        }
      });
    });

    req.on('error', reject);
    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });

    if (options.body) {
      req.write(typeof options.body === 'string' ? options.body : JSON.stringify(options.body));
    }
    req.end();
  });
}

// Lightweight database without pg or better-sqlite3
class MemoryStore {
  constructor() {
    this.store = new Map();
    this.analysisHistory = [];
  }

  set(key, value) {
    this.store.set(key, JSON.stringify(value));
    return true;
  }

  get(key) {
    const val = this.store.get(key);
    return val ? JSON.parse(val) : null;
  }

  addAnalysis(analysis) {
    this.analysisHistory.push({
      ...analysis,
      timestamp: Date.now()
    });
    
    // Keep only last 1000 analyses
    if (this.analysisHistory.length > 1000) {
      this.analysisHistory = this.analysisHistory.slice(-1000);
    }
  }

  getRecentAnalyses(limit = 50) {
    return this.analysisHistory.slice(-limit);
  }
}

// ==================== MARKET DATA FETCHER ====================
class MarketDataFetcher {
  constructor() {
    this.cache = new Map();
    this.cacheDuration = 60000; // 1 minute
  }

  async fetchOHLCV(symbol, timeframe = '1h', limit = 200) {
    const cacheKey = `${symbol}-${timeframe}-${limit}`;
    const cached = this.cache.get(cacheKey);
    
    if (cached && Date.now() - cached.timestamp < this.cacheDuration) {
      return cached.data;
    }

    try {
      // Try to fetch from Bitget if API keys are available
      if (CCXT_BITGET_API_KEY && CCXT_BITGET_SECRET) {
        const data = await this.fetchFromBitget(symbol, timeframe, limit);
        if (data.length > 0) {
          this.cache.set(cacheKey, { timestamp: Date.now(), data });
          return data;
        }
      }

      // Try Alpaca for US stocks
      if (ALPACA_API_KEY && symbol.match(/^[A-Z]{1,5}$/)) {
        const data = await this.fetchFromAlpaca(symbol, timeframe, limit);
        if (data.length > 0) {
          this.cache.set(cacheKey, { timestamp: Date.now(), data });
          return data;
        }
      }

      // Try OANDA for forex
      if (OANDA_API_KEY && symbol.match(/^[A-Z]{6}$/)) {
        const data = await this.fetchFromOanda(symbol, timeframe, limit);
        if (data.length > 0) {
          this.cache.set(cacheKey, { timestamp: Date.now(), data });
          return data;
        }
      }

      // Fallback to public APIs
      const data = await this.fetchFromPublicAPI(symbol, timeframe, limit);
      this.cache.set(cacheKey, { timestamp: Date.now(), data });
      return data;

    } catch (error) {
      logger.error(`Failed to fetch data for ${symbol}: ${error.message}`);
      
      // Return simulated data as last resort
      return this.generateSimulatedData(limit, symbol);
    }
  }

  async fetchFromBitget(symbol, timeframe, limit) {
    try {
      const url = BITGET_DEMO_MODE === 'true' 
        ? 'https://api.bitget.com/api/mix/v1/market/candles'
        : 'https://api.bitget.com/api/v2/spot/market/candles';
      
      const bitgetSymbol = symbol.replace('/', '').replace('USDT', 'USDT');
      const params = new URLSearchParams({
        symbol: bitgetSymbol,
        granularity: this.mapTimeframe(timeframe),
        limit: limit.toString()
      });

      const response = await httpRequest(`${url}?${params}`);
      
      if (response.data && response.data.data) {
        return response.data.data.map(candle => ({
          timestamp: parseInt(candle[0]),
          open: parseFloat(candle[1]),
          high: parseFloat(candle[2]),
          low: parseFloat(candle[3]),
          close: parseFloat(candle[4]),
          volume: parseFloat(candle[5])
        })).reverse();
      }
    } catch (error) {
      logger.warn(`Bitget fetch failed: ${error.message}`);
    }
    return [];
  }

  async fetchFromAlpaca(symbol, timeframe, limit) {
    try {
      const url = `${ALPACA_BASE_URL}/stocks/${symbol}/bars`;
      const params = new URLSearchParams({
        timeframe: this.mapTimeframe(timeframe),
        limit: limit.toString()
      });

      const response = await httpRequest(`${url}?${params}`, {
        headers: {
          'APCA-API-KEY-ID': ALPACA_API_KEY,
          'APCA-API-SECRET-KEY': ALPACA_SECRET_KEY
        }
      });

      if (response.data && response.data.bars) {
        return response.data.bars.map(bar => ({
          timestamp: new Date(bar.t).getTime(),
          open: bar.o,
          high: bar.h,
          low: bar.l,
          close: bar.c,
          volume: bar.v
        }));
      }
    } catch (error) {
      logger.warn(`Alpaca fetch failed: ${error.message}`);
    }
    return [];
  }

  async fetchFromOanda(symbol, timeframe, limit) {
    try {
      const url = `https://api-fxpractice.oanda.com/v3/instruments/${symbol}/candles`;
      const params = new URLSearchParams({
        granularity: this.mapTimeframe(timeframe).toUpperCase(),
        count: limit.toString(),
        price: 'M'
      });

      const response = await httpRequest(`${url}?${params}`, {
        headers: {
          'Authorization': `Bearer ${OANDA_API_KEY}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.data && response.data.candles) {
        return response.data.candles.filter(c => c.complete).map(candle => ({
          timestamp: new Date(candle.time).getTime(),
          open: parseFloat(candle.mid.o),
          high: parseFloat(candle.mid.h),
          low: parseFloat(candle.mid.l),
          close: parseFloat(candle.mid.c),
          volume: candle.volume || 0
        }));
      }
    } catch (error) {
      logger.warn(`OANDA fetch failed: ${error.message}`);
    }
    return [];
  }

  async fetchFromPublicAPI(symbol, timeframe, limit) {
    try {
      // Try Binance public API for crypto
      if (symbol.includes('USDT') || symbol.includes('BTC') || symbol.includes('ETH')) {
        const binanceSymbol = symbol.replace('/', '').replace('USDT', 'USDT');
        const interval = this.mapTimeframe(timeframe);
        const url = `https://api.binance.com/api/v3/klines?symbol=${binanceSymbol}&interval=${interval}&limit=${limit}`;
        
        const response = await httpRequest(url);
        
        if (response.data && Array.isArray(response.data)) {
          return response.data.map(candle => ({
            timestamp: candle[0],
            open: parseFloat(candle[1]),
            high: parseFloat(candle[2]),
            low: parseFloat(candle[3]),
            close: parseFloat(candle[4]),
            volume: parseFloat(candle[5])
          }));
        }
      }

      // Try Alpha Vantage for stocks (limited free tier)
      if (process.env.ALPHA_VANTAGE_KEY && symbol.match(/^[A-Z]{1,5}$/)) {
        const url = `https://www.alphavantage.co/query?function=TIME_SERIES_INTRADAY&symbol=${symbol}&interval=${this.mapTimeframe(timeframe)}&apikey=${process.env.ALPHA_VANTAGE_KEY}&outputsize=compact`;
        
        const response = await httpRequest(url);
        
        if (response.data && response.data['Time Series (1min)']) {
          const data = Object.entries(response.data['Time Series (1min)'])
            .slice(0, limit)
            .map(([time, values]) => ({
              timestamp: new Date(time).getTime(),
              open: parseFloat(values['1. open']),
              high: parseFloat(values['2. high']),
              low: parseFloat(values['3. low']),
              close: parseFloat(values['4. close']),
              volume: parseFloat(values['5. volume'])
            }));
          return data.reverse();
        }
      }
    } catch (error) {
      logger.warn(`Public API fetch failed: ${error.message}`);
    }
    
    // Fallback to simulated data
    return this.generateSimulatedData(limit, symbol);
  }

  mapTimeframe(tf) {
    const map = {
      '1m': '1min',
      '5m': '5min',
      '15m': '15min',
      '30m': '30min',
      '1h': '1hour',
      '4h': '4hour',
      '1d': '1day',
      '1w': '1week'
    };
    return map[tf] || tf;
  }

  generateSimulatedData(limit, symbol) {
    const data = [];
    let price = 100;
    const basePrice = symbol.includes('BTC') ? 40000 : 
                     symbol.includes('ETH') ? 2000 : 
                     symbol.includes('USDT') ? 1 : 100;

    price = basePrice;
    
    for (let i = 0; i < limit; i++) {
      // More realistic price movement
      const volatility = 0.02; // 2% daily volatility
      const change = price * volatility * (Math.random() - 0.5) * 0.1;
      price += change;
      
      // Prevent extreme values
      price = Math.max(price * 0.5, Math.min(price * 1.5, price));
      
      const spread = price * 0.001; // 0.1% spread
      const high = price + spread + Math.random() * price * 0.01;
      const low = price - spread - Math.random() * price * 0.01;
      const open = price - change * 0.3;
      const volume = Math.random() * 1000 + 100;
      
      data.push({
        timestamp: Date.now() - (limit - i) * 3600000,
        open: parseFloat(open.toFixed(4)),
        high: parseFloat(high.toFixed(4)),
        low: parseFloat(low.toFixed(4)),
        close: parseFloat(price.toFixed(4)),
        volume: parseFloat(volume.toFixed(2))
      });
    }
    
    logger.warn(`Using simulated data for ${symbol} (limit: ${limit})`);
    return data;
  }
}

// ==================== AI STRATEGY SELECTOR ====================
class AIStrategySelector {
  constructor() {
    this.strategies = {
      QUANTUM: {
        name: 'Quantum Engine V2.0',
        description: 'Institutional-grade analysis with order blocks, structure breaks, and quantum indicators',
        conditions: ['trending_market', 'clear_structure', 'institutional_flow'],
        weight: 0.35
      },
      MOMENTUM: {
        name: 'Momentum Scalper V1.0',
        description: 'Captures strong momentum moves with volume confirmation',
        conditions: ['high_volatility', 'strong_momentum', 'volume_spike'],
        weight: 0.25
      },
      BREAKOUT: {
        name: 'Breakout Hunter V1.0',
        description: 'Identifies and trades breakouts from consolidation patterns',
        conditions: ['consolidation', 'low_volatility', 'accumulation'],
        weight: 0.20
      },
      MEAN_REVERSION: {
        name: 'Mean Reversion V1.0',
        description: 'Trades reversions from overextended price levels',
        conditions: ['overbought', 'oversold', 'extreme_levels'],
        weight: 0.20
      }
    };
    
    this.strategyWeights = {
      trending_market: { QUANTUM: 0.8, MOMENTUM: 0.6, BREAKOUT: 0.3, MEAN_REVERSION: 0.1 },
      clear_structure: { QUANTUM: 0.9, MOMENTUM: 0.5, BREAKOUT: 0.7, MEAN_REVERSION: 0.3 },
      institutional_flow: { QUANTUM: 0.85, MOMENTUM: 0.4, BREAKOUT: 0.6, MEAN_REVERSION: 0.2 },
      high_volatility: { QUANTUM: 0.4, MOMENTUM: 0.9, BREAKOUT: 0.5, MEAN_REVERSION: 0.2 },
      strong_momentum: { QUANTUM: 0.5, MOMENTUM: 0.95, BREAKOUT: 0.4, MEAN_REVERSION: 0.1 },
      volume_spike: { QUANTUM: 0.6, MOMENTUM: 0.85, BREAKOUT: 0.7, MEAN_REVERSION: 0.3 },
      consolidation: { QUANTUM: 0.3, MOMENTUM: 0.2, BREAKOUT: 0.9, MEAN_REVERSION: 0.5 },
      low_volatility: { QUANTUM: 0.2, MOMENTUM: 0.1, BREAKOUT: 0.8, MEAN_REVERSION: 0.6 },
      accumulation: { QUANTUM: 0.4, MOMENTUM: 0.3, BREAKOUT: 0.85, MEAN_REVERSION: 0.4 },
      overbought: { QUANTUM: 0.2, MOMENTUM: 0.1, BREAKOUT: 0.3, MEAN_REVERSION: 0.9 },
      oversold: { QUANTUM: 0.2, MOMENTUM: 0.1, BREAKOUT: 0.3, MEAN_REVERSION: 0.9 },
      extreme_levels: { QUANTUM: 0.3, MOMENTUM: 0.2, BREAKOUT: 0.4, MEAN_REVERSION: 0.85 }
    };
    
    logger.info('AI Strategy Selector Initialized');
  }
  
  analyzeMarketConditions(priceData, volumeData, indicators) {
    const conditions = {};
    const closes = priceData.map(p => p.close);
    const highs = priceData.map(p => p.high);
    const lows = priceData.map(p => p.low);
    const volumes = volumeData;
    
    // Technical calculations
    conditions.trending_market = this.isTrending(closes);
    conditions.clear_structure = this.hasClearStructure(highs, lows);
    conditions.institutional_flow = this.detectInstitutionalFlow(volumes, closes);
    conditions.high_volatility = this.isHighlyVolatile(closes);
    conditions.low_volatility = !conditions.high_volatility && this.isLowVolatility(closes);
    conditions.strong_momentum = this.hasStrongMomentum(closes);
    conditions.volume_spike = this.hasVolumeSpike(volumes);
    conditions.consolidation = this.isConsolidating(highs, lows);
    conditions.accumulation = this.detectAccumulation(closes, volumes);
    
    if (indicators && indicators.rsi) {
      conditions.overbought = indicators.rsi > 70;
      conditions.oversold = indicators.rsi < 30;
    }
    
    conditions.extreme_levels = this.isAtExtremeLevels(closes);
    
    // Store calculated values for reporting
    conditions.trend_strength = this.calculateTrendStrength(closes);
    conditions.volatility_level = this.calculateVolatility(closes);
    conditions.momentum_strength = Math.abs(this.calculateMomentum(closes));
    conditions.momentum_direction = this.calculateMomentum(closes) > 0 ? 'BULLISH' : 'BEARISH';
    
    return conditions;
  }
  
  selectOptimalStrategy(marketConditions) {
    if (!ENABLE_AI_STRATEGY_SELECTION || ENABLE_AI_STRATEGY_SELECTION === 'false') {
      return { strategy: 'QUANTUM', confidence: 0.8, reason: 'AI selection disabled' };
    }
    
    const strategyScores = {};
    const activeConditions = Object.keys(marketConditions).filter(
      key => typeof marketConditions[key] === 'boolean' && marketConditions[key] === true
    );
    
    // Calculate scores for each strategy
    Object.keys(this.strategies).forEach(strategy => {
      let score = this.strategies[strategy].weight;
      let matchedConditions = 0;
      
      activeConditions.forEach(condition => {
        if (this.strategyWeights[condition] && this.strategyWeights[condition][strategy]) {
          score += this.strategyWeights[condition][strategy];
          matchedConditions++;
        }
      });
      
      // Normalize score
      if (matchedConditions > 0) {
        score /= (1 + matchedConditions);
      }
      
      strategyScores[strategy] = {
        score: Math.min(1, Math.max(0, score)),
        conditions: activeConditions.filter(cond => 
          this.strategyWeights[cond] && this.strategyWeights[cond][strategy] > 0.5
        )
      };
    });
    
    // Find best strategy
    let bestStrategy = 'QUANTUM';
    let bestScore = -1;
    
    Object.entries(strategyScores).forEach(([strategy, data]) => {
      if (data.score > bestScore) {
        bestScore = data.score;
        bestStrategy = strategy;
      }
    });
    
    // Calculate confidence
    const confidence = Math.min(0.95, bestScore);
    const confidenceLevel = confidence > 0.8 ? 'HIGH' : confidence > 0.6 ? 'MEDIUM' : 'LOW';
    
    // Generate reason
    const reason = this.generateStrategyReason(bestStrategy, strategyScores[bestStrategy].conditions, marketConditions);
    
    return {
      strategy: bestStrategy,
      confidence: confidence,
      confidenceLevel: confidenceLevel,
      score: bestScore,
      conditions: strategyScores[bestStrategy].conditions,
      allScores: strategyScores,
      reason: reason
    };
  }
  
  // Technical analysis methods
  isTrending(closes) {
    if (closes.length < 20) return false;
    const sma20 = this.sma(closes, 20);
    const sma50 = this.sma(closes, 50);
    const current = closes[closes.length - 1];
    
    const above20 = current > sma20 * 1.02;
    const above50 = current > sma50 * 1.02;
    const below20 = current < sma20 * 0.98;
    const below50 = current < sma50 * 0.98;
    
    return (above20 && above50) || (below20 && below50);
  }
  
  hasClearStructure(highs, lows) {
    if (highs.length < 10 || lows.length < 10) return false;
    
    const recentHighs = highs.slice(-5);
    const recentLows = lows.slice(-5);
    const olderHighs = highs.slice(-10, -5);
    const olderLows = lows.slice(-10, -5);
    
    const higherHighs = Math.min(...recentHighs) > Math.max(...olderHighs);
    const higherLows = Math.min(...recentLows) > Math.max(...olderLows);
    const lowerHighs = Math.max(...recentHighs) < Math.min(...olderHighs);
    const lowerLows = Math.max(...recentLows) < Math.min(...olderLows);
    
    return (higherHighs && higherLows) || (lowerHighs && lowerLows);
  }
  
  detectInstitutionalFlow(volumes, closes) {
    if (volumes.length < 20 || closes.length < 20) return false;
    
    const recentVolume = volumes.slice(-10).reduce((a, b) => a + b, 0);
    const olderVolume = volumes.slice(-20, -10).reduce((a, b) => a + b, 0);
    const priceChange = (closes[closes.length - 1] - closes[closes.length - 10]) / closes[closes.length - 10];
    
    return priceChange > 0.02 && recentVolume > olderVolume * 1.2;
  }
  
  isHighlyVolatile(closes) {
    return this.calculateVolatility(closes) > 0.02;
  }
  
  isLowVolatility(closes) {
    return this.calculateVolatility(closes) < 0.005;
  }
  
  hasStrongMomentum(closes) {
    const momentum = this.calculateMomentum(closes);
    return Math.abs(momentum) > 0.015;
  }
  
  hasVolumeSpike(volumes) {
    if (volumes.length < 10) return false;
    const recentAvg = volumes.slice(-5).reduce((a, b) => a + b, 0) / 5;
    const olderAvg = volumes.slice(-10, -5).reduce((a, b) => a + b, 0) / 5;
    return recentAvg > olderAvg * 1.5;
  }
  
  isConsolidating(highs, lows) {
    if (highs.length < 20 || lows.length < 20) return false;
    
    const recentRange = Math.max(...highs.slice(-10)) - Math.min(...lows.slice(-10));
    const olderRange = Math.max(...highs.slice(-20, -10)) - Math.min(...lows.slice(-20, -10));
    
    return recentRange < olderRange * 0.7;
  }
  
  detectAccumulation(closes, volumes) {
    if (closes.length < 30 || volumes.length < 30) return false;
    
    const priceChange = Math.abs((closes[closes.length - 1] - closes[closes.length - 30]) / closes[closes.length - 30]);
    const recentVolume = volumes.slice(-10).reduce((a, b) => a + b, 0);
    const olderVolume = volumes.slice(-20, -10).reduce((a, b) => a + b, 0);
    
    return priceChange < 0.05 && recentVolume > olderVolume * 1.2;
  }
  
  isAtExtremeLevels(closes) {
    if (closes.length < 50) return false;
    
    const current = closes[closes.length - 1];
    const sma50 = this.sma(closes, 50);
    const distance = Math.abs(current - sma50) / sma50;
    
    return distance > 0.15;
  }
  
  calculateTrendStrength(closes) {
    if (closes.length < 20) return 0.5;
    
    const sma20 = this.sma(closes, 20);
    const sma50 = this.sma(closes, 50);
    const current = closes[closes.length - 1];
    
    const distance20 = Math.abs(current - sma20) / sma20;
    const distance50 = Math.abs(current - sma50) / sma50;
    
    return Math.max(distance20, distance50);
  }
  
  calculateVolatility(closes) {
    if (closes.length < 10) return 0.01;
    
    let sum = 0;
    for (let i = 1; i < closes.length; i++) {
      sum += Math.abs(closes[i] - closes[i-1]) / closes[i-1];
    }
    return sum / (closes.length - 1);
  }
  
  calculateMomentum(closes) {
    if (closes.length < 10) return 0;
    
    const recent = closes.slice(-5).reduce((a, b) => a + b, 0) / 5;
    const older = closes.slice(-10, -5).reduce((a, b) => a + b, 0) / 5;
    
    return (recent - older) / older;
  }
  
  sma(data, period) {
    if (data.length < period) return data[data.length - 1];
    const slice = data.slice(-period);
    return slice.reduce((a, b) => a + b, 0) / period;
  }
  
  generateStrategyReason(strategy, conditions, marketConditions) {
    const strategyNames = {
      QUANTUM: 'Quantum Engine V2.0',
      MOMENTUM: 'Momentum Scalper',
      BREAKOUT: 'Breakout Hunter',
      MEAN_REVERSION: 'Mean Reversion'
    };
    
    const conditionDescriptions = {
      trending_market: 'Strong trending market detected',
      clear_structure: 'Clear market structure present',
      institutional_flow: 'Institutional money flow detected',
      high_volatility: 'High volatility environment',
      strong_momentum: 'Strong momentum present',
      volume_spike: 'Volume spike detected',
      consolidation: 'Market in consolidation',
      low_volatility: 'Low volatility conditions',
      accumulation: 'Accumulation pattern detected',
      overbought: 'Market overbought',
      oversold: 'Market oversold',
      extreme_levels: 'Price at extreme levels'
    };
    
    let reason = `AI selected ${strategyNames[strategy]} because: `;
    
    if (conditions.length > 0) {
      reason += conditions.map(cond => conditionDescriptions[cond] || cond).join(', ');
    } else {
      reason += 'Market conditions are neutral, using default institutional strategy';
    }
    
    // Add specific metrics
    if (marketConditions.trend_strength !== undefined) {
      reason += ` | Trend Strength: ${(marketConditions.trend_strength * 100).toFixed(1)}%`;
    }
    if (marketConditions.volatility_level !== undefined) {
      reason += ` | Volatility: ${(marketConditions.volatility_level * 100).toFixed(2)}%`;
    }
    
    return reason;
  }
}

// ==================== TRADING ENGINE ====================
class TradingEngine {
  constructor() {
    this.aiSelector = new AIStrategySelector();
    this.dataFetcher = new MarketDataFetcher();
    this.store = new MemoryStore();
  }
  
  async analyzeAsset(symbol) {
    try {
      logger.info(`🔄 AI analyzing ${symbol}...`);
      
      // Fetch market data
      const priceData = await this.dataFetcher.fetchOHLCV(symbol, '1h', 200);
      const volumeData = priceData.map(p => p.volume);
      
      if (priceData.length < 50) {
        throw new Error(`Insufficient data: ${priceData.length} candles`);
      }
      
      // Calculate indicators
      const closes = priceData.map(p => p.close);
      const highs = priceData.map(p => p.high);
      const lows = priceData.map(p => p.low);
      
      const indicators = {
        rsi: this.calculateRSI(closes),
        sma20: this.sma(closes, 20),
        sma50: this.sma(closes, 50),
        atr: this.calculateATR(highs, lows, closes),
        currentPrice: closes[closes.length - 1]
      };
      
      // AI analysis
      const marketConditions = this.aiSelector.analyzeMarketConditions(
        priceData, 
        volumeData, 
        indicators
      );
      
      const strategySelection = this.aiSelector.selectOptimalStrategy(marketConditions);
      
      // Check confidence threshold
      if (strategySelection.confidence < MIN_CONFIDENCE_THRESHOLD) {
        return this.generateNoTradeAnalysis(symbol, strategySelection);
      }
      
      // Generate trade signal based on selected strategy
      const tradeSignal = this.generateTradeSignal(
        strategySelection.strategy,
        priceData,
        volumeData,
        indicators,
        marketConditions
      );
      
      // Risk assessment
      const riskAssessment = this.assessRisk(
        tradeSignal,
        indicators,
        strategySelection.confidence
      );
      
      // Final analysis
      const finalAnalysis = {
        symbol,
        timestamp: Date.now(),
        aiStrategy: strategySelection.strategy,
        strategyName: this.aiSelector.strategies[strategySelection.strategy].name,
        confidence: strategySelection.confidence,
        confidenceLevel: strategySelection.confidenceLevel,
        marketConditions,
        strategySelection,
        tradeSignal,
        riskAssessment,
        indicators: {
          rsi: indicators.rsi,
          sma20: indicators.sma20,
          sma50: indicators.sma50,
          currentPrice: indicators.currentPrice,
          atr: indicators.atr
        }
      };
      
      // Store analysis
      this.store.addAnalysis(finalAnalysis);
      
      logger.info(`✅ AI analysis complete for ${symbol}: ${strategySelection.strategy} (${(strategySelection.confidence * 100).toFixed(1)}% confidence)`);
      
      return finalAnalysis;
      
    } catch (error) {
      logger.error(`AI analysis failed for ${symbol}: ${error.message}`);
      throw error;
    }
  }
  
  generateTradeSignal(strategy, priceData, volumeData, indicators, marketConditions) {
    const closes = priceData.map(p => p.close);
    const highs = priceData.map(p => p.high);
    const lows = priceData.map(p => p.low);
    const currentPrice = indicators.currentPrice;
    const atr = indicators.atr;
    
    let direction = 'NEUTRAL';
    let confidence = 0.5;
    let reasons = [];
    
    switch(strategy) {
      case 'QUANTUM':
        // Institutional analysis
        const trend = this.analyzeTrend(closes);
        const structure = this.analyzeMarketStructure(highs, lows);
        
        if (trend.direction === 'BULLISH' && structure === 'BULLISH') {
          direction = 'BULLISH';
          confidence = 0.8;
          reasons.push('Bullish trend with clear structure');
        } else if (trend.direction === 'BEARISH' && structure === 'BEARISH') {
          direction = 'BEARISH';
          confidence = 0.8;
          reasons.push('Bearish trend with clear structure');
        }
        break;
        
      case 'MOMENTUM':
        const momentum = this.calculateMomentumIndicator(closes);
        if (momentum.strength > 0.02 && momentum.direction === 'BULLISH') {
          direction = 'BULLISH';
          confidence = 0.75;
          reasons.push(`Strong bullish momentum: ${(momentum.strength * 100).toFixed(1)}%`);
        } else if (momentum.strength > 0.02 && momentum.direction === 'BEARISH') {
          direction = 'BEARISH';
          confidence = 0.75;
          reasons.push(`Strong bearish momentum: ${(momentum.strength * 100).toFixed(1)}%`);
        }
        break;
        
      case 'BREAKOUT':
        const consolidation = this.detectConsolidation(highs, lows);
        if (consolidation.detected) {
          const breakoutLevel = this.identifyBreakoutLevel(highs, lows, currentPrice);
          if (breakoutLevel.direction === 'UP' && currentPrice > breakoutLevel.resistance * 0.995) {
            direction = 'BULLISH';
            confidence = 0.7;
            reasons.push(`Breakout above resistance: $${breakoutLevel.resistance.toFixed(2)}`);
          } else if (breakoutLevel.direction === 'DOWN' && currentPrice < breakoutLevel.support * 1.005) {
            direction = 'BEARISH';
            confidence = 0.7;
            reasons.push(`Breakout below support: $${breakoutLevel.support.toFixed(2)}`);
          }
        }
        break;
        
      case 'MEAN_REVERSION':
        if (indicators.rsi < 30) {
          direction = 'BULLISH';
          confidence = 0.7;
          reasons.push(`Oversold RSI: ${indicators.rsi.toFixed(1)}`);
        } else if (indicators.rsi > 70) {
          direction = 'BEARISH';
          confidence = 0.7;
          reasons.push(`Overbought RSI: ${indicators.rsi.toFixed(1)}`);
        }
        break;
    }
    
    // Calculate levels
    const levels = this.calculateLevels(direction, currentPrice, atr, highs, lows);
    
    return {
      direction,
      confidence,
      reasons: reasons.length > 0 ? reasons : ['Insufficient signal strength'],
      levels,
      strategy
    };
  }
  
  analyzeTrend(closes) {
    if (closes.length < 20) return { direction: 'NEUTRAL', strength: 0 };
    
    const sma20 = this.sma(closes, 20);
    const sma50 = this.sma(closes, 50);
    const current = closes[closes.length - 1];
    
    const above20 = current > sma20;
    const above50 = current > sma50;
    const smaAlignment = sma20 > sma50;
    
    if (above20 && above50 && smaAlignment) {
      return { direction: 'BULLISH', strength: 0.8 };
    } else if (!above20 && !above50 && !smaAlignment) {
      return { direction: 'BEARISH', strength: 0.8 };
    } else {
      return { direction: 'NEUTRAL', strength: 0.5 };
    }
  }
  
  analyzeMarketStructure(highs, lows) {
    if (highs.length < 10 || lows.length < 10) return 'NEUTRAL';
    
    const recentHighs = highs.slice(-5);
    const recentLows = lows.slice(-5);
    const olderHighs = highs.slice(-10, -5);
    const olderLows = lows.slice(-10, -5);
    
    const higherHighs = Math.min(...recentHighs) > Math.max(...olderHighs);
    const higherLows = Math.min(...recentLows) > Math.max(...olderLows);
    const lowerHighs = Math.max(...recentHighs) < Math.min(...olderHighs);
    const lowerLows = Math.max(...recentLows) < Math.min(...olderLows);
    
    if (higherHighs && higherLows) return 'BULLISH';
    if (lowerHighs && lowerLows) return 'BEARISH';
    return 'NEUTRAL';
  }
  
  calculateMomentumIndicator(closes) {
    if (closes.length < 10) return { direction: 'NEUTRAL', strength: 0 };
    
    const recent = closes.slice(-5).reduce((a, b) => a + b, 0) / 5;
    const older = closes.slice(-10, -5).reduce((a, b) => a + b, 0) / 5;
    const change = (recent - older) / older;
    
    return {
      direction: change > 0 ? 'BULLISH' : change < 0 ? 'BEARISH' : 'NEUTRAL',
      strength: Math.abs(change)
    };
  }
  
  detectConsolidation(highs, lows) {
    if (highs.length < 20 || lows.length < 20) {
      return { detected: false, range: 0 };
    }
    
    const recentRange = Math.max(...highs.slice(-10)) - Math.min(...lows.slice(-10));
    const olderRange = Math.max(...highs.slice(-20, -10)) - Math.min(...lows.slice(-20, -10));
    
    return {
      detected: recentRange < olderRange * 0.7,
      range: recentRange
    };
  }
  
  identifyBreakoutLevel(highs, lows, currentPrice) {
    const recentHighs = highs.slice(-20);
    const recentLows = lows.slice(-20);
    
    const resistance = Math.max(...recentHighs);
    const support = Math.min(...recentLows);
    
    const distanceToResistance = Math.abs(resistance - currentPrice) / currentPrice;
    const distanceToSupport = Math.abs(support - currentPrice) / currentPrice;
    
    return {
      resistance,
      support,
      direction: distanceToResistance < distanceToSupport ? 'UP' : 'DOWN'
    };
  }
  
  calculateLevels(direction, currentPrice, atr, highs, lows) {
    let entry, stopLoss, takeProfits = [];
    
    if (direction === 'BULLISH') {
      entry = currentPrice;
      stopLoss = Math.min(...lows.slice(-20)) || (currentPrice - atr * 2);
      takeProfits = [
        currentPrice + atr,
        currentPrice + atr * 2,
        currentPrice + atr * 3
      ];
    } else if (direction === 'BEARISH') {
      entry = currentPrice;
      stopLoss = Math.max(...highs.slice(-20)) || (currentPrice + atr * 2);
      takeProfits = [
        currentPrice - atr,
        currentPrice - atr * 2,
        currentPrice - atr * 3
      ];
    } else {
      entry = currentPrice;
      stopLoss = currentPrice;
      takeProfits = [currentPrice];
    }
    
    const risk = Math.abs(entry - stopLoss);
    const reward = Math.abs(takeProfits[0] - entry);
    const riskReward = risk > 0 ? reward / risk : 0;
    
    return {
      entry: this.round(entry),
      stopLoss: this.round(stopLoss),
      takeProfits: takeProfits.map(tp => this.round(tp)),
      risk,
      reward,
      riskReward: this.round(riskReward)
    };
  }
  
  assessRisk(tradeSignal, indicators, aiConfidence) {
    const volatility = indicators.atr / indicators.currentPrice;
    let riskScore = 0.5;
    
    // Adjust based on volatility
    if (volatility > 0.03) riskScore += 0.2;
    else if (volatility < 0.01) riskScore -= 0.1;
    
    // Adjust based on AI confidence
    riskScore += (0.5 - aiConfidence) * 0.3;
    
    // Adjust based on strategy
    if (tradeSignal.strategy === 'MOMENTUM') riskScore += 0.1;
    if (tradeSignal.strategy === 'MEAN_REVERSION') riskScore += 0.05;
    
    riskScore = Math.max(0.1, Math.min(0.9, riskScore));
    
    const level = riskScore > 0.7 ? 'HIGH' : riskScore > 0.4 ? 'MEDIUM' : 'LOW';
    
    // Calculate position size
    const baseRisk = DEFAULT_RISK_PCT / 100;
    const adjustedRisk = baseRisk * (1 - riskScore);
    const positionSize = adjustedRisk * ACCOUNT_EQUITY;
    
    return {
      score: riskScore,
      level,
      volatility: this.round(volatility),
      positionSize: this.round(positionSize),
      riskPercentage: this.round(adjustedRisk * 100)
    };
  }
  
  generateNoTradeAnalysis(symbol, strategySelection) {
    return {
      symbol,
      timestamp: Date.now(),
      aiStrategy: 'NO_TRADE',
      strategyName: 'No Trade',
      confidence: strategySelection.confidence,
      confidenceLevel: 'LOW',
      marketConditions: {},
      strategySelection,
      tradeSignal: {
        direction: 'NEUTRAL',
        confidence: 0,
        reasons: ['Low AI confidence'],
        levels: {
          entry: 0,
          stopLoss: 0,
          takeProfits: [0],
          riskReward: 0
        },
        strategy: 'NO_TRADE'
      },
      riskAssessment: {
        score: 0.5,
        level: 'MEDIUM',
        volatility: 0,
        positionSize: 0,
        riskPercentage: 0
      },
      indicators: {}
    };
  }
  
  // Technical indicators
  calculateRSI(closes, period = 14) {
    if (closes.length < period + 1) return 50;
    
    let gains = 0;
    let losses = 0;
    
    for (let i = 1; i <= period; i++) {
      const change = closes[i] - closes[i - 1];
      if (change >= 0) {
        gains += change;
      } else {
        losses -= change;
      }
    }
    
    const avgGain = gains / period;
    const avgLoss = losses / period;
    
    if (avgLoss === 0) return 100;
    if (avgGain === 0) return 0;
    
    const rs = avgGain / avgLoss;
    return 100 - (100 / (1 + rs));
  }
  
  calculateATR(highs, lows, closes, period = 14) {
    if (highs.length < period || lows.length < period || closes.length < period) {
      return 0;
    }
    
    let sum = 0;
    for (let i = 1; i < period; i++) {
      const hl = highs[i] - lows[i];
      const hc = Math.abs(highs[i] - closes[i - 1]);
      const lc = Math.abs(lows[i] - closes[i - 1]);
      sum += Math.max(hl, hc, lc);
    }
    
    return sum / (period - 1);
  }
  
  sma(data, period) {
    if (data.length < period) return data[data.length - 1];
    const slice = data.slice(-period);
    return slice.reduce((a, b) => a + b, 0) / period;
  }
  
  round(value, decimals = 4) {
    const factor = Math.pow(10, decimals);
    return Math.round(value * factor) / factor;
  }
}

// ==================== TELEGRAM BOT ====================
class TelegramBotWrapper {
  constructor() {
    if (!TELEGRAM_BOT_TOKEN) {
      throw new Error('TELEGRAM_BOT_TOKEN is required');
    }
    
    this.bot = null;
    this.tradingEngine = new TradingEngine();
    this.initializeBot();
  }
  
  initializeBot() {
    // Use native HTTPS for Telegram API
    const https = require('https');
    
    this.bot = {
      sendMessage: async (chatId, text, options = {}) => {
        const url = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`;
        const data = {
          chat_id: chatId,
          text: text,
          parse_mode: options.parse_mode || 'HTML',
          reply_to_message_id: options.reply_to_message_id
        };
        
        try {
          const response = await httpRequest(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data),
            json: true
          });
          
          return response.data.result;
        } catch (error) {
          logger.error(`Telegram sendMessage failed: ${error.message}`);
          throw error;
        }
      },
      
      editMessageText: async (chatId, messageId, text, options = {}) => {
        const url = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/editMessageText`;
        const data = {
          chat_id: chatId,
          message_id: messageId,
          text: text,
          parse_mode: options.parse_mode || 'HTML'
        };
        
        try {
          const response = await httpRequest(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data),
            json: true
          });
          
          return response.data.result;
        } catch (error) {
          logger.error(`Telegram editMessageText failed: ${error.message}`);
          throw error;
        }
      }
    };
    
    // Start polling for updates
    this.startPolling();
  }
  
  async startPolling() {
    const pollUpdates = async () => {
      try {
        const url = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/getUpdates`;
        const params = new URLSearchParams({
          offset: this.lastUpdateId ? (this.lastUpdateId + 1) : 0,
          timeout: 30
        });
        
        const response = await httpRequest(`${url}?${params}`, { json: true });
        
        if (response.data.ok && response.data.result.length > 0) {
          for (const update of response.data.result) {
            this.lastUpdateId = update.update_id;
            await this.handleUpdate(update);
          }
        }
      } catch (error) {
        logger.error(`Polling error: ${error.message}`);
      }
      
      // Continue polling
      setTimeout(() => pollUpdates(), 100);
    };
    
    pollUpdates();
    logger.info('🤖 Telegram Bot started (HTTP polling mode)');
  }
  
  async handleUpdate(update) {
    if (!update.message) return;
    
    const chatId = update.message.chat.id;
    const text = update.message.text || '';
    
    // Handle /analyze command
    if (text.startsWith('/analyze ')) {
      const symbol = text.split(' ')[1];
      await this.handleAnalyzeCommand(chatId, symbol, update.message.message_id);
    }
    
    // Handle /help command
    else if (text === '/help') {
      await this.sendHelpMessage(chatId);
    }
    
    // Handle /status command
    else if (text === '/status') {
      await this.sendStatusMessage(chatId);
    }
  }
  
  async handleAnalyzeCommand(chatId, symbol, messageId) {
    if (!symbol) {
      await this.bot.sendMessage(chatId, '❌ Please provide a symbol. Usage: /analyze BTCUSDT');
      return;
    }
    
    try {
      // Send initial message
      const initialMsg = await this.bot.sendMessage(chatId,
        `🤖 **AI INITIATING ANALYSIS: ${symbol}**\n\n` +
        `🔍 Scanning market conditions...\n` +
        `🧠 AI selecting optimal strategy...\n` +
        `📊 Running institutional analysis...`
      );
      
      // Perform analysis
      const analysis = await this.tradingEngine.analyzeAsset(symbol);
      
      // Send results
      await this.sendAnalysisResults(chatId, analysis, initialMsg.message_id);
      
    } catch (error) {
      await this.bot.sendMessage(chatId, 
        `❌ **AI ANALYSIS FAILED: ${symbol}**\n\nError: ${error.message}`
      );
    }
  }
  
  async sendAnalysisResults(chatId, analysis, messageId) {
    const signal = analysis.tradeSignal;
    const risk = analysis.riskAssessment;
    
    let message = '';
    
    if (signal.direction === 'NEUTRAL') {
      message = `
🟡 **AI ANALYSIS: ${analysis.symbol}**

**Decision:** NO TRADE
**Reason:** ${signal.reasons[0]}

**AI Confidence:** ${(analysis.confidence * 100).toFixed(1)}% ${analysis.confidenceLevel === 'HIGH' ? '✅' : '⚠️'}
**Selected Strategy:** ${analysis.strategyName}

**📊 Market Conditions:**
${Object.entries(analysis.marketConditions)
  .filter(([k, v]) => v === true)
  .map(([k]) => `• ${k.replace(/_/g, ' ').toUpperCase()}`)
  .join('\n') || '• Neutral conditions'}

**🤖 AI Recommendation:**
Wait for better market conditions. The AI needs higher confidence to generate a trade signal.

**Next Steps:**
• Monitor for changing market conditions
• Check back in 1-4 hours
• Consider different timeframe analysis
      `;
    } else {
      const emoji = signal.direction === 'BULLISH' ? '🟢' : '🔴';
      
      message = `
${emoji} **AI TRADE SIGNAL: ${analysis.symbol}**

**Trade:** ${signal.direction} ${emoji}
**Strategy:** ${analysis.strategyName}
**AI Confidence:** ${(analysis.confidence * 100).toFixed(1)}% ${analysis.confidenceLevel === 'HIGH' ? '✅' : '⚠️'}

**🎯 ENTRY LEVELS:**
Entry: $${signal.levels.entry}
Stop Loss: $${signal.levels.stopLoss}
Take Profit: $${signal.levels.takeProfits.join(' | $')}
Risk/Reward: 1:${signal.levels.riskReward.toFixed(2)}

**📊 RISK ASSESSMENT:**
Level: ${risk.level}
Score: ${(risk.score * 100).toFixed(1)}/100
Position Size: $${risk.positionSize.toFixed(2)}
Risk: ${risk.riskPercentage.toFixed(2)}%

**🤔 AI REASONING:**
${signal.reasons.join('\n')}

**📈 TECHNICAL INDICATORS:**
RSI: ${analysis.indicators.rsi.toFixed(1)}
SMA20: $${analysis.indicators.sma20.toFixed(2)}
SMA50: $${analysis.indicators.sma50.toFixed(2)}
ATR: $${analysis.indicators.atr.toFixed(4)}

**⚠️ RISK DISCLAIMER:**
This is AI-generated analysis. Always use stop losses and proper position sizing.
      `;
    }
    
    await this.bot.editMessageText(chatId, messageId, message);
  }
  
  async sendHelpMessage(chatId) {
    const message = `
🤖 **AI TRADING BOT v5.0**

**Single Command:**
/analyze SYMBOL - AI analyzes any asset and selects optimal strategy

**AI Strategy Selection:**
• 🤖 AI automatically analyzes market conditions
• 📊 Selects from 4 institutional strategies
• 🎯 Based on real-time market data
• ✅ No manual strategy selection needed

**Available Strategies:**
⚛️ **Quantum Engine V2.0** - Institutional-grade analysis
📈 **Momentum Scalper** - Captures strong momentum
🚀 **Breakout Hunter** - Trades consolidation breakouts
🔄 **Mean Reversion** - Trades overextended reversions

**How It Works:**
1. Send /analyze BTCUSDT
2. AI analyzes market conditions
3. AI selects optimal strategy
4. AI provides entry, SL, TP levels
5. AI explains reasoning

**Supported Assets:**
• Crypto: BTCUSDT, ETHUSDT, etc.
• Forex: EURUSD, GBPJPY, etc.
• Stocks: AAPL, TSLA, etc.
• Metals: XAUUSD, XAGUSD

**⚠️ RISK DISCLAIMER:**
AI analysis for educational purposes. Always verify signals and use proper risk management.
    `;
    
    await this.bot.sendMessage(chatId, message);
  }
  
  async sendStatusMessage(chatId) {
    const message = `
📊 **AI TRADING SYSTEM STATUS**

**System:** 🟢 OPERATIONAL
**Mode:** ${MODE.toUpperCase()}
**AI Engine:** 🟢 ACTIVE
**Strategy Selection:** ${ENABLE_AI_STRATEGY_SELECTION === 'true' ? '🟢 ENABLED' : '🔴 DISABLED'}

**Minimum Confidence:** ${(MIN_CONFIDENCE_THRESHOLD * 100).toFixed(0)}%
**Account Equity:** $${ACCOUNT_EQUITY}
**Risk per Trade:** ${DEFAULT_RISK_PCT}%

**Exchange APIs:**
• Bitget: ${CCXT_BITGET_API_KEY ? '🟢 CONFIGURED' : '⚪ NOT CONFIGURED'}
• OANDA: ${OANDA_API_KEY ? '🟢 CONFIGURED' : '⚪ NOT CONFIGURED'}
• Alpaca: ${ALPACA_API_KEY ? '🟢 CONFIGURED' : '⚪ NOT CONFIGURED'}

**Use /analyze SYMBOL to analyze any asset**
    `;
    
    await this.bot.sendMessage(chatId, message);
  }
}

// ==================== EXPRESS SERVER ====================
class WebServer {
  constructor() {
    const http = require('http');
    this.tradingEngine = new TradingEngine();
  }
  
  async handleRequest(req, res) {
    const url = new URL(req.url, `http://${req.headers.host}`);
    
    // CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    
    if (req.method === 'OPTIONS') {
      res.writeHead(204);
      res.end();
      return;
    }
    
    try {
      if (req.method === 'GET' && url.pathname === '/health') {
        await this.handleHealth(req, res);
      } else if (req.method === 'POST' && url.pathname === '/api/ai/analyze') {
        await this.handleAnalyze(req, res);
      } else {
        res.writeHead(404, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Not found' }));
      }
    } catch (error) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: error.message }));
    }
  }
  
  async handleHealth(req, res) {
    const status = {
      status: 'operational',
      version: '5.0',
      mode: MODE,
      aiEnabled: ENABLE_AI_STRATEGY_SELECTION === 'true',
      minConfidence: MIN_CONFIDENCE_THRESHOLD,
      timestamp: Date.now()
    };
    
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(status));
  }
  
  async handleAnalyze(req, res) {
    let body = '';
    req.on('data', chunk => body += chunk);
    
    req.on('end', async () => {
      try {
        const data = JSON.parse(body || '{}');
        const { symbol } = data;
        
        if (!symbol) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Symbol is required' }));
          return;
        }
        
        const analysis = await this.tradingEngine.analyzeAsset(symbol);
        
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          success: true,
          analysis,
          timestamp: Date.now()
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
  
  start() {
    const http = require('http');
    const server = http.createServer((req, res) => this.handleRequest(req, res));
    
    server.listen(PORT, () => {
      logger.info(`🌐 Server running on port ${PORT}`);
      logger.info(`🔗 Health: http://localhost:${PORT}/health`);
      logger.info(`📊 API: POST http://localhost:${PORT}/api/ai/analyze`);
    });
    
    server.on('error', (error) => {
      logger.error(`Server error: ${error.message}`);
    });
  }
}

// ==================== MAIN APPLICATION ====================
class AI_Trading_System {
  constructor() {
    this.telegramBot = null;
    this.webServer = new WebServer();
  }
  
  async start() {
    try {
      logger.info('🚀 **AI TRADING SYSTEM v5.0**');
      logger.info('🤖 **AI Strategy Selection: ENABLED**');
      logger.info(`📊 **Minimum Confidence: ${(MIN_CONFIDENCE_THRESHOLD * 100).toFixed(0)}%**`);
      logger.info('');
      logger.info('**Available Strategies:**');
      logger.info('  ⚛️ Quantum Engine V2.0');
      logger.info('  📈 Momentum Scalper');
      logger.info('  🚀 Breakout Hunter');
      logger.info('  🔄 Mean Reversion');
      logger.info('');
      logger.info('**Telegram Command:**');
      logger.info('  /analyze SYMBOL - AI analyzes and selects optimal strategy');
      logger.info('');
      
      // Start Telegram bot
      this.telegramBot = new TelegramBotWrapper();
      
      // Start web server
      this.webServer.start();
      
      logger.info('✅ **AI SYSTEM READY**');
      logger.info('🤖 Send /analyze BTCUSDT to test');
      
    } catch (error) {
      logger.error('Startup error:', error);
      process.exit(1);
    }
  }
}

// ==================== START THE SYSTEM ====================
if (require.main === module) {
  const system = new AI_Trading_System();
  system.start();
}

module.exports = { AI_Trading_System, TradingEngine, AIStrategySelector };
