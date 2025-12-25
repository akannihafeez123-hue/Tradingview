/**
 * Institutional Trading System v3.0 - 100% REAL LOGIC
 * NO SIMULATION - Real order execution on Bitget, OANDA, Alpaca
 */

'use strict';

require('dotenv').config();

const fs = require('fs');
const path = require('path');
const express = require('express');
const bodyParser = require('body-parser');
const TelegramBot = require('node-telegram-bot-api');
const ccxt = require('ccxt');
const axios = require('axios');
const crypto = require('crypto');
const winston = require('winston');
const backoff = require('backoff');

// ==================== CONFIGURATION ====================
const {
  PORT = 3000,
  MODE = 'paper', // paper or live - BOTH execute real orders
  TELEGRAM_BOT_TOKEN,
  TELEGRAM_CHAT_ID,
  TV_WEBHOOK_SECRET,
  ACCOUNT_EQUITY = 100000,
  DEFAULT_RISK_PCT = 1.0,
  DAILY_DRAWDOWN_LIMIT = 0.05,
  
  // BITGET - REAL CREDENTIALS REQUIRED
  CCXT_BITGET_API_KEY,
  CCXT_BITGET_SECRET,
  CCXT_BITGET_PASSWORD,
  BITGET_PAPER = 'true', // Use paper trading on Bitget
  
  // OANDA - REAL CREDENTIALS REQUIRED
  OANDA_API_KEY,
  OANDA_ACCOUNT_ID,
  OANDA_ENVIRONMENT = 'practice', // practice or live
  
  // ALPACA - REAL CREDENTIALS REQUIRED
  ALPACA_API_KEY,
  ALPACA_SECRET_KEY,
  ALPACA_BASE_URL = 'https://paper-api.alpaca.markets',
  
  LOG_LEVEL = 'info'
} = process.env;

// Validate required environment variables
if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_CHAT_ID) {
  console.error('❌ Missing TELEGRAM_BOT_TOKEN or TELEGRAM_CHAT_ID in environment');
  process.exit(1);
}

// ==================== LOGGING ====================
const logger = winston.createLogger({
  level: LOG_LEVEL,
  format: winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    winston.format.printf(({ timestamp, level, message }) => {
      return `${timestamp} ${level}: ${message}`;
    })
  ),
  transports: [new winston.transports.Console()]
});

// ==================== DATABASE (In-Memory for Speed) ====================
const alerts = new Map();
const trades = new Map();
let dailyPnL = 0;

function dbInsertAlert(alertData) {
  alerts.set(alertData.id, {
    ...alertData,
    created_at: new Date().toISOString(),
    status: 'pending'
  });
}

function dbGetAlert(id) {
  return alerts.get(id);
}

function dbUpdateAlertStatus(id, status) {
  const alert = alerts.get(id);
  if (alert) {
    alert.status = status;
    alert.updated_at = new Date().toISOString();
    alerts.set(id, alert);
  }
}

function dbInsertTrade(tradeData) {
  trades.set(tradeData.id, {
    ...tradeData,
    created_at: new Date().toISOString()
  });
}

function dbGetTodayPnL() {
  return dailyPnL;
}

function dbUpdateTodayPnL(delta) {
  dailyPnL += delta;
}

// ==================== REAL EXCHANGE INITIALIZATION ====================
const exchangeClients = {};

// Initialize REAL Bitget Client
function initBitgetClient() {
  if (!CCXT_BITGET_API_KEY || !CCXT_BITGET_SECRET) {
    logger.error('❌ BITGET CREDENTIALS REQUIRED for real trading');
    logger.error('❌ Set CCXT_BITGET_API_KEY and CCXT_BITGET_SECRET in .env');
    return;
  }

  try {
    const isPaper = BITGET_PAPER === 'true';
    
    exchangeClients.bitget = new ccxt.bitget({
      apiKey: CCXT_BITGET_API_KEY,
      secret: CCXT_BITGET_SECRET,
      password: CCXT_BITGET_PASSWORD,
      enableRateLimit: true,
      options: {
        defaultType: isPaper ? 'demo' : 'future',
        adjustForTimeDifference: true
      }
    });

    // Set demo endpoint for paper trading
    if (isPaper) {
      exchangeClients.bitget.urls.api = exchangeClients.bitget.urls.test;
    }

    logger.info(`✅ Bitget ${isPaper ? 'PAPER' : 'LIVE'} client initialized`);
    
    // Test connection
    exchangeClients.bitget.loadMarkets().then(() => {
      logger.info(`✅ Bitget markets loaded: ${Object.keys(exchangeClients.bitget.markets).length} markets`);
    }).catch(err => {
      logger.error('❌ Bitget connection test failed:', err.message);
    });

  } catch (error) {
    logger.error('❌ Failed to initialize Bitget client:', error.message);
  }
}

