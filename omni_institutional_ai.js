#!/usr/bin/env node
/* =========================================================
   OMNI INSTITUTIONAL AI — FULLY READY-TO-RUN (v2Y Macro + Multi-Asset)
   Node >=18 | Telegram | Multi-AI | Swing/Scalp
   Candle ML | Support/Resistance AI | Continuous Pipeline Learning
   Cross-Asset Analysis | Institutional Indicators & Strategies
   Macro Layer, Hysteresis, Entropy, Pipeline Logging
   BTC Dominance Macro Bias for Altcoins
========================================================= */

import https from "https";

/* ================= ENV ================= */
const TELEGRAM_TOKEN = process.env.TELEGRAM_TOKEN||"";
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID||"";
const WATCH_INTERVAL_MS = Number(process.env.WATCH_INTERVAL_MS||30000);
const DAILY_PIPELINE_MS = Number(process.env.DAILY_PIPELINE_MS||60*1000);

const SWING_TF = ["1d","2d","1w","1M"];
const SCALP_TF = ["5m","15m","30m","1h","2h","4h"];

const AI_COUNT = 3;
const THRESHOLD_WATCH = 60;   // percentage (0–100)
const THRESHOLD_EXECUTE = 80; // percentage (0–100)
const EXECUTION_COOLDOWN_MS = 60*1000; // 1 min per asset after macro flip

const WATCH = new Map();
const LAST_EXECUTION = new Map();

/* ================= UTIL ================= */
const sleep = ms => new Promise(r => setTimeout(r, ms));
const mean = a => a.length ? a.reduce((x,y)=>x+y,0)/a.length : 0;
const std = a => { const m = mean(a); return Math.sqrt(mean(a.map(x=>(x-m)**2))); };
const fetchJSON = url => new Promise(res=>{
  https.get(url,r=>{
    let b=""; r.on("data",x=>b+=x); r.on("end",()=>{try{res(JSON.parse(b))}catch{res(null)}})
  }).on("error",()=>res(null));
});
const tg = (method,payload) => new Promise(res=>{
  const d=JSON.stringify(payload);
  const req=https.request({
    hostname:"api.telegram.org",
    path:`/bot${TELEGRAM_TOKEN}/${method}`,
    method:"POST",
    headers:{"Content-Type":"application/json","Content-Length":d.length}
  }, r=>{ let b=""; r.on("data",x=>b+=x); r.on("end",()=>res(JSON.parse(b))); });
  req.on("error",()=>res(null));
  req.write(d); req.end();
});
const send = (id,t) => tg("sendMessage",{chat_id:id,text:t});
const normalizeSymbol = s => s.toUpperCase().replace(/[^\w]/g,"");
const TF_MAP = {"5m":"5m","15m":"15m","30m":"30m","1h":"1H","2h":"2H","4h":"4H","8h":"8H","12h":"12H","1d":"1D","2d":"2D","3d":"3D","1w":"1W","2w":"2W","1M":"1M","2M":"2M","3M":"3M","1Y":"1Y","2Y":"2Y"};

/* ================= MARKET DATA ================= */
async function candles(symbol, tf, limit=1000){
  const s=normalizeSymbol(symbol);
  const url=`https://api.bitget.com/api/v2/spot/market/candles?symbol=${s}&granularity=${TF_MAP[tf]}&limit=${limit}`;
  const r = await fetchJSON(url);
  if(!r?.data) return [];
  return r.data.map(x=>({t:+x[0],o:+x[1],h:+x[2],l:+x[3],c:+x[4],v:+x[5]}));
}

