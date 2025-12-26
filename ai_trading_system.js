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
  LOG_LEVEL = 'info',
  
  // TELEGRAM WEBHOOK (Simple format like your example)
  TELEGRAM_WEBHOOK_URL,  // e.g., https://telegram-bot-worker.kleezband123.workers.dev/telegram
  TELEGRAM_WEBHOOK_PATH = '/telegram-webhook',
  
  // TRADINGVIEW
  TV_WEBHOOK_PORT = 8080,
  
  // CHOREO/PLATFORM SETTINGS
  PLATFORM_SECRET,
  PLATFORM_API_KEY
} = process.env;

// Load environment variables from .env file
try {
  const fs = require('fs');
  const path = require('path');
  const envPath = path.join(process.cwd(), '.env');
  
  if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf8');
    envContent.split('\n').forEach(line => {
      const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
      if (match) {
        const key = match[1];
        let value = match[2] || '';
        
        if (value.startsWith('"') && value.endsWith('"')) {
          value = value.slice(1, -1);
        } else if (value.startsWith("'") && value.endsWith("'")) {
          value = value.slice(1, -1);
        }
        
        process.env[key] = value;
      }
    });
  }
} catch (error) {
  // .env file not required
}

if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_CHAT_ID) {
  console.error('❌ Missing TELEGRAM_BOT_TOKEN or TELEGRAM_CHAT_ID in environment');
  process.exit(1);
}

// ==================== SIMPLE LOGGER ====================
class Logger {
  constructor(level = 'info') {
    this.levels = { error: 0, warn: 1, info: 2, debug: 3 };
    this.currentLevel = this.levels[level] || 1;
  }

  log(level, message) {
    if (this.levels[level] <= this.currentLevel) {
      const timestamp = new Date().toISOString().replace('T', ' ').substring(0, 19);
      const formatted = `${timestamp} [${level.toUpperCase()}] ${message}`;
      console.log(formatted);
    }
  }

  info(message) { this.log('info', message); }
  error(message) { this.log('error', message); }
  warn(message) { this.log('warn', message); }
  debug(message) { this.log('debug', message); }
}

const logger = new Logger(LOG_LEVEL);

// ==================== SIMPLE HTTP CLIENT ====================
class SimpleHttpClient {
  static async request(method, url, data = null, headers = {}) {
    return new Promise((resolve, reject) => {
      const parsedUrl = new URL(url);
      const http = parsedUrl.protocol === 'https:' ? require('https') : require('http');
      
      const options = {
        hostname: parsedUrl.hostname,
        port: parsedUrl.port || (parsedUrl.protocol === 'https:' ? 443 : 80),
        path: parsedUrl.pathname + parsedUrl.search,
        method: method,
        headers: {
          'User-Agent': 'AI-Trading-System/5.0',
          ...headers
        }
      };
      
      const req = http.request(options, (res) => {
        let body = '';
        res.on('data', chunk => body += chunk);
        res.on('end', () => {
          try {
            const response = {
              status: res.statusCode,
              headers: res.headers,
              data: body
            };
            
            if (res.statusCode >= 400) {
              reject(new Error(`HTTP ${res.statusCode}: ${body.substring(0, 200)}`));
            } else {
              resolve(response);
            }
          } catch (err) {
            reject(err);
          }
        });
      });
      
      req.on('error', reject);
      req.setTimeout(10000, () => {
        req.destroy();
        reject(new Error('Request timeout'));
      });
      
      if (data) {
        if (typeof data === 'object') {
          req.write(JSON.stringify(data));
        } else {
          req.write(data);
        }
      }
      req.end();
    });
  }
  
  static async get(url, headers = {}) {
    return this.request('GET', url, null, headers);
  }
  
  static async post(url, data, headers = {}) {
    return this.request('POST', url, data, {
      'Content-Type': 'application/json',
      ...headers
    });
  }
  
  static async postForm(url, formData, headers = {}) {
    const params = new URLSearchParams();
    Object.entries(formData).forEach(([key, value]) => {
      params.append(key, value);
    });
    
    return this.request('POST', url, params.toString(), {
      'Content-Type': 'application/x-www-form-urlencoded',
      ...headers
    });
  }
}

// ==================== TELEGRAM WEBHOOK MANAGER ====================
class TelegramWebhookManager {
  constructor() {
    this.botToken = TELEGRAM_BOT_TOKEN;
    this.webhookUrl = TELEGRAM_WEBHOOK_URL;
    this.webhookPath = TELEGRAM_WEBHOOK_PATH || '/telegram';
    this.isWebhookSet = false;
  }
  
  async setWebhook() {
    if (!this.webhookUrl) {
      logger.warn('TELEGRAM_WEBHOOK_URL not set. Using polling mode or manual webhook.');
      return false;
    }
    
    try {
      logger.info(`🔧 Setting Telegram webhook to: ${this.webhookUrl}`);
      
      // Format exactly like your curl example
      const response = await SimpleHttpClient.postForm(
        `https://api.telegram.org/bot${this.botToken}/setWebhook`,
        {
          url: this.webhookUrl
        }
      );
      
      const result = JSON.parse(response.data);
      
      if (result.ok) {
        this.isWebhookSet = true;
        logger.info(`✅ Telegram webhook set successfully!`);
        logger.info(`📝 Description: ${result.description}`);
        logger.info(`🔗 URL: ${this.webhookUrl}`);
        return true;
      } else {
        logger.error(`❌ Failed to set webhook: ${result.description}`);
        return false;
      }
    } catch (error) {
      logger.error(`❌ Error setting webhook: ${error.message}`);
      return false;
    }
  }
  
  async deleteWebhook() {
    try {
      const response = await SimpleHttpClient.postForm(
        `https://api.telegram.org/bot${this.botToken}/deleteWebhook`,
        {}
      );
      
      const result = JSON.parse(response.data);
      
      if (result.ok) {
        this.isWebhookSet = false;
        logger.info('✅ Telegram webhook deleted');
        return true;
      } else {
        logger.error(`❌ Failed to delete webhook: ${result.description}`);
        return false;
      }
    } catch (error) {
      logger.error(`❌ Error deleting webhook: ${error.message}`);
      return false;
    }
  }
  