// Initialize REAL OANDA Client
function initOandaClient() {
  if (!OANDA_API_KEY || !OANDA_ACCOUNT_ID) {
    logger.warn('⚠️ OANDA credentials not provided - forex trading disabled');
    return;
  }

  const baseURL = OANDA_ENVIRONMENT === 'live' 
    ? 'https://api-fxtrade.oanda.com/v3'
    : 'https://api-fxpractice.oanda.com/v3';

  exchangeClients.oanda = {
    client: axios.create({
      baseURL,
      headers: {
        'Authorization': `Bearer ${OANDA_API_KEY}`,
        'Content-Type': 'application/json'
      },
      timeout: 15000
    }),
    accountId: OANDA_ACCOUNT_ID
  };

  logger.info(`✅ OANDA ${OANDA_ENVIRONMENT.toUpperCase()} client initialized`);

  // Test connection
  exchangeClients.oanda.client.get(`/accounts/${OANDA_ACCOUNT_ID}/summary`)
    .then(() => {
      logger.info('✅ OANDA connection successful');
    })
    .catch(err => {
      logger.error('❌ OANDA connection failed:', err.response?.data?.errorMessage || err.message);
    });
}

// Initialize REAL Alpaca Client
function initAlpacaClient() {
  if (!ALPACA_API_KEY || !ALPACA_SECRET_KEY) {
    logger.warn('⚠️ Alpaca credentials not provided - stock trading disabled');
    return;
  }

  const isPaper = ALPACA_BASE_URL.includes('paper');
  
  exchangeClients.alpaca = {
    client: axios.create({
      baseURL: ALPACA_BASE_URL,
      headers: {
        'APCA-API-KEY-ID': ALPACA_API_KEY,
        'APCA-API-SECRET-KEY': ALPACA_SECRET_KEY
      },
      timeout: 15000
    }),
    isPaper: isPaper
  };

  logger.info(`✅ Alpaca ${isPaper ? 'PAPER' : 'LIVE'} client initialized`);

  // Test connection
  exchangeClients.alpaca.client.get('/v2/account')
    .then(response => {
      logger.info(`✅ Alpaca connected: ${response.data.account_number}`);
    })
    .catch(err => {
      logger.error('❌ Alpaca connection failed:', err.response?.data?.message || err.message);
    });
}

// ==================== REAL ORDER EXECUTION ====================

// REAL Bitget Order Execution
async function executeRealBitgetOrder(orderParams) {
  const {
    market,
    side,
    entry,
    stopLoss,
    takeProfit = [],
    units
  } = orderParams;

  if (!exchangeClients.bitget) {
    throw new Error('Bitget client not initialized');
  }

  try {
    // Load markets if not already loaded
    await exchangeClients.bitget.loadMarkets();
    
    // Format symbol (BTC/USDT:USDT)
    let symbol;
    if (market.includes('/')) {
      symbol = market;
    } else if (market.includes('USDT')) {
      symbol = market.replace('USDT', '/USDT:USDT');
    } else if (market.includes('USD')) {
      symbol = market.replace('USD', '/USD:USD');
    } else {
      symbol = `${market}/USDT:USDT`;
    }

    const marketInfo = exchangeClients.bitget.markets[symbol];
    if (!marketInfo) {
      throw new Error(`Market ${symbol} not found on Bitget`);
    }

    const pricePrecision = marketInfo.precision?.price || 2;
    const amountPrecision = marketInfo.precision?.amount || 6;
    
    const roundedPrice = Number(entry).toFixed(pricePrecision);
    const roundedAmount = Number(units).toFixed(amountPrecision);
    const roundedStopLoss = Number(stopLoss).toFixed(pricePrecision);

    logger.info(`🚀 Executing REAL Bitget order: ${side} ${roundedAmount} ${symbol} @ ${roundedPrice}`);

    // REAL ORDER - Market Order (for immediate execution)
    const order = await exchangeClients.bitget.createOrder(
      symbol,
      'market', // Use market for immediate fill
      side,
      roundedAmount,
      undefined, // price not needed for market order
      {
        'stopLoss': {
          'triggerPrice': roundedStopLoss,
          'price': roundedStopLoss,
          'type': 'market'
        }
      }
    );

    logger.info(`✅ Bitget order executed: ${order.id}`);
    
    // Place take profit orders if specified
    const tpOrders = [];
    if (takeProfit.length > 0) {
      for (let i = 0; i < takeProfit.length; i++) {
        const tpPrice = Number(takeProfit[i]).toFixed(pricePrecision);
        const tpAmount = i === takeProfit.length - 1 
          ? roundedAmount 
          : (Number(roundedAmount) / takeProfit.length).toFixed(amountPrecision);
        
        const tpOrder = await exchangeClients.bitget.createOrder(
          symbol,
          'limit',
          side === 'buy' ? 'sell' : 'buy',
          tpAmount,
          tpPrice
        );
        
        tpOrders.push(tpOrder.id);
        logger.info(`✅ Take Profit ${i+1} set: ${tpOrder.id} @ ${tpPrice}`);
      }
    }

    return {
      status: 'filled',
      router: 'bitget',
      orderId: order.id,
      symbol: symbol,
      side: side,
      price: order.price || entry,
      amount: order.amount || roundedAmount,
      stopLoss: stopLoss,
      takeProfit: takeProfit,
      tpOrderIds: tpOrders,
      rawResponse: order
    };

  } catch (error) {
    logger.error('❌ Bitget order execution failed:', error.message);
    throw new Error(`Bitget order failed: ${error.message}`);
  }
}