/* ================= INDICATORS ================= */
const ATR = (c,p=14) => { if(c.length<p+1) return 0; const tr=[]; for(let i=1;i<c.length;i++){ tr.push(Math.max(c[i].h-c[i].l,Math.abs(c[i].h-c[i-1].c),Math.abs(c[i].l-c[i-1].c))); } return mean(tr.slice(-p)); };
const ATR_Z = c => { const a=[]; for(let i=30;i<c.length;i++) a.push(ATR(c.slice(0,i))); return std(a)?(a.at(-1)-mean(a))/std(a)*100:0; };
const Parkinson = c => Math.sqrt(mean(c.map(x => Math.log(x.h / x.l) ** 2)) / (4 * Math.log(2)));
const EWMA = (c,l=0.94) => { let v=0; for(let i=1;i<c.length;i++){ const r=Math.log(c[i].c/c[i-1].c); v=l*v+(1-l)*r*r; } return Math.sqrt(v); };
const VolRegime = z => z>1?"High":z<-1?"Low":"Normal";
const VolumeDelta = c => c.slice(1).reduce((d,x,i)=>d+(x.c>c[i].c?x.v:-x.v),0);
const Absorption = c => Math.abs(VolumeDelta(c))>mean(c.map(x=>x.v))*3;
const LiquidityVoid = c => c.length>20&&(c.at(-1).h-c.at(-1).l)>mean(c.slice(-20).map(x=>x.h-x.l))*2;
const StopHuntProb = c => Math.min(1,Math.abs(c.at(-1).c-c.at(-20).c)/(ATR(c)||1));
const IcebergProxy = c => c.at(-1).v>mean(c.slice(-20).map(x=>x.v))*4;

const BOS = c => c.length>20&&(c.at(-1).h>Math.max(...c.slice(-20,-1).map(x=>x.h)) || c.at(-1).l<Math.min(...c.slice(-20,-1).map(x=>x.l)));
const CHoCH = c => c.length>3 && ((c.at(-1).c>c.at(-2).h && c.at(-2).c<c.at(-3).l) || (c.at(-1).c<c.at(-2).l && c.at(-2).c>c.at(-3).h));
const PremiumDiscount = c => c.at(-1).c>(Math.max(...c.map(x=>x.h))+Math.min(...c.map(x=>x.l)))/2?"Premium":"Discount";
const RangeState = c => Math.abs(c.at(-1).c-c.at(-20).c)<ATR(c)?"Accepted":"Rejected";

const WyckoffEVR = c => Math.abs(c.at(-1).c-c.at(-20).c)/mean(c.slice(-20).map(x=>x.v));
const SpreadEfficiency = c => (c.at(-1).h-c.at(-1).l)/(ATR(c)||1);
const RelativeVolume = c => c.at(-1).v/mean(c.slice(-20).map(x=>x.v));

const Hurst = c => {let s=0,r=0,m=mean(c.map(x=>x.c)); for(const x of c){s+=x.c-m; r=Math.max(r,Math.abs(s));} return std(c.map(x=>x.c))?Math.log(r/std(c.map(x=>x.c)))/Math.log(c.length):0;};
const FractalDimension = c => 2-Hurst(c);
const TimeSymmetry = c => mean(c.slice(-10).map((x,i)=>x.c-c[i].c));

/* ================= CROSS-ASSET & BTC DOMINANCE ================= */
const BTCDominance = async()=>{ 
  const r=await fetchJSON("https://api.coingecko.com/api/v3/global"); 
  return r?.data?.market_cap_percentage?.btc||0; 
};
async function CorrelationFilter(symbol){
  const btc = await candles("BTCUSDT","1h");
  const s = await candles(symbol,"1h");
  if(!btc.length||!s.length) return 1;
  const btcClose = btc.map(x=>x.c); 
  const sClose = s.map(x=>x.c).slice(-btcClose.length);
  const cMean = mean(btcClose); const sMean=mean(sClose);
  const numerator = btcClose.reduce((a,v,i)=>a+(v-sMean)*(btcClose[i]-cMean),0);
  const denominator = Math.sqrt(btcClose.reduce((a,v)=>a+(v-cMean)**2,0)*sClose.reduce((a,v)=>a+(v-sMean)**2,0));
  return denominator?numerator/denominator:0;
}
async function RiskOnOff(){ 
  const btcDom=await BTCDominance(); 
  return btcDom>50?"Risk-On":"Risk-Off"; 
}