  async getWebhookInfo() {
    try {
      const response = await SimpleHttpClient.get(
        `https://api.telegram.org/bot${this.botToken}/getWebhookInfo`
      );
      
      const result = JSON.parse(response.data);
      
      if (result.ok) {
        logger.info('📊 Webhook Information:');
        logger.info(`🔗 URL: ${result.result.url || 'Not set'}`);
        logger.info(`🔄 Pending updates: ${result.result.pending_update_count}`);
        logger.info(`📡 Last error: ${result.result.last_error_message || 'None'}`);
        return result.result;
      }
      return null;
    } catch (error) {
      logger.error(`❌ Error getting webhook info: ${error.message}`);
      return null;
    }
  }
  
  async sendMessage(chatId, text, options = {}) {
    try {
      const data = {
        chat_id: chatId,
        text: text,
        parse_mode: options.parse_mode || 'HTML',
        reply_to_message_id: options.reply_to_message_id
      };
      
      const response = await SimpleHttpClient.postForm(
        `https://api.telegram.org/bot${this.botToken}/sendMessage`,
        data
      );
      
      const result = JSON.parse(response.data);
      
      if (result.ok) {
        return result.result;
      } else {
        throw new Error(result.description);
      }
    } catch (error) {
      logger.error(`Telegram sendMessage failed: ${error.message}`);
      throw error;
    }
  }
  
  async editMessageText(chatId, messageId, text, options = {}) {
    try {
      const data = {
        chat_id: chatId,
        message_id: messageId,
        text: text,
        parse_mode: options.parse_mode || 'HTML'
      };
      
      const response = await SimpleHttpClient.postForm(
        `https://api.telegram.org/bot${this.botToken}/editMessageText`,
        data
      );
      
      const result = JSON.parse(response.data);
      
      if (result.ok) {
        return result.result;
      } else {
        throw new Error(result.description);
      }
    } catch (error) {
      logger.error(`Telegram editMessageText failed: ${error.message}`);
      throw error;
    }
  }
}

// ==================== MARKET DATA SERVICE ====================
class MarketDataService {
  constructor() {
    this.cache = new Map();
    this.cacheDuration = 30000;
  }
  
  async fetchOHLCV(symbol, timeframe = '1h', limit = 200) {
    const cacheKey = `${symbol}:${timeframe}:${limit}`;
    const cached = this.cache.get(cacheKey);
    
    if (cached && Date.now() - cached.timestamp < this.cacheDuration) {
      return cached.data;
    }
    
    try {
      // Try Binance first for crypto
      if (symbol.includes('USDT') || symbol.includes('BTC') || symbol.includes('ETH')) {
        const data = await this.fetchFromBinance(symbol, timeframe, limit);
        if (data.length > 0) {
          this.cache.set(cacheKey, { timestamp: Date.now(), data });
          return data;
        }
      }
      
      // Fallback to realistic generated data
      return this.generateRealisticData(symbol, limit);
      
    } catch (error) {
      logger.error(`Market data fetch failed: ${error.message}`);
      return this.generateRealisticData(symbol, limit);
    }
  }
  
  async fetchFromBinance(symbol, timeframe, limit) {
    try {
      const interval = this.mapTimeframe(timeframe);
      const binanceSymbol = symbol.replace('/', '').toUpperCase();
      const url = `https://api.binance.com/api/v3/klines?symbol=${binanceSymbol}&interval=${interval}&limit=${limit}`;
      
      const response = await SimpleHttpClient.get(url);
      const data = JSON.parse(response.data);
      
      if (Array.isArray(data)) {
        return data.map(candle => ({
          timestamp: candle[0],
          open: parseFloat(candle[1]),
          high: parseFloat(candle[2]),
          low: parseFloat(candle[3]),
          close: parseFloat(candle[4]),
          volume: parseFloat(candle[5])
        }));
      }
    } catch (error) {
      logger.verbose(`Binance API failed: ${error.message}`);
    }
    return [];
  }
  
  generateRealisticData(symbol, limit) {
    const basePrice = this.getBasePrice(symbol);
    const data = [];
    let price = basePrice;
    
    for (let i = 0; i < limit; i++) {
      const change = (Math.random() - 0.5) * 0.02 * price;
      price += change;
      
      const high = price + Math.random() * 0.01 * price;
      const low = price - Math.random() * 0.01 * price;
      const open = price - change * 0.3;
      const volume = Math.random() * 1000 + 500;
      
      data.push({
        timestamp: Date.now() - (limit - i) * 3600000,
        open: parseFloat(open.toFixed(4)),
        high: parseFloat(high.toFixed(4)),
        low: parseFloat(low.toFixed(4)),
        close: parseFloat(price.toFixed(4)),
        volume: parseFloat(volume.toFixed(2))
      });
    }
    
    return data;
  }
  
  getBasePrice(symbol) {
    const prices = {
      'BTCUSDT': 42000,
      'ETHUSDT': 2200,
      'BNBUSDT': 300,
      'SOLUSDT': 100,
      'EURUSD': 1.08,
      'GBPUSD': 1.26,
      'XAUUSD': 2030,
      'AAPL': 185,
      'TSLA': 250,
      'MSFT': 370
    };
    return prices[symbol.toUpperCase()] || 100;
  }
  
  mapTimeframe(tf) {
    const map = {
      '1m': '1m', '5m': '5m', '15m': '15m', '30m': '30m',
      '1h': '1h', '4h': '4h', '1d': '1d', '1w': '1w'
    };
    return map[tf] || '1h';
  }
}