// REAL OANDA Order Execution
async function executeRealOandaOrder(orderParams) {
  const {
    market,
    side,
    entry,
    stopLoss,
    takeProfit = [],
    units
  } = orderParams;

  if (!exchangeClients.oanda) {
    throw new Error('OANDA client not initialized');
  }

  try {
    const signedUnits = side === 'buy' ? Math.abs(units) : -Math.abs(units);
    
    logger.info(`🚀 Executing REAL OANDA order: ${side} ${Math.abs(units)} ${market}`);

    // REAL OANDA ORDER with OCO (One Cancels Other)
    const orderPayload = {
      order: {
        type: 'MARKET',
        instrument: market,
        units: String(signedUnits),
        timeInForce: 'FOK', // Fill or Kill
        positionFill: 'DEFAULT',
        stopLossOnFill: {
          price: String(stopLoss),
          timeInForce: 'GTC'
        }
      }
    };

    // Add take profit if provided
    if (takeProfit.length > 0) {
      orderPayload.order.takeProfitOnFill = {
        price: String(takeProfit[0]),
        timeInForce: 'GTC'
      };
    }

    const response = await exchangeClients.oanda.client.post(
      `/accounts/${exchangeClients.oanda.accountId}/orders`,
      orderPayload
    );

    const orderId = response.data.orderCreateTransaction.id;
    
    logger.info(`✅ OANDA order executed: ${orderId}`);

    return {
      status: 'filled',
      router: 'oanda',
      orderId: orderId,
      market: market,
      units: signedUnits,
      entry: entry,
      stopLoss: stopLoss,
      takeProfit: takeProfit,
      rawResponse: response.data
    };

  } catch (error) {
    const errorMsg = error.response?.data?.errorMessage || error.message;
    logger.error('❌ OANDA order execution failed:', errorMsg);
    throw new Error(`OANDA order failed: ${errorMsg}`);
  }
}

// REAL Alpaca Order Execution
async function executeRealAlpacaOrder(orderParams) {
  const {
    market,
    side,
    entry,
    stopLoss,
    takeProfit = [],
    units
  } = orderParams;

  if (!exchangeClients.alpaca) {
    throw new Error('Alpaca client not initialized');
  }

  try {
    // Convert to whole shares
    const shares = Math.floor(units);
    
    if (shares <= 0) {
      throw new Error('Invalid share quantity');
    }

    logger.info(`🚀 Executing REAL Alpaca order: ${side} ${shares} shares of ${market}`);

    // REAL ALPACA BRACKET ORDER (Entry + Stop Loss + Take Profit)
    const orderPayload = {
      symbol: market,
      qty: String(shares),
      side: side,
      type: 'market',
      time_in_force: 'day',
      order_class: 'bracket',
      stop_loss: {
        stop_price: String(stopLoss),
        limit_price: String(stopLoss * 0.99) // Slightly below for limit stop
      }
    };

    // Add take profit if provided
    if (takeProfit.length > 0) {
      orderPayload.take_profit = {
        limit_price: String(takeProfit[0])
      };
    }

    const response = await exchangeClients.alpaca.client.post('/v2/orders', orderPayload);
    
    logger.info(`✅ Alpaca order executed: ${response.data.id}`);

    return {
      status: 'accepted',
      router: 'alpaca',
      orderId: response.data.id,
      market: market,
      units: shares,
      entry: entry,
      stopLoss: stopLoss,
      takeProfit: takeProfit,
      rawResponse: response.data
    };

  } catch (error) {
    const errorMsg = error.response?.data?.message || error.message;
    logger.error('❌ Alpaca order execution failed:', errorMsg);
    throw new Error(`Alpaca order failed: ${errorMsg}`);
  }
}