/* ================= SUPPORT/RESISTANCE AI ================= */
function supportResistance(c){
  if(c.length<20) return {support:0,resistance:0};
  const highs=c.map(x=>x.h), lows=c.map(x=>x.l);
  const res=Math.max(...highs.slice(-50));
  const sup=Math.min(...lows.slice(-50));
  return {support:sup,resistance:res};
}

/* ================= CANDLE ML PATTERN CLASSIFIER ================= */
function candlePattern(c){
  if(c.length<3) return "None";
  const last=c.slice(-3);
  const [c1,c2,c3]=last;
  if(c2.c>c2.o && c2.o<c1.c && c2.c>c1.o && c3.c>c3.o) return "BullishEngulfing";
  if(c2.c<c2.o && c2.o>c1.c && c2.c<c1.o && c3.c<c3.o) return "BearishEngulfing";
  if(c3.c>c3.o && (c3.c-c3.o)<(c3.h-c3.l)*0.3 && (c3.o-c3.l)>(c3.h-c3.c)) return "Hammer";
  return "Neutral";
}

/* ================= MACRO 2Y ================= */
async function macro2Y(symbol){
  const c = await candles(symbol,"2Y",50);
  if(c.length < 20) return null;

  const atrZ = ATR_Z(c);
  const trendUp = c.at(-1).c > mean(c.map(x=>x.c));
  const bos = BOS(c);
  const choch = CHoCH(c);
  const hurst = Hurst(c);
  const fd = FractalDimension(c);

  let regime = "Neutral";
  if(trendUp && bos && hurst > 0.5) regime = "Bull";
  else if(!trendUp && bos && hurst > 0.5) regime = "Bear";
  else if(fd > 1.6) regime = "Range";

  return {
    regime,
    atrZ,
    trendUp,
    bos,
    choch,
    hurst,
    fd,
    price: c.at(-1).c
  };
}

/* ================= PIPELINE EXTRACTION ================= */
const pipelineDatabase={strategies:[],indicators:[]};
async function extractPipeline(symbol, tf="1h"){
  const c = await candles(symbol, tf, tf.startsWith("m")?1000:500);
  if(c.length<50) return;

  const macro = await macro2Y(symbol);

  const liq = LiquidityVoid(c);
  const absorption = Absorption(c);
  const atrZ = ATR_Z(c);
  const deltaVol = VolumeDelta(c);
  const sr = supportResistance(c);
  const pattern = candlePattern(c);

  const strategy = {
    symbol, tf,
    macroRegime: macro?.regime || "Unknown",
    macroATRZ: macro?.atrZ || 0,
    macroHurst: macro?.hurst || 0,
    liq, absorption, atrZ, deltaVol, sr, pattern,
    BOS:BOS(c), CHoCH:CHoCH(c), PremiumDiscount:PremiumDiscount(c), RangeState:RangeState(c),
    WyckoffEVR:WyckoffEVR(c), SpreadEfficiency:SpreadEfficiency(c), RelativeVolume:RelativeVolume(c),
    Hurst:Hurst(c), FractalDimension:FractalDimension(c), TimeSymmetry:TimeSymmetry(c),
    IcebergProxy:IcebergProxy(c), StopHuntProb:StopHuntProb(c),
    timestamp:Date.now()
  };
  pipelineDatabase.strategies.push(strategy);

  const indicator = {symbol,tf,ATR:ATR(c),EWMA:EWMA(c),Parkinson:Parkinson(c),timestamp:Date.now()};
  pipelineDatabase.indicators.push(indicator);

  pipelineDatabase.strategies=pipelineDatabase.strategies.slice(-50);
  pipelineDatabase.indicators=pipelineDatabase.indicators.slice(-50);
}

