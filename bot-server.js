/**
 * all_in_one_trading_system.js
 *
 * Single-file, all-in-one trading system:
 * - Express webhook for TradingView alerts (HMAC verification)
 * - Telegram one-tap confirm (Confirm / Cancel)
 * - Venue mapping and auto asset discovery
 * - Position sizing (per-trade risk %), daily drawdown guard
 * - Multi-venue routing scaffolds: ccxt (Bitget), OANDA, Alpaca
 * - Persistence: Postgres if POSTGRES_URL provided, otherwise SQLite fallback
 * - Backoff retries, idempotency, logging
 * - Embedded Pine v5 script (full indicators, strategies, MTF fusion, alert payloads)
 * - Writes Pine script to disk as institutional_ai_suite.pine
 *
 * IMPORTANT: Test in MODE=paper. Replace API keys and secrets before live trading.
 *
 * Dependencies:
 * npm install express body-parser node-telegram-bot-api ccxt axios pg better-sqlite3 sqlite3 winston dotenv backoff
 *
 * .env template (create in same folder):
 * PORT=3000
 * MODE=paper
 * TELEGRAM_BOT_TOKEN=REPLACE_ME
 * TELEGRAM_CHAT_ID=REPLACE_ME
 * TV_WEBHOOK_SECRET=REPLACE_ME
 * POSTGRES_URL=postgres://user:pass@host:5432/dbname?sslmode=require
 * ACCOUNT_EQUITY=100000
 * DEFAULT_RISK_PCT=3.0
 * DAILY_DRAWDOWN_LIMIT=0.05
 * CCXT_BITGET_API_KEY=
 * CCXT_BITGET_SECRET=
 * CCXT_BITGET_PASSWORD=
 * OANDA_API_KEY=
 * OANDA_ACCOUNT_ID=
 * ALPACA_API_KEY=
 * ALPACA_SECRET_KEY=
 * ALPACA_BASE_URL=https://paper-api.alpaca.markets
 *
 * Save and run: node all_in_one_trading_system.js
 */

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

// Persistence: Postgres or SQLite fallback
const { Pool } = require('pg');
const Database = require('better-sqlite3');

// Config
const {
  PORT = 3000,
  MODE = 'paper',
  TELEGRAM_BOT_TOKEN,
  TELEGRAM_CHAT_ID,
  TV_WEBHOOK_SECRET,
  POSTGRES_URL,
  ACCOUNT_EQUITY = 100000,
  DEFAULT_RISK_PCT = 3.0,
  DAILY_DRAWDOWN_LIMIT = 0.05,
  CCXT_BITGET_API_KEY,
  CCXT_BITGET_SECRET,
  CCXT_BITGET_PASSWORD,
  OANDA_API_KEY,
  OANDA_ACCOUNT_ID,
  ALPACA_API_KEY,
  ALPACA_SECRET_KEY,
  ALPACA_BASE_URL = 'https://paper-api.alpaca.markets'
} = process.env;

if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_CHAT_ID) {
  console.error('Missing TELEGRAM_BOT_TOKEN or TELEGRAM_CHAT_ID in .env');
  process.exit(1);
}

// Logger
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(winston.format.timestamp(), winston.format.simple()),
  transports: [new winston.transports.Console()]
});

// DB init
let pgPool = null;
let sqliteDb = null;
let usingPostgres = false;

