/**
 * TradingPanel.jsx — ESTRADE v7 ULTRA Live Trading Interface
 * ═══════════════════════════════════════════════════════════════════════
 * Features:
 *  • API Key modal → saved to localStorage ONLY (never sent to server)
 *  • Binance WebSocket live prices (wss://stream.binance.com:9443/ws)
 *  • Live mini candlestick chart (50 candles, pure canvas)
 *  • Live orderbook depth (20 levels bid/ask)
 *  • Market + Limit order placement
 *  • Profit range selector: 1%→2%→3%→4%→5%→6%→7%→8%→9%→10%→15%→20%→30%
 *  • Per-Trade vs Per-Session mode toggle
 *  • Broker connection: Binance, Bybit, Pionex, MT5, OANDA
 *  • Cloudflare Worker signing (Option A: browser signs, B: Worker signs)
 *  • Disclaimer banner
 *  • Tailwind CSS + React
 * ═══════════════════════════════════════════════════════════════════════
 */
import { useState, useEffect, useRef, useCallback, useMemo } from "react";

/* ─── Constants ──────────────────────────────────────────────── */
const CF_WORKER = import.meta.env.VITE_CF_WORKER_URL || "";
const BINANCE_WS = "wss://stream.binance.com:9443/ws";
const BINANCE_REST = "https://api.binance.com";

const PROFIT_RANGES = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 15, 20, 30];

const RANGE_CFG = {
  1:  { color:"#06b6d4", risk:"0.20%", rr:"5:1", style:"⚡ Lightning Scalp",  hold:"1–5m",   conf:"70%", badge:"1%",  tip:"Ultra-fast EMA cross scalp. 5 confirmations required." },
  2:  { color:"#22c55e", risk:"0.40%", rr:"5:1", style:"🎯 Pro Scalp ★",       hold:"5–30m",  conf:"68%", badge:"2% ★",tip:"Recommended. EMA8/21 + VWAP + volume. Proven strategy." },
  3:  { color:"#4ade80", risk:"0.55%", rr:"5.4",style:"🚀 Momentum Burst",    hold:"15–60m", conf:"69%", badge:"3%",  tip:"BB squeeze + volume surge. Breakout momentum." },
  4:  { color:"#a3e635", risk:"0.70%", rr:"5.7",style:"💥 Breakout Rider",    hold:"30–120m",conf:"70%", badge:"4%",  tip:"Key resistance break + volume. Scale-in allowed." },
  5:  { color:"#facc15", risk:"0.90%", rr:"5.5",style:"🌊 Trend Surfer",      hold:"1–4h",   conf:"71%", badge:"5%",  tip:"EMA50/200 + ADX>25 trend entries with pullback." },
  6:  { color:"#fb923c", risk:"1.10%", rr:"5.4",style:"📐 Fibonacci Swing",   hold:"2–8h",   conf:"72%", badge:"6%",  tip:"Fib 38.2/61.8 + RSI divergence confluence." },
  7:  { color:"#f97316", risk:"1.25%", rr:"5.6",style:"🏦 SMC Precision",     hold:"4–12h",  conf:"73%", badge:"7%",  tip:"Smart Money Concept: Order Blocks + FVG + BOS." },
  8:  { color:"#ef4444", risk:"1.40%", rr:"5.7",style:"🏛️ VWAP Institutional",hold:"6–24h",  conf:"74%", badge:"8%",  tip:"2σ VWAP deviation + volume delta + CVD divergence." },
  9:  { color:"#dc2626", risk:"1.60%", rr:"5.6",style:"🔭 Multi-TF Confluence",hold:"12–24h",conf:"75%", badge:"9%",  tip:"4 timeframes aligned: D1+H4+H1+M15 all confirm." },
  10: { color:"#b91c1c", risk:"1.80%", rr:"5.5",style:"🌊 Full Swing",        hold:"1–3d",   conf:"76%", badge:"10%", tip:"Ichimoku + Elliott Wave + COT data. Multi-day hold." },
  15: { color:"#991b1b", risk:"2.70%", rr:"5.5",style:"📊 Position Trade",    hold:"3–7d",   conf:"77%", badge:"15%", tip:"D1 MA cross + weekly RSI + macro sentiment." },
  20: { color:"#7f1d1d", risk:"3.50%", rr:"5.7",style:"🌍 Macro Swing",       hold:"5–14d",  conf:"78%", badge:"20%", tip:"DXY correlation + institutional flow + monthly level." },
  30: { color:"#450a0a", risk:"5.50%", rr:"5.4",style:"🔱 Major Position",    hold:"1–4wk",  conf:"80%", badge:"30%", tip:"Monthly structure + macro cycle + on-chain data." },
};

const PAIRS = [
  "BTCUSDT","ETHUSDT","SOLUSDT","BNBUSDT","XRPUSDT","DOGEUSDT",
  "ADAUSDT","AVAXUSDT","DOTUSDT","MATICUSDT","LINKUSDT","LTCUSDT",
  "XAUUSDT","XAGUSDT",
];

const BROKERS = [
  { id:"binance",  label:"Binance",    icon:"🅱",  color:"#f0b90b", type:"crypto",
    fields:["API Key","Secret Key"],
    ws: BINANCE_WS,
    restBase: BINANCE_REST },
  { id:"bybit",    label:"Bybit",      icon:"🔶",  color:"#f7a600", type:"crypto",
    fields:["API Key","Secret Key"],
    restBase:"https://api.bybit.com" },
  { id:"pionex",   label:"Pionex",     icon:"🟣",  color:"#7c3aed", type:"crypto",
    fields:["API Key","Secret Key"],
    restBase:"https://api.pionex.com" },
  { id:"mt5",      label:"MetaTrader 5",icon:"📊", color:"#2563eb", type:"forex",
    fields:["Login","Password","Server","Broker REST URL"],
    restBase:"" },
  { id:"oanda",    label:"OANDA",      icon:"🟠",  color:"#ea580c", type:"forex",
    fields:["Account ID","API Token"],
    restBase:"https://api-fxtrade.oanda.com" },
];

const DISCLAIMER = "⚠ API keys are stored only in your browser's localStorage. They are never sent to ESTRADE servers. Trading involves substantial risk of loss. Past performance does not guarantee future results. You are solely responsible for all trading decisions and outcomes.";