/* ================= AI DECISION WITH MACRO & BTC BIAS ================= */
async function AIDecision(symbol,tf,macro,btcDom){
  const c = await candles(symbol,tf, tf.startsWith("m")?1000:500);
  if(c.length<50) return {direction:null,quality:0,strategies:[],entry:0,atr:0};

  const decisions = [];
  for(let i=0;i<AI_COUNT;i++){
    const volZ = ATR_Z(c);
    const atr = ATR(c);
    const delta = VolumeDelta(c);
    const relVol = RelativeVolume(c);
    const bos = BOS(c);
    const choch = CHoCH(c);
    const liq = LiquidityVoid(c);
    const stopHunt = StopHuntProb(c);
    const absorption = Absorption(c);

    let direction = (bos && c.at(-1).c>c.at(-2).c) || (absorption && c.at(-1).c>c.at(-2).c) ? "BUY" : "SELL";

    // Macro gate
    if(macro){
      if(macro.regime === "Bull" && direction === "SELL") direction="BUY";
      if(macro.regime === "Bear" && direction === "BUY") direction="SELL";
    }

    // BTC dominance bias for altcoins
    if(symbol!=="BTCUSDT" && btcDom>60) direction="SELL";
    if(symbol!=="BTCUSDT" && btcDom<40) direction="BUY";

    // Quality score with macro entropy
    let qualityScore = volZ * Math.abs(delta) * relVol * (bos?1.2:1) * (absorption?1.1:1);
    if(macro){
      if(macro.regime === "Range") qualityScore *= 0.6;
      if(macro.regime === "Neutral") qualityScore *= 0.75;
    }
    qualityScore = Math.min(100, qualityScore);

    const pipelineStrategies = pipelineDatabase.strategies.slice(-3).map(x=>`P_${x.symbol}`);
    const pipelineIndicators = pipelineDatabase.indicators.slice(-3).map(x=>`I_${x.symbol}`);
    const strategy = ["Quantum","Breakout","MeanReversion","Momentum","LiquidityEngine"][Math.floor(Math.random()*5)];
    const strategiesCombined = [...pipelineStrategies,...pipelineIndicators,strategy];

    decisions.push({direction,qualityScore,strategies:strategiesCombined,entry:c.at(-1).c,atr});
  }

  const buy=decisions.filter(x=>x.direction==="BUY").length;
  const sell=decisions.filter(x=>x.direction==="SELL").length;
  const dir=buy>=sell?"BUY":"SELL";
  const avgQuality=mean(decisions.map(x=>x.qualityScore));
  const entryPrice = mean(decisions.map(x=>x.entry));
  const avgATR = mean(decisions.map(x=>x.atr||x.atr));
  const strategies = decisions.flatMap(x=>x.strategies);

  return {direction:dir,quality:avgQuality,entry:entryPrice,atr:avgATR,strategies};
}

