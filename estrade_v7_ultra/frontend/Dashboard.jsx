/**
 * ESTRADE v7 ULTRA — Complete Unified Dashboard
 * ═══════════════════════════════════════════════════════════════════════
 * Features:
 *  • Profit Range Selector: 2% 3% 4% 5% 6% 7% 8% 10% 12% 15%
 *  • Mode: Per Trade  vs  Per Session (toggle per bot)
 *  • 2% Pro Mode button (preserved exactly)
 *  • ProMax AI Scalping — RED RIBBON + 1 USDT sequence (1→5→3→4)
 *  • All 39 bots across ESF / ESC / Both
 *  • Real-time progress bars per bot
 *  • Vercel-ready payment (Stripe via /api/payment)
 *  • Maintenance mode banner
 *  • Security dashboard panel
 *  • Live trade feed with latency
 *  • Capital growth projection chart
 * ═══════════════════════════════════════════════════════════════════════
 */
import { useState, useEffect, useCallback, useRef } from "react";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL  || "",
  import.meta.env.VITE_SUPABASE_ANON_KEY || ""
);
const API = import.meta.env.VITE_API_URL || "/api";
const PLATFORM = import.meta.env.VITE_PLATFORM || "both";

/* ─── helpers ─────────────────────────────────────────────── */
const api = {
  get:  (p)    => fetch(`${API}${p}`, { credentials:"include" }).then(r=>r.json()).catch(()=>({})),
  post: (p, b) => fetch(`${API}${p}`, {
    method:"POST", credentials:"include",
    headers:{"Content-Type":"application/json"},
    body: JSON.stringify(b),
  }).then(r=>r.json()).catch(()=>({})),
};

/* ─── constants ───────────────────────────────────────────── */
const PROFIT_OPTIONS = [2,3,4,5,6,7,8,10,12,15];

const TARGET_CFG = {
  2:  {color:"#22c55e",badge:"SAFE",       risk:"0.44%",conf:"68%",rr:"1.5"},
  3:  {color:"#4ade80",badge:"MODERATE",   risk:"0.66%",conf:"70%",rr:"1.6"},
  4:  {color:"#a3e635",badge:"BALANCED",   risk:"0.92%",conf:"71%",rr:"1.7"},
  5:  {color:"#facc15",badge:"ACTIVE",     risk:"1.20%",conf:"72%",rr:"1.8"},
  6:  {color:"#fb923c",badge:"GROWTH",     risk:"1.44%",conf:"73%",rr:"1.9"},
  7:  {color:"#f97316",badge:"HIGH",       risk:"1.75%",conf:"74%",rr:"2.0"},
  8:  {color:"#ef4444",badge:"BOLD",       risk:"2.00%",conf:"75%",rr:"2.0"},
  10: {color:"#dc2626",badge:"AGGRESSIVE", risk:"2.60%",conf:"76%",rr:"2.2"},
  12: {color:"#b91c1c",badge:"ULTRA",      risk:"3.36%",conf:"78%",rr:"2.3"},
  15: {color:"#7f1d1d",badge:"MAX",        risk:"4.50%",conf:"80%",rr:"2.5"},
};

const CAT_META = {
  hybrid:       {label:"Hybrid",            icon:"🌐",color:"#22c55e"},
  high_profit:  {label:"High Profit",       icon:"💰",color:"#f59e0b"},
  medium:       {label:"Medium",            icon:"⚡",color:"#f97316"},
  crypto_scalp: {label:"AI Scalping",       icon:"⚡",color:"#6366f1"},
  forex:        {label:"Forex",             icon:"📈",color:"#ef4444"},
  commodities:  {label:"Gold & Silver",     icon:"🥇",color:"#f59e0b"},
  forex_hybrid: {label:"Forex Hybrid",      icon:"🔷",color:"#3b82f6"},
  capital_max:  {label:"Capital Max",       icon:"🚀",color:"#f97316"},
};

const SESSIONS = {
  asia:     {label:"Asia",    icon:"🌏", color:"#818cf8"},
  london:   {label:"London",  icon:"🇬🇧", color:"#34d399"},
  new_york: {label:"New York",icon:"🗽", color:"#f59e0b"},
  overnight:{label:"Night",   icon:"🌙", color:"#6366f1"},
};

/* ─── hooks ───────────────────────────────────────────────── */
function useDashboard() {
  const [bots,      setBots]      = useState([]);
  const [trades,    setTrades]    = useState([]);
  const [portfolio, setPortfolio] = useState({balance:0,pnl_pct:0,total_profit:0});
  const [security,  setSecurity]  = useState({status:"SECURE"});
  const [maint,     setMaint]     = useState({global_maintenance:false});
  const [loading,   setLoading]   = useState(true);

  const load = useCallback(async () => {
    const [b,t,p,s,m] = await Promise.all([
      api.get("/bots"),
      api.get("/trades?limit=50"),
      api.get("/portfolio"),
      api.get("/security/dashboard"),
      api.get("/maintenance/status"),
    ]);
    setBots(b.bots     || []);
    setTrades(t.trades || []);
    setPortfolio(p     || {});
    setSecurity(s      || {});
    setMaint(m         || {});
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
    const ch = supabase.channel("ultra_dash")
      .on("postgres_changes",{event:"*",schema:"public",table:"bots"},(p)=>{
        setBots(prev=>{
          const i=prev.findIndex(b=>b.id===p.new?.id);
          if(p.eventType==="DELETE") return prev.filter(b=>b.id!==p.old?.id);
          if(i>=0){const n=[...prev];n[i]={...prev[i],...p.new};return n;}
          return [...prev,p.new];
        });
      })
      .on("postgres_changes",{event:"INSERT",schema:"public",table:"trades"},(p)=>{
        setTrades(prev=>[p.new,...prev.slice(0,49)]);
      })
      .subscribe();
    const iv = setInterval(()=>api.get("/portfolio").then(setPortfolio),30000);
    return ()=>{supabase.removeChannel(ch);clearInterval(iv);};
  },[load]);

  const startBot   = (id)  => api.post(`/bots/${id}/start`,{}).then(load);
  const stopBot    = (id)  => api.post(`/bots/${id}/stop`, {}).then(load);
  const toggle2pct = (id,en)=> api.post(`/bots/${id}/two-pct-mode`,{enable:en}).then(load);
  const setRange   = (id,t,m)=>api.post(`/bots/${id}/profit-range`,{target_pct:t,mode:m}).then(load);
  const upgradeAI  = (id,tier)=>api.post(`/bots/${id}/upgrade-ai`,{tier}).then(load);
  const checkout   = (plan) => api.post("/payment/checkout",{plan}).then(r=>{
    if(r.url) window.location.href=r.url;
  });

  return {bots,trades,portfolio,security,maint,loading,
          startBot,stopBot,toggle2pct,setRange,upgradeAI,checkout,refresh:load};
}

