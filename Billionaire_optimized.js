#!/usr/bin/env node
'use strict';

/*
=========================================================
INTEGRATED SIGNAL ENGINE (RENDER SAFE - COMPLETE)
Version: 6.0.0 (Integrated with Billion_render.js)
- Conflict-free signals
- Integrated decision engine
- Plug-ready for AI/HFT modules
=========================================================
*/


// Utility functions
const safeNumber = (v, fallback = 0) => Number.isNaN(Number(v)) ? fallback : Number(v);
const clamp = (v, min, max) => Math.max(min, Math.min(max, v));
const round = (v) => Math.round(v);
const floor = (v) => Math.floor(v);
const abs = (v) => Math.abs(v);
const sqrt = (v) => Math.sqrt(v);

// Global variables
let signalDir = null;
let riskLevel = null;
/* =========================
   CORE UTILITIES
========================= */

/* =========================
   INTEGRATED LOGIC FROM BILLION_RENDER.JS
========================= */
function computeTPSL(entry, direction, riskPct = 0.5) {
  entry = safeNumber(entry);
  const risk = entry * (riskPct / 100);

  if (direction === 'BUY') {
    return {
      tp: entry + risk * 2,
      sl: entry - risk
    }

function evaluateStrategies(results) {
  return results.filter(r => r.signal).map(r => r.weight);
}

function generateSignal(symbol, direction, strategyResults) {
  const price = await fetchLivePrice(symbol);
  if (!price) return null;

  const confidence = computeConfidence(evaluateStrategies(strategyResults));
  const { tp, sl }

function erf(x) {
  const t = 1.0 / (1.0 + 0.3275911 * Math.abs(x));
  const y = 1.0 - (((((1.061405429 * t - 1.453152027) * t) + 1.421413741) * t - 0.284496736) * t + 0.254829592) * t * Math.exp(-x * x);
  return x < 0 ? -y : y;
}

function computeVolumeProfile(candles) {
  if (!candles || candles.length < 20) return null;
  try {
    const prices   = candles.map(c => c.c);
    const volumes  = candles.map(c => c.v || 0);
    const totalVol = volumes.reduce((a,b)=>a+b, 0);
    if (totalVol === 0) return null;

    // VWAP -- volume-weighted average price
    const vwap = candles.reduce((sum, c) => sum + ((c.h+c.l+c.c)/3) * (c.v||0), 0) / totalVol;

    // CVD -- cumulative volume delta (buy pressure minus sell pressure)
    // Approximation: bullish candle = buy volume, bearish = sell volume
    let cvd = 0;
    const cvdSeries = candles.map(c => {
      const range = c.h - c.l;
      if (range === 0) return 0;
      const buyFrac  = (c.c - c.l) / range;
      const buyVol   = (c.v || 0) * buyFrac;
      const sellVol  = (c.v || 0) * (1 - buyFrac);
      cvd += buyVol - sellVol;
      return cvd;
    }

function getVolumeContext(symbol, price) {
  const cacheKey = `vol_${symbol}

function formatVolumeContext(volCtx, dir) {
  if (!volCtx || !volCtx.main) return '';
  const m = volCtx.main;
  const fmt = v => isNaN(v) ? 'N/A' : Number(v) > 1000 ? Number(v).toFixed(2) : Number(v).toFixed(4);

  const lines = ['\nâââ ð VOLUME & LIQUIDITY âââ'];

  // VWAP position
  const vwapSign = volCtx.aboveVWAP ? 'ð¢ above' : 'ð´ below';
  lines.push(`VWAP: <code>${fmt(m.vwap)}

function fetchNewsContext(symbol) {
  const cacheKey = `news_${symbol}

function newsAgreesWithSignal(newsCtx, dir) {
  if (!newsCtx) return true;  // no data = neutral, don't block
  if (newsCtx.riskLevel === 'EXTREME_FEAR'  && dir === 'BUY')  return false;
  if (newsCtx.riskLevel === 'EXTREME_GREED' && dir === 'BUY')  return false;
  if (newsCtx.sentiment === 'BEARISH'       && dir === 'BUY')  return false;
  if (newsCtx.sentiment === 'BULLISH'       && dir === 'SELL') return false;
  return true;
}

function formatNewsContext(newsCtx) {
  if (!newsCtx) return '';
  const lines = ['\nâââ ð° NEWS & SENTIMENT âââ'];

  if (newsCtx.fearGreed) {
    const fgIcon = newsCtx.riskLevel === 'EXTREME_FEAR' ? 'ð´'
                 : newsCtx.riskLevel === 'FEAR'         ? 'ð '
                 : newsCtx.riskLevel === 'EXTREME_GREED'? 'ð´'
                 : newsCtx.riskLevel === 'GREED'        ? 'ð¡' : 'ð¢';
    lines.push(`${fgIcon}

function detectPreInstitutionalLevel(candles, price, dir, volCtx, liqCtx) {
  if (!candles || candles.length < 30 || !price) return null;

  try {
    const candidates = [];
    const fmt6 = v => Math.round(v * 1000000) / 1000000;

    // ââ CANDIDATE 1: Untested FVG closest to current price in signal direction ââ
    if (liqCtx?.openFVGs?.length) {
      const relevantFVGs = liqCtx.openFVGs.filter(fvg => {
        if (dir === 'BUY')  return fvg.mid < price && fvg.type === 'BULL';
        if (dir === 'SELL') return fvg.mid > price && fvg.type === 'BEAR';
        return false;
      }

function getPreInstitutionalContext(symbol, price, dir, volCtx, liqCtx) {
  const key = `preinst_${symbol}

function formatPreInstContext(preInst, dir) {
  if (!preInst) return '';
  const lines = ['\nâââ ð¯ PRE-INSTITUTIONAL ENTRY âââ'];
  lines.push(`ðï¸ <b>Institutional target detected</b> (${preInst.confidence}

function buildInstitutionalContextFull(symbol, price, dir) {
  try {
    // Run all contexts in parallel -- v2 + v3 layers combined
    const [baseCtx, volCtx, newsCtx, corrCtx, onChainCtx, socialCtx] = await Promise.all([
      buildInstitutionalContext(symbol, price).catch(()=>null),
      getVolumeContext(symbol, price).catch(()=>null),
      fetchNewsContext(symbol).catch(()=>null),
      getCorrelationBias(symbol, dir || 'BUY').catch(()=>null),
      fetchOnChainData(symbol).catch(()=>null),
      fetchEnhancedSocialSentiment(symbol).catch(()=>null),
    ]);

    const liqCtx = baseCtx?.liq || null;

    // Pre-institutional detector needs vol + liq data
    const preInstCtx = await getPreInstitutionalContext(symbol, price, dir, volCtx, liqCtx)
      .catch(()=>null);

    // v4+v5: fetch candles once, share across both engine layers
    const _sharedCandles = await fetchCandlesCached(symbol, '1h', 80).catch(()=>null);
    const v4Ctx = await getV4Context(symbol, _sharedCandles, price, dir || 'BUY', volCtx).catch(()=>null);
    const v5Ctx = await getV5Context(symbol, _sharedCandles, price, dir || 'BUY', volCtx).catch(()=>null);

    return {
      ...baseCtx,
      vol:     volCtx,
      news:    newsCtx,
      preInst: preInstCtx,
      corr:    corrCtx,
      onChain: onChainCtx,
      social:  socialCtx,
      v4:      v4Ctx,
      v5:      v5Ctx,
      _full:   true,
      _v3:     true,
      _v4:     true,
      _v5:     true,
    }

function getPreInstCertaintyBoost(preInstCtx, volCtx, instCtx, dir) {
  let boost = 0;
  if (!preInstCtx) return 0;

  // Each confirmed pre-institutional signal adds to certainty
  if (preInstCtx.type === 'SWEEP')  boost += 15;  // stop sweep is highest confidence
  if (preInstCtx.type === 'FVG')    boost += 12;  // FVG must be filled
  if (preInstCtx.type === 'VWAP')   boost += 8;   // VWAP mean reversion
  if (preInstCtx.type === 'HVN')    boost += 8;   // volume node
  if (preInstCtx.type === 'ROUND')  boost += 5;   // psychological level

  // Extra boost for volume absorption confirmation
  if (volCtx?.main?.absorption)     boost += 8;
  if (volCtx?.main?.cvdTrend === (dir === 'BUY' ? 'BULLISH' : 'BEARISH')) boost += 5;

  // Cap boost at 25 so we don't create false certainty
  return Math.min(boost, 25);
}

function logSignalFired(symbol, consensus, instCtx, scored) {
  try {
    const b = consensus?.bestSig;
    const entry = {
      symbol,
      dir:     consensus?.consensusDirection || 'NEUTRAL',
      cert:    consensus?.certaintyScore     || 0,
      conv:    consensus?.convictionPct      || 0,
      tradeT:  consensus?.tradeType          || 'INTRADAY',
      verdict: scored?.verdict || '?',
      score:   scored?.score   || 0,
      mtfTier: consensus?.mtfTier || 'SPECULATIVE',
      entry:   b?.entry       || 0,
      sl:      b?.stop_loss   || 0,
      tp1:     b?.take_profits?.[0] || 0,
      wyckoff: instCtx?.wyckoff?.phase    || 'UNKNOWN',
      trapped: instCtx?.trap?.trapped     || false,
      trapDir: instCtx?.trap?.direction   || 'NONE',
      session: instCtx?.kz?.name          || 'OFF_SESSION',
      pillars: [
        instCtx?.wyckoff?.bias === (consensus?.consensusDirection),
        instCtx?.struct?.choch || instCtx?.struct?.bos,
        instCtx?.trap?.direction === (consensus?.consensusDirection),
        instCtx?.kz?.active,
      ].filter(Boolean).length,
      preInst:  instCtx?.preInst?.type    || null,
      cvd:      instCtx?.vol?.main?.cvdTrend || null,
      newsSent: instCtx?.news?.sentiment  || 'NEUTRAL',
      newsRisk: instCtx?.news?.riskLevel  || 'NORMAL',
      ts:       Date.now(),
      outcome:  null,
      pnl:      null,
    }

function logSignalOutcome(symbol, dir, entryPrice, won) {
  for (let i = SIGNAL_JOURNAL.length - 1; i >= 0; i--) {
    const e = SIGNAL_JOURNAL[i];
    if (e.symbol === symbol && e.dir === dir && e.outcome === null &&
        (!entryPrice || Math.abs(e.entry - entryPrice) / (entryPrice || 1) < 0.015)) {
      e.outcome = won ? 'WIN' : 'LOSS';
      try { if (typeof fs !== 'undefined') fs.writeFileSync(SIGNAL_JOURNAL_FILE, JSON.stringify(SIGNAL_JOURNAL)); }

function getJournalStats(days = 30) {
  const cutoff = Date.now() - days * 864e5;
  const recent = SIGNAL_JOURNAL.filter(e => e.ts >= cutoff);
  const done   = recent.filter(e => e.outcome !== null);
  const wins   = done.filter(e => e.outcome === 'WIN').length;
  const losses = done.filter(e => e.outcome === 'LOSS').length;

  const bySymbol = {}

function formatJournalMessage(days = 7) {
  const s = getJournalStats(days);
  const recent = SIGNAL_JOURNAL.slice(-10).reverse();
  const L = [`ð <b>Signal Journal -- last ${days}

function sendWeeklyJournalIfDue() {
  if (!TELEGRAM_CHAT_ID) return;
  const now = new Date();
  if (now.getUTCDay() !== 1 || now.getUTCHours() !== 8) return;
  const last = LAST_ALERT.get('weekly_journal') || 0;
  if (Date.now() - last < 20 * 3600 * 1000) return;
  LAST_ALERT.set('weekly_journal', Date.now());
  try {
    await tg('sendMessage', { chat_id: TELEGRAM_CHAT_ID,
      text: formatJournalMessage(7), parse_mode: 'HTML', disable_web_page_preview: true }

function getCorrelationBias(symbol, dir) {
  const key = `corr_${symbol}

function formatCorrelationContext(ctx) {
  if (!ctx) return '';
  const L = ['\nâââ ð CORRELATION âââ'];
  L.push(`BTC dominance: <b>${ctx.dom}

function fetchOnChainData(symbol) {
  const coin = symbol.replace('USDT','').replace('1000','').toLowerCase();
  const key  = `oc_${coin}

function onChainAgreesWithSignal(oc, dir) {
  if (!oc) return true;
  if (dir === 'BUY'  && oc.lsRatio > 1.8)   return false; // crowded longs
  if (dir === 'SELL' && oc.lsRatio < 0.6)    return false; // crowded shorts
  if (dir === 'BUY'  && oc.fundingRate > 0.1) return false; // everyone already long
  return true;
}

function formatOnChainContext(oc, dir) {
  if (!oc || (oc.fundingRate === null && oc.lsRatio === null)) return '';
  const L = ['\nâââ âï¸ ON-CHAIN âââ'];
  if (oc.fundingRate !== null) {
    const ic = Math.abs(oc.fundingRate) > 0.05 ? 'ð´' : Math.abs(oc.fundingRate) > 0.02 ? 'ð¡' : 'ð¢';
    L.push(`${ic}

function fetchEnhancedSocialSentiment(symbol) {
  const coin = symbol.replace('USDT','').replace('1000','').toLowerCase();
  const key  = `soc_${coin}

function backtestSymbol(symbol, lookbackDays = 30) {
  try {
    const lim      = Math.min(200, lookbackDays * 24);
    const [c1h, c4h] = await Promise.all([
      fetchCandlesCached(symbol, '1h', lim).catch(()=>null),
      fetchCandlesCached(symbol, '4h', Math.floor(lim/4)).catch(()=>null),
    ]);
    if (!c1h || c1h.length < 50) return null;
    let wins = 0, losses = 0, skipped = 0;
    for (let i = 30; i < c1h.length - 10; i++) {
      const sl    = c1h.slice(0, i);
      const price = sl[sl.length-1].c;
      const wy    = getWyckoffContext(c4h ? c4h.slice(0, Math.floor(i/4)) : sl);
      const st    = getStructureContext(sl);
      const tr    = getFailureTrapContext(sl);
      const bull  = wy.bias==='BUY' || st.choch || (tr.trapped && tr.direction==='BUY');
      const bear  = wy.bias==='SELL'|| (tr.trapped && tr.direction==='SELL');
      if (!bull && !bear) { skipped++; continue; }

function formatBacktestResult(bt) {
  if (!bt) return 'â Backtest failed -- insufficient data';
  return [
    `ð§ª <b>Backtest: ${bt.symbol}

function reconstructOrderFlow(candles, price) {
  if (!candles || candles.length < 30 || !price) return null;
  try {
    const slice = candles.slice(-60);
    const avgVol = slice.reduce((a,c)=>a+(c.v||0),0)/slice.length;

    // Iceberg detection -- large volume but tiny price move = hidden order
    const icebergs = [];
    for (let i = 1; i < slice.length; i++) {
      const c = slice[i], prev = slice[i-1];
      const priceMove = Math.abs(c.c - prev.c) / prev.c;
      const vol       = c.v || 0;
      const volRatio  = avgVol > 0 ? vol / avgVol : 1;
      // High volume + small price move = absorption = iceberg order
      if (volRatio > 2.5 && priceMove < 0.002) {
        const side = c.c > c.o ? 'BUY_ICEBERG' : 'SELL_ICEBERG';
        icebergs.push({ price: c.c, size: Math.round(volRatio * 10) / 10, side, ts: c.t }

function getLeadLagBias(symbol) {
  const key = `lag_${symbol}

function detectRegimeChange(candles) {
  if (!candles || candles.length < 40) return null;
  try {
    const slice = candles.slice(-40);
    const closes = slice.map(c=>c.c);
    const n = closes.length;

    // Hurst exponent (simplified R/S analysis)
    function hurst(prices) {
      const n = prices.length;
      if (n < 10) return 0.5;
      const mean = prices.reduce((a,b)=>a+b,0)/n;
      const devi = prices.map(p=>p-mean);
      let cumSum = 0;
      const cumDev = devi.map(d=>(cumSum+=d,cumSum));
      const R = Math.max(...cumDev) - Math.min(...cumDev);
      const S = Math.sqrt(devi.reduce((a,d)=>a+d*d,0)/n);
      return S>0 ? Math.log(R/S)/Math.log(n) : 0.5;
    }

function detectSmartMoneyDivergence(candles, volCtx, dir) {
  if (!candles || candles.length < 20) return null;
  try {
    const slice   = candles.slice(-20);
    const prices  = slice.map(c=>c.c);
    const priceHigh = Math.max(...prices);
    const priceLow  = Math.min(...prices);
    const recentH   = Math.max(...prices.slice(-5));
    const recentL   = Math.min(...prices.slice(-5));

    // Price making new high/low but not confirmed institutionally
    const priceNewHigh = recentH >= priceHigh * 0.999;
    const priceNewLow  = recentL <= priceLow  * 1.001;

    // CVD divergence -- price up but CVD declining
    const cvdTrend = volCtx?.main?.cvdTrend;
    const absorption = volCtx?.main?.absorption;
    const volDecline = volCtx?.main?.volDecline;

    // Bearish divergence: new high + CVD bearish + declining vol
    const bearDiv = priceNewHigh && cvdTrend === 'BEARISH' && (volDecline || absorption);
    // Bullish divergence: new low + CVD bullish + absorption
    const bullDiv = priceNewLow  && cvdTrend === 'BULLISH' && absorption;

    if (!bearDiv && !bullDiv) return null;

    const divType = bearDiv ? 'BEARISH_DIVERGENCE' : 'BULLISH_DIVERGENCE';
    const action  = bearDiv ? 'Consider reducing LONG or flipping SHORT'
                            : 'Consider reducing SHORT or flipping LONG';
    const conf    = Math.min(85, (bearDiv||bullDiv ? 65 : 0) + (absorption?15:0) + (volDecline?10:0));

    return { detected: true, type: divType, action, confidence: conf,
      priceNewExtreme: bearDiv ? priceNewHigh : priceNewLow }

function getAdaptiveThresholds(symbol) {
  const global = CALIBRATION_DATA['_global'] || { certMin: 65, pillarsMin: 2, bestSession: null }

function updateCalibration() {
  try {
    // Analyse signal journal to compute per-symbol optimal thresholds
    const cutoff = Date.now() - 60 * 864e5; // 60 days
    const recent = (typeof SIGNAL_JOURNAL !== 'undefined' ? SIGNAL_JOURNAL : [])
      .filter(e => e.ts >= cutoff && e.outcome !== null);
    if (recent.length < 5) return;

    // Per-symbol analysis
    const bySymbol = {}

function updateOrderBlockMemory(symbol, candles, price) {
  if (!candles || candles.length < 20 || !price) return;
  try {
    const existing = OB_MEMORY.get(symbol) || [];
    const slice    = candles.slice(-50);
    const avgVol   = slice.reduce((a,c)=>a+(c.v||0),0)/slice.length;

    // Detect new order blocks from recent candles
    for (let i = 3; i < slice.length - 1; i++) {
      const c = slice[i], prev3 = slice.slice(i-3,i);
      const avgP3 = prev3.reduce((a,x)=>a+(x.v||0),0)/3;
      if ((c.v||0) < avgP3 * 0.5) continue; // must be above-average vol

      const isBullOB = c.c > c.o &&
        prev3.every(x=>x.c<x.o) &&   // preceded by bearish candles
        (c.v||0) > avgVol * 1.2;
      const isBearOB = c.c < c.o &&
        prev3.every(x=>x.c>x.o) &&   // preceded by bullish candles
        (c.v||0) > avgVol * 1.2;

      if (isBullOB || isBearOB) {
        const obPrice  = isBullOB ? c.l : c.h;
        const strength = Math.min(100, Math.round((c.v||0)/avgVol*40 + 60));
        const isDupe   = existing.some(ob=>Math.abs(ob.price-obPrice)/obPrice<0.003);
        if (!isDupe) {
          existing.push({ price: obPrice, type: isBullOB?'BULLISH':'BEARISH',
            formed: c.t, tested: false, testedAt: null, strength }

function getNearestOBs(symbol, price, dir) {
  const obs = OB_MEMORY.get(symbol) || [];
  const relevant = obs.filter(ob => {
    const dist = Math.abs(ob.price - price) / price;
    if (dist > 0.08) return false; // must be within 8%
    if (dir==='BUY'  && ob.type==='BULLISH' && ob.price < price) return true; // support OB below
    if (dir==='SELL' && ob.type==='BEARISH' && ob.price > price) return true; // resistance OB above
    return false;
  }

function simulateStopCascade(candles, price, dir) {
  if (!candles || candles.length < 30 || !price) return null;
  try {
    const liq = getLiquidityContext(candles, price);
    if (!liq) return null;

    const targets = dir==='BUY' ? liq.below : liq.above;
    if (!targets || targets.length === 0) return null;

    const atr = candles.slice(-14).reduce((a,c)=>a+(c.h-c.l),0)/14;
    const cascadeTargets = [];

    // For each liquidity pool, estimate cascade depth
    targets.slice(0,4).forEach((target, i) => {
      const distPct  = Math.abs(target-price)/price*100;
      const poolMass = i===0 ? 'LARGE' : i===1 ? 'MEDIUM' : 'SMALL';
      // After sweep: price bounces atr*1.2 in the original direction
      const reversal = dir==='BUY' ? target + atr*1.2 : target - atr*1.2;
      cascadeTargets.push({
        level: Math.round(target*10000)/10000,
        distPct: Math.round(distPct*100)/100,
        mass: poolMass,
        expectedReversal: Math.round(reversal*10000)/10000,
        probability: Math.max(20, 80 - i*18),
      }

function predictSessionOpening(candles) {
  if (!candles || candles.length < 10) return null;
  try {
    const now   = new Date();
    const utcH  = now.getUTCHours(), utcM = now.getUTCMinutes();
    // 30-min pre-session windows
    const preLondon = (utcH===6 && utcM>=30) || (utcH===6);
    const preNY     = (utcH===11 && utcM>=30) || (utcH===11);
    const preAsia   = (utcH===23 && utcM>=30) || (utcH===23);
    if (!preLondon && !preNY && !preAsia) return null;

    const session = preLondon?'London':preNY?'New York':'Asia';
    // Pre-session volume vs prior 6h average
    const recentVol = candles.slice(-3).reduce((a,c)=>a+(c.v||0),0)/3;
    const avgVol    = candles.slice(-30,-3).reduce((a,c)=>a+(c.v||0),0)/27;
    const volRatio  = avgVol>0 ? recentVol/avgVol : 1;

    // Pre-session price drift direction (last 3 candles)
    const drift = candles[candles.length-1].c - candles[candles.length-4].c;
    const driftDir = drift > 0 ? 'BUY' : 'SELL';
    // High pre-session vol + drift = confirms opening direction
    const confirms = volRatio > 1.3;
    const confidence = Math.min(78, Math.round(40 + (volRatio-1)*25 + (confirms?15:0)));

    return { session, driftDir, volRatio: Math.round(volRatio*100)/100,
      confirms, confidence,
      label: `${session}

function marketMakerGameTheory(candles, price) {
  if (!candles || candles.length < 20 || !price) return null;
  try {
    const slice  = candles.slice(-20);
    const highs  = slice.map(c=>c.h), lows = slice.map(c=>c.l);
    const maxH   = Math.max(...highs), minL = Math.min(...lows);
    const range  = maxH - minL;
    if (range <= 0) return null;

    // Market maker position proxy: where is price in range?
    const rangePos = (price - minL) / range; // 0=bottom, 1=top

    // Market makers must stay delta-neutral.
    // If they've been selling as price rose (writing calls), they must buy
    // to hedge when price rises above 70% of range.
    // If they've been buying as price fell (writing puts), they must sell
    // when price falls below 30% of range.
    let mmForcedDir = 'NEUTRAL', mmConf = 0;
    if (rangePos > 0.72) {
      // MM heavily short gamma -- forced to BUY as price rises
      mmForcedDir = 'BUY';
      mmConf = Math.min(75, Math.round((rangePos - 0.72) * 250 + 50));
    }

function predictiveLiquidityMap(candles, price, dir) {
  if (!candles || candles.length < 30 || !price) return null;
  try {
    const liq = getLiquidityContext(candles, price);
    if (!liq) return null;
    const atr = candles.slice(-14).reduce((a,c)=>a+(c.h-c.l),0)/14;

    // Primary targets (already detected sweep zones)
    const primaryTargets = (dir==='BUY' ? liq.below : liq.above).slice(0,3);

    // Secondary targets -- FVG magnets
    const fvgTargets = (liq.openFVGs||[])
      .filter(f=>(dir==='BUY'&&f.mid<price)||(dir==='SELL'&&f.mid>price))
      .map(f=>f.mid).slice(0,2);

    // Tertiary -- ATR extension levels
    const ext1 = dir==='BUY' ? price-atr*1.5 : price+atr*1.5;
    const ext2 = dir==='BUY' ? price-atr*2.8 : price+atr*2.8;

    const allTargets = [
      ...primaryTargets.map((t,i)=>({level:t,type:'LIQUIDITY_POOL',probability:80-i*15,sequence:i+1}

function getV4Context(symbol, candles, price, dir, volCtx) {
  const key = `v4_${symbol}

function formatV4Context(ctx, dir) {
  const v4 = ctx?.v4;
  if (!v4) return '';
  const L = [];

  // Order flow / iceberg
  if (v4.orderFlow?.hiddenBias && v4.orderFlow.hiddenBias !== 'NEUTRAL') {
    L.push(`\nâââ ð HIDDEN ORDER FLOW âââ`);
    const icon = v4.orderFlow.hiddenBias === 'BUY' ? 'ð¢' : 'ð´';
    L.push(`${icon}

function predatorPreyLiquidity(candles) {
  if (!candles || candles.length < 40) return null;
  try {
    const slice  = candles.slice(-60);
    const avgVol = slice.reduce((a,c)=>a+(c.v||0),0)/slice.length||1;

    // Map candle data to prey (retail stop buildup) and predator (sweep activity)
    const prey = [], predator = [];
    for (let i = 0; i < slice.length; i++) {
      const c = slice[i];
      // Prey proxy: number of equal highs/lows near this candle (stop clusters)
      const nearH = slice.slice(Math.max(0,i-5),i).filter(x=>Math.abs(x.h-c.h)/c.h<0.002).length;
      const nearL = slice.slice(Math.max(0,i-5),i).filter(x=>Math.abs(x.l-c.l)/c.l<0.002).length;
      prey.push(nearH + nearL);
      // Predator proxy: high volume + candle sweeps through prior high/low
      const prevH = i>0 ? Math.max(...slice.slice(Math.max(0,i-3),i).map(x=>x.h)) : c.h;
      const prevL = i>0 ? Math.min(...slice.slice(Math.max(0,i-3),i).map(x=>x.l)) : c.l;
      const swept = (c.h > prevH && c.c < prevH) || (c.l < prevL && c.c > prevL);
      predator.push(swept && (c.v||0)>avgVol*1.3 ? 1 : 0);
    }

function isingPhaseTransition(candles) {
  if (!candles || candles.length < 30) return null;
  try {
    const slice  = candles.slice(-40);
    const closes = slice.map(c=>c.c);

    // Assign spins: +1 bullish candle, -1 bearish candle
    const spins = slice.map(c => c.c > c.o ? 1 : -1);
    const n = spins.length;

    // Compute coupling constant J from autocorrelation
    let autocorr = 0;
    for (let i = 0; i < n-1; i++) autocorr += spins[i] * spins[i+1];
    const J = autocorr / (n-1);

    // Temperature proxy = normalized volatility
    const returns = closes.slice(1).map((p,i)=>Math.abs(p-closes[i])/closes[i]);
    const avgRet  = returns.reduce((a,b)=>a+b,0)/returns.length||0.01;
    const T = Math.min(5, avgRet * 500); // normalized temperature

    // Magnetization = mean spin (consensus)
    const M = spins.reduce((a,b)=>a+b,0)/n;

    // Susceptibility = variance of spins -- peaks at phase transition
    const variance = spins.reduce((a,s)=>a+(s-M)*(s-M),0)/n;
    const chi = variance; // magnetic susceptibility

    // Critical temperature for 1D Ising: Tc = 2J/ln(1+sqrt(2)) â 2.27J
    const Tc = J > 0 ? 2.27 * Math.abs(J) : 0.5;

    // Near-critical if |T - Tc| < 0.3
    const nearCritical = Math.abs(T - Tc) < 0.3;
    const ordered      = Math.abs(M) > 0.6;
    const disordered   = Math.abs(M) < 0.2;

    // Phase state
    const phase = nearCritical ? 'CRITICAL_TRANSITION'
                : ordered      ? (M > 0 ? 'BULLISH_PHASE' : 'BEARISH_PHASE')
                : 'DISORDERED';

    // Correlation length diverges at critical point -- large spatial coherence
    // In markets: long-range order = all TFs about to align simultaneously
    const corrLength = nearCritical ? Math.round(10/(Math.abs(T-Tc)+0.1)) : 1;

    // Predict transition direction from spin trend
    const spinMomentum = spins.slice(-5).reduce((a,b)=>a+b,0)/5;
    const transitionDir = spinMomentum > 0.2 ? 'BUY'
                        : spinMomentum < -0.2 ? 'SELL' : 'NEUTRAL';

    const signal = nearCritical && !ordered  ? 'CRYSTALLIZATION_IMMINENT'
                 : nearCritical && ordered    ? 'PHASE_BREAK_RISK'
                 : ordered                    ? 'TREND_LOCKED'
                 : 'RANGING';
    const confidence = nearCritical ? Math.min(82, Math.round(corrLength*8+40)) : ordered ? 60 : 30;

    return { phase, signal, M: Math.round(M*100)/100, T: Math.round(T*100)/100,
      Tc: Math.round(Tc*100)/100, chi: Math.round(chi*100)/100,
      corrLength, transitionDir, nearCritical, confidence,
      label: `${signal}

function attractorReconstruction(candles) {
  if (!candles || candles.length < 50) return null;
  try {
    const prices = candles.slice(-60).map(c=>c.c);
    const n = prices.length;

    // Find optimal delay Ï using first minimum of mutual information
    // Approximation: first zero of autocorrelation
    let tau = 3; // default
    for (let lag = 1; lag <= 10; lag++) {
      let corr = 0;
      for (let i = lag; i < n; i++) corr += (prices[i]-prices[n-1]) * (prices[i-lag]-prices[n-1]);
      if (corr < 0) { tau = lag; break; }

function computeTransferEntropy(symbol) {
  const key = `te_${symbol}

function entropy(series) {
      const counts={0:0,1:0}

function jointEntropy(s1, s2) {
      const counts={}

function encodeEpigeneticMemory(symbol, candles) {
  if (!candles||candles.length<20) return;
  try {
    const existing  = EPIGENETIC_MEMORY.get(symbol)||[];
    const slice     = candles.slice(-30);
    const avgVol    = slice.reduce((a,c)=>a+(c.v||0),0)/slice.length||1;

    // Detect traumatic events: flash crash (>4% drop in 1 candle),
    // squeeze (>5% rise in 1 candle), capitulation (extreme vol + reversal)
    slice.forEach((c,i) => {
      if (i<2) return;
      const chg = Math.abs(c.c - c.o) / c.o;
      if (chg < 0.03) return;
      const type    = c.c < c.o ? 'TRAUMA_CRASH' : 'TRAUMA_SQUEEZE';
      const strength= Math.min(100, Math.round(chg*1000 + (c.v||0)/avgVol*20));
      const isDupe  = existing.some(m=>Math.abs(m.price-c.c)/c.c<0.005);
      if (!isDupe) existing.push({ price:c.c, type, strength, ts:c.t||Date.now() }

function checkEpigeneticReactivation(symbol, price, volCtx) {
  const memories = EPIGENETIC_MEMORY.get(symbol)||[];
  if (!memories.length||!price) return null;
  const volRatio = volCtx?.main?.volRatio||1;

  // Find memories within 1.5% of current price
  const active = memories.filter(m=>{
    const dist = Math.abs(m.price-price)/price;
    // Volume must be elevated (similar conditions to original trauma)
    return dist<0.015 && volRatio>1.1;
  }

function turingPatternDetector(candles) {
  if (!candles||candles.length<40) return null;
  try {
    const slice  = candles.slice(-50);
    const closes = slice.map(c=>c.c);
    const n      = closes.length;
    const mean   = closes.reduce((a,b)=>a+b,0)/n;

    // Activator proxy: local bullish momentum (short-range)
    // Inhibitor proxy: distance from mean (long-range resistance)
    const activator = closes.map((p,i) => {
      if (i<2) return 0;
      return (p - closes[i-1]) / closes[i-1]; // local momentum
    }

function nashEquilibriumDetector(candles, price, volCtx) {
  if (!candles||candles.length<30||!price) return null;
  try {
    const slice   = candles.slice(-40);
    const closes  = slice.map(c=>c.c);
    const vols    = slice.map(c=>c.v||0);
    const n       = closes.length;

    // VWAP as initial Nash estimate (institutions' reference price)
    const vwap = volCtx?.main?.vwap || closes.reduce((a,p,i)=>a+p*(vols[i]||1),0) / (vols.reduce((a,b)=>a+(b||1),0)||1);

    // Point of control (highest volume price level)
    const poc = volCtx?.main?.poc || vwap;

    // Bull payoff: profit if price rises above current position
    // Bear payoff: profit if price falls below current position
    // MM payoff: negative of |deviation from delta-neutral|
    const bullPayoff  = (p) => (p-price)/price;
    const bearPayoff  = (p) => (price-p)/price;
    const mmPayoff    = (p) => -Math.abs(p-vwap)/vwap;

    // Best response iteration (simplified)
    // Equilibrium where marginal payoffs balance
    let nashPrice = (vwap * 0.4 + poc * 0.35 + price * 0.25);
    for (let iter=0; iter<10; iter++) {
      const bullBR = price + (vwap-price)*0.3;  // bulls settle near vwap
      const bearBR = price - (price-poc)*0.3;   // bears settle near poc
      const mmBR   = vwap;                       // MMs want price at vwap
      nashPrice = (bullBR + bearBR + mmBR)/3;
    }

function percolationThresholdDetector(candles, price) {
  if (!candles||candles.length<20||!price) return null;
  try {
    const slice  = candles.slice(-30);
    const n      = slice.length;

    // Proxy for order book connectivity from candle data:
    // High-wick candles = orders being filled rapidly (bonds being removed)
    // Large bid-ask spread proxy = wick size relative to body
    const connectivity = slice.map(c => {
      const body  = Math.abs(c.c-c.o);
      const range = c.h-c.l || 0.0001;
      return body/range; // 1 = full body (good liquidity), 0 = all wicks (depleted)
    }

function getV5Context(symbol, candles, price, dir, volCtx) {
  const key = `v5_${symbol}

function getV5CertaintyBoost(v5, dir) {
  if (!v5) return 0;
  let boost = 0;
  // Predator-prey: post-feast = best entry
  if (v5.predatorPrey?.signal === 'STRONG_ENTRY') boost += 8;
  if (v5.predatorPrey?.signal === 'SWEEP_IMMINENT') boost += 4;
  if (v5.predatorPrey?.phase === 'ACTIVE_SWEEP')   boost -= 5;
  // Ising: crystallization in our direction
  if (v5.ising?.signal==='CRYSTALLIZATION_IMMINENT' && v5.ising?.transitionDir===dir) boost += 10;
  if (v5.ising?.signal==='TREND_LOCKED' && v5.ising?.transitionDir===dir)             boost += 6;
  if (v5.ising?.signal==='PHASE_BREAK_RISK')                                           boost -= 8;
  // Attractor: prediction matches direction
  if (v5.attractor?.predictedDir===dir && v5.attractor?.confidence>60) boost += 7;
  if (v5.attractor?.predictedDir!==dir && v5.attractor?.confidence>60) boost -= 5;
  // Transfer entropy: info flowing in our direction
  if (v5.transferEnt?.flowing && v5.transferEnt?.predictedDir===dir) boost += 6;
  if (v5.transferEnt?.flowing && v5.transferEnt?.predictedDir!==dir) boost -= 4;
  // Epigenetic: memory matches signal
  if (v5.epigenetic?.signalDir===dir)  boost += 7;
  if (v5.epigenetic?.signalDir!==dir)  boost -= 5;
  // Turing: predicted direction matches
  if (v5.turing?.turingActive && v5.turing?.predictedDir===dir) boost += 5;
  // Nash: price far from equilibrium in our direction
  if (v5.nash?.nasDir===dir && v5.nash?.gravity>0.015) boost += 6;
  // Percolation: liquidity crisis â do not enter
  if (v5.percolation?.inCrisis)   boost -= 20;
  if (v5.percolation?.nearCrisis) boost -= 10;
  return Math.max(-30, Math.min(25, boost));
}

function formatV5Context(ctx, dir) {
  const v5 = ctx?.v5;
  if (!v5) return '';
  const L  = [];
  const fmt = v => isNaN(v)?'N/A':Number(v)>1000?Number(v).toFixed(2):Number(v).toFixed(4);

  // Percolation (critical -- show first if crisis)
  if (v5.percolation?.riskLevel !== 'NORMAL') {
    L.push('\nâââ â ï¸ LIQUIDITY PERCOLATION âââ');
    const ic = v5.percolation.inCrisis?'ð´':v5.percolation.nearCrisis?'ð ':'ð¡';
    L.push(`${ic}

function confirmEntryCandle(candles, dir) {
  // Require the most recent closed candle to confirm direction
  // before placing any order. Eliminates entries mid-sweep.
  if (!candles || candles.length < 3) return { confirmed: false, reason: 'Insufficient candles' }

function computeDynamicPositionSize(consensus, instCtx, baseSize) {
  if (!consensus || !baseSize) return { size: baseSize, multiplier: 1.0, reason: 'Default size' }

function validateSignalFreshness(signalEntry, currentPrice, dir) {
  if (!signalEntry || !currentPrice || isNaN(signalEntry) || isNaN(currentPrice)) {
    return { fresh: true, reason: 'No price check available' }

function computeMultiConfirmationGate(consensus, instCtx) {
  const dir     = consensus?.consensusDirection;
  const wy      = instCtx?.wyckoff || {}

function scanForAbsorption(candles, sweepLevel, dir) {
  // Look for absorption candles at the sweep level:
  // High volume + small close-range (institutions absorbing the sweep)
  if (!candles || !sweepLevel) return null;
  const recent    = candles.slice(-8);
  const avgVol    = recent.reduce((a, c) => a + (c.v || 0), 0) / recent.length;

  const absorption = recent.filter(cc => {
    const near   = Math.abs(cc.l - sweepLevel) / sweepLevel < 0.005 ||
                   Math.abs(cc.h - sweepLevel) / sweepLevel < 0.005;
    const hiVol  = (cc.v || 0) >= avgVol * 1.5;
    const body   = Math.abs(cc.c - cc.o);
    const range  = (cc.h - cc.l) || 0.0001;
    const smallBody = body / range < 0.45; // small body = absorbed, not trending
    return near && hiVol && smallBody;
  }

function formatScoringTransparency(scoreResult, consensus, instCtx) {
  if (!scoreResult?.reasons?.length) return '';
  const positives = scoreResult.reasons.filter(r => r.includes('â') || r.includes('ð¯'));
  const warnings  = scoreResult.reasons.filter(r => r.includes('â ï¸') || r.includes('â'));
  const lines = ['\nâââ ð SCORE BREAKDOWN âââ'];
  if (positives.length) lines.push(...positives.slice(0, 4));
  if (warnings.length)  lines.push(...warnings.slice(0, 3));
  lines.push(`<i>Score: ${scoreResult.score}

function hasDeadlyConflict(consensus) {
  const dir       = consensus?.consensusDirection;
  if (!dir || dir === 'NEUTRAL') return false;
  const tfSignals = consensus?.tfSignals || {}

function getSessionQuality() {
  const h = new Date().getUTCHours();
  const d = new Date().getUTCDay(); // 0=Sun 6=Sat

  // Weekend: severely reduced quality
  if (d === 0 || d === 6) return { quality: 'POOR', score: 20, note: 'Weekend -- low volume, spreads wide' }

function getV6Context(symbol, consensus, instCtx) {
  const key = `v6_${symbol}

function getV6CertaintyBoost(v6, dir) {
  if (!v6) return 0;
  let boost = 0;
  if (v6.gate?.confirmed)         boost += 8;   // all confirmation gates passed
  if (v6.fullyConfirmed)          boost += 5;   // fully confirmed setup
  if (v6.entryCandle?.confirmed)  boost += 6;   // entry candle confirms direction
  if (v6.absorption?.detected)    boost += 7;   // institutional absorption at sweep
  if (v6.sessQ?.quality === 'PRIME') boost += 4; // prime session
  if (v6.fresh?.partialDrift)     boost -= 3;   // slightly chased
  if (!v6.fresh?.fresh)           boost -= 15;  // stale signal -- heavy penalty
  if (v6.deadly)                  boost -= 12;  // conflict TFs
  if (v6.sessQ?.quality === 'POOR') boost -= 8; // dead session
  return Math.max(-25, Math.min(15, boost));
}

function formatV6Context(v6, dir, scoreResult, consensus, instCtx) {
  if (!v6) return '';
  const lines = [];

  // Freshness warning -- always show if stale
  if (!v6.fresh?.fresh) {
    lines.push('\nâââ â ï¸ SIGNAL STALE âââ');
    lines.push(`ð« ${v6.fresh.reason}

function computeVacuumZoneEntry(candles, price, dir, liqCtx, volCtx) {
  if (!candles || candles.length < 20 || !price || !liqCtx) return null;
  try {
    const atr = candles.slice(-14).reduce((a,c) => a + (c.h - c.l), 0) / 14;
    if (!atr || atr <= 0) return null;

    // All pools in sweep direction, sorted by distance from price
    const rawPools = dir === 'BUY'
      ? (liqCtx.below || []).filter(p => p < price)
      : (liqCtx.above || []).filter(p => p > price);

    if (!rawPools.length) return null;

    // Sort ascending (BUY: nearest first going down, SELL: nearest first going up)
    const pools = dir === 'BUY'
      ? [...rawPools].sort((a, b) => b - a)   // [nearest_below, ..., deepest_below]
      : [...rawPools].sort((a, b) => a - b);   // [nearest_above, ..., deepest_above]

    // Cascade model:
    // A cascade sweeps pools in sequence. Each pool hit reduces momentum.
    // Cascade typically exhausts after 2-3 pools or when ATR budget runs out.
    const MAX_POOLS = Math.min(pools.length, 3);
    const atrBudget = atr * 3.5; // cascade rarely exceeds 3.5Ã ATR

    let exhaustionLevel = pools[0]; // at minimum, price sweeps nearest pool
    for (let i = 0; i < MAX_POOLS; i++) {
      const distFromPrice = Math.abs(pools[i] - price);
      if (distFromPrice > atrBudget) break; // outside cascade reach
      exhaustionLevel = pools[i]; // this pool will be taken
    }

function analyseSignalInternal(consensus, instCtx, scored) {
  try {
    const dir=consensus?.consensusDirection||'NEUTRAL', symbol=consensus?.symbol||'', b=consensus?.bestSig;
    const cert=consensus?.certaintyScore||0, certTier=consensus?.certaintyTier||'LOW';
    const conv=consensus?.convictionPct||0, tradeT=consensus?.tradeType||'INTRADAY';
    const verdict=scored?.verdict||consensus?._verdict||'', score=scored?.score||0;
    const mtfTier=consensus?.mtfTier||'SPECULATIVE';
    const entry=b?.entry, sl=b?.stop_loss, tp1=b?.take_profits?.[0], tp2=b?.take_profits?.[1];
    const macroOk=b?.macro_aligned!==false, m2y=b?.macro2Y;
    const macroReg=m2y?.regime||'NEUTRAL', macroTrend=m2y?.trend||'SIDEWAYS', hurst=m2y?.hurst||0.5;
    const dec=b?.deception, hasDeception=dec?.detected&&dec?.realDirection===dir, limitEntry=hasDeception?dec?.limitEntry:null;
    const rrRatio=b?.risk_params?.reward_risk_ratio||0;
    const fmt=v=>{if(!v||isNaN(v))return 'N/A';const n=Number(v);return n>1000?n.toFixed(2):n>1?n.toFixed(4):n.toFixed(6);}

function sendAIAnalysis(symbol, consensus, instCtx, scored) {
  if (!TELEGRAM_CHAT_ID) return;
  try {
    const dir    = consensus?.consensusDirection || 'NEUTRAL';
    const tradeT = consensus?.tradeType || 'INTRADAY';
    const aiKey  = `ai_${symbol}

function getKillzoneContext() {
  const h=new Date().getUTCHours(),m=new Date().getUTCMinutes(),t=h+m/60;
  if(t>=7 &&t<9)  return{name:'LONDON OPEN',  active:true, emoji:'â¡',note:'Peak institutional activity'}

function getWyckoffContext(candles) {
  if(!candles||candles.length<30) return{phase:'UNKNOWN',bias:'NEUTRAL',confidence:0,detail:'insufficient data',spring:false,upthrust:false}

function getStructureContext(candles) {
  if(!candles||candles.length<15) return{structure:'UNKNOWN',bos:false,choch:false,direction:'NEUTRAL',detail:'insufficient data',level:null}

function getFailureTrapContext(candles) {
  if(!candles||candles.length<10) return{trapped:false,direction:null,confidence:0,detail:'No trap detected'}

function getLiquidityContext(candles,price) {
  if(!candles||candles.length<20||!price) return{above:[],below:[],nearestAbove:null,nearestBelow:null,openFVGs:[]}

function buildInstitutionalContext(symbol, price) {
  try {
    const c1h=await fetchCandlesCached(symbol,'1h',120);
    const c4h=await fetchCandlesCached(symbol,'4h',80);
    const candles=c1h&&c1h.length>=20?c1h:(c4h||[]);
    const kz=getKillzoneContext();
    const wyckoff=getWyckoffContext(c4h&&c4h.length>=30?c4h:candles);
    const struct=getStructureContext(candles);
    const trap=getFailureTrapContext(candles);
    const liq=getLiquidityContext(candles,price);
    INST_CONTEXT_MEMORY.set(symbol,{wyckoff,struct,trap,liq,kz,updatedAt:Date.now()}

function formatInstitutionalContext(ctx, dir) {
  if(!ctx) return '';
  const{wyckoff,struct,trap,liq,kz}

function _tgRequest(method, payload, timeoutMs) {
  return new Promise((resolve) => {
    const body = JSON.stringify(payload || {}

function startTelegramPolling() {
  let _pollOffset = 0;
  let _pollRunning = false;

  const poll = async () => {
    if (_pollRunning) return;
    _pollRunning = true;
    try {
      const result = await _tgRequest('getUpdates', {
        offset: _pollOffset,
        timeout: POLLING_TIMEOUT_SEC,
        allowed_updates: ['message', 'callback_query']
      }

function verifyTelegram() {
  console.log('ð Checking Telegram connection via native https...');
  for (let i = 1; i <= 3; i++) {
    const res = await tg('getMe', {}

function updateTick(symbol, price) {
  if (!price || isNaN(price)) {
    console.warn(`Invalid price update for ${symbol}

function tickBias(symbol) {
  const t = TICK_STATE.get(symbol);
  if (!t || !t.drift || isNaN(t.drift)) return "NEUTRAL";
  const velocityFactor = Math.min(1, t.velocity / 10);
  const biasStrength = Math.abs(t.drift) * (1 + velocityFactor);
  if (biasStrength < 1e-6) return "NEUTRAL";
  return t.drift > 0 ? "BUY" : "SELL";
}

function candleBias(c) {
  if (!c || c.length < 2) return "NEUTRAL";
  const last = c[c.length - 1];
  const prev = c[c.length - 2];
  if (!last || !prev || isNaN(last.c) || isNaN(prev.c)) return "NEUTRAL";
  
  if (last.c > last.o && prev.c > prev.o) return "BUY_STRONG";
  if (last.c < last.o && prev.c < last.o) return "SELL_STRONG";
  return last.c > last.o ? "BUY" : "SELL";
}

function sessionBias() {
  const h = new Date().getUTCHours();
  const d = new Date().getUTCDay();
  const isWeekend = d === 0 || d === 6;
  let weekendMultiplier = isWeekend ? 0.7 : 1.0;
  if (h >= 0 && h < 7) return { name: "ASIA", weight: 0.9 * weekendMultiplier, liquidity: "MODERATE", volatility: "LOW" }

function fetchLivePrice(symbol) {
  // Return cached price if fresh enough
  const cached = _livePriceCache.get(symbol);
  if (cached && (Date.now() - cached.ts) < LIVE_PRICE_TTL) {
    return cached.price;
  }

function fetchCandles(symbol, tf, limit = 200) {
  console.log(`ð Fetching candles for ${symbol}

function fetchCandlesComprehensive(symbol, tf, limit = 200) {
  console.log(`ð Fetching comprehensive candles for ${symbol}

function fetchCandlesCached(symbol, tf, limit = 200) {
  // ââ SYNTHETIC 2day CANDLES âââââââââââââââââââââââââââââââââââââââââââââââââ
  // Bitget 3Dutc (the 2day mapping) returns only ~30 candles.
  // 30 candles starves agents requiring 40-55. Fix: merge pairs of 1day candles
  // into synthetic 2day. This gives 80+ properly-formed 2day candles with full
  // OHLCV, activating all 23 agents on the 2day timeframe.
  if (tf === '2day') {
    const twoDayCacheKey = `${symbol}

function fetchWeeklyMacroCached(symbol, limit = 104) {
  const key = `${symbol}

function BTCDominance() {
  try {
    const now = Date.now();

    // Return cached value if fresh
    if (_btcDomCache.value !== null && now - _btcDomCache.ts < BTC_DOM_CACHE_MS) {
      return _btcDomCache.value;
    }

function RiskOnOff() {
  const btcDom = await BTCDominance();
  if (isNaN(btcDom)) return "NEUTRAL";
  
  if (btcDom > 55) return "RISK_ON";
  if (btcDom < 45) return "RISK_OFF";
  return "NEUTRAL";
}

function shouldTrade(symbol) {
  try {
    const riskMode = await RiskOnOff();
    const btcDom = await BTCDominance();
    
    if (symbol.includes("BTC")) return { shouldTrade: true, reason: "BTC always allowed" }

function CorrelationFilter(symbol) {
  try {
    const btc = await fetchCandlesCached("BTCUSDT", "1h", 100);
    const s = await fetchCandlesCached(symbol, "1h", 100);
    if (!btc || !s || btc.length < 20 || s.length < 20) return 0;
    
    const minLength = Math.min(btc.length, s.length, 20);
    const btcClose = btc.slice(-minLength).map(x => x.c).filter(c => !isNaN(c));
    const sClose = s.slice(-minLength).map(x => x.c).filter(c => !isNaN(c));
    
    if (btcClose.length < 10 || sClose.length < 10) return 0;
    
    const btcMean = mean(btcClose);
    const sMean = mean(sClose);
    
    let covariance = 0, btcVariance = 0, sVariance = 0;
    const length = Math.min(btcClose.length, sClose.length);
    
    for (let i = 0; i < length; i++) {
      const btcDiff = btcClose[i] - btcMean;
      const sDiff = sClose[i] - sMean;
      covariance += btcDiff * sDiff;
      btcVariance += btcDiff * btcDiff;
      sVariance += sDiff * sDiff;
    }

function multiTimeframeConfirmation(symbol, direction, callerTimeframe) {
  // ââ TF-aware confirmation: each timeframe checks relevant context TFs âââââ
  // Checking 15min to confirm a 2day trade injects noise that penalizes the
  // signal. Instead, each caller TF checks its natural confirmation stack.
  const TF_CONFIRMATION_STACK = {
    '1h':    ['15min', '1h',   '4h'],      // intraday swing: check self + above
    '4h':    ['1h',    '4h',   '8h'],      // 4h swing: check 1h context + 8h anchor
    '8h':    ['4h',    '8h',   '1day'],    // 8h swing: 4h entry + 1day structure
    '1day':  ['4h',    '1day', '2day'],    // daily position: 4h trigger + daily + 2day
    '2day':  ['1day',  '2day', '3day'],    // 2day position: check daily + 2day + 3day
    '3day':  ['1day',  '3day', '1week'],   // 3day: check 1day alignment + weekly macro
    '1week': ['3day',  '1week'],           // weekly macro: 3day + weekly
  }

function calibrateConfidence(baseConfidence, confirmationScore, marketConditions, timeframe) {
  // ââ FIX: Removed compounding multipliers that destroyed signal confidence ââ
  // Old code applied 4 separate multipliers (session, futures, volatility, macro)
  // each below 1.0, turning a real 60% confidence into a displayed 18%.
  // The agent voting now correctly reflects only voting agents (FIX 1).
  // Calibration should only ADD context -- never multiply the signal to dust.
  //
  // New approach:
  //   - Low confirmation score: no penalty (HTF signals don't need scalp agreement)
  //   - High confirmation score: small boost
  //   - Session: HTF signals are fully session-independent (daily/weekly candles don't care)
  //   - Futures: no penalty -- futures adds leverage, not uncertainty
  //   - Volatility VERY_HIGH: small penalty only on short TFs
  //   - Floor: never return below 85% of input (calibration should not reverse signals)

  if (isNaN(baseConfidence) || baseConfidence <= 0) return 0;

  let calibrated = baseConfidence;
  const isHTF = ['4h','8h','1day','2day','3day','1week'].includes(timeframe);

  // Confirmation boost only -- no penalty for lack of confirmation
  if (confirmationScore >= 80) calibrated *= 1.15;
  else if (confirmationScore >= 60) calibrated *= 1.08;
  // Below 60: no adjustment -- HTF is self-confirming

  // Session: only apply to scalp TFs (1h and below)
  // Position and swing trades are not session-locked
  if (!isHTF) {
    const session = sessionBias();
    calibrated *= Math.max(session.weight, 0.85); // floor at 0.85 even in dead sessions
  }

function logTradeOutcome(symbol, direction, entry, exit, pnl, confidence, stopLoss, takeProfit) {
  if (!symbol || isNaN(entry) || isNaN(exit) || isNaN(pnl)) {
    console.error(`Invalid trade outcome data for ${symbol}

function getExpectancyStats() {
  return {
    wins: EXPECTANCY_MODEL.wins,
    losses: EXPECTANCY_MODEL.losses,
    total: EXPECTANCY_MODEL.total,
    winRate: round(EXPECTANCY_MODEL.winRate, 2),
    avgWin: round(EXPECTANCY_MODEL.avgWin, 2),
    avgLoss: round(EXPECTANCY_MODEL.avgLoss, 2),
    expectancy: round(EXPECTANCY_MODEL.expectancy, 2),
    totalPnl: round(EXPECTANCY_MODEL.totalPnl, 2),
    trades: TRADE_HISTORY.length
  }

function _computeReturns(series) {
  const r = [];
  for (let i = 1; i < series.length; i++) r.push((series[i] - series[i-1]) / (series[i-1] || 1));
  return r;
}

function _mean(arr) { return arr.length ? arr.reduce((a,b)=>a+b,0)/arr.length : 0; }

function _variance(arr) {
  const m = _mean(arr);
  return arr.length ? arr.reduce((a,b)=>a+(b-m)**2,0)/arr.length : 0;
}

function _shannonEntropy(series, bins = 10) {
  if (!series.length) return 0;
  const min = Math.min(...series), max = Math.max(...series);
  const range = max - min || 1;
  const counts = new Array(bins).fill(0);
  series.forEach(v => { const b = Math.min(bins-1, Math.floor((v-min)/range*bins)); counts[b]++; }

function liquidityGravityEngine(candles, currentPrice) {
  if (!candles || candles.length < 50 || isNaN(currentPrice) || currentPrice <= 0) {
    return { direction: 'NEUTRAL', confidence: 0, netForce: 0, targetPool: null, pools: [] }

function entropyCASCADE(candles) {
  if (!candles || candles.length < 60) {
    return { direction: 'NEUTRAL', confidence: 0, compressionLevel: 0, cascade: false }

function shannonEntropy(arr, bins = 10) {
    if (arr.length === 0) return 0;
    const mn  = Math.min(...arr);
    const mx  = Math.max(...arr);
    const rng = mx - mn;
    if (rng === 0) return 0;
    const freq = new Array(bins).fill(0);
    for (const v of arr) {
      const b = Math.min(Math.floor((v - mn) / rng * bins), bins - 1);
      freq[b]++;
    }

function bifurcationDetector(candles) {
  if (!candles || candles.length < 50) {
    return { direction: 'NEUTRAL', confidence: 0, autocorr: 0, bifurcating: false }

function lag1AutoCorr(arr) {
    if (arr.length < 4) return 0;
    const n    = arr.length - 1;
    const x    = arr.slice(0, n);
    const y    = arr.slice(1, n + 1);
    const mx   = x.reduce((a, b) => a + b, 0) / n;
    const my   = y.reduce((a, b) => a + b, 0) / n;
    let cov = 0, sx = 0, sy = 0;
    for (let i = 0; i < n; i++) {
      cov += (x[i] - mx) * (y[i] - my);
      sx  += (x[i] - mx) ** 2;
      sy  += (y[i] - my) ** 2;
    }

function resonantFrequencyAnalyzer(candles) {
  if (!candles || candles.length < 64) {
    return { direction: 'NEUTRAL', confidence: 0, dominantCycle: null, phaseAlignment: 0 }

function candleDNASequencer(candles) {
  if (!candles || candles.length < 40) {
    return { direction: 'NEUTRAL', confidence: 0, sequence: '', pattern: null }

function encodeCandle(c) {
    if (!c || isNaN(c.o) || isNaN(c.c) || isNaN(c.h) || isNaN(c.l)) return 'D';
    const body     = Math.abs(c.c - c.o);
    const range    = c.h - c.l || 0.0001;
    const bodyPct  = body / range;
    const upWick   = c.h - Math.max(c.c, c.o);
    const downWick = Math.min(c.c, c.o) - c.l;
    const isBull   = c.c > c.o;
    const isStrong = body > avgATR * 0.6;

    if (bodyPct < 0.1) return 'D';  // doji
    if (upWick > body * 2 && downWick < body) return 'W';   // wick up dominates
    if (downWick > body * 2 && upWick < body) return 'w';   // wick down dominates
    if (isBull)  return isStrong ? 'B' : 'b';
    return isStrong ? 'S' : 's';
  }

function smartMoneyCompositeIndex(agentResults) {
  // agentResults = object with keys matching agent labels
  const {
    cvd, wyckoff, hiddenDiv, orderBlock, fundingRate, deception,
    liquidityGravity, entropyCS, bifurcation, resonance, candleDNA
  }

function scoreAgent(agent, weight, invertOnBifurcation = false) {
    if (!agent || agent.direction === 'NEUTRAL' || agent.confidence === 0) return 0;
    const dirScore = agent.direction === 'BUY' ? 1 : -1;
    return dirScore * agent.confidence * weight;
  }

function volatilityCompressionRatio(candles) {
  if (!candles || candles.length < 80) {
    return { direction: 'NEUTRAL', confidence: 0, vcr: 1, megaSqueeze: false }

function atrWindow(cs, period) {
    const trs = [];
    for (let i = 1; i < cs.length; i++) {
      const c = cs[i], p = cs[i-1];
      if (isNaN(c.h) || isNaN(c.l) || isNaN(p.c)) continue;
      trs.push(Math.max(c.h - c.l, Math.abs(c.h - p.c), Math.abs(c.l - p.c)));
    }

function detectMarketDeception(candles, timeframe, currentPrice) {
  // Only run on position/swing timeframes -- these patterns need higher-TF context
  if (!DECEPTION_ACTIVE_TF.has(timeframe)) {
    return { detected: false, trap: 'NONE', realDirection: 'NEUTRAL', limitEntry: null, confidence: 0 }

function computeCVD(candles) {
  if (!candles || candles.length < 20) return { cvd: 0, trend: 'NEUTRAL', divergence: 'NONE', signal: 'NEUTRAL', confidence: 0 }

function detectWyckoffPhase(candles) {
  if (!candles || candles.length < 40) return { phase: 'UNKNOWN', signal: 'NEUTRAL', confidence: 0 }

function detectHiddenDivergence(candles) {
  if (!candles || candles.length < 30) return { type: 'NONE', signal: 'NEUTRAL', confidence: 0 }

function detectOrderBlocks(candles) {
  if (!candles || candles.length < 25) return { bullishOB: null, bearishOB: null, signal: 'NEUTRAL', confidence: 0, inOBZone: false }

function fetchFundingRateAndOI(symbol) {
  const cacheKey = symbol;
  const cached = _frCache.get(cacheKey);
  if (cached && Date.now() - cached.ts < 5 * 60 * 1000) return cached.data; // 5min cache

  try {
    const api = new BitgetAPI();

    const [frData, oiData] = await Promise.allSettled([
      api.getFundingRate(symbol),
      api.getOpenInterest(symbol)
    ]);

    const fr = frData.status === 'fulfilled' ? frData.value?.data?.[0]?.fundingRate : null;
    const oi = oiData.status === 'fulfilled' ? oiData.value?.data?.openInterest : null;

    const fundingRate  = fr ? parseFloat(fr) : null;
    const openInterest = oi ? parseFloat(oi) : null;

    let signal = 'NEUTRAL', confidence = 0, note = '';

    if (fundingRate !== null && !isNaN(fundingRate)) {
      const frPct = fundingRate * 100;

      if (frPct > 0.1) {
        // Extremely high positive funding = overleveraged longs = squeeze risk
        signal = 'SELL'; confidence = clamp((frPct - 0.05) * 4, 0.30, 0.75);
        note = `â ï¸ Funding +${frPct.toFixed(4)}

function criticalStateDetector(candles) {
  if (!candles || candles.length < 50) return { critical:false,score:0,signal:'NEUTRAL',confidence:0,label:'CriticalState' }

function reflexivityQuantifier(candles) {
  if (!candles||candles.length<40) return {reflexivity:0,regime:'UNKNOWN',signal:'NEUTRAL',confidence:0,inflection:false,label:'Reflexivity'}

function entropyGradientOscillator(candles) {
  if (!candles||candles.length<40) return {ego:0,converging:false,signal:'NEUTRAL',confidence:0,label:'EntropyGradient'}

function adversarialPatternNeutralizer(candles) {
  if (!candles||candles.length<50) return {adversarial_score:0,patterns_detected:[],signal:'NEUTRAL',confidence:0,fade_signal:false,label:'Adversarial'}

function chronologicalInstitutionalFootprint(candles,symbol,timeframe) {
  if(!candles||candles.length<30) return {deviation:0,signal:'NEUTRAL',confidence:0,anomaly:false,label:'CIF'}

function recurrenceQuantificationAnalysis(candles) {
  if (!candles || candles.length < 40) {
    return { rr: 0, det: 0, lam: 0, lmax: 0, signal: 'NEUTRAL', confidence: 0, phase: 'UNKNOWN', label: 'RQA' }

function thermodynamicMarketState(candles) {
  if (!candles || candles.length < 35) {
    return { G: 0, H: 0, T: 0, S: 0, dG: 0, phase: 'EQUILIBRIUM', signal: 'NEUTRAL', confidence: 0, label: 'Thermodynamic' }

function lempelZivComplexity(candles) {
  if (!candles || candles.length < 30) {
    return { lzc: 0.5, normalized: 0.5, trend: 'NEUTRAL', signal: 'NEUTRAL', confidence: 0, label: 'LempelZiv' }

function lz76(s) {
    if (s.length === 0) return 0;
    let c = 1, i = 0, k = 1, l = 1, kmax = 1;
    const n = s.length;
    while (i + k <= n) {
      if (s[i + k - 1] === s[l + k - 1]) {
        k++;
        if (l + k > i + kmax) kmax = i + kmax - l + 1; // extend
      }

function kuramotoSynchronization(candles) {
  if (!candles || candles.length < 35) {
    return { r: 0, phase_angle: 0, synchronized: false, signal: 'NEUTRAL', confidence: 0, oscillators: {}

function stochasticResonanceDetector(candles) {
  if (!candles || candles.length < 32) {
    return { snr: 0, dominant_freq: 0, noise_floor: 0, resonance: false, signal: 'NEUTRAL', confidence: 0, label: 'StochasticResonance' }

function buildMTFConsensus(symbol, generator) {
  const allTFs = HTF_SCAN_TF; // ["1h","4h","8h","1day","2day","3day","1week"]
  const tfSignals = {}

function buildIntraConsensus(symbol, generator) {
  const INTRA_TFS    = ['1h', '4h', '8h'];
  const INTRA_WEIGHTS = { '1h': 1.0, '4h': 2.2, '8h': 3.0 }

function scoreIntraSignal(consensus) {
  const dir         = consensus?.consensusDirection;
  const cert        = consensus?.certaintyScore || 0;
  const agreeRatio  = consensus?.agreementRatio || 0;
  const mtfTier     = consensus?.mtfTier || 'SPECULATIVE';
  const bestSig     = consensus?.bestSig;

  if (!dir || dir === 'NEUTRAL') return { verdict: 'SKIP', score: 0 }

function autoScoreSignal(consensus, bestSig) {
  /* ââ Certainty-aware scoring. Uses the certaintyScore/certaintyTier already
     computed in buildMTFConsensus so every timeframe is treated fairly.
     Score is NOT constrained to any single TF -- it reflects the whole picture.
     Verdict thresholds:
       TRADE  â¥ 75   (certaintyTier CERTAIN or HIGH + valid SL + macro ok)
       WATCH  â¥ 50   (partial certainty -- track for entry)
       SKIP   < 50   (low certainty -- do not trade)
  ââ */
  const reasons = [];
  let score = 0;
  let verdict = 'SKIP';

  const avgConf        = consensus?.avgConfidence || 0;
  const direction      = consensus?.consensusDirection || 'NEUTRAL';
  const mtfTier        = consensus?.mtfTier || 'SPECULATIVE';
  const certaintyScore = consensus?.certaintyScore || 0;
  const certaintyTier  = consensus?.certaintyTier  || 'LOW';
  const tradeType      = consensus?.tradeType      || 'SCALP';
  const agreeingTFs    = consensus?.agreeingTFs    || [];
  const posAgreement   = consensus?.posAgreement   || 0;
  const b          = bestSig;
  const entry      = b?.entry || 0;
  const sl         = b?.stop_loss || 0;
  const slDist     = entry > 0 ? Math.abs(entry - sl) / entry * 100 : 999;
  const slCapped   = b?.risk_params?.sl_capped || false;
  const macroOk    = b?.macro_aligned !== false;
  const tfBest     = consensus?.bestTF || '1h';
  const votes      = consensus?.votes || { BUY: 0, SELL: 0, NEUTRAL: 0 }

function formatMTFConsensusMessage(consensus) {
  const {
    symbol, consensusDirection, biasPercent, avgConfidence,
    mtfTier, votes, tfSignals, bestSig, bestTF, normalizedScore
  }

function autoScanner() {
  const symbols  = Array.from(WATCH.keys());
  // Reuse the live system's generator (warmed caches, consistent state).
  // Fall back to a new instance only if the system hasn't initialised yet.
  const generator = (typeof enhancedQuantumSystem !== 'undefined' && enhancedQuantumSystem?.signalGenerator)
    ? enhancedQuantumSystem.signalGenerator
    : new EnhancedQuantumSignalGenerator();
  let sent = 0, skippedCooldown = 0, skippedNeutral = 0;

  console.log(`ð Scan starting -- ${symbols.length}

function macro2Y(symbol) {
  try {
    // Return cached result if fresh
    const cached = MACRO2Y_CACHE.get(symbol);
    if (cached && Date.now() - cached.timestamp < MACRO2Y_CACHE_TTL) {
      return cached.data;
    }

function computeConfidence(inputs) {
  if (!inputs) return 0;

  // Array mode: average of numeric weights
  if (Array.isArray(inputs)) {
    if (!inputs.length) return 0;
    let total = 0;
    for (const item of inputs) {
      if (typeof item === 'number') total += item;
      else if (item && typeof item.weight === 'number') total += item.weight;
    }