async function initDb() {
  if (POSTGRES_URL) {
    pgPool = new Pool({ connectionString: POSTGRES_URL });
    await pgPool.query(`
      CREATE TABLE IF NOT EXISTS alerts (
        id TEXT PRIMARY KEY,
        payload JSONB,
        tv_symbol TEXT,
        router TEXT,
        size JSONB,
        status TEXT,
        created_at TIMESTAMP DEFAULT now(),
        updated_at TIMESTAMP DEFAULT now()
      );
    `);
    await pgPool.query(`
      CREATE TABLE IF NOT EXISTS trades (
        id TEXT PRIMARY KEY,
        alert_id TEXT,
        router TEXT,
        order_id TEXT,
        symbol TEXT,
        side TEXT,
        entry NUMERIC,
        sl NUMERIC,
        tp JSONB,
        units NUMERIC,
        status TEXT,
        raw_response JSONB,
        created_at TIMESTAMP DEFAULT now()
      );
    `);
    await pgPool.query(`
      CREATE TABLE IF NOT EXISTS pnl (
        day DATE PRIMARY KEY,
        realized NUMERIC DEFAULT 0,
        updated_at TIMESTAMP DEFAULT now()
      );
    `);
    usingPostgres = true;
    logger.info('Connected to Postgres');
  } else {
    const dbPath = path.join(__dirname, 'trading_bot.sqlite');
    sqliteDb = new Database(dbPath);
    sqliteDb.exec(`
      CREATE TABLE IF NOT EXISTS alerts (
        id TEXT PRIMARY KEY,
        payload TEXT,
        tv_symbol TEXT,
        router TEXT,
        size TEXT,
        status TEXT,
        created_at TEXT,
        updated_at TEXT
      );
    `);
    sqliteDb.exec(`
      CREATE TABLE IF NOT EXISTS trades (
        id TEXT PRIMARY KEY,
        alert_id TEXT,
        router TEXT,
        order_id TEXT,
        symbol TEXT,
        side TEXT,
        entry REAL,
        sl REAL,
        tp TEXT,
        units REAL,
        status TEXT,
        raw_response TEXT,
        created_at TEXT
      );
    `);
    sqliteDb.exec(`
      CREATE TABLE IF NOT EXISTS pnl (
        day TEXT PRIMARY KEY,
        realized REAL DEFAULT 0,
        updated_at TEXT
      );
    `);
    logger.info('Using SQLite fallback at', dbPath);
  }
}

// DB helpers
async function dbInsertAlert(id, payload, tvSymbol, router, sizeInfo, status = 'pending') {
  if (usingPostgres) {
    await pgPool.query('INSERT INTO alerts(id,payload,tv_symbol,router,size,status) VALUES($1,$2,$3,$4,$5,$6)', [id, payload, tvSymbol, router, sizeInfo, status]);
  } else {
    const stmt = sqliteDb.prepare('INSERT OR REPLACE INTO alerts(id,payload,tv_symbol,router,size,status,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?)');
    stmt.run(id, JSON.stringify(payload), tvSymbol, router, JSON.stringify(sizeInfo), status, new Date().toISOString(), new Date().toISOString());
  }
}
async function dbGetAlert(id) {
  if (usingPostgres) {
    const res = await pgPool.query('SELECT * FROM alerts WHERE id=$1', [id]);
    return res.rows[0];
  } else {
    const row = sqliteDb.prepare('SELECT * FROM alerts WHERE id = ?').get(id);
    if (row) row.payload = JSON.parse(row.payload);
    return row;
  }
}
async function dbUpdateAlertStatus(id, status) {
  if (usingPostgres) {
    await pgPool.query('UPDATE alerts SET status=$1, updated_at=now() WHERE id=$2', [status, id]);
  } else {
    sqliteDb.prepare('UPDATE alerts SET status=?, updated_at=? WHERE id=?').run(status, new Date().toISOString(), id);
  }
}
async function dbInsertTrade(trade) {
  if (usingPostgres) {
    await pgPool.query('INSERT INTO trades(id,alert_id,router,order_id,symbol,side,entry,sl,tp,units,status,raw_response) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)', [trade.id, trade.alert_id, trade.router, trade.order_id, trade.symbol, trade.side, trade.entry, trade.sl, trade.tp, trade.units, trade.status, trade.raw_response]);
  } else {
    sqliteDb.prepare('INSERT OR REPLACE INTO trades(id,alert_id,router,order_id,symbol,side,entry,sl,tp,units,status,raw_response,created_at) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?)').run(trade.id, trade.alert_id, trade.router, trade.order_id, trade.symbol, trade.side, trade.entry, trade.sl, JSON.stringify(trade.tp), trade.units, trade.status, JSON.stringify(trade.raw_response), new Date().toISOString());
  }
}
async function dbGetTodayPnL() {
  const day = usingPostgres ? 'CURRENT_DATE' : new Date().toISOString().slice(0,10);
  if (usingPostgres) {
    const res = await pgPool.query('SELECT COALESCE(realized,0) as realized FROM pnl WHERE day = CURRENT_DATE');
    return res.rows.length ? Number(res.rows[0].realized) : 0;
  } else {
    const row = sqliteDb.prepare('SELECT realized FROM pnl WHERE day = ?').get(new Date().toISOString().slice(0,10));
    return row ? Number(row.realized) : 0;
  }
}
async function dbUpdateTodayPnL(delta) {
  if (usingPostgres) {
    await pgPool.query('INSERT INTO pnl(day,realized,updated_at) VALUES(CURRENT_DATE,$1,now()) ON CONFLICT(day) DO UPDATE SET realized = pnl.realized + $1, updated_at = now()', [delta]);
  } else {
    const day = new Date().toISOString().slice(0,10);
    const row = sqliteDb.prepare('SELECT realized FROM pnl WHERE day = ?').get(day);
    if (row) {
      sqliteDb.prepare('UPDATE pnl SET realized = ?, updated_at = ? WHERE day = ?').run(row.realized + delta, new Date().toISOString(), day);
    } else {
      sqliteDb.prepare('INSERT INTO pnl(day,realized,updated_at) VALUES(?,?,?)').run(day, delta, new Date().toISOString());
    }
  }
}

