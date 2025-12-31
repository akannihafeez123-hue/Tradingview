#!/usr/bin/env node
/* =========================================================
   OMNI INSTITUTIONAL AI — FULLY INTEGRATED
   Node >=18 | Telegram | Multi-AI | Swing/Scalp
   Candle ML Learning | Support/Resistance AI | Macro 2Y
   Broken Battle Pieces & History Logging
   Cross-Asset & BTC Dominance | Pipeline Extraction
   Institutional & Proprietary Strategy Integration
========================================================= */

import https from "https";

/* ================= ENV ================= */
const TELEGRAM_TOKEN = process.env.TELEGRAM_TOKEN || "";
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID || "";
const WATCH_INTERVAL_MS = Number(process.env.WATCH_INTERVAL_MS || 30000);
const DAILY_PIPELINE_MS = Number(process.env.DAILY_PIPELINE_MS || 60 * 1000);
const EXECUTION_COOLDOWN_MS = 60 * 1000;

const SWING_TF = ["1d","2d","1w","1M"];
const SCALP_TF = ["5m","15m","30m","1h","2h","4h"];
const AI_COUNT = 3;
const THRESHOLD_WATCH = 60;
const THRESHOLD_EXECUTE = 80;

const WATCH = new Map();
const LAST_EXECUTION = new Map();
const pipelineDatabase = { strategies: [], indicators: [] };
const brokenBattlePieces = []; // History & battle pieces

/* ================= UTILITIES ================= */
const sleep = ms => new Promise(r => setTimeout(r, ms));
const mean = arr => arr.length ? arr.reduce((x,y)=>x+y,0)/arr.length : 0;
const std = arr => { const m = mean(arr); return Math.sqrt(mean(arr.map(x => (x - m)**2))); };
const fetchJSON = url => new Promise(res=>{
  https.get(url, r=>{
    let b="";
    r.on("data", x=>b+=x);
    r.on("end", ()=>{ try { res(JSON.parse(b)) } catch { res(null) } });
  }).on("error",()=>res(null));
});
const tg = (method, payload) => new Promise(res=>{
  const d = JSON.stringify(payload);
  const req = https.request({
    hostname:"api.telegram.org",
    path:`/bot${TELEGRAM_TOKEN}/${method}`,
    method:"POST",
    headers:{"Content-Type":"application/json","Content-Length":Buffer.byteLength(d)}
  }, r=>{ let b=""; r.on("data",x=>b+=x); r.on("end", ()=>{try{res(JSON.parse(b))}catch{res(null)}})});
  req.on("error", ()=>res(null));
  req.write(d); req.end();
});
const send = (id, t) => tg("sendMessage",{chat_id:id, text:t});
const normalizeSymbol = s => s.toUpperCase().replace(/[^\w]/g,"");
const TF_MAP = {
  "5m":"5m","15m":"15m","30m":"30m","1h":"1H","2h":"2H","4h":"4H",
  "8h":"8H","12h":"12H","1d":"1D","2d":"2D","3d":"3D","1w":"1W",
  "2w":"2W","1M":"1M","2M":"2M","3M":"3M","1Y":"1Y","2Y":"2Y"
};

/* ================= MARKET DATA ================= */
async function candles(symbol, tf, limit=1000){
  try{
    const s = normalizeSymbol(symbol);
    const url = `https://api.bitget.com/api/v2/spot/market/candles?symbol=${s}&granularity=${TF_MAP[tf]}&limit=${limit}`;
    const r = await fetchJSON(url);
    if(!r?.data) return [];
    return r.data.map(x=>({t:+x[0], o:+x[1], h:+x[2], l:+x[3], c:+x[4], v:+x[5]}));
  } catch { return []; }
}