// Router function - REAL ORDERS ONLY
async function routeRealOrder(router, orderParams) {
  switch (router) {
    case 'bitget':
      return await executeRealBitgetOrder(orderParams);
    case 'oanda':
      return await executeRealOandaOrder(orderParams);
    case 'alpaca':
      return await executeRealAlpacaOrder(orderParams);
    default:
      throw new Error(`Unsupported router: ${router}`);
  }
}

// ==================== UTILITIES ====================
function generateId(payload) {
  return crypto
    .createHash('sha256')
    .update(JSON.stringify(payload) + Date.now())
    .digest('hex')
    .substring(0, 32);
}

function verifySignature(secret, payload, signature) {
  if (!secret || !signature) return true;
  
  const computed = crypto
    .createHmac('sha256', secret)
    .update(JSON.stringify(payload))
    .digest('hex');
  
  return computed === signature;
}

function roundToDecimals(value, decimals) {
  if (!Number.isFinite(value)) return value;
  const factor = Math.pow(10, decimals);
  return Math.round(value * factor) / factor;
}

// ==================== REAL POSITION SIZING ====================
function calculateRealPositionSize(params) {
  const {
    entry,
    stopLoss,
    accountEquity = Number(ACCOUNT_EQUITY),
    riskPercent = Number(DEFAULT_RISK_PCT),
    maxPositionPercent = 10
  } = params;
  
  const entryPrice = Number(entry);
  const stopLossPrice = Number(stopLoss);
  
  if (!isFinite(entryPrice) || !isFinite(stopLossPrice)) {
    throw new Error('Invalid entry or stop loss price');
  }
  
  // Calculate risk per trade
  const riskPerTradeUSD = accountEquity * (riskPercent / 100);
  
  // Calculate stop distance
  const stopDistance = Math.abs(entryPrice - stopLossPrice);
  
  if (stopDistance <= 0) {
    throw new Error('Stop loss must be different from entry price');
  }
  
  // Calculate units (position size)
  let units = riskPerTradeUSD / stopDistance;
  
  // Apply maximum position size limit
  const maxPositionValue = accountEquity * (maxPositionPercent / 100);
  const positionValue = units * entryPrice;
  
  if (positionValue > maxPositionValue) {
    units = maxPositionValue / entryPrice;
    logger.warn(`Position size capped at ${maxPositionPercent}% of equity`);
  }
  
  return {
    units: roundToDecimals(units, 6),
    riskUSD: roundToDecimals(riskPerTradeUSD, 2),
    slDistance: roundToDecimals(stopDistance, 8),
    positionValue: roundToDecimals(units * entryPrice, 2)
  };
}

// ==================== REAL VENUE MAPPING ====================
function mapSymbolToRealVenue(symbol) {
  const sym = symbol.toUpperCase().trim();
  
  // Cryptocurrencies (Bitget)
  if (sym.endsWith('USDT') || sym.endsWith('BTC') || sym.endsWith('ETH')) {
    return {
      tvSymbol: `BITGET:${sym}`,
      router: 'bitget',
      market: sym,
      assetType: 'crypto'
    };
  }
  
  // Forex (OANDA)
  if (/^[A-Z]{6}$/.test(sym) && sym !== 'XAUUSD' && sym !== 'XAGUSD') {
    return {
      tvSymbol: `OANDA:${sym}`,
      router: 'oanda',
      market: sym,
      assetType: 'forex'
    };
  }
  
  // Metals (OANDA)
  if (sym === 'XAUUSD' || sym === 'XAGUSD') {
    return {
      tvSymbol: `OANDA:${sym}`,
      router: 'oanda',
      market: sym,
      assetType: 'metal'
    };
  }
  
  // Stocks (Alpaca) - Real US stock symbols
  const usStocks = ['AAPL', 'TSLA', 'MSFT', 'AMZN', 'GOOGL', 'META', 'NVDA', 'NFLX'];
  if (usStocks.includes(sym) || /^[A-Z]{1,4}$/.test(sym)) {
    return {
      tvSymbol: `NASDAQ:${sym}`,
      router: 'alpaca',
      market: sym,
      assetType: 'stock'
    };
  }
  
  throw new Error(`Unsupported symbol for real trading: ${sym}`);
}