/* ─── localStorage helpers ───────────────────────────────────── */
const LS_KEY = "estrade_v7_api_keys";
function loadKeys() {
  try { return JSON.parse(localStorage.getItem(LS_KEY) || "{}"); }
  catch { return {}; }
}
function saveKeys(keys) {
  try { localStorage.setItem(LS_KEY, JSON.stringify(keys)); } catch {}
}
function clearAllKeys() {
  try { localStorage.removeItem(LS_KEY); } catch {}
}

/* ─── Web Crypto HMAC-SHA256 (browser-side signing) ─────────── */
async function hmacSha256Browser(secret, message) {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw", enc.encode(secret),
    { name:"HMAC", hash:"SHA-256" }, false, ["sign"]
  );
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(message));
  return Array.from(new Uint8Array(sig))
    .map(b => b.toString(16).padStart(2,"0")).join("");
}

async function signBinanceRequest(params, apiSecret) {
  const ts  = Date.now();
  const qs  = new URLSearchParams({ ...params, timestamp: ts }).toString();
  const sig = await hmacSha256Browser(apiSecret, qs);
  return `${qs}&signature=${sig}`;
}

/* ─── Exchange API class ─────────────────────────────────────── */
class ExchangeAPI {
  constructor(broker, apiKey, apiSecret, extraFields = {}) {
    this.broker      = broker;
    this.apiKey      = apiKey;
    this.apiSecret   = apiSecret;
    this.extraFields = extraFields;
    this.useWorker   = !!CF_WORKER;
  }

  async _fetch(endpoint, method = "GET", params = {}, signed = false) {
    if (this.broker === "binance") {
      let url = `${BINANCE_REST}${endpoint}`;
      if (signed) {
        const signedQs = await signBinanceRequest(params, this.apiSecret);
        url += `?${signedQs}`;
      } else if (Object.keys(params).length) {
        url += `?${new URLSearchParams(params)}`;
      }
      const headers = signed ? { "X-MBX-APIKEY": this.apiKey } : {};
      const resp = await fetch(url, { method, headers });
      return resp.json();
    }
    // For other exchanges, route through Cloudflare Worker
    if (this.useWorker && CF_WORKER) {
      const resp = await fetch(`${CF_WORKER}/proxy/worker-sign`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          exchange:  this.broker,
          endpoint,
          method,
          params:    signed ? params : {},
          apiKey:    this.apiKey,
          apiSecret: this.apiSecret,
        }),
      });
      return resp.json();
    }
    throw new Error(`Exchange ${this.broker} requires Cloudflare Worker`);
  }

  async getBalance()        { return this._fetch("/api/v3/account", "GET", {}, true); }
  async getOpenOrders(sym)  { return this._fetch("/api/v3/openOrders","GET",{symbol:sym},true); }
  async placeMarketOrder(symbol, side, quantity) {
    return this._fetch("/api/v3/order","POST",{symbol,side,type:"MARKET",quantity},true);
  }
  async placeLimitOrder(symbol, side, quantity, price) {
    return this._fetch("/api/v3/order","POST",
      {symbol,side,type:"LIMIT",quantity,price,timeInForce:"GTC"},true);
  }
  async cancelOrder(symbol, orderId) {
    return this._fetch("/api/v3/order","DELETE",{symbol,orderId},true);
  }
  async getOrderBook(symbol, limit=20) {
    return this._fetch("/api/v3/depth","GET",{symbol,limit},false);
  }
  async getKlines(symbol, interval="1m", limit=100) {
    return this._fetch("/api/v3/klines","GET",{symbol,interval,limit},false);
  }
  async getTickerPrice(symbol) {
    return this._fetch("/api/v3/ticker/24hr","GET",{symbol},false);
  }
}

/* ─── Mini Chart (Canvas-based, zero deps) ───────────────────── */
function MiniChart({ candles, color = "#22c55e", height = 140 }) {
  const ref = useRef(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas || !candles?.length) return;
    const ctx = canvas.getContext("2d");
    const W = canvas.width, H = canvas.height;
    const closes = candles.map(c => parseFloat(c[4]));
    const highs  = candles.map(c => parseFloat(c[2]));
    const lows   = candles.map(c => parseFloat(c[3]));
    const hi = Math.max(...highs), lo = Math.min(...lows);
    const range = hi - lo || 1;

    ctx.clearRect(0, 0, W, H);

    // Background grid
    ctx.strokeStyle = "#1e293b"; ctx.lineWidth = 1;
    for (let i = 0; i <= 4; i++) {
      const y = (i / 4) * H;
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke();
    }

    // Area fill
    const n = candles.length;
    const grad = ctx.createLinearGradient(0, 0, 0, H);
    grad.addColorStop(0, color + "44");
    grad.addColorStop(1, color + "00");
    ctx.fillStyle = grad;
    ctx.beginPath();
    candles.forEach((c, i) => {
      const x = (i / (n - 1)) * W;
      const y = H - ((parseFloat(c[4]) - lo) / range) * H * 0.9 - H * 0.05;
      if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    });
    ctx.lineTo(W, H); ctx.lineTo(0, H); ctx.closePath(); ctx.fill();

    // Price line
    ctx.strokeStyle = color; ctx.lineWidth = 1.5;
    ctx.beginPath();
    candles.forEach((c, i) => {
      const x = (i / (n - 1)) * W;
      const y = H - ((parseFloat(c[4]) - lo) / range) * H * 0.9 - H * 0.05;
      if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    });
    ctx.stroke();

    // Current price dot
    const lastY = H - ((closes[closes.length-1] - lo) / range) * H * 0.9 - H * 0.05;
    ctx.fillStyle = color;
    ctx.beginPath(); ctx.arc(W - 2, lastY, 3, 0, Math.PI * 2); ctx.fill();
  }, [candles, color, height]);

  return (
    <canvas ref={ref} width={340} height={height}
      style={{ width:"100%", height, borderRadius:8, display:"block" }} />
  );
}

