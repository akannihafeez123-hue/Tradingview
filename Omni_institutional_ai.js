#!/usr/bin/env node
/* =========================================================
   OMNI INSTITUTIONAL AI — FULLY ENHANCED
   Node >=18 | Telegram | Multi-AI | Swing/Scalp
   Candle ML | Support/Resistance AI | Continuous Pipeline Learning
   Cross-Asset Analysis | Institutional Indicators & Strategies
   🔴 ENHANCED — Market Alignment Pipeline | BTC Dominance & Risk-On/Off
   🔴 ENHANCED — Price Tracking | Session Bias | HTF Gates | ATR Confirmation
========================================================= */

import https from "https";

/* ================= ENV ================= */
const TELEGRAM_TOKEN = process.env.TELEGRAM_TOKEN || "";
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID || "";
const WATCH_INTERVAL_MS = Number(process.env.WATCH_INTERVAL_MS || 30000);
const DAILY_PIPELINE_MS = Number(process.env.DAILY_PIPELINE_MS || 60 * 1000);

const SWING_TF = ["1d", "2d", "1w", "1M"];
const SCALP_TF = ["5m", "15m", "30m", "1h", "2h", "4h"];
const AI_COUNT = 3;

const WATCH = new Map();
const LAST_EXECUTION = new Map();
const TICK_STATE = new Map(); // 🔴 ADDED — Price tracking state

/* ================= UTIL ================= */
const sleep = ms => new Promise(r => setTimeout(r, ms));
const mean = a => a.length ? a.reduce((x, y) => x + y, 0) / a.length : 0;
const std = a => { const m = mean(a); return Math.sqrt(mean(a.map(x => (x - m) ** 2))); };
const fetchJSON = url => new Promise(res => {
  https.get(url, r => {
    let b = "";
    r.on("data", x => b += x);
    r.on("end", () => { try { res(JSON.parse(b)); } catch { res(null); } });
  }).on("error", () => res(null));
});
const tg = (method, payload) => new Promise(res => {
  const d = JSON.stringify(payload);
  const req = https.request({
    hostname: "api.telegram.org",
    path: `/bot${TELEGRAM_TOKEN}/${method}`,
    method: "POST",
    headers: { "Content-Type": "application/json", "Content-Length": Buffer.byteLength(d) }
  }, r => { let b = ""; r.on("data", x => b += x); r.on("end", () => { try { res(JSON.parse(b)); } catch { res(null); } }); });
  req.on("error", () => res(null));
  req.write(d); req.end();
});
const send = (id, t) => tg("sendMessage", { chat_id: id, text: t });
const normalizeSymbol = s => s.toUpperCase().replace(/[^\w]/g, "");

/* ================= TF MAP ================= */
const TF_MAP = {
  "5m": "5m", "15m": "15m", "30m": "30m", "1h": "1H", "2h": "2H", "4h": "4H",
  "1d": "1D", "2d": "2D", "1w": "1W", "1M": "1M", "2Y": "2Y"
};

/* =========================================================
   🔴 ADDED — PRICE TRACKING (TICK → CANDLE ALIGNMENT)
========================================================= */
function updateTick(symbol, price) {
  const t = TICK_STATE.get(symbol) || {};
  t.drift = t.last ? price - t.last : 0;
  t.last = price;
  TICK_STATE.set(symbol, t);
}

function tickBias(symbol) {
  const d = TICK_STATE.get(symbol)?.drift || 0;
  if (Math.abs(d) < 1e-6) return "NEUTRAL";
  return d > 0 ? "BUY" : "SELL";
}

function candleBias(c) {
  if (c.length < 2) return "NEUTRAL";
  return c.at(-1).c > c.at(-1).o ? "BUY" : "SELL";
}

/* =========================================================
   🔴 ADDED — SESSION BIAS
========================================================= */
function sessionBias() {
  const h = new Date().getUTCHours();
  if (h >= 0 && h < 7) return { name: "ASIA", weight: 0.9 };
  if (h >= 7 && h < 13) return { name: "LONDON", weight: 1.1 };
  if (h >= 13 && h < 21) return { name: "NEW_YORK", weight: 1.2 };
  return { name: "OFF", weight: 1.0 };
}

