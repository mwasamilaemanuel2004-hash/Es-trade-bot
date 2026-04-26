"""
core/bot_registry.py — ESTRADE v7 Unified Bot Registry
══════════════════════════════════════════════════════════════════════════
Single source of truth for ALL 39 bots.

Platform split (single codebase, two deployments):
  ESF — ESTRADE Forex  → forex + commodities (XAU, XAG, WTI)
  ESC — ESTRADE Crypto → crypto + commodities paired with crypto

Categories:
  HYBRID (6)          — balanced, low risk + consistent profit (BOTH)
  HIGH_PROFIT (6)     — capital protection + smart entries (BOTH)
  MEDIUM (6)          — moderate risk, moderate growth (BOTH)
  CRYPTO_SCALP (6)    — AI-tiered scalping (ESC)
  FOREX (6)           — broker-integrated forex trading (ESF)
  COMMODITIES (3)     — Gold/Silver/Oil — XAU/USD, XAG/USD, WTI (BOTH)
  FOREX_HYBRID (3)    — Headway+RoyalIQ-style forex hybrid (ESF)
  CAPITAL_MAX (3)     — Capital growth/maximizer bots (BOTH)

AI Tiers:
  silver   — Basic indicators + rule-based AI
  gold     — ML signals + multi-indicator ensemble
  platinum — DL (LSTM-proxy) + full institutional AI + optimization

Bot features:
  small_profit_mode  — Collect many small profits continuously (Headway-style)
  headway_style      — Daily % target, auto-pause on target hit
  royaliq_style      — Copy-trade logic, compound reinvest
  capital_growth     — Aggressive compound growth 1x→100x target
══════════════════════════════════════════════════════════════════════════
"""
from __future__ import annotations
from typing import Literal

AiTier   = Literal["silver", "gold", "platinum"]
Category = Literal[
    "hybrid", "high_profit", "medium", "crypto_scalp",
    "forex", "commodities", "forex_hybrid", "capital_max"
]
Platform = Literal["esf", "esc", "both"]