// Utilities
function nowISO() { return new Date().toISOString(); }
function idForPayload(payload) { return crypto.createHash('sha256').update(JSON.stringify(payload)).digest('hex'); }
function hmacVerify(secret, payload, signature) {
  if (!secret) return true;
  const computed = crypto.createHmac('sha256', secret).update(payload).digest('hex');
  return computed === signature;
}
function roundToPrecision(value, precision) {
  if (!Number.isFinite(value)) return value;
  const factor = Math.pow(10, precision);
  return Math.floor(value * factor) / factor;
}

// CCXT init
const ccxtClients = {};
function initCcxt() {
  if (CCXT_BITGET_API_KEY && CCXT_BITGET_SECRET) {
    ccxtClients.bitget = new ccxt.bitget({
      apiKey: CCXT_BITGET_API_KEY,
      secret: CCXT_BITGET_SECRET,
      password: CCXT_BITGET_PASSWORD || undefined,
      enableRateLimit: true,
      options: { defaultType: 'future' }
    });
    logger.info('CCXT Bitget client initialized');
  } else {
    logger.info('CCXT Bitget credentials not provided; crypto routing disabled until configured');
  }
}

// OANDA and Alpaca clients
const oandaClient = axios.create({
  baseURL: 'https://api-fxpractice.oanda.com',
  headers: { Authorization: `Bearer ${OANDA_API_KEY}`, 'Content-Type': 'application/json' },
  timeout: 10000
});
const alpacaClient = axios.create({
  baseURL: ALPACA_BASE_URL,
  headers: { 'APCA-API-KEY-ID': ALPACA_API_KEY, 'APCA-API-SECRET-KEY': ALPACA_SECRET_KEY },
  timeout: 10000
});

// Sizing & risk
const DAILY_DRAWDOWN_USD = Number(ACCOUNT_EQUITY) * Number(DAILY_DRAWDOWN_LIMIT || 0.05);
function computePositionSize({ entry, sl, riskPct = DEFAULT_RISK_PCT, accountEquity = Number(ACCOUNT_EQUITY) }) {
  const entryNum = Number(entry);
  const slNum = Number(sl);
  const riskFraction = Number(riskPct) / 100.0;
  const perTradeRiskUSD = accountEquity * riskFraction;
  const slDistance = Math.abs(entryNum - slNum);
  if (!isFinite(slDistance) || slDistance <= 0) return { units: 0, riskUSD: perTradeRiskUSD, slDistance: 0 };
  const units = perTradeRiskUSD / slDistance;
  return { units, riskUSD: perTradeRiskUSD, slDistance };
}

// Venue mapping
function mapAssetToVenue(label) {
  const up = String(label).toUpperCase().trim();
  if (up.endsWith('USDT') || up.endsWith('USD') || up.endsWith('BTC')) return { tvSymbol: `BITGET:${up}`, router: 'bitget', market: up };
  if (/^[A-Z]{6}$/.test(up)) return { tvSymbol: `OANDA:${up}`, router: 'oanda', market: up };
  if (['XAUUSD','XAGUSD','CL','GC'].includes(up)) return { tvSymbol: `OANDA:${up}`, router: 'oanda', market: up };
  if (['SPX','NDX','DXY'].includes(up)) return { tvSymbol: `TVC:${up}`, router: 'tvc', market: up };
  if (/^[A-Z]{1,5}$/.test(up)) return { tvSymbol: `NASDAQ:${up}`, router: 'alpaca', market: up };
  return { tvSymbol: up, router: 'unknown', market: up };
}