/* ================= MARKET DATA ================= */
async function candles(symbol, tf, limit = 1000) {
  try {
    const s = normalizeSymbol(symbol);
    const url = `https://api.bitget.com/api/v2/spot/market/candles?symbol=${s}&granularity=${TF_MAP[tf]}&limit=${limit}`;
    const r = await fetchJSON(url);
    if (!r?.data) return [];
    return r.data.map(x => ({ t: +x[0], o: +x[1], h: +x[2], l: +x[3], c: +x[4], v: +x[5] }));
  } catch (e) { return []; }
}

/* ================= INDICATORS ================= */
const ATR = (c, p = 14) => {
  if (c.length < p + 1) return 0;
  const tr = [];
  for (let i = 1; i < c.length; i++) {
    tr.push(Math.max(
      c[i].h - c[i].l,
      Math.abs(c[i].h - c[i - 1].c),
      Math.abs(c[i].l - c[i - 1].c)
    ));
  }
  return mean(tr.slice(-p));
};

const ATR_Z = c => {
  const a = [];
  for (let i = 30; i < c.length; i++) a.push(ATR(c.slice(0, i)));
  return std(a) ? ((a.at(-1) - mean(a)) / std(a)) * 100 : 0;
};

const Parkinson = c => Math.sqrt(mean(c.map(x => Math.log(x.h / x.l) ** 2)) / (4 * Math.log(2)));

const EWMA = (c, l = 0.94) => {
  let v = 0;
  for (let i = 1; i < c.length; i++) {
    const r = Math.log(c[i].c / c[i - 1].c);
    v = l * v + (1 - l) * r * r;
  }
  return Math.sqrt(v);
};

const VolRegime = z => z > 1 ? "High" : z < -1 ? "Low" : "Normal";

const VolumeDelta = c => c.slice(1).reduce((d, x, i) => d + (x.c > c[i].c ? x.v : -x.v), 0);

const Absorption = c => Math.abs(VolumeDelta(c)) > mean(c.map(x => x.v)) * 3;

const LiquidityVoid = c => c.length > 20 && (c.at(-1).h - c.at(-1).l) > mean(c.slice(-20).map(x => x.h - x.l)) * 2;

const StopHuntProb = c => Math.min(1, Math.abs(c.at(-1).c - c.at(-20).c) / (ATR(c) || 1));

const IcebergProxy = c => c.at(-1).v > mean(c.slice(-20).map(x => x.v)) * 4;

const BOS = c => c.length > 20 && (c.at(-1).h > Math.max(...c.slice(-20, -1).map(x => x.h)) || c.at(-1).l < Math.min(...c.slice(-20, -1).map(x => x.l)));

const CHoCH = c => c.length > 3 && ((c.at(-1).c > c.at(-2).h && c.at(-2).c < c.at(-3).l) || (c.at(-1).c < c.at(-2).l && c.at(-2).c > c.at(-3).h));

const PremiumDiscount = c => c.at(-1).c > (Math.max(...c.map(x => x.h)) + Math.min(...c.map(x => x.l))) / 2 ? "Premium" : "Discount";

const RangeState = c => Math.abs(c.at(-1).c - c.at(-20).c) < ATR(c) ? "Accepted" : "Rejected";

const WyckoffEVR = c => Math.abs(c.at(-1).c - c.at(-20).c) / mean(c.slice(-20).map(x => x.v));

const SpreadEfficiency = c => (c.at(-1).h - c.at(-1).l) / (ATR(c) || 1);

const RelativeVolume = c => c.at(-1).v / mean(c.slice(-20).map(x => x.v));

const Hurst = c => {
  let s = 0, r = 0, m = mean(c.map(x => x.c));
  for (const x of c) {
    s += x.c - m;
    r = Math.max(r, Math.abs(s));
  }
  return std(c.map(x => x.c)) ? Math.log(r / std(c.map(x => x.c))) / Math.log(c.length) : 0;
};

const FractalDimension = c => 2 - Hurst(c);

const TimeSymmetry = c => mean(c.slice(-10).map((x, i) => x.c - c[i].c));

/* =========================================================
   🔴 ADDED — PRICE REJECTION INDICATOR
========================================================= */
function priceRejection(c) {
  if (c.length < 3) return 0;
  const last = c.at(-1);
  const upper = last.h - last.c;
  const lower = last.c - last.l;
  const total = last.h - last.l;
  return total ? Math.min(upper, lower) / total : 0;
}