BOT_REGISTRY: dict[str, dict] = {

    # ════════════════════════════════════════════════════════
    # 🟢 HYBRID (6) — Balanced, Low Risk + Consistent Profit [BOTH]
    # ════════════════════════════════════════════════════════

    "hybrid_alpha": {
        "id": "hybrid_alpha", "name": "Hybrid Alpha", "icon": "🌐", "color": "#22c55e",
        "category": "hybrid", "badge": "FLAGSHIP", "platform": "both",
        "ai_tier_default": "gold", "ai_tier_max": "platinum",
        "strategy_primary": "corr_hedge",
        "strategy_secondary": "trend",
        "special_feature": "Dynamic BTC/EUR correlation hedge. Fades Z>2σ divergence.",
        "pairs_default": ["BTC/USDT", "ETH/USDT", "EUR/USD", "XAU/USD"],
        "timeframes": ["1h", "4h"],
        "risk_profile": {"max_risk_pct": 2.0, "sl_atr_mult": 2.0, "tp_atr_mult": 4.5, "max_open": 4},
        "broker_required": False, "reinvest": True,
        "small_profit_mode": True, "daily_target_pct": 1.5,
        "description": "Correlation-hedge engine balancing crypto + forex + gold exposure",
    },
    "hybrid_pro": {
        "id": "hybrid_pro", "name": "Hybrid Pro", "icon": "⚡", "color": "#06b6d4",
        "category": "hybrid", "badge": "PRO", "platform": "both",
        "ai_tier_default": "gold", "ai_tier_max": "platinum",
        "strategy_primary": "ensemble_multi",
        "strategy_secondary": "mean_reversion",
        "special_feature": "3-strategy ensemble vote: trend + breakout + mean-rev. Majority wins.",
        "pairs_default": ["BTC/USDT", "ETH/USDT", "SOL/USDT"],
        "timeframes": ["15m", "1h"],
        "risk_profile": {"max_risk_pct": 2.5, "sl_atr_mult": 2.0, "tp_atr_mult": 4.0, "max_open": 5},
        "broker_required": False, "reinvest": True,
        "small_profit_mode": True, "daily_target_pct": 2.0,
        "description": "Multi-strategy ensemble with majority voting",
    },
    "smart_balance": {
        "id": "smart_balance", "name": "Smart Balance Bot", "icon": "⚖️", "color": "#a855f7",
        "category": "hybrid", "badge": "STABLE", "platform": "both",
        "ai_tier_default": "silver", "ai_tier_max": "gold",
        "strategy_primary": "portfolio_balance",
        "strategy_secondary": "trend",
        "special_feature": "Rebalances portfolio weights hourly using Sharpe ratio ranking.",
        "pairs_default": ["BTC/USDT", "ETH/USDT", "BNB/USDT", "SOL/USDT"],
        "timeframes": ["1h", "4h"],
        "risk_profile": {"max_risk_pct": 1.5, "sl_atr_mult": 2.5, "tp_atr_mult": 4.0, "max_open": 4},
        "broker_required": False, "reinvest": True,
        "small_profit_mode": True, "daily_target_pct": 1.0,
        "description": "Auto-rebalancing portfolio with Sharpe-weighted allocation",
    },
    "stable_hybrid": {
        "id": "stable_hybrid", "name": "Stable Hybrid AI", "icon": "🛡️", "color": "#10b981",
        "category": "hybrid", "badge": "SAFE", "platform": "both",
        "ai_tier_default": "silver", "ai_tier_max": "gold",
        "strategy_primary": "low_vol_trend",
        "strategy_secondary": "mean_reversion",
        "special_feature": "Only enters during low-volatility phases. ATR < 0.8× 20-day avg.",
        "pairs_default": ["BTC/USDT", "ETH/USDT"],
        "timeframes": ["4h", "1d"],
        "risk_profile": {"max_risk_pct": 1.0, "sl_atr_mult": 2.0, "tp_atr_mult": 3.5, "max_open": 3},
        "broker_required": False, "reinvest": False,
        "small_profit_mode": True, "daily_target_pct": 0.8,
        "description": "Enters only in low-vol environments for maximum stability",
    },
    "adaptive_hybrid": {
        "id": "adaptive_hybrid", "name": "Adaptive Hybrid Bot", "icon": "🔄", "color": "#f59e0b",
        "category": "hybrid", "badge": "ADAPTIVE", "platform": "both",
        "ai_tier_default": "gold", "ai_tier_max": "platinum",
        "strategy_primary": "regime_adaptive",
        "strategy_secondary": "breakout",
        "special_feature": "Auto-switches strategy based on detected market regime (trending/ranging/volatile).",
        "pairs_default": ["BTC/USDT", "ETH/USDT", "ADA/USDT", "XAU/USD"],
        "timeframes": ["1h", "4h"],
        "risk_profile": {"max_risk_pct": 2.0, "sl_atr_mult": 2.0, "tp_atr_mult": 4.0, "max_open": 4},
        "broker_required": False, "reinvest": True,
        "small_profit_mode": False, "daily_target_pct": 2.5,
        "description": "Regime-adaptive strategy switcher",
    },
    "precision_hybrid": {
        "id": "precision_hybrid", "name": "Precision Hybrid", "icon": "🎯", "color": "#6366f1",
        "category": "hybrid", "badge": "PRECISION", "platform": "both",
        "ai_tier_default": "gold", "ai_tier_max": "platinum",
        "strategy_primary": "fibonacci_confluence",
        "strategy_secondary": "trend",
        "special_feature": "Fib 38.2/61.8 confluence + pivot point alignment for ultra-precise entries.",
        "pairs_default": ["BTC/USDT", "ETH/USDT", "EUR/USD", "XAU/USD"],
        "timeframes": ["4h", "1d"],
        "risk_profile": {"max_risk_pct": 1.5, "sl_atr_mult": 1.5, "tp_atr_mult": 3.0, "max_open": 3},
        "broker_required": False, "reinvest": True,
        "small_profit_mode": False, "daily_target_pct": 1.8,
        "description": "Fibonacci + pivot confluence for high-precision entries",
    },

    # ════════════════════════════════════════════════════════
    # 🟡 HIGH PROFIT LOW RISK (6) [BOTH]
    # ════════════════════════════════════════════════════════

    "safe_profit": {
        "id": "safe_profit", "name": "Safe Profit Bot", "icon": "💰", "color": "#22c55e",
        "category": "high_profit", "badge": "SAFE", "platform": "both",
        "ai_tier_default": "silver", "ai_tier_max": "gold",
        "strategy_primary": "dca_accumulate",
        "strategy_secondary": "mean_reversion",
        "special_feature": "Smart DCA with RSI-gated entries. Max 5 layers, ATR-spaced.",
        "pairs_default": ["BTC/USDT", "ETH/USDT"],
        "timeframes": ["4h", "1d"],
        "risk_profile": {"max_risk_pct": 3.0, "sl_atr_mult": 3.0, "tp_atr_mult": 6.0, "max_open": 5},
        "broker_required": False, "reinvest": True,
        "small_profit_mode": True, "daily_target_pct": 1.5,
        "description": "Risk-minimized DCA with intelligent entry gates",
    },
    "capital_guard": {
        "id": "capital_guard", "name": "Capital Guard Bot", "icon": "🛡️", "color": "#06b6d4",
        "category": "high_profit", "badge": "GUARDIAN", "platform": "both",
        "ai_tier_default": "gold", "ai_tier_max": "platinum",
        "strategy_primary": "capital_protection",
        "strategy_secondary": "trend",
        "special_feature": "Hard capital lock: auto-stops if equity drops 5% in 24h. Unlocks on recovery.",
        "pairs_default": ["BTC/USDT", "ETH/USDT", "BNB/USDT"],
        "timeframes": ["1h", "4h"],
        "risk_profile": {"max_risk_pct": 1.5, "sl_atr_mult": 1.8, "tp_atr_mult": 3.5, "max_open": 3},
        "broker_required": False, "reinvest": True,
        "small_profit_mode": True, "daily_target_pct": 1.2,
        "description": "Capital protection first, profit second",
    },
    "smart_entry": {
        "id": "smart_entry", "name": "Smart Entry Bot", "icon": "🎯", "color": "#f59e0b",
        "category": "high_profit", "badge": "SMART", "platform": "both",
        "ai_tier_default": "gold", "ai_tier_max": "platinum",
        "strategy_primary": "multi_confirm_entry",
        "strategy_secondary": "breakout",
        "special_feature": "Requires 4/5 indicators aligned before entering. Patience = edge.",
        "pairs_default": ["BTC/USDT", "ETH/USDT", "SOL/USDT"],
        "timeframes": ["1h", "4h"],
        "risk_profile": {"max_risk_pct": 2.0, "sl_atr_mult": 2.0, "tp_atr_mult": 5.0, "max_open": 3},
        "broker_required": False, "reinvest": True,
        "small_profit_mode": False, "daily_target_pct": 2.0,
        "description": "Multi-confirmation entry (4/5 indicators must align)",
    },
    "elite_low_risk": {
        "id": "elite_low_risk", "name": "Elite Low Risk Bot", "icon": "💎", "color": "#a855f7",
        "category": "high_profit", "badge": "ELITE", "platform": "both",
        "ai_tier_default": "platinum", "ai_tier_max": "platinum",
        "strategy_primary": "institutional_trend",
        "strategy_secondary": "mean_reversion",
        "special_feature": "Institutional-grade entries only. AI confidence ≥92% required.",
        "pairs_default": ["BTC/USDT", "ETH/USDT"],
        "timeframes": ["4h", "1d"],
        "risk_profile": {"max_risk_pct": 1.0, "sl_atr_mult": 2.0, "tp_atr_mult": 4.0, "max_open": 2},
        "broker_required": False, "reinvest": True,
        "small_profit_mode": False, "daily_target_pct": 1.5,
        "description": "Highest-conviction entries only — platinum tier standard",
    },
    "precision_safe": {
        "id": "precision_safe", "name": "Precision Safe Trader", "icon": "🔬", "color": "#ec4899",
        "category": "high_profit", "badge": "PRECISE", "platform": "both",
        "ai_tier_default": "gold", "ai_tier_max": "platinum",
        "strategy_primary": "support_bounce",
        "strategy_secondary": "mean_reversion",
        "special_feature": "Trades only S/R bounces. Waits for candle confirmation at key levels.",
        "pairs_default": ["BTC/USDT", "ETH/USDT", "BNB/USDT"],
        "timeframes": ["1h", "4h"],
        "risk_profile": {"max_risk_pct": 1.5, "sl_atr_mult": 1.5, "tp_atr_mult": 3.0, "max_open": 3},
        "broker_required": False, "reinvest": False,
        "small_profit_mode": True, "daily_target_pct": 1.2,
        "description": "Support/resistance bounce specialist",
    },
    "risk_shield": {
        "id": "risk_shield", "name": "Risk Shield AI", "icon": "🔒", "color": "#10b981",
        "category": "high_profit", "badge": "SHIELD", "platform": "both",
        "ai_tier_default": "gold", "ai_tier_max": "platinum",
        "strategy_primary": "hedged_entry",
        "strategy_secondary": "trend",
        "special_feature": "Opens hedge position on opposite pair when primary trade enters.",
        "pairs_default": ["BTC/USDT", "ETH/USDT"],
        "timeframes": ["1h", "4h"],
        "risk_profile": {"max_risk_pct": 2.0, "sl_atr_mult": 2.5, "tp_atr_mult": 4.0, "max_open": 4},
        "broker_required": False, "reinvest": True,
        "small_profit_mode": False, "daily_target_pct": 2.0,
        "description": "Automatic hedging on primary position entry",
    },

    # ════════════════════════════════════════════════════════
    # 🟠 MEDIUM BALANCED (6) [BOTH]
    # ════════════════════════════════════════════════════════

    "balanced_trader": {
        "id": "balanced_trader", "name": "Balanced Trader", "icon": "⚡", "color": "#f59e0b",
        "category": "medium", "badge": "BALANCED", "platform": "both",
        "ai_tier_default": "silver", "ai_tier_max": "gold",
        "strategy_primary": "trend",
        "strategy_secondary": "mean_reversion",
        "special_feature": "Alternates between trend-follow and mean-rev based on ADX level.",
        "pairs_default": ["BTC/USDT", "ETH/USDT", "SOL/USDT", "BNB/USDT"],
        "timeframes": ["1h", "4h"],
        "risk_profile": {"max_risk_pct": 3.0, "sl_atr_mult": 2.0, "tp_atr_mult": 4.0, "max_open": 5},
        "broker_required": False, "reinvest": True,
        "small_profit_mode": True, "daily_target_pct": 2.5,
        "description": "ADX-guided strategy rotation",
    },
    "swing_ai": {
        "id": "swing_ai", "name": "Swing AI Bot", "icon": "🌊", "color": "#6366f1",
        "category": "medium", "badge": "SWING", "platform": "both",
        "ai_tier_default": "gold", "ai_tier_max": "platinum",
        "strategy_primary": "swing_ichimoku",
        "strategy_secondary": "trend",
        "special_feature": "Ichimoku cloud + MACD divergence for multi-day swing entries.",
        "pairs_default": ["BTC/USDT", "ETH/USDT", "EUR/USD", "GBP/USD"],
        "timeframes": ["4h", "1d"],
        "risk_profile": {"max_risk_pct": 3.5, "sl_atr_mult": 2.5, "tp_atr_mult": 6.0, "max_open": 4},
        "broker_required": False, "reinvest": True,
        "small_profit_mode": False, "daily_target_pct": 3.0,
        "description": "Ichimoku-based swing trading",
    },
    "momentum_balance": {
        "id": "momentum_balance", "name": "Momentum Balance Bot", "icon": "🚀", "color": "#f97316",
        "category": "medium", "badge": "MOMENTUM", "platform": "both",
        "ai_tier_default": "gold", "ai_tier_max": "platinum",
        "strategy_primary": "momentum_burst",
        "strategy_secondary": "breakout",
        "special_feature": "Detects momentum bursts using RSI + volume surge + Keltner breakout.",
        "pairs_default": ["BTC/USDT", "ETH/USDT", "SOL/USDT"],
        "timeframes": ["15m", "1h"],
        "risk_profile": {"max_risk_pct": 4.0, "sl_atr_mult": 2.0, "tp_atr_mult": 5.0, "max_open": 5},
        "broker_required": False, "reinvest": True,
        "small_profit_mode": False, "daily_target_pct": 3.5,
        "description": "RSI+volume momentum burst detector",
    },
    "smart_growth": {
        "id": "smart_growth", "name": "Smart Growth Bot", "icon": "📈", "color": "#22c55e",
        "category": "medium", "badge": "GROWTH", "platform": "both",
        "ai_tier_default": "silver", "ai_tier_max": "gold",
        "strategy_primary": "compound_trend",
        "strategy_secondary": "breakout",
        "special_feature": "Compounds position size on consecutive wins. Resets after loss.",
        "pairs_default": ["BTC/USDT", "ETH/USDT", "BNB/USDT"],
        "timeframes": ["1h", "4h"],
        "risk_profile": {"max_risk_pct": 3.0, "sl_atr_mult": 2.0, "tp_atr_mult": 4.5, "max_open": 4},
        "broker_required": False, "reinvest": True,
        "small_profit_mode": True, "daily_target_pct": 3.0,
        "description": "Win-streak compounding with auto-reset",
    },
    "multi_strategy": {
        "id": "multi_strategy", "name": "Multi Strategy AI", "icon": "🧠", "color": "#a855f7",
        "category": "medium", "badge": "MULTI", "platform": "both",
        "ai_tier_default": "gold", "ai_tier_max": "platinum",
        "strategy_primary": "ensemble_multi",
        "strategy_secondary": "trend",
        "special_feature": "Runs 5 strategies simultaneously, selects highest-confidence signal.",
        "pairs_default": ["BTC/USDT", "ETH/USDT", "SOL/USDT", "BNB/USDT", "ADA/USDT"],
        "timeframes": ["1h", "4h"],
        "risk_profile": {"max_risk_pct": 3.5, "sl_atr_mult": 2.0, "tp_atr_mult": 5.0, "max_open": 6},
        "broker_required": False, "reinvest": True,
        "small_profit_mode": False, "daily_target_pct": 3.5,
        "description": "5-strategy simultaneous runner, best signal wins",
    },
    "dynamic_trader": {
        "id": "dynamic_trader", "name": "Dynamic Trader", "icon": "🔄", "color": "#06b6d4",
        "category": "medium", "badge": "DYNAMIC", "platform": "both",
        "ai_tier_default": "gold", "ai_tier_max": "platinum",
        "strategy_primary": "regime_adaptive",
        "strategy_secondary": "scalp",
        "special_feature": "Scales in/out of positions dynamically based on real-time volatility.",
        "pairs_default": ["BTC/USDT", "ETH/USDT", "SOL/USDT"],
        "timeframes": ["15m", "1h"],
        "risk_profile": {"max_risk_pct": 4.0, "sl_atr_mult": 2.0, "tp_atr_mult": 4.0, "max_open": 6},
        "broker_required": False, "reinvest": True,
        "small_profit_mode": True, "daily_target_pct": 4.0,
        "description": "Dynamic vol-based position scaling",
    },

    # ════════════════════════════════════════════════════════
    # 🔵 CRYPTO SCALPING AI (6) — ESC only
    # ════════════════════════════════════════════════════════

    "crypto_scalper_alpha": {
        "id": "crypto_scalper_alpha", "name": "Crypto Scalper Alpha", "icon": "⚡", "color": "#f97316",
        "category": "crypto_scalp", "badge": "ALPHA", "platform": "esc",
        "ai_tier_default": "silver", "ai_tier_max": "platinum",
        "strategy_primary": "ema_scalp",
        "strategy_secondary": "breakout",
        "special_feature": "EMA 3/8 micro-cross scalping. Collects 0.1–0.3% per trade continuously.",
        "pairs_default": ["BTC/USDT", "ETH/USDT", "XAU/USDT"],
        "timeframes": ["1m", "5m"],
        "risk_profile": {"max_risk_pct": 1.5, "sl_atr_mult": 1.0, "tp_atr_mult": 2.0, "max_open": 5},
        "broker_required": False, "reinvest": True,
        "small_profit_mode": True, "daily_target_pct": 5.0,
        "description": "EMA micro-cross scalping with tier-adaptive AI",
    },
    "btc_sniper": {
        "id": "btc_sniper", "name": "BTC Sniper", "icon": "🎯", "color": "#f59e0b",
        "category": "crypto_scalp", "badge": "SNIPER", "platform": "esc",
        "ai_tier_default": "gold", "ai_tier_max": "platinum",
        "strategy_primary": "breakout_whale",
        "strategy_secondary": "scalp",
        "special_feature": "Breakout detection + whale transaction tracking. Enters on whale accumulation.",
        "pairs_default": ["BTC/USDT"],
        "timeframes": ["5m", "15m"],
        "risk_profile": {"max_risk_pct": 2.0, "sl_atr_mult": 1.2, "tp_atr_mult": 2.5, "max_open": 3},
        "broker_required": False, "reinvest": True,
        "small_profit_mode": False, "daily_target_pct": 3.0,
        "description": "BTC breakout + whale transaction signal sniper",
    },
    "eth_flash": {
        "id": "eth_flash", "name": "ETH Flash Bot", "icon": "⚡", "color": "#6366f1",
        "category": "crypto_scalp", "badge": "FLASH", "platform": "esc",
        "ai_tier_default": "gold", "ai_tier_max": "platinum",
        "strategy_primary": "liquidity_hunt",
        "strategy_secondary": "mean_reversion",
        "special_feature": "Targets liquidity zones above/below key levels. Fades stop hunts.",
        "pairs_default": ["ETH/USDT", "ETH/BTC"],
        "timeframes": ["1m", "5m"],
        "risk_profile": {"max_risk_pct": 1.5, "sl_atr_mult": 0.8, "tp_atr_mult": 1.8, "max_open": 4},
        "broker_required": False, "reinvest": True,
        "small_profit_mode": True, "daily_target_pct": 4.0,
        "description": "Liquidity zone hunter + stop-hunt fader",
    },
    "volatility_sniper": {
        "id": "volatility_sniper", "name": "Volatility Sniper", "icon": "💥", "color": "#ec4899",
        "category": "crypto_scalp", "badge": "VOLATILE", "platform": "esc",
        "ai_tier_default": "gold", "ai_tier_max": "platinum",
        "strategy_primary": "vol_burst_scalp",
        "strategy_secondary": "breakout",
        "special_feature": "Detects BB squeeze → waits → enters on first burst candle with vol surge.",
        "pairs_default": ["BTC/USDT", "ETH/USDT", "SOL/USDT"],
        "timeframes": ["5m", "15m"],
        "risk_profile": {"max_risk_pct": 2.0, "sl_atr_mult": 1.5, "tp_atr_mult": 3.0, "max_open": 4},
        "broker_required": False, "reinvest": True,
        "small_profit_mode": False, "daily_target_pct": 3.5,
        "description": "Bollinger squeeze → burst entry",
    },
    "order_flow": {
        "id": "order_flow", "name": "Order Flow Bot", "icon": "📊", "color": "#10b981",
        "category": "crypto_scalp", "badge": "ORDERFLOW", "platform": "esc",
        "ai_tier_default": "gold", "ai_tier_max": "platinum",
        "strategy_primary": "order_flow_imbalance",
        "strategy_secondary": "scalp",
        "special_feature": "Candle anatomy OFI + CVD proxy. Enters with 70%+ buying/selling pressure.",
        "pairs_default": ["BTC/USDT", "ETH/USDT", "BNB/USDT"],
        "timeframes": ["1m", "5m"],
        "risk_profile": {"max_risk_pct": 1.5, "sl_atr_mult": 1.0, "tp_atr_mult": 2.0, "max_open": 5},
        "broker_required": False, "reinvest": True,
        "small_profit_mode": True, "daily_target_pct": 5.0,
        "description": "Order-flow imbalance scalper",
    },
    "beta_scalping_bot": {
        "id": "beta_scalping_bot", "name": "BETA AI Scalping", "icon": "🌌", "color": "#a855f7",
        "category": "crypto_scalp", "badge": "ULTIMATE", "platform": "esc",
        "ai_tier_default": "platinum", "ai_tier_max": "platinum",
        "strategy_primary": "beta_ultra_scalp",
        "strategy_secondary": "order_flow_imbalance",
        "special_feature": "8-condition ultra-scalp. Pattern memory 500. Compound growth 1→10000×.",
        "pairs_default": ["BTC/USDT", "ETH/USDT", "SOL/USDT", "BNB/USDT"],
        "timeframes": ["1m", "5m"],
        "risk_profile": {"max_risk_pct": 2.0, "sl_atr_mult": 1.0, "tp_atr_mult": 2.0, "max_open": 6},
        "broker_required": False, "reinvest": True,
        "small_profit_mode": True, "daily_target_pct": 8.0,
        "description": "Ultra-advanced BETA engine with compound growth",
    },

    # ════════════════════════════════════════════════════════
    # 🔴 FOREX BOTS (6) — ESF only
    # ════════════════════════════════════════════════════════

    "forex_trend": {
        "id": "forex_trend", "name": "Forex Trend Master", "icon": "📈", "color": "#22c55e",
        "category": "forex", "badge": "TREND", "platform": "esf",
        "ai_tier_default": "gold", "ai_tier_max": "platinum",
        "strategy_primary": "ema_macro_trend",
        "strategy_secondary": "trend",
        "special_feature": "EMA 50/200 + macro sentiment. Trades with institutional trend only.",
        "pairs_default": ["EUR/USD", "GBP/USD", "USD/JPY", "AUD/USD", "XAU/USD"],
        "timeframes": ["H1", "H4"],
        "risk_profile": {"max_risk_pct": 1.5, "sl_atr_mult": 2.0, "tp_atr_mult": 5.0, "max_open": 3},
        "broker_required": True, "reinvest": True,
        "mt5_required": True, "small_profit_mode": False, "daily_target_pct": 2.0,
        "description": "Institutional trend following on major pairs + Gold",
    },
    "forex_scalper_pro": {
        "id": "forex_scalper_pro", "name": "Forex Scalper Pro", "icon": "⚡", "color": "#f59e0b",
        "category": "forex", "badge": "SCALP", "platform": "esf",
        "ai_tier_default": "gold", "ai_tier_max": "platinum",
        "strategy_primary": "ema_rsi_scalp",
        "strategy_secondary": "scalp",
        "special_feature": "M1/M5 EMA8/21 cross + RSI 40-60 band. Strict 1.5:1 RR minimum.",
        "pairs_default": ["EUR/USD", "GBP/USD", "USD/JPY"],
        "timeframes": ["M1", "M5"],
        "risk_profile": {"max_risk_pct": 0.8, "sl_atr_mult": 0.8, "tp_atr_mult": 1.5, "max_open": 5},
        "broker_required": True, "reinvest": True,
        "mt5_required": True, "small_profit_mode": True, "daily_target_pct": 3.0,
        "description": "Ultra-fast forex scalping with strict RR",
    },
    "fx_swing": {
        "id": "fx_swing", "name": "FX Swing AI", "icon": "🌊", "color": "#6366f1",
        "category": "forex", "badge": "SWING", "platform": "esf",
        "ai_tier_default": "gold", "ai_tier_max": "platinum",
        "strategy_primary": "swing_ichimoku",
        "strategy_secondary": "mean_reversion",
        "special_feature": "Ichimoku + Fibonacci 61.8% retrace + macro news filter.",
        "pairs_default": ["EUR/USD", "GBP/JPY", "USD/CAD"],
        "timeframes": ["H4", "D1"],
        "risk_profile": {"max_risk_pct": 2.0, "sl_atr_mult": 2.5, "tp_atr_mult": 6.0, "max_open": 3},
        "broker_required": True, "reinvest": True,
        "mt5_required": True, "small_profit_mode": False, "daily_target_pct": 3.5,
        "description": "Multi-day swing with Ichimoku + Fibonacci",
    },
    "news_forex": {
        "id": "news_forex", "name": "News Forex Bot", "icon": "📰", "color": "#ec4899",
        "category": "forex", "badge": "NEWS", "platform": "esf",
        "ai_tier_default": "gold", "ai_tier_max": "platinum",
        "strategy_primary": "news_volatility",
        "strategy_secondary": "breakout",
        "special_feature": "Enters 5min before/after high-impact news. Vol burst + sentiment filter.",
        "pairs_default": ["EUR/USD", "GBP/USD", "USD/JPY", "USD/CAD"],
        "timeframes": ["M5", "M15"],
        "risk_profile": {"max_risk_pct": 1.5, "sl_atr_mult": 2.5, "tp_atr_mult": 4.0, "max_open": 3},
        "broker_required": True, "reinvest": True,
        "mt5_required": True, "small_profit_mode": False, "daily_target_pct": 2.5,
        "description": "High-impact news event trader",
    },
    "fx_institutional": {
        "id": "fx_institutional", "name": "FX Institutional Bot", "icon": "🏛️", "color": "#06b6d4",
        "category": "forex", "badge": "INSTITUTIONAL", "platform": "esf",
        "ai_tier_default": "platinum", "ai_tier_max": "platinum",
        "strategy_primary": "institutional_trend",
        "strategy_secondary": "fibonacci_confluence",
        "special_feature": "SMC (Smart Money Concept): Order Blocks + Fair Value Gaps + BOS detection.",
        "pairs_default": ["EUR/USD", "GBP/USD", "USD/JPY", "XAU/USD"],
        "timeframes": ["H1", "H4", "D1"],
        "risk_profile": {"max_risk_pct": 1.0, "sl_atr_mult": 2.0, "tp_atr_mult": 4.0, "max_open": 3},
        "broker_required": True, "reinvest": True,
        "mt5_required": True, "small_profit_mode": False, "daily_target_pct": 2.0,
        "description": "Smart Money Concept + institutional order flow",
    },
    "gramma_ai_bot": {
        "id": "gramma_ai_bot", "name": "GRAMMA AI", "icon": "🌐", "color": "#10b981",
        "category": "forex", "badge": "GRAMMA", "platform": "both",
        "ai_tier_default": "platinum", "ai_tier_max": "platinum",
        "strategy_primary": "gramma_corr_hedge",
        "strategy_secondary": "trend",
        "special_feature": "Correlation engine: BTC/EUR dynamic hedge. Z-score divergence trading.",
        "pairs_default": ["EUR/USD", "GBP/USD", "BTC/USDT"],
        "timeframes": ["H1", "H4"],
        "risk_profile": {"max_risk_pct": 2.0, "sl_atr_mult": 2.0, "tp_atr_mult": 4.5, "max_open": 4},
        "broker_required": False, "reinvest": True,
        "small_profit_mode": True, "daily_target_pct": 2.5,
        "description": "Dynamic correlation hedge between crypto and forex",
    },

    # ════════════════════════════════════════════════════════
    # 🥇 COMMODITIES (3) — Gold/Silver/Oil [BOTH]
    # ════════════════════════════════════════════════════════

    "gold_master": {
        "id": "gold_master", "name": "Gold Master AI", "icon": "🥇", "color": "#f59e0b",
        "category": "commodities", "badge": "GOLD", "platform": "both",
        "ai_tier_default": "gold", "ai_tier_max": "platinum",
        "strategy_primary": "gold_trend_smc",
        "strategy_secondary": "fibonacci_confluence",
        "special_feature": (
            "XAU/USD specialist. Combines SMC order blocks + USD correlation + "
            "Fed rate sentiment. Safe-haven demand detector."
        ),
        "pairs_default": ["XAU/USD", "XAU/BTC", "XAU/USDT"],
        "timeframes": ["M15", "H1", "H4"],
        "risk_profile": {"max_risk_pct": 1.5, "sl_atr_mult": 2.0, "tp_atr_mult": 5.0, "max_open": 3},
        "broker_required": False, "reinvest": True,
        "small_profit_mode": True, "daily_target_pct": 2.5,
        "description": "Gold XAU/USD specialist with USD correlation + safe-haven detector",
        "commodities_pairs": ["XAU/USD", "XAU/EUR", "XAU/GBP"],
        "crypto_pairs": ["PAXG/USDT", "XAUT/USDT"],
    },
    "silver_hawk": {
        "id": "silver_hawk", "name": "Silver Hawk AI", "icon": "🥈", "color": "#94a3b8",
        "category": "commodities", "badge": "SILVER", "platform": "both",
        "ai_tier_default": "gold", "ai_tier_max": "platinum",
        "strategy_primary": "silver_breakout_ratio",
        "strategy_secondary": "trend",
        "special_feature": (
            "XAG/USD + Gold/Silver ratio strategy. Enters silver when ratio "
            "diverges >2σ from 80-day mean. Industrial demand filter active."
        ),
        "pairs_default": ["XAG/USD", "XAG/USDT"],
        "timeframes": ["H1", "H4"],
        "risk_profile": {"max_risk_pct": 2.0, "sl_atr_mult": 2.0, "tp_atr_mult": 4.5, "max_open": 3},
        "broker_required": False, "reinvest": True,
        "small_profit_mode": True, "daily_target_pct": 2.0,
        "description": "Silver XAG/USD specialist with Gold/Silver ratio analysis",
        "commodities_pairs": ["XAG/USD", "XAG/EUR"],
        "crypto_pairs": [],
    },
    "commodities_hybrid": {
        "id": "commodities_hybrid", "name": "Commodities Hybrid Bot", "icon": "⛏️", "color": "#d97706",
        "category": "commodities", "badge": "HYBRID-COMM", "platform": "both",
        "ai_tier_default": "gold", "ai_tier_max": "platinum",
        "strategy_primary": "commodities_rotation",
        "strategy_secondary": "regime_adaptive",
        "special_feature": (
            "Rotates between Gold, Silver, and Oil based on macro regime. "
            "DXY (dollar index) inverse correlation filter. "
            "Pairs commodities with crypto for diversification."
        ),
        "pairs_default": ["XAU/USD", "XAG/USD", "WTI/USD", "BTC/USDT"],
        "timeframes": ["H1", "H4", "D1"],
        "risk_profile": {"max_risk_pct": 2.0, "sl_atr_mult": 2.5, "tp_atr_mult": 5.0, "max_open": 4},
        "broker_required": False, "reinvest": True,
        "small_profit_mode": False, "daily_target_pct": 2.5,
        "description": "Multi-commodity rotation with DXY + crypto correlation",
        "commodities_pairs": ["XAU/USD", "XAG/USD", "WTI/USD"],
        "crypto_pairs": ["BTC/USDT", "ETH/USDT"],
    },

    # ════════════════════════════════════════════════════════
    # 🔶 FOREX HYBRID (3) — Headway + RoyalIQ style [ESF]
    # ════════════════════════════════════════════════════════

    "headway_pro": {
        "id": "headway_pro", "name": "Headway Pro AI", "icon": "🏆", "color": "#3b82f6",
        "category": "forex_hybrid", "badge": "HEADWAY", "platform": "esf",
        "ai_tier_default": "gold", "ai_tier_max": "platinum",
        "strategy_primary": "headway_small_profit",
        "strategy_secondary": "ema_rsi_scalp",
        "special_feature": (
            "Headway-style daily target system. Collects 0.1–0.5% profits continuously. "
            "Auto-pauses when daily target met. Starts fresh next session. "
            "Never risks more than daily profit to keep target."
        ),
        "pairs_default": ["EUR/USD", "GBP/USD", "USD/JPY", "AUD/USD"],
        "timeframes": ["M5", "M15", "H1"],
        "risk_profile": {"max_risk_pct": 0.5, "sl_atr_mult": 1.0, "tp_atr_mult": 1.5, "max_open": 6},
        "broker_required": True, "reinvest": True,
        "mt5_required": True,
        "headway_style": True, "small_profit_mode": True, "daily_target_pct": 3.0,
        "session_target_pct": 1.0,  # target per session (morning/afternoon/night)
        "auto_pause_on_target": True,
        "description": "Headway-style small profit collection with daily target auto-pause",
    },
    "royaliq_engine": {
        "id": "royaliq_engine", "name": "RoyalIQ Engine", "icon": "👑", "color": "#8b5cf6",
        "category": "forex_hybrid", "badge": "ROYALIQ", "platform": "esf",
        "ai_tier_default": "gold", "ai_tier_max": "platinum",
        "strategy_primary": "royaliq_compound",
        "strategy_secondary": "trend",
        "special_feature": (
            "RoyalIQ-style compound growth engine. Reinvests 70% of each profit. "
            "Uses Kelly Criterion for position sizing. Targets 5–10% weekly growth. "
            "Auto-copy signals to connected sub-accounts."
        ),
        "pairs_default": ["EUR/USD", "GBP/USD", "USD/JPY", "XAU/USD"],
        "timeframes": ["H1", "H4"],
        "risk_profile": {"max_risk_pct": 2.0, "sl_atr_mult": 2.0, "tp_atr_mult": 4.0, "max_open": 4},
        "broker_required": True, "reinvest": True,
        "mt5_required": True,
        "royaliq_style": True, "small_profit_mode": False, "daily_target_pct": 5.0,
        "kelly_sizing": True, "copy_trade_enabled": True, "reinvest_pct": 70,
        "description": "RoyalIQ-style compound growth with Kelly sizing + copy trading",
    },
    "forex_hybrid_elite": {
        "id": "forex_hybrid_elite", "name": "Forex Hybrid Elite", "icon": "🦅", "color": "#ef4444",
        "category": "forex_hybrid", "badge": "ELITE-FX", "platform": "esf",
        "ai_tier_default": "platinum", "ai_tier_max": "platinum",
        "strategy_primary": "forex_hybrid_ai",
        "strategy_secondary": "institutional_trend",
        "special_feature": (
            "Combines: SMC order blocks + Wyckoff + Elliott Wave AI + "
            "news sentiment + COT (Commitment of Traders) data. "
            "5 independent AI engines vote. Min 4/5 agreement to enter."
        ),
        "pairs_default": ["EUR/USD", "GBP/USD", "USD/JPY", "XAU/USD", "GBP/JPY"],
        "timeframes": ["M15", "H1", "H4", "D1"],
        "risk_profile": {"max_risk_pct": 1.5, "sl_atr_mult": 2.0, "tp_atr_mult": 5.0, "max_open": 3},
        "broker_required": True, "reinvest": True,
        "mt5_required": True,
        "small_profit_mode": False, "daily_target_pct": 4.0,
        "description": "5-engine AI vote system: SMC + Wyckoff + Elliott + COT + news",
    },

    # ════════════════════════════════════════════════════════
    # 🚀 CAPITAL MAXIMIZER (3) — Turbo growth [BOTH]
    # ════════════════════════════════════════════════════════

    "turbo_compounder": {
        "id": "turbo_compounder", "name": "Turbo Compounder", "icon": "🚀", "color": "#f97316",
        "category": "capital_max", "badge": "TURBO", "platform": "both",
        "ai_tier_default": "platinum", "ai_tier_max": "platinum",
        "strategy_primary": "turbo_compound",
        "strategy_secondary": "momentum_burst",
        "special_feature": (
            "Aggressive compound growth engine. Reinvests 100% of profits. "
            "Kelly Criterion sizing. Scales from $100 to target in minimum time. "
            "Daily rebalancing. Risk circuit-breaker at 15% daily drawdown."
        ),
        "pairs_default": ["BTC/USDT", "ETH/USDT", "EUR/USD", "XAU/USD"],
        "timeframes": ["15m", "1h"],
        "risk_profile": {"max_risk_pct": 5.0, "sl_atr_mult": 1.5, "tp_atr_mult": 3.0, "max_open": 6},
        "broker_required": False, "reinvest": True,
        "capital_growth": True, "small_profit_mode": False, "daily_target_pct": 8.0,
        "kelly_sizing": True, "reinvest_pct": 100,
        "drawdown_circuit_breaker_pct": 15.0,
        "description": "Maximum compound growth engine — 100% profit reinvestment",
    },
    "velocity_growth": {
        "id": "velocity_growth", "name": "Velocity Growth Bot", "icon": "💫", "color": "#06b6d4",
        "category": "capital_max", "badge": "VELOCITY", "platform": "both",
        "ai_tier_default": "gold", "ai_tier_max": "platinum",
        "strategy_primary": "velocity_scalp_compound",
        "strategy_secondary": "ema_scalp",
        "special_feature": (
            "High-frequency small-profit scalping with compound reinvestment. "
            "Targets 50–100 trades/day. Each trade 0.1–0.2% profit. "
            "Weekly capital doubles target mode. Pause on 5% daily loss."
        ),
        "pairs_default": ["BTC/USDT", "ETH/USDT", "EUR/USD"],
        "timeframes": ["1m", "5m"],
        "risk_profile": {"max_risk_pct": 1.0, "sl_atr_mult": 0.8, "tp_atr_mult": 1.5, "max_open": 8},
        "broker_required": False, "reinvest": True,
        "capital_growth": True, "small_profit_mode": True, "daily_target_pct": 10.0,
        "target_trades_per_day": 75, "reinvest_pct": 80,
        "description": "High-frequency compound scalping — 50-100 trades/day",
    },
    "exponential_ai": {
        "id": "exponential_ai", "name": "Exponential AI Bot", "icon": "📊", "color": "#22c55e",
        "category": "capital_max", "badge": "EXPONENTIAL", "platform": "both",
        "ai_tier_default": "platinum", "ai_tier_max": "platinum",
        "strategy_primary": "exponential_compound",
        "strategy_secondary": "ensemble_multi",
        "special_feature": (
            "AI-optimized exponential growth strategy. Uses Fibonacci-based "
            "position sizing. Combines trend + breakout + news. "
            "Self-adjusts risk based on win rate. Targets 2× capital per week."
        ),
        "pairs_default": ["BTC/USDT", "ETH/USDT", "XAU/USD", "EUR/USD"],
        "timeframes": ["15m", "1h", "4h"],
        "risk_profile": {"max_risk_pct": 3.0, "sl_atr_mult": 2.0, "tp_atr_mult": 4.0, "max_open": 5},
        "broker_required": False, "reinvest": True,
        "capital_growth": True, "small_profit_mode": False, "daily_target_pct": 7.0,
        "reinvest_pct": 90, "self_adjust_risk": True,
        "description": "Fibonacci-sized exponential compound growth with self-adjusting risk",
    },
}