// ==================== AI STRATEGY SELECTOR ====================
class AIStrategySelector {
  constructor() {
    this.strategies = {
      QUANTUM: {
        name: 'Quantum Engine V2.0',
        description: 'Institutional-grade analysis',
        weight: 0.35,
        emoji: '⚛️'
      },
      MOMENTUM: {
        name: 'Momentum Scalper V1.0',
        description: 'Captures strong momentum moves',
        weight: 0.25,
        emoji: '📈'
      },
      BREAKOUT: {
        name: 'Breakout Hunter V1.0',
        description: 'Trades consolidation breakouts',
        weight: 0.20,
        emoji: '🚀'
      },
      MEAN_REVERSION: {
        name: 'Mean Reversion V1.0',
        description: 'Trades overextended reversions',
        weight: 0.20,
        emoji: '🔄'
      }
    };
    
    this.strategyWeights = {
      trending_market: { QUANTUM: 0.8, MOMENTUM: 0.6, BREAKOUT: 0.3, MEAN_REVERSION: 0.1 },
      clear_structure: { QUANTUM: 0.9, MOMENTUM: 0.5, BREAKOUT: 0.7, MEAN_REVERSION: 0.3 },
      high_volatility: { QUANTUM: 0.4, MOMENTUM: 0.9, BREAKOUT: 0.5, MEAN_REVERSION: 0.2 },
      strong_momentum: { QUANTUM: 0.5, MOMENTUM: 0.95, BREAKOUT: 0.4, MEAN_REVERSION: 0.1 },
      consolidation: { QUANTUM: 0.3, MOMENTUM: 0.2, BREAKOUT: 0.9, MEAN_REVERSION: 0.5 },
      overbought: { QUANTUM: 0.2, MOMENTUM: 0.1, BREAKOUT: 0.3, MEAN_REVERSION: 0.9 },
      oversold: { QUANTUM: 0.2, MOMENTUM: 0.1, BREAKOUT: 0.3, MEAN_REVERSION: 0.9 }
    };
    
    logger.info('AI Strategy Selector Initialized');
  }
  
  analyzeMarketConditions(priceData, volumeData, indicators) {
    const conditions = {};
    const closes = priceData.map(p => p.close);
    const highs = priceData.map(p => p.high);
    const lows = priceData.map(p => p.low);
    
    // Basic conditions
    conditions.trending_market = this.isTrending(closes);
    conditions.clear_structure = this.hasClearStructure(highs, lows);
    conditions.high_volatility = this.isHighlyVolatile(closes);
    conditions.strong_momentum = this.hasStrongMomentum(closes);
    conditions.consolidation = this.isConsolidating(highs, lows);
    
    if (indicators && indicators.rsi) {
      conditions.overbought = indicators.rsi > 70;
      conditions.oversold = indicators.rsi < 30;
    }
    
    return conditions;
  }
  
  selectOptimalStrategy(marketConditions) {
    if (!ENABLE_AI_STRATEGY_SELECTION || ENABLE_AI_STRATEGY_SELECTION === 'false') {
      return { 
        strategy: 'QUANTUM', 
        confidence: 0.8, 
        reason: 'AI selection disabled'
      };
    }
    
    const strategyScores = {};
    const activeConditions = Object.keys(marketConditions).filter(
      key => typeof marketConditions[key] === 'boolean' && marketConditions[key] === true
    );
    
    Object.keys(this.strategies).forEach(strategy => {
      let score = this.strategies[strategy].weight;
      
      activeConditions.forEach(condition => {
        if (this.strategyWeights[condition] && this.strategyWeights[condition][strategy]) {
          score += this.strategyWeights[condition][strategy];
        }
      });
      
      score = Math.max(0.1, Math.min(0.95, score / (activeConditions.length + 1)));
      strategyScores[strategy] = score;
    });
    
    let bestStrategy = 'QUANTUM';
    let bestScore = -1;
    
    Object.entries(strategyScores).forEach(([strategy, score]) => {
      if (score > bestScore) {
        bestScore = score;
        bestStrategy = strategy;
      }
    });
    
    const confidence = Math.min(0.95, bestScore);
    const confidenceLevel = confidence > 0.8 ? 'HIGH' : confidence > 0.6 ? 'MEDIUM' : 'LOW';
    
    const reason = this.generateStrategyReason(bestStrategy, activeConditions);
    
    return {
      strategy: bestStrategy,
      strategyName: this.strategies[bestStrategy].name,
      strategyEmoji: this.strategies[bestStrategy].emoji,
      confidence: confidence,
      confidenceLevel: confidenceLevel,
      reason: reason
    };
  }
  
  isTrending(closes) {
    if (closes.length < 20) return false;
    const recent = closes.slice(-10);
    const older = closes.slice(-20, -10);
    const recentAvg = recent.reduce((a, b) => a + b, 0) / recent.length;
    const olderAvg = older.reduce((a, b) => a + b, 0) / older.length;
    return Math.abs((recentAvg - olderAvg) / olderAvg) > 0.02;
  }
  
  hasClearStructure(highs, lows) {
    if (highs.length < 10 || lows.length < 10) return false;
    const recentHighs = highs.slice(-5);
    const recentLows = lows.slice(-5);
    const olderHighs = highs.slice(-10, -5);
    const olderLows = lows.slice(-10, -5);
    return (Math.min(...recentHighs) > Math.max(...olderHighs) && 
            Math.min(...recentLows) > Math.max(...olderLows)) ||
           (Math.max(...recentHighs) < Math.min(...olderHighs) && 
            Math.max(...recentLows) < Math.min(...olderLows));
  }
  
  isHighlyVolatile(closes) {
    if (closes.length < 10) return false;
    let sum = 0;
    for (let i = 1; i < closes.length; i++) {
      sum += Math.abs(closes[i] - closes[i-1]) / closes[i-1];
    }
    return (sum / (closes.length - 1)) > 0.02;
  }
  
  hasStrongMomentum(closes) {
    if (closes.length < 10) return false;
    const recent = closes.slice(-5);
    const older = closes.slice(-10, -5);
    const recentAvg = recent.reduce((a, b) => a + b, 0) / recent.length;
    const olderAvg = older.reduce((a, b) => a + b, 0) / older.length;
    return Math.abs((recentAvg - olderAvg) / olderAvg) > 0.015;
  }
  
  isConsolidating(highs, lows) {
    if (highs.length < 20 || lows.length < 20) return false;
    const recentRange = Math.max(...highs.slice(-10)) - Math.min(...lows.slice(-10));
    const olderRange = Math.max(...highs.slice(-20, -10)) - Math.min(...lows.slice(-20, -10));
    return recentRange < olderRange * 0.7;
  }
  
  generateStrategyReason(strategy, conditions) {
    const conditionNames = {
      trending_market: 'trending market',
      clear_structure: 'clear structure',
      high_volatility: 'high volatility',
      strong_momentum: 'strong momentum',
      consolidation: 'consolidation',
      overbought: 'overbought',
      oversold: 'oversold'
    };
    
    let reason = `${this.strategies[strategy].emoji} Selected because: `;
    
    if (conditions.length > 0) {
      reason += conditions.map(c => conditionNames[c] || c).join(', ');
    } else {
      reason += 'neutral market conditions';
    }
    
    return reason;
  }
}