/* =========================================================
   🔴 ADDED — ATR EXECUTION DELAY CONFIRMATION
========================================================= */
function atrConfirm(entry, price, atr, dir, factor = 0.15) {
  if (!atr) return false;
  const move = Math.abs(price - entry);
  if (move < atr * factor) return false;
  if (dir === "BUY" && price < entry) return false;
  if (dir === "SELL" && price > entry) return false;
  return true;
}

/* ================= CROSS-ASSET ================= */
async function BTCDominance() {
  try {
    const r = await fetchJSON("https://api.coingecko.com/api/v3/global");
    return r?.data?.market_cap_percentage?.btc ?? r?.market_cap_percentage?.btc ?? 50;
  } catch { return 50; }
}

async function CorrelationFilter(symbol) {
  const btc = await candles("BTCUSDT", "1h");
  const s = await candles(symbol, "1h");
  if (!btc.length || !s.length) return 1;
  const btcClose = btc.map(x => x.c);
  const sClose = s.map(x => x.c).slice(-btcClose.length);
  const cMean = mean(btcClose), sMean = mean(sClose);
  const num = btcClose.reduce((a, v, i) => a + (v - sMean) * (btcClose[i] - cMean), 0);
  const den = Math.sqrt(btcClose.reduce((a, v) => a + (v - cMean) ** 2, 0) * sClose.reduce((a, v) => a + (v - sMean) ** 2, 0));
  return den ? num / den : 0;
}

async function RiskOnOff() {
  const btcDom = await BTCDominance();
  return btcDom > 50 ? "Risk-On" : "Risk-Off";
}

/* ================= SUPPORT/RESISTANCE ================= */
function supportResistance(c) {
  if (c.length < 20) return { support: 0, resistance: 0 };
  const highs = c.map(x => x.h), lows = c.map(x => x.l);
  return { support: Math.min(...lows.slice(-50)), resistance: Math.max(...highs.slice(-50)) };
}

/* ================= CANDLE PATTERN ================= */
function candlePattern(c) {
  if (c.length < 3) return "None";
  const last = c.slice(-3), [c1, c2, c3] = last;
  if (c2.c > c2.o && c2.o < c1.c && c2.c > c1.o && c3.c > c3.o) return "BullishEngulfing";
  if (c2.c < c2.o && c2.o > c1.c && c2.c < c1.o && c3.c < c3.o) return "BearishEngulfing";
  if (c3.c > c3.o && (c3.c - c3.o) < (c3.h - c3.l) * 0.3 && (c3.o - c3.l) > (c3.h - c3.c)) return "Hammer";
  return "Neutral";
}

/* ================= PIPELINE & HISTORY ================= */
const pipelineDatabase = {
  strategies: [],
  indicators: [],
  history: [],
  misalignment: [] // 🔴 ADDED — For daily learning
};

async function extractPipeline(symbol, tf = "1h") {
  const c = await candles(symbol, tf, tf.startsWith("m") ? 1000 : 500);
  if (c.length < 50) return;
  const macro = await macro2Y(symbol);
  const liq = LiquidityVoid(c), absorption = Absorption(c);
  const atrZ = ATR_Z(c), deltaVol = VolumeDelta(c);
  const sr = supportResistance(c), pattern = candlePattern(c);
  const strategy = {
    symbol, tf, macroRegime: macro.regime ?? "Neutral", macroATRZ: macro.atrZ ?? 0, liq, absorption, atrZ, deltaVol, sr, pattern,
    BOS: BOS(c), CHoCH: CHoCH(c), PremiumDiscount: PremiumDiscount(c), RangeState: RangeState(c),
    WyckoffEVR: WyckoffEVR(c), SpreadEfficiency: SpreadEfficiency(c), RelativeVolume: RelativeVolume(c),
    Hurst: Hurst(c), FractalDimension: FractalDimension(c), TimeSymmetry: TimeSymmetry(c),
    IcebergProxy: IcebergProxy(c), StopHuntProb: StopHuntProb(c), timestamp: Date.now()
  };
  pipelineDatabase.strategies.push(strategy);
  pipelineDatabase.history.push(strategy);
  pipelineDatabase.strategies = pipelineDatabase.strategies.slice(-50);
  pipelineDatabase.history = pipelineDatabase.history.slice(-200);
  const indicator = { symbol, tf, ATR: ATR(c), EWMA: EWMA(c), Parkinson: Parkinson(c), timestamp: Date.now() };
  pipelineDatabase.indicators.push(indicator);
  pipelineDatabase.indicators = pipelineDatabase.indicators.slice(-50);
}