# ── AI Tier Capabilities ─────────────────────────────────────
AI_TIER_CAPS: dict[str, dict] = {
    "silver": {
        "name": "Silver", "icon": "🥈", "color": "#94a3b8",
        "indicators": ["ema", "rsi", "macd", "bb"],
        "ml_enabled": False, "dl_enabled": False,
        "indicator_layers": 2, "min_confidence": 60,
        "ai_think_threshold": 0,   # Never uses slow AI reasoning
        "description": "Basic rule-based AI — EMA, RSI, MACD",
        "upgrade_cost_usd": 0, "monthly_add": 0,
    },
    "gold": {
        "name": "Gold", "icon": "🥇", "color": "#f59e0b",
        "indicators": ["ema", "rsi", "macd", "bb", "adx", "stoch", "cci", "vwap", "obv", "cmf"],
        "ml_enabled": True, "dl_enabled": False,
        "indicator_layers": 4, "min_confidence": 70,
        "ai_think_threshold": 0.3,  # Uses AI reasoning only when confidence < 0.3 uncertainty
        "description": "ML-enhanced AI — gradient boosting + multi-signal",
        "upgrade_cost_usd": 19.99, "monthly_add": 9.99,
    },
    "platinum": {
        "name": "Platinum", "icon": "💎", "color": "#e2e8f0",
        "indicators": ["ALL"],
        "ml_enabled": True, "dl_enabled": True,
        "indicator_layers": 5, "min_confidence": 75,
        "ai_think_threshold": 0.2,  # Rarely uses slow reasoning — fast decisive AI
        "description": "Full DL + ensemble + SHAP explainability",
        "upgrade_cost_usd": 49.99, "monthly_add": 24.99,
    },
}