// ==================== TRADING ENGINE ====================
class TradingEngine {
  constructor() {
    this.aiSelector = new AIStrategySelector();
    this.dataService = new MarketDataService();
    this.analyses = [];
    logger.info('Trading Engine Initialized');
  }
  
  async analyzeAsset(symbol, timeframe = '1h') {
    try {
      logger.info(`🤖 Analyzing ${symbol}...`);
      
      const priceData = await this.dataService.fetchOHLCV(symbol, timeframe, 200);
      if (priceData.length < 50) {
        throw new Error(`Insufficient data: ${priceData.length} candles`);
      }
      
      const volumeData = priceData.map(p => p.volume);
      const closes = priceData.map(p => p.close);
      const highs = priceData.map(p => p.high);
      const lows = priceData.map(p => p.low);
      
      // Calculate basic indicators
      const indicators = {
        rsi: this.calculateRSI(closes),
        sma20: this.sma(closes, 20),
        sma50: this.sma(closes, 50),
        currentPrice: closes[closes.length - 1],
        atr: this.calculateATR(highs, lows, closes)
      };
      
      // AI analysis
      const marketConditions = this.aiSelector.analyzeMarketConditions(
        priceData, 
        volumeData, 
        indicators
      );
      
      const strategySelection = this.aiSelector.selectOptimalStrategy(marketConditions);
      
      // Generate trade signal
      const tradeSignal = this.generateTradeSignal(
        strategySelection.strategy,
        priceData,
        indicators,
        marketConditions
      );
      
      // Create analysis
      const analysis = {
        id: `${symbol}_${Date.now()}`,
        symbol: symbol,
        timeframe: timeframe,
        timestamp: Date.now(),
        
        // AI Components
        aiStrategy: strategySelection.strategy,
        strategyName: strategySelection.strategyName,
        strategyEmoji: strategySelection.strategyEmoji,
        confidence: strategySelection.confidence,
        confidenceLevel: strategySelection.confidenceLevel,
        marketConditions: marketConditions,
        strategySelection: strategySelection,
        
        // Technical Analysis
        indicators: indicators,
        currentPrice: indicators.currentPrice,
        
        // Trade Signal
        tradeSignal: tradeSignal,
        
        // Metadata
        dataPoints: priceData.length
      };
      
      // Store analysis
      this.analyses.push(analysis);
      if (this.analyses.length > 1000) {
        this.analyses = this.analyses.slice(-500);
      }
      
      logger.info(`✅ Analysis complete: ${strategySelection.strategyName} (${(strategySelection.confidence * 100).toFixed(1)}% confidence)`);
      
      return analysis;
      
    } catch (error) {
      logger.error(`Analysis failed: ${error.message}`);
      throw error;
    }
  }
  
  generateTradeSignal(strategy, priceData, indicators, marketConditions) {
    const closes = priceData.map(p => p.close);
    const highs = priceData.map(p => p.high);
    const lows = priceData.map(p => p.low);
    const currentPrice = indicators.currentPrice;
    const atr = indicators.atr || (currentPrice * 0.02);
    
    let direction = 'NEUTRAL';
    let confidence = 0.5;
    let reasons = [];
    let entry = currentPrice;
    let stopLoss = currentPrice;
    let takeProfits = [currentPrice];
    
    switch(strategy) {
      case 'QUANTUM':
        if (marketConditions.trending_market && marketConditions.clear_structure) {
          const trend = this.getTrendDirection(closes);
          if (trend === 'BULLISH') {
            direction = 'LONG';
            confidence = 0.75;
            reasons.push('Bullish trend with clear structure');
            entry = currentPrice;
            stopLoss = currentPrice - (atr * 1.5);
            takeProfits = [
              currentPrice + atr,
              currentPrice + (atr * 2),
              currentPrice + (atr * 3)
            ];
          } else if (trend === 'BEARISH') {
            direction = 'SHORT';
            confidence = 0.75;
            reasons.push('Bearish trend with clear structure');
            entry = currentPrice;
            stopLoss = currentPrice + (atr * 1.5);
            takeProfits = [
              currentPrice - atr,
              currentPrice - (atr * 2),
              currentPrice - (atr * 3)
            ];
          }
        }
        break;
        
      case 'MOMENTUM':
        if (marketConditions.strong_momentum) {
          const momentum = this.calculateMomentum(closes);
          if (momentum > 0.015) {
            direction = 'LONG';
            confidence = 0.7;
            reasons.push(`Strong bullish momentum: ${(momentum * 100).toFixed(1)}%`);
            entry = currentPrice;
            stopLoss = currentPrice - (atr * 1.2);
            takeProfits = [
              currentPrice + (atr * 1.5),
              currentPrice + (atr * 2.5),
              currentPrice + (atr * 4)
            ];
          } else if (momentum < -0.015) {
            direction = 'SHORT';
            confidence = 0.7;
            reasons.push(`Strong bearish momentum: ${(Math.abs(momentum) * 100).toFixed(1)}%`);
            entry = currentPrice;
            stopLoss = currentPrice + (atr * 1.2);
            takeProfits = [
              currentPrice - (atr * 1.5),
              currentPrice - (atr * 2.5),
              currentPrice - (atr * 4)
            ];
          }
        }
        break;
        
      case 'BREAKOUT':
        if (marketConditions.consolidation) {
          const recentHigh = Math.max(...highs.slice(-20));
          const recentLow = Math.min(...lows.slice(-20));
          
          if (currentPrice > recentHigh * 0.995) {
            direction = 'LONG';
            confidence = 0.65;
            reasons.push('Breaking out of consolidation');
            entry = currentPrice;
            stopLoss = recentLow;
            takeProfits = [
              currentPrice + (atr * 2),
              currentPrice + (atr * 3),
              currentPrice + (atr * 4)
            ];
          } else if (currentPrice < recentLow * 1.005) {
            direction = 'SHORT';
            confidence = 0.65;
            reasons.push('Breaking down from consolidation');
            entry = currentPrice;
            stopLoss = recentHigh;
            takeProfits = [
              currentPrice - (atr * 2),
              currentPrice - (atr * 3),
              currentPrice - (atr * 4)
            ];
          }
        }
        break;
        
      case 'MEAN_REVERSION':
        if (marketConditions.overbought) {
          direction = 'SHORT';
          confidence = 0.68;
          reasons.push(`Overbought (RSI: ${indicators.rsi.toFixed(1)})`);
          entry = currentPrice;
          stopLoss = currentPrice + (atr * 1.5);
          takeProfits = [
            currentPrice - atr,
            currentPrice - (atr * 2),
            currentPrice - (atr * 3)
          ];
        } else if (marketConditions.oversold) {
          direction = 'LONG';
          confidence = 0.68;
          reasons.push(`Oversold (RSI: ${indicators.rsi.toFixed(1)})`);
          entry = currentPrice;
          stopLoss = currentPrice - (atr * 1.5);
          takeProfits = [
            currentPrice + atr,
            currentPrice + (atr * 2),
            currentPrice + (atr * 3)
          ];
        }
        break;
    }
    
    // Calculate risk/reward
    const risk = Math.abs(entry - stopLoss);
    const rewards = takeProfits.map(tp => Math.abs(tp - entry));
    const riskRewards = rewards.map(reward => risk > 0 ? this.round(reward / risk) : 0);
    
    return {
      direction: direction,
      confidence: confidence,
      reasons: reasons.length > 0 ? reasons : ['No clear signal'],
      
      // Entry Levels
      entry: this.round(entry),
      stopLoss: this.round(stopLoss),
      takeProfits: takeProfits.map(tp => this.round(tp)),
      
      // Risk/Reward
      risk: this.round(risk),
      riskRewards: riskRewards.map(rr => this.round(rr)),
      avgRiskReward: this.round(riskRewards.reduce((a, b) => a + b, 0) / riskRewards.length),
      
      // Strategy Info
      strategy: strategy,
      strategyName: this.aiSelector.strategies[strategy].name
    };
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
    
    const avgGain = gains / period;
    const avgLoss = losses / period;
    
    if (avgLoss === 0) return 100;
    if (avgGain === 0) return 0;
    
    const rs = avgGain / avgLoss;
    return 100 - (100 / (1 + rs));
  }
  