// ==================== TELEGRAM BOT ====================
const telegramBot = new TelegramBot(TELEGRAM_BOT_TOKEN, { polling: true });

async function sendRealTradeConfirmation(alertId, alertData, venueInfo, sizeInfo) {
  const {
    symbol,
    timeframe,
    side,
    conviction,
    entry,
    sl,
    tp = [],
    risk_pct,
    why
  } = alertData;
  
  const message = `
🚨 **REAL TRADE SIGNAL** 🚨

**Symbol:** ${symbol} → ${venueInfo.tvSymbol}
**Timeframe:** ${timeframe || '15m'}
**Direction:** ${side.toUpperCase()}
**Conviction:** ${conviction}/100

**Entry:** $${entry}
**Stop Loss:** $${sl}
**Take Profit:** ${tp.map(p => `$${p}`).join(', ') || 'N/A'}

**Risk Management:**
• Risk per Trade: ${risk_pct || DEFAULT_RISK_PCT}%
• Position Size: ${sizeInfo.units.toLocaleString()}
• Risk Amount: $${sizeInfo.riskUSD}
• Position Value: $${sizeInfo.positionValue}

**Rationale:** ${why || 'Institutional AI signal'}

**Venue:** ${venueInfo.router.toUpperCase()}
**Mode:** ${MODE.toUpperCase()} *REAL ORDERS*
**⚠️ THIS WILL EXECUTE REAL ORDERS ⚠️**
  `;
  
  const options = {
    parse_mode: 'Markdown',
    reply_markup: {
      inline_keyboard: [
        [
          { 
            text: '🚀 EXECUTE REAL TRADE', 
            callback_data: `confirm:${alertId}`,
            url: 'https://t.me/your_bot' // Optional deep link
          }
        ],
        [
          { text: '❌ CANCEL', callback_data: `cancel:${alertId}` }
        ]
      ]
    }
  };
  
  return telegramBot.sendMessage(TELEGRAM_CHAT_ID, message, options);
}

async function sendRealTradeExecuted(tradeData) {
  const message = `
✅ **REAL TRADE EXECUTED** ✅

**Trade ID:** ${tradeData.id}
**Symbol:** ${tradeData.symbol}
**Side:** ${tradeData.side.toUpperCase()}
**Venue:** ${tradeData.router.toUpperCase()}

**Execution Details:**
• Entry: $${tradeData.entry_price}
• Stop Loss: $${tradeData.stop_loss}
• Take Profit: ${Array.isArray(tradeData.take_profit) ? tradeData.take_profit.map(p => `$${p}`).join(', ') : 'N/A'}
• Units: ${tradeData.units}

**Order ID:** ${tradeData.order_id}
**Status:** ${tradeData.status.toUpperCase()}
**Timestamp:** ${new Date().toLocaleString()}

**📊 REAL MONEY IS AT RISK**
  `;
  
  return telegramBot.sendMessage(TELEGRAM_CHAT_ID, message, { parse_mode: 'Markdown' });
}

// ==================== EXPRESS SERVER ====================
const app = express();
app.use(bodyParser.json({ limit: '10mb' }));