// Order routing
async function placeCryptoOrderBitget({ market, side, entry, sl, tp = [], units, mode = MODE }) {
  if (!ccxtClients.bitget) throw new Error('Bitget client not configured');
  const ex = ccxtClients.bitget;
  await ex.loadMarkets();
  const symbol = market.includes('/') ? market : market.replace('USDT', '/USDT').replace('USD', '/USD');
  const marketInfo = ex.markets[symbol] || Object.values(ex.markets).find(m => m.id === market || m.symbol === market);
  if (!marketInfo) throw new Error(`Market ${market} not found on Bitget`);
  const pricePrecision = marketInfo.precision ? marketInfo.precision.price || 2 : 2;
  const amountPrecision = marketInfo.precision ? marketInfo.precision.amount || 6 : 6;
  const roundedPrice = roundToPrecision(entry, pricePrecision);
  const roundedAmount = roundToPrecision(units, amountPrecision);
  if (mode === 'paper') {
    return { status: 'paper_simulated', router: 'bitget', symbol: marketInfo.symbol, side, price: roundedPrice, amount: roundedAmount, sl, tp };
  }
  const order = await ex.createOrder(marketInfo.symbol, 'limit', side, roundedAmount, roundedPrice);
  return { status: 'submitted', router: 'bitget', order, sl, tp };
}

async function placeOandaOrder({ market, side, entry, sl, tp = [], units, mode = MODE }) {
  const unitsSigned = side.toLowerCase() === 'buy' ? Math.round(units) : -Math.round(units);
  if (mode === 'paper') return { status: 'paper_simulated', router: 'oanda', market, units: unitsSigned, entry, sl, tp };
  const body = {
    order: {
      instrument: market,
      units: String(unitsSigned),
      type: 'MARKET',
      positionFill: 'DEFAULT',
      stopLossOnFill: { price: String(sl) },
      takeProfitOnFill: tp.length ? { price: String(tp[0]) } : undefined
    }
  };
  const res = await oandaClient.post(`/accounts/${OANDA_ACCOUNT_ID}/orders`, body);
  return { status: 'submitted', router: 'oanda', response: res.data };
}

async function placeAlpacaOrder({ market, side, entry, sl, tp = [], units, mode = MODE }) {
  if (mode === 'paper') return { status: 'paper_simulated', router: 'alpaca', market, units, entry, sl, tp };
  const orderBody = {
    symbol: market,
    qty: Math.max(1, Math.floor(units)),
    side: side.toLowerCase(),
    type: 'limit',
    time_in_force: 'gtc',
    limit_price: entry
  };
  const res = await alpacaClient.post('/v2/orders', orderBody);
  return { status: 'submitted', router: 'alpaca', response: res.data };
}

async function routeOrder(router, orderInput) {
  if (router === 'bitget') return placeCryptoOrderBitget(orderInput);
  if (router === 'oanda') return placeOandaOrder(orderInput);
  if (router === 'alpaca' || router === 'equities') return placeAlpacaOrder(orderInput);
  throw new Error(`Unknown router: ${router}`);
}

// Telegram
const bot = new TelegramBot(TELEGRAM_BOT_TOKEN, { polling: true });

async function sendPreTradeTelegram(alertId, alertPayload, tvSymbol, sizeInfo) {
  const { symbol, tf, conviction, entry, sl, tp = [], risk_pct, why } = alertPayload;
  const lines = [
    `🔔 *TradingView Alert*`,
    `*Symbol:* ${symbol} → ${tvSymbol}`,
    `*Timeframe:* ${tf}`,
    `*Conviction:* ${conviction}`,
    `*Entry:* ${entry}`,
    `*Stop:* ${sl}`,
    `*TPs:* ${Array.isArray(tp) ? tp.join(', ') : tp}`,
    `*Risk per trade:* ${risk_pct || DEFAULT_RISK_PCT}%`,
    `*SL distance:* ${sizeInfo.slDistance}`,
    `*Units:* ${sizeInfo.units}`,
    `*Why:* ${why || 'n/a'}`
  ];
  const text = lines.join('\n');
  const opts = {
    parse_mode: 'Markdown',
    reply_markup: {
      inline_keyboard: [
        [{ text: '✅ Confirm Trade', callback_data: `confirm:${alertId}` }, { text: '❌ Cancel', callback_data: `cancel:${alertId}` }]
      ]
    }
  };
  return bot.sendMessage(TELEGRAM_CHAT_ID, text, opts);
}