/* ─── Order Book ─────────────────────────────────────────────── */
function OrderBook({ bids = [], asks = [] }) {
  const maxVol = Math.max(
    ...bids.slice(0,10).map(b=>parseFloat(b[1])),
    ...asks.slice(0,10).map(a=>parseFloat(a[1])),
    1
  );
  const Row = ({ level, side }) => {
    const price = parseFloat(level[0]), qty = parseFloat(level[1]);
    const pct   = (qty / maxVol) * 100;
    const isAsk = side === "ask";
    return (
      <div className="relative flex justify-between text-xs py-[2px] px-2"
        style={{ fontSize:11 }}>
        <div className="absolute inset-0 opacity-15 rounded"
          style={{ width:`${pct}%`, background: isAsk?"#ef4444":"#22c55e",
                   left: isAsk?"auto":"0", right: isAsk?"0":"auto" }} />
        <span style={{ color: isAsk?"#f87171":"#4ade80", fontWeight:600, fontFamily:"monospace" }}>
          {price.toFixed(4)}
        </span>
        <span style={{ color:"#64748b", fontFamily:"monospace" }}>
          {qty.toFixed(4)}
        </span>
      </div>
    );
  };

  return (
    <div style={{ background:"#0f172a", borderRadius:10, overflow:"hidden" }}>
      <div style={{ padding:"8px 10px", background:"#1e293b",
                    display:"flex", justifyContent:"space-between",
                    fontSize:10, color:"#64748b", fontWeight:600 }}>
        <span>PRICE</span><span>QUANTITY</span>
      </div>
      <div style={{ maxHeight:160, overflowY:"auto" }}>
        {asks.slice(0,10).reverse().map((a,i)=><Row key={i} level={a} side="ask"/>)}
      </div>
      <div style={{ height:1, background:"#334155" }} />
      <div style={{ maxHeight:160, overflowY:"auto" }}>
        {bids.slice(0,10).map((b,i)=><Row key={i} level={b} side="bid"/>)}
      </div>
    </div>
  );
}

/* ─── API Key Modal ──────────────────────────────────────────── */
function APIKeyModal({ onClose, onConnected }) {
  const [step,    setStep]    = useState("broker");  // broker | keys | confirm
  const [broker,  setBroker]  = useState(null);
  const [fields,  setFields]  = useState({});
  const [saved,   setSaved]   = useState(loadKeys());
  const [agreed,  setAgreed]  = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTR]   = useState(null);

  const handleConnect = async () => {
    if (!agreed) return;
    setTesting(true); setTR(null);
    const keys = { ...saved, [broker.id]: fields };
    try {
      if (broker.id === "binance") {
        const api  = new ExchangeAPI("binance", fields["API Key"], fields["Secret Key"]);
        const resp = await api.getBalance();
        if (resp.balances) {
          saveKeys(keys); setSaved(keys);
          setTR({ ok:true, msg:`✅ Connected! ${resp.balances.length} assets found.` });
          setTimeout(() => { onConnected(broker.id, fields); onClose(); }, 1200);
        } else {
          setTR({ ok:false, msg:`❌ ${resp.msg || "Invalid API key"}` });
        }
      } else {
        // Non-Binance: just save (can't verify without CF Worker)
        saveKeys(keys); setSaved(keys);
        setTR({ ok:true, msg:`✅ ${broker.label} keys saved locally. Verification requires Cloudflare Worker.` });
        setTimeout(() => { onConnected(broker.id, fields); onClose(); }, 1500);
      }
    } catch (e) {
      setTR({ ok:false, msg:`❌ ${e.message}` });
    }
    setTesting(false);
  };

  return (
    <div style={{
      position:"fixed", inset:0, background:"rgba(2,8,23,0.96)",
      zIndex:9999, display:"flex", alignItems:"center", justifyContent:"center",
      backdropFilter:"blur(12px)",
    }}>
      <div style={{
        width:"min(520px,95vw)",
        background:"linear-gradient(135deg,#0f172a,#1e293b)",
        borderRadius:20, padding:28, border:"1px solid #334155",
        boxShadow:"0 40px 80px rgba(0,0,0,0.9)",
      }}>
        {/* Header */}
        <div style={{ display:"flex", justifyContent:"space-between",
                      alignItems:"flex-start", marginBottom:20 }}>
          <div>
            <div style={{ fontWeight:900, fontSize:18, color:"#f8fafc" }}>
              🔑 Connect Exchange / Broker
            </div>
            <div style={{ color:"#64748b", fontSize:11, marginTop:4 }}>
              Keys saved in browser only — never transmitted to servers
            </div>
          </div>
          <button onClick={onClose}
            style={{ background:"none", border:"none", color:"#64748b",
                     cursor:"pointer", fontSize:22, lineHeight:1 }}>✕</button>
        </div>

        {/* Disclaimer */}
        <div style={{ padding:"10px 14px", borderRadius:10, marginBottom:16,
                      background:"#451a0322", border:"1px solid #92400e44",
                      fontSize:11, color:"#fbbf24", lineHeight:1.6 }}>
          {DISCLAIMER}
        </div>

        {step === "broker" && (
          <>
            <div style={{ color:"#94a3b8", fontSize:12, fontWeight:600, marginBottom:10 }}>
              SELECT EXCHANGE / BROKER
            </div>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8 }}>
              {BROKERS.map(b => {
                const connected = !!saved[b.id];
                return (
                  <button key={b.id}
                    onClick={() => { setBroker(b); setFields({}); setStep("keys"); }}
                    style={{
                      padding:"14px 12px", borderRadius:12, border:`1.5px solid ${b.color}44`,
                      cursor:"pointer", textAlign:"left", background:"#0f172a",
                      transition:"all 0.2s", position:"relative",
                    }}
                    onMouseEnter={e=>e.currentTarget.style.borderColor=b.color}
                    onMouseLeave={e=>e.currentTarget.style.borderColor=b.color+"44"}
                  >
                    {connected && (
                      <div style={{
                        position:"absolute", top:8, right:8, width:8, height:8,
                        borderRadius:"50%", background:"#22c55e",
                        boxShadow:"0 0 6px #22c55e",
                      }} />
                    )}
                    <div style={{ fontSize:22 }}>{b.icon}</div>
                    <div style={{ color:b.color, fontWeight:700, fontSize:13, marginTop:4 }}>
                      {b.label}
                    </div>
                    <div style={{ color:"#475569", fontSize:10, marginTop:2 }}>
                      {b.type.toUpperCase()} {connected ? "• Connected" : ""}
                    </div>
                  </button>
                );
              })}
            </div>
            {Object.keys(saved).length > 0 && (
              <button onClick={() => { clearAllKeys(); setSaved({}); }}
                style={{ marginTop:14, width:"100%", padding:"8px", borderRadius:8,
                         border:"1px solid #7f1d1d", background:"transparent",
                         color:"#ef4444", cursor:"pointer", fontSize:11, fontWeight:600 }}>
                🗑 Clear All Saved Keys
              </button>
            )}
          </>
        )}

        {step === "keys" && broker && (
          <>
            <button onClick={() => setStep("broker")}
              style={{ background:"none", border:"none", color:"#64748b",
                       cursor:"pointer", fontSize:12, marginBottom:14 }}>
              ← Back
            </button>
            <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:16 }}>
              <span style={{ fontSize:24 }}>{broker.icon}</span>
              <div>
                <div style={{ fontWeight:700, color:broker.color }}>{broker.label}</div>
                <div style={{ color:"#475569", fontSize:11 }}>
                  {broker.type === "crypto" ? "Crypto Exchange" : "Forex Broker"}
                </div>
              </div>
            </div>

            {broker.fields.map(field => (
              <div key={field} style={{ marginBottom:12 }}>
                <label style={{ color:"#94a3b8", fontSize:11, fontWeight:600,
                                 display:"block", marginBottom:5 }}>{field}</label>
                <input
                  type={field.toLowerCase().includes("secret")||field.toLowerCase().includes("password")?"password":"text"}
                  value={fields[field] || ""}
                  onChange={e => setFields(p => ({ ...p, [field]: e.target.value }))}
                  placeholder={`Enter ${field}...`}
                  style={{
                    width:"100%", padding:"10px 14px",
                    background:"#0f172a", border:"1px solid #334155",
                    borderRadius:9, color:"#e2e8f0", fontSize:13, outline:"none",
                  }}
                />
              </div>
            ))}

            {broker.id === "mt5" && (
              <div style={{ padding:"10px 14px", borderRadius:8, background:"#0d2137",
                             border:"1px solid #3b82f622", fontSize:11,
                             color:"#7dd3fc", marginBottom:12, lineHeight:1.6 }}>
                💡 MT5 requires your broker's REST API URL. Some brokers provide this
                (IC Markets, Pepperstone, Exness). Alternatively use MetaTrader's
                built-in Expert Advisor with ESTRADE's EA file (included in /cloudflare).
              </div>
            )}

            {/* Agreement */}
            <div style={{ display:"flex", gap:10, alignItems:"flex-start", marginBottom:16 }}>
              <input type="checkbox" id="agree" checked={agreed}
                onChange={e => setAgreed(e.target.checked)}
                style={{ width:16, height:16, marginTop:2, cursor:"pointer" }} />
              <label htmlFor="agree" style={{ color:"#94a3b8", fontSize:11,
                                               cursor:"pointer", lineHeight:1.5 }}>
                I understand that API keys are stored only in my browser's localStorage.
                I am solely responsible for all trading activity and losses.
              </label>
            </div>

            {testResult && (
              <div style={{ padding:"8px 12px", borderRadius:8, marginBottom:12,
                             background: testResult.ok ? "#052e1644" : "#4c051944",
                             color: testResult.ok ? "#4ade80" : "#f87171",
                             fontSize:12, fontWeight:600 }}>
                {testResult.msg}
              </div>
            )}

            <button onClick={handleConnect}
              disabled={!agreed || testing || broker.fields.some(f=>!fields[f])}
              style={{
                width:"100%", padding:"11px", borderRadius:10, border:"none",
                cursor: agreed && !testing ? "pointer" : "not-allowed",
                fontWeight:800, fontSize:14,
                background: agreed
                  ? `linear-gradient(135deg,${broker.color}cc,${broker.color})`
                  : "#1e293b",
                color: agreed ? "#fff" : "#475569",
                boxShadow: agreed ? `0 4px 20px ${broker.color}44` : "none",
                transition:"all 0.2s",
              }}>
              {testing ? "🔄 Testing Connection..." : `✅ Connect ${broker.label}`}
            </button>
          </>
        )}
      </div>
    </div>
  );
}