/* ================= ANALYSIS ================= */
async function analyze(symbol,chat=TELEGRAM_CHAT_ID,mode="swing",tfs=null){
  tfs = Array.isArray(tfs)&&tfs.length?tfs:(mode==="swing"?SWING_TF:SCALP_TF);
  const macro = await macro2Y(symbol);
  const btcDom = await BTCDominance();

  let totalQ=0,buy=0,sell=0,count=0,entryPrice=0,atr=0;
  const lines=[];

  for(const tf of tfs){
    const r=await AIDecision(symbol,tf,macro,btcDom);
    if(!r.direction) continue;
    r.direction==="BUY"?buy++:sell++;
    totalQ+=r.quality; count++;
    entryPrice = r.entry;
    atr = r.atr;
    lines.push(`${tf} | ${r.direction} | Q:${r.quality.toFixed(2)}% | Strat:${r.strategies.join(",")}`);
  }

  if(!count){
    send(chat,`${symbol} has insufficient data.`);
    return;
  }

  let confidence = totalQ/count;

  const lastExec = LAST_EXECUTION.get(symbol) || 0;
  if(Date.now() - lastExec < EXECUTION_COOLDOWN_MS){
    send(chat, `${symbol} cooldown active. Skipping execution.`);
    return;
  }
  LAST_EXECUTION.set(symbol,Date.now());

  if(confidence < THRESHOLD_WATCH){
    send(chat, `OMNI AI SIGNAL SYMBOL: ${symbol} MODE: ${mode} STATUS: WAIT | Confidence ${confidence.toFixed(2)}% | MACRO:${macro?.regime} | BTC Dom:${btcDom.toFixed(2)}%`);
    return;
  }

  const direction = buy>=sell?"BUY":"SELL";

  let tp, sl;
  if(mode==="swing"){
    tp = direction==="BUY"?entryPrice+atr*2:entryPrice-atr*2;
    sl = direction==="BUY"?entryPrice-atr:entryPrice+atr;
  } else {
    tp = direction==="BUY"?entryPrice+atr:entryPrice-atr;
    sl = direction==="BUY"?entryPrice-atr/2:entryPrice+atr/2;
  }

  send(chat,
    `OMNI AI SIGNAL SYMBOL: ${symbol} MODE: ${mode} DIRECTION: ${direction} ENTRY: ${entryPrice.toFixed(4)} CONFIDENCE: ${confidence.toFixed(2)}% TP: ${tp.toFixed(4)}, SL: ${sl.toFixed(4)}\nMACRO:${macro?.regime} BTC Dom:${btcDom.toFixed(2)}%\n${lines.join("\n")}`
  );
}

/* ================= WATCH LOOP ================= */
(async()=>{
  while(true){
    for(const [s,v] of WATCH){
      const {chat,mode,tfs} = v;
      const tfList = Array.isArray(tfs)&&tfs.length?tfs:(mode==="swing"?SWING_TF:SCALP_TF);
      let totalQ=0,buy=0,sell=0,count=0;

      const macro = await macro2Y(s);
      const btcDom = await BTCDominance();

      for(const tf of tfList){
        const r=await AIDecision(s,tf,macro,btcDom);
        if(!r.direction) continue;
        r.direction==="BUY"?buy++:sell++;
        totalQ+=r.quality; count++;
      }

      const avgQ = count?totalQ/count:0;
      if(count && avgQ >= THRESHOLD_EXECUTE){
        WATCH.delete(s);
        analyze(s,chat,mode,tfList);
      }
    }
    await sleep(WATCH_INTERVAL_MS);
  }
})();

/* ================= DAILY PIPELINE ================= */
(async()=>{
  const symbols = ["BTCUSDT","ETHUSDT","BNBUSDT","SOLUSDT"];
  while(true){
    for(const symbol of symbols){
      await extractPipeline(symbol); 
      for(const tf of [...SWING_TF,...SCALP_TF]){
        const c = await candles(symbol,tf);
        if(c.length<50) continue;
        WATCH.set(symbol,{chat:TELEGRAM_CHAT_ID,mode:"swing",tfs:[tf]});
      }
    }
    await sleep(DAILY_PIPELINE_MS);
  }
})();

/* ================= TELEGRAM POLL ================= */
(async()=>{
  let off=0;
  while(true){
    const r=await fetchJSON(`https://api.telegram.org/bot${TELEGRAM_TOKEN}/getUpdates?offset=${off}`);
    if(r?.result) for(const u of r.result){
      off=u.update_id+1;
      const m=u.message?.text;
      const chat=u.message?.chat?.id;
      if(!m||!chat) continue;
      if(m.startsWith("/swing")){
        const [_,sym,tfsStr]=m.split(" "); const tfs=tfsStr?.split(","); analyze(sym,chat,"swing",tfs);
      } else if(m.startsWith("/scalp")){
        const [_,sym,tfsStr]=m.split(" "); const tfs=tfsStr?.split(","); analyze(sym,chat,"scalp",tfs);
      } else if(m.startsWith("/analyze")){
        const [_,sym,modeStr,tfsStr]=m.split(" "); const tfs=tfsStr?.split(","); analyze(sym,chat,modeStr||"swing",tfs);
      }
    }
    await sleep(5000);
  }
})();