/* ─── ProMax USDT Sequence Tracker ─────────────────────────── */
function ProMaxSequence({bot}) {
  const seq = [1,5,3,4];
  const cur = (bot.promax_sequence_pos || 0) % 4;
  const total = seq.reduce((a,b)=>a+b,0); // 13 USDT per full cycle

  return (
    <div style={{marginTop:8,padding:"10px 12px",background:"#1a0505",
                 borderRadius:10,border:"1px solid #ef444444"}}>
      <div style={{display:"flex",justifyContent:"space-between",
                   alignItems:"center",marginBottom:8}}>
        <span style={{color:"#fca5a5",fontSize:11,fontWeight:700}}>
          💎 1 USDT Sequence
        </span>
        <span style={{color:"#ef4444",fontSize:11}}>
          Cycle profit: <b style={{color:"#fca5a5"}}>13 USDT</b>
        </span>
      </div>
      <div style={{display:"flex",gap:6}}>
        {seq.map((mult,i)=>{
          const isCurrent = i === cur;
          const isDone    = i < cur || (bot.promax_cycle_done && i < cur);
          const usdtAmt   = mult;
          return (
            <div key={i} style={{
              flex:1,textAlign:"center",padding:"8px 4px",borderRadius:8,
              background: isCurrent?"linear-gradient(135deg,#7f1d1d,#ef4444)"
                         :isDone?"#14532d":"#1e293b",
              border:`1px solid ${isCurrent?"#ef4444":isDone?"#22c55e":"#334155"}`,
              transition:"all 0.3s",
              boxShadow: isCurrent?"0 0 12px #ef444466":"none",
            }}>
              <div style={{
                color: isCurrent?"#fff":isDone?"#4ade80":"#475569",
                fontWeight:800, fontSize:14,
              }}>{usdtAmt}$</div>
              <div style={{color:"#64748b",fontSize:9,marginTop:2}}>
                T{i+1}{isCurrent?" ◀":""}
              </div>
            </div>
          );
        })}
      </div>
      <div style={{marginTop:8,display:"flex",justifyContent:"space-between",
                   fontSize:10,color:"#475569"}}>
        <span>Risk: max <b style={{color:"#fca5a5"}}>0.25%/trade</b></span>
        <span>Conf: <b style={{color:"#fca5a5"}}>≥85%</b> | RR: <b style={{color:"#fca5a5"}}>≥2.5</b></span>
      </div>
      {bot.promax_session_usdt > 0 && (
        <div style={{marginTop:6,color:"#22c55e",fontSize:11,fontWeight:700}}>
          ✅ Session: +{(bot.promax_session_usdt||0).toFixed(2)} USDT earned
        </div>
      )}
    </div>
  );
}