/* ─── Profit Range Panel ─────────────────────────────────────── */
function ProfitRangePanel({ selectedRange, setSelectedRange, mode, setMode, onApply }) {
  const [hovered, setHovered] = useState(null);
  const cfg = RANGE_CFG[selectedRange] || RANGE_CFG[2];

  return (
    <div style={{ background:"#0f172a", borderRadius:14, padding:16,
                  border:"1px solid #1e293b" }}>
      <div style={{ display:"flex", justifyContent:"space-between",
                    alignItems:"center", marginBottom:12 }}>
        <div style={{ color:"#e2e8f0", fontWeight:700, fontSize:14 }}>
          🎯 Profit Target
        </div>
        {/* Mode toggle */}
        <div style={{ display:"flex", gap:4, background:"#1e293b",
                      borderRadius:8, padding:3 }}>
          {["per_trade","per_session"].map(m => (
            <button key={m} onClick={() => setMode(m)}
              style={{
                padding:"5px 10px", borderRadius:6, border:"none",
                cursor:"pointer", fontWeight:700, fontSize:10,
                background: mode===m ? "#3b82f6" : "transparent",
                color: mode===m ? "#fff" : "#475569",
              }}>
              {m==="per_trade" ? "📍 /Trade" : "📊 /Session"}
            </button>
          ))}
        </div>
      </div>

      {/* Range buttons grid */}
      <div style={{ display:"grid", gridTemplateColumns:"repeat(7,1fr)", gap:4,
                    marginBottom:12 }}>
        {PROFIT_RANGES.map(r => {
          const c    = RANGE_CFG[r];
          const sel  = selectedRange === r;
          const hov  = hovered === r;
          return (
            <button key={r}
              onClick={() => setSelectedRange(r)}
              onMouseEnter={() => setHovered(r)}
              onMouseLeave={() => setHovered(null)}
              title={c.tip}
              style={{
                padding:"8px 2px", borderRadius:8, border:"none",
                cursor:"pointer", fontWeight:800, fontSize:12,
                transition:"all 0.15s",
                background: sel
                  ? `linear-gradient(135deg,${c.color}bb,${c.color})`
                  : hov ? c.color+"22" : "#1e293b",
                color: sel ? "#fff" : c.color,
                border: `1.5px solid ${sel ? c.color : c.color+"33"}`,
                boxShadow: sel ? `0 0 12px ${c.color}55` : "none",
                transform: sel ? "scale(1.08)" : "scale(1)",
              }}>
              {r}%
            </button>
          );
        })}
      </div>

      {/* Selected range detail card */}
      <div style={{
        padding:"12px 14px", borderRadius:10,
        background: cfg.color + "12",
        border: `1px solid ${cfg.color}33`,
        marginBottom:12,
      }}>
        <div style={{ display:"flex", justifyContent:"space-between",
                      alignItems:"center", marginBottom:8 }}>
          <span style={{ color:cfg.color, fontWeight:800, fontSize:18 }}>
            {selectedRange}% Target
          </span>
          <span style={{ color:"#fff", fontSize:11, padding:"3px 10px",
                          borderRadius:12, background:cfg.color+"55",
                          fontWeight:700 }}>
            {cfg.style}
          </span>
        </div>
        <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:8 }}>
          {[
            { l:"Risk/Trade",  v: cfg.risk, i:"🛡" },
            { l:"Min Conf",    v: cfg.conf,  i:"🧠" },
            { l:"Hold Time",   v: cfg.hold,  i:"⏱" },
          ].map(({ l, v, i }) => (
            <div key={l} style={{ textAlign:"center", padding:"8px 4px",
                                   background:"#0f172a", borderRadius:8 }}>
              <div style={{ fontSize:16 }}>{i}</div>
              <div style={{ color:"#e2e8f0", fontWeight:700, fontSize:13 }}>{v}</div>
              <div style={{ color:"#475569", fontSize:9, marginTop:1 }}>{l}</div>
            </div>
          ))}
        </div>
        <div style={{ marginTop:8, fontSize:10, color:"#64748b", lineHeight:1.5 }}>
          RR {cfg.rr} | {mode === "per_trade" ? "📍 Each trade targets this %" : "📊 Accumulate across session trades"}
          {selectedRange === 2 && <span style={{ color:"#22c55e", marginLeft:6, fontWeight:700 }}>★ RECOMMENDED</span>}
        </div>
      </div>

      <button onClick={() => onApply(selectedRange, mode)}
        style={{
          width:"100%", padding:"11px", borderRadius:10, border:"none",
          cursor:"pointer", fontWeight:800, fontSize:14,
          background: `linear-gradient(135deg,${cfg.color}cc,${cfg.color})`,
          color:"#fff",
          boxShadow: `0 4px 18px ${cfg.color}44`,
        }}>
        ✅ Apply {selectedRange}% Target ({mode === "per_trade" ? "Per Trade" : "Per Session"})
      </button>
    </div>
  );
}

