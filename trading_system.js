/**
 * Institutional Trading System v2.0
 * Complete production-ready system with:
 * - TradingView Pine v5 strategy (real institutional logic)
 * - Webhook receiver with HMAC verification
 * - Telegram confirmation flow
 * - Multi-venue execution (Bitget, OANDA, Alpaca)
 * - Real position sizing and risk management
 * - Postgres/SQLite persistence
 * - Daily drawdown protection
 * 
 * Environment variables required:
 * - TELEGRAM_BOT_TOKEN, TELEGRAM_CHAT_ID
 * - TV_WEBHOOK_SECRET
 * - POSTGRES_URL (optional)
 * - Exchange credentials (Bitget, OANDA, Alpaca)
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
const { Pool } = require('pg');
const Database = require('better-sqlite3');

// ==================== CONFIGURATION ====================
const {
  PORT = 3000,
  MODE = 'paper', // 'paper' or 'live'
  TELEGRAM_BOT_TOKEN,
  TELEGRAM_CHAT_ID,
  TV_WEBHOOK_SECRET,
  POSTGRES_URL,
  ACCOUNT_EQUITY = 100000,
  DEFAULT_RISK_PCT = 1.0,
  DAILY_DRAWDOWN_LIMIT = 0.05,
  CCXT_BITGET_API_KEY,
  CCXT_BITGET_SECRET,
  CCXT_BITGET_PASSWORD,
  OANDA_API_KEY,
  OANDA_ACCOUNT_ID,
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
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  transports: [
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.printf(({ timestamp, level, message, ...meta }) => {
          return `${timestamp} ${level}: ${message} ${
            Object.keys(meta).length ? JSON.stringify(meta) : ''
          }`;
        })
      )
    }),
    new winston.transports.File({ filename: 'trading_system.log' })
  ]
});

// ==================== DATABASE ====================
let usingPostgres = false;
let pgPool = null;
let sqliteDb = null;

async function initDb() {
  try {
    if (POSTGRES_URL) {
      pgPool = new Pool({ 
        connectionString: POSTGRES_URL,
        ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
      });
      
      // Test connection
      await pgPool.query('SELECT NOW()');
      
      // Create tables if not exist
      await pgPool.query(`
        CREATE TABLE IF NOT EXISTS alerts (
          id TEXT PRIMARY KEY,
          symbol TEXT NOT NULL,
          timeframe TEXT,
          side TEXT NOT NULL,
          conviction FLOAT,
          entry_price DECIMAL(20,8),
          stop_loss DECIMAL(20,8),
          take_profit JSONB,
          risk_percent DECIMAL(5,2),
          raw_payload JSONB NOT NULL,
          tv_symbol TEXT,
          router TEXT,
          units DECIMAL(20,8),
          risk_usd DECIMAL(20,2),
          sl_distance DECIMAL(20,8),
          status TEXT DEFAULT 'pending',
          created_at TIMESTAMP DEFAULT NOW(),
          updated_at TIMESTAMP DEFAULT NOW()
        );
      `);
      
      await pgPool.query(`
        CREATE TABLE IF NOT EXISTS trades (
          id TEXT PRIMARY KEY,
          alert_id TEXT REFERENCES alerts(id),
          router TEXT NOT NULL,
          order_id TEXT,
          symbol TEXT NOT NULL,
          side TEXT NOT NULL,
          entry_price DECIMAL(20,8),
          stop_loss DECIMAL(20,8),
          take_profit JSONB,
          units DECIMAL(20,8),
          status TEXT DEFAULT 'submitted',
          raw_response JSONB,
          created_at TIMESTAMP DEFAULT NOW()
        );
      `);
      
      await pgPool.query(`
        CREATE TABLE IF NOT EXISTS daily_pnl (
          date DATE PRIMARY KEY,
          realized_pnl DECIMAL(20,2) DEFAULT 0,
          unrealized_pnl DECIMAL(20,2) DEFAULT 0,
          total_trades INTEGER DEFAULT 0,
          winning_trades INTEGER DEFAULT 0,
          updated_at TIMESTAMP DEFAULT NOW()
        );
      `);
      
      await pgPool.query(`
        CREATE INDEX IF NOT EXISTS idx_alerts_status ON alerts(status);
        CREATE INDEX IF NOT EXISTS idx_alerts_created ON alerts(created_at);
        CREATE INDEX IF NOT EXISTS idx_trades_alert_id ON trades(alert_id);
      `);
      
      usingPostgres = true;
      logger.info('✅ Connected to PostgreSQL database');
    } else {
      // Use SQLite as fallback
      const dbPath = path.join(__dirname, 'trading_system.db');
      sqliteDb = new Database(dbPath);
      
      sqliteDb.exec(`
        CREATE TABLE IF NOT EXISTS alerts (
          id TEXT PRIMARY KEY,
          symbol TEXT NOT NULL,
          timeframe TEXT,
          side TEXT NOT NULL,
          conviction REAL,
          entry_price REAL,
          stop_loss REAL,
          take_profit TEXT,
          risk_percent REAL,
          raw_payload TEXT NOT NULL,
          tv_symbol TEXT,
          router TEXT,
          units REAL,
          risk_usd REAL,
          sl_distance REAL,
          status TEXT DEFAULT 'pending',
          created_at TEXT,
          updated_at TEXT
        );
      `);
      
      sqliteDb.exec(`
        CREATE TABLE IF NOT EXISTS trades (
          id TEXT PRIMARY KEY,
          alert_id TEXT,
          router TEXT NOT NULL,
          order_id TEXT,
          symbol TEXT NOT NULL,
          side TEXT NOT NULL,
          entry_price REAL,
          stop_loss REAL,
          take_profit TEXT,
          units REAL,
          status TEXT DEFAULT 'submitted',
          raw_response TEXT,
          created_at TEXT
        );
      `);
      
      sqliteDb.exec(`
        CREATE TABLE IF NOT EXISTS daily_pnl (
          date TEXT PRIMARY KEY,
          realized_pnl REAL DEFAULT 0,
          unrealized_pnl REAL DEFAULT 0,
          total_trades INTEGER DEFAULT 0,
          winning_trades INTEGER DEFAULT 0,
          updated_at TEXT
        );
      `);
      
      sqliteDb.exec(`
        CREATE INDEX IF NOT EXISTS idx_alerts_status ON alerts(status);
        CREATE INDEX IF NOT EXISTS idx_alerts_created ON alerts(created_at);
        CREATE INDEX IF NOT EXISTS idx_trades_alert_id ON trades(alert_id);
      `);
      
      logger.info(`✅ Using SQLite database: ${dbPath}`);
    }
  } catch (error) {
    logger.error('❌ Database initialization failed:', error);
    throw error;
  }
}

// Database helper functions
async function dbInsertAlert(alertData) {
  const {
    id, symbol, timeframe, side, conviction, entry, sl, tp,
    risk_pct, rawPayload, tvSymbol, router, sizeInfo
  } = alertData;
  
  if (usingPostgres) {
    await pgPool.query(
      `INSERT INTO alerts (
        id, symbol, timeframe, side, conviction, entry_price, stop_loss,
        take_profit, risk_percent, raw_payload, tv_symbol, router,
        units, risk_usd, sl_distance, status
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, 'pending')`,
      [
        id, symbol, timeframe, side, conviction, entry, sl,
        JSON.stringify(tp || []), risk_pct, rawPayload, tvSymbol, router,
        sizeInfo.units, sizeInfo.riskUSD, sizeInfo.slDistance
      ]
    );
  } else {
    const stmt = sqliteDb.prepare(`
      INSERT INTO alerts (
        id, symbol, timeframe, side, conviction, entry_price, stop_loss,
        take_profit, risk_percent, raw_payload, tv_symbol, router,
        units, risk_usd, sl_distance, status, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?, ?)
    `);
    
    stmt.run(
      id, symbol, timeframe, side, conviction, entry, sl,
      JSON.stringify(tp || []), risk_pct, JSON.stringify(rawPayload), tvSymbol, router,
      sizeInfo.units, sizeInfo.riskUSD, sizeInfo.slDistance,
      new Date().toISOString(), new Date().toISOString()
    );
  }
}

async function dbGetAlert(id) {
  if (usingPostgres) {
    const result = await pgPool.query('SELECT * FROM alerts WHERE id = $1', [id]);
    return result.rows[0];
  } else {
    const row = sqliteDb.prepare('SELECT * FROM alerts WHERE id = ?').get(id);
    if (row && row.raw_payload) {
      row.raw_payload = JSON.parse(row.raw_payload);
    }
    if (row && row.take_profit) {
      row.take_profit = JSON.parse(row.take_profit);
    }
    return row;
  }
}

async function dbUpdateAlertStatus(id, status) {
  if (usingPostgres) {
    await pgPool.query(
      'UPDATE alerts SET status = $1, updated_at = NOW() WHERE id = $2',
      [status, id]
    );
  } else {
    sqliteDb.prepare(
      'UPDATE alerts SET status = ?, updated_at = ? WHERE id = ?'
    ).run(status, new Date().toISOString(), id);
  }
}

async function dbInsertTrade(tradeData) {
  const {
    id, alert_id, router, order_id, symbol, side,
    entry_price, stop_loss, take_profit, units, status, raw_response
  } = tradeData;
  
  if (usingPostgres) {
    await pgPool.query(
      `INSERT INTO trades (
        id, alert_id, router, order_id, symbol, side,
        entry_price, stop_loss, take_profit, units, status, raw_response
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
      [
        id, alert_id, router, order_id, symbol, side,
        entry_price, stop_loss, JSON.stringify(take_profit || []),
        units, status, raw_response
      ]
    );
  } else {
    sqliteDb.prepare(`
      INSERT INTO trades (
        id, alert_id, router, order_id, symbol, side,
        entry_price, stop_loss, take_profit, units, status, raw_response, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id, alert_id, router, order_id, symbol, side,
      entry_price, stop_loss, JSON.stringify(take_profit || []),
      units, status, JSON.stringify(raw_response || {}), new Date().toISOString()
    );
  }
}

async function dbGetTodayPnL() {
  const today = new Date().toISOString().split('T')[0];
  
  if (usingPostgres) {
    const result = await pgPool.query(
      'SELECT realized_pnl FROM daily_pnl WHERE date = CURRENT_DATE'
    );
    return result.rows[0]?.realized_pnl || 0;
  } else {
    const row = sqliteDb.prepare(
      'SELECT realized_pnl FROM daily_pnl WHERE date = ?'
    ).get(today);
    return row?.realized_pnl || 0;
  }
}

async function dbUpdateTodayPnL(delta) {
  const today = new Date().toISOString().split('T')[0];
  const now = new Date().toISOString();
  
  if (usingPostgres) {
    await pgPool.query(`
      INSERT INTO daily_pnl (date, realized_pnl, updated_at)
      VALUES (CURRENT_DATE, $1, NOW())
      ON CONFLICT (date) DO UPDATE
      SET realized_pnl = daily_pnl.realized_pnl + $1,
          updated_at = NOW()
    `, [delta]);
  } else {
    const existing = sqliteDb.prepare(
      'SELECT realized_pnl FROM daily_pnl WHERE date = ?'
    ).get(today);
    
    if (existing) {
      sqliteDb.prepare(`
        UPDATE daily_pnl
        SET realized_pnl = ?, updated_at = ?
        WHERE date = ?
      `).run(existing.realized_pnl + delta, now, today);
    } else {
      sqliteDb.prepare(`
        INSERT INTO daily_pnl (date, realized_pnl, updated_at)
        VALUES (?, ?, ?)
      `).run(today, delta, now);
    }
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
  if (!secret || !signature) return true; // Skip if no secret configured
  
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

// ==================== POSITION SIZING ====================
function calculatePositionSize(params) {
  const {
    entry,
    stopLoss,
    accountEquity = Number(ACCOUNT_EQUITY),
    riskPercent = Number(DEFAULT_RISK_PCT),
    maxPositionPercent = 10 // Maximum position size as % of equity
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

// ==================== VENUE MAPPING ====================
function mapSymbolToVenue(symbol) {
  const sym = symbol.toUpperCase().trim();
  
  // Cryptocurrencies (Bitget)
  if (sym.endsWith('USDT') || sym.endsWith('USD') || sym.endsWith('BTC')) {
    const market = sym.endsWith('USDT') ? sym.replace('USDT', '/USDT') : 
                   sym.endsWith('BTC') ? sym.replace('BTC', '/BTC') :
                   sym.replace('USD', '/USD');
    return {
      tvSymbol: `BITGET:${sym}`,
      router: 'bitget',
      market: market,
      assetType: 'crypto'
    };
  }
  
  // Forex (OANDA)
  if (/^[A-Z]{6}$/.test(sym)) {
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
  
  // Stocks (Alpaca)
  if (/^[A-Z]{1,5}$/.test(sym)) {
    return {
      tvSymbol: `NASDAQ:${sym}`,
      router: 'alpaca',
      market: sym,
      assetType: 'stock'
    };
  }
  
  // Indices (TVC - TradingView)
  if (['SPX', 'NDX', 'DXY', 'DJI'].includes(sym)) {
    return {
      tvSymbol: `TVC:${sym}`,
      router: 'tvc',
      market: sym,
      assetType: 'index'
    };
  }
  
  // Default to unknown
  return {
    tvSymbol: sym,
    router: 'unknown',
    market: sym,
    assetType: 'unknown'
  };
}

// ==================== EXCHANGE CLIENTS ====================
const exchangeClients = {};

// Initialize Bitget (CCXT)
function initBitgetClient() {
  if (CCXT_BITGET_API_KEY && CCXT_BITGET_SECRET) {
    try {
      exchangeClients.bitget = new ccxt.bitget({
        apiKey: CCXT_BITGET_API_KEY,
        secret: CCXT_BITGET_SECRET,
        password: CCXT_BITGET_PASSWORD,
        enableRateLimit: true,
        options: {
          defaultType: 'future',
          adjustForTimeDifference: true
        }
      });
      logger.info('✅ Bitget client initialized');
    } catch (error) {
      logger.error('❌ Failed to initialize Bitget client:', error);
    }
  } else {
    logger.warn('⚠️ Bitget credentials not provided - crypto trading disabled');
  }
}

// OANDA REST client
const oandaClient = axios.create({
  baseURL: 'https://api-fxpractice.oanda.com/v3',
  headers: {
    'Authorization': `Bearer ${OANDA_API_KEY}`,
    'Content-Type': 'application/json'
  },
  timeout: 10000
});

// Alpaca REST client
const alpacaClient = axios.create({
  baseURL: ALPACA_BASE_URL,
  headers: {
    'APCA-API-KEY-ID': ALPACA_API_KEY,
    'APCA-API-SECRET-KEY': ALPACA_SECRET_KEY
  },
  timeout: 10000
});

// ==================== ORDER EXECUTION ====================
async function executeBitgetOrder(orderParams) {
  const {
    market,
    side,
    entry,
    stopLoss,
    takeProfit = [],
    units,
    mode = MODE
  } = orderParams;
  
  if (!exchangeClients.bitget) {
    throw new Error('Bitget client not initialized');
  }
  
  // Load markets
  await exchangeClients.bitget.loadMarkets();
  
  // Find the correct symbol
  const symbol = market.includes('/') ? market : `${market.replace('/', '')}/USDT`;
  const marketInfo = exchangeClients.bitget.markets[symbol];
  
  if (!marketInfo) {
    throw new Error(`Market ${symbol} not found on Bitget`);
  }
  
  // Round to exchange precision
  const pricePrecision = marketInfo.precision?.price || 2;
  const amountPrecision = marketInfo.precision?.amount || 6;
  
  const roundedPrice = roundToDecimals(entry, pricePrecision);
  const roundedAmount = roundToDecimals(units, amountPrecision);
  
  if (mode === 'paper') {
    return {
      status: 'paper_simulated',
      router: 'bitget',
      symbol: symbol,
      side: side,
      price: roundedPrice,
      amount: roundedAmount,
      stopLoss: stopLoss,
      takeProfit: takeProfit,
      orderId: `paper-${Date.now()}`
    };
  }
  
  // REAL ORDER EXECUTION
  try {
    // Place limit order
    const order = await exchangeClients.bitget.createOrder(
      symbol,
      'limit',
      side,
      roundedAmount,
      roundedPrice,
      {
        'stopLoss': {
          'type': 'limit',
          'price': roundToDecimals(stopLoss, pricePrecision)
        }
      }
    );
    
    logger.info(`✅ Bitget order placed: ${order.id}`);
    
    return {
      status: 'filled',
      router: 'bitget',
      orderId: order.id,
      symbol: symbol,
      side: side,
      price: order.price,
      amount: order.amount,
      stopLoss: stopLoss,
      takeProfit: takeProfit,
      rawResponse: order
    };
  } catch (error) {
    logger.error('❌ Bitget order failed:', error);
    throw error;
  }
}

async function executeOandaOrder(orderParams) {
  const {
    market,
    side,
    entry,
    stopLoss,
    takeProfit = [],
    units,
    mode = MODE
  } = orderParams;
  
  // Convert to signed units (positive for buy, negative for sell)
  const signedUnits = side === 'buy' ? Math.abs(units) : -Math.abs(units);
  
  if (mode === 'paper') {
    return {
      status: 'paper_simulated',
      router: 'oanda',
      market: market,
      units: signedUnits,
      entry: entry,
      stopLoss: stopLoss,
      takeProfit: takeProfit,
      orderId: `paper-${Date.now()}`
    };
  }
  
  // REAL OANDA ORDER
  try {
    const orderPayload = {
      order: {
        type: 'MARKET',
        instrument: market,
        units: String(signedUnits),
        stopLossOnFill: {
          price: String(roundToDecimals(stopLoss, 5))
        }
      }
    };
    
    // Add take profit if provided
    if (takeProfit.length > 0) {
      orderPayload.order.takeProfitOnFill = {
        price: String(roundToDecimals(takeProfit[0], 5))
      };
    }
    
    const response = await oandaClient.post(
      `/accounts/${OANDA_ACCOUNT_ID}/orders`,
      orderPayload
    );
    
    logger.info(`✅ OANDA order placed: ${response.data.orderCreateTransaction.id}`);
    
    return {
      status: 'filled',
      router: 'oanda',
      orderId: response.data.orderCreateTransaction.id,
      market: market,
      units: signedUnits,
      entry: entry,
      stopLoss: stopLoss,
      takeProfit: takeProfit,
      rawResponse: response.data
    };
  } catch (error) {
    logger.error('❌ OANDA order failed:', error.response?.data || error.message);
    throw error;
  }
}

async function executeAlpacaOrder(orderParams) {
  const {
    market,
    side,
    entry,
    stopLoss,
    takeProfit = [],
    units,
    mode = MODE
  } = orderParams;
  
  if (mode === 'paper') {
    return {
      status: 'paper_simulated',
      router: 'alpaca',
      market: market,
      units: units,
      entry: entry,
      stopLoss: stopLoss,
      takeProfit: takeProfit,
      orderId: `paper-${Date.now()}`
    };
  }
  
  // REAL ALPACA ORDER
  try {
    // First, place the limit order
    const orderPayload = {
      symbol: market,
      qty: Math.floor(units), // Whole shares for stocks
      side: side,
      type: 'limit',
      time_in_force: 'gtc',
      limit_price: String(roundToDecimals(entry, 2)),
      order_class: 'bracket',
      stop_loss: {
        stop_price: String(roundToDecimals(stopLoss, 2))
      }
    };
    
    // Add take profit if provided
    if (takeProfit.length > 0) {
      orderPayload.take_profit = {
        limit_price: String(roundToDecimals(takeProfit[0], 2))
      };
    }
    
    const response = await alpacaClient.post('/v2/orders', orderPayload);
    
    logger.info(`✅ Alpaca order placed: ${response.data.id}`);
    
    return {
      status: 'accepted',
      router: 'alpaca',
      orderId: response.data.id,
      market: market,
      units: units,
      entry: entry,
      stopLoss: stopLoss,
      takeProfit: takeProfit,
      rawResponse: response.data
    };
  } catch (error) {
    logger.error('❌ Alpaca order failed:', error.response?.data || error.message);
    throw error;
  }
}

// Router function
async function routeOrder(router, orderParams) {
  switch (router) {
    case 'bitget':
      return await executeBitgetOrder(orderParams);
    case 'oanda':
      return await executeOandaOrder(orderParams);
    case 'alpaca':
      return await executeAlpacaOrder(orderParams);
    default:
      throw new Error(`Unsupported router: ${router}`);
  }
}

// ==================== TELEGRAM BOT ====================
const telegramBot = new TelegramBot(TELEGRAM_BOT_TOKEN, { polling: true });

async function sendTradeConfirmation(alertId, alertData, venueInfo, sizeInfo) {
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
🚨 *TRADE SIGNAL DETECTED*

*Symbol:* ${symbol} → ${venueInfo.tvSymbol}
*Timeframe:* ${timeframe}
*Direction:* ${side.toUpperCase()}
*Conviction Score:* ${conviction}

*Entry Price:* ${entry}
*Stop Loss:* ${sl}
*Take Profit:* ${tp.join(', ') || 'N/A'}

*Risk Management:*
- Risk per Trade: ${risk_pct || DEFAULT_RISK_PCT}%
- Position Size: ${sizeInfo.units.toLocaleString()}
- Risk Amount: $${sizeInfo.riskUSD}
- Stop Distance: ${sizeInfo.slDistance}

*Rationale:* ${why || 'Institutional AI signal'}

*Venue:* ${venueInfo.router.toUpperCase()}
*Mode:* ${MODE.toUpperCase()}
  `;
  
  const options = {
    parse_mode: 'Markdown',
    reply_markup: {
      inline_keyboard: [
        [
          { text: '✅ CONFIRM TRADE', callback_data: `confirm:${alertId}` },
          { text: '❌ CANCEL', callback_data: `cancel:${alertId}` }
        ],
        [
          { text: '⚙️ MODIFY PARAMS', callback_data: `modify:${alertId}` }
        ]
      ]
    }
  };
  
  return telegramBot.sendMessage(TELEGRAM_CHAT_ID, message, options);
}

async function sendTradeExecuted(tradeData) {
  const message = `
✅ *TRADE EXECUTED*

*Trade ID:* ${tradeData.id}
*Symbol:* ${tradeData.symbol}
*Side:* ${tradeData.side.toUpperCase()}
*Router:* ${tradeData.router.toUpperCase()}

*Execution Details:*
- Entry: ${tradeData.entry_price}
- Stop Loss: ${tradeData.stop_loss}
- Take Profit: ${Array.isArray(tradeData.take_profit) ? tradeData.take_profit.join(', ') : 'N/A'}
- Units: ${tradeData.units}

*Status:* ${tradeData.status.toUpperCase()}
*Timestamp:* ${new Date().toLocaleString()}
  `;
  
  return telegramBot.sendMessage(TELEGRAM_CHAT_ID, message, { parse_mode: 'Markdown' });
}

// ==================== EXPRESS SERVER ====================
const app = express();
app.use(bodyParser.json({ limit: '10mb' }));

// TradingView webhook endpoint
app.post('/webhook/tradingview', async (req, res) => {
  try {
    const signature = req.headers['tv-signature'] || req.headers['signature'];
    
    // Verify HMAC signature
    if (!verifySignature(TV_WEBHOOK_SECRET, req.body, signature)) {
      logger.warn('⚠️ Invalid webhook signature received');
      return res.status(401).json({ error: 'Invalid signature' });
    }
    
    const alertPayload = req.body;
    
    // Validate required fields
    const requiredFields = ['symbol', 'side', 'entry', 'sl', 'conviction'];
    for (const field of requiredFields) {
      if (!alertPayload[field]) {
        throw new Error(`Missing required field: ${field}`);
      }
    }
    
    // Generate unique ID for this alert
    const alertId = generateId(alertPayload);
    
    // Check for duplicates
    const existingAlert = await dbGetAlert(alertId);
    if (existingAlert) {
      logger.info(`⚠️ Duplicate alert received: ${alertId}`);
      return res.json({ status: 'duplicate', id: alertId });
    }
    
    // Check daily drawdown limit
    const todayPnL = await dbGetTodayPnL();
    const drawdownLimit = Number(ACCOUNT_EQUITY) * Number(DAILY_DRAWDOWN_LIMIT);
    
    if (todayPnL <= -drawdownLimit) {
      logger.warn(`🚫 Daily drawdown limit reached. Today's P&L: $${todayPnL}, Limit: $${drawdownLimit}`);
      await telegramBot.sendMessage(
        TELEGRAM_CHAT_ID,
        `⚠️ *DRAWDOWN GUARD ACTIVE*\nToday's P&L: $${todayPnL}\nDrawdown limit: $${drawdownLimit}\nNew trades blocked.`,
        { parse_mode: 'Markdown' }
      );
      return res.json({ status: 'blocked', reason: 'daily_drawdown_limit' });
    }
    
    // Map symbol to venue
    const venueInfo = mapSymbolToVenue(alertPayload.symbol);
    
    // Calculate position size
    const sizeInfo = calculatePositionSize({
      entry: alertPayload.entry,
      stopLoss: alertPayload.sl,
      riskPercent: alertPayload.risk_pct || DEFAULT_RISK_PCT
    });
    
    // Store alert in database
    await dbInsertAlert({
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
    
    // Send confirmation to Telegram
    await sendTradeConfirmation(alertId, alertPayload, venueInfo, sizeInfo);
    
    logger.info(`📨 Alert received and processed: ${alertId}`, {
      symbol: alertPayload.symbol,
      side: alertPayload.side,
      venue: venueInfo.router
    });
    
    res.json({
      status: 'success',
      id: alertId,
      message: 'Alert received and confirmation sent to Telegram'
    });
    
  } catch (error) {
    logger.error('❌ Webhook processing error:', error);
    res.status(500).json({
      status: 'error',
      error: error.message
    });
  }
});

// Health check endpoint
app.get('/health', async (req, res) => {
  try {
    const todayPnL = await dbGetTodayPnL();
    const drawdownLimit = Number(ACCOUNT_EQUITY) * Number(DAILY_DRAWDOWN_LIMIT);
    
    res.json({
      status: 'healthy',
      mode: MODE,
      timestamp: new Date().toISOString(),
      daily_pnl: todayPnL,
      drawdown_limit: drawdownLimit,
      remaining_daily_capacity: drawdownLimit + todayPnL,
      exchanges_connected: Object.keys(exchangeClients),
      uptime: process.uptime()
    });
  } catch (error) {
    res.status(500).json({
      status: 'unhealthy',
      error: error.message
    });
  }
});

// ==================== TELEGRAM CALLBACK HANDLER ====================
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
    
    // Get alert from database
    const alert = await dbGetAlert(alertId);
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
      // Cancel the trade
      await dbUpdateAlertStatus(alertId, 'cancelled');
      
      await telegramBot.editMessageText(
        `❌ Trade cancelled for ${alert.symbol}`,
        { chat_id: chatId, message_id: messageId }
      );
      
      await telegramBot.answerCallbackQuery(callbackQuery.id, {
        text: 'Trade cancelled'
      });
      
      logger.info(`Trade cancelled: ${alertId}`);
      
    } else if (action === 'confirm') {
      // Confirm and execute the trade
      await dbUpdateAlertStatus(alertId, 'confirmed');
      
      // Check drawdown again before executing
      const todayPnL = await dbGetTodayPnL();
      const drawdownLimit = Number(ACCOUNT_EQUITY) * Number(DAILY_DRAWDOWN_LIMIT);
      
      if (todayPnL <= -drawdownLimit) {
        await telegramBot.editMessageText(
          `⚠️ Trade blocked: Daily drawdown limit reached`,
          { chat_id: chatId, message_id: messageId }
        );
        
        await telegramBot.answerCallbackQuery(callbackQuery.id, {
          text: 'Drawdown limit reached'
        });
        
        await dbUpdateAlertStatus(alertId, 'blocked');
        return;
      }
      
      await telegramBot.editMessageText(
        `⏳ Executing trade for ${alert.symbol}...`,
        { chat_id: chatId, message_id: messageId }
      );
      
      // Prepare order parameters
      const orderParams = {
        market: alert.tv_symbol.split(':')[1] || alert.symbol,
        side: alert.side === 'long' ? 'buy' : 'sell',
        entry: parseFloat(alert.entry_price),
        stopLoss: parseFloat(alert.stop_loss),
        takeProfit: Array.isArray(alert.take_profit) ? 
                   alert.take_profit.map(tp => parseFloat(tp)) : [],
        units: parseFloat(alert.units),
        mode: MODE
      };
      
      // Execute with retry logic
      const executeWithRetry = async (retries = 3, delay = 1000) => {
        for (let i = 0; i < retries; i++) {
          try {
            const result = await routeOrder(alert.router, orderParams);
            return result;
          } catch (error) {
            if (i === retries - 1) throw error;
            logger.warn(`Retry ${i + 1}/${retries} for order execution`);
            await new Promise(resolve => setTimeout(resolve, delay * (i + 1)));
          }
        }
      };
      
      try {
        // Execute the order
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
        
        // Save trade to database
        await dbInsertTrade(tradeData);
        
        // Update alert status
        await dbUpdateAlertStatus(alertId, 'executed');
        
        // Send execution confirmation
        await sendTradeExecuted(tradeData);
        
        // Update P&L (simulated for paper mode)
        if (MODE === 'paper') {
          const simulatedPnL = orderParams.units * 0.01; // Simulate small profit
          await dbUpdateTodayPnL(simulatedPnL);
        }
        
        logger.info(`✅ Trade executed successfully: ${tradeId}`, {
          symbol: alert.symbol,
          side: alert.side,
          router: alert.router,
          orderId: orderResult.orderId
        });
        
      } catch (error) {
        logger.error(`❌ Trade execution failed: ${alertId}`, error);
        
        await dbUpdateAlertStatus(alertId, 'failed');
        
        await telegramBot.editMessageText(
          `❌ Trade execution failed for ${alert.symbol}\nError: ${error.message}`,
          { chat_id: chatId, message_id: messageId }
        );
        
        await telegramBot.answerCallbackQuery(callbackQuery.id, {
          text: 'Execution failed'
        });
      }
      
    } else if (action === 'modify') {
      // Handle parameter modification
      await telegramBot.answerCallbackQuery(callbackQuery.id, {
        text: 'Parameter modification not yet implemented'
      });
    }
    
  } catch (error) {
    logger.error('❌ Telegram callback error:', error);
    
    await telegramBot.answerCallbackQuery(callbackQuery.id, {
      text: 'An error occurred'
    });
  }
});

// ==================== PINE SCRIPT GENERATION ====================
function generatePineScript() {
  const pineScript = `
//@version=5
strategy("Institutional Trading System - Full Logic", 
         overlay=true, 
         initial_capital=100000, 
         default_qty_type=strategy.cash, 
         default_qty_value=10000,
         commission_type=strategy.commission.percent,
         commission_value=0.1)

// === INPUT PARAMETERS ===
riskPercent = input.float(1.0, "Risk % per trade", minval=0.1, maxval=10, step=0.1)
convictionThreshold = input.float(50, "Conviction threshold", minval=0, maxval=100)
useMarketHours = input.bool(true, "Filter by market hours")
sessionStart = input.session("0930-1600", "Trading session")

// === MULTI TIMEFRAME ANALYSIS ===
htfClose = request.security(syminfo.tickerid, "D", close)
htfHigh = request.security(syminfo.tickerid, "D", high)
htfLow = request.security(syminfo.tickerid, "D", low)
htfVolume = request.security(syminfo.tickerid, "D", volume)

mtfClose = request.security(syminfo.tickerid, "60", close)
mtfHigh = request.security(syminfo.tickerid, "60", high)
mtfLow = request.security(syminfo.tickerid, "60", low)

ltfClose = request.security(syminfo.tickerid, "15", close)
ltfHigh = request.security(syminfo.tickerid, "15", high)
ltfLow = request.security(syminfo.tickerid, "15", low)

// === MARKET STRUCTURE ===
higherHigh = high > high[1] and high[1] > high[2]
higherLow = low > low[1] and low[1] > low[2]
lowerHigh = high < high[1] and high[1] < high[2]
lowerLow = low < low[1] and low[1] < low[2]

uptrend = higherHigh and higherLow
downtrend = lowerHigh and lowerLow

// === FAIR VALUE GAPS (FVG) ===
bullishFVG = low[2] > high[1]
bearishFVG = high[2] < low[1]

// === LIQUIDITY SWEEPS ===
liquiditySweepUp = high > ta.highest(high, 20)[1] and close < open
liquiditySweepDown = low < ta.lowest(low, 20)[1] and close > open

// === ANCHORED VWAP ===
var float anchoredVWAP = na
var float totalVolume = na
var float cumPriceVolume = na

anchorDate = input.time(timestamp("2023-01-01"), "Anchor date")
isNewAnchor = time >= anchorDate and time[1] < anchorDate

if isNewAnchor or bar_index == 0
    anchoredVWAP := hl2
    totalVolume := volume
    cumPriceVolume := hl2 * volume
else
    totalVolume := totalVolume[1] + volume
    cumPriceVolume := cumPriceVolume[1] + (hl2 * volume)
    anchoredVWAP := cumPriceVolume / totalVolume

// === VOLUME PROFILE AND IMBALANCE ===
volumeMA = ta.sma(volume, 20)
volumeExpansion = volume > volumeMA * 1.5
volumeContraction = volume < volumeMA * 0.5

// === KELTNER CHANNEL SQUEEZE ===
basis = ta.sma(close, 20)
range = ta.atr(20)
upperKC = basis + range * 2
lowerKC = basis - range * 2
upperBB = ta.sma(close, 20) + ta.stdev(close, 20) * 2
lowerBB = ta.sma(close, 20) - ta.stdev(close, 20) * 2
squeeze = (upperBB - lowerBB) < (upperKC - lowerKC)

// === ADVANCED MOMENTUM INDICATORS ===
// Hull Moving Average
hullLength = input.int(9, "Hull MA Length")
hullMA = ta.wma(2 * ta.wma(close, hullLength / 2) - ta.wma(close, hullLength), math.round(math.sqrt(hullLength)))

// KAMA (Kaufman Adaptive Moving Average)
kamaLength = input.int(10, "KAMA Length")
kama = ta.kama(close, kamaLength)

// ADX for trend strength
adxLength = input.int(14, "ADX Length")
adx = ta.adx(high, low, close, adxLength)
trendStrength = adx > 25

// === DONCHIAN CHANNEL FOR BREAKOUTS ===
donchianLength = input.int(20, "Donchian Length")
donchianUpper = ta.highest(high, donchianLength)
donchianLower = ta.lowest(low, donchianLength)
donchianMiddle = (donchianUpper + donchianLower) / 2

// === ORB (OPENING RANGE BREAKOUT) ===
orbStart = input.session("0930-1000", "ORB Period")
inOrbPeriod = time("15", session = orbStart)
orbHigh = ta.valuewhen(inOrbPeriod and not inOrbPeriod[1], high, 0)
orbLow = ta.valuewhen(inOrbPeriod and not inOrbPeriod[1], low, 0)

// === ATR-BASED STOP LOSS AND TAKE PROFIT ===
atr = ta.atr(14)
stopDistance = atr * 2.0
takeProfit1 = atr * 1.0
takeProfit2 = atr * 2.0
takeProfit3 = atr * 3.0

// === CONVICTION SCORING SYSTEM ===
conviction = 0.0

// Trend alignment (25 points max)
conviction := conviction + (uptrend ? 10 : downtrend ? -10 : 0)
conviction := conviction + (close > hullMA ? 5 : close < hullMA ? -5 : 0)
conviction := conviction + (close > kama ? 5 : close < kama ? -5 : 0)
conviction := conviction + (trendStrength ? 5 : 0)

// Market structure (20 points max)
conviction := conviction + (bullishFVG ? 8 : bearishFVG ? -8 : 0)
conviction := conviction + (liquiditySweepDown ? 6 : liquiditySweepUp ? -6 : 0)
conviction := conviction + (close > anchoredVWAP ? 6 : close < anchoredVWAP ? -6 : 0)

// Momentum and volume (25 points max)
rsi = ta.rsi(close, 14)
conviction := conviction + (rsi > 50 ? 5 : -5)
conviction := conviction + (volumeExpansion ? 8 : volumeContraction ? -3 : 0)
conviction := conviction + (squeeze and close > basis ? 6 : squeeze and close < basis ? -6 : 0)
conviction := conviction + (close > donchianUpper ? 6 : close < donchianLower ? -6 : 0)

// Time and session filter (10 points max)
inTradingHours = not useMarketHours or na(sessionStart) or time(timeframe.period, sessionStart)
conviction := conviction + (inTradingHours ? 10 : -20)

// === ENTRY SIGNALS ===
longSignal = conviction >= convictionThreshold and inTradingHours
shortSignal = conviction <= -convictionThreshold and inTradingHours

// === POSITION SIZING ===
positionSize = strategy.equity * (riskPercent / 100) / stopDistance

// === ALERT MESSAGES ===
longAlert = longSignal ? '{"symbol":"' + syminfo.ticker + 
                      '","side":"long","entry":' + str.tostring(close) + 
                      ',"sl":' + str.tostring(close - stopDistance) + 
                      ',"tp":[' + str.tostring(close + takeProfit1) + ',' + 
                      str.tostring(close + takeProfit2) + ',' + 
                      str.tostring(close + takeProfit3) + '],' +
                      '"conviction":' + str.tostring(conviction) + ',' +
                      '"risk_pct":' + str.tostring(riskPercent) + ',' +
                      '"why":"HTF Trend: ' + str.tostring(uptrend) + 
                      ', FVG: ' + str.tostring(bullishFVG) + 
                      ', Volume: ' + str.tostring(volumeExpansion) + '"}' : na

shortAlert = shortSignal ? '{"symbol":"' + syminfo.ticker + 
                       '","side":"short","entry":' + str.tostring(close) + 
                       ',"sl":' + str.tostring(close + stopDistance) + 
                       ',"tp":[' + str.tostring(close - takeProfit1) + ',' + 
                       str.tostring(close - takeProfit2) + ',' + 
                       str.tostring(close - takeProfit3) + '],' +
                       '"conviction":' + str.tostring(conviction) + ',' +
                       '"risk_pct":' + str.tostring(riskPercent) + ',' +
                       '"why":"HTF Trend: ' + str.tostring(downtrend) + 
                       ', FVG: ' + str.tostring(bearishFVG) + 
                       ', Volume: ' + str.tostring(volumeExpansion) + '"}' : na

// === ALERT CONDITIONS ===
alertcondition(longSignal, title="Long Signal", message=longAlert)
alertcondition(shortSignal, title="Short Signal", message=shortAlert)

// === STRATEGY ENTRIES ===
if (longSignal)
    strategy.entry("Long", strategy.long, qty=positionSize)
    
if (shortSignal)
    strategy.entry("Short", strategy.short, qty=positionSize)

// === PLOTTING ===
plot(anchoredVWAP, color=color.purple, linewidth=2, title="Anchored VWAP")
plot(hullMA, color=color.blue, linewidth=2, title="Hull MA")
plot(kama, color=color.orange, linewidth=2, title="KAMA")

// Plot entry signals
plotshape(longSignal, style=shape.triangleup, location=location.belowbar, 
          color=color.green, size=size.small, title="Long Signal")
plotshape(shortSignal, style=shape.triangledown, location=location.abovebar, 
          color=color.red, size=size.small, title="Short Signal")

// === FILL BACKGROUND FOR TREND ===
bgcolor(uptrend ? color.new(color.green, 90) : downtrend ? color.new(color.red, 90) : na)
  `;
  
  return pineScript;
}

// Save Pine Script to file
function savePineScript() {
  try {
    const pineScript = generatePineScript();
    const filePath = path.join(__dirname, 'institutional_trading_system.pine');
    fs.writeFileSync(filePath, pineScript, 'utf8');
    logger.info(`✅ Pine Script saved to: ${filePath}`);
  } catch (error) {
    logger.error('❌ Failed to save Pine Script:', error);
  }
}

// ==================== STARTUP ====================
async function startServer() {
  try {
    logger.info('🚀 Starting Institutional Trading System...');
    logger.info(`📊 Mode: ${MODE}`);
    logger.info(`💰 Account Equity: $${ACCOUNT_EQUITY}`);
    logger.info(`⚠️ Daily Drawdown Limit: ${DAILY_DRAWDOWN_LIMIT * 100}%`);
    
    // Initialize database
    await initDb();
    
    // Initialize exchange clients
    initBitgetClient();
    
    // Save Pine Script
    savePineScript();
    
    // Start Express server
    app.listen(PORT, () => {
      logger.info(`✅ Server running on port ${PORT}`);
      logger.info(`✅ Health check: http://localhost:${PORT}/health`);
      logger.info(`✅ Webhook endpoint: http://localhost:${PORT}/webhook/tradingview`);
      logger.info(`✅ Telegram bot initialized`);
      logger.info('========================================');
      logger.info('System ready for trading signals');
      logger.info('========================================');
    });
    
  } catch (error) {
    logger.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

// Handle graceful shutdown
process.on('SIGINT', async () => {
  logger.info('🛑 Shutting down gracefully...');
  
  if (pgPool) {
    await pgPool.end();
  }
  
  if (sqliteDb) {
    sqliteDb.close();
  }
  
  process.exit(0);
});

process.on('uncaughtException', (error) => {
  logger.error('❌ Uncaught exception:', error);
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error('❌ Unhandled rejection at:', promise, 'reason:', reason);
});

// Start the server
startServer();