# ── Strategy Registry ────────────────────────────────────────
STRATEGY_REGISTRY: dict[str, dict] = {
    # Existing strategies
    "ema_scalp":             {"name": "EMA Scalp",          "timeframe": "M1/M5", "regime": "any"},
    "ema_rsi_scalp":         {"name": "EMA+RSI Scalp",      "timeframe": "M1/M5", "regime": "trending"},
    "ema_macro_trend":       {"name": "EMA Macro Trend",    "timeframe": "H1/H4", "regime": "trending"},
    "trend":                 {"name": "Trend Following",    "timeframe": "H1/H4", "regime": "trending"},
    "mean_reversion":        {"name": "Mean Reversion",     "timeframe": "H1/H4", "regime": "ranging"},
    "breakout":              {"name": "Breakout",           "timeframe": "H1",    "regime": "volatile"},
    "scalp":                 {"name": "Scalping",           "timeframe": "M1",    "regime": "any"},
    "breakout_whale":        {"name": "Breakout+Whale",     "timeframe": "M5",    "regime": "trending"},
    "liquidity_hunt":        {"name": "Liquidity Hunt",     "timeframe": "M1",    "regime": "any"},
    "vol_burst_scalp":       {"name": "Vol Burst Scalp",   "timeframe": "M5",    "regime": "volatile"},
    "order_flow_imbalance":  {"name": "Order Flow",        "timeframe": "M1",    "regime": "any"},
    "beta_ultra_scalp":      {"name": "BETA Ultra Scalp",  "timeframe": "M1",    "regime": "any"},
    "dca_accumulate":        {"name": "Smart DCA",         "timeframe": "4h",    "regime": "ranging"},
    "capital_protection":    {"name": "Capital Guard",     "timeframe": "1h",    "regime": "any"},
    "multi_confirm_entry":   {"name": "Multi-Confirm",     "timeframe": "1h",    "regime": "any"},
    "institutional_trend":   {"name": "Institutional",     "timeframe": "H4",    "regime": "trending"},
    "support_bounce":        {"name": "S/R Bounce",        "timeframe": "H1",    "regime": "ranging"},
    "hedged_entry":          {"name": "Hedged Entry",      "timeframe": "1h",    "regime": "any"},
    "portfolio_balance":     {"name": "Portfolio Balance", "timeframe": "4h",    "regime": "any"},
    "low_vol_trend":         {"name": "Low Vol Trend",     "timeframe": "4h",    "regime": "trending"},
    "regime_adaptive":       {"name": "Regime Adaptive",  "timeframe": "1h",    "regime": "any"},
    "fibonacci_confluence":  {"name": "Fib Confluence",   "timeframe": "H4",    "regime": "trending"},
    "compound_trend":        {"name": "Compound Trend",   "timeframe": "1h",    "regime": "trending"},
    "ensemble_multi":        {"name": "Multi-Ensemble",   "timeframe": "1h",    "regime": "any"},
    "corr_hedge":            {"name": "Correlation Hedge","timeframe": "1h",    "regime": "any"},
    "gramma_corr_hedge":     {"name": "GRAMMA Hedge",     "timeframe": "1h",    "regime": "any"},
    "swing_ichimoku":        {"name": "Ichimoku Swing",   "timeframe": "H4",    "regime": "trending"},
    "momentum_burst":        {"name": "Momentum Burst",   "timeframe": "15m",   "regime": "volatile"},
    "news_volatility":       {"name": "News Vol",         "timeframe": "M5",    "regime": "volatile"},

    # NEW v7 strategies — Commodities
    "gold_trend_smc":        {
        "name": "Gold SMC Trend", "timeframe": "M15/H1", "regime": "trending",
        "asset_class": "commodities", "notes": "SMC Order Blocks + USD correlation + safe-haven demand",
    },
    "silver_breakout_ratio": {
        "name": "Silver Ratio Breakout", "timeframe": "H1/H4", "regime": "volatile",
        "asset_class": "commodities", "notes": "Gold/Silver ratio divergence + industrial demand",
    },
    "commodities_rotation":  {
        "name": "Commodities Rotation", "timeframe": "H4/D1", "regime": "any",
        "asset_class": "commodities", "notes": "DXY-inverse + macro rotation XAU/XAG/WTI",
    },

    # NEW v7 strategies — Forex Hybrid (Headway/RoyalIQ)
    "headway_small_profit":  {
        "name": "Headway Small Profit", "timeframe": "M5/M15", "regime": "any",
        "asset_class": "forex", "notes": "Continuous 0.1-0.5% profit collection with daily target gate",
    },
    "royaliq_compound":      {
        "name": "RoyalIQ Compound", "timeframe": "H1/H4", "regime": "trending",
        "asset_class": "forex", "notes": "Kelly Criterion sizing + 70% reinvest + copy signals",
    },
    "forex_hybrid_ai":       {
        "name": "Forex Hybrid AI", "timeframe": "M15/H1/H4", "regime": "any",
        "asset_class": "forex", "notes": "SMC + Wyckoff + Elliott Wave + COT + News — 5 engine vote",
    },

    # NEW v7 strategies — Capital Maximizer
    "turbo_compound":        {
        "name": "Turbo Compound", "timeframe": "15m/1h", "regime": "any",
        "notes": "100% reinvest, Kelly sizing, 15% DD circuit breaker",
    },
    "velocity_scalp_compound": {
        "name": "Velocity Scalp+Compound", "timeframe": "1m/5m", "regime": "any",
        "notes": "HFT scalping + compound reinvest, 50-100 trades/day",
    },
    "exponential_compound":  {
        "name": "Exponential Compound", "timeframe": "15m/1h/4h", "regime": "any",
        "notes": "Fibonacci sizing, self-adjusting risk, 2x/week target",
    },
}