/* ─── Profit Range Selector ──────────────────────────────────── */
function ProfitRangeSelector({bot, onSetRange}) {
  const [open,    setOpen]    = useState(false);
  const [selTgt,  setSelTgt]  = useState(bot.profit_range_target || 2);
  const [selMode, setSelMode] = useState(bot.profit_range_mode   || "per_session");
  const [loading, setLoading] = useState(false);
  const cfg = TARGET_CFG[selTgt] || TARGET_CFG[2];
  const active = bot.profit_range_target > 0;

  const apply = async () => {
    setLoading(true);
    await onSetRange(bot.id, selTgt, selMode);
    setLoading(false);
    setOpen(false);
  };

  const curState = bot.profit_range_state || {};

  return (
    <div style={{position:"relative"}}>
      {/* Trigger button */}
      <button onClick={()=>setOpen(o=>!o)}
        title="Set profit target range"
        style={{
          padding:"7px 10px",borderRadius:8,border:"none",cursor:"pointer",
          fontWeight:700,fontSize:11,transition:"all 0.2s",
          background: active
            ? `linear-gradient(135deg,${cfg.color}99,${cfg.color})`
            : "linear-gradient(135deg,#1e3a5f,#3b82f6)",
          color:"#fff",
          boxShadow: active?`0 0 10px ${cfg.color}55`:"none",
          minWidth:80,
        }}>
        {active
          ? `🎯 ${bot.profit_range_target}% ${selMode==="per_trade"?"📍":"📊"}`
          : "🎯 Target"}
      </button>

      {/* Dropdown panel */}
      {open && (
        <div style={{
          position:"absolute",zIndex:999,top:"calc(100% + 6px)",
          right:0,width:320,
          background:"linear-gradient(135deg,#0f172a,#1e293b)",
          border:"1px solid #334155",borderRadius:14,padding:16,
          boxShadow:"0 20px 60px rgba(0,0,0,0.8)",
        }}>
          {/* Mode toggle */}
          <div style={{marginBottom:12}}>
            <div style={{color:"#94a3b8",fontSize:11,marginBottom:6,fontWeight:600}}>
              MODE
            </div>
            <div style={{display:"flex",gap:6}}>
              {["per_trade","per_session"].map(m=>(
                <button key={m} onClick={()=>setSelMode(m)}
                  style={{
                    flex:1,padding:"8px 6px",borderRadius:8,border:"none",
                    cursor:"pointer",fontWeight:700,fontSize:11,
                    background: selMode===m
                      ?"linear-gradient(135deg,#1e3a5f,#3b82f6)"
                      :"#1e293b",
                    color: selMode===m?"#7dd3fc":"#475569",
                    border:`1px solid ${selMode===m?"#3b82f6":"#334155"}`,
                  }}>
                  {m==="per_trade"?"📍 Per Trade":"📊 Per Session"}
                </button>
              ))}
            </div>
            <div style={{fontSize:10,color:"#475569",marginTop:6,lineHeight:1.6}}>
              {selMode==="per_trade"
                ?"Each single trade targets the % | Bot pauses after hitting target"
                :"Accumulate across trades in a session | Resets every Asia→London→NY"}
            </div>
          </div>

          {/* Target buttons grid */}
          <div style={{color:"#94a3b8",fontSize:11,marginBottom:8,fontWeight:600}}>
            SELECT TARGET %
          </div>
          <div style={{display:"grid",gridTemplateColumns:"repeat(5,1fr)",gap:5,marginBottom:14}}>
            {PROFIT_OPTIONS.map(t=>{
              const c = TARGET_CFG[t]||TARGET_CFG[2];
              const sel = selTgt===t;
              return (
                <button key={t} onClick={()=>setSelTgt(t)}
                  style={{
                    padding:"9px 4px",borderRadius:8,border:"none",cursor:"pointer",
                    fontWeight:800,fontSize:13,transition:"all 0.15s",
                    background: sel?`linear-gradient(135deg,${c.color}bb,${c.color})`:"#0f172a",
                    color: sel?"#fff":c.color,
                    border:`1.5px solid ${sel?c.color:c.color+"44"}`,
                    boxShadow: sel?`0 0 10px ${c.color}66`:"none",
                    transform: sel?"scale(1.08)":"scale(1)",
                  }}>
                  {t}%
                </button>
              );
            })}
          </div>

          {/* Selected config preview */}
          {(() => {
            const c = TARGET_CFG[selTgt]||TARGET_CFG[2];
            return (
              <div style={{
                padding:"10px 12px",borderRadius:10,marginBottom:12,
                background:`${c.color}11`,border:`1px solid ${c.color}33`,
              }}>
                <div style={{display:"flex",justifyContent:"space-between",
                              alignItems:"center",marginBottom:8}}>
                  <span style={{color:c.color,fontWeight:800,fontSize:16}}>
                    {selTgt}% Target
                  </span>
                  <span style={{
                    fontSize:10,padding:"2px 8px",borderRadius:12,
                    background:c.color+"22",color:c.color,fontWeight:700,
                  }}>{c.badge}</span>
                </div>
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",
                              gap:6,fontSize:10}}>
                  {[
                    {l:"Risk/Trade", v:c.risk, ic:"🛡"},
                    {l:"Min Conf",   v:c.conf, ic:"🧠"},
                    {l:"Min RR",     v:c.rr,   ic:"📐"},
                  ].map(({l,v,ic})=>(
                    <div key={l} style={{textAlign:"center",padding:"6px 4px",
                                          background:"#0f172a",borderRadius:6}}>
                      <div style={{fontSize:14}}>{ic}</div>
                      <div style={{color:"#e2e8f0",fontWeight:700,fontSize:12}}>{v}</div>
                      <div style={{color:"#475569",fontSize:9}}>{l}</div>
                    </div>
                  ))}
                </div>
                <div style={{marginTop:8,fontSize:10,color:"#64748b"}}>
                  {selMode==="per_session"
                    ?`Estimated trades to hit ${selTgt}%: ~${Math.ceil(selTgt/0.3)}`
                    :`Single trade must reach ${selTgt}% | Strategy auto-adapts`}
                </div>
              </div>
            );
          })()}

          <div style={{display:"flex",gap:8}}>
            <button onClick={()=>setOpen(false)}
              style={{flex:1,padding:"9px",borderRadius:8,border:"1px solid #334155",
                       background:"transparent",color:"#64748b",cursor:"pointer",fontSize:12}}>
              Cancel
            </button>
            <button onClick={apply} disabled={loading}
              style={{
                flex:2,padding:"9px",borderRadius:8,border:"none",cursor:"pointer",
                fontWeight:700,fontSize:13,
                background:`linear-gradient(135deg,${(TARGET_CFG[selTgt]||TARGET_CFG[2]).color}cc,
                            ${(TARGET_CFG[selTgt]||TARGET_CFG[2]).color})`,
                color:"#fff",
                boxShadow:`0 4px 15px ${(TARGET_CFG[selTgt]||TARGET_CFG[2]).color}55`,
              }}>
              {loading?"Applying...":"✅ Apply Target"}
            </button>
          </div>
        </div>
      )}

      {/* Live progress if active */}
      {active && curState.session_pnl_pct !== undefined && !open && (
        <div style={{marginTop:6,padding:"6px 8px",background:"#0f172a",
                     borderRadius:7,border:`1px solid ${cfg.color}22`}}>
          <div style={{display:"flex",justifyContent:"space-between",
                       fontSize:10,color:"#64748b",marginBottom:3}}>
            <span>{selMode==="per_trade"?"📍":"📊"}
              {" "}{curState.session_pnl_pct?.toFixed(2)}% / {bot.profit_range_target}%
            </span>
            <span style={{color:cfg.color}}>{(curState.progress_pct||0).toFixed(0)}%</span>
          </div>
          <div style={{height:4,background:"#1e293b",borderRadius:2,overflow:"hidden"}}>
            <div style={{
              height:"100%",borderRadius:2,transition:"width 0.6s ease",
              width:`${Math.min(100,curState.progress_pct||0)}%`,
              background:`linear-gradient(90deg,${cfg.color}99,${cfg.color})`,
            }}/>
          </div>
          {curState.target_hit && (
            <div style={{color:"#22c55e",fontSize:10,marginTop:3,fontWeight:700}}>
              ✅ Target hit! ({curState.trades_done} trades)
            </div>
          )}
          {curState.paused && (
            <div style={{color:"#f59e0b",fontSize:10,marginTop:3}}>
              ⏸ {curState.pause_reason}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/* ─── 2% Progress bar (preserved) ───────────────────────────── */
function TwoPctBar({state}) {
  if(!state?.enabled) return null;
  const pct = Math.min(100, state.progress_pct||0);
  const col = state.target_hit?"#22c55e":pct>70?"#f59e0b":"#6366f1";
  return (
    <div style={{marginTop:8,padding:"8px 10px",background:"#0f172a",
                 borderRadius:8,border:`1px solid ${col}22`}}>
      <div style={{display:"flex",justifyContent:"space-between",
                   fontSize:11,color:"#94a3b8",marginBottom:4}}>
        <span>🎯 2% Pro Mode</span>
        <span style={{color:col,fontWeight:700}}>
          {state.session_pnl_pct?.toFixed(2)}% / 2%
        </span>
      </div>
      <div style={{height:5,background:"#1e293b",borderRadius:3,overflow:"hidden"}}>
        <div style={{height:"100%",width:`${pct}%`,borderRadius:3,
                     background:`linear-gradient(90deg,${col},${col}cc)`,
                     transition:"width 0.5s ease"}}/>
      </div>
      <div style={{display:"flex",justifyContent:"space-between",
                   fontSize:10,color:"#475569",marginTop:4}}>
        <span>Trades:{state.trades_used}/{20} | Risk:0.4%</span>
        <span>{state.target_hit?"✅ Hit!":state.paused_for_losses?"⏸ Pause":`${state.remaining_pct?.toFixed(2)}% left`}</span>
      </div>
      {state.consecutive_wins>0&&(
        <div style={{fontSize:10,color:"#22c55e",marginTop:2}}>
          🔥 {state.consecutive_wins} wins → {state.current_scale}× size
        </div>
      )}
    </div>
  );
}

/* ─── Bot Card ───────────────────────────────────────────────── */
function BotCard({bot,onStart,onStop,onToggle2pct,onSetRange,onUpgradeAI}) {
  const [expanded,  setExpanded]  = useState(false);
  const [l2pct,     setL2pct]     = useState(false);
  const isProMax = bot.bot_id === "promax_scalping" || bot.ribbon === "red";
  const isRun    = bot.status === "running";
  const isPaused = bot.status === "paused";
  const cat      = CAT_META[bot.category] || CAT_META.hybrid;
  const winRate  = bot.total_trades > 0
    ? Math.round(bot.win_trades/bot.total_trades*100) : 0;
  const two_pct  = bot.two_pct_mode;
  const state2   = bot.two_pct_state || {};
  const aiColors = {silver:"#94a3b8",gold:"#f59e0b",platinum:"#e2e8f0"};

  return (
    <div style={{
      position:"relative",
      background: isProMax
        ?"linear-gradient(135deg,#1a0505 0%,#0f172a 60%,#1a0505 100%)"
        :"linear-gradient(135deg,#1e293b 0%,#0f172a 100%)",
      border:`1px solid ${isRun?(isProMax?"#ef4444":cat.color)+"55":"#1e293b"}`,
      borderRadius:16,padding:16,
      boxShadow: isRun
        ?(isProMax?"0 0 30px #ef444433,0 0 1px #ef4444":`0 0 20px ${cat.color}18`)
        :"none",
      transition:"all 0.25s ease",
      overflow:"hidden",
    }}>

      {/* ── Red Ribbon (ProMax) ──────────────────────────────── */}
      {isProMax && (
        <>
          {/* Corner ribbon */}
          <div style={{
            position:"absolute",top:-1,right:-1,width:0,height:0,
            borderTop:"60px solid #ef4444",
            borderLeft:"60px solid transparent",
            zIndex:10,
          }}/>
          <div style={{
            position:"absolute",top:8,right:-2,
            color:"#fff",fontSize:8,fontWeight:900,
            transform:"rotate(45deg)",
            textShadow:"0 1px 2px rgba(0,0,0,0.8)",
            zIndex:11,letterSpacing:"0.5px",
          }}>PRO<br/>MAX</div>
          {/* Top banner */}
          <div style={{
            position:"absolute",top:0,left:0,right:0,height:3,
            background:"linear-gradient(90deg,#ef4444,#fca5a5,#ef4444)",
            borderRadius:"16px 16px 0 0",
          }}/>
        </>
      )}

      {/* ── Status dot ──────────────────────────────────────── */}
      <div style={{
        position:"absolute",top:14,left:14,width:8,height:8,
        borderRadius:"50%",
        background: isRun?(isProMax?"#ef4444":"#22c55e"):isPaused?"#f59e0b":"#334155",
        boxShadow: isRun
          ?(isProMax?"0 0 8px #ef4444":"0 0 6px #22c55e"):"none",
      }}/>

      {/* ── Header ──────────────────────────────────────────── */}
      <div style={{display:"flex",gap:10,marginBottom:12,paddingLeft:20}}>
        <span style={{fontSize:30,lineHeight:1}}>{bot.icon||cat.icon}</span>
        <div style={{flex:1}}>
          <div style={{display:"flex",flexWrap:"wrap",alignItems:"center",gap:6}}>
            <span style={{
              color: isProMax?"#fca5a5":"#f8fafc",
              fontWeight:800,fontSize:15,
            }}>{bot.name}</span>

            {/* Category badge */}
            <span style={{fontSize:10,padding:"2px 7px",borderRadius:12,
                           background:cat.color+"22",color:cat.color,fontWeight:600}}>
              {bot.badge||cat.label}
            </span>

            {/* ProMax badge */}
            {isProMax && (
              <span style={{
                fontSize:10,padding:"2px 8px",borderRadius:12,fontWeight:800,
                background:"linear-gradient(90deg,#7f1d1d,#ef4444)",
                color:"#fff",letterSpacing:"0.5px",
                boxShadow:"0 2px 8px #ef444455",
              }}>🔴 PRO MAX</span>
            )}

            {/* AI tier */}
            <span style={{fontSize:10,padding:"2px 7px",borderRadius:12,
                           background:(aiColors[bot.ai_tier]||"#94a3b8")+"22",
                           color:aiColors[bot.ai_tier]||"#94a3b8"}}>
              {bot.ai_tier==="platinum"?"💎":bot.ai_tier==="gold"?"🥇":"🥈"}{" "}
              {bot.ai_tier||"silver"}
            </span>
          </div>
          <div style={{color:"#64748b",fontSize:11,marginTop:2,lineHeight:1.4}}>
            {bot.description||cat.label}
          </div>
        </div>
      </div>

      {/* ── Stats ───────────────────────────────────────────── */}
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr 1fr",
                   gap:5,marginBottom:10}}>
        {[
          {l:"Balance", v:`$${(bot.allocated_capital||0).toLocaleString(undefined,{maximumFractionDigits:0})}`, c:"#94a3b8"},
          {l:"Day PnL",  v:`${(bot.daily_pnl_pct||0)>0?"+":""}${(bot.daily_pnl_pct||0).toFixed(2)}%`,
                          c:(bot.daily_pnl_pct||0)>=0?"#22c55e":"#ef4444"},
          {l:"Win",      v:`${winRate}%`, c:winRate>=60?"#22c55e":winRate>=40?"#f59e0b":"#ef4444"},
          {l:"Trades",   v:bot.total_trades||0, c:"#94a3b8"},
        ].map(({l,v,c})=>(
          <div key={l} style={{textAlign:"center",padding:"7px 4px",
                                background:"#0f172a",borderRadius:8}}>
            <div style={{color:c,fontWeight:800,fontSize:14}}>{v}</div>
            <div style={{color:"#334155",fontSize:9,marginTop:1}}>{l}</div>
          </div>
        ))}
      </div>

      {/* ── ProMax sequence tracker ──────────────────────────── */}
      {isProMax && <ProMaxSequence bot={bot}/>}

      {/* ── 2% mode bar ─────────────────────────────────────── */}
      {two_pct && <TwoPctBar state={state2}/>}

      {/* ── Pairs ───────────────────────────────────────────── */}
      <div style={{display:"flex",gap:4,flexWrap:"wrap",margin:"10px 0"}}>
        {(bot.pairs_default||[]).slice(0,5).map(p=>(
          <span key={p} style={{fontSize:10,padding:"2px 6px",borderRadius:4,
                                  background:"#1e293b",color:"#64748b",
                                  border:"1px solid #334155"}}>{p}</span>
        ))}
        {(bot.pairs_default||[]).length>5&&(
          <span style={{fontSize:10,color:"#334155"}}>
            +{(bot.pairs_default||[]).length-5}
          </span>
        )}
      </div>

      {/* ── Buttons row ─────────────────────────────────────── */}
      <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
        {/* Start/Stop */}
        <button onClick={()=>isRun?onStop(bot.id):onStart(bot.id)}
          style={{
            flex:"1 1 80px",padding:"9px 6px",borderRadius:9,border:"none",
            cursor:"pointer",fontWeight:800,fontSize:12,transition:"all 0.2s",
            background: isRun
              ?(isProMax?"linear-gradient(135deg,#7f1d1d,#dc2626)"
                        :"linear-gradient(135deg,#7f1d1d,#ef4444)")
              :isProMax
                ?"linear-gradient(135deg,#450a0a,#ef4444)"
                :`linear-gradient(135deg,${cat.color}cc,${cat.color})`,
            color:"#fff",
            boxShadow: isRun?(isProMax?"0 0 12px #ef444466":"none")
                           :(isProMax?"0 0 12px #ef444444":"none"),
          }}>
          {isRun?"⏹ Stop":isPaused?"▶ Resume":"▶ Start"}
        </button>

        {/* 2% Pro Mode button (preserved) */}
        {(bot.category==="crypto_scalp"||bot.category==="forex_hybrid"||bot.category==="forex") && (
          <button onClick={async()=>{setL2pct(true);await onToggle2pct(bot.id,!two_pct);setL2pct(false);}}
            disabled={l2pct}
            title={two_pct?"Disable 2% Pro Mode":"Enable 2% Pro Mode: 2% target, 0.4% max risk"}
            style={{
              padding:"9px 10px",borderRadius:9,border:"none",
              cursor:l2pct?"wait":"pointer",fontWeight:700,fontSize:11,
              background: two_pct
                ?"linear-gradient(135deg,#052e16,#22c55e)"
                :"linear-gradient(135deg,#1e3a5f,#3b82f6)",
              color:"#fff",
              boxShadow: two_pct?"0 0 12px #22c55e44":"none",
            }}>
            {l2pct?"...":two_pct?"🎯 2% ON":"🎯 2%"}
          </button>
        )}

        {/* Profit Range Selector */}
        <ProfitRangeSelector bot={bot} onSetRange={onSetRange}/>

        {/* AI Upgrade */}
        {bot.ai_tier!=="platinum"&&(
          <button onClick={()=>onUpgradeAI(bot.id,bot.ai_tier==="silver"?"gold":"platinum")}
            title="Upgrade AI tier"
            style={{padding:"9px 10px",borderRadius:9,border:"1px solid #334155",
                     cursor:"pointer",background:"transparent",
                     color:"#f59e0b",fontWeight:600,fontSize:11}}>
            ⬆ AI
          </button>
        )}

        {/* Expand */}
        <button onClick={()=>setExpanded(e=>!e)}
          style={{padding:"9px 10px",borderRadius:9,border:"1px solid #1e293b",
                   cursor:"pointer",background:"transparent",
                   color:"#334155",fontSize:12}}>
          {expanded?"▲":"▼"}
        </button>
      </div>

      {/* ── 2% active info ──────────────────────────────────── */}
      {two_pct&&!state2.target_hit&&(
        <div style={{marginTop:8,padding:"8px 10px",background:"#0d2137",
                     borderRadius:8,border:"1px solid #3b82f622",fontSize:11}}>
          <div style={{color:"#7dd3fc",fontWeight:600,marginBottom:3}}>🎯 2% Pro Active</div>
          <div style={{color:"#94a3b8",lineHeight:1.6}}>
            Risk cap: <b style={{color:"#f59e0b"}}>0.4%</b> | Conf: <b style={{color:"#22c55e"}}>≥72%</b> | RR: <b style={{color:"#6366f1"}}>≥1.5</b>
            {state2.consecutive_wins>0&&<><br/>🔥 {state2.consecutive_wins} wins → {state2.current_scale}× size</>}
          </div>
        </div>
      )}

      {/* ── Expanded details ─────────────────────────────────── */}
      {expanded&&(
        <div style={{marginTop:10,padding:"12px",background:"#0f172a",
                     borderRadius:10,fontSize:11,color:"#94a3b8",lineHeight:1.7}}>
          <div style={{color:"#e2e8f0",fontWeight:700,marginBottom:8,fontSize:12}}>
            ⚙ Strategy Details
          </div>
          <b style={{color:"#475569"}}>Strategy:</b> {bot.strategy_primary||"—"}<br/>
          <b style={{color:"#475569"}}>Secondary:</b> {bot.strategy_secondary||"—"}<br/>
          <b style={{color:"#475569"}}>Timeframes:</b> {(bot.timeframes||[]).join(", ")}<br/>
          <b style={{color:"#475569"}}>Max Risk:</b> {bot.risk_profile?.max_risk_pct||2}%<br/>
          <b style={{color:"#475569"}}>Max Open:</b> {bot.risk_profile?.max_open||4} positions<br/>
          <b style={{color:"#475569"}}>Min Conf:</b> {bot.risk_profile?.min_confidence||65}%<br/>
          <b style={{color:"#475569"}}>Special:</b> {bot.special_feature||"—"}<br/>
          {isProMax&&(
            <div style={{marginTop:8,padding:8,background:"#1a0505",borderRadius:7,
                          border:"1px solid #ef444422",color:"#fca5a5"}}>
              <b>🔴 ProMax Sequence:</b> T1=×1 USDT → T2=×5 USDT → T3=×3 USDT → T4=×4 USDT
              <br/>Full cycle = 13 USDT total profit per 4-trade sequence.
              <br/>Reset sequence on any loss to protect capital.
            </div>
          )}
          {bot.headway_style&&<div style={{color:"#22c55e"}}>✅ Headway daily target</div>}
          {bot.royaliq_style&&<div style={{color:"#a855f7"}}>✅ RoyalIQ compound</div>}
          {bot.capital_growth&&<div style={{color:"#f97316"}}>🚀 Capital growth mode</div>}
          {bot.mt5_required&&<div style={{color:"#06b6d4"}}>🔗 MT5 broker required</div>}
        </div>
      )}
    </div>
  );
}

/* ─── Payment Modal ──────────────────────────────────────────── */
function PaymentModal({onClose,onCheckout}) {
  const plans = [
    {id:"starter",  name:"Starter",  price:"$29/mo", bots:5,  ai:"Silver", color:"#22c55e",  desc:"5 bots, Silver AI, basic targets"},
    {id:"pro",      name:"Pro",      price:"$79/mo", bots:15, ai:"Gold",   color:"#f59e0b",  desc:"15 bots, Gold AI, all targets"},
    {id:"elite",    name:"Elite",    price:"$149/mo",bots:39, ai:"Platinum",color:"#a855f7", desc:"All 39 bots, Platinum AI, ProMax"},
    {id:"lifetime", name:"Lifetime", price:"$499",   bots:39, ai:"Platinum",color:"#ef4444", desc:"One-time, all features forever"},
  ];
  return (
    <div style={{
      position:"fixed",inset:0,background:"rgba(2,8,23,0.95)",
      zIndex:9999,display:"flex",alignItems:"center",justifyContent:"center",
      backdropFilter:"blur(10px)",
    }}>
      <div style={{
        width:"min(540px,95vw)",background:"linear-gradient(135deg,#0f172a,#1e293b)",
        borderRadius:20,padding:28,border:"1px solid #334155",
        boxShadow:"0 40px 100px rgba(0,0,0,0.8)",
      }}>
        <div style={{display:"flex",justifyContent:"space-between",
                     alignItems:"center",marginBottom:20}}>
          <div>
            <div style={{fontWeight:800,fontSize:20,color:"#f8fafc"}}>
              ⚡ Upgrade ESTRADE v7
            </div>
            <div style={{color:"#64748b",fontSize:12,marginTop:2}}>
              Vercel-hosted · Stripe secured · Cancel anytime
            </div>
          </div>
          <button onClick={onClose} style={{background:"none",border:"none",
            color:"#64748b",cursor:"pointer",fontSize:22}}>✕</button>
        </div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
          {plans.map(p=>(
            <button key={p.id} onClick={()=>onCheckout(p.id)}
              style={{
                padding:"16px 14px",borderRadius:14,border:`1.5px solid ${p.color}44`,
                cursor:"pointer",textAlign:"left",transition:"all 0.2s",
                background: p.id==="elite"
                  ?`linear-gradient(135deg,${p.color}22,${p.color}11)`
                  :"#0f172a",
              }}
              onMouseEnter={e=>e.currentTarget.style.borderColor=p.color}
              onMouseLeave={e=>e.currentTarget.style.borderColor=p.color+"44"}
            >
              <div style={{fontWeight:800,fontSize:18,color:p.color}}>{p.price}</div>
              <div style={{fontWeight:700,color:"#e2e8f0",fontSize:13,marginTop:2}}>{p.name}</div>
              <div style={{color:"#64748b",fontSize:11,marginTop:4,lineHeight:1.5}}>{p.desc}</div>
              <div style={{marginTop:8,display:"flex",gap:6,flexWrap:"wrap"}}>
                <span style={{fontSize:10,padding:"2px 7px",borderRadius:6,
                               background:p.color+"22",color:p.color}}>
                  {p.bots} bots
                </span>
                <span style={{fontSize:10,padding:"2px 7px",borderRadius:6,
                               background:"#1e293b",color:"#94a3b8"}}>
                  {p.ai} AI
                </span>
              </div>
            </button>
          ))}
        </div>
        <div style={{marginTop:16,textAlign:"center",color:"#334155",fontSize:11}}>
          🔒 Secured by Stripe · Deployed on Vercel · 7-day free trial
        </div>
      </div>
    </div>
  );
}

/* ─── Portfolio Stats ────────────────────────────────────────── */
function PortfolioBar({portfolio,bots,session,onMaintenance}) {
  const running  = bots.filter(b=>b.status==="running").length;
  const in2pct   = bots.filter(b=>b.two_pct_mode).length;
  const inRange  = bots.filter(b=>b.profit_range_target>0).length;
  const promax   = bots.find(b=>b.bot_id==="promax_scalping");
  const ses      = SESSIONS[session]||SESSIONS.new_york;

  return (
    <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(130px,1fr))",
                 gap:8,marginBottom:20}}>
      {[
        {l:"Balance",      v:`$${(portfolio.balance||0).toLocaleString(undefined,{maximumFractionDigits:0})}`, c:"#e2e8f0", i:"💼"},
        {l:"Today",        v:`${(portfolio.pnl_pct||0)>=0?"+":""}${(portfolio.pnl_pct||0).toFixed(2)}%`,
                            c:(portfolio.pnl_pct||0)>=0?"#22c55e":"#ef4444", i:"📈"},
        {l:"Profit",       v:`$${(portfolio.total_profit||0).toLocaleString(undefined,{maximumFractionDigits:2})}`, c:"#22c55e", i:"💰"},
        {l:"Running",      v:`${running}/39`,  c:"#6366f1", i:"🤖"},
        {l:"2% Mode",      v:`${in2pct}`,      c:"#3b82f6", i:"🎯"},
        {l:"Range Mode",   v:`${inRange}`,     c:"#f59e0b", i:"🎯"},
        {l:"Session",      v:ses.label,        c:ses.color, i:ses.icon},
      ].map(({l,v,c,i})=>(
        <div key={l} style={{background:"#1e293b",borderRadius:12,
                              padding:"12px 14px",border:"1px solid #334155"}}>
          <div style={{fontSize:18,marginBottom:4}}>{i}</div>
          <div style={{color:c,fontWeight:800,fontSize:15}}>{v}</div>
          <div style={{color:"#334155",fontSize:10,marginTop:2}}>{l}</div>
        </div>
      ))}
    </div>
  );
}