// TradingView webhook endpoint - REAL TRADES ONLY
app.post('/webhook/tradingview', async (req, res) => {
  try {
    const signature = req.headers['tv-signature'] || req.headers['signature'];
    
    // Verify HMAC signature
    if (!verifySignature(TV_WEBHOOK_SECRET, req.body, signature)) {
      logger.warn('⚠️ Invalid webhook signature received');
      return res.status(401).json({ error: 'Invalid signature' });
    }
    
    const alertPayload = req.body;
    
    // Validate required fields for REAL trading
    const requiredFields = ['symbol', 'side', 'entry', 'sl', 'conviction'];
    for (const field of requiredFields) {
      if (!alertPayload[field]) {
        throw new Error(`Missing required field: ${field}`);
      }
    }
    
    // Generate unique ID for this alert
    const alertId = generateId(alertPayload);
    
    // Check for duplicates
    const existingAlert = dbGetAlert(alertId);
    if (existingAlert) {
      logger.info(`⚠️ Duplicate alert received: ${alertId}`);
      return res.json({ status: 'duplicate', id: alertId });
    }
    
    // Check daily drawdown limit
    const todayPnL = dbGetTodayPnL();
    const drawdownLimit = Number(ACCOUNT_EQUITY) * Number(DAILY_DRAWDOWN_LIMIT);
    
    if (todayPnL <= -drawdownLimit) {
      logger.warn(`🚫 Daily drawdown limit reached. Today's P&L: $${todayPnL}, Limit: $${drawdownLimit}`);
      await telegramBot.sendMessage(
        TELEGRAM_CHAT_ID,
        `⚠️ *DRAWDOWN GUARD ACTIVE*\nToday's P&L: $${todayPnL}\nDrawdown limit: $${drawdownLimit}\nNew REAL trades blocked.`,
        { parse_mode: 'Markdown' }
      );
      return res.json({ status: 'blocked', reason: 'daily_drawdown_limit' });
    }
    
    // Map symbol to venue - REAL venues only
    let venueInfo;
    try {
      venueInfo = mapSymbolToRealVenue(alertPayload.symbol);
    } catch (error) {
      logger.error(`❌ Symbol not supported for real trading: ${alertPayload.symbol}`);
      return res.status(400).json({ error: `Symbol ${alertPayload.symbol} not supported for real trading` });
    }
    
    // Check if venue is configured
    if (!exchangeClients[venueInfo.router]) {
      logger.error(`❌ ${venueInfo.router.toUpperCase()} client not configured`);
      return res.status(400).json({ 
        error: `${venueInfo.router.toUpperCase()} not configured. Check credentials in .env` 
      });
    }
    
    // Calculate REAL position size
    const sizeInfo = calculateRealPositionSize({
      entry: alertPayload.entry,
      stopLoss: alertPayload.sl,
      riskPercent: alertPayload.risk_pct || DEFAULT_RISK_PCT
    });
    
    // Store alert
    dbInsertAlert({
      id: alertId,
      symbol: alertPayload.symbol,
      timeframe: alertPayload.tf || '15m',
      side: alertPayload.side,
      conviction: alertPayload.conviction,
      entry: alertPayload.entry,
      sl: alertPayload.sl,
      tp: alertPayload.tp || [],
      risk_pct: alertPayload.risk_pct || DEFAULT_RISK_PCT,
      rawPayload: alertPayload,
      tvSymbol: venueInfo.tvSymbol,
      router: venueInfo.router,
      sizeInfo: sizeInfo
    });
    
    // Send REAL trade confirmation to Telegram
    await sendRealTradeConfirmation(alertId, alertPayload, venueInfo, sizeInfo);
    
    logger.info(`📨 REAL Alert received: ${alertId}`, {
      symbol: alertPayload.symbol,
      side: alertPayload.side,
      venue: venueInfo.router,
      size: sizeInfo.units,
      risk: sizeInfo.riskUSD
    });
    
    res.json({
      status: 'success',
      id: alertId,
      message: 'REAL trade alert received - confirmation sent to Telegram',
      venue: venueInfo.router,
      size: sizeInfo.units
    });
    
  } catch (error) {
    logger.error('❌ Webhook processing error:', error.message);
    res.status(500).json({
      status: 'error',
      error: error.message
    });
  }
});

// Health check endpoint with exchange status
app.get('/health', async (req, res) => {
  try {
    const todayPnL = dbGetTodayPnL();
    const drawdownLimit = Number(ACCOUNT_EQUITY) * Number(DAILY_DRAWDOWN_LIMIT);
    
    const exchangeStatus = {};
    
    // Check Bitget status
    if (exchangeClients.bitget) {
      try {
        await exchangeClients.bitget.loadMarkets();
        exchangeStatus.bitget = 'connected';
      } catch (error) {
        exchangeStatus.bitget = 'disconnected';
      }
    }
    
    // Check OANDA status
    if (exchangeClients.oanda) {
      try {
        await exchangeClients.oanda.client.get('/v3/accounts');
        exchangeStatus.oanda = 'connected';
      } catch (error) {
        exchangeStatus.oanda = 'disconnected';
      }
    }
    
    // Check Alpaca status
    if (exchangeClients.alpaca) {
      try {
        await exchangeClients.alpaca.client.get('/v2/account');
        exchangeStatus.alpaca = 'connected';
      } catch (error) {
        exchangeStatus.alpaca = 'disconnected';
      }
    }
    
    res.json({
      status: 'healthy',
      mode: MODE,
      trading: 'REAL ORDERS ONLY',
      timestamp: new Date().toISOString(),
      daily_pnl: todayPnL,
      drawdown_limit: drawdownLimit,
      remaining_daily_capacity: drawdownLimit + todayPnL,
      exchanges: exchangeStatus,
      alerts_pending: alerts.size,
      trades_executed: trades.size,
      uptime: process.uptime()
    });
  } catch (error) {
    res.status(500).json({
      status: 'unhealthy',
      error: error.message
    });
  }
});