# ── Commodity Pairs Catalogue ────────────────────────────────
COMMODITY_PAIRS = {
    "XAU/USD": {"name": "Gold/USD",         "icon": "🥇", "type": "precious_metal", "pip_size": 0.01},
    "XAU/EUR": {"name": "Gold/EUR",         "icon": "🥇", "type": "precious_metal", "pip_size": 0.01},
    "XAU/GBP": {"name": "Gold/GBP",         "icon": "🥇", "type": "precious_metal", "pip_size": 0.01},
    "XAU/BTC": {"name": "Gold/Bitcoin",     "icon": "🥇", "type": "cross_asset",    "pip_size": 0.0001},
    "XAG/USD": {"name": "Silver/USD",       "icon": "🥈", "type": "precious_metal", "pip_size": 0.001},
    "XAG/EUR": {"name": "Silver/EUR",       "icon": "🥈", "type": "precious_metal", "pip_size": 0.001},
    "WTI/USD": {"name": "WTI Oil/USD",      "icon": "🛢️",  "type": "energy",         "pip_size": 0.01},
    "PAXG/USDT": {"name": "PAX Gold/USDT", "icon": "🥇", "type": "crypto_commodity","pip_size": 0.01},
    "XAUT/USDT": {"name": "Tether Gold",   "icon": "🥇", "type": "crypto_commodity","pip_size": 0.01},
}