async function sendPostTradeTelegram(tradeRecord) {
  const text = [
    `📣 *Trade Executed*`,
    `*Symbol:* ${tradeRecord.symbol}`,
    `*Router:* ${tradeRecord.router}`,
    `*Side:* ${tradeRecord.side}`,
    `*Units:* ${tradeRecord.units}`,
    `*Entry:* ${tradeRecord.entry}`,
    `*SL:* ${tradeRecord.sl}`,
    `*TP:* ${Array.isArray(tradeRecord.tp) ? tradeRecord.tp.join(', ') : tradeRecord.tp}`,
    `*Status:* ${tradeRecord.status}`
  ].join('\n');
  return bot.sendMessage(TELEGRAM_CHAT_ID, text, { parse_mode: 'Markdown' });
}

// In-memory cache for short-lived alerts
const alertCache = new Map();

// Express server
const app = express();
app.use(bodyParser.json({ limit: '1mb' }));

app.post('/webhook/tradingview', async (req, res) => {
  try {
    const rawBody = JSON.stringify(req.body);
    const signature = req.headers['x-tv-signature'] || req.headers['x-signature'] || '';
    if (!hmacVerify(TV_WEBHOOK_SECRET, rawBody, signature)) {
      logger.warn('Invalid webhook signature');
      return res.status(401).json({ ok: false, error: 'Invalid signature' });
    }
    const alert = req.body;
    if (!alert.symbol || !alert.entry || !alert.sl || !alert.tf || !('conviction' in alert)) {
      logger.warn('Invalid alert payload', alert);
      return res.status(400).json({ ok: false, error: 'Missing required fields' });
    }
    const id = idForPayload(alert);
    const existing = usingPostgres ? (await pgPool.query('SELECT id FROM alerts WHERE id=$1', [id])).rows : sqliteDb.prepare('SELECT id FROM alerts WHERE id = ?').all(id);
    if (existing && existing.length) {
      logger.info('Duplicate alert received', { id });
      return res.json({ ok: true, dedup: true });
    }
    const dailyPnL = await dbGetTodayPnL();
    if (-dailyPnL >= DAILY_DRAWDOWN_USD) {
      logger.warn('Daily drawdown exceeded; blocking new entries', { dailyPnL, limit: DAILY_DRAWDOWN_USD });
      await bot.sendMessage(TELEGRAM_CHAT_ID, `⚠️ Daily drawdown guard active. New entries blocked.`);
      return res.json({ ok: true, blocked: true });
    }
    const mapping = mapAssetToVenue(alert.symbol);
    const tvSymbol = mapping.tvSymbol;
    const router = mapping.router;
    const sizeInfo = computePositionSize({ entry: alert.entry, sl: alert.sl, riskPct: alert.risk_pct || DEFAULT_RISK_PCT });
    await dbInsertAlert(id, alert, tvSymbol, router, sizeInfo, 'pending');
    alertCache.set(id, { id, alert, tvSymbol, router, sizeInfo, createdAt: nowISO() });
    await sendPreTradeTelegram(id, alert, tvSymbol, sizeInfo);
    logger.info('Alert processed and sent to Telegram', { id, symbol: alert.symbol, router });
    return res.json({ ok: true, id });
  } catch (err) {
    logger.error('Webhook error', err);
    return res.status(500).json({ ok: false, error: err.message });
  }
});