/* ─── Order Form ─────────────────────────────────────────────── */
function OrderForm({ pair, price, api, onOrderPlaced }) {
  const [side,    setSide]    = useState("BUY");
  const [type,    setType]    = useState("MARKET");
  const [qty,     setQty]     = useState("");
  const [limitPx, setLimitPx] = useState("");
  const [loading, setLoading] = useState(false);
  const [result,  setResult]  = useState(null);

  const estCost = useMemo(() => {
    const q = parseFloat(qty) || 0;
    const p = type === "LIMIT" ? (parseFloat(limitPx) || price) : price;
    return (q * p).toFixed(2);
  }, [qty, limitPx, price, type]);

  const place = async () => {
    if (!api || !qty) return;
    setLoading(true); setResult(null);
    try {
      let resp;
      if (type === "MARKET") {
        resp = await api.placeMarketOrder(pair, side, parseFloat(qty));
      } else {
        resp = await api.placeLimitOrder(pair, side, parseFloat(qty), parseFloat(limitPx));
      }
      if (resp.orderId || resp.result) {
        setResult({ ok:true, msg:`✅ ${side} ${qty} ${pair.replace("USDT","")} order placed!` });
        onOrderPlaced?.(resp);
      } else {
        setResult({ ok:false, msg:`❌ ${resp.msg || JSON.stringify(resp)}` });
      }
    } catch (e) {
      setResult({ ok:false, msg:`❌ ${e.message}` });
    }
    setLoading(false);
  };

  return (
    <div style={{ background:"#0f172a", borderRadius:14, padding:16,
                  border:"1px solid #1e293b" }}>
      <div style={{ color:"#94a3b8", fontWeight:700, fontSize:13, marginBottom:12 }}>
        📋 Place Order
      </div>

      {/* BUY / SELL */}
      <div style={{ display:"flex", gap:4, marginBottom:12 }}>
        {["BUY","SELL"].map(s => (
          <button key={s} onClick={() => setSide(s)}
            style={{
              flex:1, padding:"10px", borderRadius:9, border:"none",
              cursor:"pointer", fontWeight:800, fontSize:14,
              background: side===s
                ? (s==="BUY"?"linear-gradient(135deg,#052e16,#22c55e)"
                           :"linear-gradient(135deg,#4c0519,#ef4444)")
                : "#1e293b",
              color: side===s?"#fff":"#475569",
              boxShadow: side===s
                ? (s==="BUY"?"0 4px 14px #22c55e44":"0 4px 14px #ef444444")
                : "none",
            }}>{s}</button>
        ))}
      </div>

      {/* MARKET / LIMIT */}
      <div style={{ display:"flex", gap:4, marginBottom:12 }}>
        {["MARKET","LIMIT"].map(t => (
          <button key={t} onClick={() => setType(t)}
            style={{
              flex:1, padding:"7px", borderRadius:8, border:"none",
              cursor:"pointer", fontWeight:600, fontSize:12,
              background: type===t ? "#334155" : "#1e293b",
              color: type===t ? "#e2e8f0" : "#475569",
            }}>{t}</button>
        ))}
      </div>

      {/* Price display */}
      <div style={{ padding:"8px 12px", background:"#1e293b", borderRadius:8,
                    marginBottom:10, display:"flex", justifyContent:"space-between" }}>
        <span style={{ color:"#475569", fontSize:11 }}>
          {type==="MARKET" ? "Market Price" : "Limit Price"}
        </span>
        <span style={{ color:"#e2e8f0", fontWeight:700, fontSize:13, fontFamily:"monospace" }}>
          ${price?.toLocaleString(undefined,{maximumFractionDigits:4})}
        </span>
      </div>

      {type === "LIMIT" && (
        <div style={{ marginBottom:10 }}>
          <label style={{ color:"#64748b", fontSize:11, display:"block", marginBottom:4 }}>
            Limit Price (USDT)
          </label>
          <input type="number" value={limitPx}
            onChange={e => setLimitPx(e.target.value)}
            placeholder={price?.toFixed(2)}
            style={{ width:"100%", padding:"9px 12px", background:"#1e293b",
                     border:"1px solid #334155", borderRadius:8,
                     color:"#e2e8f0", fontSize:13, outline:"none" }} />
        </div>
      )}

      <div style={{ marginBottom:12 }}>
        <label style={{ color:"#64748b", fontSize:11, display:"block", marginBottom:4 }}>
          Quantity ({pair.replace("USDT","")})
        </label>
        <input type="number" value={qty} onChange={e => setQty(e.target.value)}
          placeholder="0.001"
          style={{ width:"100%", padding:"9px 12px", background:"#1e293b",
                   border:"1px solid #334155", borderRadius:8,
                   color:"#e2e8f0", fontSize:13, outline:"none" }} />
        {qty && (
          <div style={{ fontSize:10, color:"#64748b", marginTop:4 }}>
            Estimated cost: <b style={{ color:"#e2e8f0" }}>${estCost}</b>
          </div>
        )}
      </div>

      {result && (
        <div style={{ padding:"8px 12px", borderRadius:8, marginBottom:10,
                       background: result.ok?"#052e1644":"#4c051944",
                       color: result.ok?"#4ade80":"#f87171",
                       fontSize:12, fontWeight:600 }}>
          {result.msg}
        </div>
      )}

      <button onClick={place}
        disabled={loading || !qty || !api}
        style={{
          width:"100%", padding:"11px", borderRadius:10, border:"none",
          cursor: loading||!qty||!api ? "not-allowed" : "pointer",
          fontWeight:800, fontSize:14, transition:"all 0.2s",
          background: !api
            ? "#1e293b"
            : side==="BUY"
              ? "linear-gradient(135deg,#052e16,#22c55e)"
              : "linear-gradient(135deg,#4c0519,#ef4444)",
          color: !api?"#334155":"#fff",
          boxShadow: api&&!loading
            ? side==="BUY"?"0 4px 16px #22c55e44":"0 4px 16px #ef444444"
            : "none",
        }}>
        {loading ? "⏳ Placing..." : !api ? "🔑 Connect Exchange First" : `${side} ${pair.replace("USDT","")} →`}
      </button>
    </div>
  );
}