# ── Forex Pairs (Major + Minor + Exotic) ─────────────────────
FOREX_PAIRS = {
    "major": ["EUR/USD", "GBP/USD", "USD/JPY", "AUD/USD", "USD/CAD", "USD/CHF", "NZD/USD"],
    "minor": ["EUR/GBP", "GBP/JPY", "EUR/JPY", "AUD/JPY", "CHF/JPY", "EUR/AUD", "GBP/AUD"],
    "exotic": ["USD/ZAR", "USD/TRY", "USD/MXN", "USD/BRL"],
    "commodities": ["XAU/USD", "XAU/EUR", "XAG/USD", "WTI/USD"],
}

# ── Platform Config ───────────────────────────────────────────
PLATFORM_CONFIG = {
    "esf": {
        "name": "ESTRADE Forex",
        "short": "ESF",
        "icon": "📈",
        "color": "#22c55e",
        "accent": "#16a34a",
        "description": "Professional Forex + Commodities Trading Platform",
        "exchanges": ["mt5", "oanda", "ic_markets", "pepperstone"],
        "asset_classes": ["forex", "commodities"],
        "categories": ["hybrid", "high_profit", "medium", "forex", "forex_hybrid", "commodities", "capital_max"],
    },
    "esc": {
        "name": "ESTRADE Crypto",
        "short": "ESC",
        "icon": "₿",
        "color": "#f59e0b",
        "accent": "#d97706",
        "description": "AI-Powered Crypto + Commodities Trading Platform",
        "exchanges": ["binance", "bybit", "pionex", "kucoin", "okx"],
        "asset_classes": ["crypto", "commodities"],
        "categories": ["hybrid", "high_profit", "medium", "crypto_scalp", "commodities", "capital_max"],
    },
}