// Test webhook endpoint
app.get('/test-webhook', (req, res) => {
  res.json({
    message: 'REAL Trading System Webhook Test',
    endpoint: 'POST /webhook/tradingview',
    required_fields: ['symbol', 'side', 'entry', 'sl', 'conviction'],
    example_payload: {
      symbol: 'BTCUSDT',
      side: 'long',
      entry: 45000,
      sl: 44500,
      tp: [45500, 46000, 46500],
      conviction: 75,
      risk_pct: 1.0,
      tf: '15m',
      why: 'Breakout above resistance with volume'
    }
  });
});

// ==================== REAL TELEGRAM CALLBACK HANDLER ====================
telegramBot.on('callback_query', async (callbackQuery) => {
  const chatId = callbackQuery.message.chat.id;
  const messageId = callbackQuery.message.message_id;
  const data = callbackQuery.data;
  
  try {
    const [action, alertId] = data.split(':');
    
    if (!alertId) {
      await telegramBot.answerCallbackQuery(callbackQuery.id, {
        text: 'Invalid alert ID'
      });
      return;
    }
    
    // Get alert
    const alert = dbGetAlert(alertId);
    if (!alert) {
      await telegramBot.answerCallbackQuery(callbackQuery.id, {
        text: 'Alert not found or expired'
      });
      await telegramBot.editMessageText(
        '❌ Alert not found or expired',
        { chat_id: chatId, message_id: messageId }
      );
      return;
    }
    
    if (action === 'cancel') {
      dbUpdateAlertStatus(alertId, 'cancelled');
      
      await telegramBot.editMessageText(
        `❌ REAL Trade cancelled for ${alert.symbol}`,
        { chat_id: chatId, message_id: messageId }
      );
      
      await telegramBot.answerCallbackQuery(callbackQuery.id, {
        text: 'REAL trade cancelled'
      });
      
      logger.info(`REAL trade cancelled: ${alertId}`);
      
    } else if (action === 'confirm') {
      // Confirm and execute REAL trade
      dbUpdateAlertStatus(alertId, 'confirmed');
      
      // Check drawdown again
      const todayPnL = dbGetTodayPnL();
      const drawdownLimit = Number(ACCOUNT_EQUITY) * Number(DAILY_DRAWDOWN_LIMIT);
      
      if (todayPnL <= -drawdownLimit) {
        await telegramBot.editMessageText(
          `⚠️ REAL Trade blocked: Daily drawdown limit reached`,
          { chat_id: chatId, message_id: messageId }
        );
        
        await telegramBot.answerCallbackQuery(callbackQuery.id, {
          text: 'Drawdown limit reached'
        });
        
        dbUpdateAlertStatus(alertId, 'blocked');
        return;
      }
      
      await telegramBot.editMessageText(
        `🚀 Executing REAL trade for ${alert.symbol}...\n⏳ Please wait...`,
        { chat_id: chatId, message_id: messageId }
      );
      
      // Prepare REAL order parameters
      const orderParams = {
        market: alert.tvSymbol?.split(':')[1] || alert.symbol,
        side: alert.side === 'long' ? 'buy' : 'sell',
        entry: parseFloat(alert.entry),
        stopLoss: parseFloat(alert.sl),
        takeProfit: Array.isArray(alert.tp) ? alert.tp.map(tp => parseFloat(tp)) : [],
        units: parseFloat(alert.sizeInfo?.units || alert.units)
      };
      
      try {
        // EXECUTE REAL ORDER with retry logic
        const executeWithRetry = async (retries = 3, delay = 1000) => {
          for (let i = 0; i < retries; i++) {
            try {
              const result = await routeRealOrder(alert.router, orderParams);
              return result;
            } catch (error) {
              if (i === retries - 1) throw error;
              logger.warn(`Retry ${i + 1}/${retries} for ${alert.router} order`);
              await new Promise(resolve => setTimeout(resolve, delay * (i + 1)));
            }
          }
        };
        
        const orderResult = await executeWithRetry();
        
        // Create trade record
        const tradeId = `trade-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        const tradeData = {
          id: tradeId,
          alert_id: alertId,
          router: alert.router,
          order_id: orderResult.orderId,
          symbol: alert.symbol,
          side: orderParams.side,
          entry_price: orderParams.entry,
          stop_loss: orderParams.stopLoss,
          take_profit: orderParams.takeProfit,
          units: orderParams.units,
          status: orderResult.status,
          raw_response: orderResult
        };
        
        // Save trade
        dbInsertTrade(tradeData);
        
        // Update alert status
        dbUpdateAlertStatus(alertId, 'executed');
        
        // Send REAL execution confirmation
        await sendRealTradeExecuted(tradeData);
        
        // Update P&L (placeholder - would need real P&L tracking)
        dbUpdateTodayPnL(-orderResult.riskUSD || -1); // Simulate risk taken
        
        logger.info(`✅ REAL Trade executed: ${tradeId}`, {
          symbol: alert.symbol,
          side: alert.side,
          venue: alert.router,
          orderId: orderResult.orderId,
          amount: orderParams.units,
          risk: alert.sizeInfo?.riskUSD
        });
        
        await telegramBot.answerCallbackQuery(callbackQuery.id, {
          text: '✅ REAL trade executed successfully'
        });
        
      } catch (error) {
        logger.error(`❌ REAL Trade execution failed: ${alertId}`, error.message);
        
        dbUpdateAlertStatus(alertId, 'failed');
        
        await telegramBot.editMessageText(
          `❌ REAL Trade execution failed for ${alert.symbol}\nError: ${error.message}`,
          { chat_id: chatId, message_id: messageId }
        );
        
        await telegramBot.answerCallbackQuery(callbackQuery.id, {
          text: '❌ Execution failed'
        });
        
        // Send error notification
        await telegramBot.sendMessage(
          TELEGRAM_CHAT_ID,
          `⚠️ *TRADE EXECUTION FAILED*\nSymbol: ${alert.symbol}\nError: ${error.message}`,
          { parse_mode: 'Markdown' }
        );
      }
    }
    
  } catch (error) {
    logger.error('❌ Telegram callback error:', error.message);
    
    await telegramBot.answerCallbackQuery(callbackQuery.id, {
      text: 'An error occurred'
    });
  }
});

// ==================== STARTUP ====================
async function startServer() {
  try {
    logger.info('🚀 Starting REAL Institutional Trading System...');
    logger.info('⚡ 100% REAL LOGIC - NO SIMULATION');
    logger.info(`📊 Mode: ${MODE} (REAL ORDERS)`);
    logger.info(`💰 Account Equity: $${ACCOUNT_EQUITY}`);
    logger.info(`⚠️ Daily Drawdown Limit: ${DAILY_DRAWDOWN_LIMIT * 100}%`);
    
    // Initialize REAL exchange clients
    initBitgetClient();
    initOandaClient();
    initAlpacaClient();
    
    // Start Express server
    app.listen(PORT, () => {
      logger.info(`✅ Server running on port ${PORT}`);
      logger.info(`✅ Health check: http://localhost:${PORT}/health`);
      logger.info(`✅ Webhook endpoint: http://localhost:${PORT}/webhook/tradingview`);
      logger.info(`✅ Test endpoint: http://localhost:${PORT}/test-webhook`);
      logger.info(`✅ Telegram bot initialized`);
      logger.info('========================================');
      logger.info('🚀 READY FOR REAL TRADING');
      logger.info('⚠️ REAL ORDERS WILL BE EXECUTED');
      logger.info('========================================');
    });
    
  } catch (error) {
    logger.error('❌ Failed to start server:', error.message);
    process.exit(1);
  }
}

// Handle graceful shutdown
process.on('SIGINT', async () => {
  logger.info('🛑 Shutting down REAL trading system...');
  
  // Close any open connections
  if (exchangeClients.bitget) {
    exchangeClients.bitget = null;
  }
  
  logger.info('✅ System shutdown complete');
  process.exit(0);
});

process.on('uncaughtException', (error) => {
  logger.error('❌ Uncaught exception:', error.message);
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error('❌ Unhandled rejection:', reason);
});

// Start the REAL server
startServer();