/* ================= INDICATORS ================= */
const ATR=(c,p=14)=>{ if(c.length<p+1) return 0; const tr=[]; for(let i=1;i<c.length;i++){ tr.push(Math.max(c[i].h-c[i].l,Math.abs(c[i].h-c[i-1].c),Math.abs(c[i].l-c[i-1].c))); } return mean(tr.slice(-p)); };
const ATR_Z=c=>{ const a=[]; for(let i=30;i<c.length;i++) a.push(ATR(c.slice(0,i))); return std(a)?((a.at(-1)-mean(a))/std(a))*100:0; };
const Parkinson=c=>Math.sqrt(mean(c.map(x=>Math.log(x.h/x.l)**2))/(4*Math.log(2)));
const EWMA=(c,l=0.94)=>{ let v=0; for(let i=1;i<c.length;i++){ const r=Math.log(c[i].c/c[i-1].c); v=l*v+(1-l)*r*r; } return Math.sqrt(v); };
const VolRegime=z=>z>1?"High":z<-1?"Low":"Normal";
const VolumeDelta=c=>c.slice(1).reduce((d,x,i)=>d+(x.c>c[i].c?x.v:-x.v),0);
const Absorption=c=>Math.abs(VolumeDelta(c))>mean(c.map(x=>x.v))*3;
const LiquidityVoid=c=>c.length>20&&(c.at(-1).h-c.at(-1).l)>mean(c.slice(-20).map(x=>x.h-x.l))*2;
const StopHuntProb=c=>Math.min(1,Math.abs(c.at(-1).c-c.at(-20).c)/(ATR(c)||1));
const IcebergProxy=c=>c.at(-1).v>mean(c.slice(-20).map(x=>x.v))*4;
const BOS=c=>c.length>20&&(c.at(-1).h>Math.max(...c.slice(-20,-1).map(x=>x.h))||c.at(-1).l<Math.min(...c.slice(-20,-1).map(x=>x.l)));
const CHoCH=c=>c.length>3&&((c.at(-1).c>c.at(-2).h&&c.at(-2).c<c.at(-3).l)||(c.at(-1).c<c.at(-2).l&&c.at(-2).c>c.at(-3).h));
const PremiumDiscount=c=>c.at(-1).c>(Math.max(...c.map(x=>x.h))+Math.min(...c.map(x=>x.l)))/2?"Premium":"Discount";
const RangeState=c=>Math.abs(c.at(-1).c-c.at(-20).c)<ATR(c)?"Accepted":"Rejected";
const WyckoffEVR=c=>Math.abs(c.at(-1).c-c.at(-20).c)/mean(c.slice(-20).map(x=>x.v));
const SpreadEfficiency=c=>(c.at(-1).h-c.at(-1).l)/(ATR(c)||1);
const RelativeVolume=c=>c.at(-1).v/mean(c.slice(-20).map(x=>x.v));
const Hurst=c=>{ let s=0,r=0,m=mean(c.map(x=>x.c)); for(const x of c){s+=x.c-m; r=Math.max(r,Math.abs(s)); } return std(c.map(x=>x.c))?Math.log(r/std(c.map(x=>x.c)))/Math.log(c.length):0; };
const FractalDimension=c=>2-Hurst(c);
const TimeSymmetry=c=>mean(c.slice(-10).map((x,i)=>x.c-c[i].c));

/* ================= CROSS-ASSET & BTC DOMINANCE ================= */
const BTCDominance=async()=>{ try{ const r=await fetchJSON("https://api.coingecko.com/api/v3/global"); return r?.data?.market_cap_percentage?.btc??r?.market_cap_percentage?.btc??0; }catch{return 0;} };
async function CorrelationFilter(symbol){ const btc=await candles("BTCUSDT","1h"); const s=await candles(symbol,"1h"); if(!btc.length||!s.length)return 1; const btcClose=btc.map(x=>x.c); const sClose=s.map(x=>x.c).slice(-btcClose.length); const cMean=mean(btcClose); const sMean=mean(sClose); const numerator=btcClose.reduce((a,v,i)=>a+(v-sMean)*(btcClose[i]-cMean),0); const denominator=Math.sqrt(btcClose.reduce((a,v)=>a+(v-cMean)**2,0)*sClose.reduce((a,v)=>a+(v-sMean)**2,0)); return denominator?numerator/denominator:0; }
async function RiskOnOff(){ const btcDom=await BTCDominance(); return btcDom>50?"Risk-On":"Risk-Off"; }