# ── Helper functions ─────────────────────────────────────────

def get_bot(bot_id: str) -> dict:
    return BOT_REGISTRY.get(bot_id, {})


def get_bots_by_category(category: Category) -> list[dict]:
    return [b for b in BOT_REGISTRY.values() if b["category"] == category]


def get_bots_for_platform(platform: str) -> list[dict]:
    """Return bots available on given platform (esf/esc/both)."""
    return [b for b in BOT_REGISTRY.values()
            if b.get("platform") in (platform, "both")]


def get_all_bots() -> list[dict]:
    return list(BOT_REGISTRY.values())


def get_tier(tier: AiTier) -> dict:
    return AI_TIER_CAPS.get(tier, AI_TIER_CAPS["silver"])


def get_strategy(strategy_id: str) -> dict:
    return STRATEGY_REGISTRY.get(strategy_id, {})


def get_small_profit_bots() -> list[dict]:
    """Return all bots with small_profit_mode=True (Headway-style)."""
    return [b for b in BOT_REGISTRY.values() if b.get("small_profit_mode")]


def get_capital_max_bots() -> list[dict]:
    """Return all capital maximizer bots."""
    return [b for b in BOT_REGISTRY.values()
            if b.get("capital_growth") or b.get("category") == "capital_max"]


def get_commodities_bots() -> list[dict]:
    return [b for b in BOT_REGISTRY.values() if b["category"] == "commodities"]