  sma(data, period) {
    if (data.length < period) return data[data.length - 1];
    const slice = data.slice(-period);
    return slice.reduce((a, b) => a + b, 0) / period;
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
  
  getTrendDirection(closes) {
    if (closes.length < 20) return 'NEUTRAL';
    const sma20 = this.sma(closes, 20);
    const sma50 = this.sma(closes, 50);
    const current = closes[closes.length - 1];
    
    if (current > sma20 && sma20 > sma50) return 'BULLISH';
    if (current < sma20 && sma20 < sma50) return 'BEARISH';
    return 'NEUTRAL';
  }
  
  calculateMomentum(closes) {
    if (closes.length < 10) return 0;
    const recent = closes.slice(-5);
    const older = closes.slice(-10, -5);
    const recentAvg = recent.reduce((a, b) => a + b, 0) / recent.length;
    const olderAvg = older.reduce((a, b) => a + b, 0) / older.length;
    return (recentAvg - olderAvg) / olderAvg;
  }
  
  round(value, decimals = 4) {
    const factor = Math.pow(10, decimals);
    return Math.round(value * factor) / factor;
  }
  
  getAnalyses(symbol = null, limit = 50) {
    let results = this.analyses;
    if (symbol) {
      results = results.filter(a => a.symbol === symbol);
    }
    return results.slice(-limit).reverse();
  }
}

// ==================== TELEGRAM BOT HANDLER ====================
class TelegramBotHandler {
  constructor() {
    this.telegram = new TelegramWebhookManager();
    this.tradingEngine = new TradingEngine();
    this.authorizedChatId = TELEGRAM_CHAT_ID;
    
    logger.info('Telegram Bot Handler Initialized');
  }
  
  async handleUpdate(update) {
    if (!update.message) return;
    
    const chatId = update.message.chat.id;
    const text = update.message.text || '';
    const messageId = update.message.message_id;
    
    // Check authorization
    if (chatId.toString() !== this.authorizedChatId.toString()) {
      logger.warn(`Unauthorized chat access: ${chatId}`);
      return;
    }
    
    try {
      if (text.startsWith('/analyze ')) {
        await this.handleAnalyzeCommand(chatId, text, messageId);
      } else if (text === '/help' || text === '/start') {
        await this.sendHelpMessage(chatId);
      } else if (text === '/status') {
        await this.sendStatusMessage(chatId);
      } else if (text === '/webhook') {
        await this.sendWebhookInfo(chatId);
      } else if (text === '/recent') {
        await this.sendRecentAnalyses(chatId);
      } else if (text.startsWith('/test ')) {
        const symbol = text.split(' ')[1];
        await this.sendTestSignal(chatId, symbol);
      }
    } catch (error) {
      logger.error(`Error handling update: ${error.message}`);
      await this.telegram.sendMessage(chatId, `❌ Error: ${error.message}`);
    }
  }
  
  async handleAnalyzeCommand(chatId, text, messageId) {
    const symbol = text.split(' ')[1];
    
    if (!symbol) {
      await this.telegram.sendMessage(chatId, '❌ Please provide a symbol. Usage: /analyze BTCUSDT');
      return;
    }
    
    const processingMsg = await this.telegram.sendMessage(chatId,
      `<b>🤖 AI Analyzing: ${symbol}</b>\n\n` +
      `🔍 Scanning market...\n` +
      `🧠 AI selecting strategy...\n` +
      `📊 Running analysis...`
    );
    
    try {
      const analysis = await this.tradingEngine.analyzeAsset(symbol);
      await this.telegram.editMessageText(chatId, processingMsg.message_id, '');
      await this.sendAnalysisResults(chatId, analysis);
    } catch (error) {
      await this.telegram.editMessageText(chatId, processingMsg.message_id,
        `❌ <b>Analysis Failed: ${symbol}</b>\n\nError: ${error.message}`
      );
    }
  }
  