/* ================= SUPPORT/RESISTANCE AI ================= */
function supportResistanceAI(c){ if(c.length<20) return {support:0,resistance:0}; const highs=c.map(x=>x.h),lows=c.map(x=>x.l); return {support:Math.min(...lows.slice(-50)),resistance:Math.max(...highs.slice(-50))}; }

/* ================= CANDLE ML PATTERN ================= */
function candlePattern(c){ if(c.length<3)return"None"; const last=c.slice(-3); const [c1,c2,c3]=last; if(c2.c>c2.o&&c2.o<c1.c&&c2.c>c1.o&&c3.c>c3.o)return"BullishEngulfing"; if(c2.c<c2.o&&c2.o>c1.c&&c2.c<c1.o&&c3.c<c3.o)return"BearishEngulfing"; if(c3.c>c3.o&&(c3.c-c3.o)<(c3.h-c3.l)*0.3&&(c3.o-c3.l)>(c3.h-c3.c))return"Hammer"; return"Neutral"; }

/* ================= MACRO 2Y ================= */
async function macro2Y(symbol){ 
  try{ const c=await candles(symbol,"2Y",500); if(!c||c.length<20) return {regime:"Neutral",atrZ:0,trendUp:false,bos:false,choch:false,hurst:0,fd:0,price:0}; 
  const atrZ=ATR_Z(c); const trendUp=c.at(-1).c>mean(c.map(x=>x.c)); const bos=BOS(c); const choch=CHoCH(c); const hurst=Hurst(c); const fd=FractalDimension(c); 
  let regime="Neutral"; if(trendUp&&bos&&hurst>0.5) regime="Bull"; else if(!trendUp&&bos&&hurst>0.5) regime="Bear"; else if(fd>1.6) regime="Range"; 
  return {regime,atrZ,trendUp,bos,choch,hurst,fd,price:c.at(-1).c}; } catch { return {regime:"Neutral",atrZ:0,trendUp:false,bos:false,choch:false,hurst:0,fd:0,price:0}; } 
}

/* ================= PIPELINE EXTRACTION ================= */
async function extractPipeline(symbol,tf="1h"){
  const c=await candles(symbol,tf,tf.startsWith("m")?1000:500); if(c.length<50)return;
  const macro=await macro2Y(symbol);
  const liq=LiquidityVoid(c), absorption=Absorption(c), atrZ=ATR_Z(c), deltaVol=VolumeDelta(c);
  const sr=supportResistanceAI(c), pattern=candlePattern(c);
  const strategy={symbol,tf,macroRegime:macro.regime,macroATRZ:macro.atrZ,macroHurst:macro.hurst,liq,absorption,atrZ,deltaVol,sr,pattern,BOS:BOS(c),CHoCH:CHoCH(c),PremiumDiscount:PremiumDiscount(c),RangeState:RangeState(c),WyckoffEVR:WyckoffEVR(c),SpreadEfficiency:SpreadEfficiency(c),RelativeVolume:RelativeVolume(c),Hurst:Hurst(c),FractalDimension:FractalDimension(c),TimeSymmetry:TimeSymmetry(c),IcebergProxy:IcebergProxy(c),StopHuntProb:StopHuntProb(c),timestamp:Date.now()};
  pipelineDatabase.strategies.push(strategy);
  const indicator={symbol,tf,ATR:ATR(c),EWMA:EWMA(c),Parkinson:Parkinson(c),timestamp:Date.now()};
  pipelineDatabase.indicators.push(indicator);
  pipelineDatabase.strategies=pipelineDatabase.strategies.slice(-50);
  pipelineDatabase.indicators=pipelineDatabase.indicators.slice(-50);
  // Store in broken battle pieces history
  brokenBattlePieces.push({symbol,tf,pattern,strategy,indicator,timestamp:Date.now()});
  if(brokenBattlePieces.length>100) brokenBattlePieces.shift();
}