/* ================= MACRO 2Y ================= */
async function macro2Y(symbol) {
  try {
    const c = await candles(symbol, "2Y", 500);
    if (!c || c.length < 20) return { regime: "Neutral", atrZ: 0, trendUp: false, bos: false, choch: false, hurst: 0, fd: 0, price: 0 };
    const atrZ = ATR_Z(c);
    const trendUp = c.at(-1).c > mean(c.map(x => x.c));
    const bos = BOS(c), choch = CHoCH(c);
    const hurst = Hurst(c), fd = FractalDimension(c);
    let regime = "Neutral";
    if (trendUp && bos && hurst > 0.5) regime = "Bull";
    else if (!trendUp && bos && hurst > 0.5) regime = "Bear";
    else if (fd > 1.6) regime = "Range";
    return { regime, atrZ, trendUp, bos, choch, hurst, fd, price: c.at(-1).c };
  } catch { return { regime: "Neutral", atrZ: 0, trendUp: false, bos: false, choch: false, hurst: 0, fd: 0, price: 0 }; }
}

/* =========================================================
   🔴 ADDED — HTF → LTF EXECUTION GATE
========================================================= */
function htfGate(macro, ltfDirection) {
  if (!macro || macro.regime === "Neutral") return true; // Allow in neutral
  if (macro.regime === "Bull" && ltfDirection === "SELL") return false;
  if (macro.regime === "Bear" && ltfDirection === "BUY") return false;
  return true;
}