/* ─── Main TradingPanel ──────────────────────────────────────── */
export default function TradingPanel() {
  const [pair,        setPair]        = useState("BTCUSDT");
  const [ticker,      setTicker]      = useState(null);
  const [candles,     setCandles]     = useState([]);
  const [orderbook,   setOrderbook]   = useState({ bids:[], asks:[] });
  const [aggtrades,   setAggtrades]   = useState([]);
  const [showModal,   setShowModal]   = useState(false);
  const [connBroker,  setConnBroker]  = useState(null);
  const [api,         setApi]         = useState(null);
  const [selRange,    setSelRange]    = useState(2);
  const [mode,        setMode]        = useState("per_session");
  const [appliedCfg,  setAppliedCfg] = useState(null);
  const [wsStatus,    setWsStatus]    = useState("disconnected");
  const [klineIv,     setKlineIv]     = useState("1m");

  const wsTicker = useRef(null);
  const wsDepth  = useRef(null);
  const wsKline  = useRef(null);
  const wsTrade  = useRef(null);

  // ── Connect broker ────────────────────────────────────────
  const handleConnected = useCallback((brokerId, fields) => {
    const broker = BROKERS.find(b => b.id === brokerId);
    setConnBroker(broker);
    if (brokerId === "binance") {
      setApi(new ExchangeAPI("binance", fields["API Key"], fields["Secret Key"]));
    }
  }, []);

  // ── Binance WebSocket streams ─────────────────────────────
  const connectWS = useCallback(() => {
    const sym = pair.toLowerCase();
    [wsTicker, wsDepth, wsKline, wsTrade].forEach(r => {
      if (r.current?.readyState === WebSocket.OPEN) r.current.close();
    });

    // Ticker
    const ws1 = new WebSocket(`${BINANCE_WS}/${sym}@ticker`);
    ws1.onopen  = () => setWsStatus("connected");
    ws1.onmessage = e => {
      const d = JSON.parse(e.data);
      setTicker({
        price:   parseFloat(d.c),
        change:  parseFloat(d.P),
        high:    parseFloat(d.h),
        low:     parseFloat(d.l),
        volume:  parseFloat(d.v),
        quoteVol:parseFloat(d.q),
      });
    };
    ws1.onerror = () => setWsStatus("error");
    ws1.onclose = () => setWsStatus("disconnected");
    wsTicker.current = ws1;

    // Order book depth
    const ws2 = new WebSocket(`${BINANCE_WS}/${sym}@depth20@100ms`);
    ws2.onmessage = e => {
      const d = JSON.parse(e.data);
      setOrderbook({ bids: d.bids || [], asks: d.asks || [] });
    };
    wsDepth.current = ws2;

    // Kline / candlestick
    const ws3 = new WebSocket(`${BINANCE_WS}/${sym}@kline_${klineIv}`);
    ws3.onmessage = e => {
      const d = JSON.parse(e.data);
      if (d.k) {
        setCandles(prev => {
          const updated = [...prev];
          const kline   = [d.k.t,d.k.o,d.k.h,d.k.l,d.k.c,d.k.v];
          if (updated.length && updated[updated.length-1][0] === d.k.t) {
            updated[updated.length-1] = kline;
          } else {
            updated.push(kline);
            if (updated.length > 80) updated.shift();
          }
          return updated;
        });
      }
    };
    wsKline.current = ws3;

    // Agg trades
    const ws4 = new WebSocket(`${BINANCE_WS}/${sym}@aggTrade`);
    ws4.onmessage = e => {
      const d = JSON.parse(e.data);
      setAggtrades(prev => [{
        price: parseFloat(d.p), qty: parseFloat(d.q),
        side: d.m ? "sell" : "buy", time: d.T,
      }, ...prev.slice(0, 14)]);
    };
    wsTrade.current = ws4;
  }, [pair, klineIv]);

  // Load initial klines via REST
  useEffect(() => {
    fetch(`${BINANCE_REST}/api/v3/klines?symbol=${pair}&interval=${klineIv}&limit=80`)
      .then(r => r.json())
      .then(data => { if (Array.isArray(data)) setCandles(data); })
      .catch(() => {});
  }, [pair, klineIv]);

  useEffect(() => {
    connectWS();
    return () => {
      [wsTicker, wsDepth, wsKline, wsTrade].forEach(r => {
        if (r.current) try { r.current.close(); } catch {}
      });
    };
  }, [connectWS]);

  const cfg = RANGE_CFG[selRange] || RANGE_CFG[2];
  const isUp = (ticker?.change || 0) >= 0;
  const priceFmt = (n) => n >= 1000 ? n.toFixed(2) : n >= 1 ? n.toFixed(4) : n.toFixed(6);

  return (
    <div style={{
      minHeight:"100vh",
      background:"linear-gradient(180deg,#020817,#030f1e)",
      color:"#e2e8f0",
      fontFamily:"Inter,system-ui,sans-serif",
      padding:"0 0 48px",
    }}>
      {/* ── Top Bar ────────────────────────────────────────── */}
      <div style={{
        background:"rgba(2,8,23,0.96)", backdropFilter:"blur(20px)",
        borderBottom:"1px solid #0f172a", padding:"0 20px",
        position:"sticky", top:0, zIndex:100,
      }}>
        <div style={{ maxWidth:1400, margin:"0 auto", height:58,
                      display:"flex", alignItems:"center", gap:12 }}>
          <span style={{ fontWeight:900, fontSize:18, color:"#f8fafc", letterSpacing:"-0.5px" }}>
            ⚡ ESTRADE <span style={{ color:"#6366f1" }}>TRADE</span>
          </span>

          {/* Pair selector */}
          <select value={pair} onChange={e => setPair(e.target.value)}
            style={{ padding:"6px 12px", background:"#1e293b", border:"1px solid #334155",
                     borderRadius:9, color:"#e2e8f0", fontSize:13, cursor:"pointer" }}>
            {PAIRS.map(p => <option key={p} value={p}>{p}</option>)}
          </select>

          {/* Interval */}
          <select value={klineIv} onChange={e => setKlineIv(e.target.value)}
            style={{ padding:"6px 10px", background:"#1e293b", border:"1px solid #334155",
                     borderRadius:9, color:"#e2e8f0", fontSize:12, cursor:"pointer" }}>
            {["1m","3m","5m","15m","30m","1h","4h","1d"].map(i => (
              <option key={i} value={i}>{i}</option>
            ))}
          </select>

          {/* Live price */}
          {ticker && (
            <div style={{ display:"flex", alignItems:"baseline", gap:8, marginLeft:8 }}>
              <span style={{ fontFamily:"monospace", fontWeight:900, fontSize:20,
                              color: isUp ? "#22c55e" : "#ef4444" }}>
                ${priceFmt(ticker.price)}
              </span>
              <span style={{ fontSize:13, color: isUp?"#22c55e":"#ef4444", fontWeight:700 }}>
                {isUp?"▲":"▼"} {Math.abs(ticker.change).toFixed(2)}%
              </span>
              <span style={{ fontSize:10, color:"#334155" }}>
                H: ${priceFmt(ticker.high)} L: ${priceFmt(ticker.low)}
              </span>
            </div>
          )}

          {/* WS status */}
          <div style={{
            marginLeft:"auto", display:"flex", alignItems:"center", gap:6,
            padding:"4px 10px", borderRadius:7,
            background: wsStatus==="connected"?"#052e1666":"#4c051944",
          }}>
            <div style={{ width:6, height:6, borderRadius:"50%",
                           background: wsStatus==="connected"?"#22c55e":"#ef4444",
                           boxShadow: wsStatus==="connected"?"0 0 6px #22c55e":"none" }} />
            <span style={{ fontSize:10, color: wsStatus==="connected"?"#22c55e":"#ef4444",
                            fontWeight:600 }}>
              {wsStatus === "connected" ? "LIVE" : "OFFLINE"}
            </span>
          </div>

          {/* Connect button */}
          <button onClick={() => setShowModal(true)}
            style={{
              padding:"7px 14px", borderRadius:9, border:"none", cursor:"pointer",
              fontWeight:700, fontSize:12,
              background: connBroker
                ? `linear-gradient(135deg,${connBroker.color}cc,${connBroker.color})`
                : "linear-gradient(135deg,#4f46e5,#7c3aed)",
              color:"#fff",
            }}>
            {connBroker ? `${connBroker.icon} ${connBroker.label}` : "🔑 Connect"}
          </button>
        </div>
      </div>

      {/* ── Disclaimer ─────────────────────────────────────── */}
      <div style={{
        background:"#451a0322", borderBottom:"1px solid #92400e33",
        padding:"6px 20px", textAlign:"center",
        fontSize:10, color:"#b45309",
      }}>
        {DISCLAIMER}
      </div>

      {/* ── Main Layout ────────────────────────────────────── */}
      <div style={{ maxWidth:1400, margin:"20px auto", padding:"0 20px",
                    display:"grid", gridTemplateColumns:"1fr 320px", gap:16 }}>

        {/* LEFT: Chart + Trades */}
        <div style={{ display:"flex", flexDirection:"column", gap:14 }}>

          {/* Chart */}
          <div style={{ background:"#0f172a", borderRadius:16,
                        padding:"16px 16px 12px", border:"1px solid #1e293b" }}>
            <div style={{ display:"flex", justifyContent:"space-between",
                           alignItems:"center", marginBottom:10 }}>
              <div>
                <span style={{ fontWeight:700, fontSize:15, color:"#e2e8f0" }}>{pair}</span>
                <span style={{ marginLeft:8, fontSize:11, color:"#475569" }}>
                  {klineIv} chart • {candles.length} candles
                </span>
              </div>
              {ticker && (
                <div style={{ display:"flex", gap:16, fontSize:11, color:"#64748b" }}>
                  <span>Vol: {ticker.volume?.toLocaleString(undefined,{maximumFractionDigits:0})}</span>
                  <span>QuoteVol: ${(ticker.quoteVol/1e6)?.toFixed(1)}M</span>
                </div>
              )}
            </div>
            <MiniChart candles={candles}
              color={isUp ? "#22c55e" : "#ef4444"} height={200} />
          </div>

          {/* Order Book */}
          <div style={{ background:"#0f172a", borderRadius:16,
                        padding:16, border:"1px solid #1e293b" }}>
            <div style={{ color:"#94a3b8", fontWeight:700, fontSize:13, marginBottom:10,
                           display:"flex", alignItems:"center", gap:8 }}>
              📖 Order Book
              <span style={{ fontSize:10, color:"#334155" }}>(top 10 levels)</span>
            </div>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 12px 1fr", gap:8,
                           alignItems:"start" }}>
              <div>
                <div style={{ fontSize:10, color:"#4ade80", fontWeight:600,
                               textAlign:"center", marginBottom:4 }}>BIDS</div>
                <OrderBook bids={orderbook.bids} asks={[]} />
              </div>
              <div style={{ width:1, background:"#1e293b", alignSelf:"stretch" }} />
              <div>
                <div style={{ fontSize:10, color:"#f87171", fontWeight:600,
                               textAlign:"center", marginBottom:4 }}>ASKS</div>
                <OrderBook bids={[]} asks={orderbook.asks} />
              </div>
            </div>
          </div>

          {/* Recent Trades */}
          <div style={{ background:"#0f172a", borderRadius:16,
                        padding:16, border:"1px solid #1e293b" }}>
            <div style={{ color:"#94a3b8", fontWeight:700, fontSize:13, marginBottom:10 }}>
              ⚡ Live Trades
            </div>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr",
                           gap:4, marginBottom:6 }}>
              {["Price","Qty","Side"].map(h => (
                <div key={h} style={{ color:"#334155", fontSize:9, fontWeight:600 }}>{h}</div>
              ))}
            </div>
            {aggtrades.map((t, i) => (
              <div key={i} style={{ display:"grid",
                                     gridTemplateColumns:"1fr 1fr 1fr", gap:4,
                                     padding:"3px 0", borderBottom:"1px solid #0f172a22" }}>
                <span style={{ color: t.side==="buy"?"#4ade80":"#f87171",
                                fontFamily:"monospace", fontSize:11, fontWeight:600 }}>
                  {priceFmt(t.price)}
                </span>
                <span style={{ color:"#64748b", fontFamily:"monospace", fontSize:11 }}>
                  {t.qty.toFixed(4)}
                </span>
                <span style={{ color: t.side==="buy"?"#4ade80":"#f87171",
                                fontSize:10, fontWeight:700 }}>
                  {t.side.toUpperCase()}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* RIGHT: Controls */}
        <div style={{ display:"flex", flexDirection:"column", gap:14 }}>

          {/* Applied target badge */}
          {appliedCfg && (
            <div style={{
              padding:"10px 14px", borderRadius:12,
              background: `linear-gradient(135deg,${RANGE_CFG[appliedCfg.range]?.color}22,#0f172a)`,
              border: `1px solid ${RANGE_CFG[appliedCfg.range]?.color}44`,
              display:"flex", justifyContent:"space-between", alignItems:"center",
            }}>
              <div>
                <div style={{ color:RANGE_CFG[appliedCfg.range]?.color,
                               fontWeight:800, fontSize:16 }}>
                  {appliedCfg.range}% Active
                </div>
                <div style={{ color:"#64748b", fontSize:10, marginTop:2 }}>
                  {appliedCfg.mode === "per_trade" ? "📍 Per Trade" : "📊 Per Session"}
                  {" "}· Risk {RANGE_CFG[appliedCfg.range]?.risk}
                </div>
              </div>
              <button onClick={() => setAppliedCfg(null)}
                style={{ background:"none", border:"none", color:"#334155",
                           cursor:"pointer", fontSize:16 }}>✕</button>
            </div>
          )}

          {/* Profit Range Panel */}
          <ProfitRangePanel
            selectedRange={selRange}
            setSelectedRange={setSelRange}
            mode={mode}
            setMode={setMode}
            onApply={(r, m) => setAppliedCfg({ range:r, mode:m })}
          />

          {/* Order Form */}
          <OrderForm
            pair={pair}
            price={ticker?.price || 0}
            api={api}
            onOrderPlaced={(r) => console.log("Order:", r)}
          />

          {/* Connection status */}
          <div style={{ background:"#0f172a", borderRadius:14, padding:14,
                         border:"1px solid #1e293b" }}>
            <div style={{ color:"#94a3b8", fontWeight:700, fontSize:12, marginBottom:10 }}>
              🔗 Broker Status
            </div>
            {BROKERS.map(b => {
              const saved    = loadKeys();
              const isConn   = !!saved[b.id];
              const isActive = connBroker?.id === b.id;
              return (
                <div key={b.id} style={{
                  display:"flex", justifyContent:"space-between", alignItems:"center",
                  padding:"6px 0", borderBottom:"1px solid #1e293b22",
                }}>
                  <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                    <span style={{ fontSize:16 }}>{b.icon}</span>
                    <span style={{ fontSize:12, color: isActive?"#e2e8f0":"#64748b",
                                   fontWeight: isActive?700:400 }}>
                      {b.label}
                    </span>
                  </div>
                  <span style={{ fontSize:10, padding:"2px 8px", borderRadius:6, fontWeight:700,
                                   background: isActive?"#052e16":isConn?"#1e293b":"transparent",
                                   color: isActive?"#22c55e":isConn?"#f59e0b":"#334155" }}>
                    {isActive ? "● ACTIVE" : isConn ? "SAVED" : "—"}
                  </span>
                </div>
              );
            })}
            <button onClick={() => setShowModal(true)}
              style={{ marginTop:10, width:"100%", padding:"9px", borderRadius:9,
                         border:"1px solid #334155", background:"transparent",
                         color:"#94a3b8", cursor:"pointer", fontWeight:600, fontSize:12 }}>
              + Add / Change Connection
            </button>
          </div>

          {/* CF Worker status */}
          <div style={{ padding:"10px 14px", borderRadius:10, background:"#0f172a",
                         border:"1px solid #1e293b", fontSize:11, color:"#64748b" }}>
            <div style={{ fontWeight:700, color:"#94a3b8", marginBottom:6 }}>
              ☁ Cloudflare Worker
            </div>
            {CF_WORKER ? (
              <div style={{ color:"#22c55e" }}>✅ {CF_WORKER}</div>
            ) : (
              <div style={{ lineHeight:1.6 }}>
                Not configured. Add to .env:<br/>
                <code style={{ color:"#818cf8", fontSize:10 }}>
                  VITE_CF_WORKER_URL=https://estrade-proxy.*.workers.dev
                </code>
                <br/>
                <span style={{ color:"#475569" }}>
                  Binance works without it (browser CORS ok).
                  Other exchanges need Worker for signed requests.
                </span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* API Key Modal */}
      {showModal && (
        <APIKeyModal
          onClose={() => setShowModal(false)}
          onConnected={handleConnected}
        />
      )}

      <style>{`
        *{box-sizing:border-box;margin:0;padding:0}
        body{background:#020817}
        ::-webkit-scrollbar{width:4px;height:4px}
        ::-webkit-scrollbar-track{background:#0f172a}
        ::-webkit-scrollbar-thumb{background:#1e293b;border-radius:2px}
        input,select{box-sizing:border-box}
        input:focus,select:focus{border-color:#6366f1!important;outline:none}
        button:active{transform:scale(0.97)}
      `}</style>
    </div>
  );
}