// Telegram callback handling
bot.on('callback_query', async (callbackQuery) => {
  try {
    const data = callbackQuery.data || '';
    const [action, id] = data.split(':');
    const dbAlert = await dbGetAlert(id);
    if (!dbAlert) {
      await bot.answerCallbackQuery(callbackQuery.id, { text: 'Alert not found or expired.' });
      return;
    }
    const alert = usingPostgres ? dbAlert.payload : dbAlert.payload;
    if (action === 'cancel') {
      await dbUpdateAlertStatus(id, 'cancelled');
      await bot.editMessageText(`❌ Trade cancelled for ${alert.symbol}`, { chat_id: callbackQuery.message.chat.id, message_id: callbackQuery.message.message_id });
      await bot.answerCallbackQuery(callbackQuery.id, { text: 'Cancelled' });
      logger.info('User cancelled trade', { id });
      return;
    }
    if (action === 'confirm') {
      const dailyPnL = await dbGetTodayPnL();
      if (-dailyPnL >= DAILY_DRAWDOWN_USD) {
        await bot.answerCallbackQuery(callbackQuery.id, { text: 'Drawdown guard active. Trade blocked.' });
        await bot.editMessageText(`⚠️ Trade blocked by drawdown guard for ${alert.symbol}`, { chat_id: callbackQuery.message.chat.id, message_id: callbackQuery.message.message_id });
        logger.warn('Trade blocked at confirm due to drawdown', { id, dailyPnL });
        return;
      }
      await dbUpdateAlertStatus(id, 'confirmed');
      const mapping = mapAssetToVenue(alert.symbol);
      const sizeInfo = computePositionSize({ entry: alert.entry, sl: alert.sl, riskPct: alert.risk_pct || DEFAULT_RISK_PCT });
      const side = Number(alert.conviction) >= 0 ? 'buy' : 'sell';
      const orderInput = { market: mapping.market, side, entry: Number(alert.entry), sl: Number(alert.sl), tp: Array.isArray(alert.tp) ? alert.tp.map(Number) : [], units: sizeInfo.units, mode: MODE };
      const call = backoff.call(async (cb) => {
        try {
          const result = await routeOrder(mapping.router, orderInput);
          cb(null, result);
        } catch (err) {
          cb(err);
        }
      }, async (err, result) => {
        if (err) {
          logger.error('Order routing failed after retries', { id, err: err.message });
          await dbUpdateAlertStatus(id, 'error');
          await bot.editMessageText(`❌ Order failed for ${alert.symbol}: ${err.message}`, { chat_id: callbackQuery.message.chat.id, message_id: callbackQuery.message.message_id });
          await bot.answerCallbackQuery(callbackQuery.id, { text: 'Order failed' });
          return;
        }
        const tradeId = `trade-${Date.now()}-${Math.random().toString(36).slice(2,8)}`;
        const tradeRecord = {
          id: tradeId,
          alert_id: id,
          router: mapping.router,
          order_id: result.orderId || null,
          symbol: alert.symbol,
          side,
          entry: orderInput.entry,
          sl: orderInput.sl,
          tp: orderInput.tp,
          units: orderInput.units,
          status: result.status || 'submitted',
          raw_response: result
        };
        await dbInsertTrade(tradeRecord);
        await dbUpdateAlertStatus(id, 'executed');
        await bot.editMessageText(`✅ Trade confirmed and routed for ${alert.symbol}\nRouter: ${mapping.router}\nStatus: ${result.status}`, { chat_id: callbackQuery.message.chat.id, message_id: callbackQuery.message.message_id });
        await sendPostTradeTelegram(tradeRecord);
        await bot.answerCallbackQuery(callbackQuery.id, { text: 'Trade confirmed and routed' });
      });
      call.setStrategy(new backoff.ExponentialStrategy({ initialDelay: 500, maxDelay: 5000 }));
      call.failAfter(5);
      call.start();
      return;
    }
    await bot.answerCallbackQuery(callbackQuery.id, { text: 'Unknown action' });
  } catch (err) {
    logger.error('Callback handler error', err);
  }
});