/* =========================================================
   🔴 ENHANCED — AI DECISION ENGINE
========================================================= */
async function AIDecisionEnhanced(symbol, tf, macro, btcDom) {
  const c = await candles(symbol, tf, tf.startsWith("m") ? 1000 : 500);
  if (!c.length) return { direction: null, quality: 0, gate: "NO_DATA" };

  // --- Update tick state ---
  const entry = c.at(-1).c;
  updateTick(symbol, entry);

  // --- Get indicator states ---
  const candleDir = candleBias(c);
  const tickDir = tickBias(symbol);
  const atr = ATR(c);
  const atrZ = ATR_Z(c);
  const ewma = EWMA(c);
  const bos = BOS(c);
  const choch = CHoCH(c);
  const liq = LiquidityVoid(c);
  const absorption = Absorption(c);
  const stopHunt = StopHuntProb(c);
  const rejection = priceRejection(c);
  const sr = supportResistance(c);
  const premium = PremiumDiscount(c);
  const rangeState = RangeState(c);
  const wyckoff = WyckoffEVR(c);
  const spread = SpreadEfficiency(c);
  const relVol = RelativeVolume(c);
  const hurst = Hurst(c);
  const fd = FractalDimension(c);
  const ts = TimeSymmetry(c);

  // --- Cross-asset and macro ---
  btcDom = typeof btcDom === "number" ? btcDom : await BTCDominance();
  const riskMode = await RiskOnOff();
  const htfGatePass = htfGate(macro, candleDir);
  const sess = sessionBias();
  const correlation = await CorrelationFilter(symbol);

  // --- Alignment / misalignment score ---
  let alignmentScore = 0;
  if (macro && macro.regime === candleDir) alignmentScore += 20;
  if (VolRegime(atrZ) !== "Low") alignmentScore += 10;
  if (bos || choch) alignmentScore += 15;
  if (absorption || liq) alignmentScore += 10;
  if (premium === "Discount" && candleDir === "BUY") alignmentScore += 10;
  if (htfGatePass) alignmentScore += 15;
  if (sess.weight > 1) alignmentScore += 10;
  if (Math.abs(ts) < atr * 0.5) alignmentScore += 5;
  if (rangeState === "Accepted") alignmentScore += 5;
  if (correlation > 0.5) alignmentScore += 10;

  const aligned = alignmentScore >= 60;

  // Store misalignment for daily learning
  if (!aligned) {
    pipelineDatabase.misalignment = pipelineDatabase.misalignment || [];
    pipelineDatabase.misalignment.push({
      symbol, tf, timestamp: Date.now(), score: alignmentScore, entry,
      indicators: { atrZ, bos, choch, liq, absorption, rejection }
    });
    pipelineDatabase.misalignment = pipelineDatabase.misalignment.slice(-100);
  }

  // --- Gate checks ---
  if (!aligned) return { direction: null, quality: 0, gate: "MISALIGNMENT", alignmentScore };

  if (tickDir !== "NEUTRAL" && tickDir !== candleDir) return {
    direction: null, quality: 0, gate: "TICK_MISMATCH", alignmentScore
  };

  if (!atrConfirm(entry, entry + (tickDir === "BUY" ? 1 : -1), atr, candleDir)) return {
    direction: null, quality: 0, gate: "ATR_INSUFFICIENT", alignmentScore
  };

  if (riskMode === "Risk-Off" && tf !== "1d" && tf !== "1w") return {
    direction: null, quality: 0, gate: "RISK_OFF", alignmentScore
  };

  // --- Compute weighted quality score ---
  let qualityScore = 0;
  qualityScore += Math.min(30, atrZ * 5);
  qualityScore += bos ? 10 : 0;
  qualityScore += choch ? 10 : 0;
  qualityScore += absorption ? 5 : 0;
  qualityScore += liq ? 5 : 0;
  qualityScore += Math.min(15, relVol * 5);
  qualityScore += Math.min(10, (1 - rejection) * 10);
  qualityScore *= sess.weight;
  qualityScore *= (100 - Math.abs(ts)) / 100;
  qualityScore *= macro && macro.regime !== "Neutral" ? 1.05 : 1;

  // Cap at 100%
  qualityScore = Math.min(100, qualityScore);

  // --- Determine direction ---
  let direction = candleDir;
  if (macro?.regime === "Bull" && direction === "SELL") direction = "BUY";
  if (macro?.regime === "Bear" && direction === "BUY") direction = "SELL";
  if (btcDom > 60) direction = "SELL";
  if (btcDom < 40) direction = "BUY";
  if (rangeState === "Accepted" && qualityScore < 50) direction = null;

  // --- Reasoning object ---
  const reasoning = {
    macro: macro?.regime, atrZ, bos, choch, liq, absorption, rejection, rangeState,
    tickDir, candleDir, btcDom, riskMode, htfGatePass, session: sess.name,
    correlation, alignmentScore, premium, hurst, fd, ts
  };

  return {
    direction,
    quality: qualityScore,
    gate: direction ? "OK" : "NO_DIRECTION",
    alignmentScore,
    reasoning,
    entry,
    atr,
    session: sess.name,
    timestamp: Date.now()
  };
}

/* ================= ORIGINAL AI DECISION (Backward Compatibility) ================= */
async function AIDecision(symbol, tf, macro, btcDom) {
  const enhanced = await AIDecisionEnhanced(symbol, tf, macro, btcDom);
  
  // Convert to original format for backward compatibility
  if (enhanced.direction) {
    return {
      direction: enhanced.direction,
      quality: enhanced.quality,
      strategies: pipelineDatabase.strategies.slice(-3).map(x => `P_${x.symbol}`)
        .concat(pipelineDatabase.indicators.slice(-3).map(x => `I_${x.symbol}`))
        .concat(["Quantum", "Breakout", "MeanReversion", "Momentum", "LiquidityEngine"][Math.floor(Math.random() * 5)]),
      entry: enhanced.entry,
      atr: enhanced.atr,
      session: enhanced.session,
      gate: enhanced.gate
    };
  }
  
  return {
    direction: null,
    quality: 0,
    strategies: [],
    entry: enhanced.entry,
    atr: enhanced.atr,
    gate: enhanced.gate
  };
}

