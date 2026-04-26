-- ═══════════════════════════════════════════════════════════════════════════
-- ESTRADE v7 ULTRA — Complete Database Migration
-- All v7 tables preserved + Ultra additions:
--   • ProMax bot sequence tracking
--   • Profit range selector state (2-15%, per_trade/per_session)
--   • Payment & subscriptions (Stripe via Vercel)
--   • Maintenance windows
--   • Bot strategy flexibility per target
-- ═══════════════════════════════════════════════════════════════════════════

BEGIN;

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ══════════════════════════════════════════════════════════════
-- USERS (preserved + tier/payment fields)
-- ══════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS users (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email           TEXT UNIQUE NOT NULL,
    password_hash   TEXT NOT NULL,
    full_name       TEXT DEFAULT '',
    phone           TEXT DEFAULT '',
    country         TEXT DEFAULT '',
    role            TEXT DEFAULT 'user' CHECK (role IN ('user','admin','analyst','broker')),
    platform        TEXT DEFAULT 'both' CHECK (platform IN ('esf','esc','both')),
    tier            TEXT DEFAULT 'silver' CHECK (tier IN ('silver','gold','platinum')),
    ai_tier         TEXT DEFAULT 'silver' CHECK (ai_tier IN ('silver','gold','platinum')),
    subscription_plan TEXT DEFAULT 'free',
    subscription_status TEXT DEFAULT 'inactive',
    stripe_customer_id  TEXT,
    stripe_subscription_id TEXT,
    trial_ends_at   TIMESTAMPTZ,
    is_active       BOOLEAN DEFAULT TRUE,
    is_verified     BOOLEAN DEFAULT FALSE,
    two_fa_enabled  BOOLEAN DEFAULT FALSE,
    two_fa_secret   TEXT,
    kyc_verified    BOOLEAN DEFAULT FALSE,
    referral_code   TEXT UNIQUE DEFAULT encode(gen_random_bytes(6),'hex'),
    referred_by     UUID REFERENCES users(id),
    last_login      TIMESTAMPTZ,
    login_count     INTEGER DEFAULT 0,
    total_profit    NUMERIC(20,8) DEFAULT 0,
    total_trades    INTEGER DEFAULT 0,
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_users_email   ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_stripe  ON users(stripe_customer_id);
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- ══════════════════════════════════════════════════════════════
-- WALLETS (preserved)
-- ══════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS wallets (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    currency        TEXT NOT NULL DEFAULT 'USDT',
    balance         NUMERIC(20,8) DEFAULT 0 CHECK (balance >= 0),
    locked_balance  NUMERIC(20,8) DEFAULT 0,
    total_deposited NUMERIC(20,8) DEFAULT 0,
    total_withdrawn NUMERIC(20,8) DEFAULT 0,
    total_profit    NUMERIC(20,8) DEFAULT 0,
    total_loss      NUMERIC(20,8) DEFAULT 0,
    is_primary      BOOLEAN DEFAULT FALSE,
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, currency)
);
ALTER TABLE wallets ENABLE ROW LEVEL SECURITY;
CREATE POLICY wallets_user ON wallets USING (user_id = auth.uid());