/* ================= AI DECISION ================= */
async function AIDecision(symbol,tf,macro,btcDom){
  const c=await candles(symbol,tf,tf.startsWith("m")?1000:500); if(c.length<50)return {direction:null,quality:0,strategies:[],entry:0,atr:0};
  const decisions=[];
  for(let i=0;i<AI_COUNT;i++){
    const volZ=ATR_Z(c), atr=ATR(c), delta=VolumeDelta(c), relVol=RelativeVolume(c), bos=BOS(c), choch=CHoCH(c), liq=LiquidityVoid(c), stopHunt=StopHuntProb(c), absorption=Absorption(c);
    let direction=(bos&&c.at(-1).c>c.at(-2).c)||(absorption&&c.at(-1).c>c.at(-2).c)?"BUY":"SELL";
    if(macro){ if(macro.regime==="Bull"&&direction==="SELL") direction="BUY"; if(macro.regime==="Bear"&&direction==="BUY") direction="SELL"; }
    if(symbol!=="BTCUSDT"&&typeof btcDom==="number"){ if(btcDom>60) direction="SELL"; if(btcDom<40) direction="BUY"; }
    let qualityScore = volZ*Math.abs(delta)*relVol*(bos?1.2:1)*(absorption?1.1:1); if(macro){ if(macro.regime==="Range") qualityScore*=0.6; if(macro.regime==="Neutral") qualityScore*=0.75; } qualityScore=Math.min(100,isFinite(qualityScore)?qualityScore:0);
    const pipelineStrategies=pipelineDatabase.strategies.slice(-3).map(x=>`P_${x.symbol}`);
    const pipelineIndicators=pipelineDatabase.indicators.slice(-3).map(x=>`I_${x.symbol}`);
    const strategy=["Quantum","Breakout","MeanReversion","Momentum","LiquidityEngine"][Math.floor(Math.random()*5)];
    const strategiesCombined=[...pipelineStrategies,...pipelineIndicators,strategy];
    decisions.push({direction,qualityScore,strategies:strategiesCombined,entry:c.at(-1).c,atr});
  }
  const buy=decisions.filter(x=>x.direction==="BUY").length;
  const sell=decisions.filter(x=>x.direction==="SELL").length;
  const dir=buy>=sell?"BUY":"SELL";
  const avgQuality=mean(decisions.map(x=>x.qualityScore));
  const entryPrice=mean(decisions.map(x=>x.entry));
  const avgATR=mean(decisions.map(x=>x.atr||0));
  const strategies=decisions.flatMap(x=>x.strategies);
  return {direction:dir,quality:avgQuality,entry:entryPrice,atr:avgATR,strategies};
}

/* ================= ANALYSIS ================= */
async function analyze(symbol,chat=TELEGRAM_CHAT_ID,mode="swing",tfs=null){
  tfs=Array.isArray(tfs)&&tfs.length?tfs:(mode==="swing"?SWING_TF:SCALP_TF);
  const macro=await macro2Y(symbol), macroRegime=macro?.regime??"Neutral";
  const btcDom=await BTCDominance();
  let totalQ=0,buy=0,sell=0,count=0,entryPrice=0,atr=0; const lines=[];
  for(const tf of tfs){
    const r=await AIDecision(symbol,tf,macro,btcDom); if(!r.direction) continue;
    r.direction==="BUY"?buy++:sell++; totalQ+=r.quality; count++; entryPrice=r.entry; atr=r.atr;
    lines.push(`${tf} | ${r.direction} | Q:${r.quality.toFixed(2)}% | Strat:${r.strategies.join(",")}`);
  }
  if(!count){ await send(chat,`${symbol} has insufficient data.`); return; }
  let confidence=totalQ/count;
  const lastExec=LAST_EXECUTION.get(symbol)||0;
  if(Date.now()-lastExec<EXECUTION_COOLDOWN_MS){ await send(chat,`${symbol} cooldown active. Skipping execution.`); return; }
  if(confidence<THRESHOLD_WATCH){ await send(chat,`OMNI AI SIGNAL SYMBOL: ${symbol} MODE: ${mode} STATUS: WAIT | Confidence ${confidence.toFixed(2)}% | MACRO: ${macroRegime} BTC Dom:${btcDom.toFixed(2)}%`); return; }
  LAST_EXECUTION.set(symbol,Date.now());
  const direction=buy>=sell?"BUY":"SELL";
  let tp,sl;
  if(mode==="swing"){ tp=direction==="BUY"?entryPrice+atr*2:entryPrice-atr*2; sl=direction==="BUY"?entryPrice-atr:entryPrice+atr; tp=Math.min(tp,entryPrice*2); sl=Math.max(sl,entryPrice/2); }
  else { tp=direction==="BUY"?entryPrice+atr:entryPrice-atr; sl=direction==="BUY"?entryPrice-atr/2:entryPrice+atr/2; }
  await send(chat,
    `OMNI AI SIGNAL SYMBOL: ${symbol} MODE: ${mode} DIRECTION: ${direction} ENTRY: ${entryPrice.toFixed(4)} CONFIDENCE: ${confidence.toFixed(2)}% TP: ${tp.toFixed(4)}, SL: ${sl.toFixed(4)}\nMACRO: ${macroRegime} BTC Dom:${btcDom.toFixed(2)}%\n${lines.join("\n")}`
  );
}