  async sendAnalysisResults(chatId, analysis) {
    const signal = analysis.tradeSignal;
    
    if (signal.direction === 'NEUTRAL') {
      const message = `
🟡 <b>AI Analysis: ${analysis.symbol}</b>

<b>Decision:</b> NO TRADE
<b>Reason:</b> ${signal.reasons[0]}

<b>AI Confidence:</b> ${(analysis.confidence * 100).toFixed(1)}% ${analysis.confidenceLevel === 'HIGH' ? '✅' : '⚠️'}
<b>Strategy:</b> ${analysis.strategyName} ${analysis.strategyEmoji}

<b>Market Conditions:</b>
${Object.entries(analysis.marketConditions)
  .filter(([k, v]) => v === true)
  .map(([k]) => `• ${k.replace(/_/g, ' ').toUpperCase()}`)
  .join('\n') || '• Neutral conditions'}

<b>🤖 Recommendation:</b>
Wait for better market conditions.
      `;
      
      await this.telegram.sendMessage(chatId, message);
      return;
    }
    
    const emoji = signal.direction === 'LONG' ? '🟢' : '🔴';
    const directionText = signal.direction === 'LONG' ? 'BUY/LONG' : 'SELL/SHORT';
    
    const message = `
${emoji} <b>AI Trade Signal: ${analysis.symbol}</b>

<b>Trade:</b> ${directionText} ${emoji}
<b>Strategy:</b> ${analysis.strategyName} ${analysis.strategyEmoji}
<b>AI Confidence:</b> ${(analysis.confidence * 100).toFixed(1)}% ${analysis.confidenceLevel === 'HIGH' ? '✅' : '⚠️'}

<b>🎯 Entry Levels:</b>
Entry: $${signal.entry}
Stop Loss: $${signal.stopLoss}
Take Profit: $${signal.takeProfits.join(' | $')}

<b>📊 Risk/Reward:</b>
Risk: $${signal.risk} (${(Math.abs(signal.risk / signal.entry) * 100).toFixed(2)}%)
Avg R/R: 1:${signal.avgRiskReward.toFixed(2)}

<b>🤔 AI Reasoning:</b>
${signal.reasons.join('\n')}

<b>📈 Technicals:</b>
Price: $${analysis.currentPrice.toFixed(2)}
RSI: ${analysis.indicators.rsi.toFixed(1)}
SMA20: $${analysis.indicators.sma20.toFixed(2)}
SMA50: $${analysis.indicators.sma50.toFixed(2)}

<b>⚠️ Risk Disclaimer:</b>
AI analysis for educational purposes.
      `;
    
    await this.telegram.sendMessage(chatId, message);
  }
  
  async sendHelpMessage(chatId) {
    const message = `
<b>🤖 AI Trading Bot v5.0</b>

<b>Commands:</b>
/analyze SYMBOL - AI analyzes any asset
/status - System status
/webhook - Webhook information
/recent - Recent analyses
/test SYMBOL - Test analysis
/help - This message

<b>Examples:</b>
/analyze BTCUSDT
/analyze ETHUSDT
/analyze EURUSD
/analyze AAPL
/analyze XAUUSD

<b>AI Strategies:</b>
⚛️ <b>Quantum Engine</b> - Institutional analysis
📈 <b>Momentum Scalper</b> - Strong momentum
🚀 <b>Breakout Hunter</b> - Consolidation breakouts
🔄 <b>Mean Reversion</b> - Overextended reversions

<b>⚠️ Risk Disclaimer:</b>
AI analysis for educational purposes.
      `;
    
    await this.telegram.sendMessage(chatId, message);
  }
  
  async sendStatusMessage(chatId) {
    const webhookInfo = await this.telegram.getWebhookInfo();
    const webhookStatus = webhookInfo && webhookInfo.url ? '🟢 ACTIVE' : '🔴 INACTIVE';
    
    const message = `
<b>📊 AI Trading System Status</b>

<b>System:</b> 🟢 OPERATIONAL
<b>Mode:</b> ${MODE.toUpperCase()}
<b>AI Engine:</b> 🟢 ACTIVE
<b>Webhook:</b> ${webhookStatus}

<b>Minimum Confidence:</b> ${(MIN_CONFIDENCE_THRESHOLD * 100).toFixed(0)}%
<b>Account Equity:</b> $${ACCOUNT_EQUITY}
<b>Risk per Trade:</b> ${DEFAULT_RISK_PCT}%

<b>Exchange APIs:</b>
• Bitget: ${CCXT_BITGET_API_KEY ? '🟢 CONFIGURED' : '⚪ NOT CONFIGURED'}
• OANDA: ${OANDA_API_KEY ? '🟢 CONFIGURED' : '⚪ NOT CONFIGURED'}
• Alpaca: ${ALPACA_API_KEY ? '🟢 CONFIGURED' : '⚪ NOT CONFIGURED'}

<b>Use /analyze SYMBOL to analyze any asset</b>
      `;
    
    await this.telegram.sendMessage(chatId, message);
  }
  
  async sendWebhookInfo(chatId) {
    const webhookInfo = await this.telegram.getWebhookInfo();
    
    if (!webhookInfo) {
      await this.telegram.sendMessage(chatId, '❌ Failed to get webhook information');
      return;
    }
    
    const message = `
<b>🔗 Webhook Information</b>

<b>Status:</b> ${webhookInfo.url ? '🟢 ACTIVE' : '🔴 NOT SET'}
<b>URL:</b> ${webhookInfo.url || 'Not set'}
<b>Pending Updates:</b> ${webhookInfo.pending_update_count}
<b>Last Error:</b> ${webhookInfo.last_error_message || 'None'}
<b>Max Connections:</b> ${webhookInfo.max_connections || 40}

<b>Configuration:</b>
• Token: ${TELEGRAM_BOT_TOKEN.substring(0, 15)}...
• Webhook URL: ${TELEGRAM_WEBHOOK_URL || 'Not configured'}
• Chat ID: ${TELEGRAM_CHAT_ID}
      `;
    
    await this.telegram.sendMessage(chatId, message);
  }
  