CATEGORY_META = {
    "hybrid":       {"label": "Hybrid",              "color": "#22c55e", "icon": "🟢", "risk": "Low"},
    "high_profit":  {"label": "High Profit Low Risk", "color": "#f59e0b", "icon": "🟡", "risk": "Low-Med"},
    "medium":       {"label": "Medium Balanced",     "color": "#f97316", "icon": "🟠", "risk": "Medium"},
    "crypto_scalp": {"label": "Crypto Scalping AI",  "color": "#6366f1", "icon": "🔵", "risk": "Med-High"},
    "forex":        {"label": "Forex Bots",          "color": "#ef4444", "icon": "🔴", "risk": "Med-High"},
    "commodities":  {"label": "Gold & Commodities",  "color": "#f59e0b", "icon": "🥇", "risk": "Med"},
    "forex_hybrid": {"label": "Forex Hybrid AI",     "color": "#3b82f6", "icon": "🔷", "risk": "Low-Med"},
    "capital_max":  {"label": "Capital Maximizer",   "color": "#f97316", "icon": "🚀", "risk": "High"},
}

TOTAL_BOTS = len(BOT_REGISTRY)  # 39


# ════════════════════════════════════════════════════════════════
# 🔴 PRO MAX AI SCALPING BOT — RED RIBBON EXCLUSIVE
# ════════════════════════════════════════════════════════════════
# Generates 1 USDT per trade target after trade sequences 1→5→3→4
# Each cycle: T1=1USDT, T2=1USDT×5, T3=1USDT×3, T4=1USDT×4
# Highly profitable + ultra risk-controlled: max 0.25% risk/trade
# Minimum confidence: 85% | Min RR: 2.5 | Max 3 open positions

BOT_REGISTRY["promax_scalping"] = {
    "id": "promax_scalping",
    "name": "PRO MAX AI Scalping",
    "icon": "🔴",
    "color": "#ef4444",
    "category": "crypto_scalp",
    "badge": "PRO MAX",
    "ribbon": "red",
    "ribbon_text": "PRO MAX",
    "platform": "both",
    "ai_tier_default": "platinum",
    "ai_tier_max": "platinum",
    "strategy_primary": "promax_ultra_scalp",
    "strategy_secondary": "order_flow_imbalance",
    "conservative_strategy": "ema_rsi_scalp",
    "balanced_strategy": "promax_ultra_scalp",
    "aggressive_strategy": "promax_ultra_scalp",
    "ultra_strategy": "promax_ultra_scalp",
    "special_feature": (
        "1 USDT/trade target after sequences 1→5→3→4. "
        "Cycle: T1=×1, T2=×5, T3=×3, T4=×4 USDT. "
        "Risk capped 0.25%/trade. Confidence ≥85%. Min RR 2.5."
    ),
    "pairs_default": [
        "BTC/USDT","ETH/USDT","SOL/USDT","BNB/USDT",
        "XAU/USDT","EUR/USD","GBP/USD"
    ],
    "timeframes": ["1m","5m"],
    "risk_profile": {
        "max_risk_pct": 0.25,
        "sl_atr_mult": 0.8,
        "tp_atr_mult": 2.2,
        "max_open": 3,
        "min_confidence": 85.0,
        "min_rr": 2.5,
    },
    "risk_ratio": 0.12,
    "target_profit_options": TARGET_PROFIT_OPTIONS,
    "default_target_pct": 2.0,
    # 1-USDT sequence mode
    "usdt_sequence_mode": True,
    "usdt_per_trade": 1.0,
    "sequence_multipliers": [1, 5, 3, 4],   # cycles: ×1, ×5, ×3, ×4 USDT
    "sequence_reset_on_loss": True,
    "broker_required": False,
    "reinvest": True,
    "small_profit_mode": True,
    "daily_target_pct": 5.0,
    "capital_growth": True,
    "kelly_sizing": True,
    "maintenance_window": "00:00-00:30 UTC",
    "auto_resume_after_maintenance": True,
    "health_check_interval": 20,
    "description": (
        "PRO MAX: Targets 1 USDT/trade with cycle multipliers 1×→5×→3×→4×. "
        "Highest confidence threshold (85%+). Ultra tight risk control."
    ),
    "exclusive": True,
    "highlight": "Generates fixed USDT profit targets regardless of account size",
}

# ── ProMax strategy entry ─────────────────────────────────────
STRATEGY_REGISTRY["promax_ultra_scalp"] = {
    "name": "ProMax Ultra Scalp",
    "timeframe": "M1/M5",
    "regime": "any",
    "notes": (
        "8-engine consensus (≥6/8). 1-USDT sequence targeting. "
        "Dynamic SL: 0.8×ATR. TP: 2.2×ATR. Max 3 concurrent positions. "
        "Cycle: T1=1USDT T2=5USDT T3=3USDT T4=4USDT then repeat."
    ),
}