/* ================= TELEGRAM COMMANDS ================= */
async function handleTelegramCommand(msg) {
  const chatId = msg.chat.id;
  const text = msg.text?.trim();
  if (!text) return;
  const args = text.split(" ");
  const cmd = args[0].toLowerCase();

  if (cmd === "/watch") {
    const symbol = args[1]?.toUpperCase();
    if (!symbol) return send(chatId, "Usage: /watch SYMBOL");
    WATCH.set(symbol, { tf: SWING_TF[0] });
    return send(chatId, `${symbol} added to watchlist.`);
  }
  
  if (cmd === "/unwatch") {
    const symbol = args[1]?.toUpperCase();
    if (!symbol) return send(chatId, "Usage: /unwatch SYMBOL");
    WATCH.delete(symbol);
    return send(chatId, `${symbol} removed from watchlist.`);
  }
  
  if (cmd === "/list") {
    if (!WATCH.size) return send(chatId, "Watchlist empty.");
    return send(chatId, Array.from(WATCH.keys()).join(", "));
  }
  
  if (cmd === "/swing" || cmd === "/scalp") {
    const symbol = args[1]?.toUpperCase();
    if (!symbol) return send(chatId, `Usage: /swing SYMBOL or /scalp SYMBOL`);
    const tfs = cmd === "/swing" ? SWING_TF : SCALP_TF;
    const btcDom = await BTCDominance();
    const macro = await macro2Y(symbol);
    let results = [];
    for (const tf of tfs) {
      const decision = await AIDecisionEnhanced(symbol, tf, macro, btcDom);
      if (decision.direction) {
        results.push(
          `${tf} | ${decision.direction} | ${decision.quality.toFixed(2)}% | ` +
          `Entry: ${decision.entry.toFixed(2)} | ATR: ${decision.atr.toFixed(2)} | ` +
          `Gate: ${decision.gate} | Session: ${decision.session}`
        );
      }
    }
    return send(chatId, results.join("\n") || "No signals for this timeframe set.");
  }
  
  if (cmd === "/analyze") {
    const symbol = args[1]?.toUpperCase();
    const tf = args[2] || "1h";
    if (!symbol) return send(chatId, "Usage: /analyze SYMBOL [TIMEFRAME]");
    
    const decision = await AIDecisionEnhanced(symbol, tf);
    if (decision.gate === "OK") {
      const msg = `
🔍 ANALYSIS: ${symbol} ${tf}
📈 Direction: ${decision.direction}
🎯 Quality: ${decision.quality.toFixed(2)}%
💰 Entry: ${decision.entry.toFixed(2)}
📊 ATR: ${decision.atr.toFixed(2)}
⚡ Session: ${decision.session}
📊 Alignment: ${decision.alignmentScore}
🔍 Gate: ${decision.gate}
      `.trim();
      return send(chatId, msg);
    } else {
      return send(chatId, `❌ No signal: ${decision.gate} (Alignment: ${decision.alignmentScore})`);
    }
  }
  
  if (cmd === "/pipeline") {
    const count = pipelineDatabase.strategies.length;
    const misalign = pipelineDatabase.misalignment?.length || 0;
    const msg = `
📊 PIPELINE STATUS
Strategies: ${count}
Indicators: ${pipelineDatabase.indicators.length}
History: ${pipelineDatabase.history.length}
Misalignments: ${misalign}
Last Updated: ${new Date().toISOString()}
    `.trim();
    return send(chatId, msg);
  }
}

/* ================= MAIN ================= */
async function main() {
  console.log("🚀 OMNI INSTITUTIONAL AI — ENHANCED STARTED");
  console.log("📊 Session:", sessionBias().name);
  
  // Start pipeline extraction
  setInterval(async () => {
    for (const [symbol] of WATCH) {
      await extractPipeline(symbol);
      await sleep(1000);
    }
  }, DAILY_PIPELINE_MS);
  
  // Watchlist monitoring
  setInterval(async () => {
    for (const [symbol, config] of WATCH) {
      const decision = await AIDecisionEnhanced(symbol, config.tf);
      if (decision.direction && decision.gate === "OK" && decision.quality > 70) {
        const msg = `
🚨 SIGNAL ALERT: ${symbol} ${config.tf}
📈 Direction: ${decision.direction}
🎯 Quality: ${decision.quality.toFixed(2)}%
💰 Entry: ${decision.entry.toFixed(2)}
📊 ATR: ${decision.atr.toFixed(2)}
        `.trim();
        console.log(msg);
        if (TELEGRAM_CHAT_ID) {
          await send(TELEGRAM_CHAT_ID, msg);
        }
      }
      await sleep(1000);
    }
  }, WATCH_INTERVAL_MS);
  
  console.log("✅ All systems operational");
}

main().catch(console.error);