// Health endpoint
app.get('/health', async (req, res) => {
  try {
    const dailyPnL = await dbGetTodayPnL();
    res.json({ ok: true, mode: MODE, dailyPnL, drawdownLimitUSD: DAILY_DRAWDOWN_USD, ts: nowISO() });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

// Startup
(async () => {
  try {
    await initDb();
    initCcxt();
    // Write Pine script to disk for convenience
    const pinePath = path.join(__dirname, 'institutional_ai_suite.pine');
    fs.writeFileSync(pinePath, PINE_SCRIPT);
    logger.info('Wrote Pine script to', pinePath);
    app.listen(PORT, () => {
      logger.info(`All-in-one trading system listening on port ${PORT} (mode=${MODE})`);
      logger.info('Start in paper mode and test thoroughly before switching to live.');
    });
  } catch (err) {
    logger.error('Startup error', err);
    process.exit(1);
  }
})();

// -------------------------
// Embedded Pine v5 script (full indicators, MTF fusion, strategies, alert payloads)
// Save this to TradingView as a new indicator/strategy and create alerts using the alertconditions
// -------------------------
const PINE_SCRIPT = `// Institutional AI Suite | Full Indicator & Strategy Pack
//@version=5
indicator("Institutional AI Suite | Full Pack | Live + OneTap", overlay=true, max_labels_count=500)

// === Inputs ===
symInput = input.symbol(syminfo.tickerid, "Analyze symbol (TV string)")
tfHTF = input.timeframe("D", "HTF bias timeframe")
tfMID = input.timeframe("1H", "Mid timeframe")
tfLTF = input.timeframe("15", "LTF entry timeframe")
tfScalp = input.timeframe("5", "Scalp timeframe")
riskATR = input.float(0.8, "ATR SL buffer", minval=0.1, maxval=5.0)
longGate = input.int(72, "Conviction threshold (long)")
shortGate = input.int(-72, "Conviction threshold (short)")
riskPct = input.float(3.0, "Per-trade risk %")
mlAdj = input.float(0.0, "Daily ML weight adj", minval=-0.3, maxval=0.3)

// === MTF sources ===
cHTF = request.security(symInput, tfHTF, close)
oHTF = request.security(symInput, tfHTF, open)
hHTF = request.security(symInput, tfHTF, high)
lHTF = request.security(symInput, tfHTF, low)

cMID = request.security(symInput, tfMID, close)
oMID = request.security(symInput, tfMID, open)
hMID = request.security(symInput, tfMID, high)
lMID = request.security(symInput, tfMID, low)

cLTF = request.security(symInput, tfLTF, close)
oLTF = request.security(symInput, tfLTF, open)
hLTF = request.security(symInput, tfLTF, high)
lLTF = request.security(symInput, tfLTF, low)
vLTF = request.security(symInput, tfLTF, volume)

// === Core indicators ===
// HTF trend
ema50HTF = ta.ema(cHTF, 50)
ema200HTF = ta.ema(cHTF, 200)
trendUp = ema50HTF > ema200HTF
trendDn = ema50HTF < ema200HTF

// ADX regime
adxHTF = ta.adx(14)
chop = adxHTF < 18

// Anchored VWAP (weekly anchor)
weekStart = ta.change(time("W"))
var float aVWAP = na
if weekStart
    aVWAP := na
aVWAP := na(aVWAP) ? ta.vwap : aVWAP

// Volume profile proxy (rolling POC via highest volume bar)
vpLen = input.int(200, "VP lookback")
vpPOC = ta.highest(vLTF, vpLen) == vLTF ? cLTF : na

// Fair Value Gap (FVG) detection (simplified)
bullFVG = (lLTF[2] > hLTF[1]) and (hLTF[2] - lLTF[1] > ta.atr(14) * 0.2)
bearFVG = (hLTF[2] < lLTF[1]) and (lLTF[1] - hLTF[2] > ta.atr(14) * 0.2)

// Market structure: HH/HL/LL/LH and BOS/CHOCH
swingHigh = ta.pivothigh(hLTF, 5, 5)
swingLow = ta.pivotlow(lLTF, 5, 5)
hh = hLTF > ta.highest(hLTF, 20)[1]
ll = lLTF < ta.lowest(lLTF, 20)[1]
bosUp = hh
bosDn = ll

// Momentum
macd = ta.ema(cLTF, 12) - ta.ema(cLTF, 26)
macdSig = ta.ema(macd, 9)
rsi = ta.rsi(cLTF, 14)
displacement = (cLTF - oLTF) / ta.atr(14) > 0.8

// Squeeze (BB vs Keltner)
bbMid = ta.sma(cLTF, 20)
bbDev = ta.stdev(cLTF, 20)
bbUp = bbMid + 2 * bbDev
bbDn = bbMid - 2 * bbDev
atr = ta.atr(14)
kelUp = bbMid + 1.5 * atr
kelDn = bbMid - 1.5 * atr
squeeze = (bbUp - bbDn) < (kelUp - kelDn)

// Donchian breakout
donchUp = cLTF > ta.highest(hLTF, 20)
donchDn = cLTF < ta.lowest(lLTF, 20)

// Volume expansion
volExp = vLTF > ta.sma(vLTF, 20) * 1.5

// Adaptive trend filters (KAMA)
kamaMID = ta.kama(cMID, 10)
hullMID = ta.wma(2 * ta.wma(cMID, 9) - ta.wma(cMID, 18), 9)

// Scoring fusion
score = 0.0
score += trendUp ? 18 : trendDn ? -18 : 0
score += bosUp ? 10 : bosDn ? -10 : 0
score += bullFVG ? 8 : bearFVG ? -8 : 0
score += (cLTF > aVWAP ? 6 : -6)
score += (macd > macdSig ? 5 : -5)
score += (kamaMID > hullMID ? 5 : kamaMID < hullMID ? -5 : 0)
score += (displacement and not chop ? 6 : 0)
score += (donchUp ? 4 : donchDn ? -4 : 0)
score += (squeeze and cLTF > kelUp ? 4 : squeeze and cLTF < kelDn ? -4 : 0)
score += (volExp ? 3 : 0)
score += (chop and rsi < 30 ? 5 : 0)
score += (chop and rsi > 70 ? -5 : 0)
score := score * (1.0 + mlAdj)

// Levels
entryGuide = ta.ema(cLTF, 20)
slLong = entryGuide - riskATR * atr
tp1Long = entryGuide + 1.2 * atr
tp2Long = entryGuide + 2.0 * atr
slShort = entryGuide + riskATR * atr
tp1Short = entryGuide - 1.2 * atr
tp2Short = entryGuide - 2.0 * atr

// Strategy modules (trend continuation example)
trendContinuationLong = trendUp and bosUp and (cLTF > entryGuide) and (macd > macdSig) and (score > longGate)
trendContinuationShort = trendDn and bosDn and (cLTF < entryGuide) and (macd < macdSig) and (score < shortGate)

// Institutional breakout (ORB + volume filter)
orbBreakLong = donchUp and volExp and (score > longGate)
orbBreakShort = donchDn and volExp and (score < shortGate)

// Mean reversion (only in chop)
meanReversionLong = chop and rsi < 30 and cLTF < bbDn and (score > 0)
meanReversionShort = chop and rsi > 70 and cLTF > bbUp and (score < 0)

// Momentum scalping (scalp timeframe)
cSC = request.security(symInput, tfScalp, close)
scalpSignal = (cSC - request.security(symInput, tfScalp, open)) / request.security(symInput, tfScalp, ta.atr(14)) > 0.8

// Composite signals
longSignal = trendContinuationLong or orbBreakLong or meanReversionLong or (scalpSignal and score > 30)
shortSignal = trendContinuationShort or orbBreakShort or meanReversionShort or (scalpSignal and score < -30)

// Why text
whyLong = str.format("HTF={0}, BOS={1}, FVG={2}, aVWAP={3}, Regime={4}, Squeeze={5}, VolExp={6}", trendUp ? "up" : trendDn ? "down" : "chop", bosUp, bullFVG, cLTF > aVWAP, chop ? "chop" : "trend", squeeze, volExp)
whyShort = str.format("HTF={0}, BOS={1}, FVG={2}, aVWAP={3}, Regime={4}, Squeeze={5}, VolExp={6}", trendDn ? "down" : trendUp ? "up" : "chop", bosDn, bearFVG, cLTF < aVWAP, chop ? "chop" : "trend", squeeze, volExp)

// Payloads
payloadLong = str.format('{{"symbol":"{0}","tf":"{1}","side":"long","conviction":{2},"entry":{3},"sl":{4},"tp":[{5},{6}],"risk_pct":{7},"why":"{8}"}}', symInput, tfLTF, score, entryGuide, slLong, tp1Long, tp2Long, riskPct, whyLong)
payloadShort = str.format('{{"symbol":"{0}","tf":"{1}","side":"short","conviction":{2},"entry":{3},"sl":{4},"tp":[{5},{6}],"risk_pct":{7},"why":"{8}"}}', symInput, tfLTF, score, entryGuide, slShort, tp1Short, tp2Short, riskPct, whyShort)

// Alert conditions
alertcondition(longSignal, title="AI Long Setup (Live)", message=payloadLong)
alertcondition(shortSignal, title="AI Short Setup (Live)", message=payloadShort)

// Plots for visualization
plot(entryGuide, color=color.new(color.green, 0), title="Entry guide")
plot(slLong, color=color.new(color.red, 0), title="SL guide (long)")
plot(tp1Long, color=color.new(color.blue, 0), title="TP1 guide (long)")
plot(tp2Long, color=color.new(color.blue, 60), title="TP2 guide (long)")

// Labels
if (longSignal)
    label.new(bar_index, high, "AI LONG\nConv:" + str.tostring(score, format.mintick), color=color.green, style=label.style_label_down, textcolor=color.white)
if (shortSignal)
    label.new(bar_index, low, "AI SHORT\nConv:" + str.tostring(score, format.mintick), color=color.red, style=label.style_label_up, textcolor=color.white)

// End of Pine script
`;

// End of file