-- ══════════════════════════════════════════════════════════════
-- EXCHANGE CONNECTIONS (preserved)
-- ══════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS exchange_connections (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    exchange        TEXT NOT NULL,
    platform        TEXT DEFAULT 'esc',
    label           TEXT DEFAULT '',
    api_key_enc     TEXT NOT NULL,
    api_secret_enc  TEXT NOT NULL,
    passphrase_enc  TEXT,
    is_testnet      BOOLEAN DEFAULT FALSE,
    status          TEXT DEFAULT 'pending',
    balance_cache   JSONB DEFAULT '{}',
    permissions     JSONB DEFAULT '{"read":true,"trade":false,"withdraw":false}',
    last_sync       TIMESTAMPTZ,
    error_message   TEXT,
    created_at      TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE exchange_connections ENABLE ROW LEVEL SECURITY;
CREATE POLICY ex_conn_user ON exchange_connections USING (user_id = auth.uid());

-- ══════════════════════════════════════════════════════════════
-- MT5 CONNECTIONS (preserved)
-- ══════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS mt5_connections (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    broker_name     TEXT NOT NULL,
    server          TEXT NOT NULL,
    login_enc       TEXT NOT NULL,
    password_enc    TEXT NOT NULL,
    connection_type TEXT DEFAULT 'rest',
    rest_url        TEXT,
    api_key_enc     TEXT,
    account_id      TEXT,
    account_type    TEXT DEFAULT 'real',
    currency        TEXT DEFAULT 'USD',
    leverage        INTEGER DEFAULT 100,
    is_active       BOOLEAN DEFAULT TRUE,
    is_hedging      BOOLEAN DEFAULT FALSE,
    last_balance    NUMERIC(20,4),
    last_equity     NUMERIC(20,4),
    last_sync       TIMESTAMPTZ,
    status          TEXT DEFAULT 'pending',
    path            TEXT DEFAULT '',
    created_at      TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE mt5_connections ENABLE ROW LEVEL SECURITY;
CREATE POLICY mt5_user ON mt5_connections USING (user_id = auth.uid());

-- ══════════════════════════════════════════════════════════════
-- BOTS (preserved + profit range + ProMax + strategy columns)
-- ══════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS bots (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id             UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    bot_id              TEXT NOT NULL,
    name                TEXT NOT NULL,
    category            TEXT NOT NULL,
    platform            TEXT DEFAULT 'both',
    status              TEXT DEFAULT 'stopped'
                        CHECK (status IN ('running','stopped','paused','frozen','error')),
    ai_tier             TEXT DEFAULT 'silver',
    capital_mode        TEXT DEFAULT 'hybrid',
    allocated_capital   NUMERIC(20,8) DEFAULT 0,
    exchange_conn_id    UUID REFERENCES exchange_connections(id),
    mt5_conn_id         UUID REFERENCES mt5_connections(id),
    is_active           BOOLEAN DEFAULT TRUE,
    is_demo             BOOLEAN DEFAULT FALSE,

    -- 2% Pro Mode (preserved)
    two_pct_mode        BOOLEAN DEFAULT FALSE,

    -- Profit Range Selector (NEW)
    profit_range_target NUMERIC(6,2) DEFAULT 0,
    profit_range_mode   TEXT DEFAULT 'per_session'
                        CHECK (profit_range_mode IN ('per_trade','per_session','')),
    active_strategy     TEXT DEFAULT '',

    -- Capital maximizer settings (preserved)
    daily_target_pct    NUMERIC(8,4) DEFAULT 3.0,
    small_profit_mode   BOOLEAN DEFAULT FALSE,
    reinvest_pct        NUMERIC(8,4) DEFAULT 0,
    kelly_sizing        BOOLEAN DEFAULT FALSE,
    auto_pause_on_target BOOLEAN DEFAULT FALSE,
    headway_style       BOOLEAN DEFAULT FALSE,
    royaliq_style       BOOLEAN DEFAULT FALSE,
    capital_growth      BOOLEAN DEFAULT FALSE,
    drawdown_circuit_breaker_pct NUMERIC(8,4) DEFAULT 15.0,

    -- ProMax USDT sequence (NEW)
    promax_sequence_pos    INTEGER DEFAULT 0,
    promax_session_usdt    NUMERIC(12,4) DEFAULT 0,
    promax_cycle_done      BOOLEAN DEFAULT FALSE,
    usdt_sequence_mode     BOOLEAN DEFAULT FALSE,

    -- Performance (preserved)
    total_trades        INTEGER DEFAULT 0,
    win_trades          INTEGER DEFAULT 0,
    loss_trades         INTEGER DEFAULT 0,
    total_pnl           NUMERIC(20,8) DEFAULT 0,
    total_pnl_pct       NUMERIC(10,4) DEFAULT 0,
    daily_pnl           NUMERIC(20,8) DEFAULT 0,
    daily_pnl_pct       NUMERIC(10,4) DEFAULT 0,
    max_drawdown_pct    NUMERIC(10,4) DEFAULT 0,
    best_trade_pct      NUMERIC(10,4) DEFAULT 0,
    worst_trade_pct     NUMERIC(10,4) DEFAULT 0,

    -- State (preserved)
    circuit_breaker     BOOLEAN DEFAULT FALSE,
    stop_reason         TEXT,
    stopped_at          TIMESTAMPTZ,
    last_trade_at       TIMESTAMPTZ,
    started_at          TIMESTAMPTZ,
    created_at          TIMESTAMPTZ DEFAULT NOW(),
    updated_at          TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_bots_user      ON bots(user_id, status);
CREATE INDEX IF NOT EXISTS idx_bots_platform  ON bots(platform);
CREATE INDEX IF NOT EXISTS idx_bots_bot_id    ON bots(bot_id);
ALTER TABLE bots ENABLE ROW LEVEL SECURITY;
CREATE POLICY bots_user  ON bots USING (user_id = auth.uid());
CREATE POLICY bots_admin ON bots
    USING (EXISTS (SELECT 1 FROM users WHERE id=auth.uid() AND role='admin'));

-- ══════════════════════════════════════════════════════════════
-- PROFIT RANGE STATE (NEW)
-- ══════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS profit_range_state (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id             UUID NOT NULL REFERENCES users(id),
    bot_id              UUID REFERENCES bots(id) ON DELETE CASCADE,
    target_pct          NUMERIC(6,2) NOT NULL,
    mode                TEXT DEFAULT 'per_session',
    session             TEXT DEFAULT 'new_york',
    session_pnl_pct     NUMERIC(10,4) DEFAULT 0,
    daily_pnl_pct       NUMERIC(10,4) DEFAULT 0,
    trades_done         INTEGER DEFAULT 0,
    target_hit          BOOLEAN DEFAULT FALSE,
    paused              BOOLEAN DEFAULT FALSE,
    pause_reason        TEXT DEFAULT '',
    consecutive_wins    INTEGER DEFAULT 0,
    consecutive_losses  INTEGER DEFAULT 0,
    current_scale       NUMERIC(6,3) DEFAULT 1.0,
    win_rate            NUMERIC(6,4) DEFAULT 0.65,
    auto_adjusted_target NUMERIC(6,2) DEFAULT 0,
    session_start       TIMESTAMPTZ DEFAULT NOW(),
    updated_at          TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, bot_id)
);
ALTER TABLE profit_range_state ENABLE ROW LEVEL SECURITY;
CREATE POLICY prs_user ON profit_range_state USING (user_id = auth.uid());

-- ══════════════════════════════════════════════════════════════
-- PROMAX SEQUENCE LOG (NEW)
-- ══════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS promax_sequence_log (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id         UUID NOT NULL REFERENCES users(id),
    bot_id          UUID REFERENCES bots(id),
    trade_id        UUID,
    sequence_pos    INTEGER NOT NULL,     -- 0=T1,1=T2,2=T3,3=T4
    multiplier      INTEGER NOT NULL,     -- 1,5,3,4
    target_usdt     NUMERIC(10,4),        -- e.g. 1,5,3,4
    actual_usdt     NUMERIC(10,4),        -- actual earned
    achieved        BOOLEAN DEFAULT FALSE,
    pair            TEXT,
    direction       TEXT,
    entry_price     NUMERIC(20,8),
    exit_price      NUMERIC(20,8),
    confidence      NUMERIC(5,2),
    rr_ratio        NUMERIC(6,3),
    created_at      TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_promax_user ON promax_sequence_log(user_id, created_at DESC);
ALTER TABLE promax_sequence_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY promax_user ON promax_sequence_log USING (user_id = auth.uid());

-- ══════════════════════════════════════════════════════════════
-- TRADES (preserved + profit_range_mode column)
-- ══════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS trades (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    bot_id          UUID REFERENCES bots(id) ON DELETE CASCADE,
    user_id         UUID NOT NULL REFERENCES users(id),
    pair            TEXT NOT NULL,
    asset_class     TEXT DEFAULT 'crypto'
                    CHECK (asset_class IN ('crypto','forex','commodities','gold','silver','oil')),
    platform        TEXT DEFAULT 'esc',
    direction       TEXT CHECK (direction IN ('long','short')),
    status          TEXT DEFAULT 'open' CHECK (status IN ('open','closed','cancelled')),
    timeframe       TEXT DEFAULT '1h',
    strategy        TEXT DEFAULT '',
    ai_tier         TEXT DEFAULT 'silver',
    capital_mode    TEXT DEFAULT 'hybrid',

    -- Profit mode context (NEW)
    profit_range_target  NUMERIC(6,2),
    profit_range_mode    TEXT,
    two_pct_mode         BOOLEAN DEFAULT FALSE,
    promax_sequence_pos  INTEGER,

    entry_price     NUMERIC(20,8) NOT NULL,
    exit_price      NUMERIC(20,8),
    stop_loss       NUMERIC(20,8),
    take_profit     NUMERIC(20,8),
    tp1             NUMERIC(20,8),
    tp2             NUMERIC(20,8),
    tp3             NUMERIC(20,8),
    quantity        NUMERIC(20,8) DEFAULT 0,
    lot_size        NUMERIC(10,4),
    margin_used     NUMERIC(20,8),
    pnl             NUMERIC(20,8),
    pnl_pct         NUMERIC(10,4),
    pnl_usdt        NUMERIC(20,8),     -- Absolute USDT P&L
    fee             NUMERIC(20,8) DEFAULT 0,
    net_pnl         NUMERIC(20,8),
    ai_confidence   NUMERIC(5,2),
    ai_signal       JSONB DEFAULT '{}',
    regime          TEXT DEFAULT '',
    engines_agreed  INTEGER DEFAULT 0,
    latency_ms      NUMERIC(8,2),
    fast_path       BOOLEAN DEFAULT FALSE,
    exchange_order_id  TEXT,
    mt5_ticket         BIGINT,
    exchange_name      TEXT,
    opened_at       TIMESTAMPTZ DEFAULT NOW(),
    closed_at       TIMESTAMPTZ,
    created_at      TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_trades_user    ON trades(user_id, status);
CREATE INDEX IF NOT EXISTS idx_trades_bot     ON trades(bot_id);
CREATE INDEX IF NOT EXISTS idx_trades_pair    ON trades(pair);
CREATE INDEX IF NOT EXISTS idx_trades_asset   ON trades(asset_class);
ALTER TABLE trades ENABLE ROW LEVEL SECURITY;
CREATE POLICY trades_user  ON trades USING (user_id = auth.uid());
CREATE POLICY trades_admin ON trades
    USING (EXISTS (SELECT 1 FROM users WHERE id=auth.uid() AND role='admin'));

-- MT5 trades (preserved)
CREATE TABLE IF NOT EXISTS mt5_trades (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id     UUID NOT NULL REFERENCES users(id),
    trade_id    UUID REFERENCES trades(id),
    symbol      TEXT NOT NULL,
    side        TEXT CHECK (side IN ('buy','sell')),
    volume      NUMERIC(10,4) NOT NULL,
    price_open  NUMERIC(20,5),
    price_close NUMERIC(20,5),
    sl          NUMERIC(20,5),
    tp          NUMERIC(20,5),
    ticket      BIGINT,
    magic       INTEGER DEFAULT 777000,
    comment     TEXT DEFAULT 'ESTRADE_v7',
    profit      NUMERIC(20,4),
    commission  NUMERIC(20,4) DEFAULT 0,
    swap        NUMERIC(20,4) DEFAULT 0,
    status      TEXT DEFAULT 'open',
    created_at  TIMESTAMPTZ DEFAULT NOW(),
    closed_at   TIMESTAMPTZ
);
ALTER TABLE mt5_trades ENABLE ROW LEVEL SECURITY;
CREATE POLICY mt5_trades_user ON mt5_trades USING (user_id = auth.uid());

-- ══════════════════════════════════════════════════════════════
-- CAPITAL MODE STATE (preserved)
-- ══════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS capital_mode_state (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id         UUID NOT NULL REFERENCES users(id),
    bot_id          UUID REFERENCES bots(id),
    session         TEXT DEFAULT 'new_york',
    daily_pnl_pct   NUMERIC(10,4) DEFAULT 0,
    session_pnl_pct NUMERIC(10,4) DEFAULT 0,
    trades_today    INTEGER DEFAULT 0,
    is_paused       BOOLEAN DEFAULT FALSE,
    pause_reason    TEXT DEFAULT '',
    daily_start_balance NUMERIC(20,8),
    daily_high_balance  NUMERIC(20,8),
    daily_low_balance   NUMERIC(20,8),
    streak_count    INTEGER DEFAULT 0,
    updated_at      TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, bot_id)
);

CREATE TABLE IF NOT EXISTS bot_capital_allocation (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id         UUID NOT NULL REFERENCES users(id),
    bot_id          UUID REFERENCES bots(id),
    initial_capital NUMERIC(20,8) DEFAULT 0,
    current_capital NUMERIC(20,8) DEFAULT 0,
    reinvested_usd  NUMERIC(20,8) DEFAULT 0,
    withdrawn_usd   NUMERIC(20,8) DEFAULT 0,
    trade_profit    NUMERIC(20,8) DEFAULT 0,
    compound_factor NUMERIC(10,4) DEFAULT 1.0,
    kelly_fraction  NUMERIC(10,6) DEFAULT 0.01,
    updated_at      TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, bot_id)
);

-- ══════════════════════════════════════════════════════════════
-- PAYMENT & SUBSCRIPTIONS (NEW — Stripe via Vercel)
-- ══════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS subscriptions (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id             UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    plan                TEXT NOT NULL,   -- free | starter | pro | elite | lifetime
    status              TEXT DEFAULT 'inactive'
                        CHECK (status IN ('active','inactive','trialing','past_due','cancelled')),
    stripe_subscription_id TEXT UNIQUE,
    stripe_customer_id  TEXT,
    stripe_price_id     TEXT,
    current_period_start TIMESTAMPTZ,
    current_period_end   TIMESTAMPTZ,
    trial_end           TIMESTAMPTZ,
    cancel_at_period_end BOOLEAN DEFAULT FALSE,
    amount_cents        INTEGER,
    currency            TEXT DEFAULT 'usd',
    interval            TEXT DEFAULT 'month',
    max_bots            INTEGER DEFAULT 5,
    ai_tier_allowed     TEXT DEFAULT 'silver',
    promax_allowed      BOOLEAN DEFAULT FALSE,
    created_at          TIMESTAMPTZ DEFAULT NOW(),
    updated_at          TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id)
);

CREATE TABLE IF NOT EXISTS payment_events (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id         UUID REFERENCES users(id),
    event_type      TEXT NOT NULL,   -- checkout.completed, subscription.updated, etc.
    stripe_event_id TEXT UNIQUE,
    amount_cents    INTEGER,
    currency        TEXT DEFAULT 'usd',
    plan            TEXT,
    status          TEXT,
    metadata        JSONB DEFAULT '{}',
    created_at      TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY subs_user  ON subscriptions USING (user_id = auth.uid());
CREATE POLICY subs_admin ON subscriptions
    USING (EXISTS (SELECT 1 FROM users WHERE id=auth.uid() AND role='admin'));

-- ══════════════════════════════════════════════════════════════
-- MAINTENANCE (NEW)
-- ══════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS maintenance_windows (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    type        TEXT DEFAULT 'scheduled',
    message     TEXT DEFAULT 'Scheduled maintenance',
    start_time  TIMESTAMPTZ,
    end_time    TIMESTAMPTZ,
    is_global   BOOLEAN DEFAULT TRUE,
    bot_ids     UUID[],
    created_by  UUID REFERENCES users(id),
    is_active   BOOLEAN DEFAULT FALSE,
    auto_resume BOOLEAN DEFAULT TRUE,
    created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ══════════════════════════════════════════════════════════════
-- SECURITY TABLES (preserved)
-- ══════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS security_findings (
    id              TEXT PRIMARY KEY,
    severity        TEXT DEFAULT 'LOW',
    category        TEXT NOT NULL,
    title           TEXT NOT NULL,
    description     TEXT NOT NULL,
    affected        TEXT DEFAULT '',
    auto_fixed      BOOLEAN DEFAULT FALSE,
    recommendation  TEXT DEFAULT '',
    resolved        BOOLEAN DEFAULT FALSE,
    resolved_at     TIMESTAMPTZ,
    resolved_by     UUID REFERENCES users(id),
    timestamp       TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS security_events (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    type        TEXT NOT NULL,
    ip          TEXT,
    user_id     UUID REFERENCES users(id),
    data        JSONB DEFAULT '{}',
    severity    TEXT DEFAULT 'LOW',
    created_at  TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_sec_events ON security_events(type, created_at DESC);

CREATE TABLE IF NOT EXISTS blocked_ips (
    ip          TEXT PRIMARY KEY,
    reason      TEXT,
    blocked_by  TEXT DEFAULT 'auto',
    expires_at  TIMESTAMPTZ,
    created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ══════════════════════════════════════════════════════════════
-- SIGNALS + MARKET DATA (preserved)
-- ══════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS signals (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    bot_id          UUID REFERENCES bots(id),
    pair            TEXT NOT NULL,
    asset_class     TEXT DEFAULT 'crypto',
    platform        TEXT DEFAULT 'esc',
    timeframe       TEXT NOT NULL,
    direction       TEXT,
    confidence      NUMERIC(5,2),
    entry_price     NUMERIC(20,8),
    stop_loss       NUMERIC(20,8),
    take_profit     NUMERIC(20,8),
    tp1             NUMERIC(20,8),
    tp2             NUMERIC(20,8),
    tp3             NUMERIC(20,8),
    rr_ratio        NUMERIC(6,3),
    regime          TEXT,
    strategy        TEXT,
    engines_agreed  INTEGER,
    fast_path       BOOLEAN DEFAULT FALSE,
    latency_ms      NUMERIC(8,2),
    acted_on        BOOLEAN DEFAULT FALSE,
    trade_id        UUID REFERENCES trades(id),
    metadata        JSONB DEFAULT '{}',
    created_at      TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_signals_pair ON signals(pair, created_at DESC);

CREATE TABLE IF NOT EXISTS market_data (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    symbol      TEXT NOT NULL,
    asset_class TEXT DEFAULT 'crypto',
    platform    TEXT DEFAULT 'esc',
    timeframe   TEXT NOT NULL,
    timestamp   TIMESTAMPTZ NOT NULL,
    open        NUMERIC(20,8),high NUMERIC(20,8),
    low         NUMERIC(20,8),close NUMERIC(20,8),
    volume      NUMERIC(30,8),
    ema8 NUMERIC(20,8),ema20 NUMERIC(20,8),ema50 NUMERIC(20,8),ema200 NUMERIC(20,8),
    rsi  NUMERIC(6,2),rsi_7 NUMERIC(6,2),
    macd NUMERIC(20,8),macd_signal NUMERIC(20,8),macd_hist NUMERIC(20,8),
    bb_upper NUMERIC(20,8),bb_lower NUMERIC(20,8),bb_mid NUMERIC(20,8),
    atr  NUMERIC(20,8),adx NUMERIC(6,2),
    stoch_k NUMERIC(6,2),stoch_d NUMERIC(6,2),
    vwap NUMERIC(20,8),vol_ratio NUMERIC(8,4),
    dxy_value  NUMERIC(10,4),
    gold_silver_ratio NUMERIC(10,4),
    market_phase TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(symbol,timeframe,timestamp)
);
CREATE INDEX IF NOT EXISTS idx_mdata ON market_data(symbol,timeframe,timestamp DESC);

-- ══════════════════════════════════════════════════════════════
-- COMMODITIES (preserved)
-- ══════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS commodity_dca_layers (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id     UUID NOT NULL REFERENCES users(id),
    bot_id      UUID REFERENCES bots(id),
    pair        TEXT NOT NULL,
    layer_number INTEGER NOT NULL,
    entry_price NUMERIC(20,8) NOT NULL,
    quantity    NUMERIC(20,8) NOT NULL,
    status      TEXT DEFAULT 'open',
    rsi_at_entry NUMERIC(6,2),
    gold_silver_ratio_at_entry NUMERIC(10,4),
    created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS commodity_macro_context (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    snapshot_time   TIMESTAMPTZ DEFAULT NOW(),
    dxy_value       NUMERIC(10,4),
    dxy_trend       TEXT DEFAULT 'neutral',
    gold_price      NUMERIC(10,4),
    silver_price    NUMERIC(10,4),
    gold_silver_ratio NUMERIC(10,4),
    vix_level       NUMERIC(8,4) DEFAULT 20.0,
    inflation_regime TEXT DEFAULT 'moderate',
    risk_sentiment  TEXT DEFAULT 'neutral',
    fed_rate_pct    NUMERIC(6,3),
    btc_dominance   NUMERIC(8,4)
);

-- ══════════════════════════════════════════════════════════════
-- AI TRAINING DATA (preserved)
-- ══════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS ai_training_data (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    bot_id      UUID REFERENCES bots(id),
    pair        TEXT NOT NULL,
    asset_class TEXT DEFAULT 'crypto',
    timeframe   TEXT DEFAULT '1h',
    features_json JSONB NOT NULL,
    direction   TEXT,
    outcome_pct NUMERIC(10,4),
    ai_confidence NUMERIC(5,2),
    engines_agreed INTEGER,
    regime      TEXT,
    fast_path   BOOLEAN DEFAULT FALSE,
    created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS ai_self_updates (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    update_type TEXT NOT NULL,
    trigger     TEXT,
    changes_made JSONB DEFAULT '{}',
    performance_before JSONB DEFAULT '{}',
    performance_after  JSONB DEFAULT '{}',
    duration_ms NUMERIC(10,2),
    created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ══════════════════════════════════════════════════════════════
-- NOTIFICATIONS + FCM (preserved)
-- ══════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS user_fcm_tokens (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    fcm_token   TEXT NOT NULL,
    device_type TEXT DEFAULT 'web',
    active      BOOLEAN DEFAULT TRUE,
    created_at  TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, fcm_token)
);

CREATE TABLE IF NOT EXISTS notifications (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    type        TEXT NOT NULL,
    title       TEXT NOT NULL,
    body        TEXT NOT NULL,
    data        JSONB DEFAULT '{}',
    is_read     BOOLEAN DEFAULT FALSE,
    is_urgent   BOOLEAN DEFAULT FALSE,
    created_at  TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_notif_user ON notifications(user_id,is_read,created_at DESC);

-- ══════════════════════════════════════════════════════════════
-- SYSTEM CONFIG (preserved + new keys)
-- ══════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS system_config (
    key         TEXT PRIMARY KEY,
    value       TEXT,
    description TEXT,
    updated_at  TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO system_config (key,value,description) VALUES
    ('maintenance_mode',      'false',   'Global maintenance mode'),
    ('max_bots_per_user',     '10',      'Max bots per user'),
    ('max_capital_per_bot',   '100000',  'Max USDT per bot'),
    ('min_ai_confidence',     '63',      'Min AI confidence to trade'),
    ('circuit_breaker_pct',   '15',      'Daily drawdown circuit breaker %'),
    ('security_scan_enabled', 'true',    'Enable AI security auditor'),
    ('promax_enabled',        'true',    'Enable ProMax AI Scalping bot'),
    ('promax_sequence',       '1,5,3,4', 'ProMax USDT sequence multipliers'),
    ('promax_usdt_per_trade', '1.0',     'Base USDT per trade for ProMax'),
    ('promax_min_confidence', '85',      'Min confidence for ProMax'),
    ('promax_min_rr',         '2.5',     'Min RR for ProMax'),
    ('promax_max_risk_pct',   '0.25',    'Max risk % per trade for ProMax'),
    ('profit_range_options',  '2,3,4,5,6,7,8,10,12,15', 'Selectable profit targets %'),
    ('profit_range_modes',    'per_trade,per_session',   'Mode options'),
    ('stripe_enabled',        'true',    'Stripe payment enabled'),
    ('vercel_deployment',     'true',    'Running on Vercel edge'),
    ('gold_silver_ratio_high','85',      'GSR silver undervalued threshold'),
    ('gold_silver_ratio_low', '72',      'GSR silver overvalued threshold'),
    ('headway_daily_target',  '3.0',     'Default Headway daily target %'),
    ('royaliq_reinvest_pct',  '70',      'Default RoyalIQ reinvestment %'),
    ('total_bots',            '40',      'Total bots including ProMax')
ON CONFLICT (key) DO UPDATE SET value=EXCLUDED.value;

-- ══════════════════════════════════════════════════════════════
-- TRIGGERS (preserved + new)
-- ══════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at=NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER bots_upd   BEFORE UPDATE ON bots   FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE OR REPLACE TRIGGER users_upd  BEFORE UPDATE ON users  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE OR REPLACE TRIGGER subs_upd   BEFORE UPDATE ON subscriptions FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE OR REPLACE FUNCTION update_bot_stats()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.status='closed' AND OLD.status='open' THEN
        UPDATE bots SET
            total_trades=total_trades+1,
            win_trades  =win_trades  +CASE WHEN NEW.pnl>0 THEN 1 ELSE 0 END,
            loss_trades =loss_trades +CASE WHEN NEW.pnl<=0 THEN 1 ELSE 0 END,
            total_pnl   =total_pnl   +COALESCE(NEW.net_pnl,0),
            daily_pnl   =daily_pnl   +COALESCE(NEW.net_pnl,0),
            last_trade_at=NOW()
        WHERE id=NEW.bot_id;
        UPDATE users SET
            total_profit=total_profit+COALESCE(NEW.net_pnl,0),
            total_trades=total_trades+1
        WHERE id=NEW.user_id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER trade_close_stats
    AFTER UPDATE OF status ON trades
    FOR EACH ROW EXECUTE FUNCTION update_bot_stats();

-- Update promax sequence on trade close
CREATE OR REPLACE FUNCTION update_promax_sequence()
RETURNS TRIGGER AS $$
DECLARE
    seq_mults INT[] := ARRAY[1,5,3,4];
    cur_pos   INT;
    next_pos  INT;
    base_usdt NUMERIC;
    earned    NUMERIC;
BEGIN
    IF NEW.status='closed' AND OLD.status='open' AND NEW.promax_sequence_pos IS NOT NULL THEN
        SELECT promax_sequence_pos INTO cur_pos FROM bots WHERE id=NEW.bot_id;
        base_usdt := (SELECT value::NUMERIC FROM system_config WHERE key='promax_usdt_per_trade');
        earned    := NEW.pnl_usdt;
        IF earned > 0 THEN
            next_pos := (cur_pos + 1) % 4;
            UPDATE bots SET
                promax_sequence_pos = next_pos,
                promax_session_usdt = promax_session_usdt + earned,
                promax_cycle_done   = (next_pos = 0)
            WHERE id=NEW.bot_id;
        ELSE
            UPDATE bots SET promax_sequence_pos=0 WHERE id=NEW.bot_id;
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER promax_seq_update
    AFTER UPDATE OF status ON trades
    FOR EACH ROW EXECUTE FUNCTION update_promax_sequence();

CREATE OR REPLACE FUNCTION check_rls_enabled(table_name TEXT)
RETURNS JSONB AS $$
DECLARE rls_on BOOLEAN;
BEGIN
    SELECT relrowsecurity INTO rls_on FROM pg_class
    WHERE relname=table_name AND relnamespace='public'::regnamespace;
    RETURN jsonb_build_object('rls_enabled',COALESCE(rls_on,FALSE));
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ══════════════════════════════════════════════════════════════
-- REALTIME
-- ══════════════════════════════════════════════════════════════
ALTER PUBLICATION supabase_realtime ADD TABLE trades;
ALTER PUBLICATION supabase_realtime ADD TABLE bots;
ALTER PUBLICATION supabase_realtime ADD TABLE signals;
ALTER PUBLICATION supabase_realtime ADD TABLE notifications;
ALTER PUBLICATION supabase_realtime ADD TABLE profit_range_state;
ALTER PUBLICATION supabase_realtime ADD TABLE promax_sequence_log;
ALTER PUBLICATION supabase_realtime ADD TABLE security_findings;

COMMIT;