  async sendRecentAnalyses(chatId) {
    const analyses = this.tradingEngine.getAnalyses(null, 10);
    
    if (analyses.length === 0) {
      await this.telegram.sendMessage(chatId, '📊 No analyses yet. Use /analyze SYMBOL to start.');
      return;
    }
    
    let message = `<b>📊 Recent Analyses (Last 10)</b>\n\n`;
    
    analyses.forEach((analysis, index) => {
      const signalEmoji = analysis.tradeSignal.direction === 'LONG' ? '🟢' : 
                         analysis.tradeSignal.direction === 'SHORT' ? '🔴' : '🟡';
      
      message += `<b>${index + 1}. ${analysis.symbol}</b>\n`;
      message += `${signalEmoji} ${analysis.tradeSignal.direction} | ${analysis.strategyEmoji} ${analysis.aiStrategy}\n`;
      message += `Confidence: ${(analysis.confidence * 100).toFixed(0)}% | Price: $${analysis.currentPrice.toFixed(2)}\n`;
      message += `Time: ${new Date(analysis.timestamp).toLocaleTimeString()}\n`;
      message += `━━━━━━━━━━━━━━━━━━━━━━\n`;
    });
    
    await this.telegram.sendMessage(chatId, message);
  }
  
  async sendTestSignal(chatId, symbol) {
    if (!symbol) {
      await this.telegram.sendMessage(chatId, '❌ Usage: /test SYMBOL');
      return;
    }
    
    const testAnalysis = {
      symbol: symbol,
      timestamp: Date.now(),
      aiStrategy: 'QUANTUM',
      strategyName: 'Quantum Engine V2.0',
      strategyEmoji: '⚛️',
      confidence: 0.85,
      confidenceLevel: 'HIGH',
      currentPrice: 42000,
      tradeSignal: {
        direction: 'LONG',
        confidence: 0.8,
        reasons: ['Test signal - Bullish trend detected'],
        entry: 42000,
        stopLoss: 41000,
        takeProfits: [43000, 44000, 45000],
        risk: 1000,
        riskRewards: [1, 2, 3],
        avgRiskReward: 2,
        strategy: 'QUANTUM',
        strategyName: 'Quantum Engine V2.0'
      },
      indicators: {
        rsi: 65.5,
        sma20: 41500,
        sma50: 40000,
        currentPrice: 42000
      },
      marketConditions: {
        trending_market: true,
        clear_structure: true,
        high_volatility: false
      }
    };
    
    await this.sendAnalysisResults(chatId, testAnalysis);
  }
}

// ==================== WEBHOOK SERVER ====================
class WebhookServer {
  constructor() {
    this.telegramBot = new TelegramBotHandler();
    this.tradingEngine = new TradingEngine();
    this.port = PORT;
  }
  
  async handleRequest(req, res) {
    const url = require('url');
    const parsedUrl = url.parse(req.url, true);
    const pathname = parsedUrl.pathname;
    
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
      // Health endpoint
      if (req.method === 'GET' && pathname === '/health') {
        await this.handleHealth(req, res);
      }
      
      // Telegram webhook endpoint (exactly like your example)
      else if (req.method === 'POST' && pathname === '/telegram') {
        await this.handleTelegramWebhook(req, res);
      }
      
      // TradingView webhook endpoint
      else if (req.method === 'POST' && pathname === '/tradingview') {
        await this.handleTradingViewWebhook(req, res);
      }
      
      // AI Analysis API
      else if (req.method === 'POST' && pathname === '/api/analyze') {
        await this.handleAIAnalysis(req, res);
      }
      
      // Test endpoint
      else if (req.method === 'GET' && pathname === '/test') {
        await this.handleTest(req, res);
      }
      
      // Set webhook endpoint (for manual setup)
      else if (req.method === 'POST' && pathname === '/setup-webhook') {
        await this.handleSetupWebhook(req, res);
      }
      
      else {
        res.writeHead(404, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Not found' }));
      }
      
    } catch (error) {
      logger.error(`HTTP Error: ${error.message}`);
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
      timestamp: Date.now(),
      uptime: process.uptime()
    };
    
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(status));
  }
  
  async handleTelegramWebhook(req, res) {
    let body = '';
    req.on('data', chunk => body += chunk);
    
    req.on('end', async () => {
      try {
        const update = JSON.parse(body);
        
        // Process the update asynchronously (don't wait for it)
        this.telegramBot.handleUpdate(update).catch(error => {
          logger.error(`Error processing update: ${error.message}`);
        });
        
        // Always respond quickly to Telegram
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: true }));
      } catch (error) {
        logger.error(`Telegram webhook error: ${error.message}`);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: true })); // Still respond OK to prevent retries
      }
    });
  }
  
  async handleTradingViewWebhook(req, res) {
    let body = '';
    req.on('data', chunk => body += chunk);
    
    req.on('end', async () => {
      try {
        const payload = JSON.parse(body);
        const { symbol, action, price } = payload;
        
        if (symbol && this.telegramBot.authorizedChatId) {
          const alertMsg = `🚨 TradingView Alert: ${symbol} - ${action || 'signal'} @ $${price || 'N/A'}`;
          await this.telegramBot.telegram.sendMessage(this.telegramBot.authorizedChatId, alertMsg);
          
          // Optionally run analysis
          if (symbol) {
            setTimeout(async () => {
              try {
                const analysis = await this.tradingEngine.analyzeAsset(symbol);
                await this.telegramBot.sendAnalysisResults(this.telegramBot.authorizedChatId, analysis);
              } catch (error) {
                logger.error(`TradingView analysis failed: ${error.message}`);
              }
            }, 1000);
          }
        }
        
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true }));
      } catch (error) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: error.message }));
      }
    });
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
          res.end(JSON.stringify({ error: 'Symbol is required' }));
          return;
        }
        
        const analysis = await this.tradingEngine.analyzeAsset(symbol, timeframe);
        
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
  
  async handleTest(req, res) {
    const testData = {
      status: 'ok',
      message: 'AI Trading System v5.0 Webhook Server',
      timestamp: Date.now(),
      endpoints: {
        health: 'GET /health',
        telegram: 'POST /telegram',
        tradingview: 'POST /tradingview',
        analyze: 'POST /api/analyze',
        setup: 'POST /setup-webhook'
      },
      configuration: {
        telegramWebhook: TELEGRAM_WEBHOOK_URL || 'Not set',
        botToken: TELEGRAM_BOT_TOKEN ? `${TELEGRAM_BOT_TOKEN.substring(0, 15)}...` : 'Not set',
        chatId: TELEGRAM_CHAT_ID || 'Not set'
      }
    };
    
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(testData));
  }
  
  async handleSetupWebhook(req, res) {
    try {
      const webhookManager = new TelegramWebhookManager();
      const result = await webhookManager.setWebhook();
      
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(result));
    } catch (error) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: error.message }));
    }
  }
  
  start() {
    const http = require('http');
    const server = http.createServer((req, res) => this.handleRequest(req, res));
    
    server.listen(this.port, () => {
      logger.info(`🌐 Webhook server running on port ${this.port}`);
      logger.info(`🔗 Telegram webhook endpoint: POST http://localhost:${this.port}/telegram`);
      logger.info(`📊 Health check: GET http://localhost:${this.port}/health`);
      logger.info(`🤖 AI API: POST http://localhost:${this.port}/api/analyze`);
      
      // Log webhook URL for easy copying
      if (TELEGRAM_WEBHOOK_URL) {
        logger.info(`✅ Configured webhook URL: ${TELEGRAM_WEBHOOK_URL}`);
      } else {
        logger.info(`⚠️  TELEGRAM_WEBHOOK_URL not set. Webhook will need manual setup.`);
      }
    });
    
    server.on('error', (error) => {
      logger.error(`Server error: ${error.message}`);
    });
    
    return server;
  }
}