/* ─── Live Trade Feed ────────────────────────────────────────── */
function TradeFeed({trades}) {
  return (
    <div style={{background:"#0f172a",borderRadius:14,padding:16,
                 border:"1px solid #1e293b",maxHeight:300,overflowY:"auto"}}>
      <div style={{color:"#475569",fontSize:12,fontWeight:600,marginBottom:10,
                   display:"flex",alignItems:"center",gap:8}}>
        <div style={{width:7,height:7,borderRadius:"50%",background:"#22c55e",
                     boxShadow:"0 0 6px #22c55e",animation:"pulse 2s infinite"}}/>
        Live Trade Feed
      </div>
      {trades.length===0&&(
        <div style={{color:"#1e293b",textAlign:"center",padding:24,fontSize:12}}>
          Waiting for trades…
        </div>
      )}
      {trades.slice(0,25).map(t=>(
        <div key={t.id} style={{
          display:"flex",justifyContent:"space-between",alignItems:"center",
          padding:"5px 0",borderBottom:"1px solid #0f172a",
        }}>
          <div style={{display:"flex",gap:7,alignItems:"center"}}>
            <span style={{
              fontSize:10,padding:"1px 6px",borderRadius:4,fontWeight:700,
              background:t.direction==="long"?"#052e1644":"#4c051966",
              color:t.direction==="long"?"#4ade80":"#f87171",
            }}>{(t.direction||"").toUpperCase()}</span>
            <span style={{color:"#e2e8f0",fontSize:12}}>{t.pair}</span>
            <span style={{color:"#334155",fontSize:9}}>{t.timeframe}</span>
            {t.asset_class==="gold"&&<span style={{fontSize:10}}>🥇</span>}
            {t.asset_class==="silver"&&<span style={{fontSize:10}}>🥈</span>}
          </div>
          <div style={{display:"flex",gap:10,alignItems:"center"}}>
            {t.latency_ms&&(
              <span style={{color:"#334155",fontSize:9}}>
                ⚡{t.latency_ms.toFixed(0)}ms
              </span>
            )}
            {t.ai_confidence&&(
              <span style={{color:"#475569",fontSize:9}}>
                {t.ai_confidence.toFixed(0)}%
              </span>
            )}
            <span style={{
              fontSize:12,fontWeight:700,
              color:t.status==="open"?"#f59e0b":t.pnl_pct>=0?"#22c55e":"#ef4444",
            }}>
              {t.status==="open"?"OPEN":`${t.pnl_pct>0?"+":""}${(t.pnl_pct||0).toFixed(2)}%`}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}

/* ─── Main Dashboard ─────────────────────────────────────────── */
export default function Dashboard() {
  const {bots,trades,portfolio,security,maint,loading,
         startBot,stopBot,toggle2pct,setRange,upgradeAI,checkout,refresh} = useDashboard();

  const [tab,     setTab]     = useState("all");
  const [plat,    setPlat]    = useState(PLATFORM==="both"?"both":PLATFORM);
  const [search,  setSearch]  = useState("");
  const [sort,    setSort]    = useState("status");
  const [showSec, setShowSec] = useState(false);
  const [showPay, setShowPay] = useState(false);
  const [session, setSession] = useState("new_york");

  // Detect current session
  useEffect(()=>{
    const h = new Date().getUTCHours();
    if(h<8) setSession("asia");
    else if(h<16) setSession("london");
    else if(h<21) setSession("new_york");
    else setSession("overnight");
  },[]);

  // Filter & sort
  const filtered = bots.filter(b=>{
    const matchTab  = tab==="all"||b.category===tab||(tab==="promax"&&b.ribbon==="red");
    const matchPlat = plat==="both"||b.platform===plat||b.platform==="both";
    const q = search.toLowerCase();
    const matchQ = !q||b.name?.toLowerCase().includes(q)||
                   b.category?.toLowerCase().includes(q)||
                   (b.pairs_default||[]).some(p=>p.toLowerCase().includes(q));
    return matchTab&&matchPlat&&matchQ;
  }).sort((a,b)=>{
    if(sort==="status")  return a.status==="running"?-1:1;
    if(sort==="pnl")     return (b.daily_pnl_pct||0)-(a.daily_pnl_pct||0);
    if(sort==="name")    return a.name?.localeCompare(b.name);
    return 0;
  });

  const cats = ["all","promax",...Object.keys(CAT_META)];
  const secOK = security?.status==="SECURE";

  if(loading) return (
    <div style={{minHeight:"100vh",display:"flex",alignItems:"center",
                 justifyContent:"center",background:"#020817"}}>
      <div style={{textAlign:"center",color:"#6366f1"}}>
        <div style={{fontSize:40,marginBottom:12}}>⚡</div>
        <div style={{fontSize:16,fontWeight:700}}>ESTRADE v7 ULTRA</div>
        <div style={{color:"#334155",fontSize:12,marginTop:4}}>
          Loading 39 bots…
        </div>
      </div>
    </div>
  );

  return (
    <div style={{
      minHeight:"100vh",
      background:"linear-gradient(180deg,#020817 0%,#030f1e 100%)",
      color:"#e2e8f0",fontFamily:"Inter,system-ui,sans-serif",
    }}>

      {/* ── Maintenance Banner ──────────────────────────────── */}
      {maint?.global_maintenance&&(
        <div style={{
          background:"linear-gradient(90deg,#78350f,#f59e0b,#78350f)",
          padding:"10px 24px",textAlign:"center",
          fontSize:13,fontWeight:700,color:"#fff",letterSpacing:"0.3px",
        }}>
          🔧 ESTRADE is under scheduled maintenance — Bots auto-resume when complete.
          {" "}{maint.maintenance_message||""}
        </div>
      )}

      {/* ── Header ──────────────────────────────────────────── */}
      <header style={{
        background:"rgba(2,8,23,0.95)",backdropFilter:"blur(20px)",
        borderBottom:"1px solid #0f172a",padding:"0 24px",
        position:"sticky",top:0,zIndex:100,
      }}>
        <div style={{maxWidth:1700,margin:"0 auto",height:62,
                     display:"flex",alignItems:"center",justifyContent:"space-between",gap:12}}>
          {/* Logo */}
          <div style={{display:"flex",alignItems:"center",gap:12}}>
            <div style={{
              width:38,height:38,borderRadius:11,
              background:"linear-gradient(135deg,#6366f1,#a855f7)",
              display:"flex",alignItems:"center",justifyContent:"center",
              fontSize:20,boxShadow:"0 0 20px #6366f144",
            }}>⚡</div>
            <div>
              <div style={{fontWeight:900,fontSize:19,letterSpacing:"-0.5px"}}>
                ESTRADE <span style={{color:"#6366f1"}}>v7</span>
                <span style={{
                  fontSize:10,marginLeft:8,padding:"2px 7px",borderRadius:10,
                  background:"#ef444422",color:"#ef4444",fontWeight:700,
                  verticalAlign:"middle",
                }}>ULTRA</span>
              </div>
              <div style={{fontSize:10,color:"#334155",marginTop:1}}>
                {plat==="esf"?"Forex + Gold":plat==="esc"?"Crypto + Gold":"Forex · Crypto · Gold · Silver"}
                {" "}· 39 Bots
              </div>
            </div>
          </div>

          {/* Platform switcher */}
          {PLATFORM==="both"&&(
            <div style={{display:"flex",gap:3,background:"#0f172a",borderRadius:9,padding:3}}>
              {[["both","🌐 All"],["esf","📈 ESF"],["esc","₿ ESC"]].map(([v,l])=>(
                <button key={v} onClick={()=>setPlat(v)}
                  style={{
                    padding:"5px 13px",borderRadius:6,border:"none",cursor:"pointer",
                    fontSize:12,fontWeight:600,transition:"all 0.15s",
                    background: plat===v
                      ?(v==="esf"?"#052e16":v==="esc"?"#1e1b4b":"#1e293b")
                      :"transparent",
                    color: plat===v
                      ?(v==="esf"?"#22c55e":v==="esc"?"#818cf8":"#e2e8f0")
                      :"#334155",
                  }}>{l}</button>
              ))}
            </div>
          )}

          {/* Right */}
          <div style={{display:"flex",alignItems:"center",gap:8}}>
            {/* Session indicator */}
            <div style={{
              display:"flex",alignItems:"center",gap:6,padding:"5px 10px",
              borderRadius:8,background:"#0f172a",border:"1px solid #1e293b",
              fontSize:11,
            }}>
              <span>{SESSIONS[session]?.icon}</span>
              <span style={{color:SESSIONS[session]?.color,fontWeight:600}}>
                {SESSIONS[session]?.label}
              </span>
            </div>
            {/* Security */}
            <button onClick={()=>setShowSec(s=>!s)}
              style={{
                display:"flex",alignItems:"center",gap:6,
                padding:"5px 12px",borderRadius:8,border:"none",cursor:"pointer",
                background: secOK?"#052e1666":"#4c051966",
                color: secOK?"#22c55e":"#ef4444",fontWeight:700,fontSize:11,
              }}>
              <span style={{width:6,height:6,borderRadius:"50%",
                             background:secOK?"#22c55e":"#ef4444",
                             boxShadow:`0 0 6px ${secOK?"#22c55e":"#ef4444"}`,
                             display:"inline-block"}}/>
              🛡 {security?.status||"…"}
            </button>
            {/* Payment */}
            <button onClick={()=>setShowPay(true)}
              style={{
                padding:"7px 16px",borderRadius:8,border:"none",cursor:"pointer",
                fontWeight:700,fontSize:12,
                background:"linear-gradient(135deg,#4f46e5,#7c3aed)",
                color:"#fff",boxShadow:"0 4px 14px #6366f144",
              }}>
              💳 Upgrade
            </button>
            <button onClick={refresh}
              style={{padding:"7px 12px",borderRadius:8,border:"1px solid #1e293b",
                       background:"transparent",color:"#334155",cursor:"pointer",fontSize:12}}>
              🔄
            </button>
          </div>
        </div>
      </header>

      <main style={{maxWidth:1700,margin:"0 auto",padding:"24px 24px 60px"}}>

        {/* Portfolio */}
        <PortfolioBar portfolio={portfolio} bots={bots}
                      session={session} onMaintenance={()=>{}}/>

        {/* ProMax highlight banner */}
        {bots.some(b=>b.ribbon==="red"||b.bot_id==="promax_scalping")&&(
          <div style={{
            marginBottom:20,padding:"12px 18px",borderRadius:12,
            background:"linear-gradient(135deg,#1a0505,#0f172a,#1a0505)",
            border:"1px solid #ef444433",
            display:"flex",alignItems:"center",gap:14,
          }}>
            <span style={{fontSize:28}}>🔴</span>
            <div>
              <div style={{color:"#fca5a5",fontWeight:800,fontSize:14,letterSpacing:"0.3px"}}>
                PRO MAX AI Scalping — 1 USDT/Trade Sequence
              </div>
              <div style={{color:"#64748b",fontSize:11,marginTop:3}}>
                Cycle: <b style={{color:"#ef4444"}}>T1 ×1 USDT</b> →{" "}
                <b style={{color:"#ef4444"}}>T2 ×5 USDT</b> →{" "}
                <b style={{color:"#ef4444"}}>T3 ×3 USDT</b> →{" "}
                <b style={{color:"#ef4444"}}>T4 ×4 USDT</b> = 13 USDT/cycle |{" "}
                Risk capped 0.25%/trade | Confidence ≥85% | RR ≥2.5
              </div>
            </div>
          </div>
        )}

        {/* Security Panel */}
        {showSec&&(
          <div style={{marginBottom:24,padding:20,borderRadius:16,
                       background:"#0f172a",border:"1px solid #1e293b"}}>
            <div style={{display:"flex",justifyContent:"space-between",
                         alignItems:"center",marginBottom:14}}>
              <div style={{fontWeight:700,fontSize:15,color:"#e2e8f0"}}>
                🛡 AI Security Auditor
              </div>
              <button onClick={()=>setShowSec(false)}
                style={{background:"none",border:"none",color:"#475569",
                         cursor:"pointer",fontSize:18}}>✕</button>
            </div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
              <div style={{background:"#1e293b",borderRadius:10,padding:14}}>
                <div style={{color:"#64748b",fontSize:11,marginBottom:6}}>Status</div>
                <div style={{color:secOK?"#22c55e":"#ef4444",fontWeight:800,fontSize:20}}>
                  {security?.status||"—"}
                </div>
                <div style={{color:"#334155",fontSize:10,marginTop:4}}>
                  Audit: {security?.last_full_audit
                    ?new Date(security.last_full_audit).toLocaleString():"—"}
                </div>
              </div>
              <div style={{background:"#1e293b",borderRadius:10,padding:14}}>
                <div style={{color:"#64748b",fontSize:11,marginBottom:6}}>24h Findings</div>
                <div style={{display:"flex",gap:10}}>
                  {Object.entries(security?.by_severity||{}).map(([s,c])=>(
                    <div key={s} style={{textAlign:"center"}}>
                      <div style={{fontWeight:800,color:
                        s==="CRITICAL"?"#ef4444":s==="HIGH"?"#f97316":
                        s==="MEDIUM"?"#f59e0b":"#22c55e"}}>{c}</div>
                      <div style={{fontSize:9,color:"#334155"}}>{s}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            {(security?.recent_findings||[]).slice(0,3).map(f=>(
              <div key={f.id} style={{marginTop:8,padding:10,borderRadius:8,
                                       background:"#1e293b",fontSize:11,
                                       borderLeft:`3px solid ${
                                         f.severity==="CRITICAL"?"#ef4444":
                                         f.severity==="HIGH"?"#f97316":"#f59e0b"}`}}>
                <div style={{color:"#e2e8f0",fontWeight:600}}>{f.title}</div>
                <div style={{color:"#475569",marginTop:2}}>{(f.description||"").slice(0,120)}</div>
                <div style={{color:f.auto_fixed?"#22c55e":"#f59e0b",marginTop:2}}>
                  {f.auto_fixed?"✅ Auto-fixed":"⚠ Action needed"}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Filters */}
        <div style={{display:"flex",gap:10,marginBottom:16,flexWrap:"wrap"}}>
          <input placeholder="🔍 Search bots, pairs…" value={search}
            onChange={e=>setSearch(e.target.value)}
            style={{
              flex:1,minWidth:200,padding:"9px 14px",
              background:"#1e293b",border:"1px solid #334155",
              borderRadius:9,color:"#e2e8f0",fontSize:13,outline:"none",
            }}/>
          <select value={sort} onChange={e=>setSort(e.target.value)}
            style={{padding:"9px 14px",background:"#1e293b",border:"1px solid #334155",
                     borderRadius:9,color:"#64748b",fontSize:12,cursor:"pointer"}}>
            <option value="status">Sort: Status</option>
            <option value="pnl">Sort: PnL</option>
            <option value="name">Sort: Name</option>
          </select>
        </div>

        {/* Category tabs */}
        <div style={{display:"flex",gap:4,marginBottom:20,
                     overflowX:"auto",paddingBottom:4}}>
          {cats.map(c=>{
            const meta = c==="all"?null:c==="promax"?null:CAT_META[c];
            const count = c==="all"?filtered.length
              :c==="promax"?bots.filter(b=>b.ribbon==="red").length
              :bots.filter(b=>b.category===c&&(plat==="both"||b.platform===plat||b.platform==="both")).length;
            const isProMaxTab = c==="promax";
            return (
              <button key={c} onClick={()=>setTab(c)}
                style={{
                  padding:"7px 14px",borderRadius:8,border:"none",cursor:"pointer",
                  fontWeight:700,fontSize:12,whiteSpace:"nowrap",transition:"all 0.15s",
                  background: tab===c
                    ?(isProMaxTab?"#ef444422":meta?meta.color+"22":"#1e293b")
                    :"transparent",
                  color: tab===c
                    ?(isProMaxTab?"#ef4444":meta?meta.color:"#e2e8f0")
                    :"#334155",
                  borderBottom:`2px solid ${tab===c
                    ?(isProMaxTab?"#ef4444":meta?meta.color:"#6366f1")
                    :"transparent"}`,
                }}>
                {isProMaxTab?"🔴 ProMax":c==="all"?"🌐 All":`${meta?.icon||""} ${meta?.label||c}`}
                {" "}({count})
              </button>
            );
          })}
        </div>

        {/* Bot grid */}
        <div style={{display:"grid",gap:16,
                     gridTemplateColumns:"repeat(auto-fill,minmax(340px,1fr))"}}>
          {filtered.map(bot=>(
            <BotCard key={bot.id} bot={bot}
              onStart={startBot}   onStop={stopBot}
              onToggle2pct={toggle2pct}
              onSetRange={setRange}
              onUpgradeAI={upgradeAI}
            />
          ))}
          {filtered.length===0&&(
            <div style={{gridColumn:"1/-1",textAlign:"center",
                         color:"#1e293b",padding:60,fontSize:14}}>
              No bots match current filters
            </div>
          )}
        </div>

        {/* Live feed */}
        <div style={{marginTop:28}}>
          <div style={{color:"#334155",fontSize:13,fontWeight:600,
                       marginBottom:12,display:"flex",alignItems:"center",gap:8}}>
            <div style={{width:7,height:7,borderRadius:"50%",background:"#22c55e",
                         boxShadow:"0 0 6px #22c55e",animation:"pulse 2s infinite"}}/>
            Live Trade Feed
          </div>
          <TradeFeed trades={trades}/>
        </div>

        {/* Footer */}
        <div style={{marginTop:32,textAlign:"center",color:"#1e293b",fontSize:11}}>
          ESTRADE v7 ULTRA · {bots.filter(b=>b.status==="running").length} bots active ·
          Sub-10ms latency · Vercel Edge · 39 bots
        </div>
      </main>

      {/* Payment Modal */}
      {showPay&&(
        <PaymentModal onClose={()=>setShowPay(false)} onCheckout={checkout}/>
      )}

      <style>{`
        @keyframes pulse{0%,100%{opacity:1}50%{opacity:0.4}}
        *{box-sizing:border-box;margin:0;padding:0}
        body{background:#020817;color:#e2e8f0}
        ::-webkit-scrollbar{width:4px;height:4px}
        ::-webkit-scrollbar-track{background:#0f172a}
        ::-webkit-scrollbar-thumb{background:#1e293b;border-radius:2px}
        button:hover{opacity:0.92}
        input:focus{border-color:#6366f1 !important;box-shadow:0 0 0 2px #6366f122}
      `}</style>
    </div>
  );
}