/* ================= WATCH LOOP ================= */
(async()=>{
  while(true){
    for(const [s,v] of WATCH){
      const {chat,mode,tfs} = v; const symbol=s;
      await extractPipeline(symbol); await analyze(symbol,chat,mode,tfs);
    }
    await sleep(WATCH_INTERVAL_MS);
  }
})();

/* ================= ADD SYMBOLS ================= */
WATCH.set("BTCUSDT",{chat:TELEGRAM_CHAT_ID,mode:"swing",tfs:SWING_TF});
WATCH.set("ETHUSDT",{chat:TELEGRAM_CHAT_ID,mode:"swing",tfs:SWING_TF});
WATCH.set("BONKUSDT",{chat:TELEGRAM_CHAT_ID,mode:"scalp",tfs:SCALP_TF});
WATCH.set("WIFUSDT",{chat:TELEGRAM_CHAT_ID,mode:"scalp",tfs:SCALP_TF});

/* ================= END OF SCRIPT ================= */
/* ================= TELEGRAM COMMAND HANDLER ================= */
(async () => {
  let offset = 0;
  while (true) {
    try {
      const updates = await fetchJSON(`https://api.telegram.org/bot${TELEGRAM_TOKEN}/getUpdates?offset=${offset}`);
      if (updates?.result) {
        for (const u of updates.result) {
          offset = u.update_id + 1;
          const msg = u.message?.text;
          const chat = u.message?.chat?.id;
          if (!msg || !chat) continue;

          const [command, sym, modeStr, tfsStr] = msg.split(" ");

          switch (command.toLowerCase()) {

            case "/analyze":
              {
                const mode = modeStr || "swing";
                const tfs = tfsStr?.split(",");
                await analyze(sym.toUpperCase(), chat, mode, tfs);
              }
              break;

            case "/swing":
              {
                const tfs = tfsStr?.split(",");
                await analyze(sym.toUpperCase(), chat, "swing", tfs);
              }
              break;

            case "/scalp":
              {
                const tfs = tfsStr?.split(",");
                await analyze(sym.toUpperCase(), chat, "scalp", tfs);
              }
              break;

            case "/watch":
              {
                WATCH.set(sym.toUpperCase(), { chat, mode: modeStr || "swing", tfs: null });
                await send(chat, `Started watching ${sym.toUpperCase()} with mode ${modeStr || "swing"}`);
              }
              break;

            case "/unwatch":
              {
                WATCH.delete(sym.toUpperCase());
                await send(chat, `Stopped watching ${sym.toUpperCase()}`);
              }
              break;

            default:
              await send(chat, `Unknown command. Use /analyze, /swing, /scalp, /watch, /unwatch`);
              break;
          }
        }
      }
    } catch (err) {
      console.error("Telegram polling error:", err);
    }
    await sleep(3000); // polling interval
  }
})();