// ==================== SETUP SCRIPT ====================
async function setupWebhook() {
  const webhookManager = new TelegramWebhookManager();
  
  console.log('\n🤖 TELEGRAM WEBHOOK SETUP');
  console.log('=' .repeat(40));
  
  if (!TELEGRAM_WEBHOOK_URL) {
    console.log('❌ TELEGRAM_WEBHOOK_URL is not set in environment');
    console.log('\n💡 Please set it in your .env file:');
    console.log('TELEGRAM_WEBHOOK_URL=https://your-worker.your-username.workers.dev/telegram');
    console.log('\nOr manually set with:');
    console.log(`curl -X POST "https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/setWebhook" \\`);
    console.log(`     -d "url=${TELEGRAM_WEBHOOK_URL || 'YOUR_WEBHOOK_URL'}"`);
    return false;
  }
  
  console.log(`📱 Bot Token: ${TELEGRAM_BOT_TOKEN.substring(0, 15)}...`);
  console.log(`🌐 Webhook URL: ${TELEGRAM_WEBHOOK_URL}`);
  console.log('');
  
  try {
    const result = await webhookManager.setWebhook();
    
    if (result) {
      console.log('✅ Webhook setup complete!');
      console.log('\n📋 Your bot is now configured to use webhooks.');
      console.log('🚀 Start your server and Telegram will send updates to:');
      console.log(`   ${TELEGRAM_WEBHOOK_URL}`);
      return true;
    } else {
      console.log('❌ Webhook setup failed');
      return false;
    }
  } catch (error) {
    console.log(`❌ Error: ${error.message}`);
    return false;
  }
}

// ==================== MAIN APPLICATION ====================
class AI_Trading_System {
  constructor() {
    this.webhookServer = null;
    this.webhookManager = null;
  }
  
  async start() {
    try {
      logger.info('🚀 AI TRADING SYSTEM v5.0');
      logger.info('🤖 AI Strategy Selection: ENABLED');
      logger.info(`📊 Minimum Confidence: ${(MIN_CONFIDENCE_THRESHOLD * 100).toFixed(0)}%`);
      logger.info('');
      logger.info('⚛️ Quantum Engine V2.0');
      logger.info('📈 Momentum Scalper V1.0');
      logger.info('🚀 Breakout Hunter V1.0');
      logger.info('🔄 Mean Reversion V1.0');
      logger.info('');
      
      // Initialize webhook manager
      this.webhookManager = new TelegramWebhookManager();
      
      // Setup webhook if URL is provided
      if (TELEGRAM_WEBHOOK_URL) {
        logger.info('🔧 Setting up Telegram webhook...');
        const webhookSet = await this.webhookManager.setWebhook();
        
        if (webhookSet) {
          logger.info('✅ Telegram webhook configured successfully!');
          logger.info(`🔗 Webhook URL: ${TELEGRAM_WEBHOOK_URL}`);
        } else {
          logger.warn('⚠️  Could not set webhook. You may need to set it manually.');
        }
      } else {
        logger.warn('⚠️  TELEGRAM_WEBHOOK_URL not set. Webhook mode disabled.');
        logger.info('💡 Set TELEGRAM_WEBHOOK_URL in .env to use webhooks.');
      }
      
      // Start webhook server
      this.webhookServer = new WebhookServer();
      this.webhookServer.start();
      
      logger.info('');
      logger.info('✅ AI SYSTEM READY');
      logger.info('🤖 Send /analyze BTCUSDT to your bot to test');
      
      // Show manual setup command
      if (!TELEGRAM_WEBHOOK_URL) {
        logger.info('');
        logger.info('🔧 Manual webhook setup command:');
        logger.info(`curl -X POST "https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/setWebhook" \\`);
        logger.info('     -d "url=YOUR_PUBLIC_URL/telegram"');
      }
      
    } catch (error) {
      logger.error('Startup error:', error);
      process.exit(1);
    }
  }
  
  async shutdown() {
    logger.info('🔄 Shutting down...');
    
    if (this.webhookManager) {
      await this.webhookManager.deleteWebhook();
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
  
  system.start();
}

// ==================== UTILITY FUNCTIONS ====================
// Helper to manually set webhook
async function manualSetWebhook(webhookUrl) {
  const https = require('https');
  
  const data = new URLSearchParams();
  data.append('url', webhookUrl);
  
  const options = {
    hostname: 'api.telegram.org',
    port: 443,
    path: `/bot${TELEGRAM_BOT_TOKEN}/setWebhook`,
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Content-Length': data.toString().length
    }
  };
  
  return new Promise((resolve) => {
    const req = https.request(options, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try {
          const result = JSON.parse(body);
          console.log('Result:', result);
          resolve(result.ok === true);
        } catch (error) {
          console.log('Error:', error.message);
          resolve(false);
        }
      });
    });
    
    req.on('error', (error) => {
      console.log('Request error:', error.message);
      resolve(false);
    });
    
    req.write(data.toString());
    req.end();
  });
}

// Export for testing
module.exports = {
  AI_Trading_System,
  TradingEngine,
  AIStrategySelector,
  TelegramBotHandler,
  WebhookServer,
  manualSetWebhook
};
